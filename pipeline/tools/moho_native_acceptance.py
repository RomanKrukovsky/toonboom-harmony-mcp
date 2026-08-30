"""Fail-closed native acceptance checks executed by real Moho."""

from __future__ import annotations

import fcntl
import json
import os
import re
import subprocess
import tempfile
import zipfile
from dataclasses import dataclass, field
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
        return self.returncode != 0 or bool(MOHO_ERROR.search(combined))

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


def _moho_executable() -> Path:
    configured = os.environ.get("MOHO_EXECUTABLE")
    executable = Path(configured) if configured else DEFAULT_MOHO
    if not executable.is_file():
        raise FileNotFoundError(f"Moho executable not found: {executable}")
    return executable


def _run(command: list[str], timeout: int = 30) -> ProcessEvidence:
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
                if completed.returncode not in TRANSIENT_MOHO_RETURN_CODES:
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
    )
