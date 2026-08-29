"""Fail-closed native acceptance checks executed by real Moho."""

from __future__ import annotations

import os
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
DEFAULT_MOHO = Path("/Applications/Moho.app/Contents/MacOS/Moho")
SAVE_TEMPLATE = REPO / "scripts/moho/roundtrip_save.lua.template"
MOHO_ERROR = re.compile(r"\bError\s*\(\d+\):", re.IGNORECASE)
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


@dataclass
class ProcessEvidence:
    command: list[str]
    returncode: int
    stdout: str
    stderr: str
    output_files: list[str] = field(default_factory=list)

    @property
    def has_moho_error(self) -> bool:
        return self.returncode != 0 or bool(MOHO_ERROR.search(
            f"{self.stdout}\n{self.stderr}"
        ))


@dataclass
class NativeAcceptanceResult:
    opened: bool
    saved: bool
    reopened: bool
    rendered_frames: list[str]
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


def _run(command: list[str], timeout: int = 45) -> ProcessEvidence:
    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            check=False,
            text=True,
            timeout=timeout,
        )
        return ProcessEvidence(
            command=command,
            returncode=completed.returncode,
            stdout=completed.stdout,
            stderr=completed.stderr,
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


def _is_png(path: Path) -> bool:
    return path.is_file() and path.stat().st_size > 8 and path.read_bytes()[:8] == PNG_SIGNATURE


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
        command = [
            str(executable),
            "-r",
            str(project_path),
            "-start",
            str(frame),
            "-end",
            str(frame),
            "-f",
            "PNG",
            "-o",
            str(output_base),
        ]
        run = _run(command)
        candidates = sorted(evidence_dir.glob(f"{output_base.stem}*.png"))
        valid = [str(candidate) for candidate in candidates if _is_png(candidate)]
        run.output_files = valid
        runs.append(run)
        outputs.extend(valid)

    return outputs, runs


def _save_roundtrip(project_path: Path, evidence_dir: Path) -> tuple[Path, ProcessEvidence]:
    roundtrip_path = evidence_dir / "roundtrip.moho"
    script_path = evidence_dir / "roundtrip_save.lua"
    script_source = SAVE_TEMPLATE.read_text(encoding="utf-8")
    script_path.write_text(
        script_source
        .replace("__SOURCE_PROJECT__", str(project_path))
        .replace("__ROUNDTRIP_OUTPUT__", str(roundtrip_path)),
        encoding="utf-8",
    )
    run = _run([
        str(_moho_executable()),
        str(script_path),
    ])
    if roundtrip_path.is_file():
        run.output_files = [str(roundtrip_path)]
    return roundtrip_path, run


def _process_errors(label: str, runs: list[ProcessEvidence]) -> list[str]:
    errors: list[str] = []
    for run in runs:
        combined = f"{run.stdout}\n{run.stderr}".strip()
        if run.has_moho_error:
            match = MOHO_ERROR.search(combined)
            detail = combined[match.start():].splitlines()[0] if match else combined
            errors.append(f"{label}: {detail or f'exit code {run.returncode}'}")
        if not run.output_files:
            errors.append(f"{label}: Moho did not create expected output")
    return errors


def accept_project(
    project_path: str,
    evidence_dir: str,
    frames: list[int],
) -> NativeAcceptanceResult:
    """Open, save-as, reopen and render a project using installed Moho."""
    project = Path(project_path).resolve()
    evidence = Path(evidence_dir).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    if not project.is_file():
        return NativeAcceptanceResult(
            opened=False,
            saved=False,
            reopened=False,
            rendered_frames=[],
            errors=[f"project does not exist: {project}"],
            stdout="",
            stderr="",
            roundtrip_path=str(evidence / "roundtrip.moho"),
        )
    if not frames or any(frame < 0 for frame in frames):
        raise ValueError("frames must contain non-negative frame numbers")

    source_frames, source_runs = _render_project(project, evidence, "source", frames)
    opened = len(source_frames) == len(frames) and all(
        not run.has_moho_error for run in source_runs
    )
    errors = _process_errors("open/render", source_runs)

    roundtrip_path = evidence / "roundtrip.moho"
    save_run = ProcessEvidence([], 1, "", "source project did not open")
    roundtrip_frames: list[str] = []
    reopen_runs: list[ProcessEvidence] = []
    saved = False
    reopened = False

    if opened:
        roundtrip_path, save_run = _save_roundtrip(project, evidence)
        saved = (
            roundtrip_path.is_file()
            and roundtrip_path.stat().st_size > 0
            and not save_run.has_moho_error
        )
        errors.extend(_process_errors("save-as", [save_run]))

    if saved:
        roundtrip_frames, reopen_runs = _render_project(
            roundtrip_path,
            evidence,
            "roundtrip",
            frames,
        )
        reopened = len(roundtrip_frames) == len(frames) and all(
            not run.has_moho_error for run in reopen_runs
        )
        errors.extend(_process_errors("reopen/render", reopen_runs))

    all_runs = source_runs + [save_run] + reopen_runs
    return NativeAcceptanceResult(
        opened=opened,
        saved=saved,
        reopened=reopened,
        rendered_frames=source_frames + roundtrip_frames,
        errors=errors,
        stdout="\n".join(run.stdout for run in all_runs if run.stdout),
        stderr="\n".join(run.stderr for run in all_runs if run.stderr),
        roundtrip_path=str(roundtrip_path),
    )
