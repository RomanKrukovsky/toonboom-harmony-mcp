"""Fail-closed native acceptance checks executed by real Moho."""

from __future__ import annotations

import argparse
import fcntl
import json
import os
import re
import subprocess
import tempfile
import zipfile
from dataclasses import asdict, dataclass, field
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
DEFAULT_MOHO = Path("/Applications/Moho.app/Contents/MacOS/Moho")
SAVE_TEMPLATE = REPO / "scripts/moho/roundtrip_save.lua.template"
MOHO_ERROR = re.compile(r"\bError\s*\(\d+\):", re.IGNORECASE)
JPEG_SIGNATURE = b"\xff\xd8\xff"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
TRANSIENT_MOHO_RETURN_CODES = {-5}
MOHO_PRO_REQUIRED = re.compile(
    r"Pro level feature|command-line renderer.*Pro|must upgrade",
    re.IGNORECASE,
)


@dataclass
class ProcessEvidence:
    command: list[str]
    returncode: int
    stdout: str
    stderr: str
    output_files: list[str] = field(default_factory=list)

    @property
    def has_moho_error(self) -> bool:
        combined = f"{self.stdout}\n{self.stderr}"
        return (
            self.returncode != 0
            or bool(MOHO_ERROR.search(combined))
            or bool(MOHO_PRO_REQUIRED.search(combined))
        )

    @property
    def requires_moho_pro(self) -> bool:
        return bool(MOHO_PRO_REQUIRED.search(f"{self.stdout}\n{self.stderr}"))


@dataclass
class NativeAcceptanceResult:
    opened: bool
    saved: bool
    reopened: bool
    rendered_frames: list[str]
    preview_frames: list[str]
    render_status: str
    errors: list[str]
    stdout: str
    stderr: str
    roundtrip_path: str
    saved_bone_ids: list[str] = field(default_factory=list)
    saved_layer_ids: list[str] = field(default_factory=list)
    saved_layer_order: list[str] = field(default_factory=list)
    parent_bone_pairs: list[dict[str, str]] = field(default_factory=list)
    binding_pairs: list[dict[str, str]] = field(default_factory=list)
    switch_choices: dict[str, list[str]] = field(default_factory=dict)
    action_driver_targets: list[dict[str, object]] = field(default_factory=list)
    mesh_point_counts: dict[str, int] = field(default_factory=dict)
    vitruvian_membership: dict[str, list[str]] = field(default_factory=dict)


def _moho_executable() -> Path:
    configured = os.environ.get("MOHO_EXECUTABLE")
    executable = Path(configured) if configured else DEFAULT_MOHO
    if not executable.is_file():
        raise FileNotFoundError(f"Moho executable not found: {executable}")
    return executable


def _run(command: list[str], timeout: int = 10) -> ProcessEvidence:
    """Run one serialized Moho process and preserve its real exit evidence."""
    env = os.environ.copy()
    for var in (
        "VIRTUAL_ENV", "PYTHONHOME", "PYTHONPATH", "PYTHONIOENCODING",
        "PYTHONUNBUFFERED", "PYTHONDONTWRITEBYTECODE", "PYTHONSTARTUP",
        "PYTHONBREAKPOINT", "PYTHONHASHSEED", "PYTHONCASEOK",
        "PYTHONCOERCECLOCALE", "PYTHONDEVMODE", "PYTHONFAULTHANDLER",
        "PYTHONINSPECT", "PYTHONMALLOC", "PYTHONMALLOCSTATS",
        "PYTHONNOUSERSITE", "PYTHONOPTIMIZE", "PYTHONUTF8", "PYTHONWARNINGS",
        "PYTHON_BASIC_REPL", "PYTHON_HISTFILE", "PYTHON_HOME", "PYTHON_LIB",
        "CONDA_DEFAULT_ENV", "CONDA_PREFIX", "CONDA_PYTHON_EXE",
    ):
        env.pop(var, None)

    lock_path = Path(tempfile.gettempdir()) / "toonboom_mcp_moho_cli.lock"
    with lock_path.open("w", encoding="utf-8") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        try:
            for _attempt in range(2):
                try:
                    completed = subprocess.run(
                        command,
                        capture_output=True,
                        check=False,
                        text=True,
                        timeout=timeout,
                        env=env,
                    )
                except subprocess.TimeoutExpired as error:
                    stdout = error.stdout.decode() if isinstance(error.stdout, bytes) else (error.stdout or "")
                    stderr = error.stderr.decode() if isinstance(error.stderr, bytes) else (error.stderr or "")
                    return ProcessEvidence(
                        command=command,
                        returncode=124,
                        stdout=stdout,
                        stderr=f"{stderr}\nMoho command timed out after {timeout} seconds".strip(),
                    )

                evidence = ProcessEvidence(
                    command=command,
                    returncode=completed.returncode,
                    stdout=completed.stdout or "",
                    stderr=completed.stderr or "",
                )
                if completed.returncode not in TRANSIENT_MOHO_RETURN_CODES or "SOAP invalid license" in evidence.stderr:
                    return evidence
            return evidence
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


