"""Смарт-модули по MOHO_RIG_MODULE_LIBRARY_V1.

Числа HEAD_TURN — дословно из Girl.moho (диал 'Head Switch'):
constraints -135°..180°, 9 ключей, углы [90,270,225,180,135,90,45,0,-45]°,
карта Front/Back/1-4 R/Side R/3-4 R/Front/3-4 L/Side L/1-4 L.
interp диала: первый ключ im:3, остальные im:1 v1=0.1 v2=0.5.
interp свитча: ступенчатый im:0 (кроме первого ключа) — виды не блендятся.
"""
from __future__ import annotations

import math

from ..pir.schema import Bone, Channel, Part

DIAL_KEY_INTERP = {"im": 1, "v1": 0.1, "v2": 0.5, "in": 1, "h": 0, "s": False, "t": 0}
DIAL_FIRST_INTERP = {"im": 3, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0, "s": False, "t": 0}
SWITCH_STEP_INTERP = {"im": 0, "v1": 0.1, "v2": 0.5, "in": 1, "h": 0, "s": False, "t": 0}
BASE_INTERP = {"im": 1, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0, "s": False, "t": 0}

HEAD_TURN_ANGLES = [1.570796, 4.712389, 3.926991, 3.141593,
                    2.356194, 1.570796, 0.785398, 0.0, -0.785398]
HEAD_TURN_CONSTRAINTS = (True, -2.356194, 3.141593)

PHONEMES_FULL = ["A", "B", "C", "D", "E", "F", "G", "I", "K", "L", "M",
                 "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W",
                 "TH", "Closed"]
PHONEMES_COMPACT = ["Closed", "A", "E", "I", "O", "U", "F", "L", "MBP", "WQ"]


def make_image_part(part_id: str, name: str, image_path: str, bone_id: str,
                    origin_moho: tuple[float, float],
                    center_moho: tuple[float, float],
                    bone_abs_angle: float) -> Part:
    p = Part(id=part_id, name=name, type="image", image_ref=str(image_path),
             bone=bone_id, origin=origin_moho)
    dx = center_moho[0] - origin_moho[0]
    dy = center_moho[1] - origin_moho[1]
    cos_a, sin_a = math.cos(-bone_abs_angle), math.sin(-bone_abs_angle)
    loc = (dx * cos_a - dy * sin_a, dx * sin_a + dy * cos_a)
    p.transforms["translation"] = Channel(
        type="Vec3", when=[0],
        val=[{"x": round(loc[0], 6), "y": round(loc[1], 6), "z": 0.0}],
        interp=[dict(BASE_INTERP)])
    return p


def make_mesh_part(part_id: str, name: str, mesh_dict: dict, bone_id: str,
                   origin_moho: tuple[float, float],
                   center_moho: tuple[float, float],
                   bone_abs_angle: float,
                   masking: int = 0, group_mask: int = 0) -> Part:
    """Создаёт векторный MeshLayer Part с геометрией Bezier."""
    p = Part(id=part_id, name=name, type="mesh", geometry_raw=mesh_dict,
             bone=None, origin=(0.0, 0.0), masking=masking, group_mask=group_mask)
    # Production vector rigs deform through Point.parent; binding the layer too
    # would apply the same bone transform twice.
    p.transforms["translation"] = Channel(
        type="Vec3", when=[0],
        val=[{"x": round(center_moho[0], 6),
              "y": round(center_moho[1], 6), "z": 0.0}],
        interp=[dict(BASE_INTERP)])
    return p


def make_switch(switch_id: str, name: str, states: dict[str, str],
                bone_id: str, origin_fn, center_fn, abs_angles: dict[str, float],
                z_start: int) -> Part:
    """SwitchLayer с image-детьми по одному на состояние."""
    sw = Part(id=switch_id, name=name, type="switch", bone=None,
              switch_states=list(states.keys()))
    for i, (state_name, img) in enumerate(states.items()):
        child = make_image_part(f"{switch_id}_st_{i}", state_name, img, bone_id,
                                origin_fn(bone_id), center_fn(state_name),
                                abs_angles[bone_id])
        child.parent = switch_id
        child.z_order = z_start + i
        sw.children.append(child)
    sw.switch_channel = Channel(type="String", when=[0],
                                val=[list(states.keys())[0]],
                                interp=[dict(BASE_INTERP)])
    return sw


def make_vector_switch(switch_id: str, name: str, states: dict[str, dict],
                       bone_id: str, origin_fn, center_fn, abs_angles: dict[str, float],
                       z_start: int, masking: int = 0, group_mask: int = 0) -> Part:
    """SwitchLayer с vector mesh-детьми по одному на состояние."""
    sw = Part(id=switch_id, name=name, type="switch", bone=bone_id,
              switch_states=list(states.keys()), masking=masking, group_mask=group_mask)
    for i, (state_name, mesh_data) in enumerate(states.items()):
        child = make_mesh_part(f"{switch_id}_st_{i}", state_name, mesh_data, bone_id,
                               origin_fn(bone_id), center_fn(state_name),
                               abs_angles[bone_id])
        child.parent = switch_id
        child.z_order = z_start + i
        sw.children.append(child)
    sw.switch_channel = Channel(type="String", when=[0],
                                val=[list(states.keys())[0]],
                                interp=[dict(BASE_INTERP)])
    return sw


