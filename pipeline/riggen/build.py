"""Сборка Rig из спецификации персонажа по стандарту V1.

Спецификация (dict):
{
  "name": str,
  "canvas": {"width": int, "height": int},
  "joints": {имя_сустава: [x_px, y_px]},          # px, y вниз
  "parts": [{"id","name","image","bone","center":[x,y]}...],  # порядок = z
  "head_turn": {"states": {"Front": path, ...},
                "bone": "Head", "center_by_state": {вид: [x,y]}} | null,
}
"""
from __future__ import annotations

import copy
import math

from ..pir.schema import Bone, Channel, Part, Rig
from .modules import (HEAD_TURN_ANGLES, PHONEMES_FULL, BASE_INTERP,
                      attach_simple_dial, dial_ensure_action,
                      make_flexi_pair, make_image_part, make_mesh_part,
                       make_simple_dial, make_switch, make_vector_switch,
                       make_bone_group,
                      switch_attach_action, wire_dial, head_turn_map)
from .skeleton import (add_leg_ik_targets, bone_root_joint,
                       build_bones, to_moho_coords)

FACE_MODULES = {
    "mouth": {"action": "Mouth Switch", "spread": 60.0},
    "eyes": {"action": "Eyes Switch", "spread": 60.0},
    "brows": {"action": "Brows Switch", "spread": 40.0},
}


def _doc_extras() -> dict:
    from ..moho.emit import _load_tpl
    doc = _load_tpl("_doc_skeleton.json")
    doc["project_data"]["width"] = 0
    doc["project_data"]["height"] = 0
    return {"styles": doc["styles"], "project_data": doc["project_data"],
            "metadata": doc.get("metadata"),
            "layercomps": doc.get("layercomps"),
            "documentviewstate": doc.get("documentviewstate")}


