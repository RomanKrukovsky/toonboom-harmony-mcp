"""Сборка .moho файла из PIR по шаблонам живых Moho-документов."""
from __future__ import annotations

import copy
import datetime
import io
import json
import uuid
import zipfile
from pathlib import Path

from PIL import Image

from ..pir.schema import Channel, Part, Rig

_TPL_DIR = Path(__file__).parent / "templates"


def _load_tpl(name: str) -> dict:
    return json.loads((_TPL_DIR / name).read_text())


def _channel_dict(c: Channel) -> dict:
    return {"type": c.type, "ref": False, "mute": False,
            "when": list(c.when), "val": list(c.val), "interp": list(c.interp)}


_DEFAULT_INTERP = [{"im": 1, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0, "s": False, "t": 0}]


def _bone_dict(rig: Rig) -> list[dict]:
    tpl = _load_tpl("_bone.json")
    name_to_idx = {b.id: i for i, b in enumerate(rig.bones)}
    out = []
    for b in rig.bones:
        d = copy.deepcopy(tpl)
        d["name"] = b.id
        d["parent"] = name_to_idx.get(b.parent, -1) if b.parent else -1
        d["length"] = b.length
        d["strength"] = b.strength
        d["constraints"] = b.constraints
        d["min_constraint"] = b.min_constraint
        d["max_constraint"] = b.max_constraint
        if b.hidden:
            d["hidden"] = True
        if b.shy:
            d["shy"] = True
        if b.ignored_by_ik:
            d["ignored_by_ik"] = True
        if b.target_bone:
            tidx = name_to_idx.get(b.target_bone, -1)
            d["target_bone"] = {"type": "Val", "ref": False, "mute": False,
                                "when": [0], "val": [float(tidx)],
                                "interp": [dict(_DEFAULT_INTERP[0])]}
        if b.ik_lock:
            d["ik_lock"] = {"type": "Bool", "ref": False, "mute": False,
                            "when": [0], "val": [True],
                            "interp": [dict(_DEFAULT_INTERP[0])]}
        d["offset"] = {"x": b.offset_x, "y": b.offset_y}
        if b.anim_parent_raw is not None:
            d["anim_parent"] = copy.deepcopy(b.anim_parent_raw)
        else:
            pidx = name_to_idx.get(b.parent, -1) if b.parent else -1
            d["anim_parent"] = {"type": "Val", "ref": False, "mute": False,
                                "when": [0], "val": [float(pidx)],
                                "interp": [dict(_DEFAULT_INTERP[0])]}
        if b.pos_channel is not None:
            d["anim_pos"] = _channel_dict(b.pos_channel)
        elif b.pos_keys:
            d["anim_pos"] = _channel_dict(Channel(
                type="Vec2", when=[f for f, _, _ in b.pos_keys],
                val=[{"x": x, "y": y} for _, x, y in b.pos_keys],
                interp=[dict(_DEFAULT_INTERP[0]) for _ in b.pos_keys]))
        else:
            d["anim_pos"] = _channel_dict(Channel(
                type="Vec2", when=[0], val=[{"x": b.position[0], "y": b.position[1]}],
                interp=[dict(_DEFAULT_INTERP[0])]))
        if b.angle_channel is not None:
            ch = _channel_dict(b.angle_channel)
            if b.dial_actions:
                ch["actions"] = copy.deepcopy(b.dial_actions)
            d["anim_angle"] = ch
        elif b.dial_actions:
            ch = _channel_dict(Channel(
                type="Val", when=[0], val=[b.angle],
                interp=[{"im": 3, "v1": -1.0, "v2": -1.0, "in": 1,
                         "h": 0, "s": False, "t": 0}]))
            ch["actions"] = copy.deepcopy(b.dial_actions)
            d["anim_angle"] = ch
        elif b.angle_keys:
            d["anim_angle"] = _channel_dict(Channel(
                type="Val", when=[f for f, _ in b.angle_keys],
                val=[a for _, a in b.angle_keys],
                interp=[dict(_DEFAULT_INTERP[0]) for _ in b.angle_keys]))
        else:
            d["anim_angle"] = _channel_dict(Channel(
                type="Val", when=[0], val=[b.angle],
                interp=[dict(_DEFAULT_INTERP[0])]))
        if b.pos_channel_raw is not None:
            d["anim_pos"] = copy.deepcopy(b.pos_channel_raw)
        if b.scale_channel_raw is not None:
            d["anim_scale"] = copy.deepcopy(b.scale_channel_raw)
        for k, v in (b.extra_channels_raw or {}).items():
            d[k] = copy.deepcopy(v)
        out.append(d)
    return out


