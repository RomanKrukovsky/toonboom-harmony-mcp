from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional, Tuple, Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class ReconstructionRequest(StrictModel):
    video_path: str = Field(alias="videoPath")
    start_frame: Optional[int] = Field(default=None, alias="startFrame", ge=1)
    end_frame: Optional[int] = Field(default=None, alias="endFrame", ge=1)
    mode: Literal["frame_by_frame_vector"] = "frame_by_frame_vector"
    target_fps: Optional[float] = Field(default=None, alias="targetFps", gt=0, le=120)
    max_colors: int = Field(default=12, alias="maxColors", ge=2, le=64)
    max_points_per_shape: int = Field(default=120, alias="maxPointsPerShape", ge=4, le=1000)
    dedup_threshold: float = Field(default=0.035, alias="dedupThreshold", ge=0, le=1)
    cleanup_profile: Literal["preserve_generated_look", "production_cleanup"] = Field(
        default="production_cleanup", alias="cleanupProfile"
    )
    background_mode: Literal["keep", "transparent"] = Field(default="keep", alias="backgroundMode")
    dry_run: bool = Field(default=True, alias="dryRun")
    target_project_path: Optional[str] = Field(default=None, alias="targetProjectPath")
    output_project_path: Optional[str] = Field(default=None, alias="outputProjectPath")
    confirm: Optional[bool] = None
    confirmation_text: Optional[str] = Field(default=None, alias="confirmationText")

    @model_validator(mode="after")
    def valid_range(self) -> "ReconstructionRequest":
        if self.start_frame and self.end_frame and self.end_frame < self.start_frame:
            raise ValueError("endFrame must be greater than or equal to startFrame")
        return self


class VideoMetadata(StrictModel):
    video_path: str = Field(alias="videoPath")
    sha256: str
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    fps: float = Field(gt=0)
    time_base: str = Field(alias="timeBase")
    duration_seconds: float = Field(alias="durationSeconds", gt=0)
    frame_count: int = Field(alias="frameCount", gt=0)
    variable_frame_rate: bool = Field(alias="variableFrameRate")
    rotation: float = 0
    color_space: str = Field(default="unknown", alias="colorSpace")
    has_alpha: bool = Field(default=False, alias="hasAlpha")


class Point(StrictModel):
    x: float
    y: float


class ShapeSource(StrictModel):
    frame: int
    method: Literal["contour_trace", "harmony_vectorize"] = "contour_trace"


class VectorShape(StrictModel):
    id: str
    color_id: str = Field(alias="colorId")
    closed: Literal[True] = True
    points: List[Point] = Field(min_length=3)
    area: float = Field(ge=0)
    source: ShapeSource
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    uncertainty_categories: List[str] = Field(default_factory=list, alias="uncertaintyCategories")


class PaletteColor(StrictModel):
    id: str
    name: str
    rgba: Tuple[int, int, int, int]
    original_rgba: Tuple[float, float, float, float] = Field(alias="originalRgba")
    replacement_error: float = Field(alias="replacementError")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    artist_modified: bool = Field(default=False, alias="artistModified")
    artist_locked: bool = Field(default=False, alias="artistLocked")


class Palette(StrictModel):
    id: str
    name: str
    colors: List[PaletteColor]


class Drawing(StrictModel):
    id: str
    name: str
    source_frame: int = Field(alias="sourceFrame")
    normalized_image_path: str = Field(alias="normalizedImagePath")
    shapes: List[VectorShape]
    point_count: int = Field(alias="pointCount")
    locked: bool = False  # Legacy field
    artist_modified: bool = Field(default=False, alias="artistModified")
    artist_locked: bool = Field(default=False, alias="artistLocked")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    uncertainty_categories: List[str] = Field(default_factory=list, alias="uncertaintyCategories")
    provenance: str = "automatic_video_reconstruction"


class Exposure(StrictModel):
    frame: int = Field(gt=0)
    duration: int = Field(gt=0)
    drawing_id: str = Field(alias="drawingId")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class Element(StrictModel):
    id: str
    name: str
    node_name: str = Field(alias="nodeName")
    drawing_ids: List[str] = Field(alias="drawingIds")
    locked: bool = False  # Legacy field
    artist_modified: bool = Field(default=False, alias="artistModified")
    artist_locked: bool = Field(default=False, alias="artistLocked")


class Node(StrictModel):
    id: str
    name: str
    type: Literal["READ", "COMPOSITE", "DISPLAY"]
    auto_created: bool = Field(alias="autoCreated")
    locked: bool = False  # Legacy field
    artist_modified: bool = Field(default=False, alias="artistModified")
    artist_locked: bool = Field(default=False, alias="artistLocked")


