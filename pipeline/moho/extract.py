"""Извлечение PIR из .moho файла (zip + JSON Project.mohoproj)."""
from __future__ import annotations

import json
import zipfile
from io import BytesIO
import re

from ..pir.schema import Bone, Channel, Part, Rig, DialLink

_MIME = "application/x-vnd.lm_mohodoc"


def load_mohoproj(path: str) -> tuple[dict, dict[str, bytes]]:
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        # .moho: Project.mohoproj; .anime: Project.animeproj
        proj_name = "Project.mohoproj" if "Project.mohoproj" in names else "Project.animeproj"
        raw = z.read(proj_name)
        others = {n: z.read(n) for n in names if n != proj_name}
    return json.loads(raw), others


def _channel_from_dict(d: dict) -> Channel:
    return Channel(type=d.get("type", "Val"), when=list(d.get("when", [])),
                   val=d.get("val", []), interp=list(d.get("interp", [])))


def _bone_from_dict(idx: int, b: dict, name_map: dict[int, str]) -> Bone:
    pos = b["anim_pos"]["val"][0]
    raw_angle = b["anim_angle"]["val"][0]
    angle = raw_angle if isinstance(raw_angle, (int, float)) else raw_angle.get("v", 0.0)
    parent_idx = b.get("parent", -1)
    name = name_map[idx]
    bone = Bone(
        id=name,
        parent=name_map.get(parent_idx) if parent_idx >= 0 else None,
        position=(pos["x"], pos["y"]),
        angle=float(angle),
        length=float(b.get("length", 0.0)),
        strength=float(b.get("strength", 1.0)),
        constraints=bool(b.get("constraints", False)),
        min_constraint=float(b.get("min_constraint", 0.0)),
        max_constraint=float(b.get("max_constraint", 0.0)),
        hidden=bool(b.get("hidden", False)),
        shy=bool(b.get("shy", False)),
        ignored_by_ik=bool(b.get("ignored_by_ik", False)),
    )
    tb = b.get("target_bone")
    if isinstance(tb, dict) and "val" in tb and tb["val"]:
        tval = int(tb["val"][0])
        if tval >= 0:
            bone.target_bone = name_map.get(tval)
    elif isinstance(tb, int) and tb >= 0:
        bone.target_bone = name_map.get(tb)
    ik_l = b.get("ik_lock")
    if isinstance(ik_l, dict) and "val" in ik_l and ik_l["val"]:
        bone.ik_lock = bool(ik_l["val"][0])
    elif isinstance(ik_l, bool):
        bone.ik_lock = ik_l

    ap = b.get("anim_pos")
    if isinstance(ap, dict) and "when" in ap and len(ap.get("when", [])) > 0:
        bone.pos_channel = _channel_from_dict(ap)
        if ap.get("actions"):
            bone.pos_channel_raw = ap
    aa = b.get("anim_angle")
    if isinstance(aa, dict) and "when" in aa and len(aa.get("when", [])) > 0:
        bone.angle_channel = _channel_from_dict(aa)
    asc = b.get("anim_scale")
    if isinstance(asc, dict) and ("actions" in asc
                                  or (asc.get("when") and len(asc["when"]) > 1)):
        bone.scale_channel_raw = asc
    ap_par = b.get("anim_parent")
    if isinstance(ap_par, dict) and ap_par.get("when"):
        bone.anim_parent_raw = ap_par
    off = b.get("offset") or {}
    bone.offset_x = float(off.get("x", 0.0) or 0.0)
    bone.offset_y = float(off.get("y", 0.0) or 0.0)
    for k, v in b.items():
        if k in ("anim_angle", "anim_pos", "anim_scale"):
            continue
        if isinstance(v, dict) and "when" in v and (
                v.get("actions") or (v.get("when") and len(v["when"]) > 1)):
            bone.extra_channels_raw[k] = v
    acts = None
    if isinstance(aa, dict):
        acts = aa.get("actions")
    if isinstance(acts, list) and acts:
        bone.dial_actions = [
            {"name": a.get("name", ""),
             "pose": a.get("pose"),
             "extras": {k: v for k, v in a.items()
                        if k not in ("name", "pose")}}
            for a in acts if isinstance(a, dict)
        ]
        bone.is_dial = True
    return bone


