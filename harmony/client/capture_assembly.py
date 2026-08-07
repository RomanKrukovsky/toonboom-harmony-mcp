"""
capture_assembly.py — захват для линзы assembly: что на выходе, один файл или папка.

Бар: «ОДИН мастер: видео + звук, длительность равна сумме шотов ±0.1 с, порядок
шотов по раскадровке». Все три требования проверяются числами по готовому файлу
через ffprobe, а не наличием кода сборки.

Порядок проверяется цветом: каждый шот красится в свой, и цвет читается из
мастера на середине каждого шота. Это единственный способ поймать ошибку, из-за
которой sc10 встаёт перед sc2 — она не даёт сообщения, её замечает человек на
просмотре, и стоит она перевыпуска серии.

Отдельно проверяется шов: на стыке шотов не должно быть ни пропущенного кадра,
ни лишнего чёрного. Шов — то место, где склейка врёт чаще всего.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = Path("/tmp/capture_assembly")
FPS = 24
FRAMES = 6
# 12 шотов: с десятью и больше проявляется алфавитная сортировка
COLOURS = [(0.90, 0.10, 0.10), (0.10, 0.90, 0.10), (0.10, 0.10, 0.90),
           (0.90, 0.90, 0.10), (0.90, 0.10, 0.90), (0.10, 0.90, 0.90),
           (0.60, 0.30, 0.10), (0.30, 0.60, 0.10), (0.10, 0.30, 0.60),
           (0.60, 0.10, 0.30), (0.50, 0.50, 0.50), (0.20, 0.20, 0.20)]


def hostile_episode(out, shots: int = 5):
    """
    Образец, построенный от СБОЯ, а не от удобства.

    Раунд 17: три пробы подряд дали «0 неверных ответов», потому что серия была
    ровной — все шоты одной длины, все посчитаны, в прогон передавался урезанный
    список. На таком образце два разных способа нумерации кадров совпадают, и
    дефект (реестр отвечал про раскадровку, а спрашивают про мастер) не
    проявляется. Обнаружился он только на четвёртой попытке.

    Раунд 16 дал тот же урок с другой стороны: величина, не проверенная на
    известно-здоровом образце, дала 88 ложных находок. Вместе это правило:
    образец решает исход пробы, поэтому он строится осознанно.

    Три свойства, каждое ломает свой класс совпадений:
      - шоты РАЗНОЙ длины: при равных длинах пропуск шота сдвигает нумерацию
        ровно на длину шота, и неверный ответ выглядит верным;
      - часть шотов НЕ ВХОДИТ в мастер: без этого нумерация мастера совпадает с
        раскадровочной, и путаница двух адресаций невидима;
      - прогон видит ПОЛНУЮ раскадровку: урезанный список делает смещения
        правильными по построению, то есть проверять становится нечего.
    """
    from episode import demo_episode
    ep = demo_episode(out, shots=shots, frames=8)
    lengths = (4, 12, 8, 20, 6, 16, 10)          # взаимно непохожие
    for sh, n in zip(ep.shots, lengths):
        sh.frames = n
    return ep


def failing_renderer(names):
    """Счётчик, валящий указанные шоты: в мастер входят не все."""
    def r(payload):
        from episode import render_one_shot
        if payload["name"] in names:
            return {"name": payload["name"], "status": "failed",
                    "code": "BAD_ARTWORK", "message": "hostile sample",
                    "frames": 0, "seconds": 0.0,
                    "dir": payload["shot_dir"], "audio": None}
        return render_one_shot(payload)
    return r


def sanity(measure, healthy, name: str) -> str:
    """
    Проверка ВЕЛИЧИНЫ на известно-здоровом образце, прежде чем ей верить.

    Раунд 16: аудиошвы искались по интервалам пакетов, и на ИСПРАВНОМ мастере
    нашлось 88 «разрывов» — артефакт разбора, а не дефект. Настоящий сдвиг 23 мс
    обнаружился только когда был запрошен `start_time` потоков. Три пробы ушли на
    то, что снималось одной: если величина сигналит беду там, где беды нет, она
    не отвечает на заданный вопрос.

    Тот же класс, что раунд 14 (длину контейнера задаёт звук, потеря кадров по
    ней не видна) и раунд 5 (345 жалоб вместо одной). Здесь это записано
    механически, а не как совет: `measure` считается на здоровом образце, и если
    результат не «чисто» — величина отвергается ДО того, как на ней построен
    вывод.

    measure: функция, возвращающая список найденных проблем
    healthy: образец, на котором проблем быть не должно
    """
    found = measure(healthy)
    if found:
        return (f"ОТВЕРГНУТА величина «{name}»: на исправном образце она нашла "
                f"{len(found)} проблем(ы) — значит отвечает не на тот вопрос")
    return f"величина «{name}» на исправном образце чиста — можно верить"


def srgb(c: float) -> int:
    v = 1.055 * (c ** (1 / 2.4)) - 0.055 if c > 0.0031308 else 12.92 * c
    return max(0, min(255, round(255 * v)))


def build_episode(with_audio: bool):
    sys.path.insert(0, str(HERE))
    from episode import Episode, ShotSpec
    from PIL import Image, ImageDraw

    out = WORK / ("audio" if with_audio else "silent")
    shutil.rmtree(out, ignore_errors=True)
    shots = []
    wav = None
    if with_audio:
        wav = out / "tone.wav"
        wav.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-y", "-f", "lavfi",
                        "-i", f"sine=f=440:d={FRAMES / FPS}", "-ac", "1",
                        "-ar", "44100", str(wav)], capture_output=True)
    for i, col in enumerate(COLOURS, 1):
        d = out / "parts" / f"s{i:03d}"
        d.mkdir(parents=True, exist_ok=True)
        im = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
        ImageDraw.Draw(im).rectangle([2, 2, 98, 98],
                                     fill=tuple(srgb(c) for c in col) + (255,))
        im.save(d / "block.png")
        pj = d / "parts.json"
        pj.write_text(json.dumps({"name": f"s{i}", "parts": [
            {"name": "block", "image": "block.png", "parent": None,
             "pivot": [0.5, 0.5], "attach": [0, 0], "depth": 0.0,
             "scale": 4.0}]}), encoding="utf-8")
        shots.append(ShotSpec(name=f"sc{i:03d}", parts_json=str(pj),
                              frames=FRAMES, fps=FPS, resolution=(160, 120),
                              audio=str(wav) if wav else None,
                              camera_ortho_scale=1.0, camera_loc=(0.0, 0.0)))
    return Episode("order", shots, out)


def probe(with_audio: bool) -> dict:
    from episode import assemble, run_episode
    ep = build_episode(with_audio)
    rep = run_episode(ep, workers=6)
    if rep["shots_failed"]:
        return {"error": rep["failed"]}
    asm = assemble(ep)

    # Порядок: цвет на середине каждого шота
    probe_dir = ep.out_dir / "probe"
    probe_dir.mkdir(exist_ok=True)
    wrong = []
    for i, col in enumerate(COLOURS):
        t = (i * FRAMES + FRAMES / 2) / FPS
        f = probe_dir / f"p{i:03d}.png"
        subprocess.run(["ffmpeg", "-y", "-ss", f"{t:.4f}", "-i", asm["master"],
                        "-frames:v", "1", str(f)], capture_output=True)
        if not f.exists():
            wrong.append((i + 1, "no frame"))
            continue
        from PIL import Image
        px = Image.open(f).convert("RGB").getpixel((80, 60))
        want = tuple(srgb(c) for c in col)
        if max(abs(a - b) for a, b in zip(px, want)) > 18:
            wrong.append((i + 1, f"{px} != {want}"))

    # Шов: кадр за 1/FPS до стыка и сразу после должны быть РАЗНЫХ цветов,
    # и ни один не должен быть чёрным (чёрный = вставленный пустой кадр).
    seams = []
    for i in range(len(COLOURS) - 1):
        t_before = ((i + 1) * FRAMES - 0.5) / FPS
        t_after = ((i + 1) * FRAMES + 0.5) / FPS
        vals = []
        for tag, t in (("before", t_before), ("after", t_after)):
            f = probe_dir / f"seam{i}_{tag}.png"
            subprocess.run(["ffmpeg", "-y", "-ss", f"{t:.4f}", "-i", asm["master"],
                            "-frames:v", "1", str(f)], capture_output=True)
            from PIL import Image
            vals.append(Image.open(f).convert("RGB").getpixel((80, 60))
                        if f.exists() else None)
        if None in vals:
            seams.append((i + 1, "missing frame at seam"))
        elif max(vals[0]) < 12 or max(vals[1]) < 12:
            seams.append((i + 1, f"black frame at seam: {vals}"))

    frames_total = int(subprocess.run(
        ["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0",
         "-show_entries", "stream=nb_read_frames", "-of",
         "default=nw=1:nk=1", asm["master"]],
        capture_output=True, text=True).stdout.strip() or 0)

    # Взаимное положение потоков. Раунд 16: видео стартовало на 23 мс позже
    # звука (priming-кадр aac утекал из сегментов в мастер), и НИ ОДНА прошлая
    # проверка этого не видела — кадры считались, длина сходилась, порядок был
    # верен. Величина выбрана после того, как «интервалы пакетов» дали 88
    # ложных находок на исправном мастере: она отвечает на вопрос «идут ли
    # картинка и звук вместе», а не «ровно ли лежат пакеты».
    starts = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "stream=codec_type,start_time", "-of", "csv=p=0", asm["master"]],
        capture_output=True, text=True).stdout.strip().splitlines()
    st = {}
    for line in starts:
        parts = line.split(",")
        if len(parts) >= 2:
            try:
                st[parts[0]] = float(parts[1])
            except ValueError:
                pass
    av_offset_ms = (round((st["video"] - st["audio"]) * 1000)
                    if "video" in st and "audio" in st else None)

    return {"streams": asm["streams"], "duration": asm["duration"],
            "expected": asm["expected"], "drift": asm["drift"],
            "in_tolerance": asm["in_tolerance"], "segments": asm["segments"],
            "order_wrong": wrong, "seam_problems": seams,
            "frames_in_master": frames_total,
            "frames_expected": FRAMES * len(COLOURS),
            "av_offset_ms": av_offset_ms,
            "missing_shots": asm["missing_shots"]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    art = Path(a.out)
    art.parent.mkdir(parents=True, exist_ok=True)

    sys.path.insert(0, str(HERE))
    from blender_host import blender_available
    ok, ver = blender_available()
    if not ok or shutil.which("ffprobe") is None:
        art.write_text(f"# assembly\n\nBLOCKED: {ver}\n", encoding="utf-8")
        return 1

    print("with audio ...");  aud = probe(True)
    print("silent shots ..."); sil = probe(False)

    L = ["# assembly — что на выходе: один мастер или папка кадров", "",
         f"{ver} · {len(COLOURS)} шотов × {FRAMES} кадров @ {FPS} fps", "",
         "| требование бара | со звуком | без звука |", "|---|---|---|"]
    for label, key, fmt in (
        ("один файл, потоки", "streams", lambda v: ", ".join(v)),
        ("сегментов склеено", "segments", str),
        ("длительность", "duration", lambda v: f"{v} с"),
        ("ожидалось", "expected", lambda v: f"{v} с"),
        ("расхождение (±0.1 с)", "drift", lambda v: f"{v:+.3f} с"),
        ("сдвиг видео-звук", "av_offset_ms",
         lambda v: "—" if v is None else f"{v:+d} мс"),
        ("кадров в мастере", "frames_in_master", str),
        ("кадров ожидалось", "frames_expected", str),
    ):
        L.append(f"| {label} | {fmt(aud.get(key, '—'))} | {fmt(sil.get(key, '—'))} |")
    def verdict(r, key, ok_word):
        v = r.get(key) or []
        return ok_word if not v else f"СБИТ: {v[:3]}"

    L.append(f"| порядок по раскадровке | {verdict(aud, 'order_wrong', 'верный')} "
             f"| {verdict(sil, 'order_wrong', 'верный')} |")
    L.append(f"| швы между шотами | {verdict(aud, 'seam_problems', 'чистые')} "
             f"| {verdict(sil, 'seam_problems', 'чистые')} |")

    problems = []
    for tag, r in (("со звуком", aud), ("без звука", sil)):
        if "audio" not in r["streams"]:
            problems.append(f"{tag}: в мастере нет звуковой дорожки — "
                            f"серия уйдёт немой")
        if not r["in_tolerance"]:
            problems.append(f"{tag}: расхождение {r['drift']:+.3f} с вне допуска "
                            f"±0.1 с — потерянные или лишние кадры")
        if r["order_wrong"]:
            problems.append(f"{tag}: порядок шотов сбит на {r['order_wrong'][:3]} — "
                            f"это замечает только человек на просмотре")
        if r["seam_problems"]:
            problems.append(f"{tag}: швы {r['seam_problems'][:2]}")
        # Сдвиг звука против картинки: 23 мс на серию слышны как рассинхрон.
        off = r.get("av_offset_ms")
        if off is not None and abs(off) > 5:
            problems.append(f"{tag}: видео против звука {off:+d} мс — "
                            f"картинка и звук идут не вместе")
        if r["frames_in_master"] != r["frames_expected"]:
            problems.append(f"{tag}: кадров в мастере {r['frames_in_master']} "
                            f"вместо {r['frames_expected']}")
        if r["missing_shots"]:
            problems.append(f"{tag}: шоты пропущены: {r['missing_shots']}")

    if problems:
        L += ["", "## НЕ ДОСТАЁТ", ""] + [f"- {p}" for p in problems]
    else:
        L += ["", "## Всё по бару", "",
              "Один файл, оба потока, длительность в допуске, порядок верный, "
              "швы чистые."]

    art.write_text("\n".join(L) + "\n", encoding="utf-8")
    (art.parent / "metrics.json").write_text(
        json.dumps({"with_audio": aud, "silent": sil}, ensure_ascii=False, indent=1),
        encoding="utf-8")
    print(f"done, {len(problems)} problem(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