class Connection(StrictModel):
    from_id: str = Field(alias="from")
    to: str
    from_port: int = Field(alias="fromPort")
    to_port: int = Field(alias="toPort")


class Capability(StrictModel):
    vector_backend: Literal["python_dom_shapes", "harmony_vectorize"] = Field(alias="vectorBackend")
    line_art: bool = Field(alias="lineArt")
    colour_art: bool = Field(alias="colourArt")
    native_tvg_required: Literal[True] = Field(default=True, alias="nativeTvgRequired")


class ProblemFrame(StrictModel):
    frame: int = Field(gt=0)
    severity: Literal["low", "medium", "high", "critical"]
    category: str
    source_preview_path: str = Field(alias="sourcePreviewPath")
    vector_preview_path: str = Field(alias="vectorPreviewPath")
    difference_preview_path: str = Field(alias="differencePreviewPath")
    affected_drawing_id: Optional[str] = Field(default=None, alias="affectedDrawingId")
    metrics: Dict[str, float] = Field(default_factory=dict)
    recommended_action: str = Field(alias="recommendedAction")


class RepresentationSegment(StrictModel):
    start_frame: int = Field(alias="startFrame", gt=0)
    end_frame: int = Field(alias="endFrame", gt=0)
    routing_choice: Literal["frame_by_frame_vector", "peg_transform", "deformer", "substitution"] = Field(alias="routingChoice")
    average_confidence: float = Field(alias="averageConfidence", ge=0.0, le=1.0)
    drawing_ids: List[str] = Field(alias="drawingIds")
    problem_frames: List[int] = Field(alias="problemFrames")
    explanation: str


class Diagnostics(StrictModel):
    unique_drawing_count: int = Field(alias="uniqueDrawingCount")
    duplicate_frame_count: int = Field(alias="duplicateFrameCount")
    palette_color_count: int = Field(alias="paletteColorCount")
    total_point_count: int = Field(alias="totalPointCount")
    warnings: List[str]
    stage_durations_ms: Dict[str, float] = Field(alias="stageDurationsMs")
    capability: Capability
    problem_frames: List[ProblemFrame] = Field(default_factory=list, alias="problemFrames")
    representation_segments: List[RepresentationSegment] = Field(default_factory=list, alias="representationSegments")


class SceneSpec(StrictModel):
    name: str
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    fps: float = Field(gt=0)
    start_frame: Literal[1] = Field(alias="startFrame")
    end_frame: int = Field(alias="endFrame", gt=0)


class RenderComparisonPair(StrictModel):
    frame: int = Field(gt=0)
    source_path: str = Field(alias="sourcePath")
    render_path: str = Field(alias="renderPath")


class RenderComparisonRequest(StrictModel):
    pairs: List[RenderComparisonPair] = Field(min_length=1, max_length=48)


class ProvenanceInfo(StrictModel):
    tool: str = "harmony-reconstruction-core"
    version: str = "2.0.0"
    arguments: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str


class VisualMetrics(StrictModel):
    mean_pixel_difference: float = Field(alias="meanPixelDifference")
    maximum_pixel_difference: float = Field(alias="maximumPixelDifference")
    silhouette_difference: float = Field(alias="silhouetteDifference")
    contour_difference: float = Field(alias="contourDifference")
    color_difference: float = Field(alias="colorDifference")
    number_of_frames_above_threshold: float = Field(alias="numberOfFramesAboveThreshold")
    
    full_frame_mean_error: float = Field(default=0.0, alias="fullFrameMeanError")
    foreground_mean_error: float = Field(default=0.0, alias="foregroundMeanError")
    moving_region_mean_error: float = Field(default=0.0, alias="movingRegionMeanError")
    silhouette_iou: float = Field(default=1.0, alias="silhouetteIoU")
    contour_distance: float = Field(default=0.0, alias="contourDistance")
    centroid_error: float = Field(default=0.0, alias="centroidError")
    bounding_box_error: float = Field(default=0.0, alias="boundingBoxError")
    area_error: float = Field(default=0.0, alias="areaError")
    
    frame_difference_preservation: float = Field(default=1.0, alias="frameDifferencePreservation")
    centroid_trajectory_error: float = Field(default=0.0, alias="centroidTrajectoryError")
    velocity_error: float = Field(default=0.0, alias="velocityError")
    acceleration_error: float = Field(default=0.0, alias="accelerationError")
    optical_flow_consistency: float = Field(default=1.0, alias="opticalFlowConsistency")
    temporal_silhouette_difference: float = Field(default=0.0, alias="temporalSilhouetteDifference")
    frozen_motion_ratio: float = Field(default=0.0, alias="frozenMotionRatio")
    number_of_lost_motion_events: int = Field(default=0, alias="numberOfLostMotionEvents")