def _detect_flexi_pairs(bones: list[Bone]) -> None:
    """Распознать пары start/end — кривые деформеры."""
    by_chain: dict[str, dict[str, Bone]] = {}
    for b in bones:
        m = re.match(r"^(.+?)\s+(start|end)(?:_\d+)?$", b.id, re.IGNORECASE)
        if not m:
            continue
        chain, end = m.group(1).strip(), m.group(2).lower()
        if chain not in by_chain:
            by_chain[chain] = {}
        by_chain[chain][end] = b
    for chain, ends in by_chain.items():
        if "start" in ends and "end" in ends:
            s, e = ends["start"], ends["end"]
            s.is_flexi_endpoint = True
            e.is_flexi_endpoint = True
            s.flexi_pair = e.id
            e.flexi_pair = s.id
            s.flexi_chain = chain
            e.flexi_chain = chain


def _walk_all_parts(parts: list[Part]):
    for p in parts:
        yield p
        yield from _walk_all_parts(p.children)


def _detect_head_turns(parts: list[Part], bones: list[Bone]) -> tuple[dict[str, list[str]], list[DialLink]]:
    """Связи всех диалов со свитчами + разметка head-turn свитчей."""
    def is_head_action(name: str) -> bool:
        n = (name or "").lower()
        return "head" in n and ("switch" in n or "turn" in n)

    head_dials = [b for b in bones if b.is_dial and b.dial_actions
                  and any(is_head_action(a.get("name")) for a in b.dial_actions)]
    head_dial_ids = {b.id for b in head_dials}
    dial_links: list[DialLink] = []
    head_turn_views: dict[str, list[str]] = {}
    for part in _walk_all_parts(parts):
        if part.type != "switch" or not part.switch_dial_actions:
            continue
        for sa in part.switch_dial_actions:
            sname = sa.get("name", "")
            dial = next((b for b in bones if b.is_dial and b.dial_actions
                         and any(a.get("name") == sname for a in b.dial_actions)),
                        None)
            if dial is None:
                continue
            if dial.id in head_dial_ids and is_head_action(sname):
                part.is_head_turn = True
                part.head_turn_views = [s for s in part.switch_states if s]
                head_turn_views[part.id] = part.head_turn_views
            dial_poses = {a["name"]: a.get("pose", {}) for a in dial.dial_actions}
            sp = sa.get("pose", {})
            dp = dial_poses.get(sname)
            if dp is None:
                continue
            when = dp.get("when", [])
            dl = DialLink(
                dial_bone_id=dial.id,
                dial_action_name=sname,
                switch_part_id=part.id,
                switch_state_name=(part.switch_states[when[0]]
                                   if when and part.switch_states else ""),
                pose_when=when,
                pose_val=dp.get("val", []),
                switch_when=sp.get("when", []),
                switch_val=sp.get("val", []),
            )
            dial_links.append(dl)
    return head_turn_views, dial_links


def _default_bone_name(idx: int) -> str:
    return f"bone_{idx + 1}"


