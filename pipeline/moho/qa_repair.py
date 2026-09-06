"""Measured visual QA and deterministic repairs for Moho projects."""

from __future__ import annotations

import copy
import json
import math
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Optional

from PIL import Image

from ..pir.schema import Bone, Channel, Part, Rig
from ..tools.moho_readiness import diagnostic_differences
from .emit import emit
from .extract import extract_from_file


INTERP = {
    "im": 1, "v1": -1.0, "v2": -1.0,
    "in": 1, "h": 0, "s": False, "t": 0,
}

CONTROL_RE = re.compile(r"(switch|dial|ctrl|ik|target|order|squash)", re.IGNORECASE)
FACE_PARTS = {"eyes", "eye", "mouth", "brows", "brow", "nose", "pupil", "pupils", "face_details"}


@dataclass
class QADefect:
    issue_type: str
    frame: int
    severity: str
    description: str
    layer_id: Optional[str] = None
    bone_id: Optional[str] = None
    meta: Optional[dict[str, Any]] = None

    def identity(self) -> tuple[str, Optional[str], Optional[str], int]:
        return (self.issue_type, self.layer_id, self.bone_id, self.frame)


def compute_qa_score(defects: list[QADefect]) -> float:
    """Deterministic score (0.0 - 100.0) based on defect count and severity."""
    if not defects:
        return 100.0
    deductions = 0.0
    for defect in defects:
        if defect.severity == "critical":
            deductions += 25.0
        elif defect.severity == "high":
            deductions += 15.0
        elif defect.severity == "medium":
            deductions += 10.0
        elif defect.severity == "low":
            deductions += 5.0
        else:
            deductions += 10.0
    return round(max(0.0, min(100.0, 100.0 - deductions)), 2)


def _frame_metrics(path: str) -> dict[str, Any]:
    with Image.open(path) as source:
        image = source.convert("RGBA")
    background = image.getpixel((0, 0))
    w, h = image.size
    pixels = image.load()
    foreground = []
    bg_r, bg_g, bg_b = background[0], background[1], background[2]
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 20:
                foreground.append(False)
            else:
                diff = max(abs(r - bg_r), abs(g - bg_g), abs(b - bg_b))
                foreground.append(diff > 12)

    mask = Image.new("1", image.size)
    mask.putdata(foreground)
    bounds = mask.getbbox()
    total = sum(foreground)
    if bounds is None or total == 0:
        return {
            "fraction": 0.0,
            "bounds": None,
            "centroid": (0.5, 0.5),
            "width": image.width,
            "height": image.height,
            "total_pixels": 0,
            "has_joint_gap": False,
            "gaps_count": 0,
        }

    x_sum = 0
    y_sum = 0
    w = image.width
    for index, is_fg in enumerate(foreground):
        if is_fg:
            x_sum += index % w
            y_sum += index // w

    cropped = mask.crop(bounds)
    c_w, c_h = cropped.size
    row_coverage = [
        any(cropped.getpixel((x, y)) for x in range(c_w))
        for y in range(c_h)
    ]
    gaps_count = 0
    in_gap = False
    for has_px in row_coverage:
        if not has_px and not in_gap:
            gaps_count += 1
            in_gap = True
        elif has_px:
            in_gap = False

    return {
        "fraction": total / float(image.width * image.height),
        "bounds": bounds,
        "centroid": (
            x_sum / float(total * image.width),
            y_sum / float(total * image.height),
        ),
        "width": image.width,
        "height": image.height,
        "total_pixels": total,
        "has_joint_gap": gaps_count > 1,
        "gaps_count": gaps_count,
    }


def _has_meaningful_keys(bone: Optional[Bone]) -> bool:
    if bone is None or bone.angle_channel is None:
        return False
    positive_values = [
        value for frame, value in zip(bone.angle_channel.when, bone.angle_channel.val)
        if int(frame) > 0
    ]
    return len(positive_values) >= 2 and len({round(float(value), 6) for value in positive_values}) >= 2


