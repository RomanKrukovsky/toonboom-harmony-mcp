"""
audio.py — звук в сцене: дорожка, синхронизация, сведение в видео.

ЧЕГО НЕ ХВАТАЛО. `phonemes.py` разбирает WAV на фонемы и это работает,
но положить дорожку В СЦЕНУ было нечем. Липсинк без звука в сцене —
половина функции: художник не может проверить попадание рта в звук, а
финальный ролик уходит немым.

ЧТО ЗДЕСЬ ЕСТЬ:
  - `AudioTrack` — описание дорожки для спеки сцены (Blender VSE);
  - `align_phonemes_to_frames` — фонемы (секунды) -> кадры сцены;
  - `lipsync_channel` — готовый substitution-канал рта из фонем;
  - `mux` — сведение PNG-секвенции со звуком в MP4.

ГЛАВНАЯ ЛОВУШКА, из-за которой этот файл написан осторожно: **звук
живёт в секундах, анимация — в кадрах, и переход между ними теряет
точность.** При 24 fps один кадр это 41.67 мс. Фонема длиной 30 мс
короче кадра: наивное округление её ЛИБО стирает, либо растягивает
вдвое. И то и другое читается как рассинхрон губ, причём тем сильнее,
чем быстрее речь.

Поэтому здесь нет ни одного «просто round()»: округление явное, потери
считаются и отдаются наружу отчётом.
"""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal, Sequence

from drawings import Assignment
from phonemes import Phoneme


@dataclass
class AudioTrack:
    """Дорожка для сцены. path — существующий файл, иначе это не дорожка."""
    path: str
    start_frame: int = 1
    volume: float = 1.0
    name: str = "dialogue"

    def validate(self) -> None:
        p = Path(self.path)
        if not p.exists():
            raise FileNotFoundError(f"audio track not found: {self.path}")
        if p.suffix.lower() not in (".wav", ".aif", ".aiff", ".mp3", ".flac", ".m4a"):
            raise ValueError(f"unsupported audio format: {p.suffix}")
        if self.start_frame < 1:
            raise ValueError("start_frame is 1-based")
        if not 0.0 <= self.volume <= 4.0:
            raise ValueError("volume out of sane range (0..4)")

    def as_dict(self) -> dict:
        return {"path": self.path, "start_frame": self.start_frame,
                "volume": self.volume, "name": self.name}


# ---------------------------------------------------------------------------
# Секунды -> кадры
# ---------------------------------------------------------------------------

@dataclass
class AlignedPhoneme:
    phoneme: str
    start_frame: int
    end_frame: int          # включительно
    duration_frames: int


@dataclass
class AlignmentReport:
    """
    Отчёт о потерях при переводе секунд в кадры. Отдаётся НАРУЖУ, потому
    что решение «это допустимо» — не моё: на медленной речи потеря одной
    короткой фонемы незаметна, на быстрой ломает синхрон.
    """
    aligned: list[AlignedPhoneme]
    dropped: list[tuple[str, float]]        # (фонема, длительность в сек)
    merged: list[tuple[str, str]]           # пары, слитые в один кадр
    fps: int

    @property
    def frame_ms(self) -> float:
        return 1000.0 / self.fps

    def summary(self) -> dict:
        return {
            "phonemes": len(self.aligned),
            "dropped": len(self.dropped),
            "merged": len(self.merged),
            "frame_ms": round(self.frame_ms, 2),
            "note": (
                f"at {self.fps} fps one frame is {self.frame_ms:.1f} ms; "
                f"{len(self.dropped)} phoneme(s) were shorter than a frame and "
                f"could not be shown separately"
                if self.dropped else
                f"all phonemes are at least one frame long at {self.fps} fps"
            ),
        }


def align_phonemes_to_frames(
    phonemes: Sequence[Phoneme], fps: int, start_frame: int = 1,
    min_frames: int = 1,
    on_short: Literal["drop", "keep"] = "keep",
) -> AlignmentReport:
    """
    Фонемы в секундах -> позиции в кадрах.

    on_short="keep" (по умолчанию): фонема короче кадра всё равно
    получает один кадр, а следующая сдвигается. Губы «спешат», но ни
    один звук не пропадает — для комедии и быстрой речи это меньшее зло.

    on_short="drop": короткие фонемы выбрасываются, тайминг остальных
    остаётся точным. Годится для спокойной речи.

    Оба варианта ЯВНЫЕ. Молчаливое округление — то, из-за чего липсинк
    «почти совпадает» и никто не может объяснить почему.
    """
    if fps <= 0:
        raise ValueError("fps must be positive")
    if min_frames < 1:
        raise ValueError("min_frames must be >= 1")

    aligned: list[AlignedPhoneme] = []
    dropped: list[tuple[str, float]] = []
    merged: list[tuple[str, str]] = []
    cursor = start_frame

    for ph in phonemes:
        dur_s = max(0.0, ph.end_s - ph.start_s)
        exact = dur_s * fps
        frames = int(round(exact))
        if frames < min_frames:
            if on_short == "drop":
                dropped.append((ph.sound, dur_s))
                continue
            frames = min_frames
            dropped.append((ph.sound, dur_s))   # записан как «растянут»

        # Позиция: по времени фонемы, но не раньше курсора — иначе
        # соседние фонемы наложатся и последняя затрёт предыдущую.
        want = start_frame + int(round(ph.start_s * fps))
        if want < cursor:
            if aligned:
                merged.append((aligned[-1].phoneme, ph.sound))
            want = cursor

        aligned.append(AlignedPhoneme(
            phoneme=ph.sound, start_frame=want,
            end_frame=want + frames - 1, duration_frames=frames))
        cursor = want + frames

    return AlignmentReport(aligned, dropped, merged, fps)


