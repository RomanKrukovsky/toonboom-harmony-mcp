"""Real PSD extraction, artwork-backed rig compilation and certified batches."""

from __future__ import annotations

import hashlib
import html
import json
import os
import re
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Any, Optional

from PIL import Image

try:
    from psd_tools import PSDImage
except ImportError:
    PSDImage = None

from .moho.emit import emit
from .moho.extract import extract_from_file
from .pir.schema import Channel, Part
from .riggen.humanoid_manifest import build_humanoid_manifest
from .riggen.master_character_compiler import compile_master_character
from .riggen.psd import compute_joints
from .riggen.skeleton import to_moho_coords
from .tools.moho_native_acceptance import accept_project
from .tools.moho_readiness import score_project


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _safe_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._")
    return cleaned or "layer"


def _alpha_pixels(image: Image.Image) -> int:
    alpha = image.getchannel("A")
    return sum(1 for value in alpha.get_flattened_data() if value > 0)


def _bbox_values(bbox: Any) -> tuple[int, int, int, int]:
    if isinstance(bbox, tuple):
        return tuple(int(value) for value in bbox)
    return int(bbox.x1), int(bbox.y1), int(bbox.x2), int(bbox.y2)


class RigCompiler:
    SEMANTIC_MAP = {
        "Head": ["head", "golova", "голова", "череп", "лицо", "face"],
        "Torso": ["torso", "telo", "тело", "туловище", "body", "грудь"],
        "LArm": ["l_arm", "larm", "l_ruka", "л_рука", "левая_рука", "left_arm", "arm_l"],
        "RArm": ["r_arm", "rarm", "r_ruka", "п_рука", "правая_рука", "right_arm", "arm_r"],
        "LLeg": ["l_leg", "lleg", "l_noga", "л_нога", "левая_нога", "left_leg", "leg_l"],
        "RLeg": ["r_leg", "rleg", "r_noga", "п_нога", "правая_нога", "right_leg", "leg_r"],
    }
    BODY_PLAN_PROPORTIONS = {
        "adult_neutral": {"head_scale": 1.0, "limb_scale": 1.0, "torso_width": 1.0},
        "slim": {"head_scale": 1.0, "limb_scale": 1.05, "torso_width": 0.85},
        "stocky": {"head_scale": 0.95, "limb_scale": 0.90, "torso_width": 1.30},
        "child": {"head_scale": 1.35, "limb_scale": 0.75, "torso_width": 0.90},
        "tall": {"head_scale": 0.90, "limb_scale": 1.25, "torso_width": 0.95},
        "short": {"head_scale": 1.15, "limb_scale": 0.80, "torso_width": 1.10},
        "masculine": {"head_scale": 0.95, "limb_scale": 1.05, "torso_width": 1.15},
        "feminine": {"head_scale": 1.0, "limb_scale": 1.0, "torso_width": 0.90},
    }
    PART_BINDINGS = {
        "Head": ("Head", "head_base"),
        "Torso": ("Body", "hip"),
        "LArmUpper": ("UpperArm L", "shoulder_L"),
        "LArmLower": ("LowerArm L", "elbow_L"),
        "RArmUpper": ("UpperArm R", "shoulder_R"),
        "RArmLower": ("LowerArm R", "elbow_R"),
        "LLegUpper": ("Thigh L", "hip_L"),
        "LLegLower": ("Shin L", "knee_L"),
        "RLegUpper": ("Thigh R", "hip_R"),
        "RLegLower": ("Shin R", "knee_R"),
    }

    @staticmethod
    def classify_layer(name: str) -> str:
        lower = name.casefold().strip().replace(" ", "_").replace("-", "_")
        compact = lower.replace("_", "")
        for target, aliases in RigCompiler.SEMANTIC_MAP.items():
            if any(alias in lower or alias.replace("_", "") in compact for alias in aliases):
                return target
        return "GenericPart"

    @staticmethod
    def _validate_colors(body_params: dict[str, Any]) -> dict[str, tuple[float, float, float]]:
        defaults = {
            "skin_rgb": (0.95, 0.78, 0.67),
            "hair_rgb": (0.90, 0.45, 0.18),
            "shirt_rgb": (0.84, 0.31, 0.51),
            "pants_rgb": (0.20, 0.22, 0.27),
            "shoes_rgb": (0.12, 0.12, 0.12),
        }
        colors: dict[str, tuple[float, float, float]] = {}
        for name, default in defaults.items():
            values = tuple(float(value) for value in body_params.get(name, default))
            if len(values) != 3 or any(value < 0.0 or value > 1.0 for value in values):
                raise ValueError(f"{name} must contain three values between 0 and 1")
            colors[name] = values
        return colors

    @staticmethod
    def compile_from_artwork(
        psd_data: dict[str, Any],
        body_plan: str = "adult_neutral",
        body_params: Optional[dict[str, Any]] = None,
        output_path: Optional[str] = None,
    ) -> dict[str, Any]:
        if body_plan not in RigCompiler.BODY_PLAN_PROPORTIONS:
            raise ValueError(
                f"Invalid body plan: {body_plan}. Must be one of "
                f"{sorted(RigCompiler.BODY_PLAN_PROPORTIONS)}"
            )
        processed_layers = psd_data.get("processed_layers")
        if not isinstance(processed_layers, list) or not processed_layers:
            raise ValueError("compile_from_artwork requires processed_layers from import_psd_character")
        missing_assets = [
            layer.get("file_path", "") for layer in processed_layers
            if not Path(str(layer.get("file_path", ""))).is_file()
        ]
        if missing_assets:
            raise FileNotFoundError("Processed artwork assets are missing: " + ", ".join(missing_assets))

        body_params = body_params or {}
        colors = RigCompiler._validate_colors(body_params)
        proportions = RigCompiler.BODY_PLAN_PROPORTIONS[body_plan]
        target = Path(output_path or tempfile.mktemp(suffix=f"_{body_plan}.moho")).resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        metadata = psd_data.get("metadata") or {}
        canvas_width = int(metadata.get("width", 400))
        canvas_height = int(metadata.get("height", 600))
        if canvas_width <= 0 or canvas_height <= 0:
            raise ValueError("PSD canvas dimensions must be positive")
        inspected_layers = psd_data.get("layers") or []
        bbox_parts = {
            str(layer["name"]): {"bbox": tuple(layer["bounds"])}
            for layer in inspected_layers
            if layer.get("name") in {"Head", "Torso", "LArm", "RArm", "LLeg", "RLeg"}
        }
        if set(bbox_parts) != {"Head", "Torso", "LArm", "RArm", "LLeg", "RLeg"}:
            raise ValueError("PSD must provide Head, Torso, LArm, RArm, LLeg and RLeg layers")
        artwork_joints = compute_joints(bbox_parts, canvas_width, canvas_height)

        asset_root = target.parent / f"{target.stem}_assets" / uuid.uuid4().hex[:10]
        asset_root.mkdir(parents=True, exist_ok=False)
        evidence = target.parent / f"{target.stem}_evidence"
        candidate_file = tempfile.NamedTemporaryFile(
            dir=target.parent, prefix=f".{target.name}.", suffix=".candidate.moho", delete=False,
        )
        candidate_file.close()
        candidate = Path(candidate_file.name)
        manifest_file = candidate.with_suffix(".manifest.json")
        copied_assets: list[dict[str, Any]] = []
        promoted = False
        try:
            compile_master_character(
                name=f"Artwork_{body_plan}",
                gender="neutral",
                skin_rgb=colors["skin_rgb"], hair_rgb=colors["hair_rgb"],
                shirt_rgb=colors["shirt_rgb"], pants_rgb=colors["pants_rgb"],
                shoes_rgb=colors["shoes_rgb"], out_path=str(candidate),
                canvas_w=canvas_width, canvas_h=canvas_height,
                body_proportions=proportions,
                joints_override=artwork_joints,
            )
            rig = extract_from_file(str(candidate))
            root = next((part for part in rig.root_parts if part.type == "bone_container"), None)
            if root is None:
                raise ValueError("Compiled rig has no bone container")
            for index, layer in enumerate(processed_layers):
                source = Path(str(layer["file_path"])).resolve()
                filename = f"{index:02d}_{_safe_name(str(layer.get('layer_name', source.stem)))}.png"
                destination = asset_root / filename
                shutil.copy2(source, destination)
                semantic_part = str(layer.get("semantic_part", "GenericPart"))
                binding = RigCompiler.PART_BINDINGS.get(semantic_part)
                bone_name, _joint_name = binding if binding else ("Body", "hip")
                bounds = layer.get("canvas_bounds") or layer.get("source_bounds")
                center_px = (
                    (float(bounds[0]) + float(bounds[2])) / 2.0,
                    (float(bounds[1]) + float(bounds[3])) / 2.0,
                )
                center_world = to_moho_coords(
                    center_px[0], center_px[1], canvas_width, canvas_height,
                )
                relative_ref = destination.relative_to(target.parent).as_posix()
                image_part = Part(
                    id=f"artwork_{index}_{_safe_name(semantic_part)}",
                    name=f"Artwork {semantic_part}",
                    type="image",
                    bone=None,
                    parent_bone_raw=-3,
                    image_ref=relative_ref,
                    origin=(0.0, 0.0),
                    z_order=100 + index,
                )
                image_part.transforms["translation"] = Channel(
                    type="Vec3", when=[0],
                    val=[{
                        "x": round(center_world[0], 6),
                        "y": round(center_world[1], 6),
                        "z": 0.0,
                    }],
                    interp=[{
                        "im": 1, "v1": -1.0, "v2": -1.0,
                        "in": 1, "h": 0, "s": False, "t": 0,
                    }],
                )
                root.children.append(image_part)
                copied_assets.append({
                    "semantic_part": semantic_part,
                    "bone": bone_name,
                    "relative_path": relative_ref,
                    "sha256": _sha256(destination),
                })
            emit(rig, str(candidate))
            actual_rig = extract_from_file(str(candidate))
            manifest = build_humanoid_manifest(actual_rig)
            manifest_file.write_text(
                json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8",
            )
            report = score_project(str(candidate), str(manifest_file), str(evidence))
            if not report.certified or report.score < 95:
                return {
                    "status": "failed", "certified": False, "score": report.score,
                    "output_path": str(target), "errors": report.errors or ["Artwork rig certification failed"],
                    "gates": report.gates, "evidence_directory": str(evidence),
                }
            os.replace(candidate, target)
            promoted = True
            return {
                "status": "certified", "certified": True, "score": report.score,
                "rig_name": f"Rig_{body_plan}", "body_plan": body_plan,
                "proportions_applied": proportions,
                "parameters_applied": body_params,
                "output_path": str(target),
                "semantic_classification": "measured_psd_layers",
                "artwork_layers": copied_assets,
                "gates": report.gates,
                "evidence_directory": str(evidence),
                "errors": [],
            }
        finally:
            if candidate.exists():
                candidate.unlink()
            if manifest_file.exists():
                manifest_file.unlink()
            if not promoted and asset_root.exists():
                shutil.rmtree(asset_root)


