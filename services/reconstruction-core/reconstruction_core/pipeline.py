from __future__ import annotations

import hashlib
import json
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

from .dedup import build_exposure_blocks, deduplicate
from .models import (
    Capability, Connection, Diagnostics, Drawing, Element, Exposure,
    HarmonyReconstructionManifest, Node, Palette, ReconstructionRequest,
    utc_now,
)
from .palette import normalize_palette
from .preprocess import temporal_cleanup
from .storage import JobStorage
from .vectorize import vectorize_frame
from .video import enforce_limits, extract_frames, probe_video


def _timed(durations: Dict[str, float], name: str):
    class Timer:
        def __enter__(self):
            self.started = time.perf_counter()

        def __exit__(self, *_args):
            durations[name] = round((time.perf_counter() - self.started) * 1000, 3)
    return Timer()


def _job_id(request: ReconstructionRequest, source_sha: str) -> str:
    payload = request.model_dump(by_alias=True, exclude={"confirm", "confirmation_text", "target_project_path", "output_project_path"})
    payload["sourceSha256"] = source_sha
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()[:24]


def _scene_name(video_path: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "_", Path(video_path).stem).strip("_")
    return (cleaned or "Reconstructed_Shot")[:80]


class ReconstructionPipeline:
    def __init__(self, storage: JobStorage, ffmpeg_path: str, ffprobe_path: str, limits: Tuple[int, int, int]):
        self.storage = storage
        self.ffmpeg_path = ffmpeg_path
        self.ffprobe_path = ffprobe_path
        self.max_duration, self.max_width, self.max_height = limits

    def _prepare(self, request: ReconstructionRequest) -> Tuple[str, Any, Path, Dict[str, float]]:
        durations: Dict[str, float] = {}
        with _timed(durations, "probe"):
            metadata = probe_video(request.video_path, self.ffprobe_path)
            enforce_limits(metadata, self.max_duration, self.max_width, self.max_height)
            if metadata.variable_frame_rate and request.target_fps is None:
                raise ValueError("Для видео с переменной частотой кадров явно задайте targetFps; скрытое изменение timing запрещено")
        job_id = _job_id(request, metadata.sha256)
        return job_id, metadata, self.storage.job_dir(job_id), durations

    def analyze(self, request: ReconstructionRequest) -> Dict[str, Any]:
        job_id, metadata, job_dir, durations = self._prepare(request)
        frames, timing_note = self._extract_and_normalize(request, metadata, job_dir, durations)
        normalized, palette = frames
        with _timed(durations, "deduplicate"):
            representatives, mapping, metrics = deduplicate(normalized, request.dedup_threshold)
        report = {
            "video": metadata.model_dump(by_alias=True, mode="json"),
            "extractedFrameCount": len(normalized),
            "uniqueDrawingCount": len(representatives),
            "duplicateFrameCount": len(normalized) - len(representatives),
            "paletteColorCount": len(palette),
            "timingConversion": timing_note,
            "frameMapping": mapping,
            "comparisonMetrics": metrics,
            "stageDurationsMs": durations,
        }
        analysis_path = self.storage.write_json(job_id, "analysis.json", report)
        return self._completed_job(job_id, analysis_path=str(analysis_path), report=report)

    def reconstruct(self, request: ReconstructionRequest) -> Dict[str, Any]:
        job_id, metadata, job_dir, durations = self._prepare(request)
        existing = job_dir / "manifest.json"
        if existing.exists():
            manifest = HarmonyReconstructionManifest.model_validate_json(existing.read_text(encoding="utf-8"))
            return self._completed_job(job_id, manifest_path=str(existing), report=manifest.diagnostics.model_dump(by_alias=True))
        self._running_job(job_id, "extract_frames", 0.1)
        (normalized, palette), timing_note = self._extract_and_normalize(request, metadata, job_dir, durations)
        selected_fps = request.target_fps or metadata.fps
        metadata = metadata.model_copy(update={
            "fps": selected_fps,
            "time_base": f"1/{selected_fps:g}",
            "duration_seconds": len(normalized) / selected_fps,
            "frame_count": len(normalized),
            "variable_frame_rate": False if request.target_fps else metadata.variable_frame_rate,
        })
        self._running_job(job_id, "deduplicate", 0.55)
        with _timed(durations, "deduplicate"):
            representatives, mapping, _metrics = deduplicate(normalized, request.dedup_threshold)
        self._running_job(job_id, "vectorize", 0.7)
        drawings: List[Drawing] = []
        with _timed(durations, "vectorize"):
            for drawing_index, frame_index in enumerate(representatives, start=1):
                source_frame = frame_index + 1
                shapes = vectorize_frame(normalized[frame_index], palette, source_frame, request.max_points_per_shape)
                if not shapes:
                    raise RuntimeError(f"Векторизация кадра {source_frame} не создала редактируемых форм")
                drawings.append(Drawing(
                    id=f"drawing_{drawing_index:06d}", name=f"F_{source_frame:06d}", sourceFrame=source_frame,
                    normalizedImagePath=str(normalized[frame_index]), shapes=shapes,
                    pointCount=sum(len(shape.points) for shape in shapes)
                ))
        exposures = [
            Exposure(frame=start, duration=duration, drawingId=drawings[drawing_index].id)
            for start, duration, drawing_index in build_exposure_blocks(mapping)
        ]
        warnings = []
        if timing_note:
            warnings.append(timing_note)
        if metadata.variable_frame_rate:
            warnings.append("Источник имеет переменную частоту кадров; сохранён порядок декодированных кадров без скрытого FPS-преобразования.")
        scene_name = _scene_name(request.video_path)
        total_points = sum(drawing.point_count for drawing in drawings)
        manifest_seed = f"{job_id}:{metadata.sha256}:1.0"
        manifest = HarmonyReconstructionManifest(
            schemaVersion="1.0", manifestId=hashlib.sha256(manifest_seed.encode()).hexdigest()[:32],
            createdAt=utc_now(), mode="frame_by_frame_vector", source=metadata,
            scene={"name": scene_name, "width": metadata.width, "height": metadata.height, "fps": selected_fps, "startFrame": 1, "endFrame": len(normalized)},
            palettes=[Palette(id="palette_main", name=f"{scene_name}_Palette", colors=palette)],
            elements=[Element(id="element_main", name=f"{scene_name}_Drawings", nodeName=f"{scene_name}_READ", drawingIds=[d.id for d in drawings])],
            drawings=drawings, exposures=exposures,
            nodes=[
                Node(id="node_read", name=f"{scene_name}_READ", type="READ", autoCreated=True),
                Node(id="node_composite", name=f"{scene_name}_COMPOSITE", type="COMPOSITE", autoCreated=True),
                Node(id="node_display", name=f"{scene_name}_DISPLAY", type="DISPLAY", autoCreated=True),
            ],
            connections=[
                Connection(**{"from": "node_read", "to": "node_composite", "fromPort": 0, "toPort": 0}),
                Connection(**{"from": "node_composite", "to": "node_display", "fromPort": 0, "toPort": 0}),
            ],
            diagnostics=Diagnostics(
                uniqueDrawingCount=len(drawings), duplicateFrameCount=len(normalized) - len(drawings),
                paletteColorCount=len(palette), totalPointCount=total_points, warnings=warnings,
                stageDurationsMs=durations,
                capability=Capability(vectorBackend="python_dom_shapes", lineArt=False, colourArt=True)
            )
        )
        manifest_path = self.storage.write_json(job_id, "manifest.json", manifest.model_dump(by_alias=True, mode="json"))
        
        # Генерируем SVG-превью для каждого рисунка
        from .preview import generate_svg_previews
        generate_svg_previews(manifest, job_dir / "svg_preview")

        report = manifest.diagnostics.model_dump(by_alias=True, mode="json")
        return self._completed_job(job_id, manifest_path=str(manifest_path), report=report)

    def _extract_and_normalize(self, request, metadata, job_dir, durations):
        with _timed(durations, "extract_frames"):
            frames, timing_note = extract_frames(
                request.video_path, job_dir / "frames", self.ffmpeg_path,
                request.start_frame, request.end_frame, request.target_fps
            )
        with _timed(durations, "temporal_cleanup"):
            cleaned = temporal_cleanup(frames, job_dir / "cleaned", request.cleanup_profile)
        with _timed(durations, "palette_normalization"):
            normalized, palette = normalize_palette(cleaned, job_dir / "normalized", request.max_colors)
        return (normalized, palette), timing_note

    def _running_job(self, job_id: str, stage: str, progress: float):
        self.storage.write_job(job_id, {"jobId": job_id, "status": "running", "stage": stage, "progress": progress})

    def _completed_job(self, job_id: str, manifest_path=None, analysis_path=None, report=None):
        job = {"jobId": job_id, "status": "completed", "stage": "completed", "progress": 1.0}
        if manifest_path:
            job["manifestPath"] = manifest_path
        if analysis_path:
            job["analysisPath"] = analysis_path
        if report is not None:
            job["report"] = report
        self.storage.write_job(job_id, job)
        return job
