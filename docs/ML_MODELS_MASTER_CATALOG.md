# ML MODELS MASTER CATALOG & PROVIDER SPECIFICATIONS

This document outlines the verified specifications for all ML models supported by `toon-boom-harmony-mcp`.

## Architectural Data Pipeline Rule
> [!IMPORTANT]
> No ML model is permitted to generate Harmony commands directly!
> All models follow the strict decoupled data pipeline:
> **Raw Model Output → Normalized PIR (Zod Schema) → Validation → Deterministic Harmony Plan (`HarmonyCommandPlanV4`)**

## Terminology Enforcement Rules
- **SAM / Grounded SAM 2**: Output is a **raw raster segmentation mask (PNG/Numpy)**, NOT an "anatomical layer".
- **DWPose**: Output consists of **raw joint keypoint coordinates**, NOT "ready-made Harmony pivots". Pivots are calculated via `PivotEstimator`.
- **AnimeInbet / JoSTC / kbrodt/inbetweening**: Output is **raster PNG frames**, NOT proprietary Toon Boom `.tvg` vector drawings.

---

## Verified ML Model Providers

### 1. DWPose
- **Official Repository**: `IDEA-Research/DWPose`
- **License**: Apache 2.0
- **Weights**: `dw-ll_ucoco_384.onnx` (128 MB), `yolox_l.onnx` (206 MB)
- **Inputs**: RGB Image (JPEG/PNG)
- **Outputs**: 133 Keypoint 2D coordinates & confidence scores (`raw_dwpose_output.json`, `skeleton.json`)
- **PIR Mapping**: `CharacterTopologyPIR` via `PivotEstimator.estimate()`
- **Real Limitations**: Keypoints represent body/face/hand joints in image space. Does not calculate node pivots directly; coordinates must be scaled to canvas dimensions.

### 2. SAM 2.1 (Segment Anything Model 2.1)
- **Official Repository**: `facebookresearch/sam2`
- **License**: Apache 2.0
- **Weights**: `sam2.1_hiera_large.pt` (800 MB)
- **Inputs**: RGB Image + Point/Box/Mask Prompts
- **Outputs**: Raw binary raster segmentation mask PNG / Numpy array
- **PIR Mapping**: `PartDecompositionPIR`
- **Real Limitations**: Returns raster masks. Requires vectorization / polygon contour extraction before node structure creation in Harmony.

### 3. Grounded SAM 2
- **Official Repository**: `IDEA-Research/Grounded-SAM-2`
- **License**: Apache 2.0
- **Weights**: Grounding DINO (`groundingdino_swint_ogc.pth`) + SAM 2.1 (`sam2.1_hiera_large.pt`)
- **Inputs**: RGB Image + Natural Language Text Prompt (e.g., "character head, left arm")
- **Outputs**: Bounding boxes + Raw raster segmentation masks
- **PIR Mapping**: `PartDecompositionPIR`
- **Real Limitations**: High GPU memory requirement (CUDA/MPS). Text prompts select regions, but raw masks still require vector transformation.

### 4. AnimeInbet
- **Official Repository**: `lisiyao21/AnimeInbet`
- **License**: Non-Commercial (Academic Research)
- **Weights**: `animeinbet_v1.pth` (350 MB)
- **Inputs**: Two keyframe line-art PNG images (Frame A, Frame B) + target frame count
- **Outputs**: Interpolated line-art raster PNG frames
- **PIR Mapping**: `InbetweenPIR`
- **Real Limitations**: Operates purely on 2D raster line art. Does not generate vector `.tvg` files; exported drawings are imported as raster drawings or reference images.

### 5. kbrodt/inbetweening (Skeleton-Driven Bitmap Inbetweening)
- **Official Repository**: `kbrodt/inbetweening` (SIGGRAPH Asia 2024, Kyrylo Brodt)
- **License**: MIT / Academic
- **Weights**: `inbetweening_mesh_deform.pth`
- **Inputs**: Bitmap Drawing A, Bitmap Drawing B, Skeleton Keypoints
- **Outputs**: Deformed bitmap intermediate PNG frames
- **PIR Mapping**: `InbetweenPIR`
- **Real Limitations**: Deformation occurs on 2D bitmap meshes. Requires explicit skeleton points to avoid distortion during large rotations.

### 6. JoSTC (Joint Skeleton-Texture Cartoon Inbetweening)
- **Official Repository**: `jostc-cartoon/JoSTC`
- **License**: Research License
- **Weights**: `jostc_checkpoint.pth`
- **Inputs**: Frame A, Frame B, Timestep `t`
- **Outputs**: Raster PNG inbetween frame
- **PIR Mapping**: `InbetweenPIR`
- **Real Limitations**: Requires high VRAM. Output is raster PNG.

### 7. Whisper (OpenAI)
- **Official Repository**: `openai/whisper`
- **License**: MIT
- **Weights**: `whisper-medium.pt` / `whisper-base.pt`
- **Inputs**: Audio file (`.wav`, `.mp3`)
- **Outputs**: Text transcript + timestamped words (`JSON`)
- **PIR Mapping**: Intermediary for MFA / `PerformancePIR`
- **Real Limitations**: Provides word-level timing, not phoneme-level timing. Must be coupled with MFA for viseme alignment.

### 8. MFA (Montreal Forced Aligner)
- **Official Repository**: `MontrealCorpusTools/Montreal-Forced-Aligner`
- **License**: MIT
- **Weights**: Acoustic Dictionary & Language Models (`english_mfa`, `russian_mfa`)
- **Inputs**: Audio `.wav` + Text transcript
- **Outputs**: IntervalTier TextGrid (Phoneme timestamps)
- **PIR Mapping**: `LipSyncPIR` via `VisemeMapper.mapToExposures()`
- **Real Limitations**: Requires phonetic dictionary for target language. Output phonemes must be mapped to Harmony `Drawing Substitutions` (`set_exposure`).

### 9. ToonComposer
- **Official Repository**: `tooncomposer/ToonComposer`
- **License**: Academic Research License
- **Weights**: `tooncomposer_v1.safetensors`
- **Inputs**: Character Keyframe + Motion Control Sequence
- **Outputs**: Animated sequence raster PNGs
- **PIR Mapping**: `PerformancePIR`
- **Real Limitations**: Heavy generative model. Output is raster sequence.

---

## Provider Architecture Matrix

```text
[Input Image/Audio]
       │
       ▼
┌───────────────────────────────┐
│ ML Provider (Local Runtime)   │  (DWPose, SAM 2.1, Grounded SAM 2, AnimeInbet, JoSTC, kbrodt/inbetweening, Whisper, MFA, ToonComposer)
└──────────────┬────────────────┘
               │ Raw Output (Numpy / JSON / PNG / TextGrid)
               ▼
┌───────────────────────────────┐
│ PIR Adapter / Zod Validator   │  (PivotEstimator, VisemeMapper, InbetweenOrchestrator)
└──────────────┬────────────────┘
               │ Validated PIR (CharacterTopologyPIR, LipSyncPIR, InbetweenPIR)
               ▼
┌───────────────────────────────┐
│ HarmonyCommandBuilder (V4)    │  (SHA-256 Idempotent Command Plan)
└──────────────┬────────────────┘
               │ HarmonyCommandPlanV4
               ▼
┌───────────────────────────────┐
│ Harmony Execution Engine      │  (QtScript / TB_Harmony API)
└───────────────────────────────┘
```
