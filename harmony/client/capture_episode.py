"""
capture_episode.py — захват для линзы throughput: числа прогона серии.

Артефакт раунда — не картинка, а отчёт, который можно сравнить с целями из
ref/production_targets.md. Скриншот не показывает ни занятости ядер, ни
последовательного участка, ни того, во что уходит разница с однопоточным
временем.

Замеряется одно и то же на каждом раунде: одна и та же демо-серия, одно и то же
число шотов, одно и то же число кадров. Иначе улучшение неотличимо от смены
условий замера — ровно та ошибка, из-за которой в этом проекте четыре раза
врала проверка, а не код.

Пишет markdown, потому что сравнивается с markdown-баром, и цифры в нём должны
читаться человеком без парсера.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = Path("/tmp/capture_episode")

# Объём серии из бара. Держится здесь константой, а не считается на месте:
# бар не должен меняться, потому что кто-то поправил формулу.
EPISODE_MIN = 22
EPISODE_FPS = 24
EPISODE_FRAMES = EPISODE_MIN * 60 * EPISODE_FPS      # 31 680
TARGET_FPS = 2.7                                      # цель: серия ≤ 3.3 ч
TARGET_EPISODE_MIN = 25                               # цель по бару


def run_once(shots: int, frames: int, workers: int | None,
             out: Path) -> dict:
    """Один замер: чистый каталог, свежая очередь, честные стенные часы."""
    if out.exists():
        shutil.rmtree(out, ignore_errors=True)
    sys.path.insert(0, str(HERE))
    from episode import demo_episode, run_episode

    ep = demo_episode(out, shots=shots, frames=frames)
    t0 = time.monotonic()
    rep = run_episode(ep, workers=workers)
    rep["wall_s"] = round(time.monotonic() - t0, 2)
    return rep


def measure_blender_launch(n: int = 3) -> float:
    """Сколько стоит пустой запуск Blender. Медиана из n замеров.

    Меряется прямо, потому что косвенный вывод из разницы средних давал
    отрицательные накладные — число, которое ничего не объясняет.
    """
    import statistics
    from blender_host import BLENDER
    times = []
    for _ in range(n):
        t0 = time.monotonic()
        subprocess.run([str(BLENDER), "-b", "--python-expr", "pass"],
                       capture_output=True)
        times.append(time.monotonic() - t0)
    return statistics.median(times)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--shots", type=int, default=6)
    ap.add_argument("--frames", type=int, default=12)
    ap.add_argument("--out", required=True, help="artifact path (markdown)")
    a = ap.parse_args()

    art = Path(a.out)
    art.parent.mkdir(parents=True, exist_ok=True)

    cores = os.cpu_count() or 1
    from blender_host import blender_available
    ok, ver = blender_available()
    if not ok:
        art.write_text(f"# throughput\n\nBLOCKED: {ver}\n", encoding="utf-8")
        print(f"BLOCKED: {ver}")
        return 1

    # Параллельный и однопоточный прогоны одной и той же работы — иначе
    # «ускорение» не число, а мнение.
    par = run_once(a.shots, a.frames, None, WORK / "par")
    seq = run_once(a.shots, a.frames, 1, WORK / "seq")

    speedup = seq["wall_s"] / par["wall_s"] if par["wall_s"] else 0.0
    fps = par["frames_per_s"]
    episode_h = EPISODE_FRAMES / fps / 3600 if fps else float("inf")
    # Стоимость запуска Blender измеряется НАПРЯМУЮ, а не выводится из разницы
    # средних. Прежняя формула давала -0.83 с — отрицательные накладные, то есть
    # бессмыслицу, и указать на причину замедления она не могла.
    launch_s = measure_blender_launch()
    launch_share = launch_s * a.shots / par["wall_s"] if par["wall_s"] else 0.0

    lines = [
        "# throughput — прогон серии, числа",
        "",
        f"машина: {cores} ядер · {ver}",
        f"замер: {a.shots} шотов × {a.frames} кадров = {a.shots * a.frames} кадров",
        "",
        "| величина | наше | цель (бар) |",
        "|---|---|---|",
        f"| кадров/с суммарно | **{fps}** | ≥ {TARGET_FPS} |",
        f"| ускорение против 1 потока | **{speedup:.1f}×** | ≥ 8× |",
        f"| воркеров занято | {par['workers']} | {max(1, cores - 2)} |",
        f"| серия {EPISODE_MIN} мин ({EPISODE_FRAMES} кадров) | **{episode_h * 60:.0f} мин** | ≤ {TARGET_EPISODE_MIN} мин |",
        f"| стенные часы, параллельно | {par['wall_s']} с | — |",
        f"| стенные часы, 1 поток | {seq['wall_s']} с | — |",
        f"| запуск Blender (замерено) | {launch_s:.2f} с × {a.shots} шотов | — |",
        f"| доля старта в стенных часах | **{launch_share:.0%}** | → 0% |",
        "",
        "## Что известно про разницу",
        "",
        f"- шотов посчитано: {par['shots_ok']}/{par['shots_total']}, "
        f"провалов {par['shots_failed']}",
        f"- кадров: {par['frames_rendered']}",
        f"- на шот приходится запуск отдельного процесса Blender; при "
        f"{a.frames} кадрах в шоте это заметная доля",
    ]
    if fps < TARGET_FPS:
        lines += ["", f"НЕ ДОСТАЁТ до цели: {TARGET_FPS / fps:.1f}× по кадрам/с."]
    if speedup < 8:
        lines += [f"НЕ ДОСТАЁТ по ускорению: {8 / speedup:.1f}× "
                  f"(есть {speedup:.1f}× из 8×)."]

    art.write_text("\n".join(lines) + "\n", encoding="utf-8")
    (art.parent / "metrics.json").write_text(json.dumps(
        {"parallel": par, "sequential": seq, "speedup": round(speedup, 2),
         "fps": fps, "episode_minutes": round(episode_h * 60, 1),
         "cores": cores}, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"fps={fps} speedup={speedup:.1f}x episode={episode_h * 60:.0f}min")
    return 0


if __name__ == "__main__":
    sys.exit(main())
