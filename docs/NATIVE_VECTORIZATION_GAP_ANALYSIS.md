# Native Character Vectorization Gap Analysis & Audit Report

**Date:** July 26, 2026  
**Role:** Senior Computer Vision Engineer, Toon Boom Harmony Pipeline TD, Commercial Software Architect  
**Repository:** `toon-boom-harmony-mcp`  

---

## 1. Executive Summary

This document presents a rigorous audit of the vectorization, drawing generation, and Harmony API integration capabilities within the `toon-boom-harmony-mcp` repository. 

While the repository contains an extensive set of pipeline orchestrators, manifests, and high-level MCP tool definitions, the existing vectorization implementations exhibit severe limitations, simulated fallbacks, hardcoded SVG placeholding, and incomplete native drawing creation mechanisms. Specifically, raster-to-vector workflows currently lack support for open pencil strokes (centerlines with variable width profiles), native Pencil/Brush stroke creation in Harmony, semantic layer decomposition, and deterministic evidence-bundle-backed validation.

This audit establishes the baseline gaps and outlines the architectural requirements to implement a commercial, production-grade **Native Character Vectorization Module**.

---

## 2. Audit of Existing Codebase Components

### 2.1 Vectorization & Image Processing
* **`src/adapters/backends/imageBackend.ts` (`vectorizeImageToSVG`)**:
  * **Status:** Fake/Hardcoded Fallback.
  * **Finding:** When `reconstruction-core` is unreachable, the function generates a hardcoded SVG string containing an `<ellipse>` and two fixed `<path>` elements computed from the filename string hash and file size. It does not inspect image pixel data or produce native Harmony drawing elements.
* **`src/adapters/harmonyCli.ts` (`HarmonyCli.vectorize`)**:
  * **Status:** Simulated Fallback.
  * **Finding:** Executes `-batch -vectorize`. When Harmony CLI responds with `invalid option` or `unknown option`, it catches the error and returns `"Симуляция векторизации завершена. Рисунки: ..."` without raising an exception or creating geometry.
* **`services/reconstruction-core/reconstruction_core/vectorize.py`**:
  * **Status:** Basic Polyline Contour Tracing.
  * **Finding:** Uses OpenCV `cv2.findContours(RETR_CCOMP)` on exact RGB palette masks, simplified with `cv2.approxPolyDP`. It only extracts closed polygonal regions, lacking centerline skeletonization, line thickness/profile calculation, Bezier curve fitting, or pencil stroke extraction.

### 2.2 Harmony Bridge & Drawing API Integration (`scripts/python/harmony_bridge.py`)
* **`import_reconstruction_manifest` / `stroke_create`**:
  * **Status:** Incomplete Closed-Shape Fill Only.
  * **Finding:** Uses `harmony.DrawingAccess().stroke_create()` for polygon fills. Enforces `if shape.get("closed") is not True: raise ValueError("Bridge принимает только замкнутые формы")`.
  * **Gaps:** Zero support for open Pencil strokes, variable line width profiles, native Pencil vs. Brush modes, 4-art-layer targeting (`Underlay`, `LineArt`, `ColorArt`, `Overlay`), or semantic body part grouping (`CharacterDrawingPIR`).

### 2.3 Schemas & Data Contracts
* Existing schemas (`reconstruction.ts`, `harmonyManifestV3.ts`) represent vector shapes as flat arrays of `[x, y]` points for polygon fills.
* **Missing:** `DrawingStrokePIR`, `FillRegionPIR`, `DrawingLayerPIR`, `CharacterDrawingPIR`, Zod/Pydantic validation, explicit coordinate transformation matrices, corner flags, line cap/join specifications, and deterministic hash calculation.

### 2.4 MCP Tools & Security
* Existing tools (`harmony.drawings.vectorize`, `harmony.vectorize.queue_drawings`) wrap CLI simulation calls or async queue stubs.
* **Missing:** Dedicated production vectorization suite (`harmony.vectorization.analyze_image`, `preview`, `vectorize_character`, `apply_native_drawing`, `validate_drawing`, `compare_render`, `rollback`).
* **Missing:** Confirmation tokens, scene-state hash matching for destructive changes, canonical path validation against allowed roots, and evidence bundle generation (`request.json`, `drawing-stroke-pir.json`, `rendered-output.png`, `render-comparison.json`, etc.).

