"""
rigging.py — генератор cutout-ригов из описания персонажа (идея №29).

Вход — RigSpec: описание персонажа как данные (какие части, кто чей
родитель, что поверх чего, у каких частей словари рисунков).
Выход — план правок для node_edit из nodes.js: пеги, READ-ноды,
композит, связи, порядок отрисовки.

Почему это данные, а не звонки в Harmony напрямую: план можно
проверить тестами ДО сцены (все связи валидны? порядок отрисовки
без противоречий? иерархия без циклов?), можно показать человеку
на ревью, и можно применить к десяти сценам подряд. Риг становится
артефактом в git, а не результатом двух дней кликанья.

Структура сгенерированного рига (стандартная студийная):

    Top/<Char>-P                    мастер-пег персонажа
      <Char>/<part>-P               пег каждой части
        <part>                      READ-нода (рисунок части)
    Top/<Char>-Composite            композит персонажа
    порядок портов композита = порядок отрисовки (z-order)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Sequence


# ---------------------------------------------------------------------------
# Спека рига
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Part:
    """
    Одна часть персонажа.

    name     — имя части ("head", "arm_near_upper")
    parent   — имя родительской части; None = висит на мастер-пеге.
               Двинулся родитель — двинулись все дети (плечо тянет кисть).
    pivot    — точка вращения (x, y) в координатах сцены. Для руки это
               плечо, для головы — шея. Неверный пивот — главный дефект
               автоген-ригов: часть вращается вокруг центра картинки,
               и рука отрывается от тела.
    drawings — имена рисунков в словаре части (рты, глаза, кисти).
               Пустой список = одна картинка без подмен.
    """
    name: str
    parent: str | None = None
    pivot: tuple[float, float] = (0.0, 0.0)
    drawings: tuple[str, ...] = ()


@dataclass
class RigSpec:
    """
    Полное описание персонажа.

    draw_order — имена частей от ЗАДНЕЙ к ПЕРЕДНЕЙ (дальняя рука,
    туловище, ближняя рука, голова). Обязан содержать все части
    ровно по разу — недосказанный порядок отрисовки это дефект
    спеки, а не повод что-то придумать за художника.
    """
    character: str
    parts: list[Part]
    draw_order: list[str]

    def part(self, name: str) -> Part:
        for p in self.parts:
            if p.name == name:
                return p
        raise KeyError(f"no part {name!r} in rig {self.character!r}")


# ---------------------------------------------------------------------------
# Валидация: все дефекты спеки — ДО генерации, списком, не по одному
# ---------------------------------------------------------------------------

def validate_spec(spec: RigSpec) -> list[str]:
    errors: list[str] = []
    names = [p.name for p in spec.parts]
    seen: set[str] = set()

    if not spec.character or "/" in spec.character:
        errors.append(f"bad character name: {spec.character!r}")
    if not spec.parts:
        errors.append("rig has no parts")

    for n in names:
        if n in seen:
            errors.append(f"duplicate part: {n!r}")
        seen.add(n)
        if not n or "/" in n:
            errors.append(f"bad part name: {n!r}")

    # родители существуют, иерархия без циклов
    for p in spec.parts:
        if p.parent is not None and p.parent not in seen:
            errors.append(f"part {p.name!r}: unknown parent {p.parent!r}")
    for p in spec.parts:
        trail, cur = {p.name}, p.parent
        while cur is not None:
            if cur in trail:
                errors.append(f"parent cycle through {p.name!r}")
                break
            trail.add(cur)
            nxt = next((q.parent for q in spec.parts if q.name == cur), None)
            cur = nxt

    # порядок отрисовки покрывает все части ровно по разу
    extra = [n for n in spec.draw_order if n not in seen]
    missing = [n for n in seen if n not in spec.draw_order]
    dupes = [n for n in spec.draw_order if spec.draw_order.count(n) > 1]
    if extra:
        errors.append(f"draw_order references unknown parts: {extra}")
    if missing:
        errors.append(f"draw_order misses parts: {missing} — z-order must be "
                      f"decided by the artist, not guessed")
    if dupes:
        errors.append(f"draw_order lists parts twice: {sorted(set(dupes))}")

    # словари: имена рисунков не повторяются в пределах части
    for p in spec.parts:
        if len(set(p.drawings)) != len(p.drawings):
            errors.append(f"part {p.name!r}: duplicate drawing names")
    return errors


# ---------------------------------------------------------------------------
# Генерация плана
# ---------------------------------------------------------------------------

@dataclass
class RigPlan:
    edits: list[dict]                 # для node_edit
    peg_of: dict[str, str]            # part -> путь пега (для анимации потом)
    read_of: dict[str, str]           # part -> путь READ-ноды (для substitution)
    composite: str
    master_peg: str
    notes: list[str] = field(default_factory=list)


def generate_rig(spec: RigSpec, parent_group: str = "Top") -> RigPlan:
    """
    Спека -> план. Порядок правок безопасный (тот же принцип, что
    plan_edits в nodes.py): сначала все ноды, потом все связи.

    Порядок отрисовки реализован порядком линковки в композит:
    в Harmony порт 0 композита рисуется ПОВЕРХ. Поэтому draw_order
    (зад -> перед) линкуется в обратном порядке: передняя часть — в
    порт 0. Это место, где чаще всего ошибаются на единицу; тест
    закрепляет направление.
    """
    errors = validate_spec(spec)
    if errors:
        raise ValueError("rig spec invalid:\n  " + "\n  ".join(errors))

    C = spec.character
    edits: list[dict] = []
    peg_of: dict[str, str] = {}
    read_of: dict[str, str] = {}
    notes: list[str] = []

    master = f"{parent_group}/{C}-P"
    comp = f"{parent_group}/{C}-Composite"

    # 1. ноды
    edits.append({"op": "add", "type": "PEG", "name": f"{C}-P", "parent": parent_group})
    edits.append({"op": "add", "type": "COMPOSITE", "name": f"{C}-Composite",
                  "parent": parent_group})
    for p in spec.parts:
        peg = f"{parent_group}/{p.name}-P"
        read = f"{parent_group}/{p.name}"
        peg_of[p.name] = peg
        read_of[p.name] = read
        edits.append({"op": "add", "type": "PEG", "name": f"{p.name}-P",
                      "parent": parent_group})
        edits.append({"op": "add", "type": "READ", "name": p.name,
                      "parent": parent_group})

    # 2. пивоты — до связей: атрибут не зависит от топологии,
    #    но логически принадлежит «созданию» части
    for p in spec.parts:
        if p.pivot != (0.0, 0.0):
            edits.append({"op": "set_attr", "path": peg_of[p.name],
                          "attr": "PIVOT.X", "value": p.pivot[0]})
            edits.append({"op": "set_attr", "path": peg_of[p.name],
                          "attr": "PIVOT.Y", "value": p.pivot[1]})
    notes.append("pivots set on pegs, not drawings: rotation must happen "
                 "around the joint, or limbs detach")

    # 3. иерархия пегов: родительский пег -> дочерний пег
    for p in spec.parts:
        parent_peg = master if p.parent is None else peg_of[p.parent]
        edits.append({"op": "link", "src": parent_peg, "src_port": 0,
                      "dst": peg_of[p.name], "dst_port": 0})

    # 4. пег части -> её READ
    for p in spec.parts:
        edits.append({"op": "link", "src": peg_of[p.name], "src_port": 0,
                      "dst": read_of[p.name], "dst_port": 0})

    # 5. порядок отрисовки: draw_order идёт зад->перед,
    #    порт 0 композита рисуется поверх => линкуем перед->зад в порты 0,1,2...
    for port, part_name in enumerate(reversed(spec.draw_order)):
        edits.append({"op": "link", "src": read_of[part_name], "src_port": 0,
                      "dst": comp, "dst_port": port})
    notes.append(f"draw order (back->front): {' < '.join(spec.draw_order)}; "
                 f"front part wired to composite port 0")

    return RigPlan(edits=edits, peg_of=peg_of, read_of=read_of,
                   composite=comp, master_peg=master, notes=notes)


# ---------------------------------------------------------------------------
# Стандартный гуманоид: 80% персонажей сериала — это он
# ---------------------------------------------------------------------------

def humanoid_spec(character: str,
                  mouth_drawings: Sequence[str] = (),
                  eye_drawings: Sequence[str] = ()) -> RigSpec:
    """
    Типовой двурукий-двуногий в 3/4. Пивоты в условных единицах от
    центра бёдер; для конкретного персонажа их сдвигает модель-лист,
    но топология и порядок отрисовки у гуманоида в 3/4 всегда эти.
    """
    parts = [
        Part("hips"),
        Part("torso", parent="hips", pivot=(0.0, 1.0)),
        Part("head", parent="torso", pivot=(0.0, 3.0)),
        Part("mouth", parent="head", pivot=(0.0, 3.4),
             drawings=tuple(mouth_drawings)),
        Part("eyes", parent="head", pivot=(0.0, 3.8),
             drawings=tuple(eye_drawings)),
        # far = дальняя от камеры (рисуется ЗА туловищем)
        Part("arm_far_upper", parent="torso", pivot=(-0.8, 2.6)),
        Part("arm_far_lower", parent="arm_far_upper", pivot=(-1.4, 1.8)),
        Part("hand_far", parent="arm_far_lower", pivot=(-1.8, 1.1)),
        Part("arm_near_upper", parent="torso", pivot=(0.8, 2.6)),
        Part("arm_near_lower", parent="arm_near_upper", pivot=(1.4, 1.8)),
        Part("hand_near", parent="arm_near_lower", pivot=(1.8, 1.1)),
        Part("leg_far_upper", parent="hips", pivot=(-0.4, 0.0)),
        Part("leg_far_lower", parent="leg_far_upper", pivot=(-0.5, -1.4)),
        Part("foot_far", parent="leg_far_lower", pivot=(-0.6, -2.7)),
        Part("leg_near_upper", parent="hips", pivot=(0.4, 0.0)),
        Part("leg_near_lower", parent="leg_near_upper", pivot=(0.5, -1.4)),
        Part("foot_near", parent="leg_near_lower", pivot=(0.6, -2.7)),
    ]
    draw_order = [
        # зад -> перед
        "arm_far_upper", "arm_far_lower", "hand_far",
        "leg_far_upper", "leg_far_lower", "foot_far",
        "torso", "hips",
        "leg_near_upper", "leg_near_lower", "foot_near",
        "head", "eyes", "mouth",
        "arm_near_upper", "arm_near_lower", "hand_near",
    ]
    return RigSpec(character, parts, draw_order)


# ---------------------------------------------------------------------------
# Фасад: применить план к сцене
# ---------------------------------------------------------------------------

class Rigging:
    def __init__(self, bridge):
        from nodes import Nodes
        self.nodes = Nodes(bridge)

    def build(self, spec: RigSpec, parent_group: str = "Top") -> dict:
        plan = generate_rig(spec, parent_group)
        result = self.nodes.edit(plan.edits)
        result["peg_of"] = plan.peg_of
        result["read_of"] = plan.read_of
        result["notes"] = plan.notes
        return result
