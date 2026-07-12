from __future__ import annotations

import hashlib
import json
import math
import shutil
import subprocess
from pathlib import Path
from typing import List, Optional, Tuple

from .models import VideoMetadata


class VideoError(RuntimeError):
    pass


def _ratio(value: str) -> float:
    numerator, denominator = value.split("/", 1)
    return float(numerator) / float(denominator) if float(denominator) else 0.0


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def require_binary(binary: str) -> str:
    found = shutil.which(binary)
    if not found:
        raise VideoError(f"Не найден {binary}. Установите FFmpeg и настройте путь в окружении сервиса.")
    return found


def probe_video(video_path: str, ffprobe_path: str = "ffprobe") -> VideoMetadata:
    source = Path(video_path).expanduser().resolve()
    if not source.is_file():
        raise VideoError(f"Видеофайл не найден: {source}")
    executable = require_binary(ffprobe_path)
    command = [
        executable, "-v", "error", "-print_format", "json",
        "-show_streams", "-show_format", str(source)
    ]
    completed = subprocess.run(command, capture_output=True, text=True, timeout=30, check=False)
    if completed.returncode != 0:
        raise VideoError(f"FFprobe не смог прочитать видео: {completed.stderr.strip()[:1000]}")
    payload = json.loads(completed.stdout)
    stream = next((item for item in payload.get("streams", []) if item.get("codec_type") == "video"), None)
    if not stream:
        raise VideoError("В файле нет видеопотока")
    avg_fps = _ratio(stream.get("avg_frame_rate", "0/1"))
    real_fps = _ratio(stream.get("r_frame_rate", "0/1"))
    fps = avg_fps or real_fps
    duration = float(stream.get("duration") or payload.get("format", {}).get("duration") or 0)
    frame_count = int(stream.get("nb_frames") or round(duration * fps))
    rotation = float(stream.get("tags", {}).get("rotate", 0) or 0)
    for side_data in stream.get("side_data_list", []):
        if "rotation" in side_data:
            rotation = float(side_data["rotation"])
    pix_fmt = str(stream.get("pix_fmt", ""))
    return VideoMetadata(
        videoPath=str(source), sha256=_sha256(source), width=int(stream["width"]), height=int(stream["height"]),
        fps=fps, timeBase=str(stream.get("time_base", "1/1")), durationSeconds=duration,
        frameCount=frame_count, variableFrameRate=abs(avg_fps - real_fps) > 0.001,
        rotation=rotation, colorSpace=str(stream.get("color_space") or "unknown"),
        hasAlpha="a" in pix_fmt.split("le")[0]
    )


def enforce_limits(metadata: VideoMetadata, max_duration: int, max_width: int, max_height: int) -> None:
    if metadata.duration_seconds > max_duration:
        raise VideoError(f"Видео длиннее лимита {max_duration} секунд")
    if metadata.width > max_width or metadata.height > max_height:
        raise VideoError(f"Разрешение {metadata.width}x{metadata.height} превышает лимит {max_width}x{max_height}")


def extract_frames(
    video_path: str,
    output_dir: Path,
    ffmpeg_path: str = "ffmpeg",
    start_frame: Optional[int] = None,
    end_frame: Optional[int] = None,
    target_fps: Optional[float] = None,
) -> Tuple[List[Path], Optional[str]]:
    executable = require_binary(ffmpeg_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    for old in output_dir.glob("frame_*.png"):
        old.unlink()
    filters = []
    if start_frame or end_frame:
        first = (start_frame or 1) - 1
        last = (end_frame or 2**31) - 1
        filters.append(f"select='between(n,{first},{last})'")
        if target_fps:
            filters.append("setpts=N/FRAME_RATE/TB")
    if target_fps:
        filters.append(f"fps={target_fps:.8f}")
    command = [executable, "-hide_banner", "-loglevel", "error", "-i", str(Path(video_path).resolve())]
    if filters:
        command.extend(["-vf", ",".join(filters)])
    command.extend(["-vsync", "0", "-compression_level", "3", str(output_dir / "frame_%06d.png")])
    completed = subprocess.run(command, capture_output=True, text=True, timeout=600, check=False)
    if completed.returncode != 0:
        raise VideoError(f"FFmpeg не смог извлечь кадры: {completed.stderr.strip()[:2000]}")
    frames = sorted(output_dir.glob("frame_*.png"))
    if not frames:
        raise VideoError("FFmpeg не создал ни одного кадра")
    timing_note = f"FPS явно преобразован в {target_fps}" if target_fps else None
    return frames, timing_note