---

## 3. Detailed Gap Matrix

| Component | Current State | Required Target State | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Vector Schema** | Flat polygon points (`VectorShape`) | Versioned `DrawingStrokePIR` with Bezier segments, width profile, corner flags, confidence, & provenance | **CRITICAL** |
| **Image Preprocessing** | Basic OpenCV color thresholding | Multi-mode pipeline (`black_and_white_lineart`, `flat_colour_character`, `coloured_illustration`, `manual_guided`) | **CRITICAL** |
| **Stroke Extraction** | Contour finding (`findContours`) | Provider abstraction (Skeletonization + Contour Tracing + Bezier fitting fallback, JoSTC ready) with Legal Gate | **CRITICAL** |
| **Vector Cleanup** | Polyline decimation (`approxPolyDP`) | Vector Cleanup Engine (T/X-junction handling, gap closing, corner preservation, noise filtering, error metrics) | **CRITICAL** |
| **Harmony Compilation** | Generic fill strokes (`stroke_create`) | `NativeDrawingCompiler` with `PENCIL_NATIVE` (centerline + profile) and `BRUSH_NATIVE` (outer contour) modes | **CRITICAL** |
| **MCP Tools** | CLI wrapper / queue stubs | 7 atomic tools with non-destructive preview, confirmation tokens, and state hash verification | **HIGH** |
| **Evidence & Safety** | None | Immutable evidence bundle per run with before/after state, logs, render diffs, & hashes | **HIGH** |
| **Semantic Layering** | Single `Read` node | Auto-grouping into `outline`, `face`, `hair`, `eyes`, `torso`, `limbs`, etc., with low-confidence quarantine | **MEDIUM** |

---

## 4. Target Architecture & PIR-First Pipeline

```
[Input Image (PNG/TIFF/PSD)]
           │
           ▼
[Security & Canonical Path Validation] ──► (Path traversal, bomb protection)
           │
           ▼
[Preprocessing Pipeline] ──► (Noise removal, gap closing, mode selection)
           │
           ▼
[Stroke Extraction Provider] ──► (Legal Gate check ──► joSTC / Classical Fallback)
           │
           ▼
[Vector Cleanup Engine] ──► (T/X-junctions, Bezier fitting, width profile, error evaluation)
           │
           ▼
[DrawingStrokePIR & FillRegionPIR (Zod/Pydantic)] ──► (Deterministic Hash)
           │
           ▼
[NativeDrawingCompiler] ──► [HarmonyDrawingCommandPlan]
           │
           ▼
[Dry-Run Preview & MCP Analysis] ──► (Human Confirmation & Token Verification)
           │
           ▼
[Harmony Execution (Python/QtScript API)]
           │
           ▼
[Structural Readback & Scene Save/Reopen]
           │
           ▼
[Render & Visual Comparison] ──► [Immutable Evidence Bundle]
```

---

## 5. Implementation Roadmap & Vertical Slice

1. **Core Schemas:** Define `DrawingStrokePIR`, `FillRegionPIR`, and `CharacterDrawingPIR` in TypeScript (`src/schemas/vectorizationPIR.ts`) and Python (`services/reconstruction-core/reconstruction_core/pir_models.py`).
2. **Provider Abstraction & Cleanup Engine:** Implement classical stroke tracing, centerline extraction, Bezier fitting, thickness profile calculation, and vector cleanup in `services/reconstruction-core`.
3. **Native Drawing Compiler:** Implement `NativeDrawingCompiler` to compile `DrawingStrokePIR` into deterministic Harmony Python commands supporting `PENCIL_NATIVE` and `BRUSH_NATIVE`.
4. **MCP Tools & Security:** Implement the 7 `harmony.vectorization.*` tools with strict path validation, confirmation tokens, and state hash verification.
5. **Verification & Evidence:** Build end-to-end integration tests, unit tests, and evidence bundle generation.
6. **First Vertical Slice:** Demonstrate clean B&W cartoon line-art -> native editable Pencil Drawing on frame 1 -> readback -> render comparison.
