"""Ходьба Gramps до левого края сцены: PIR + анимационные ключи -> .moho.

Цикл: 24 кадра на полный шаг (12 на полу-шаг), 24 fps, 72 кадра = 3 strides.
Доказательство: скриншоты живой Moho на ключевых кадрах.
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from pipeline.moho.emit import emit  # noqa: E402
from pipeline.moho.extract import extract_from_file  # noqa: E402
from pipeline.pir.schema import Channel, Rig  # noqa: E402

REFERENCE = REPO / "fixtures/moho_reference/gramps_rig.moho"
OUT = REPO / "output/walk/gramps_walk.moho"

FPS = 24
TOTAL = 72
STEP = 12  # полушаг


def _interp() -> list[dict]:
    return [{"im": 1, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0, "s": False, "t": 0}]


def _angle_channel(bone_id: str, rig: Rig, offsets: list[tuple[int, float]]) -> None:
    bone = rig.bone_by_id(bone_id)
    if bone is None:
        raise KeyError(f"bone not found: {bone_id}")
    bone.angle_keys = [(f, bone.angle + off) for f, off in offsets]


def _leg_cycle(phase_shift: int) -> list[tuple[int, float]]:
    """Тазобедренный: вперёд на контакте, назад в толчке. phase 0/12."""
    base = [(0, 0.32), (6, -0.04), (12, -0.30), (18, 0.10), (24, 0.32)]
    out = []
    for cycle in range(TOTAL // 24 + 1):
        for f, off in base:
            frame = f + cycle * 24 + phase_shift
            if 0 <= frame <= TOTAL:
                out.append((frame, off))
    return sorted(set(out))


def _knee_cycle(phase_shift: int) -> list[tuple[int, float]]:
    """Колено: прямое в опоре, сгибается в переносе (середина полушага)."""
    base = [(0, 0.06), (9, 0.10), (15, 0.55), (21, 0.20), (24, 0.06)]
    out = []
    for cycle in range(TOTAL // 24 + 1):
        for f, off in base:
            frame = f + cycle * 24 + phase_shift
            if 0 <= frame <= TOTAL:
                out.append((frame, off))
    return sorted(set(out))


def _foot_cycle(phase_shift: int) -> list[tuple[int, float]]:
    """Стопа: компенсирует, чтобы ступня не проваливалась в пол."""
    base = [(0, -0.18), (6, 0.0), (12, 0.22), (18, 0.10), (24, -0.18)]
    out = []
    for cycle in range(TOTAL // 24 + 1):
        for f, off in base:
            frame = f + cycle * 24 + phase_shift
            if 0 <= frame <= TOTAL:
                out.append((frame, off))
    return sorted(set(out))


def _arm_cycle(phase_shift: int) -> list[tuple[int, float]]:
    """Рука противофазна одноимённой ноге."""
    base = [(0, -0.22), (6, 0.0), (12, 0.22), (18, 0.0), (24, -0.22)]
    out = []
    for cycle in range(TOTAL // 24 + 1):
        for f, off in base:
            frame = f + cycle * 24 + phase_shift
            if 0 <= frame <= TOTAL:
                out.append((frame, off))
    return sorted(set(out))


def _forearm_cycle(phase_shift: int) -> list[tuple[int, float]]:
    base = [(0, 0.15), (12, 0.30), (24, 0.15)]
    out = []
    for cycle in range(TOTAL // 24 + 1):
        for f, off in base:
            frame = f + cycle * 24 + phase_shift
            if 0 <= frame <= TOTAL:
                out.append((frame, off))
    return sorted(set(out))


def build_walk_rig() -> Rig:
    rig = extract_from_file(str(REFERENCE))
    rig.name = "gramps_walk"

    # Ноги: L = B8 (бедро), B9 (голень), B10 (стопа); R = B11, B12, B13
    _angle_channel("B8", rig, _leg_cycle(0))
    _angle_channel("B9", rig, _knee_cycle(0))
    _angle_channel("B10", rig, _foot_cycle(0))
    _angle_channel("B11", rig, _leg_cycle(STEP))
    _angle_channel("B12", rig, _knee_cycle(STEP))
    _angle_channel("B13", rig, _foot_cycle(STEP))

    # Руки: L = B3/B4, R = B5/B6, противофаза к своим ногам
    _angle_channel("B3", rig, _arm_cycle(STEP))
    _angle_channel("B4", rig, _forearm_cycle(STEP))
    _angle_channel("B5", rig, _arm_cycle(0))
    _angle_channel("B6", rig, _forearm_cycle(0))

    # Позвоночник B2: лёгкий скрут
    spine = [(0, -0.03), (6, 0.0), (12, 0.03), (18, 0.0), (24, -0.03)]
    spine_keys = []
    for cycle in range(TOTAL // 24 + 1):
        for f, off in spine:
            frame = f + cycle * 24
            if 0 <= frame <= TOTAL:
                spine_keys.append((frame, off))
    _angle_channel("B2", rig, sorted(set(spine_keys)))

    # Корпус: равномерное движение влево + вертикальный боб (низ на контакте, верх в проходе)
    skeleton = next(p for p in rig.root_parts if p.type == "bone_container")
    tr = skeleton.transforms
    bob = {6: 0.035, 12: 0.0, 18: 0.035}
    frames = {1: 0.0, TOTAL: 0.0}
    for cycle in range(TOTAL // 24):
        for f, dy in bob.items():
            frame = f + cycle * 24
            if 2 <= frame < TOTAL:
                frames[frame] = dy
    when = sorted(frames)
    val = [{"x": round(-1.9 * (f - 1) / (TOTAL - 1), 6),
            "y": frames[f], "z": 0.0} for f in when]
    tr["translation"] = Channel(type="Vec3", when=when, val=val,
                                interp=[_interp()[0] for _ in when])
    return rig


def main() -> int:
    rig = build_walk_rig()
    emit(rig, str(OUT))
    size = OUT.stat().st_size
    print(f"Ходьба собрана: {OUT} ({size} байт)")
    for b in rig.bones:
        if b.angle_keys:
            print(f"  {b.id}: {len(b.angle_keys)} ключей угла")
    sk = next(p for p in rig.root_parts if p.type == "bone_container")
    print(f"  Skeleton translation: {len(sk.transforms['translation'].when)} ключей, "
          f"x: {sk.transforms['translation'].val[0]['x']} -> "
          f"{sk.transforms['translation'].val[-1]['x']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