def _is_image(path: Path) -> bool:
    if not path.is_file() or path.stat().st_size < 8:
        return False
    head = path.read_bytes()[:8]
    return head.startswith(PNG_SIGNATURE) or head.startswith(JPEG_SIGNATURE)


def _read_moho_project(moho_path: Path) -> dict | None:
    try:
        with zipfile.ZipFile(moho_path) as archive:
            with archive.open("Project.mohoproj") as entry:
                return json.loads(entry.read().decode("utf-8"))
    except (OSError, KeyError, ValueError, zipfile.BadZipFile):
        return None


def _native_structure(project: dict | None) -> dict[str, object]:
    """Extract deterministic structural evidence from saved Moho JSON."""
    report: dict[str, object] = {
        "saved_bone_ids": [],
        "saved_layer_ids": [],
        "saved_layer_order": [],
        "parent_bone_pairs": [],
        "binding_pairs": [],
        "switch_choices": {},
        "action_driver_targets": [],
        "mesh_point_counts": {},
        "vitruvian_membership": {},
    }
    if project is None:
        return report
    bone_ids: set[str] = set()
    layer_ids: set[str] = set()
    layer_order: list[str] = []
    parent_pairs: set[tuple[str, str]] = set()
    bindings: set[tuple[str, str]] = set()
    switches: dict[str, list[str]] = {}
    actions: dict[str, dict[str, object]] = {}
    meshes: dict[str, int] = {}
    vitruvian: dict[str, list[str]] = {}

    def identifier(value: dict, *keys: str) -> str | None:
        for key in keys:
            candidate = value.get(key)
            if isinstance(candidate, (str, int)) and str(candidate):
                return str(candidate)
        return None

    def record_action(
        action_id: str,
        driver_id: str | None,
        target_ids: list[str],
    ) -> None:
        existing = actions.setdefault(action_id, {
            "actionId": action_id,
            "driverBoneId": driver_id,
            "targetBoneIds": set(),
        })
        if existing["driverBoneId"] is None and driver_id is not None:
            existing["driverBoneId"] = driver_id
        targets = existing["targetBoneIds"]
        if isinstance(targets, set):
            targets.update(target_ids)

    def visit(
        value: object,
        bone_names: list[str] | None = None,
        current_bone_id: str | None = None,
    ) -> None:
        if isinstance(value, list):
            for item in value:
                visit(item, bone_names, current_bone_id)
            return
        if not isinstance(value, dict):
            return
        value_type = str(value.get("type", "")).lower()
        is_native_layer = (
            value_type.endswith("layer")
            and identifier(value, "name") is not None
            and identifier(value, "uuid") is not None
        )
        layer_id = identifier(value, "layer_id", "layerId")
        if layer_id is None and is_native_layer:
            layer_id = identifier(value, "name")
        if layer_id:
            if layer_id not in layer_ids:
                layer_order.append(layer_id)
            layer_ids.add(layer_id)
            parent_bone = value.get("parent_bone", value.get("parentBone"))
            if isinstance(parent_bone, int) and parent_bone >= 0 and bone_names and parent_bone < len(bone_names):
                bindings.add((layer_id, bone_names[parent_bone]))
            elif isinstance(parent_bone, str) and parent_bone and parent_bone != "-1":
                bindings.add((layer_id, parent_bone))
        skeleton = value.get("skeleton")
        bones = value.get("bones")
        used_nested_skeleton = False
        if not isinstance(bones, list) and isinstance(skeleton, dict) and isinstance(skeleton.get("bones"), list):
            bones = skeleton["bones"]
            used_nested_skeleton = True
        if isinstance(bones, list):
            local_bone_names = [
                identifier(bone, "bone_id", "boneId", "id", "name") or str(index)
                for index, bone in enumerate(bones)
                if isinstance(bone, dict)
            ]
            for bone in bones:
                if isinstance(bone, dict):
                    bone_id = identifier(bone, "bone_id", "boneId", "id", "name")
                    if bone_id:
                        bone_ids.add(bone_id)
                        parent_value = bone.get(
                            "parent_bone_id",
                            bone.get(
                                "parentBoneId",
                                bone.get("parent_id", bone.get("parentId", bone.get("parent"))),
                            ),
                        )
                        parent_id: str | None = None
                        if isinstance(parent_value, int) and parent_value >= 0 and parent_value < len(local_bone_names):
                            parent_id = local_bone_names[parent_value]
                        elif isinstance(parent_value, str) and parent_value and parent_value != "-1":
                            parent_id = parent_value
                        if parent_id and parent_id != bone_id:
                            parent_pairs.add((bone_id, parent_id))
                        visit(bone, local_bone_names, bone_id)
            bone_names = local_bone_names
        for key in ("bindings", "binding_pairs"):
            values = value.get(key)
            if isinstance(values, list):
                for binding in values:
                    if not isinstance(binding, dict):
                        continue
                    part_id = identifier(binding, "part_id", "partId", "layer_id", "layerId")
                    bone_id = identifier(binding, "bone_id", "boneId")
                    if part_id and bone_id:
                        bindings.add((part_id, bone_id))
        if "switch" in value_type:
            switch_id = layer_id or identifier(value, "switch_id", "switchId", "name")
            children = value.get("layers", value.get("layer_list", []))
            if switch_id and isinstance(children, list):
                switches[switch_id] = sorted(filter(None, [
                    identifier(child, "choice_id", "choiceId", "layer_id", "layerId", "name")
                    for child in children if isinstance(child, dict)
                ]))
        action_values = value.get("actions")
        if isinstance(action_values, list):
            for action in action_values:
                if not isinstance(action, dict):
                    continue
                action_id = identifier(action, "action_id", "actionId", "name")
                driver = identifier(action, "driver_bone_id", "driverBoneId")
                targets = action.get("targets", [])
                target_ids = sorted(filter(None, [
                    identifier(target, "bone_id", "boneId", "id", "name")
                    for target in targets if isinstance(target, dict)
                ])) if isinstance(targets, list) else []
                if action_id:
                    if current_bone_id and not target_ids:
                        target_ids = [current_bone_id]
                    record_action(action_id, driver, target_ids)
        points = value.get("points")
        mesh_id = identifier(value, "mesh_id", "meshId")
        if mesh_id and isinstance(points, list):
            meshes[mesh_id] = len(points)
        native_mesh = value.get("mesh")
        if is_native_layer and layer_id and isinstance(native_mesh, dict) and isinstance(native_mesh.get("points"), list):
            meshes[layer_id] = len(native_mesh["points"])
        groups = value.get("vitruvian_groups", value.get("vitruvianGroups"))
        if isinstance(groups, list):
            for group in groups:
                if not isinstance(group, dict):
                    continue
                group_id = identifier(group, "group_name", "groupName", "name")
                members = group.get("bone_ids", group.get("boneIds", []))
                if group_id and isinstance(members, list):
                    vitruvian[group_id] = sorted(str(member) for member in members)
        for key, nested in value.items():
            if key in ("bones", "actions") or (key == "skeleton" and used_nested_skeleton):
                continue
            visit(nested, bone_names, current_bone_id)

    visit(project)
    for action in actions.values():
        action_id = str(action["actionId"])
        if action["driverBoneId"] is None and action_id in bone_ids:
            action["driverBoneId"] = action_id
    report["saved_bone_ids"] = sorted(bone_ids)
    report["saved_layer_ids"] = sorted(layer_ids)
    report["saved_layer_order"] = layer_order
    report["parent_bone_pairs"] = sorted(
        ({"boneId": bone_id, "parentBoneId": parent_id}
         for bone_id, parent_id in parent_pairs),
        key=lambda item: (item["boneId"], item["parentBoneId"]),
    )
    report["binding_pairs"] = sorted(
        ({"partId": part_id, "boneId": bone_id}
         for part_id, bone_id in bindings),
        key=lambda item: (item["partId"], item["boneId"]),
    )
    report["switch_choices"] = dict(sorted(switches.items()))
    report["action_driver_targets"] = sorted(({
        "actionId": str(action["actionId"]),
        "driverBoneId": action["driverBoneId"],
        "targetBoneIds": sorted(action["targetBoneIds"])
        if isinstance(action["targetBoneIds"], set) else [],
    } for action in actions.values()), key=lambda item: item["actionId"])
    report["mesh_point_counts"] = dict(sorted(meshes.items()))
    report["vitruvian_membership"] = dict(sorted(vitruvian.items()))
    return report


