"""Declarative topology specification for non-standard rig hierarchies.

Replaces the hard-coded JOINTS / BONE_TREE in skeleton.py with a
data-driven description that an LLM (or a human) can write. Every
non-biped rig - tails, wings, six-fingered hands, asymmetric bodies,
quadrupeds, capes - is one topology_spec away from a real Moho .moho.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class BoneSpec:
    """Declarative bone. parent_id may be None for root bones."""
    id: str
    parent_id: Optional[str] = None
    # position in canvas pixels (origin top-left, y-down)
    px: float = 0.0
    py: float = 0.0
    length: float = 0.0
    # angle in radians
    angle: float = 0.0
    strength: float = 1.0
    hidden: bool = False
    shy: bool = False
    ignored_by_ik: bool = False
    # IK constraint
    ik_target: Optional[str] = None
    ik_min: float = 0.0
    ik_max: float = 0.0
    is_dial: bool = False
    # secondary motion: this bone inherits from dynamics
    dynamic: bool = False
    # root_joint and tip_joint are pixel coordinates used to derive
    # position/angle; if absent, px/py + length/angle are taken directly.
    root_joint: Optional[str] = None
    tip_joint: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "id": self.id,
            "parent": self.parent_id,
            "px": self.px,
            "py": self.py,
            "length": self.length,
            "angle": self.angle,
            "strength": self.strength,
        }
        if self.hidden:
            d["hidden"] = True
        if self.shy:
            d["shy"] = True
        if self.ignored_by_ik:
            d["ignoredByIk"] = True
        if self.ik_target:
            d["ikTarget"] = self.ik_target
            d["ikMin"] = self.ik_min
            d["ikMax"] = self.ik_max
        if self.is_dial:
            d["isDial"] = True
        if self.dynamic:
            d["dynamic"] = True
        if self.root_joint:
            d["rootJoint"] = self.root_joint
        if self.tip_joint:
            d["tipJoint"] = self.tip_joint
        return d

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "BoneSpec":
        return cls(
            id=d["id"],
            parent_id=d.get("parent"),
            px=float(d.get("px", 0.0)),
            py=float(d.get("py", 0.0)),
            length=float(d.get("length", 0.0)),
            angle=float(d.get("angle", 0.0)),
            strength=float(d.get("strength", 1.0)),
            hidden=bool(d.get("hidden", False)),
            shy=bool(d.get("shy", False)),
            ignored_by_ik=bool(d.get("ignoredByIk", False)),
            ik_target=d.get("ikTarget"),
            ik_min=float(d.get("ikMin", 0.0)),
            ik_max=float(d.get("ikMax", 0.0)),
            is_dial=bool(d.get("isDial", False)),
            dynamic=bool(d.get("dynamic", False)),
            root_joint=d.get("rootJoint"),
            tip_joint=d.get("tipJoint"),
        )


@dataclass
class JointSpec:
    """Pixel-space joint used as a reference for bone placement."""
    id: str
    px: float
    py: float
    side: str = ""  # L | R | C | empty
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        d = {"id": self.id, "px": self.px, "py": self.py}
        if self.side:
            d["side"] = self.side
        if self.metadata:
            d["metadata"] = dict(self.metadata)
        return d

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "JointSpec":
        return cls(
            id=d["id"],
            px=float(d["px"]),
            py=float(d["py"]),
            side=str(d.get("side", "")),
            metadata=dict(d.get("metadata", {})),
        )


@dataclass
class PointBindingSpec:
    """Weighted binding of a mesh point to one or more bones."""
    point_index: int
    weights: dict[str, float]  # bone_id -> weight, sums to ~1.0
    # Convenience: when exactly one bone and weight == 1.0, we use rigid binding
    # without writing per-vertex weights into the .moho

    def is_rigid(self) -> bool:
        return (len(self.weights) == 1
                and abs(next(iter(self.weights.values())) - 1.0) < 1e-6)

    def dominant_bone(self) -> str:
        if not self.weights:
            raise ValueError("PointBindingSpec has no bones")
        return max(self.weights.items(), key=lambda kv: kv[1])[0]

    def to_dict(self) -> dict[str, Any]:
        return {"pointIndex": self.point_index, "weights": dict(self.weights)}

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "PointBindingSpec":
        return cls(
            point_index=int(d["pointIndex"]),
            weights={k: float(v) for k, v in d["weights"].items()},
        )


@dataclass
class MeshLayerSpec:
    """Declarative MeshLayer - shape generated, then bound to bones."""
    id: str
    name: str
    parent_bone: str
    # Polygons: list of (x, y) pixel coordinates relative to the canvas.
    # For complex shapes, points/curves can be supplied directly.
    polygons: list[list[tuple[float, float]]] = field(default_factory=list)
    fill_rgb: tuple[float, float, float] = (0.7, 0.7, 0.7)
    # 0.0 = rigid, 0.5 = soft, 1.0 = very soft
    smoothness: float = 0.2
    # Z-ordering inside the bone_container; higher = front
    z_order: int = 0
    # Sub-shapes (for fingers, sub-meshes)
    sub_meshes: list["MeshLayerSpec"] = field(default_factory=list)
    # Weighted binding. Empty list == rigid binding to parent_bone.
    bindings: list[PointBindingSpec] = field(default_factory=list)
    # Optional pivot override; defaults to (0, 0) of the parent bone
    pivot_px: Optional[tuple[float, float]] = None
    # Inherits visibility from parent by default
    visible: bool = True
    mask: int = 0  # Moho masking flag

    def all_sub_meshes(self) -> list["MeshLayerSpec"]:
        out: list[MeshLayerSpec] = list(self.sub_meshes)
        for sub in self.sub_meshes:
            out.extend(sub.all_sub_meshes())
        return out

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "id": self.id,
            "name": self.name,
            "parentBone": self.parent_bone,
            "polygons": [[list(p) for p in poly] for poly in self.polygons],
            "fillRgb": list(self.fill_rgb),
            "smoothness": self.smoothness,
            "zOrder": self.z_order,
            "visible": self.visible,
            "mask": self.mask,
        }
        if self.bindings:
            d["bindings"] = [b.to_dict() for b in self.bindings]
        if self.sub_meshes:
            d["subMeshes"] = [s.to_dict() for s in self.sub_meshes]
        if self.pivot_px is not None:
            d["pivotPx"] = list(self.pivot_px)
        return d

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "MeshLayerSpec":
        return cls(
            id=d["id"],
            name=d["name"],
            parent_bone=d["parentBone"],
            polygons=[[(float(x), float(y)) for x, y in poly]
                      for poly in d.get("polygons", [])],
            fill_rgb=tuple(d.get("fillRgb", (0.7, 0.7, 0.7))),
            smoothness=float(d.get("smoothness", 0.2)),
            z_order=int(d.get("zOrder", 0)),
            bindings=[PointBindingSpec.from_dict(b)
                      for b in d.get("bindings", [])],
            sub_meshes=[MeshLayerSpec.from_dict(s)
                         for s in d.get("subMeshes", [])],
            pivot_px=tuple(d["pivotPx"]) if d.get("pivotPx") else None,
            visible=bool(d.get("visible", True)),
            mask=int(d.get("mask", 0)),
        )


@dataclass
class SecondaryMotionSpec:
    """Description of a chain of dynamic bones (tail, hair strand, cape)."""
    name: str
    root_bone: str
    chain_bones: list[str]
    # Number of keyframes generated to simulate inertia
    keyframe_count: int = 8
    # How much each bone lags the previous; 0.0 = no lag, 1.0 = big swing
    lag: float = 0.6
    # Cycle length in frames; 0 = one-shot
    cycle_frames: int = 0
    # Initial swing amplitude in radians
    amplitude: float = 0.35

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "rootBone": self.root_bone,
            "chainBones": list(self.chain_bones),
            "keyframeCount": self.keyframe_count,
            "lag": self.lag,
            "cycleFrames": self.cycle_frames,
            "amplitude": self.amplitude,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "SecondaryMotionSpec":
        return cls(
            name=d["name"],
            root_bone=d["rootBone"],
            chain_bones=list(d["chainBones"]),
            keyframe_count=int(d.get("keyframeCount", 8)),
            lag=float(d.get("lag", 0.6)),
            cycle_frames=int(d.get("cycleFrames", 0)),
            amplitude=float(d.get("amplitude", 0.35)),
        )


@dataclass
class DialActionSpec:
    """One dial state; used to wire up SmartBone Action channels."""
    name: str
    # Bone angle (radians) for this state
    angle: float
    # Optional pose override for each affected bone
    pose_overrides: dict[str, float] = field(default_factory=dict)


@dataclass
class DialSpec:
    """Declarative dial: a control bone wired to one or more target channels."""
    bone: str
    actions: list[DialActionSpec] = field(default_factory=list)
    # Channels to drive (e.g. switch_keys.actions or anim_angle.actions)
    drives: list[str] = field(default_factory=list)
    # Optional constraint range
    min_angle: float = 0.0
    max_angle: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "bone": self.bone,
            "actions": [{"name": a.name, "angle": a.angle,
                         "poseOverrides": dict(a.pose_overrides)}
                        for a in self.actions],
            "drives": list(self.drives),
            "minAngle": self.min_angle,
            "maxAngle": self.max_angle,
        }


@dataclass
class SwitchSpec:
    """Declarative switch: a layer that switches between several states."""
    id: str
    name: str
    parent_bone: str
    states: list[str] = field(default_factory=list)
    # Optional: name of the dial that drives this switch
    driven_by: Optional[str] = None
    z_order: int = 0
    # sub-spec: each state is a MeshLayerSpec
    state_meshes: dict[str, MeshLayerSpec] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "parentBone": self.parent_bone,
            "states": list(self.states),
            "drivenBy": self.driven_by,
            "zOrder": self.z_order,
            "stateMeshes": {k: v.to_dict() for k, v in self.state_meshes.items()},
        }


@dataclass
class TopologySpec:
    """Top-level declarative topology."""
    name: str
    canvas: dict[str, Any] = field(default_factory=lambda: {"width": 400, "height": 600})
    bones: list[BoneSpec] = field(default_factory=list)
    joints: list[JointSpec] = field(default_factory=list)
    mesh_layers: list[MeshLayerSpec] = field(default_factory=list)
    switches: list[SwitchSpec] = field(default_factory=list)
    dials: list[DialSpec] = field(default_factory=list)
    secondary_motion: list[SecondaryMotionSpec] = field(default_factory=list)
    # Aesthetic: dominant palette
    palette: dict[str, tuple[float, float, float]] = field(default_factory=dict)
    # Free-form metadata for LLM round-trips
    metadata: dict[str, Any] = field(default_factory=dict)

    def bone_by_id(self, bone_id: str) -> Optional[BoneSpec]:
        for b in self.bones:
            if b.id == bone_id:
                return b
        return None

    def joint_by_id(self, joint_id: str) -> Optional[JointSpec]:
        for j in self.joints:
            if j.id == joint_id:
                return j
        return None

    def child_bones(self, parent_id: str) -> list[BoneSpec]:
        return [b for b in self.bones if b.parent_id == parent_id]

    def all_bones_with_ik(self) -> list[BoneSpec]:
        return [b for b in self.bones if b.ik_target]

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "canvas": dict(self.canvas),
            "bones": [b.to_dict() for b in self.bones],
            "joints": [j.to_dict() for j in self.joints],
            "meshLayers": [m.to_dict() for m in self.mesh_layers],
            "switches": [s.to_dict() for s in self.switches],
            "dials": [d.to_dict() for d in self.dials],
            "secondaryMotion": [sm.to_dict() for sm in self.secondary_motion],
            "palette": {k: list(v) for k, v in self.palette.items()},
            "metadata": dict(self.metadata),
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "TopologySpec":
        palette_raw = d.get("palette", {})
        palette = {k: tuple(v) for k, v in palette_raw.items()}
        return cls(
            name=d["name"],
            canvas=dict(d.get("canvas", {"width": 400, "height": 600})),
            bones=[BoneSpec.from_dict(b) for b in d.get("bones", [])],
            joints=[JointSpec.from_dict(j) for j in d.get("joints", [])],
            mesh_layers=[MeshLayerSpec.from_dict(m)
                         for m in d.get("meshLayers", [])],
            switches=[SwitchSpec.from_dict(s) for s in d.get("switches", [])],
            dials=[DialSpec.from_dict(dd) for dd in d.get("dials", [])],
            secondary_motion=[SecondaryMotionSpec.from_dict(sm)
                              for sm in d.get("secondaryMotion", [])],
            palette=palette,
            metadata=dict(d.get("metadata", {})),
        )

    @classmethod
    def from_json_file(cls, path: str) -> "TopologySpec":
        import json
        return cls.from_dict(json.loads(
            __import__("pathlib").Path(path).read_text(encoding="utf-8")
        ))

    def to_json_file(self, path: str) -> None:
        import json
        from pathlib import Path
        Path(path).write_text(
            json.dumps(self.to_dict(), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