# ---------------------------------------------------------------------------
# Липсинк-канал
# ---------------------------------------------------------------------------

def lipsync_channel(report: AlignmentReport,
                    mouth_map: dict[str, str],
                    default: str = "flat") -> list[Assignment]:
    """
    Из выровненных фонем — готовый substitution-канал рта.

    mouth_map: фонема -> имя рисунка ("AA" -> "mouth_A"). Неизвестная
    фонема НЕ подставляет default молча: она попадает в отчёт вызывающего
    через исключение, потому что «рот не открылся на половине слов» —
    это дефект, который надо увидеть сразу.
    """
    missing = sorted({a.phoneme for a in report.aligned
                      if a.phoneme not in mouth_map})
    if missing:
        raise KeyError(
            f"no mouth drawing for phoneme(s): {', '.join(missing)}. "
            f"Add them to mouth_map or the character will keep its mouth shut "
            f"through those sounds.")

    out: list[Assignment] = []
    for a in report.aligned:
        out.append(Assignment(frame=a.start_frame,
                              drawing=mouth_map[a.phoneme],
                              duration=a.duration_frames))
    # Закрыть рот после последней фонемы: иначе персонаж застывает с
    # открытым ртом до конца сцены.
    if out:
        last = report.aligned[-1]
        out.append(Assignment(frame=last.end_frame + 1, drawing=default))
    return out


# ---------------------------------------------------------------------------
# Сведение
# ---------------------------------------------------------------------------

def mux(png_pattern: str | Path, audio: str | Path, out_mp4: str | Path,
        fps: int, audio_offset_s: float = 0.0) -> Path:
    """
    PNG-секвенция + звук -> MP4.

    `-shortest` НЕ используется намеренно: он молча обрезает результат по
    короткой дорожке, и ролик недосчитывается кадров, если звук короче
    картинки. Лучше получить видео полной длины с тишиной в хвосте, чем
    потерянный финал.
    """
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg not on PATH")
    a = Path(audio)
    if not a.exists():
        raise FileNotFoundError(f"audio not found: {a}")

    args = ["ffmpeg", "-y", "-framerate", str(fps), "-i", str(png_pattern)]
    if audio_offset_s:
        args += ["-itsoffset", f"{audio_offset_s:.4f}"]
    args += ["-i", str(a),
             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
             "-c:a", "aac", "-b:a", "192k",
             "-map", "0:v:0", "-map", "1:a:0",
             str(out_mp4)]
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {r.stderr[-600:]}")
    return Path(out_mp4)


def probe_duration_s(media: str | Path) -> float:
    """Длительность файла в секундах через ffprobe. Нужна, чтобы
    сравнить длину звука с длиной сцены ДО рендера."""
    if shutil.which("ffprobe") is None:
        raise RuntimeError("ffprobe not on PATH")
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(media)],
        capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {r.stderr[-300:]}")
    return float(r.stdout.strip())


def check_sync(scene_frames: int, fps: int, audio_path: str | Path,
               tolerance_s: float = 0.25) -> dict:
    """
    Сцена и звук одной длины?

    Расхождение в полсекунды на тридцати секундах — это уже видно на
    губах в конце. Проверка ДО рендера дешевле, чем после.
    """
    audio_s = probe_duration_s(audio_path)
    scene_s = scene_frames / fps
    drift = scene_s - audio_s
    return {
        "scene_seconds": round(scene_s, 3),
        "audio_seconds": round(audio_s, 3),
        "drift_seconds": round(drift, 3),
        "in_sync": abs(drift) <= tolerance_s,
        "verdict": (
            "lengths match" if abs(drift) <= tolerance_s else
            (f"scene is {drift:.2f}s LONGER than audio — the tail will be silent"
             if drift > 0 else
             f"audio is {-drift:.2f}s longer than the scene — the end of the line "
             f"will be cut off")
        ),
    }