def _extract_preview(moho_path: Path, output_path: Path) -> bool:
    try:
        with zipfile.ZipFile(moho_path) as archive:
            for candidate in ("preview.jpg", "preview.jpeg", "preview.png"):
                if candidate in archive.namelist():
                    with archive.open(candidate) as entry:
                        output_path.write_bytes(entry.read())
                    if _is_image(output_path):
                        return True
                    output_path.unlink(missing_ok=True)
        return False
    except OSError:
        return False


def _make_frame_variant(
    project_path: Path,
    evidence_dir: Path,
    frame: int,
    prefix: str,
) -> Path | None:
    """Write a copy of the .moho whose start/end frame equals *frame*."""
    project = _read_moho_project(project_path)
    if project is None:
        return None
    project_data = project.setdefault("project_data", {})
    project_data["start_frame"] = int(frame)
    project_data["end_frame"] = int(frame)
    variant_path = evidence_dir / f"{prefix}_variant_{int(frame):05d}.moho"
    try:
        with zipfile.ZipFile(project_path) as source, \
                zipfile.ZipFile(variant_path, "w", zipfile.ZIP_DEFLATED) as target:
            for name in source.namelist():
                data = source.read(name)
                if name == "Project.mohoproj":
                    data = json.dumps(project, ensure_ascii=False).encode("utf-8")
                target.writestr(name, data)
    except OSError:
        return None
    return variant_path