def _dial_value(bone: Bone, index: int, fallback: float) -> float:
    for action in bone.dial_actions or []:
        values = (action.get("pose") or {}).get("val", [])
        if index < len(values):
            return float(values[index])
    return fallback


def _merge_angle_keys(bone: Bone, values: dict[int, float]) -> None:
    existing_when = list(bone.angle_channel.when) if bone.angle_channel else [0]
    existing_val = list(bone.angle_channel.val) if bone.angle_channel else [bone.angle]
    pairs = {int(frame): float(value) for frame, value in zip(existing_when, existing_val)}
    pairs.update(values)
    sorted_pairs = sorted(pairs.items())
    bone.angle_channel = Channel(
        type="Val",
        when=[pair[0] for pair in sorted_pairs],
        val=[pair[1] for pair in sorted_pairs],
        interp=[dict(INTERP) for _ in sorted_pairs],
    )


class MohoVisualQARepairEngine:
    """Audit measurable defects across all 10 categories and apply safe auto-repairs."""

    def __init__(self, project_path: str, max_passes: int = 5, manifest_path: Optional[str] = None):
        self.project_path = str(Path(project_path).resolve())
        self.manifest_path = str(Path(manifest_path).resolve()) if manifest_path else None
        self.max_passes = max_passes
        self.current_pass = 0
        self.defects: list[QADefect] = []
        self.repair_log: list[dict[str, Any]] = []
        self.attempted_repairs: set[str] = set()
        self.manifest_data: Optional[dict[str, Any]] = self._load_manifest()

    def _load_manifest(self) -> Optional[dict[str, Any]]:
        if not self.manifest_path:
            return None
        manifest_file = Path(self.manifest_path)
        if manifest_file.is_file():
            try:
                return json.loads(manifest_file.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                return None
        return None

    def _load_rig(self) -> tuple[Optional[Rig], list[QADefect]]:
        if not Path(self.project_path).is_file():
            return None, [QADefect(
                "native_corruption", 0, "critical",
                f"Project does not exist: {self.project_path}",
            )]
        try:
            return extract_from_file(self.project_path), []
        except (OSError, ValueError, KeyError) as error:
            return None, [QADefect(
                "native_corruption", 0, "critical", f"Unreadable Moho project: {error}",
            )]

    def audit_project_and_frames(
        self,
        frames_data: Optional[list[dict[str, Any]]] = None,
        rendered_frames: Optional[list[str]] = None,
        frame_numbers: Optional[list[int]] = None,
    ) -> list[QADefect]:
        defects: list[QADefect] = []
        rig, load_defects = self._load_rig()
        defects.extend(load_defects)

        manifest = self.manifest_data or {}
        timing = manifest.get("timing", {})
        expected_duration = timing.get("totalFrames")

        if rig is not None:
            # 1. Control bones visible in render
            for bone in rig.bones:
                is_control = bone.is_dial or bool(CONTROL_RE.search(bone.id))
                if bone.is_dial and bone.strength > 0.0:
                    defects.append(QADefect(
                        "control_bones_visible", 0, "high",
                        f"Control dial '{bone.id}' deforms artwork with strength {bone.strength}",
                        bone_id=bone.id,
                    ))
                elif is_control and (not bone.shy or not bone.hidden) and bone.strength > 0.0:
                    defects.append(QADefect(
                        "control_bones_visible", 0, "high",
                        f"Control bone '{bone.id}' is not shy/hidden and has strength {bone.strength}",
                        bone_id=bone.id,
                    ))

            # 2. Missing blink and frozen mouth
            eyes = rig.bone_by_id("Eyes Switch")
            mouth = rig.bone_by_id("Mouth Switch")
            if not _has_meaningful_keys(eyes):
                defects.append(QADefect(
                    "missing_blink", 24, "medium", "Eyes Switch has no open/closed animation keys",
                    bone_id="Eyes Switch",
                ))
            if not _has_meaningful_keys(mouth):
                defects.append(QADefect(
                    "frozen_mouth", 36, "medium", "Mouth Switch has no changing phoneme keys",
                    bone_id="Mouth Switch",
                ))

            # Dialogue frames check
            beats = manifest.get("beats", [])
            dialogue_frames = set()
            for beat in beats:
                if beat.get("intent") in ("speak", "talk", "dialogue") or beat.get("dialogue"):
                    start = int(beat.get("startFrame", 1))
                    end = int(beat.get("endFrame", start + 24))
                    dialogue_frames.update(range(start, end + 1))
            if dialogue_frames and mouth is not None and mouth.angle_channel is not None:
                mouth_keys = {int(f) for f in mouth.angle_channel.when}
                if not (mouth_keys & dialogue_frames):
                    defects.append(QADefect(
                        "frozen_mouth", min(dialogue_frames), "high",
                        "Mouth Switch is frozen during dialogue lines",
                        bone_id="Mouth Switch",
                    ))

            # 3. Layer visibility & all meshes hidden
            visible_meshes = [
                part for part in rig.walk_parts() if part.type in ("mesh", "image") and part.visible
            ]
            if not visible_meshes:
                defects.append(QADefect(
                    "all_meshes_hidden", 0, "critical", "Every mesh/image layer is hidden",
                ))

            # 4. Bad layer order: face parts must not be placed below head/torso
            def _check_group_order(parts_list: list[Part]) -> None:
                names = [p.name.lower() for p in parts_list]
                head_pos = -1
                for i, nm in enumerate(names):
                    if "head" in nm and not any(face in nm for face in FACE_PARTS):
                        head_pos = i
                        break
                if head_pos != -1:
                    for i, nm in enumerate(names):
                        if any(face in nm for face in FACE_PARTS) and i < head_pos:
                            defects.append(QADefect(
                                "bad_layer_order", 0, "high",
                                f"Facial feature '{parts_list[i].name}' is ordered below Head layer",
                                layer_id=parts_list[i].id,
                            ))
                for p in parts_list:
                    if p.children:
                        _check_group_order(p.children)

            _check_group_order(rig.root_parts)

            # 5. Wrong switch
            all_parts = list(rig.walk_parts())
            switches = [p for p in all_parts if p.type == "switch"]
            for sw in switches:
                if not sw.switch_states:
                    defects.append(QADefect(
                        "wrong_switch", 0, "high",
                        f"Switch layer '{sw.name}' has no states",
                        layer_id=sw.id,
                    ))
                if sw.switch_channel and sw.switch_states:
                    for f_idx, s_val in zip(sw.switch_channel.when, sw.switch_channel.val):
                        if s_val and s_val not in sw.switch_states:
                            defects.append(QADefect(
                                "wrong_switch", int(f_idx), "high",
                                f"Switch '{sw.name}' references invalid state '{s_val}' at frame {f_idx}",
                                layer_id=sw.id,
                            ))

            # 6. Extreme bone angles
            for bone in rig.bones:
                if bone.angle_channel is not None:
                    for f, val in zip(bone.angle_channel.when, bone.angle_channel.val):
                        angle = float(val)
                        if bone.constraints:
                            if angle < bone.min_constraint - 0.05 or angle > bone.max_constraint + 0.05:
                                defects.append(QADefect(
                                    "extreme_angle", int(f), "high",
                                    f"Bone '{bone.id}' angle {angle:.2f} rad exceeds constraints [{bone.min_constraint:.2f}, {bone.max_constraint:.2f}]",
                                    bone_id=bone.id,
                                ))
                        elif abs(angle) > math.radians(165) and not bone.is_dial:
                            defects.append(QADefect(
                                "extreme_angle", int(f), "medium",
                                f"Bone '{bone.id}' angle {angle:.2f} rad exceeds natural limit (> 165 deg)",
                                bone_id=bone.id,
                            ))

            # 7. Foot sliding and IK jitter
            foot_bones = [b for b in rig.bones if "foot" in b.id.lower() or "ankle" in b.id.lower() or b.target_bone]
            for fb in foot_bones:
                if fb.pos_channel and len(fb.pos_channel.when) > 2:
                    pos_keys = list(zip(fb.pos_channel.when, fb.pos_channel.val))
                    for i in range(1, len(pos_keys) - 1):
                        _, prev_p = pos_keys[i - 1]
                        cur_f, cur_p = pos_keys[i]
                        _, next_p = pos_keys[i + 1]
                        px0 = prev_p.get("x", 0.0) if isinstance(prev_p, dict) else prev_p[0]
                        px1 = cur_p.get("x", 0.0) if isinstance(cur_p, dict) else cur_p[0]
                        px2 = next_p.get("x", 0.0) if isinstance(next_p, dict) else next_p[0]
                        d1 = px1 - px0
                        d2 = px2 - px1
                        if (d1 * d2 < -0.05) and (abs(d1) > 0.08 or abs(d2) > 0.08):
                            defects.append(QADefect(
                                "ik_jitter", int(cur_f), "high",
                                f"High-frequency IK position jitter detected on foot bone '{fb.id}'",
                                bone_id=fb.id,
                            ))
                            break

            # 8. Duration mismatch
            if expected_duration is not None:
                max_frame = 0
                for b in rig.bones:
                    if b.angle_channel:
                        max_frame = max(max_frame, max(b.angle_channel.when, default=0))
                    if b.pos_channel:
                        max_frame = max(max_frame, max(b.pos_channel.when, default=0))
                if max_frame > 0 and abs(max_frame - expected_duration) > 2:
                    defects.append(QADefect(
                        "duration_mismatch", max_frame, "high",
                        f"Project frame duration {max_frame} does not match manifest totalFrames {expected_duration}",
                        meta={"project_duration": max_frame, "manifest_duration": expected_duration},
                    ))

            # 9. Broken asset paths
            for part in rig.walk_parts():
                if part.type == "image" and part.image_ref:
                    p = Path(part.image_ref)
                    if not p.is_absolute():
                        p = Path(self.project_path).parent / p
                    if not p.exists():
                        defects.append(QADefect(
                            "broken_asset_path", 0, "critical",
                            f"Image asset missing on disk: {part.image_ref}",
                            layer_id=part.id,
                        ))

        # Visual frame inspections
        paths = rendered_frames or []
        numbers = frame_numbers or list(range(1, len(paths) + 1))
        measured: list[dict[str, Any]] = []

        for frame, path in zip(numbers, paths):
            try:
                metrics = _frame_metrics(path)
            except (OSError, ValueError) as error:
                defects.append(QADefect(
                    "invalid_render", frame, "critical", f"Cannot inspect rendered frame: {error}",
                ))
                continue
            measured.append(metrics)

            if metrics["fraction"] < 0.005 or metrics["total_pixels"] == 0:
                defects.append(QADefect(
                    "empty_frame", frame, "critical", "Character occupies less than 0.5% of frame or 0 pixels",
                    meta=metrics,
                ))

            bounds = metrics["bounds"]
            if bounds is not None:
                width = metrics["width"]
                height = metrics["height"]
                if bounds[1] <= 1:
                    defects.append(QADefect(
                        "head_clipping", frame, "high", "Character top touches or clips canvas border",
                        meta=metrics,
                    ))
                elif bounds[0] <= 1 or bounds[2] >= width - 1 or bounds[3] >= height - 1:
                    defects.append(QADefect(
                        "character_clipping", frame, "high", "Character silhouette touches canvas edge",
                        meta=metrics,
                    ))

            if metrics.get("has_joint_gap") and metrics.get("gaps_count", 0) > 1:
                defects.append(QADefect(
                    "joint_seam_tear", frame, "high",
                    f"Detected {metrics['gaps_count']} seam gap(s) between body parts",
                    meta=metrics,
                ))

        for index in range(1, len(measured)):
            previous = measured[index - 1]
            current = measured[index]
            frame = numbers[index]
            previous_area = previous["fraction"]
            current_area = current["fraction"]

            if previous_area > 0.02 and current_area < 0.005:
                defects.append(QADefect(
                    "disappearing_character", frame, "critical",
                    "Character was visible in previous frame but suddenly vanished",
                    meta={"previous_area": previous_area, "current_area": current_area},
                ))

            if previous_area > 0 and (current_area / previous_area > 1.8 or current_area / previous_area < 0.55):
                defects.append(QADefect(
                    "silhouette_explosion", frame, "high",
                    f"Silhouette area changed drastically ({previous_area:.3f} -> {current_area:.3f})",
                ))

            distance = math.dist(previous["centroid"], current["centroid"])
            if distance > 0.35:
                defects.append(QADefect(
                    "position_jump", frame, "high",
                    f"Character centroid jumped {distance * 100:.1f}% across canvas",
                ))

        if len(paths) >= 2:
            differences = diagnostic_differences(paths)
            average_area = sum(item["fraction"] for item in measured) / max(1, len(measured))
            threshold = max(0.001, average_area * 0.01)
            if differences and max(differences) < threshold:
                defects.append(QADefect(
                    "frozen_animation", numbers[-1], "high",
                    f"Rendered frames do not change enough: {differences}",
                ))

        for frame_item in frames_data or []:
            f_num = int(frame_item.get("frame_number", 0))
            if frame_item.get("missing_blink"):
                defects.append(QADefect("missing_blink", f_num, "medium", "Missing blink"))
            if frame_item.get("frozen_mouth"):
                defects.append(QADefect("frozen_mouth", f_num, "medium", "Frozen mouth"))

        self.defects = defects
        return defects

    def apply_fixes_to_project(self, defects: list[QADefect]) -> int:
        rig, load_defects = self._load_rig()
        if rig is None or load_defects:
            return 0

        applied = 0
        bone_map = {bone.id: bone for bone in rig.bones}
        manifest = self.manifest_data or {}
        expected_duration = manifest.get("timing", {}).get("totalFrames", 48)

        for defect in defects:
            action_key = f"{defect.issue_type}:{defect.layer_id}:{defect.bone_id}"
            if action_key in self.attempted_repairs:
                continue

            action: Optional[str] = None

            if defect.issue_type == "control_bones_visible":
                bone = bone_map.get(defect.bone_id or "")
                if bone is not None:
                    bone.strength = 0.0
                    bone.shy = True
                    bone.hidden = True
                    action = f"Set '{bone.id}' strength to 0 and enabled shy/hidden"

            elif defect.issue_type == "missing_blink":
                eyes = bone_map.get("Eyes Switch")
                if eyes is not None:
                    _merge_angle_keys(eyes, {
                        24: _dial_value(eyes, 1, eyes.angle + math.radians(15)),
                        26: _dial_value(eyes, 0, eyes.angle),
                        48: _dial_value(eyes, 1, eyes.angle + math.radians(15)),
                        50: _dial_value(eyes, 0, eyes.angle),
                    })
                    action = "Inserted natural blink keys at frames 24, 26 and 48, 50"

            elif defect.issue_type == "frozen_mouth":
                mouth = bone_map.get("Mouth Switch")
                if mouth is not None:
                    _merge_angle_keys(mouth, {
                        12: _dial_value(mouth, 1, mouth.angle + math.radians(20)),
                        20: _dial_value(mouth, 2, mouth.angle + math.radians(30)),
                        36: _dial_value(mouth, 1, mouth.angle + math.radians(20)),
                        40: _dial_value(mouth, 0, mouth.angle),
                    })
                    action = "Distributed dialogue phoneme keys and neutral/rest mouth keys"

            elif defect.issue_type == "all_meshes_hidden":
                hidden = [part for part in rig.walk_parts() if part.type in ("mesh", "image") and not part.visible]
                if hidden:
                    for part in hidden:
                        part.visible = True
                    action = f"Restored visibility for {len(hidden)} hidden layer(s)"

            elif defect.issue_type == "bad_layer_order":
                def _reorder_group(parts_list: list[Part]) -> int:
                    names = [p.name.lower() for p in parts_list]
                    head_pos = -1
                    for i, nm in enumerate(names):
                        if "head" in nm and not any(face in nm for face in FACE_PARTS):
                            head_pos = i
                            break
                    reordered = 0
                    if head_pos != -1:
                        face_p = [p for p in parts_list if any(f in p.name.lower() for f in FACE_PARTS)]
                        other_p = [p for p in parts_list if not any(f in p.name.lower() for f in FACE_PARTS)]
                        if face_p and any(parts_list.index(fp) < head_pos for fp in face_p):
                            parts_list[:] = other_p + face_p
                            reordered += 1
                    for p in parts_list:
                        if p.children:
                            reordered += _reorder_group(p.children)
                    return reordered

                count = _reorder_group(rig.root_parts)
                if count > 0:
                    action = f"Reordered facial feature layer(s) to render above head across {count} group(s)"

            elif defect.issue_type == "wrong_switch":
                sw = next((p for p in rig.walk_parts() if p.id == defect.layer_id and p.type == "switch"), None)
                if sw is not None and sw.switch_states:
                    valid_default = "rest" if "rest" in sw.switch_states else sw.switch_states[0]
                    if sw.switch_channel:
                        sw.switch_channel.val = [
                            v if v in sw.switch_states else valid_default
                            for v in sw.switch_channel.val
                        ]
                        action = f"Reset invalid switch states to '{valid_default}' on layer '{sw.name}'"

            elif defect.issue_type == "extreme_angle":
                bone = bone_map.get(defect.bone_id or "")
                if bone is not None and bone.angle_channel is not None:
                    min_a = bone.min_constraint if bone.constraints else -math.radians(160)
                    max_a = bone.max_constraint if bone.constraints else math.radians(160)
                    clamped_vals = [
                        max(min_a, min(max_a, float(v)))
                        for v in bone.angle_channel.val
                    ]
                    bone.angle_channel.val = clamped_vals
                    action = f"Clamped extreme angles on bone '{bone.id}' to [{min_a:.2f}, {max_a:.2f}]"

            elif defect.issue_type in ("foot_sliding", "ik_jitter"):
                bone = bone_map.get(defect.bone_id or "")
                if bone is not None:
                    bone.ik_lock = True
                    if bone.pos_channel and len(bone.pos_channel.val) > 1:
                        base_pos = bone.pos_channel.val[0]
                        bone.pos_channel.val = [copy.deepcopy(base_pos) for _ in bone.pos_channel.val]
                    action = f"Enabled ik_lock and pinned stance translation on foot bone '{bone.id}'"

            elif defect.issue_type == "duration_mismatch":
                for b in rig.bones:
                    if b.angle_channel and b.angle_channel.when:
                        last_w = b.angle_channel.when[-1]
                        if last_w != expected_duration:
                            b.angle_channel.when.append(expected_duration)
                            b.angle_channel.val.append(b.angle_channel.val[-1])
                            b.angle_channel.interp.append(dict(INTERP))
                action = f"Aligned animation frame duration to manifest target ({expected_duration} frames)"

            elif defect.issue_type == "joint_seam_tear":
                adjusted_count = 0
                for b in rig.bones:
                    if "arm" in b.id.lower() or "leg" in b.id.lower():
                        b.length = round(b.length * 1.05, 4)
                        adjusted_count += 1
                if adjusted_count > 0:
                    action = f"Adjusted joint overlap padding on {adjusted_count} limb bones (+5%)"

            if action is not None:
                self.attempted_repairs.add(action_key)
                applied += 1
                self.repair_log.append({
                    "pass": self.current_pass,
                    "issue": defect.issue_type,
                    "frame": defect.frame,
                    "action": action,
                })

        if applied:
            emit(rig, self.project_path)
        return applied
