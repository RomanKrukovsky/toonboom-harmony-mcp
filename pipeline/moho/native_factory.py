"""Factories that clone schemas from documents saved by real Moho."""

from __future__ import annotations

import copy
import uuid
from pathlib import Path
from typing import Any

from .extract import load_mohoproj


REPO = Path(__file__).resolve().parents[2]
DEFAULT_MESH_REFERENCE = REPO / "fixtures/moho_reference/mouth_switch.moho"
CHANNEL_INTERP = {
    "im": 1,
    "v1": 0.1,
    "v2": 0.5,
    "in": 1,
    "h": 0,
    "s": False,
    "t": 0,
}

MESH_KEYS = (
    "type",
    "curve_interpretation",
    "next_shape_id",
)
POINT_KEYS = (
    "type",
    "position",
    "width",
    "parent",
    "selected",
    "colored",
    "color",
    "color_strength",
    "curves",
)
CURVE_KEYS = (
    "type",
    "num_points",
    "closed",
    "profile_layer_uuid",
    "profile_curve_id",
    "profile_repeat",
    "start_percent",
    "end_percent",
)
CURVE_POINT_KEYS = (
    "point",
    "segments_on",
    "smoothness",
    "weight_in",
    "weight_out",
    "offset_in",
    "offset_out",
)
SHAPE_KEYS = (
    "type",
    "name",
    "id",
    "selected",
    "has_fill",
    "has_outline",
    "fill_allowed",
    "effect_scale",
    "effect_rotation",
    "effect_offset",
    "3d_thickness",
    "edges",
    "inherited_style_name",
    "inherited_style2_name",
)
STYLE_KEYS = (
    "type",
    "name",
    "uuid",
    "define_fill_color",
    "fill_color",
    "define_line_width",
    "line_width",
    "define_line_col",
    "line_color",
    "line_caps",
    "brush_name",
    "brush_align",
    "brush_jitter",
    "brush_spacing",
    "brush_angle_drift",
    "brush_randomize",
    "brush_merged_alpha",
    "brush_tint",
    "brush_rand_order",
)


def _keep(source: dict[str, Any], keys: tuple[str, ...]) -> dict[str, Any]:
    return {
        key: copy.deepcopy(source[key])
        for key in keys
        if key in source
    }


def _shape_order_channel(shapes: list[dict[str, Any]]) -> dict[str, Any]:
    order = "|".join(str(shape.get("id", index))
                     for index, shape in enumerate(shapes))
    return {
        "type": "String",
        "ref": False,
        "mute": False,
        "when": [0],
        "val": [order],
        "interp": [dict(CHANNEL_INTERP)],
    }


def normalize_native_mesh(raw_mesh: dict[str, Any]) -> dict[str, Any]:
    """Keep only the Mesh schema accepted by the bundled native references."""
    raw_points = raw_mesh.get("points", [])
    raw_curves = raw_mesh.get("curves", [])
    raw_shapes = raw_mesh.get("shapes", [])

    mesh = _keep(raw_mesh, MESH_KEYS)
    mesh.setdefault("type", "Mesh")
    mesh.setdefault("curve_interpretation", 0)
    mesh["next_shape_id"] = int(raw_mesh.get("next_shape_id", len(raw_shapes)))
    mesh["anim_shape_order"] = False
    mesh["shape_order"] = _shape_order_channel(raw_shapes)
    mesh["points"] = [_keep(point, POINT_KEYS) for point in raw_points]

    curves = []
    for raw_curve in raw_curves:
        curve = _keep(raw_curve, CURVE_KEYS)
        curve["num_points"] = len(raw_curve.get("points", []))
        curve["points"] = [
            _keep(curve_point, CURVE_POINT_KEYS)
            for curve_point in raw_curve.get("points", [])
        ]
        curves.append(curve)
    mesh["curves"] = curves

    shapes = []
    for raw_shape in raw_shapes:
        shape = _keep(raw_shape, SHAPE_KEYS)
        shape.setdefault("inherited_style_name", "")
        shape.setdefault("inherited_style2_name", "")
        shape["style"] = _keep(raw_shape.get("style", {}), STYLE_KEYS)
        shapes.append(shape)
    mesh["shapes"] = shapes
    mesh["groups"] = copy.deepcopy(raw_mesh.get("groups", []))
    return mesh


def _walk_layers(layers: list[dict[str, Any]]):
    for layer in layers:
        yield layer
        yield from _walk_layers(layer.get("layers", []))


def _find_first_layer(document: dict[str, Any], layer_type: str) -> dict[str, Any]:
    for layer in _walk_layers(document.get("layers", [])):
        if layer.get("type") == layer_type:
            return layer
    raise ValueError(f"native reference has no {layer_type}")


def first_schema_difference(reference: Any, candidate: Any, path: str = "$") -> str | None:
    """Return the first key/type mismatch while ignoring concrete values."""
    if type(reference) is not type(candidate):
        return f"{path}: expected {type(reference).__name__}, got {type(candidate).__name__}"
    if isinstance(reference, dict):
        reference_keys = set(reference)
        candidate_keys = set(candidate)
        if reference_keys != candidate_keys:
            missing = sorted(reference_keys - candidate_keys)
            extra = sorted(candidate_keys - reference_keys)
            return f"{path}: missing={missing}, extra={extra}"
        for key in reference:
            difference = first_schema_difference(
                reference[key],
                candidate[key],
                f"{path}.{key}",
            )
            if difference:
                return difference
    elif isinstance(reference, list) and reference and candidate:
        return first_schema_difference(reference[0], candidate[0], f"{path}[0]")
    return None


class NativeMohoFactory:
    """Create layer objects from a schema saved by real Moho."""

    def __init__(self, reference_path: Path = DEFAULT_MESH_REFERENCE) -> None:
        self.reference_path = Path(reference_path)
        document, _ = load_mohoproj(str(self.reference_path))
        self.mesh_layer_template = _find_first_layer(document, "MeshLayer")
        self.mesh_schema_template = self.mesh_layer_template["mesh"]

    def mesh_layer(
        self,
        name: str,
        mesh: dict[str, Any],
        parent_bone: int,
    ) -> dict[str, Any]:
        layer = copy.deepcopy(self.mesh_layer_template)
        layer["name"] = name
        layer["uuid"] = str(uuid.uuid4())
        layer["parent_bone"] = int(parent_bone)
        layer["random_num"] = 0
        layer["flexi_bone_subset"] = ""
        layer["follow_layer_uuid"] = ""
        layer["distortion_layer_uuid"] = ""
        layer["layer_ref_uuid"] = ""
        layer["layer_ref_path"] = ""
        layer["layer_ref_fileref"] = {"relativeTo": "Absolute", "path": ""}
        layer["mesh"] = normalize_native_mesh(mesh)
        return layer

    def mesh_schema_difference(self, mesh: dict[str, Any]) -> str | None:
        return first_schema_difference(
            self.mesh_schema_template,
            normalize_native_mesh(mesh),
        )