def _part_layer(part: Part, name_to_idx: dict[str, int]) -> dict:
    tpl_name = {"bone_container": "BoneLayer.json", "switch": "SwitchLayer.json",
                "mesh": "MeshLayer.json", "image": "ImageLayer.json",
                "group": "GroupLayer.json"}.get(part.type)
    if tpl_name is None:
        raise ValueError(f"unknown part type: {part.type}")
    layer = _load_tpl(tpl_name)
    layer["name"] = part.name
    layer["visible"] = part.visible
    layer["origin"] = {"x": part.origin[0], "y": part.origin[1]}
    layer["parent_bone"] = (name_to_idx.get(part.bone, -1) if part.bone
                            else part.parent_bone_raw)
    layer["uuid"] = str(uuid.uuid4())
    layer["random_num"] = 0
    layer["masking"] = part.masking
    if "group_mask" in layer:
        layer["group_mask"] = part.group_mask
    if part.blend_mode:
        layer["blend_mode"] = part.blend_mode

    if part.type == "image" and part.image_ref:
        _configure_image_layer(layer, part.image_ref)
    if part.transforms:
        layer["transforms"] = {k: _channel_dict(v) for k, v in part.transforms.items()}
    if part.type == "mesh":
        if part.geometry_raw:
            m = copy.deepcopy(part.geometry_raw)
            # Если parent_bone у точек указан как имя кости, сопоставляем с индексом
            for pt in m.get("points", []):
                if isinstance(pt.get("parent"), str):
                    pt["parent"] = name_to_idx.get(pt["parent"], -1)
            layer["mesh"] = m
        else:
            layer["mesh"] = {
                "type": "Mesh", "points": [], "curves": [], "shapes": [],
                "groups": [], "shape_order": [], "next_shape_id": 0,
                "anim_shape_order": {"type": "Int", "ref": False, "mute": False,
                                     "when": [0], "val": [0], "interp": []},
                "curve_interpretation": 0}
    if part.type == "switch":
        if part.switch_channel is not None:
            ch = _channel_dict(part.switch_channel)
            if part.switch_dial_actions:
                ch["actions"] = copy.deepcopy(part.switch_dial_actions)
            layer["switch_keys"] = ch
        else:
            layer["switch_keys"] = {
                "type": "String", "ref": False, "mute": False, "when": [0],
                "val": [part.switch_states[0] if part.switch_states else ""],
                "interp": [dict(_DEFAULT_INTERP[0])]}
        layer["layers"] = [_part_layer(c, name_to_idx) for c in part.children]
    elif part.type in ("group", "bone_container"):
        layer["layers"] = [_part_layer(c, name_to_idx) for c in part.children]
        if part.type == "bone_container" and part.children:
            pass
    return layer


def _configure_image_layer(layer: dict, image_ref: str) -> None:
    path = Path(image_ref)
    layer["image_path"] = image_ref
    layer["image_fileref"] = {
        "relativeTo": "Absolute" if path.is_absolute() else "Project",
        "path": image_ref,
    }
    if path.suffix.lower() != ".psd":
        for key in ("psd_layer", "psd_layer_identifier", "psd_trim_alpha",
                    "psd_layer_translation"):
            layer.pop(key, None)
        layer["psd_layerid"] = -2
        layer["psd_layer_bounds"] = {
            "top": 0,
            "left": 0,
            "right": 0,
            "bottom": 0,
        }
        layer["distortion_layer_uuid"] = ""
    if path.is_file():
        with Image.open(path) as image:
            width, height = image.size
        layer["width"] = width / 72.0
        layer["height"] = height / 72.0
        layer["modification_date"] = int(path.stat().st_mtime)


_DOUBLE_KEYS = {"x", "y", "z", "v1", "v2", "length", "strength", "angle",
                "min_constraint", "max_constraint", "width", "height",
                "noise_amp", "noise_interval", "noise_scale"}


def _norm_float(v: float) -> float:
    if isinstance(v, bool):
        return v
    if abs(v) < 1e-12:
        return 0.0
    r = round(v, 10)
    return r


