"""PIR v1 — промежуточное описание рига, независимое от программы.

Источник формата: docs/rig_standard/MOHO_PRODUCTION_RIG_STANDARD_V1.md.
Изменения относительно v0.1:
- Bone.is_dial, Bone.is_flexi_endpoint, Bone.flexi_pair
- Part.is_head_turn, Part.head_turn_views
- Rig.dial_links (глобальный список связей диал→свитч для валидатора)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

PIR_VERSION = "1.0"


@dataclass
class Bone:
    id: str
    parent: Optional[str]
    position: tuple[float, float]
    angle: float
    length: float
    strength: float = 1.0
    constraints: bool = False
    min_constraint: float = 0.0
    max_constraint: float = 0.0
    angle_keys: Optional[list[tuple[int, float]]] = None  # [(frame, rad), ...]
    pos_keys: Optional[list[tuple[int, float, float]]] = None  # [(frame, x, y), ...]
    angle_channel: Optional[Channel] = None  # дословный канал из источника
    pos_channel: Optional[Channel] = None
    pos_channel_raw: Optional[dict] = None  # anim_pos дословно (с экшенами)
    scale_channel_raw: Optional[dict] = None  # anim_scale дословно (с экшенами)
    extra_channels_raw: dict[str, dict] = field(default_factory=dict)
    # v1.1: поля кости, дословно сохраняемые для фиделити
    anim_parent_raw: Optional[dict] = None  # канал anim_parent (иерархия)
    offset_x: float = 0.0
    offset_y: float = 0.0
    # прочие анимированные каналы кости дословно (active_bone и т.п.)
    dial_actions: Optional[list[dict]] = None  # смарт-кость: позы диала
    # v1: распознанные свойства
    is_dial: bool = False  # есть dial_actions
    is_flexi_endpoint: bool = False  # входит в пару start/end кривого деформера
    flexi_pair: Optional[str] = None  # id парной кости (start↔end)
    flexi_chain: Optional[str] = None  # имя цепочки (напр. "Forearm R")
    hidden: bool = False
    shy: bool = False
    ignored_by_ik: bool = False
    target_bone: Optional[str] = None  # id целевой кости IK
    ik_lock: bool = False


@dataclass
class Channel:
    """Анимируемый канал: кадры -> значения."""
    type: str
    when: list[int]
    val: list[Any]
    interp: list[Any] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = {"type": self.type, "ref": False, "mute": False,
             "when": self.when, "val": self.val, "interp": self.interp}
        return d


@dataclass
class Part:
    """Часть персонажа: mesh, image или switch."""
    id: str
    name: str
    type: str  # mesh | image | switch | group | bone_container
    parent: Optional[str] = None
    bone: Optional[str] = None
    parent_bone_raw: int = -1
    z_order: int = 0
    visible: bool = True
    transforms: dict[str, Channel] = field(default_factory=dict)
    origin: tuple[float, float] = (0.0, 0.0)
    geometry_raw: Optional[dict] = None  # дословная геометрия для round-trip
    children: list["Part"] = field(default_factory=list)
    switch_states: list[str] = field(default_factory=list)
    switch_channel: Optional[Channel] = None
    switch_dial_actions: Optional[list[dict]] = None  # связь с диалами
    image_ref: Optional[str] = None
    # v1: распознанные свойства
    is_head_turn: bool = False  # SwitchLayer управляется Head Switch
    head_turn_views: list[str] = field(default_factory=list)  # стандартные виды
    mask_layer_id: Optional[str] = None  # какой слой маскирует эту часть
    masking: int = 0  # 0=нет, 1=mask this layer, 2=don't mask / mask+visible, 5=clear+add, 6=exclude stroke
    group_mask: int = 0  # 0=нет, 1=reveal all, 2=hide all
    blend_mode: int = 0


@dataclass
class DialLink:
    """Связь диал→свитч (по имени action)."""
    dial_bone_id: str
    dial_action_name: str
    switch_part_id: str
    switch_state_name: str
    pose_when: list[int]  # кадры (when у диала) — какие углы
    pose_val: list[Any]   # значения (val у диала)
    switch_when: list[int]  # кадры у свитча — какие состояния
    switch_val: list[Any]   # значения у свитча (имена состояний)


@dataclass
class Rig:
    name: str
    source_program: str  # moho | harmony
    source_version: str
    canvas: dict[str, Any]
    bones: list[Bone] = field(default_factory=list)
    root_parts: list[Part] = field(default_factory=list)
    dial_links: list[DialLink] = field(default_factory=list)  # v1: глобальный список связей
    extras: dict[str, Any] = field(default_factory=dict)

    def bone_by_id(self, bone_id: str) -> Optional[Bone]:
        for b in self.bones:
            if b.id == bone_id:
                return b
        return None

    def walk_parts(self):
        def rec(parts):
            for p in parts:
                yield p
                yield from rec(p.children)
        yield from rec(self.root_parts)

    def to_dict(self) -> dict:
        return {
            "pirVersion": PIR_VERSION,
            "character": {"name": self.name,
                          "sourceProgram": self.source_program,
                          "sourceVersion": self.source_version},
            "canvas": self.canvas,
            "skeleton": {"bones": [_bone_to_dict(b) for b in self.bones]},
            "parts": [_part_to_dict(p) for p in self.root_parts],
            "dialLinks": [{"dialBoneId": d.dial_bone_id,
                           "dialActionName": d.dial_action_name,
                           "switchPartId": d.switch_part_id,
                           "switchStateName": d.switch_state_name,
                           "poseWhen": d.pose_when, "poseVal": d.pose_val,
                           "switchWhen": d.switch_when, "switchVal": d.switch_val}
                          for d in self.dial_links],
            "extras": self.extras,
        }


def _channel_to_dict(c: Channel) -> dict:
    return c.to_dict()


def _bone_to_dict(b: Bone) -> dict:
    d = {
        "id": b.id, "parent": b.parent,
        "position": {"x": b.position[0], "y": b.position[1]},
        "angle": b.angle, "length": b.length, "strength": b.strength,
        "constraints": b.constraints,
        "minConstraint": b.min_constraint, "maxConstraint": b.max_constraint,
        "isDial": b.is_dial,
        "isFlexiEndpoint": b.is_flexi_endpoint,
        "hidden": b.hidden,
        "shy": b.shy,
        "ignoredByIk": b.ignored_by_ik,
        "targetBone": b.target_bone,
        "ikLock": b.ik_lock,
    }
    if b.flexi_pair:
        d["flexiPair"] = b.flexi_pair
    if b.flexi_chain:
        d["flexiChain"] = b.flexi_chain
    if b.angle_keys:
        d["angleKeys"] = [{"frame": f, "angle": a} for f, a in b.angle_keys]
    if b.pos_keys:
        d["posKeys"] = [{"frame": f, "x": x, "y": y} for f, x, y in b.pos_keys]
    if b.dial_actions:
        d["dialActions"] = b.dial_actions
    if b.pos_channel_raw is not None:
        d["posChannelRaw"] = b.pos_channel_raw
    if b.scale_channel_raw is not None:
        d["scaleChannelRaw"] = b.scale_channel_raw
    if b.anim_parent_raw is not None:
        d["animParentRaw"] = b.anim_parent_raw
    d["offset"] = {"x": b.offset_x, "y": b.offset_y}
    if b.extra_channels_raw:
        d["extraChannelsRaw"] = b.extra_channels_raw
    return d


def _part_to_dict(p: Part) -> dict:
    d = {
        "id": p.id, "name": p.name, "type": p.type,
        "parent": p.parent, "bone": p.bone,
        "parentBoneRaw": p.parent_bone_raw,
        "zOrder": p.z_order,
        "visible": p.visible,
        "origin": {"x": p.origin[0], "y": p.origin[1]},
    }
    if p.is_head_turn:
        d["isHeadTurn"] = True
    if p.head_turn_views:
        d["headTurnViews"] = p.head_turn_views
    if p.mask_layer_id:
        d["maskLayerId"] = p.mask_layer_id
    if p.masking:
        d["masking"] = p.masking
    if p.group_mask:
        d["groupMask"] = p.group_mask
    if p.blend_mode:
        d["blendMode"] = p.blend_mode
    if p.transforms:
        d["transforms"] = {k: _channel_to_dict(v) for k, v in p.transforms.items()}
    if p.geometry_raw is not None:
        d["geometryRaw"] = p.geometry_raw
    if p.children:
        d["children"] = [_part_to_dict(c) for c in p.children]
    if p.switch_states:
        d["switchStates"] = p.switch_states
    if p.switch_channel is not None:
        d["switchChannel"] = _channel_to_dict(p.switch_channel)
    if p.switch_dial_actions:
        d["switchDialActions"] = p.switch_dial_actions
    if p.image_ref:
        d["imageRef"] = p.image_ref
    return d


def load_from_dict(d: dict) -> Rig:
    """Загрузить Rig из PIR v1 dict."""
    char = d.get("character", {})
    rig = Rig(
        name=char.get("name", "character"),
        source_program=char.get("sourceProgram", "moho"),
        source_version=char.get("sourceVersion", ""),
        canvas=d.get("canvas", {}),
        extras=d.get("extras", {}),
    )
    # bones
    for bd in d.get("skeleton", {}).get("bones", []):
        bone = Bone(
            id=bd["id"],
            parent=bd.get("parent"),
            position=(bd["position"]["x"], bd["position"]["y"]),
            angle=bd.get("angle", 0.0),
            length=bd.get("length", 0.0),
            strength=bd.get("strength", 1.0),
            constraints=bd.get("constraints", False),
            min_constraint=bd.get("minConstraint", 0.0),
            max_constraint=bd.get("maxConstraint", 0.0),
            is_dial=bd.get("isDial", False),
            is_flexi_endpoint=bd.get("isFlexiEndpoint", False),
            flexi_pair=bd.get("flexiPair"),
            flexi_chain=bd.get("flexiChain"),
            hidden=bd.get("hidden", False),
            shy=bd.get("shy", False),
            ignored_by_ik=bd.get("ignoredByIk", False),
            target_bone=bd.get("targetBone"),
            ik_lock=bd.get("ikLock", False),
            dial_actions=bd.get("dialActions"),
            pos_channel_raw=bd.get("posChannelRaw"),
            scale_channel_raw=bd.get("scaleChannelRaw"),
            anim_parent_raw=bd.get("animParentRaw"),
            offset_x=(bd.get("offset") or {}).get("x", 0.0),
            offset_y=(bd.get("offset") or {}).get("y", 0.0),
            extra_channels_raw=bd.get("extraChannelsRaw") or {},
        )
        if "angleKeys" in bd:
            bone.angle_keys = [(k["frame"], k["angle"]) for k in bd["angleKeys"]]
        if "posKeys" in bd:
            bone.pos_keys = [(k["frame"], k["x"], k["y"]) for k in bd["posKeys"]]
        rig.bones.append(bone)
    # parts
    def load_part(pd: dict) -> Part:
        part = Part(
            id=pd["id"],
            name=pd.get("name", ""),
            type=pd.get("type", "group"),
            parent=pd.get("parent"),
            bone=pd.get("bone"),
            parent_bone_raw=pd.get("parentBoneRaw", -1),
            z_order=pd.get("zOrder", 0),
            visible=pd.get("visible", True),
            origin=(pd.get("origin", {}).get("x", 0.0), pd.get("origin", {}).get("y", 0.0)),
            is_head_turn=pd.get("isHeadTurn", False),
            head_turn_views=pd.get("headTurnViews", []),
            mask_layer_id=pd.get("maskLayerId"),
            masking=pd.get("masking", 0),
            group_mask=pd.get("groupMask", 0),
            blend_mode=pd.get("blendMode", 0),
            geometry_raw=pd.get("geometryRaw"),
            image_ref=pd.get("imageRef"),
            switch_states=pd.get("switchStates", []),
        )
        if "transforms" in pd:
            for k, v in pd["transforms"].items():
                part.transforms[k] = Channel(
                    type=v.get("type", "Val"),
                    when=v.get("when", []),
                    val=v.get("val", []),
                    interp=v.get("interp", []),
                )
        if "switchChannel" in pd:
            v = pd["switchChannel"]
            part.switch_channel = Channel(
                type=v.get("type", "String"),
                when=v.get("when", []),
                val=v.get("val", []),
                interp=v.get("interp", []),
            )
        if "switchDialActions" in pd:
            part.switch_dial_actions = pd["switchDialActions"]
        if "children" in pd:
            part.children = [load_part(c) for c in pd["children"]]
        return part
    for pd in d.get("parts", []):
        rig.root_parts.append(load_part(pd))
    # dial links
    for ld in d.get("dialLinks", []):
        rig.dial_links.append(DialLink(
            dial_bone_id=ld.get("dialBoneId", ""),
            dial_action_name=ld.get("dialActionName", ""),
            switch_part_id=ld.get("switchPartId", ""),
            switch_state_name=ld.get("switchStateName", ""),
            pose_when=ld.get("poseWhen", []),
            pose_val=ld.get("poseVal", []),
            switch_when=ld.get("switchWhen", []),
            switch_val=ld.get("switchVal", []),
        ))
    return rig


def load_from_file(path: str) -> Rig:
    import json
    return load_from_dict(json.loads(Path(path).read_text()))
