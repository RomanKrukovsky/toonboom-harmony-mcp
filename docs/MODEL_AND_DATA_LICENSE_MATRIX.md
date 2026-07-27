# MODEL AND DATA LICENSE MATRIX (Commercial Compliance Catalog)

## Overview
This matrix classifies all ML models considered or integrated into `toonboom-harmony-mcp` by upstream code license, weights availability, dataset licensing, regional restrictions, and commercial production status.

---

## Model Classification Matrix

| Model | Official Repo | Code License | Weights License & Status | Hardware Requirements | Input / Output | PIR Target | Production Recommendation |
|---|---|---|---|---|---|---|---|
| **DWPose** | `idea-research/dwpose` | Apache-2.0 | Open (HF Hub / Google Drive), SHA-256 verified | CPU / ONNX / CUDA (2-4GB VRAM) | **In:** Image/Video<br>**Out:** 2D Whole-body Keypoints | `CharacterTopologyPIR`, `JointSetPIR` | **GREEN (Production-First)** |
| **See-through** | `shitagaki-lab/see-through` | Apache-2.0 | Open (HF Hub), Quantized checkpoints | CUDA (8GB VRAM peak for 1280px) | **In:** Anime Illustration<br>**Out:** PSD Layers, Depth Maps | `CharacterDecompositionPIR`, `LayerOrderPIR` | **GREEN (Production-First)** |
| **Whisper + MFA** | `openai/whisper` & `MontrealCorpusTools/MFA` | MIT (Whisper) / MIT (MFA) | Open (MFA Models: CC-BY 4.0) | CPU / Low-end GPU (1-4GB VRAM) | **In:** Audio + Transcript<br>**Out:** Phoneme Alignments | `SpeechPerformancePIR`, `PhonemeTimelinePIR` | **GREEN (Production-First)** |
| **MotionGPT3** | `OpenMotionLab/MotionGPT3` | MIT (Code) | SMPL / SMPL-X Dependent (Check dataset licenses) | CUDA (8-12GB VRAM) | **In:** Text Instruction<br>**Out:** 3D Motion Sequence (`.npy`) | `MotionPrimitivePIR` (After 2D Projection) | **GREEN (With SMPL Diligence)** |
| **JoSTC** | `MarkMoHR/JoSTC` | Apache-2.0 | Manual download required | CUDA 11.x, PyTorch 1.9+ | **In:** Raster frames + Vector ref<br>**Out:** Vector stroke curves | `StrokeCorrespondencePIR` | **GREEN (Vector Cleanup Only)** |
| **Qwen3-VL** | `QwenLM/Qwen3-VL` | Apache-2.0 | Open (HF Checkpoints: 2B, 8B, 72B, 235B) | CUDA (16GB - 80GB VRAM) | **In:** Image/Video + Prompt<br>**Out:** BBoxes, Review Notes | `ReviewNotePIR`, `VisualIssuePIR` | **GREEN (Critic/QA Lane Only)** |
| **ToonComposer** | `TencentARC/ToonComposer` | MIT (Inference) | Open (HF), Wan2.1 Apache-2.0 dependent | CUDA Heavy (~57GB VRAM) | **In:** Keyframes<br>**Out:** Inbetween Video Frames | `RenderProposalPIR` (QA Preview Only) | **GREEN (Preview Layer Only)** |
| **SAM 3.1** | `facebookresearch/sam3` | Custom SAM License | **Gated Access** (Requires Meta request approval) | CUDA 12.6+, PyTorch 2.7+ | **In:** Image/Video + Prompts<br>**Out:** Segmentation Masks | `MaskPIR`, `OcclusionHintPIR` | **YELLOW (Legal Review Required)** |
| **HY-Motion 1.0** | `Tencent-Hunyuan/HY-Motion-1.0` | HY-Motion Community License | **Territorial Exclusion: EU, UK, South Korea** | CUDA (24-26GB VRAM) | **In:** Text Prompt<br>**Out:** 3D Joint Motions | `MotionPrimitivePIR` | **RED for EU/UK/KR (Blocked)** |
| **EMAGE / PantoMatrix** | `PantoMatrix/PantoMatrix` | Unspecified | HF Weights (SMPL-X / FLAME) | CUDA (12GB+ VRAM) | **In:** Speech Audio<br>**Out:** Full-body + Face Motion | `SpeechPerformancePIR` | **RED (Blocked until License Clarified)** |
| **AnimeInbet** | `lisiyao21/AnimeInbet` | **Non-Commercial Only** | ML240 Dataset (CC BY-NC-SA 4.0) | CUDA 10.1, PyTorch 1.7 | **In:** Adjacent Drawings<br>**Out:** Inbetween Drawings | `InbetweenProposalPIR` | **RED (Strictly Blocked for Commercial)** |

---

## Security Enforcement Rules
1. **Unspecified License**: Any model without an explicit open source license is assigned status `blocked`.
2. **Non-Commercial License**: Models licensed under CC BY-NC or custom Non-Commercial terms are automatically blocked when `COMMERCIAL_BUILD=true`.
3. **Territorial Exclusion**: Models with geographic restrictions (e.g. HY-Motion 1.0 in EU/UK/KR) are blocked dynamically based on studio region settings.