def build_rig(spec: dict) -> Rig:
    name = spec.get("name", "character")
    w = spec["canvas"]["width"]
    h = spec["canvas"]["height"]

    rig = Rig(name=name, source_program="moho", source_version="1041",
              canvas={"mime_type": "application/x-vnd.lm_mohodoc",
                      "version": 1041, "major_version": 1, "rev_version": 0,
                      "doc_uuid": "", "comment": ""})
    rig.extras = _doc_extras()
    bind_mode = int(spec.get("binding", {}).get("mode", 2))
    rig.extras["binding_mode"] = bind_mode
    rig.extras["project_data"]["width"] = w
    rig.extras["project_data"]["height"] = h

    bones, abs_angle, jw, root_world = build_bones(spec["joints"], w, h)
    if spec.get("leg_ik", True):
        add_leg_ik_targets(bones, root_world, abs_angle)

    name_to_idx = {b.id: i for i, b in enumerate(bones)}

    def origin_of(bone_id: str) -> tuple[float, float]:
        return jw[bone_root_joint(bone_id)]

    def center_moho(center: tuple[float, float] | list[float]
                    ) -> tuple[float, float]:
        return to_moho_coords(float(center[0]), float(center[1]), w, h)

    parts: list[Part] = []
    z = 0
    for sp in spec.get("parts", []):
        bone_id = sp.get("bone")
        p_idx = name_to_idx.get(bone_id, -1) if bone_id else -1
        masking = sp.get("masking", 0)
        group_mask = sp.get("group_mask", 0)
        if "mesh" in sp or sp.get("type") == "mesh":
            mesh_data = copy.deepcopy(sp.get("mesh", {}))
            # Привязываем точки к кости, если они еще не привязаны
            if p_idx >= 0 and "points" in mesh_data:
                for pt in mesh_data["points"]:
                    if pt.get("parent", -1) < 0:
                        pt["parent"] = p_idx
            p = make_mesh_part(f"mesh_{sp['id']}", sp["name"], mesh_data,
                               bone_id, origin_of(bone_id) if bone_id else (0.0, 0.0),
                               center_moho(sp["center"]),
                               abs_angle.get(bone_id, 0.0) if bone_id else 0.0,
                               masking=masking, group_mask=group_mask)
        else:
            p = make_image_part(f"img_{sp['id']}", sp["name"], sp.get("image", ""),
                                bone_id, origin_of(bone_id) if bone_id else (0.0, 0.0),
                                center_moho(sp["center"]),
                                abs_angle.get(bone_id, 0.0) if bone_id else 0.0)
            p.masking = masking
            p.group_mask = group_mask
        p.z_order = z
        z += 1
        parts.append(p)

    dial_bones: list[Bone] = []

    for i, cfg in enumerate(spec.get("bone_actions", [])):
        action = cfg["action"]
        target = next((b for b in bones if b.id == cfg["bone"]), None)
        if target is None:
            raise ValueError(f"bone_actions: кость '{cfg['bone']}' не найдена")
        vals = cfg["vals"]
        n = len(vals)
        half = math.radians(cfg.get("spread_deg", 60.0))
        step = 2 * half / max(n - 1, 1)
        dvals = [-half + j * step for j in range(n)] if n > 1 else [0.0]
        dial_id = cfg.get("dial_id", f"{action} Dial")
        dial = next((b for b in dial_bones
                     if any(a.get("name") == action
                            for a in (b.dial_actions or []))), None)
        if dial is None:
            anchor = root_world[cfg.get("dial_near", "Main")]
            dial = Bone(id=dial_id, parent=cfg.get("dial_parent", "Main"),
                        position=(anchor[0] + 1.2, anchor[1] + 1.5 * (i + 1)),
                        angle=math.pi / 2, length=0.35,
                        constraints=True,
                        min_constraint=round(-half, 6),
                        max_constraint=round(half, 6))
            dial_bones.append(dial)
        dial_ensure_action(dial, action, dvals)
        pose = {"type": "Val", "ref": False, "mute": False,
                "when": list(range(n)), "val": list(vals),
                "interp": [dict(BASE_INTERP) for _ in range(n)]}
        entry = {"name": action, "pose": pose}
        ch = cfg.get("channel", "scale")
        if ch == "scale":
            raw = target.scale_channel_raw or {
                "type": "Val", "ref": False, "mute": False, "when": [0],
                "val": [1.0], "interp": [dict(BASE_INTERP)]}
            raw.setdefault("actions", []).append(entry)
            target.scale_channel_raw = raw
        elif ch == "pos":
            raw = target.pos_channel_raw or {
                "type": "Vec2", "ref": False, "mute": False, "when": [0],
                "val": [{"x": 0.0, "y": 0.0}], "interp": [dict(BASE_INTERP)]}
            raw.setdefault("actions", []).append(entry)
            target.pos_channel_raw = raw
        else:
            target.dial_actions = target.dial_actions or []
            target.dial_actions.append(
                {"name": action, "pose": pose})

    for chain in spec.get("flexi", []):
        limb = next((b for b in bones if b.id == chain), None)
        if limb is None:
            raise ValueError(f"flexi: кость '{chain}' не найдена в скелете")
        s, e = make_flexi_pair(chain, limb)
        dial_bones.extend([s, e])

    z_extra = 0
    for idx, cfg in enumerate(spec.get("simple_switches", [])):
        states = cfg["states"]
        bone_id = cfg.get("bone", "Body")
        is_vector = any(isinstance(v, dict) for v in states.values())
        if is_vector:
            point_parent = name_to_idx.get(bone_id, -1)
            states = copy.deepcopy(states)
            if point_parent >= 0:
                for mesh in states.values():
                    for point in mesh.get("points", []):
                        if point.get("parent", -1) < 0:
                            point["parent"] = point_parent
            sw = make_vector_switch(f"sw_{cfg['id']}", cfg.get("name", cfg["id"]),
                                    states, bone_id, origin_of,
                                    lambda s_, c=cfg: center_moho(
                                        c["center_by_state"][s_]),
                                    abs_angle, z + z_extra,
                                    masking=cfg.get("masking", 0),
                                    group_mask=cfg.get("group_mask", 0))
        else:
            sw = make_switch(f"sw_{cfg['id']}", cfg.get("name", cfg["id"]),
                             states, bone_id, origin_of,
                             lambda s_, c=cfg: center_moho(
                                 c["center_by_state"][s_]),
                             abs_angle, z + z_extra)
            sw.masking = cfg.get("masking", 0)
            sw.group_mask = cfg.get("group_mask", 0)
        z_extra += len(states)
        parts.append(sw)
        if not is_vector:
            sw.bone = bone_id
        anchor = jw[bone_root_joint(bone_id)]
        dial_world = (anchor[0] - 0.8, anchor[1] + 0.5 * idx)
        dial, _vals = make_simple_dial(
            f"{cfg['id']} Dial", bone_id,
            _local_in_parent(bone_id, dial_world, abs_angle, root_world),
            cfg.get("action", f"{cfg['id']} Switch"),
            len(states), cfg.get("spread_deg", 60.0))
        attach_simple_dial(dial, sw, list(states.keys()))
        dial_bones.append(dial)

    ht = spec.get("head_turn")
    face_dials: dict[str, tuple[Bone, list[float]]] = {}
    if ht:
        states = ht["states"]
        face_cfg = ht.get("face") or {}
        views = list(states.keys())
        head_bone_id = ht.get("bone", "Head")
        head_bone_idx = name_to_idx.get(head_bone_id, -1)

        def view_part(view: str, z0: int) -> Part:
            center = center_moho(ht["center_by_state"][view])
            state_val = states[view]
            if isinstance(state_val, dict):
                # Векторный меш
                m = copy.deepcopy(state_val)
                if head_bone_idx >= 0 and "points" in m:
                    for pt in m["points"]:
                        if pt.get("parent", -1) < 0:
                            pt["parent"] = head_bone_idx
                skull = make_mesh_part(f"view_{view}_skull", view,
                                       m, head_bone_id,
                                       origin_of(head_bone_id),
                                       center, abs_angle[head_bone_id])
            else:
                skull = make_image_part(f"view_{view}_skull", view,
                                        state_val, head_bone_id,
                                        origin_of(head_bone_id),
                                        center, abs_angle[head_bone_id])
            grp = Part(id=f"view_{view}", name=view, type="group",
                       bone=None if isinstance(state_val, dict) else head_bone_id,
                       origin=center)
            grp.children = [skull]
            for i, (mod, cfg) in enumerate(FACE_MODULES.items()):
                mconf = face_cfg.get(mod)
                if not (mconf and view in mconf.get("views", [])):
                    continue
                mstates = ((mconf.get("states_by_view") or {})
                           .get(view) or mconf["states"])
                mcenters = ((mconf.get("centers_by_view") or {})
                            .get(view) or mconf["center_by_state"])
                is_vec = any(isinstance(v, dict) for v in mstates.values())
                if is_vec:
                    # Привязка точек деталей лица к кости головы
                    vec_states = {}
                    for s_k, s_m in mstates.items():
                        m_copy = copy.deepcopy(s_m)
                        if head_bone_idx >= 0 and "points" in m_copy:
                            for pt in m_copy["points"]:
                                if pt.get("parent", -1) < 0:
                                    pt["parent"] = head_bone_idx
                        vec_states[s_k] = m_copy
                    sw = make_vector_switch(f"sw_{mod}_{view}", mod, vec_states,
                                            head_bone_id, origin_of,
                                            lambda s_, c=mcenters: center_moho(c[s_]),
                                            abs_angle, z0 + 1 + i,
                                            masking=mconf.get("masking", 0),
                                            group_mask=mconf.get("group_mask", 0))
                else:
                    sw = make_switch(f"sw_{mod}_{view}", mod, mstates,
                                     head_bone_id, origin_of,
                                     lambda s_, c=mcenters: center_moho(c[s_]),
                                     abs_angle, z0 + 1 + i)
                    sw.masking = mconf.get("masking", 0)
                    sw.group_mask = mconf.get("group_mask", 0)
                if not is_vec:
                    sw.bone = head_bone_id
                action = cfg["action"]
                vals = face_dials.get(action)
                if vals is None:
                    dial_id = f"{mod.capitalize()} Dial"
                    anchor = jw["head_base"]
                    dw = (anchor[0] + 1.2 + 0.6 * len(face_dials), anchor[1])
                    nst = len(mstates)
                    half = math.radians(cfg["spread"])
                    step = 2 * half / max(nst - 1, 1)
                    dvals = [-half + j * step for j in range(nst)] \
                        if nst > 1 else [0.0]
                    dial = Bone(id=dial_id, parent=head_bone_id,
                                position=_local_in_parent(
                                    head_bone_id, dw,
                                    abs_angle, root_world),
                                angle=math.pi / 2 -
                                abs_angle[head_bone_id],
                                length=0.35, constraints=True,
                                min_constraint=round(-half, 6),
                                max_constraint=round(half, 6))
                    face_dials[action] = (dial, dvals)
                    dial_bones.append(dial)
                dial_bone, dvals = face_dials[action]
                dial_ensure_action(dial_bone, action, dvals)
                switch_attach_action(sw, action, list(mstates))
                grp.children.append(sw)
            return grp

        parts_by_view = {v: view_part(v, z + i) for i, v in enumerate(views)}
        z += len(views)
        # свитч головы: состояния-группы
        all_vector_head = all(isinstance(state, dict) for state in states.values())
        sw_head = Part(id="sw_head_turn", name="Head", type="switch",
                       bone=None if all_vector_head else head_bone_id,
                       switch_states=views)
        for v in views:
            g = parts_by_view[v]
            g.parent = sw_head.id
            sw_head.children.append(g)
        sw_head.switch_channel = Channel(type="String", when=[0],
                                         val=[views[0]],
                                         interp=[{"im": 1, "v1": -1.0,
                                                  "v2": -1.0, "in": 1,
                                                  "h": 0, "s": False,
                                                  "t": 0}])
        parts.append(sw_head)
        dial_world = (jw["head_base"][0] + 0.8, jw["head_base"][1])
        dial = Bone(id="Head Switch Dial", parent=head_bone_id,
                    position=_local_in_parent(head_bone_id, dial_world,
                                              abs_angle, root_world),
                    angle=math.pi / 2 - abs_angle[head_bone_id],
                    length=0.4, constraints=True,
                    min_constraint=-2.356194, max_constraint=3.141593)
        wire_dial(dial, "Head Switch", HEAD_TURN_ANGLES, sw_head,
                  head_turn_map(views))
        dial_bones.append(dial)

    root = Part(id="root_group", name=name, type="bone_container")
    root.children = sorted(parts, key=lambda p: p.z_order)
    for i, c in enumerate(root.children):
        c.parent = root.id
        c.z_order = i
    if bind_mode == 1:
        for p in root.children:
            p.bone = None
            for sub in p.children:
                sub.bone = None
    rig.root_parts = [root]
    all_bones = bones + dial_bones
    rig.bones = all_bones

    # Генерация групп костей (bones_groups) по эталонам Girl и Dad body
    all_name_to_idx = {b.id: i for i, b in enumerate(all_bones)}
    def bone_indices(names: list[str]) -> list[int]:
        return [all_name_to_idx[n] for n in names if n in all_name_to_idx]

    bone_groups = [
        make_bone_group("Body & Spine", bone_indices(["Main", "Pelvis", "Body", "Neck", "Head"])),
        make_bone_group("Left Arm", bone_indices(["UpperArm L", "LowerArm L", "LowerArm L start", "LowerArm L end"])),
        make_bone_group("Right Arm", bone_indices(["UpperArm R", "LowerArm R", "LowerArm R start", "LowerArm R end"])),
        make_bone_group("Left Leg", bone_indices(["Thigh L", "Shin L", "Foot L", "Target Leg L", "Shin L start", "Shin L end"])),
        make_bone_group("Right Leg", bone_indices(["Thigh R", "Shin R", "Foot R", "Target Leg R", "Shin R start", "Shin R end"])),
        make_bone_group("Dials & Controls", [i for i, b in enumerate(all_bones)
                                              if b.is_dial or "Dial" in b.id]),
    ]
    rig.extras["bones_groups"] = [bg for bg in bone_groups if bg["bones"]]

    # 7. Генерация библиотеки экшенов анимации (Walk, Run, Idle)
    if spec.get("include_actions", True):
        from .animation_cycles import build_standard_action_library
        actions_lib = build_standard_action_library()
        action_descriptors = []
        for act in actions_lib:
            act_name = act["name"]
            action_descriptors.append({"name": act_name, "pose": 0})
            for b_name, b_chans in act.get("bones", {}).items():
                target_bone = next((b for b in all_bones if b.id == b_name), None)
                if target_bone is None:
                    continue
                if "anim_pos" in b_chans:
                    chan_data = b_chans["anim_pos"]
                    if target_bone.pos_channel_raw is None:
                        target_bone.pos_channel_raw = {
                            "type": "Vec2", "ref": False, "mute": False,
                            "when": [0], "val": [{"x": target_bone.position[0], "y": target_bone.position[1]}],
                            "interp": [dict(BASE_INTERP)], "actions": []
                        }
                    target_bone.pos_channel_raw.setdefault("actions", []).append({
                        "name": act_name,
                        "pose": chan_data
                    })
                if "anim_angle" in b_chans:
                    chan_data = b_chans["anim_angle"]
                    if target_bone.dial_actions is None:
                        target_bone.dial_actions = []
                    target_bone.dial_actions.append({
                        "name": act_name,
                        "pose": chan_data
                    })
        root.actions_raw = action_descriptors
        rig.extras["actions"] = action_descriptors

    return rig


def _local_in_parent(parent_id: str, world: tuple[float, float],
                     abs_angle: dict[str, float],
                     root_world: dict[str, tuple[float, float]]
                     ) -> tuple[float, float]:
    """Конвенция auto_rig (проверена в живом Moho): координаты в системе
    прямого родителя — поворот на минус абсолютный угол родителя."""
    pw, pa = root_world[parent_id], abs_angle[parent_id]
    dx, dy = world[0] - pw[0], world[1] - pw[1]
    cos_a, sin_a = math.cos(-pa), math.sin(-pa)
    x = dx * cos_a - dy * sin_a
    y = dx * sin_a + dy * cos_a
    if abs(x) < 1e-12:
        x = 0.0
    if abs(y) < 1e-12:
        y = 0.0
    return (round(x, 6), round(y, 6))