def make_bone_group(name: str, bone_indices: list[int], action_name: str | None = None,
                    action_poses: list[float] | None = None) -> dict:
    """Генерирует объект BoneGroup для skeleton.bones_groups."""
    group = {
        "type": "BoneGroup",
        "enabled": True,
        "name": name,
        "bones": list(bone_indices),
        "active_bone": {
            "type": "Val", "ref": False, "mute": False,
            "when": [0], "val": [0.0],
            "interp": [dict(BASE_INTERP)],
        }
    }
    if action_name and action_poses:
        n = len(action_poses)
        group["active_bone"]["actions"] = [{
            "name": action_name,
            "pose": {
                "type": "Val", "ref": False, "mute": False,
                "when": list(range(n)),
                "val": list(action_poses),
                "interp": [dict(BASE_INTERP) for _ in range(n)],
            }
        }]
    return group


def dial_ensure_action(dial: Bone, action_name: str,
                       dial_vals: list[float]) -> None:
    """Добавить диалу экшен (если такого имени ещё нет)."""
    dial.dial_actions = dial.dial_actions or []
    if any(a.get("name") == action_name for a in dial.dial_actions):
        return
    n = len(dial_vals)
    dial.dial_actions.append({
        "name": action_name,
        "pose": {"type": "Val", "ref": False, "mute": False,
                 "when": list(range(n)),
                 "val": list(dial_vals),
                 "interp": [dict(DIAL_FIRST_INTERP)] +
                           [dict(DIAL_KEY_INTERP) for _ in range(n - 1)]},
    })


def switch_attach_action(switch_part: Part, action_name: str,
                         state_vals: list[str]) -> None:
    """Привязать свитч к экшену диала по имени — формула Girl."""
    n = len(state_vals)
    switch_part.switch_dial_actions = switch_part.switch_dial_actions or []
    switch_part.switch_dial_actions.append({
        "name": action_name,
        "pose": {"type": "String", "ref": False, "mute": False,
                 "when": list(range(n)),
                 "val": list(state_vals),
                 "interp": [dict(SWITCH_STEP_INTERP) for _ in range(n)]},
    })


def wire_dial(dial: Bone, action_name: str, dial_vals: list[float],
              switch_part: Part, state_vals: list[str]) -> None:
    """Связь один-к-одному: диал получает экшен, свитч привязывается."""
    dial_ensure_action(dial, action_name, dial_vals)
    switch_attach_action(switch_part, action_name, state_vals)


def head_turn_map(available: list[str]) -> list[str]:
    """Стандартная карта Girl: 9 позиций диала -> виды.

    Отсутствующие виды замещаются ближайшим заданным (та же сторона,
    иначе фронтальный)."""
    standard = ["Front", "Back", "1/4 R", "Side R", "3/4 R",
                "Front", "3/4 L", "Side L", "1/4 L"]
    def resolve(view: str) -> str:
        if view in available:
            return view
        side = view[-1] if view.endswith(("R", "L")) else ""
        cands = ([v for v in available if v.endswith(side)] if side
                 else [v for v in available if not v.endswith(("R", "L"))])
        return (cands or available)[0]
    return [resolve(v) for v in standard]


def make_flexi_pair(chain_name: str, limb) -> tuple[Bone, Bone]:
    """Пара start/end — кривой деформер конечности.

    Формула mannequin дословно: оба родителя = кость конечности;
    start в корне (pos 0,0, ang 0), end на 85% длины (ang=π);
    strength=0, hidden, shy, ignored_by_ik у обоих."""
    L = limb.length or 0.1
    start = Bone(id=f"{chain_name} start", parent=limb.id,
                 position=(0.0, 0.0), angle=0.0, length=round(0.35 * L, 6),
                 strength=0.0, is_flexi_endpoint=True,
                 flexi_pair=f"{chain_name} end", flexi_chain=chain_name,
                 hidden=True, shy=True, ignored_by_ik=True)
    end = Bone(id=f"{chain_name} end", parent=limb.id,
               position=(round(0.85 * L, 6), 0.0), angle=math.pi,
               length=round(0.30 * L, 6), strength=0.0, is_flexi_endpoint=True,
               flexi_pair=f"{chain_name} start", flexi_chain=chain_name,
               hidden=True, shy=True, ignored_by_ik=True)
    return start, end


def simple_dial_vals(n_states: int, spread_deg: float = 60.0
                     ) -> tuple[list[float], float, float]:
    """Углы простого диала: N состояний равномерно от -spread..+spread."""
    half = math.radians(spread_deg)
    if n_states == 1:
        return [0.0], -half, half
    step = 2 * half / (n_states - 1)
    vals = [-half + i * step for i in range(n_states)]
    return vals, -half, half


def make_simple_dial(dial_id: str, parent_bone: str | None,
                     position: tuple[float, float], action_name: str,
                     n_states: int, spread_deg: float = 60.0
                     ) -> tuple[Bone, list[float]]:
    vals, mn, mx = simple_dial_vals(n_states, spread_deg)
    dial = Bone(id=dial_id, parent=parent_bone, position=position,
                angle=0.0, length=0.35, constraints=True,
                min_constraint=round(mn, 6), max_constraint=round(mx, 6))
    dial._simple_action_name = action_name  # type: ignore[attr-defined]
    dial._simple_vals = vals  # type: ignore[attr-defined]
    return dial, vals


def attach_simple_dial(dial: Bone, switch_part: Part,
                       state_names: list[str]) -> None:
    """Связать простой диал со свитчем (равномерные углы, ступенчатый interp)."""
    vals = getattr(dial, "_simple_vals", None)
    name = getattr(dial, "_simple_action_name", f"{dial.id} Switch")
    if vals is None:
        raise ValueError(f"{dial.id}: не создан через make_simple_dial")
    wire_dial(dial, name, vals, switch_part, state_names)
