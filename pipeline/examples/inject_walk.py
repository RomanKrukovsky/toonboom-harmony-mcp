"""Вживление ходьбы в оригинальный gramps_rig.moho без пересборки документа.

Меняются ТОЛЬКО: anim_angle костей, transforms.translation корневого слоя.
Всё остальное (uuid, стили, mesh, даты, форматирование) сохраняется как было.
"""
from __future__ import annotations

import json
import shutil
import sys
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "fixtures/moho_reference/gramps_rig.moho"

FPS = 24
TOTAL = 72
INTERP = {"im": 1, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0, "s": False, "t": 0}


def leg_cycle(shift: int) -> dict[int, float]:
    """Бедро: размах ±0.24 рад — шаг равен 2*L*sin(0.24)=0.38 ед.,
    что совпадает со скоростью корпуса (0.38 ед. за 12 кадров)."""
    base = [(0, 0.24), (6, 0.02), (12, -0.24), (15, -0.12), (18, 0.02),
            (21, 0.16), (24, 0.24)]
    out = {}
    for c in range(TOTAL // 24 + 1):
        for f, off in base:
            fr = f + c * 24 + shift
            if 0 <= fr <= TOTAL:
                out[fr] = off
    return out


def knee_cycle(shift: int) -> dict[int, float]:
    """Колено: почти прямое в опоре, сгиб только в переносе, без рывков."""
    base = [(0, 0.02), (6, 0.06), (12, 0.15), (15, 0.45), (18, 0.30),
            (21, 0.10), (24, 0.02)]
    out = {}
    for c in range(TOTAL // 24 + 1):
        for f, off in base:
            fr = f + c * 24 + shift
            if 0 <= fr <= TOTAL:
                out[fr] = off
    return out


def foot_cycle(shift: int) -> dict[int, float]:
    """Стопа: минимальная компенсация, чтобы не проваливался носок."""
    base = [(0, -0.06), (6, 0.02), (12, 0.10), (18, 0.04), (24, -0.06)]
    out = {}
    for c in range(TOTAL // 24 + 1):
        for f, off in base:
            fr = f + c * 24 + shift
            if 0 <= fr <= TOTAL:
                out[fr] = off
    return out


def arm_cycle(shift: int) -> dict[int, float]:
    """Goofy-руки: размашистый мах ±0.4 противофазно ногам."""
    base = [(0, -0.40), (6, -0.10), (12, 0.40), (18, 0.10), (24, -0.40)]
    out = {}
    for c in range(TOTAL // 24 + 1):
        for f, off in base:
            fr = f + c * 24 + shift
            if 0 <= fr <= TOTAL:
                out[fr] = off
    return out


def forearm_cycle(shift: int) -> dict[int, float]:
    """Локоть: живой изгиб, больше на проходе рук."""
    base = [(0, 0.30), (6, 0.50), (12, 0.30), (18, 0.50), (24, 0.30)]
    out = {}
    for c in range(TOTAL // 24 + 1):
        for f, off in base:
            fr = f + c * 24 + shift
            if 0 <= fr <= TOTAL:
                out[fr] = off
    return out


def spine_cycle() -> dict[int, float]:
    """Позвоночник: постоянный наклон в ходьбу + лёгкий контр-свинг."""
    out = {}
    for f in range(0, TOTAL + 1, 6):
        out[f] = -0.06 + (0.02 if (f // 6) % 2 == 0 else -0.02)
    return out


def head_cycle() -> dict[int, float]:
    """Голова: кивок с запаздыванием — вниз на контакте, вверх на проходе."""
    out = {}
    for f in range(0, TOTAL + 1, 6):
        phase = ((f + 2) // 6) % 4
        out[f] = {0: 0.04, 1: -0.05, 2: 0.04, 3: -0.03}[phase]
    return out


def set_angle(bone: dict, offsets: dict[int, float]) -> None:
    rest = bone["anim_angle"]["val"][0]
    if not isinstance(rest, (int, float)):
        rest = rest.get("v", 0.0)
    frames = sorted(offsets)
    bone["anim_angle"] = {
        "type": "Val", "ref": False, "mute": False,
        "when": frames,
        "val": [float(rest) + offsets[f] for f in frames],
        "interp": [dict(INTERP) for _ in frames],
    }


def main() -> int:
    backup = SRC.with_suffix(".moho.bak")
    if not backup.exists():
        shutil.copy2(SRC, backup)
        print(f"бэкап оригинала: {backup.name}")

    with zipfile.ZipFile(SRC) as z:
        members = {n: z.read(n) for n in z.namelist()}
    doc = json.loads(members["Project.mohoproj"])

    skel_layer = next(l for l in doc["layers"] if l.get("skeleton"))
    bones = {b["name"]: b for b in skel_layer["skeleton"]["bones"]}
    set_angle(bones["B8"], leg_cycle(0))
    set_angle(bones["B9"], knee_cycle(0))
    set_angle(bones["B10"], foot_cycle(0))
    set_angle(bones["B11"], leg_cycle(12))
    set_angle(bones["B12"], knee_cycle(12))
    set_angle(bones["B13"], foot_cycle(12))
    set_angle(bones["B3"], arm_cycle(12))
    set_angle(bones["B4"], forearm_cycle(12))
    set_angle(bones["B5"], arm_cycle(0))
    set_angle(bones["B6"], forearm_cycle(0))
    set_angle(bones["B2"], spine_cycle())
    set_angle(bones["B7"], head_cycle())

    # Движение: скорость = длина шага (0.38 ед. за 12 кадров), равномерно,
    # ключи каждые 6 кадров с нулевым изингом — никакого пульса.
    LINEAR = {"im": 1, "v1": 0.0, "v2": 0.0, "in": 1, "h": 0, "s": False, "t": 0}
    bob = {6: 0.022, 12: 0.0, 18: 0.022}
    frames_y = {0: 0.0}
    for c in range(TOTAL // 24):
        for f, dy in bob.items():
            fr = f + c * 24
            frames_y[fr] = dy
    frames_y[TOTAL] = 0.0
    when = sorted(frames_y)
    x0, x1 = 0.15, 0.15 - 2.28
    skel_layer["transforms"]["translation"] = {
        "type": "Vec3", "ref": False, "mute": False,
        "when": when,
        "val": [{"x": round(x0 + (x1 - x0) * f / TOTAL, 6),
                 "y": frames_y[f], "z": 0.0} for f in when],
        "interp": [dict(LINEAR) for _ in when],
    }

    members["Project.mohoproj"] = json.dumps(
        doc, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    with zipfile.ZipFile(SRC, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in members.items():
            z.writestr(name, data)
    print(f"анимация вживлена в {SRC.name}: "
          f"{sum(len(v) for v in [leg_cycle(0)])} ключей на кость-цикл, "
          f"движение x: 0.0 -> -1.9 за {TOTAL} кадров")
    return 0


if __name__ == "__main__":
    sys.exit(main())
