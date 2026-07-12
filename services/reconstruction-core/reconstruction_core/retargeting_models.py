from __future__ import annotations

from typing import Dict, List, Literal, Optional, Tuple, Any
from pydantic import BaseModel, Field


class StrictModel(BaseModel):
    model_config = {
        "extra": "forbid",
        "populate_by_name": True
    }


class JointLimit(StrictModel):
    min_angle: float = Field(alias="minAngle")
    max_angle: float = Field(alias="maxAngle")


class RigJoint(StrictModel):
    name: str
    parent: Optional[str] = None
    peg_node_path: str = Field(alias="pegNodePath")
    pivot_x: float = Field(alias="pivotX")
    pivot_y: float = Field(alias="pivotY")
    length: float = Field(default=1.0)
    limits: Optional[JointLimit] = None


class RigProfile(StrictModel):
    name: str
    joints: List[RigJoint]
    rest_pose: Dict[str, float] = Field(default_factory=dict, alias="restPose")  # joint name -> rest angle (degrees)


class JointMapping(StrictModel):
    peg_node_path: str = Field(alias="pegNodePath")
    source_joints: List[str] = Field(alias="sourceJoints")  # e.g., ["LEFT_SHOULDER", "LEFT_ELBOW"]
    transform_type: Literal["rotation", "translation", "scale"] = Field(default="rotation", alias="transformType")
    min_angle_limit: Optional[float] = Field(default=-180.0, alias="minAngleLimit")
    max_angle_limit: Optional[float] = Field(default=180.0, alias="maxAngleLimit")
    scale_factor: Optional[float] = Field(default=1.0, alias="scaleFactor")


class TransformKeyframe(StrictModel):
    frame: int
    value: float  # angle in degrees or translation/scale factor
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class Track(StrictModel):
    peg_node_path: str = Field(alias="pegNodePath")
    transform_type: Literal["rotation", "translation", "scale"] = Field(alias="transformType")
    keyframes: List[TransformKeyframe]


class RetargetingManifest(StrictModel):
    schema_version: str = Field(default="1.0", alias="schemaVersion")
    manifest_id: str = Field(alias="manifestId")
    created_at: str = Field(alias="createdAt")
    character_name: str = Field(alias="characterName")
    rig_profile: RigProfile = Field(alias="rigProfile")
    mappings: List[JointMapping]
    tracks: List[Track]
    fidelity_metrics: Dict[str, Any] = Field(default_factory=dict, alias="fidelityMetrics")
    provenance: Optional[Dict[str, Any]] = None