def _open_and_save(
    project_path: Path,
    output_path: Path,
    evidence_dir: Path,
    prefix: str,
    frame: int,
) -> ProcessEvidence:
    """Run one Moho process that opens a project, saves a round-trip copy, exits.

    The completion marker is written only after FileOpen and FileSaveAs.
    """
    script_path = evidence_dir / f"{prefix}_roundtrip_{int(frame):05d}.lua"
    marker_path = evidence_dir / f"{prefix}_roundtrip_{int(frame):05d}.ok"
    if marker_path.exists():
        marker_path.unlink()
    if output_path.exists() and not output_path.is_file():
        output_path.unlink()
    template = SAVE_TEMPLATE.read_text(encoding="utf-8")
    script_source = (
        template
        .replace("__SOURCE_PROJECT__", str(project_path))
        .replace("__ROUNDTRIP_OUTPUT__", str(output_path))
        .replace("__MARKER_PATH__", str(marker_path))
    )
    script_path.write_text(script_source, encoding="utf-8")
    run = _run([
        str(_moho_executable()),
        str(script_path),
    ])
    produced_marker = marker_path.is_file()
    produced_roundtrip = _read_moho_project(output_path) is not None
    if produced_marker and produced_roundtrip and not run.has_moho_error:
        run.output_files.append(str(output_path))
    elif not run.has_moho_error:
        run.returncode = 1
        reason = (
            "Moho script did not produce completion marker"
            if not produced_marker
            else "Moho did not create a valid round-trip .moho archive"
        )
        run.stderr = f"{run.stderr}\n{reason}".strip()
    return run


def _render_project(
    project_path: Path,
    evidence_dir: Path,
    label: str,
    frames: list[int],
) -> tuple[list[str], list[ProcessEvidence]]:
    outputs: list[str] = []
    runs: list[ProcessEvidence] = []
    executable = _moho_executable()
    for frame in frames:
        output_base = evidence_dir / f"{label}_frame_{frame:05d}.png"
        run = _run([
            str(executable),
            "-r", str(project_path),
            "-start", str(frame),
            "-end", str(frame),
            "-f", "PNG",
            "-o", str(output_base),
        ])
        candidates = sorted(evidence_dir.glob(f"{output_base.stem}*.png"))
        run.output_files = [str(candidate) for candidate in candidates if _is_image(candidate)]
        outputs.extend(run.output_files)
        runs.append(run)
    return outputs, runs


def _process_errors(label: str, runs: list[ProcessEvidence]) -> list[str]:
    errors: list[str] = []
    for run in runs:
        combined = f"{run.stdout}\n{run.stderr}".strip()
        if run.has_moho_error:
            match = MOHO_ERROR.search(combined)
            detail = combined[match.start():].splitlines()[0] if match else combined
            if run.requires_moho_pro:
                errors.append(f"{label}: command-line rendering requires Moho Pro")
            else:
                errors.append(f"{label}: {detail or f'exit code {run.returncode}'}")
        if not run.output_files:
            errors.append(f"{label}: Moho did not create expected output")
    return errors