class ComplexityMetrics(StrictModel):
    unique_drawing_count: int = Field(alias="uniqueDrawingCount")
    vector_path_count: int = Field(alias="vectorPathCount")
    vector_point_count: int = Field(alias="vectorPointCount")
    palette_color_count: int = Field(alias="paletteColorCount")
    exposure_block_count: int = Field(alias="exposureBlockCount")
    estimated_scene_size: int = Field(alias="estimatedSceneSize")
    problem_frame_count: int = Field(alias="problemFrameCount")


class ReconstructionHypothesis(StrictModel):
    hypothesis_id: str = Field(alias="hypothesisId")
    parent_version: int = Field(alias="parentVersion")
    mode: str
    parameters: Dict[str, Any]
    assumptions: List[str]
    visual_metrics: VisualMetrics = Field(alias="visualMetrics")
    complexity_metrics: ComplexityMetrics = Field(alias="complexityMetrics")
    problem_frames: List[ProblemFrame] = Field(alias="problemFrames")
    confidence: float
    fallback_level: str = Field(alias="fallbackLevel")
    manifest_path: str = Field(alias="manifestPath")
    preview_directory: str = Field(alias="previewDirectory")
    creation_timestamp: str = Field(alias="creationTimestamp")
    provenance: ProvenanceInfo


class SelectionHistoryItem(StrictModel):
    selected_hypothesis_id: str = Field(alias="selectedHypothesisId")
    selected_ranges: List[Dict[str, Any]] = Field(alias="selectedRanges")
    selection_reason: str = Field(alias="selectionReason")
    selected_by: str = Field(alias="selectedBy")
    selected_at: str = Field(alias="selectedAt")


class HypothesisSelection(StrictModel):
    selected_hypothesis_id: Optional[str] = Field(default=None, alias="selectedHypothesisId")
    selected_ranges: List[Dict[str, Any]] = Field(default_factory=list, alias="selectedRanges")
    selection_history: List[SelectionHistoryItem] = Field(default_factory=list, alias="selectionHistory")
    selection_reason: Optional[str] = Field(default=None, alias="selectionReason")
    selected_by: Optional[str] = Field(default=None, alias="selectedBy")
    selected_at: Optional[str] = Field(default=None, alias="selectedAt")


class HarmonyReconstructionManifest(StrictModel):
    schema_version: str = Field(default="2.0", alias="schemaVersion")
    manifest_id: str = Field(alias="manifestId")
    created_at: datetime = Field(alias="createdAt")
    mode: Literal["frame_by_frame_vector"]
    source: VideoMetadata
    scene: SceneSpec
    palettes: List[Palette] = Field(min_length=1)
    elements: List[Element] = Field(min_length=1, max_length=1)
    drawings: List[Drawing] = Field(min_length=1)
    exposures: List[Exposure] = Field(min_length=1)
    nodes: List[Node] = Field(min_length=3)
    connections: List[Connection] = Field(min_length=2)
    diagnostics: Diagnostics
    provenance: Optional[ProvenanceInfo] = None
    selected_hypothesis: Optional[HypothesisSelection] = Field(default=None, alias="selectedHypothesis")

    @model_validator(mode="after")
    def check_references(self) -> "HarmonyReconstructionManifest":
        drawings = {drawing.id for drawing in self.drawings}
        colours = {colour.id for palette in self.palettes for colour in palette.colors}
        if any(exposure.drawing_id not in drawings for exposure in self.exposures):
            raise ValueError("Exposure references an unknown drawing")
        if any(shape.color_id not in colours for drawing in self.drawings for shape in drawing.shapes):
            raise ValueError("Shape references an unknown palette colour")
        if any(drawing_id not in drawings for element in self.elements for drawing_id in element.drawing_ids):
            raise ValueError("Element references an unknown drawing")
        if sum(exposure.duration for exposure in self.exposures) != self.source.frame_count:
            raise ValueError("Exposure duration does not cover every source frame")
        cursor = 1
        for exposure in self.exposures:
            if exposure.frame != cursor:
                raise ValueError("Exposures must be ordered and contiguous")
            cursor += exposure.duration
        return self


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
