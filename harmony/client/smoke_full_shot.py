"""
smoke_full_shot.py — полный шот из всех слоёв. Впервые вместе.

До этого каждый слой был доказан по отдельности: движение, тайминг из
движка, звук, рисунки, подмена рта. Вместе — ни разу, а именно на стыках
живут дефекты, которых не видит ни один отдельный тест.

Собирается: персонаж из PNG с прозрачностью, риг с иерархией и пивотами,
тайминг из движка ремесла (антиципация + heavy_impact + settle),
липсинк из фонем, звук в сцене, финальный MP4 со звуком.

Проверяется ЧИСЛАМИ по готовым файлам:
  - все кадры отрендерены;
  - персонаж виден и двигается;
  - рот действительно меняется по кадрам (а не застыл на одном варианте);
  - в MP4 есть аудиопоток;
  - длительность MP4 совпадает с расчётной.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from artwork import ArtPart, ArtSet, image_part_specs, summary, validate
from audio import AudioTrack, align_phonemes_to_frames, check_sync, lipsync_channel, mux
from blender_host import BSceneSpec, blender_available, build_scene, channels_from_engine
from columns import Key, sample_profile
from craft import breathe_hold
from drawings import Phoneme
from provenance import Ledger
from swaps import swap_groups_spec

OUT = Path("/tmp/full_shot")
FPS = 24
FRAMES = 72                      # 3 секунды
BODY = (70, 110, 190)
HEAD = (235, 200, 165)
ARM = (225, 155, 55)
MOUTH_DARK = (120, 45, 50)


def draw_character(d: Path) -> ArtSet:
    """«Художник» рисует части. Асимметрия намеренная — ловит зеркала."""
    from PIL import Image, ImageDraw
    d.mkdir(parents=True, exist_ok=True)

    def new(w, h):
        return Image.new("RGBA", (w, h), (0, 0, 0, 0))

    torso = new(140, 200)
    ImageDraw.Draw(torso).rounded_rectangle([15, 5, 125, 195], radius=40,
                                            fill=BODY + (255,))
    torso.save(d / "torso.png")

    head = new(150, 150)
    dh = ImageDraw.Draw(head)
    dh.ellipse([8, 8, 142, 142], fill=HEAD + (255,))
    dh.ellipse([45, 50, 65, 74], fill=(30, 30, 35, 255))     # глаза
    dh.ellipse([90, 50, 110, 74], fill=(30, 30, 35, 255))
    dh.polygon([(120, 30), (140, 12), (132, 44)], fill=(200, 90, 60, 255))  # метка
    head.save(d / "head.png")

    arm = new(50, 170)
    ImageDraw.Draw(arm).rounded_rectangle([10, 5, 40, 165], radius=15,
                                          fill=ARM + (255,))
    arm.save(d / "arm.png")

    # Рты: три варианта одной группы
    for name, box in (("flat", [30, 44, 70, 52]),
                      ("A", [26, 30, 74, 66]),
                      ("E", [28, 38, 72, 58])):
        m = new(100, 100)
        ImageDraw.Draw(m).ellipse(box, fill=MOUTH_DARK + (255,))
        m.save(d / f"mouth_{name}.png")

    parts = [
        ArtPart("torso", "torso.png", None, (0.5, 0.98),
                attach=(0.0, 0.0), depth=0.30, scale=2.2),
        ArtPart("arm", "arm.png", "torso", (0.5, 0.05),
                attach=(0.20, 0.36), depth=-0.20, scale=2.2),
        ArtPart("head", "head.png", "torso", (0.5, 0.92),
                attach=(0.0, 0.44), depth=0.10, scale=2.2),
    ]
    for v in ("flat", "A", "E"):
        parts.append(ArtPart(f"mouth__{v}", f"mouth_{v}.png", "head",
                             (0.5, 0.5), attach=(0.02, -0.10),
                             depth=-0.05, scale=1.0))
    return ArtSet("hero", parts, d)


def animation_channels() -> dict[str, list[Key]]:
    """Тайминг из движка ремесла: замах, бросок, приземление, дыхание."""
    ch: dict[str, list[Key]] = {}

    def dense(profile, f0, f1, v0, v1):
        n = f1 - f0 + 1
        s = sample_profile(profile, n)
        return [Key(frame=f0 + i, value=v0 + (v1 - v0) * s[i]) for i in range(n)]

    def hold(f0, f1, v):
        return [Key(frame=f0, value=v), Key(frame=f1, value=v)]

    # рука: антиципация назад -> взмах -> оседание
    arm = hold(1, 10, -8.0)
    arm += dense("ease_in", 11, 24, -8.0, -48.0)        # замах
    arm += hold(24, 28, -48.0)                          # микрохолд
    arm += dense("ease_out", 29, 40, -48.0, 92.0)       # взмах
    arm += dense("settle", 41, 60, 92.0, 70.0)
    arm += hold(60, FRAMES, 70.0)
    ch["arm.rot"] = arm

    # корпус приседает на замахе (heavy_impact — падение веса вниз)
    y = hold(1, 10, 0.0)
    y += dense("ease_in", 11, 28, 0.0, -0.10)
    y += dense("heavy_impact", 29, 38, -0.10, 0.0)
    y += dense("settle", 38, 56, 0.0, 0.0)
    y += hold(56, FRAMES, 0.0)
    ch["torso.y"] = y

    # голова: дыхание на холде — лечение мёртвого кадра
    ch["head.rot"] = (breathe_hold(1, 28, 0.0, amplitude=1.4,
                                   period_frames=26.0, seed=3)
                      + dense("ease_out", 29, 42, 0.0, -7.0)
                      + dense("settle", 42, 62, -7.0, 0.0)
                      + hold(62, FRAMES, 0.0))
    return ch


def make_voice(path: Path, seconds: float) -> bool:
    if shutil.which("ffmpeg") is None:
        return False
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi",
                    "-i", f"sine=f=330:d={seconds}", "-ac", "1", "-ar", "44100",
                    str(path)], capture_output=True)
    return path.exists()


def count_colour(png: Path, rgb, tol=30) -> int:
    return centroid(png, rgb, tol)[0]


def centroid(png: Path, rgb, tol=30) -> tuple[int, float | None, float | None]:
    """Площадь и центр масс цвета. Центр обязателен: площадь одна
    проверяет слишком мало.

    Замеченное на этом шоте: рука в замахе уходит ЗА торс, и её площадь
    падает с 644 до 195 пикселей. Проверка «площадь изменилась» на таком
    кадре прошла бы и при полностью неподвижной руке, спрятанной за
    корпусом. Движение доказывает только смещение центра.
    """
    from PIL import Image
    im = Image.open(png).convert("RGB")
    px = im.load()
    w, h = im.size
    n = sx = sy = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if abs(r - rgb[0]) <= tol and abs(g - rgb[1]) <= tol and abs(b - rgb[2]) <= tol:
                n += 1
                sx += x
                sy += y
    return n, (sx / n if n else None), (sy / n if n else None)


def main() -> int:
    ok, msg = blender_available()
    print(f"blender: {msg}")
    if not ok:
        return 1
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        print("SKIP: ffmpeg/ffprobe not on PATH")
        return 0

    OUT.mkdir(parents=True, exist_ok=True)
    art = draw_character(OUT / "parts")
    rep_v = summary(validate(art))
    print(f"  artwork: {rep_v['verdict']}")
    if not rep_v["usable"]:
        for f in rep_v["findings"]:
            if f["severity"] == "error":
                print("   ", f["rule"], f["part"], f["message"])
        return 1

    wav = OUT / "voice.wav"
    if not make_voice(wav, FRAMES / FPS):
        print("FAIL: no test audio")
        return 1
    sync = check_sync(FRAMES, FPS, wav)
    print(f"  sync: {sync['verdict']}")

    # Липсинк: фонемы -> кадры -> канал рта -> подмена
    phon = [Phoneme("AA", 0.30, 0.60), Phoneme("EE", 0.60, 0.95),
            Phoneme("AA", 1.10, 1.45), Phoneme("EE", 1.45, 1.90)]
    report = align_phonemes_to_frames(phon, fps=FPS)
    mouth_track = lipsync_channel(report, {"AA": "A", "EE": "E"}, default="flat")
    print(f"  lipsync: {len(report.aligned)} phonemes -> "
          f"{len(mouth_track)} mouth changes; {report.summary()['note']}")

    spec = BSceneSpec(
        name="full_shot", fps=FPS, frame_start=1, frame_end=FRAMES,
        resolution=(640, 480), parts=[],
        image_parts=image_part_specs(art),
        swap_groups=swap_groups_spec(art, {"mouth": mouth_track},
                                     frame_end=FRAMES),
        channels=channels_from_engine(animation_channels()),
        bg_color=(0.07, 0.08, 0.10),
        camera_ortho_scale=1.9, camera_loc=(0.0, 0.30),
        audio_tracks=[AudioTrack(str(wav), 1, 0.9, "voice").as_dict()])

    rep = build_scene(spec, OUT, render=True, frames=(1, FRAMES))
    print(f"  build: rc={rep['returncode']} frames={rep['frames_rendered']}")
    if rep["returncode"] != 0 or rep["frames_rendered"] < FRAMES:
        print(rep["log_tail"][-1200:]); print(rep["stderr_tail"][-500:])
        return 1

    # Персонаж виден и РЕАЛЬНО двигается (по центру масс, не по площади)
    n1, ax1, ay1 = centroid(OUT / "f0001.png", ARM)
    n40, ax40, ay40 = centroid(OUT / "f0040.png", ARM)
    body = count_colour(OUT / "f0001.png", BODY)
    print(f"  visible: body {body}px | arm f1 {n1}px at ({ax1:.0f},{ay1:.0f})"
          f" -> f40 {n40}px at ({ax40:.0f},{ay40:.0f})"
          if n1 and n40 else f"  visible: body {body}px, arm missing")
    if not body or not n1 or not n40:
        print("FAIL: character not visible")
        return 1
    swing = ((ax40 - ax1) ** 2 + (ay40 - ay1) ** 2) ** 0.5
    if swing < 30:
        print(f"FAIL: arm centre moved only {swing:.1f}px — the swing did not happen")
        return 1

    # Рот РЕАЛЬНО меняется: площадь тёмного рта по кадрам должна отличаться
    mouth_px = {f: count_colour(OUT / f"f{f:04d}.png", MOUTH_DARK, tol=40)
                for f in (5, 10, 18, 30, 40, 60)}
    print(f"  mouth px by frame: {mouth_px}")
    if len(set(mouth_px.values())) < 2:
        print("FAIL: mouth never changed — drawing substitution did not work")
        return 1
    if not all(mouth_px.values()):
        print("FAIL: mouth disappeared on some frame — all variants hidden")
        return 1

    mp4 = OUT / "full_shot.mp4"
    mux(OUT / "f%04d.png", wav, mp4, FPS)
    info = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "format=duration:stream=codec_type", "-of", "default=nw=1", str(mp4)],
        capture_output=True, text=True).stdout
    kinds = [l.split("=")[1] for l in info.splitlines() if l.startswith("codec_type")]
    dur = [float(l.split("=")[1]) for l in info.splitlines() if l.startswith("duration")]
    print(f"  mp4: streams={kinds} duration={dur[0] if dur else '?'}s "
          f"({mp4.stat().st_size // 1024} KB)")
    if "audio" not in kinds or "video" not in kinds:
        print("FAIL: MP4 is missing a stream")
        return 1
    if not dur or abs(dur[0] - FRAMES / FPS) > 0.25:
        print(f"FAIL: MP4 duration {dur} != expected {FRAMES / FPS}s")
        return 1

    lg = Ledger(OUT / "provenance.jsonl")
    lg.record("human", "artist", "drawing", "full_shot", (1, FRAMES),
              [p.name for p in art.parts],
              detail={"note": "PNG parts with alpha"})
    lg.record("agent", "claude/craft", "curve_set", "full_shot", (1, FRAMES),
              ["arm.rot", "torso.y", "head.rot"])
    lg.record("agent", "claude/lipsync", "substitution_set", "full_shot",
              (report.aligned[0].start_frame, report.aligned[-1].end_frame),
              ["mouth"], detail={"phonemes": len(report.aligned)})
    verdict = lg.frame_report("full_shot", 30)["verdict"]
    print(f"  provenance: frame 30 is {verdict}, chain intact={lg.verify() == []}")
    if verdict != "mixed":
        print(f"FAIL: expected 'mixed' provenance, got {verdict}")
        return 1

    print(f"\nPASS: full shot — artist PNGs + craft timing + lipsync + audio "
          f"-> {mp4}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