def accept_project(
    project_path: str,
    evidence_dir: str,
    frames: list[int],
) -> NativeAcceptanceResult:
    """Open, save, reopen and render a project using installed Moho."""
    project = Path(project_path).resolve()
    evidence = Path(evidence_dir).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    rendered_frames: list[str] = []
    preview_frames: list[str] = []

    if not project.is_file():
        return NativeAcceptanceResult(
            opened=False, saved=False, reopened=False,
            rendered_frames=[], preview_frames=[], render_status="not_run",
            errors=[f"project does not exist: {project}"],
            stdout="", stderr="",
            roundtrip_path=str(evidence / "roundtrip.moho"),
        )
    if not frames or any(frame < 0 for frame in frames):
        raise ValueError("frames must contain non-negative frame numbers")

    try:
        with zipfile.ZipFile(project) as archive:
            if "Project.mohoproj" not in archive.namelist():
                return NativeAcceptanceResult(
                    opened=False, saved=False, reopened=False,
                    rendered_frames=[], preview_frames=[], render_status="not_run",
                    errors=[f"project is not a valid .moho archive: missing Project.mohoproj: {project}"],
                    stdout="", stderr="",
                    roundtrip_path=str(evidence / "roundtrip.moho"),
                )
    except (OSError, zipfile.BadZipFile) as error:
        return NativeAcceptanceResult(
            opened=False, saved=False, reopened=False,
            rendered_frames=[], preview_frames=[], render_status="not_run",
            errors=[f"project is not a valid .moho archive: {error}"],
            stdout="", stderr="",
            roundtrip_path=str(evidence / "roundtrip.moho"),
        )

    # Preview is useful structural evidence, but it is never counted as a
    # rendered animation frame.
    embedded_preview = evidence / "embedded_preview.jpg"
    if _extract_preview(project, embedded_preview):
        preview_frames.append(str(embedded_preview))

    roundtrip_path = evidence / "roundtrip.moho"
    source_run = _open_and_save(
        project, roundtrip_path, evidence, prefix="source", frame=frames[0]
    )
    errors.extend(_process_errors("open/save", [source_run]))
    opened = not source_run.has_moho_error and bool(source_run.output_files)
    saved = opened and _read_moho_project(roundtrip_path) is not None

    reopen_runs: list[ProcessEvidence] = []
    reopened = False
    reopened_path = evidence / "reopened.moho"
    if saved:
        reopen_run = _open_and_save(
            roundtrip_path,
            reopened_path,
            evidence,
            prefix="reopen",
            frame=frames[0],
        )
        reopen_runs.append(reopen_run)
        errors.extend(_process_errors("reopen/save", [reopen_run]))
        reopened = (
            not reopen_run.has_moho_error
            and bool(reopen_run.output_files)
            and _read_moho_project(reopened_path) is not None
        )

    render_runs: list[ProcessEvidence] = []
    render_status = "not_run"
    if reopened:
        source_frames, source_render_runs = _render_project(
            project, evidence, "source", frames
        )
        roundtrip_frames, roundtrip_render_runs = _render_project(
            reopened_path, evidence, "roundtrip", frames
        )
        rendered_frames = source_frames + roundtrip_frames
        render_runs = source_render_runs + roundtrip_render_runs
        errors.extend(_process_errors("render", render_runs))
        if len(rendered_frames) == len(frames) * 2 and all(
            not run.has_moho_error for run in render_runs
        ):
            render_status = "rendered"
        elif any(run.requires_moho_pro for run in render_runs):
            render_status = "requires_moho_pro"
        else:
            render_status = "failed"

    all_runs = [source_run] + reopen_runs + render_runs
    structure = _native_structure(_read_moho_project(reopened_path) if reopened else None)
    return NativeAcceptanceResult(
        opened=opened,
        saved=saved,
        reopened=reopened,
        rendered_frames=rendered_frames,
        preview_frames=preview_frames,
        render_status=render_status,
        errors=errors,
        stdout="\n".join(run.stdout for run in all_runs if run.stdout),
        stderr="\n".join(run.stderr for run in all_runs if run.stderr),
        roundtrip_path=str(roundtrip_path),
        **structure,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Run fail-closed native Moho acceptance")
    parser.add_argument("--project", required=True)
    parser.add_argument("--evidence-dir", required=True)
    parser.add_argument("--frames", nargs="+", required=True, type=int)
    args = parser.parse_args()
    try:
        result = accept_project(args.project, args.evidence_dir, args.frames)
        print(json.dumps(asdict(result), ensure_ascii=False))
        return 0
    except FileNotFoundError as error:
        print(json.dumps({"fatal_error": "MOHO_NOT_FOUND", "message": str(error)}))
        return 3
    except Exception as error:
        print(json.dumps({"fatal_error": "NATIVE_ACCEPTANCE_FAILED", "message": str(error)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
