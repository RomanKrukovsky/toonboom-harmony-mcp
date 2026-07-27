from __future__ import annotations

import hashlib
import json
from typing import Dict, List, Literal, Optional, Any
from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class Point2DPIR(StrictModel):
    x: float
    y: float


class BezierSegmentPIR(StrictModel):
    start_point: Point2DPIR = Field(alias="startPoint")
    end_point: Point2DPIR = Field(alias="endPoint")
    control_point1: Point2DPIR = Field(alias="controlPoint1")
    control_point2: Point2DPIR = Field(alias="controlPoint2")
    is_corner: bool = Field(default=False, alias="isCorner")


class WidthPointPIR(StrictModel):
    position: float = Field(ge=0.0, le=1.0)
    thickness: float = Field(ge=0.0)


ArtLayerType = Literal["underlay", "line", "color", "overlay"]
SemanticGroupType = Literal[
    "outline",
    "face",
    "hair",
    "eyes",
    "brows",
    "mouth",
    "torso",
    "left_arm",
    "right_arm",
    "left_hand",
    "right_hand",
    "clothing",
    "accessory",
    "unassigned",
]
LineCapType = Literal["butt", "round", "square"]
LineJoinType = Literal["miter", "round", "bevel"]
ResultType = Literal["pencil", "brush"]


class SourceRegion(StrictModel):
    x: float
    y: float
    width: float
    height: float


class DrawingStrokePIR(StrictModel):
    stroke_id: str = Field(alias="strokeId")
    result_type: ResultType = Field(alias="resultType")
    art_layer: ArtLayerType = Field(default="line", alias="artLayer")
    semantic_group: SemanticGroupType = Field(default="unassigned", alias="semanticGroup")
    source_region: Optional[SourceRegion] = Field(default=None, alias="sourceRegion")
    open_or_closed: Literal["open", "closed"] = Field(default="open", alias="openOrClosed")
    segments: List[BezierSegmentPIR] = Field(default_factory=list)
    anchors: List[Point2DPIR] = Field(default_factory=list)
    control_handles: List[Point2DPIR] = Field(default_factory=list, alias="controlHandles")
    corner_flags: List[bool] = Field(default_factory=list, alias="cornerFlags")
    base_thickness: float = Field(default=2.0, gt=0, alias="baseThickness")
    width_profile: List[WidthPointPIR] = Field(default_factory=list, alias="widthProfile")
    line_cap: LineCapType = Field(default="round", alias="lineCap")
    line_join: LineJoinType = Field(default="round", alias="lineJoin")
    colour_id: str = Field(alias="colourId")
    palette_id: str = Field(default="default_palette", alias="paletteId")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    source_provider: str = Field(default="classical_fallback", alias="sourceProvider")
    assumptions: List[str] = Field(default_factory=list)
    requires_human_review: bool = Field(default=False, alias="requiresHumanReview")
    provenance: Dict[str, Any] = Field(default_factory=dict)


class FillRegionPIR(StrictModel):
    region_id: str = Field(alias="regionId")
    colour_id: str = Field(alias="colourId")
    palette_id: str = Field(default="default_palette", alias="paletteId")
    art_layer: ArtLayerType = Field(default="color", alias="artLayer")
    semantic_group: str = Field(default="unassigned", alias="semanticGroup")
    boundary_strokes: List[str] = Field(default_factory=list, alias="boundaryStrokes")
    boundary_segments: List[BezierSegmentPIR] = Field(default_factory=list, alias="boundarySegments")
    allowed_gaps: float = Field(default=0.0, ge=0.0, alias="allowedGaps")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    requires_human_review: bool = Field(default=False, alias="requiresHumanReview")


class AxisOrientation(StrictModel):
    x: Literal["right"] = "right"
    y: Literal["up", "down"] = "up"


class CoordinateTransformationPIR(StrictModel):
    source_width: float = Field(alias="sourceWidth", gt=0)
    source_height: float = Field(alias="sourceHeight", gt=0)
    coordinate_system: Literal["normalized", "harmony_ogl"] = Field(default="normalized", alias="coordinateSystem")
    transform_matrix: List[float] = Field(default_factory=lambda: [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0], alias="transformMatrix")
    scale: float = Field(default=1.0)
    axis_orientation: AxisOrientation = Field(default_factory=AxisOrientation, alias="axisOrientation")


class DrawingLayerPIR(StrictModel):
    layer_id: str = Field(alias="layerId")
    name: str
    semantic_group: str = Field(alias="semanticGroup")
    art_layer: ArtLayerType = Field(alias="artLayer")
    strokes: List[DrawingStrokePIR] = Field(default_factory=list)
    fill_regions: List[FillRegionPIR] = Field(default_factory=list, alias="fillRegions")


class ColorDefinitionPIR(StrictModel):
    r: int = Field(ge=0, le=255)
    g: int = Field(ge=0, le=255)
    b: int = Field(ge=0, le=255)
    a: int = Field(default=255, ge=0, le=255)


class PaletteItemPIR(StrictModel):
    id: str
    name: str
    color: ColorDefinitionPIR


class QualityMetricsPIR(StrictModel):
    total_strokes: int = Field(alias="totalStrokes")
    total_fills: int = Field(alias="totalFills")
    average_control_points_per_stroke: float = Field(alias="averageControlPointsPerStroke")
    rms_geometric_error: float = Field(alias="rmsGeometricError")
    first_pass_acceptance_rate: float = Field(alias="firstPassAcceptanceRate")
    requires_human_review_count: int = Field(alias="requiresHumanReviewCount")


class CharacterDrawingPIR(StrictModel):
    pir_version: Literal["1.0.0"] = Field(default="1.0.0", alias="pirVersion")
    character_id: str = Field(alias="characterId")
    drawing_name: str = Field(alias="drawingName")
    frame: int = Field(default=1, ge=1)
    coordinate_transform: CoordinateTransformationPIR = Field(alias="coordinateTransform")
    layers: List[DrawingLayerPIR] = Field(default_factory=list)
    unassigned_strokes: List[DrawingStrokePIR] = Field(default_factory=list, alias="unassignedStrokes")
    unassigned_fills: List[FillRegionPIR] = Field(default_factory=list, alias="unassignedFills")
    palette: List[PaletteItemPIR] = Field(default_factory=list)
    quality_metrics: QualityMetricsPIR = Field(alias="qualityMetrics")
    deterministic_hash: Optional[str] = Field(default=None, alias="deterministicHash")

    def compute_hash(self) -> str:
        data = self.model_dump(by_alias=True, exclude={"deterministic_hash"})
        serialized = json.dumps(data, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
