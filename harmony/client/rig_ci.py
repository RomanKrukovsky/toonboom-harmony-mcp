"""
rig_ci.py — CI для ригов (идея №31): юнит-тесты поз.

Как это работает по-человечески: у рига есть набор «стресс-поз» —
рука вытянута до предела, голова повёрнута до упора, персонаж присел.
На каждый коммит рига CI ставит эти позы и проверяет две вещи:

  1. МАТЕМАТИЧЕСКИ (без рендера, быстро): суставы не разорвались.
     Конец родительской кости и пивот дочерней обязаны совпадать.
     Если локоть уехал от плеча на 40 единиц — рука порвалась,
     и это видно по числам, картинка не нужна.

  2. ВИЗУАЛЬНО (render_frame, медленно): пиксели позы против эталона.
     Ловит то, что числа не видят: часть исчезла за другой, текстура
     растянулась в кашу. Эталон утверждает человек ОДИН раз, дальше
     сравнение автоматическое.

Здесь реализован уровень 1 полностью (чистая математика, тестируется
без Harmony) и каркас уровня 2 (прогон через мост).

Скелет для проверки суставов описывается как цепочки костей:
    Bone("arm_near_upper", length=1.6, ...)
Длина кости — расстояние от её пивота до пивота ребёнка В ПОКОЕ.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Sequence

from rigging import RigSpec


# ---------------------------------------------------------------------------
# Прямая кинематика: где окажутся суставы при заданных углах
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Pose:
    """Поза = имя + углы поворота пегов (градусы) + смещения (опционально)."""
    name: str
    rotations: dict[str, float] = field(default_factory=dict)
    offsets: dict[str, tuple[float, float]] = field(default_factory=dict)


@dataclass
class JointReport:
    part: str
    parent: str
    expected: tuple[float, float]   # где сустав должен быть (конец кости родителя)
    actual: tuple[float, float]     # где пивот ребёнка оказался
    gap: float

    @property
    def torn(self) -> bool:
        return self.gap > 1e-6


def _fk_positions(spec: RigSpec, pose: Pose) -> dict[str, tuple[float, float, float]]:
    """
    Прямая кинематика по иерархии пегов: (x, y, накопленный угол) каждой части.

    Модель Harmony-пега: ребёнок вращается вокруг пивота родителя вместе с ним.
    Пивот ребёнка в мировых координатах = пивот родителя + повёрнутый вектор
    (пивот_ребёнка_локально - пивот_родителя_локально).
    """
    result: dict[str, tuple[float, float, float]] = {}

    def solve(part_name: str) -> tuple[float, float, float]:
        if part_name in result:
            return result[part_name]
        p = spec.part(part_name)
        rot_here = pose.rotations.get(part_name, 0.0)
        off = pose.offsets.get(part_name, (0.0, 0.0))

        if p.parent is None:
            world = (p.pivot[0] + off[0], p.pivot[1] + off[1], rot_here)
        else:
            px, py, pang = solve(p.parent)
            parent_pivot = spec.part(p.parent).pivot
            # локальный вектор от пивота родителя к пивоту ребёнка
            lx = p.pivot[0] - parent_pivot[0]
            ly = p.pivot[1] - parent_pivot[1]
            a = math.radians(pang)
            wx = px + lx * math.cos(a) - ly * math.sin(a) + off[0]
            wy = py + lx * math.sin(a) + ly * math.cos(a) + off[1]
            world = (wx, wy, pang + rot_here)
        result[part_name] = world
        return world

    for p in spec.parts:
        solve(p.name)
    return result


def check_joints(spec: RigSpec, pose: Pose) -> list[JointReport]:
    """
    Разрыв сустава: смещение (offset) дочерней части, вручную заданное в позе,
    отрывает её пивот от точки, куда его ставит кинематика родителя.

    Чистое вращение сустав НЕ рвёт по построению (ребёнок жёстко висит на
    родителе): здесь ловятся анимационные смещения дочерних пегов —
    аниматор подвинул кисть руками и оторвал её от предплечья.

    Неверные пивоты (локоть в спеке не там, где конец плеча) вращением
    не рвутся, но дают растяжение при повороте — их ловит check_stretch.
    """
    world = _fk_positions(spec, pose)
    reports: list[JointReport] = []
    for p in spec.parts:
        if p.parent is None:
            continue
        wx, wy, _ = world[p.name]
        off = pose.offsets.get(p.name, (0.0, 0.0))
        # где пивот был бы БЕЗ ручного смещения
        ex, ey = wx - off[0], wy - off[1]
        gap = math.hypot(wx - ex, wy - ey)
        if gap > 1e-6:
            reports.append(JointReport(p.name, p.parent, (ex, ey), (wx, wy), gap))
    return reports


def check_stretch(spec: RigSpec, pose: Pose,
                  max_scale: float = 1.15) -> list[dict]:
    """
    Растяжение: расстояние между пивотами родителя и ребёнка в позе
    против того же расстояния в покое. Ушло дальше max_scale — часть
    визуально растянута (текстура поплыла).
    """
    rest = _fk_positions(spec, Pose("rest"))
    posed = _fk_positions(spec, pose)
    findings = []
    for p in spec.parts:
        if p.parent is None:
            continue
        rx = math.hypot(rest[p.name][0] - rest[p.parent][0],
                        rest[p.name][1] - rest[p.parent][1])
        px = math.hypot(posed[p.name][0] - posed[p.parent][0],
                        posed[p.name][1] - posed[p.parent][1])
        if rx > 1e-9 and px / rx > max_scale:
            findings.append({
                "rule": "stretched", "part": p.name, "parent": p.parent,
                "rest_length": round(rx, 4), "posed_length": round(px, 4),
                "ratio": round(px / rx, 3),
                "message": f"{p.name} stretched to {px/rx:.0%} of rest length",
            })
        if rx > 1e-9 and px / rx < 1.0 / max_scale:
            findings.append({
                "rule": "compressed", "part": p.name, "parent": p.parent,
                "rest_length": round(rx, 4), "posed_length": round(px, 4),
                "ratio": round(px / rx, 3),
                "message": f"{p.name} compressed to {px/rx:.0%} of rest length",
            })
    return findings


# ---------------------------------------------------------------------------
# Стандартный стресс-набор
# ---------------------------------------------------------------------------

def standard_stress_poses(spec: RigSpec) -> list[Pose]:
    """
    Позы, на которых риги ломаются чаще всего. Генерируются из спеки:
    что в риге есть, то и гнём. Каждая часть с родителем крутится
    в обе стороны до типового предела сустава.
    """
    poses = [Pose("rest")]
    limb_parts = [p.name for p in spec.parts if p.parent is not None]

    # все суставы на +45 одновременно («краб») — ловит конфликты порядков
    poses.append(Pose("all_plus_45", rotations={n: 45.0 for n in limb_parts}))
    poses.append(Pose("all_minus_45", rotations={n: -45.0 for n in limb_parts}))

    # каждый сустав по отдельности до упора
    for n in limb_parts:
        poses.append(Pose(f"{n}_max", rotations={n: 120.0}))
        poses.append(Pose(f"{n}_min", rotations={n: -120.0}))
    return poses


@dataclass
class CiReport:
    rig: str
    poses_checked: int
    findings: list[dict]

    @property
    def passed(self) -> bool:
        return not self.findings


def run_rig_ci(spec: RigSpec, poses: Sequence[Pose] | None = None,
               max_scale: float = 1.15) -> CiReport:
    """Уровень 1: математика. Быстро, без Harmony, на каждый коммит."""
    poses = list(poses) if poses is not None else standard_stress_poses(spec)
    findings: list[dict] = []
    for pose in poses:
        for r in check_joints(spec, pose):
            findings.append({
                "rule": "torn-joint", "pose": pose.name, "part": r.part,
                "gap": round(r.gap, 4),
                "message": f"pose {pose.name!r}: {r.part} detached from "
                           f"{r.parent} by {r.gap:.2f} units",
            })
        for f in check_stretch(spec, pose, max_scale):
            findings.append({**f, "pose": pose.name})
    return CiReport(spec.character, len(poses), findings)


# ---------------------------------------------------------------------------
# Уровень 2: визуальный прогон через мост (каркас)
# ---------------------------------------------------------------------------

class RigVisualCi:
    """
    Ставит позу в живой сцене (curve_set по колонкам ротации пегов),
    рендерит кадр, сравнивает с эталоном.

    Эталоны живут в golden_dir как PNG с именем позы. Первый прогон
    с обновлением: save_golden=True — снятые кадры становятся эталоном
    ПОСЛЕ того, как человек на них посмотрел. CI не утверждает эталон сам.
    """
    def __init__(self, bridge, golden_dir: str):
        from pathlib import Path
        self.b = bridge
        self.golden = Path(golden_dir)
        self.golden.mkdir(parents=True, exist_ok=True)

    def run(self, spec: RigSpec, peg_of: dict[str, str],
            poses: Sequence[Pose] | None = None,
            frame: int = 1, save_golden: bool = False) -> list[dict]:
        from bridge_client import HarmonyBridge  # noqa: F401  (типы)
        poses = list(poses) if poses is not None else standard_stress_poses(spec)
        results = []
        for pose in poses:
            # выставить углы через eval (одним атомарным вызовом)
            script_lines = []
            for part, deg in pose.rotations.items():
                peg = peg_of[part]
                script_lines.append(
                    f'node.setTextAttr("{peg}", "ROTATION.ANGLEZ", {frame}, "{deg}");')
            if script_lines:
                self.b.eval("\n".join(script_lines) + "\nreturn true;")

            r = self.b.call("render_frame", {"frame": frame, "width": 480},
                            deadline_s=180.0)
            png = r.result["path"]
            golden = self.golden / f"{pose.name}.png"
            if save_golden or not golden.exists():
                import shutil
                shutil.copy(png, golden)
                results.append({"pose": pose.name, "status": "golden-updated",
                                "needs_human_approval": True})
            else:
                same = (golden.read_bytes() == open(png, "rb").read())
                results.append({"pose": pose.name,
                                "status": "match" if same else "DIFFERS",
                                "rendered": png, "golden": str(golden)})
        return results