def _layer_to_part(l: dict, bone_names: dict[int, str], counter: list[int],
                   parent_id: Optional[str]) -> Part:
    counter[0] += 1
    ptype = l.get("type", "GroupLayer")
    ptype_map = {"BoneLayer": "bone_container", "SwitchLayer": "switch",
                 "MeshLayer": "mesh", "ImageLayer": "image",
                 "GroupLayer": "group"}
    part = Part(
        id=f"part_{counter[0]}_{l.get('name', 'unnamed').replace(' ', '_')}",
        name=l.get("name", ""),
        type=ptype_map.get(ptype, "group"),
        parent=parent_id,
        z_order=counter[0],
        visible=l.get("visible", True),
        origin=(l.get("origin", {}).get("x", 0.0), l.get("origin", {}).get("y", 0.0)),
        masking=l.get("masking", 0),
        group_mask=l.get("group_mask", 0),
        blend_mode=l.get("blend_mode", 0),
    )
    pb = l.get("parent_bone", -1)
    part.parent_bone_raw = pb if pb is not None else -1
    if pb is not None and pb >= 0:
        part.bone = bone_names.get(pb)
    tr = l.get("transforms", {})
    part.transforms = {k: _channel_from_dict(v) for k, v in tr.items()
                       if isinstance(v, dict) and "when" in v}
    if ptype == "MeshLayer":
        part.geometry_raw = l.get("mesh")
    if ptype == "SwitchLayer":
        part.switch_states = [c.get("name", "") for c in l.get("layers", [])]
        if isinstance(l.get("switch_keys"), dict) and "when" in l["switch_keys"]:
            part.switch_channel = _channel_from_dict(l["switch_keys"])
            acts = l["switch_keys"].get("actions")
            if isinstance(acts, list) and acts:
                part.switch_dial_actions = acts
    if ptype == "ImageLayer":
        part.image_ref = l.get("fileref") or l.get("image_path")
    for child in l.get("layers", []):
        part.children.append(_layer_to_part(child, bone_names, counter, part.id))
    if ptype == "SwitchLayer":
        for c in part.children:
            c.parent = part.id
    return part


def extract(doc: dict) -> Rig:
    header = {"mime_type": doc.get("mime_type", _MIME),
              "version": doc.get("version"),
              "major_version": doc.get("major_version"),
              "rev_version": doc.get("rev_version"),
              "doc_uuid": doc.get("doc_uuid"),
              "comment": doc.get("comment", "")}
    bones: list[Bone] = []
    bone_names: dict[int, str] = {}
    binding_mode = None
    skeleton_groups_raw: list = []
    for layer in doc.get("layers", []):
        sk = layer.get("skeleton")
        if not sk:
            continue
        binding_mode = sk.get("binding_mode", 1)
        bg = sk.get("bones_groups")
        if bg:
            skeleton_groups_raw.extend(bg)
        for i, b in enumerate(sk.get("bones", [])):
            bone_names[i] = b.get("name") or _default_bone_name(i)
        for i, b in enumerate(sk.get("bones", [])):
            bones.append(_bone_from_dict(i, b, bone_names))
        break
    _detect_flexi_pairs(bones)
    counter = [0]
    root_parts = [_layer_to_part(l, bone_names, counter, None)
                  for l in doc.get("layers", [])]
    _, dial_links = _detect_head_turns(root_parts, bones)
    animated = {}
    for k, v in doc.get("animated_values", {}).items():
        if isinstance(v, dict) and "when" in v:
            animated[k] = _channel_from_dict(v)
    return Rig(
        name=doc.get("comment") or "character",
        source_program="moho",
        source_version=str(doc.get("version", "")),
        canvas=header,
        bones=bones,
        root_parts=root_parts,
        dial_links=dial_links,
        extras={"binding_mode": binding_mode if binding_mode is not None else 1,
                "bones_groups": skeleton_groups_raw or None,
                "animatedValues": {k: c.to_dict() for k, c in animated.items()},
                "styles": doc.get("styles"),
                "metadata": doc.get("metadata"),
                "project_data": doc.get("project_data"),
                "thumbnail": doc.get("thumbnail"),
                "layercomps": doc.get("layercomps"),
                "documentviewstate": doc.get("documentviewstate")},
    )


def extract_from_file(path: str) -> Rig:
    doc, _ = load_mohoproj(path)
    return extract(doc)