def _coerce_doubles(obj, in_val=False, channel_type=None):
    """Moho требует double в геометрии/каналах и НЕ принимает научную
    нотацию. int → float, хвосты-нулями → 0.0, всё округлено."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in _DOUBLE_KEYS:
                if isinstance(v, int) and not isinstance(v, bool):
                    out[k] = float(v)
                elif isinstance(v, float):
                    out[k] = _norm_float(v)
                else:
                    out[k] = v
            elif k == "val" and isinstance(v, list):
                out[k] = _coerce_val_list(v, obj.get("type"))
            else:
                out[k] = _coerce_doubles(v)
        return out
    if isinstance(obj, list):
        return [_coerce_doubles(v) for v in obj]
    return obj


def _coerce_val_list(vals, channel_type):
    if channel_type in ("String", "Int"):
        return list(vals)
    out = []
    for v in vals:
        if isinstance(v, bool):
            out.append(v)
        elif isinstance(v, int):
            out.append(float(v))
        elif isinstance(v, float):
            out.append(_norm_float(v))
        elif isinstance(v, dict):
            out.append(_coerce_doubles(v))
        else:
            out.append(v)
    return out


def build_doc(rig: Rig) -> dict:
    doc = _load_tpl("_doc_skeleton.json")
    doc["mime_type"] = "application/x-vnd.lm_mohodoc"
    doc["comment"] = rig.name
    doc["doc_uuid"] = str(uuid.uuid4())
    now = datetime.datetime.now().ctime()
    doc["created_date"] = now
    doc["modified_date"] = now
    if rig.canvas.get("version") is not None:
        doc["version"] = rig.canvas["version"]
    if rig.canvas.get("major_version") is not None:
        doc["major_version"] = rig.canvas["major_version"]
    if rig.canvas.get("rev_version") is not None:
        doc["rev_version"] = rig.canvas["rev_version"]
    if rig.extras.get("styles") is not None:
        doc["styles"] = copy.deepcopy(rig.extras["styles"])
    if rig.extras.get("project_data") is not None:
        doc["project_data"] = copy.deepcopy(rig.extras["project_data"])
    if rig.extras.get("metadata") is not None:
        doc["metadata"] = copy.deepcopy(rig.extras["metadata"])
    if rig.extras.get("layercomps") is not None:
        doc["layercomps"] = copy.deepcopy(rig.extras["layercomps"])
    doc["animated_values"] = {}
    for k, v in rig.extras.get("animatedValues", {}).items():
        doc["animated_values"][k] = _channel_dict(Channel(
            type=v.get("type", "Val"), when=v.get("when", []),
            val=v.get("val", []), interp=v.get("interp", [])))
    doc["animated_values"].setdefault("timeline_markers", {
        "type": "TimelineMarkers", "ref": False, "mute": False,
        "when": [], "val": [], "interp": []})
    doc["layers"] = []
    name_to_idx = {b.id: i for i, b in enumerate(rig.bones)}
    for part in rig.root_parts:
        layer = _part_layer(part, name_to_idx)
        if part.type == "bone_container":
            skel = {"type": "Skeleton",
                    "binding_mode": rig.extras.get("binding_mode", 1),
                    "bones": _bone_dict(rig)}
            bg = rig.extras.get("bones_groups")
            if bg:
                skel["bones_groups"] = copy.deepcopy(bg)
            layer["skeleton"] = skel
            actions = getattr(part, "actions_raw", None) or rig.extras.get("actions")
            if actions:
                layer["actions"] = copy.deepcopy(actions)
        doc["layers"].append(layer)
    doc = _coerce_doubles(doc)
    # project_data.width/height — нативные ЦЕЛЫЕ числа (число кадров/пиксели),
    # коэрсер превратил их в float; вернуть int, иначе typed-парсер откажет.
    if isinstance(doc.get("project_data"), dict):
        for field in ("width", "height"):
            v = doc["project_data"].get(field)
            if isinstance(v, float) and v.is_integer():
                doc["project_data"][field] = int(v)
    return doc


def _preview_bytes(doc: dict) -> bytes | None:
    """Сгенерировать preview.jpg из первого ImageLayer или синтезировать из меша."""
    try:
        from PIL import Image, ImageDraw
    except Exception:
        return None

    def first_image(layers):
        for l in layers:
            if l.get("type") == "ImageLayer":
                ref = l.get("image_fileref", {}).get("path") or l.get("image_path")
                if ref:
                    p = Path(ref)
                    if not p.is_absolute():
                        p = Path(__file__).parent.parent.parent / p
                    if p.exists():
                        return Image.open(p).convert("RGB")
            r = first_image(l.get("layers", []))
            if r is not None:
                return r
        return None

    img = first_image(doc.get("layers", []))
    if img is None:
        # Для векторного рига создаём чистый превью холст
        img = Image.new("RGB", (240, 360), (235, 238, 242))
        d = ImageDraw.Draw(img)
        # Силуэт персонажа для превью
        d.ellipse([95, 40, 145, 95], fill=(242, 200, 170), outline=(34, 28, 24), width=2)
        d.rectangle([80, 95, 160, 200], fill=(64, 108, 168), outline=(34, 28, 24), width=2)
        d.rectangle([90, 200, 120, 310], fill=(52, 56, 68), outline=(34, 28, 24), width=2)
        d.rectangle([130, 200, 160, 310], fill=(52, 56, 68), outline=(34, 28, 24), width=2)
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=80)
        return buf.getvalue()

    buf = io.BytesIO()
    img.thumbnail((240, 360))
    img.save(buf, "JPEG", quality=80)
    return buf.getvalue()


def emit(rig: Rig, out_path: str) -> str:
    doc = build_doc(rig)
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("Project.mohoproj", json.dumps(doc))
        pv = _preview_bytes(doc)
        if pv:
            z.writestr("preview.jpg", pv)
    return str(out)