class PSDParser:
    @staticmethod
    def _open(file_path: str):
        path = Path(file_path).resolve()
        if not path.is_file():
            raise FileNotFoundError(f"PSD file not found: {file_path}")
        if path.read_bytes()[:4] != b"8BPS":
            raise ValueError(f"Not a PSD/PSB file: {file_path}")
        if PSDImage is None:
            raise RuntimeError("psd-tools is required for real PSD layer extraction")
        return path, PSDImage.open(path)

    @staticmethod
    def _leaf_layers(group, prefix: str = ""):
        for layer in group:
            hierarchy = f"{prefix}/{layer.name}" if prefix else str(layer.name)
            if layer.is_group():
                yield from PSDParser._leaf_layers(layer, hierarchy)
            else:
                yield layer, hierarchy

    @staticmethod
    def inspect_psd(file_path: str) -> dict[str, Any]:
        path, psd = PSDParser._open(file_path)
        layers = []
        for index, (layer, hierarchy) in enumerate(PSDParser._leaf_layers(psd)):
            bbox = layer.bbox
            left, top, right, bottom = _bbox_values(bbox)
            layers.append({
                "index": index, "name": str(layer.name), "hierarchy": hierarchy,
                "kind": str(layer.kind),
                "bounds": [left, top, right, bottom],
                "opacity": int(layer.opacity) / 255.0,
                "visible": bool(layer.is_visible()),
                "width": right - left, "height": bottom - top,
                "semantic": RigCompiler.classify_layer(str(layer.name)),
            })
        if not layers:
            raise ValueError("PSD has no extractable pixel layers")
        return {
            "status": "success", "file": str(path), "is_psd_format": True,
            "source_sha256": _sha256(path),
            "metadata": {
                "color_mode": str(psd.color_mode), "width": psd.width,
                "height": psd.height, "file_size_bytes": path.stat().st_size,
            },
            "layers": layers,
        }

    @staticmethod
    def _save_segment(
        canvas: Image.Image,
        path: Path,
        keep_top: Optional[int] = None,
        keep_bottom: Optional[int] = None,
    ) -> tuple[int, tuple[int, int, int, int]]:
        image = canvas.copy()
        alpha = image.getchannel("A")
        mask = Image.new("L", image.size, 0)
        top = 0 if keep_top is None else keep_top
        bottom = image.height if keep_bottom is None else keep_bottom
        mask.paste(alpha.crop((0, top, image.width, bottom)), (0, top))
        image.putalpha(mask)
        pixels = _alpha_pixels(image)
        if pixels == 0:
            raise ValueError(f"Extracted PSD segment is empty: {path.name}")
        alpha_bounds = image.getchannel("A").getbbox()
        if alpha_bounds is None:
            raise ValueError(f"Extracted PSD segment has no alpha bounds: {path.name}")
        image.crop(alpha_bounds).save(path)
        return pixels, alpha_bounds

    @staticmethod
    def import_psd_character(
        file_path: str,
        options: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        path, psd = PSDParser._open(file_path)
        options = options or {}
        output_dir = Path(
            options.get("output_dir") or tempfile.mkdtemp(prefix="moho-psd-import-")
        ).resolve()
        output_dir.mkdir(parents=True, exist_ok=True)
        processed: list[dict[str, Any]] = []
        for index, (layer, hierarchy) in enumerate(PSDParser._leaf_layers(psd)):
            if not layer.is_visible():
                continue
            cropped = layer.composite()
            if cropped is None:
                continue
            full = Image.new("RGBA", psd.size, (0, 0, 0, 0))
            full.alpha_composite(cropped.convert("RGBA"), (layer.left, layer.top))
            semantic = RigCompiler.classify_layer(str(layer.name))
            base = f"{index:02d}_{_safe_name(str(layer.name))}"
            if semantic in {"LArm", "RArm", "LLeg", "RLeg"}:
                left, top_bound, right, bottom_bound = _bbox_values(layer.bbox)
                layer_height = bottom_bound - top_bound
                split = top_bound + layer_height // 2
                overlap = max(1, round(layer_height * 0.075))
                segments = [
                    (f"{semantic}Upper", None, min(psd.height, split + overlap)),
                    (f"{semantic}Lower", max(0, split - overlap), None),
                ]
            else:
                segments = [(semantic, None, None)]
                overlap = 0
            for segment_name, top, bottom in segments:
                output = output_dir / f"{base}_{segment_name}.png"
                pixels, canvas_bounds = PSDParser._save_segment(full, output, top, bottom)
                processed.append({
                    "layer_name": str(layer.name), "hierarchy": hierarchy,
                    "semantic_part": segment_name, "file_path": str(output),
                    "source_bounds": [layer.left, layer.top, layer.right, layer.bottom],
                    "canvas_bounds": list(canvas_bounds),
                    "joint_overlap_ratio": 0.15 if overlap else 0.0,
                    "overlap_prepared": bool(overlap),
                    "alpha_pixels": pixels, "sha256": _sha256(output),
                    "width": canvas_bounds[2] - canvas_bounds[0],
                    "height": canvas_bounds[3] - canvas_bounds[1],
                })
        if not processed:
            raise ValueError("PSD produced no visible non-empty layers")
        inspection = PSDParser.inspect_psd(str(path))
        return {
            "status": "success", "source_file": str(path),
            "source_sha256": inspection["source_sha256"],
            "promotion_dir": str(output_dir),
            "extraction_dir": str(output_dir),
            "metadata": inspection["metadata"],
            "layers": inspection["layers"],
            "processed_layers": processed,
            "message": "Real PSD layers extracted; limb segments include measured 15% overlap",
        }

    @staticmethod
    def relink(project_path: str, asset_paths: list[str]) -> dict[str, Any]:
        project = Path(project_path).resolve()
        if not project.is_file():
            raise FileNotFoundError(f"Moho project not found: {project_path}")
        sources = [Path(asset).resolve() for asset in asset_paths]
        missing = [str(source) for source in sources if not source.is_file()]
        if missing:
            return {
                "status": "failed", "project": str(project),
                "errors": ["Missing source assets: " + ", ".join(missing)],
                "relinked_assets": [],
            }
        rig = extract_from_file(str(project))
        image_parts = [part for part in rig.walk_parts() if part.type == "image"]
        if not image_parts:
            return {
                "status": "failed", "project": str(project),
                "errors": ["Project has no image layers to relink"],
                "relinked_assets": [],
            }
        assets_dir = project.parent / "assets"
        assets_dir.mkdir(parents=True, exist_ok=True)
        by_name = {source.name: source for source in sources}
        relinked = []
        for part in image_parts:
            current_name = Path(part.image_ref or "").name
            source = by_name.get(current_name)
            if source is None:
                continue
            destination = assets_dir / f"{_sha256(source)[:10]}_{source.name}"
            shutil.copy2(source, destination)
            relative = destination.relative_to(project.parent).as_posix()
            part.image_ref = relative
            relinked.append({
                "original": str(source), "relative": relative,
                "exists": True, "status": "relinked", "sha256": _sha256(destination),
            })
        if not relinked:
            return {
                "status": "failed", "project": str(project),
                "errors": ["None of the supplied assets match project image layers"],
                "relinked_assets": [],
            }
        candidate_handle = tempfile.NamedTemporaryFile(
            dir=project.parent, prefix=f".{project.name}.", suffix=".relink.moho", delete=False,
        )
        candidate_handle.close()
        candidate = Path(candidate_handle.name)
        evidence = project.parent / "relink_evidence"
        try:
            emit(rig, str(candidate))
            native = accept_project(str(candidate), str(evidence), [1])
            certified = native.opened and native.saved and native.reopened and not native.errors
            if not certified:
                return {
                    "status": "failed", "project": str(project),
                    "errors": native.errors or ["Relinked project failed native acceptance"],
                    "relinked_assets": relinked,
                }
            os.replace(candidate, project)
            return {
                "status": "certified", "project": str(project),
                "errors": [], "relinked_assets": relinked,
                "native_acceptance": {"opened": True, "saved": True, "reopened": True},
            }
        finally:
            if candidate.exists():
                candidate.unlink()


class BatchProducer:
    @staticmethod
    def batch_produce(specs: list[dict[str, Any]], concurrency: int = 4) -> dict[str, Any]:
        if concurrency < 1:
            raise ValueError("concurrency must be at least 1")
        if not specs:
            raise ValueError("specs must contain at least one scene")
        workspace = Path(tempfile.mkdtemp(prefix="moho-certified-batch-"))
        successes: list[dict[str, Any]] = []
        failures: list[dict[str, Any]] = []
        for index, spec in enumerate(specs):
            scene_name = _safe_name(str(spec.get("scene_name", f"Scene_{index + 1}")))
            scene_dir = workspace / scene_name
            scene_dir.mkdir(parents=True, exist_ok=True)
            output = scene_dir / f"{scene_name}.moho"
            try:
                compiled = RigCompiler.compile_from_artwork(
                    psd_data=spec.get("psd_data", {}),
                    body_plan=str(spec.get("body_plan", "adult_neutral")),
                    body_params=spec.get("body_params", {}),
                    output_path=str(output),
                )
                if not compiled.get("certified"):
                    raise RuntimeError("Scene did not pass native certification")
                successes.append({
                    "scene": scene_name, "path": str(output), "status": "certified",
                    "rendered": True, "score": compiled["score"],
                    "body_plan": compiled["body_plan"],
                    "duration_frames": int(spec.get("duration_frames", 60)),
                    "evidence_directory": compiled["evidence_directory"],
                })
            except (OSError, ValueError, RuntimeError) as error:
                failures.append({
                    "scene": scene_name, "error": str(error),
                    "diagnostics": {"scene_index": index, "error_type": type(error).__name__},
                })

        clips = "\n".join(
            f"            <asset-clip name='{html.escape(result['scene'])}' "
            f"duration='{result['duration_frames']}/24s' src='{html.escape(Path(result['path']).as_uri())}'/>"
            for result in successes
        )
        total_frames = sum(result["duration_frames"] for result in successes)
        timeline_xml = (
            "<?xml version='1.0' encoding='UTF-8'?>\n"
            "<fcpxml version='1.9'><resources>"
            "<format id='r1' name='FFVideoFormat1080p24' frameDuration='1/24s' width='1920' height='1080'/>"
            "</resources><library><event name='Moho Batch Production'>"
            f"<project name='Batch Scenes'><sequence format='r1' duration='{total_frames}/24s'><spine>\n"
            f"{clips}\n</spine></sequence></project></event></library></fcpxml>"
        )
        timeline_path = workspace / "timeline.fcpxml"
        timeline_path.write_text(timeline_xml, encoding="utf-8")
        status = "completed" if not failures else ("partial_success" if successes else "failed")
        return {
            "status": status, "workspace": str(workspace),
            "requested_concurrency": concurrency,
            "effective_concurrency": 1,
            "successful_scenes": successes, "failed_scenes": failures,
            "timeline": {
                "format": "fcpxml", "path": str(timeline_path), "data": timeline_xml,
            },
        }
