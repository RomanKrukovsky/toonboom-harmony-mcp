"""
smoke_audio_blender.py — звук в живой сцене Blender + MP4 со звуком.

Доказывает шаг 4 из ROADMAP: до этого звука не было нигде. Проверяется
не «код не упал», а результат ЧИСЛАМИ:
  - дорожка реально легла в сцену (читаем обратно из .blend);
  - MP4 содержит аудиопоток (ffprobe), а не только картинку;
  - длительности сцены и звука сошлись.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from audio import AudioTrack, check_sync, mux
from blender_host import (
    BChannel,
    BPart,
    BSceneSpec,
    blender_available,
    build_scene,
)
from columns import Key, sample_profile
from blender_host import channels_from_engine

OUT = Path("/tmp/blender_audio")
FPS = 24
FRAMES = 48          # 2 секунды


def make_tone(path: Path, seconds: float) -> bool:
    if shutil.which("ffmpeg") is None:
        return False
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", f"sine=f=440:d={seconds}",
         "-ac", "1", "-ar", "44100", str(path)],
        capture_output=True)
    return path.exists()


def spec_with_audio(wav: Path) -> BSceneSpec:
    import math
    pts = [(0.30 * math.cos(2 * math.pi * i / 18),
            0.30 * math.sin(2 * math.pi * i / 18)) for i in range(18)]
    ball = BPart("ball", None, (0.0, 0.0), pts, (0.90, 0.35, 0.30))
    s = sample_profile("ease_in_out", FRAMES)
    keys = [Key(frame=i + 1, value=-1.2 + 2.4 * v) for i, v in enumerate(s)]
    return BSceneSpec(
        name="audio_scene", fps=FPS, frame_start=1, frame_end=FRAMES,
        resolution=(320, 240), parts=[ball],
        channels=channels_from_engine({"ball.x": keys}),
        camera_ortho_scale=4.0, camera_loc=(0.0, 0.0),
        audio_tracks=[AudioTrack(str(wav), start_frame=1, volume=0.8).as_dict()])


def has_audio_stream(mp4: Path) -> tuple[bool, str]:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a",
         "-show_entries", "stream=codec_name,channels,sample_rate",
         "-of", "default=nw=1", str(mp4)],
        capture_output=True, text=True)
    return (bool(r.stdout.strip()), r.stdout.strip() or r.stderr[-200:])


def main() -> int:
    ok, msg = blender_available()
    print(f"blender: {msg}")
    if not ok:
        return 1
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        print("SKIP: ffmpeg/ffprobe not on PATH")
        return 0

    OUT.mkdir(parents=True, exist_ok=True)
    wav = OUT / "tone.wav"
    if not make_tone(wav, FRAMES / FPS):
        print("FAIL: could not create test audio")
        return 1

    sync = check_sync(FRAMES, FPS, wav)
    print(f"  sync: {sync['verdict']} (scene {sync['scene_seconds']}s, "
          f"audio {sync['audio_seconds']}s)")
    if not sync["in_sync"]:
        print("FAIL: test fixture itself is out of sync")
        return 1

    rep = build_scene(spec_with_audio(wav), OUT, render=True, frames=(1, FRAMES))
    print(f"  build: rc={rep['returncode']} frames={rep['frames_rendered']}")
    if rep["returncode"] != 0 or rep["frames_rendered"] < FRAMES:
        print(rep["log_tail"][-900:])
        print(rep["stderr_tail"][-400:])
        return 1

    # Дорожка реально в сцене? Читаем обратно из сохранённого .blend.
    probe = subprocess.run(
        ["/Applications/Blender.app/Contents/MacOS/Blender", "-b",
         rep["blend"], "--python-expr",
         "import bpy\n"
         "se = bpy.context.scene.sequence_editor\n"
         "ss = [s for s in (se.strips if se else []) if s.type == 'SOUND']\n"
         "print('SOUND_STRIPS', len(ss))\n"
         "[print('STRIP', s.name, round(s.volume, 2), s.frame_final_start) for s in ss]"],
        capture_output=True, text=True)
    lines = [l for l in probe.stdout.splitlines()
             if l.startswith(("SOUND_STRIPS", "STRIP"))]
    print("  " + " | ".join(lines))
    if not any(l.startswith("SOUND_STRIPS 1") for l in lines):
        print("FAIL: audio track did not land in the scene")
        return 1

    mp4 = OUT / "with_audio.mp4"
    mux(OUT / "f%04d.png", wav, mp4, FPS)
    present, detail = has_audio_stream(mp4)
    print(f"  mp4 audio stream: {detail.replace(chr(10), ' ')}")
    if not present:
        print("FAIL: rendered MP4 has no audio stream")
        return 1

    print(f"PASS: audio landed in the live Blender scene and in the MP4 "
          f"({mp4.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
