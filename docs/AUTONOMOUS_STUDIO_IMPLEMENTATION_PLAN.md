# AUTONOMOUS STUDIO IMPLEMENTATION PLAN
## Enterprise Industrial-Grade Autonomous Animation Production Engine for Toon Boom Harmony

### Executive Summary
This document defines the comprehensive audit and transformation plan to evolve `toon-boom-harmony-mcp` from a collection of MCP tools and execution helpers into an **Autonomous Animation Production Engine**.

The engine turns natural language creative prompts (series ideas, episode concepts, scripts, storyboards) into fully editable, production-ready Toon Boom Harmony projects, rendered previews, and complete review packages with automated quality control and fix loops.

---

### Audit Findings

#### 1. What Really Works Currently
* **Prompt Parsing (`PromptParser`)**: Converts prompt strings into `ParsedScene` and `scene_plan.json`.
* **Execution Schema Validation (`ScenePlanAdapter`, `scenePlanSchema`)**: Validates JSON scene structures against Zod schemas.
* **Basic Harmony Python Bridge Daemon (`HarmonyPython`, `harmony_bridge.py`)**: Launches background Python daemon communicating via JSON over stdin/stdout, with IPC for basic commands (`detect`, `open_project`, `save_project`, `create_node`, `connect_nodes`, `import_image_as_drawing`, `render_preview`).
* **Basic Command Plan V3/V4 (`harmonyCommandPlanV4`)**: Constructs node trees and connection arrays for Harmony scenes.
* **Render Output Validator (`RenderOutputValidator`)**: Verifies file existence, size (>0 bytes), and media container headers.
* **SQLite Production Tracker (`sqliteTracker`)**: Stores audit reports, scene plans, and execution logs in `harmony_workflow.db`.

#### 2. What Works Only in Simulation
* **`harmony.studio.run_full_pipeline`**: When Harmony executable is missing or `HARMONY_ENGINE_MODE=simulation`, outputs simulated JSON execution reports and placeholder preview files (`SIMULATED_VIDEO_STREAM_PLACEHOLDER`).
* **`harmony.oneprompt.*`**: Analyzes prompts and generates full production plans, but actual Harmony scene assembly falls back to simulation unless driven in `real` mode.
* **Complex 360 Rig Generation (`harmony.rig360.*`)**: Generates structured JSON rig blueprints and drawing-to-angle mapping matrices, but does not auto-build Master Controllers inside Harmony unless custom Qt Scripts are run.
* **Acting & Motion Synthesizer (`harmony.acting.*`)**: Plans emotional beats and keyframe timing as JSON data structures.
* **Quality Reviewer (`harmony.quality.*`)**: Scores JSON plans deterministically based on rule checks (camera present, fps matching, character continuity), but does not run visual AI perception on rendered frames unless ML models are loaded.

#### 3. Where Placeholder Assets Are Used
* **Background & Character Images**: `RealSceneExecutor` generates minimal 1x1 transparent PNG files (`background_placeholder.png`, `character_placeholder.png`) in `output/episode_package/assets/placeholders/` when real artist assets or AI generated images are not provided.
* **Audio Tracks**: Silent WAV files or mock audio buffers generated during lipsync simulation tests.

#### 4. Which Operations Actually Run Inside Harmony
When Toon Boom Harmony (Premium/Advanced/Essential) is installed and `HARMONY_BIN` or `HARMONY_INSTALL` is configured:
* `open_project` / `create_project` (via Python API or CLI)
* `create_composite_display_write_chain` (creates Composite, Display, and Write nodes)
* `import_image_as_drawing` (creates Drawing/Read node and loads PNG/PSD)
* `create_node` & `connect_nodes` (creates Peg, Camera, FX nodes and connects ports)
* `set_node_position` & `set_node_scale`
* `set_node_attr` (sets attribute values and keyframes)
* `save_project` (saves `.xstage` file)
* `render_preview` (invokes Harmony CLI or Python render handler to produce preview output)

#### 5. Which Operations Are Only Recorded in JSON
* `harmony.script.*`: Screenplay structure, scene breakdown, beat sheets.
* `harmony.storyboard.*`: Shot lists, staging directions, panel layouts.
* `harmony.creative.*`: Series bibles, character bibles, style rules.
* `harmony.style.*`: Character drift reports and visual consistency scores.
* `harmony.audio.*`: Voice casting briefs, Foley plans, music briefs.
* `harmony.fx.*`: Particle effect plans and compositing graphs prior to scene compilation.

#### 6. What Functions Are Missing
* **Central Production Orchestrator (`harmony.studio.run_production`, `resume_production`)**: Unified engine state machine coordinating execution modes (`simulation`, `dry_run`, `real`, `hybrid`, `moonshot`), stage dependencies, idempotency, and resumability.
* **Capability Matrix & Verification Registry (`harmony.capabilities.*`)**: Fine-grained probing of Harmony environment capabilities, classifying every tool call into `verified`, `partially_verified`, `experimental`, `simulated`, or `unsupported`.
* **Complete End-to-End Production Package Physical Directory Structure**: Standardized `production_package/` directory layout with manifest schemas, approval records, delivery manifests, and provenance tracking.
* **Model Router (`src/services/modelRouter`)**: Provider-agnostic router for LLM, Diffusion, TTS, Vision, and Perception models with fallback policies and cost accounting.
* **Production Memory (`src/services/productionMemory`)**: Semantic search and persistent database across series bible, character identities, and reusable animation clips.
* **Human-in-the-Loop Approval Gates (`harmony.review.*`)**: Explicit workflow pausing and approval policies (`fully_autonomous`, `approve_critical`, `approve_each_department`, `manual_supervision`).
* **Legal & Provenance Tracker (`harmony.legal.*`)**: Tracking asset source, licensing, model seeds, and commercial use compliance.

#### 7. Which APIs / Methods Require Real Harmony Verification
* `harmony.session().project.create_render_handler()`
* `harmony.DrawingAccess` and `harmony.BezierPath` for direct vector drawing manipulation.
* Master Controller Qt Script instantiation (`node.addPlugin(...)` or `MC_NodeWrapper`).
* Deformer creation (`Bones`, `CurveDeformer`) via script vs template import.
* Control Center Telnet/Batch commands on remote Harmony Server environments.

#### 8. Required Architectural Changes
1. **Modular Architecture Expansion**: Create dedicated engine packages for Orchestration, Capability Registry, Creative Director, Writing Room, Storyboard & Animatic, Asset Production, Style Consistency, Rigging Engine, Acting/Animation, Audio & LipSync, Layout & Camera, FX & Compositing, Render Farm, Quality Director, Model Router, Production Memory, Legal Provenance, and System Health.
2. **Unified Response Contract**: Enforce that every tool execution returns a standardized status shape:
   `mode`, `status`, `isRealHarmonyExecution`, `simulated`, `placeholder`, `requiresHumanReview`, `requiresRealHarmony`, `warnings`, `errors`, `artifacts`, `executionReportPath`, `correlationId`, `startedAt`, `completedAt`.
3. **Idempotency & Resumability**: Store stage fingerprints (SHA-256) in `project_manifest.json` so re-running production skips completed stages.
4. **Fallback Safety & UI Automation Controls**: Require visual confidence threshold ($\ge 0.75$) and disable raw coordinates by default (`HARMONY_ALLOW_RAW_COORDINATES=false`).

#### 9. Identified Technical & Operational Risks
* **License & Runtime Availability**: Harmony CLI or Python bindings may be absent on non-animator machines. *Mitigation: Automatic fallback to `simulation` or `hybrid` mode with explicit status indicators.*
* **Scripting API Variations**: Harmony Python API method signatures vary between version 21, 22, 24, and 25. *Mitigation: Capability Registry probing and capability matrix checking.*
* **Asset Licensing & Legal Risk**: AI-generated assets may lack clear copyright ownership. *Mitigation: Built-in provenance tracking and legal manifest generation.*

---

### Implementation Sequence

1. **Stage 1**: Reality Audit & Capability Registry (`src/services/capabilityRegistry/`, `src/tools/capabilityTools.ts`).
2. **Stage 2**: Production Package, Central Orchestrator & State Management (`src/orchestrators/autonomousStudio/`, `src/schemas/productionPackage.ts`, `src/tools/autonomousStudioTools.ts`).
3. **Stage 3**: Creative Director & Writing Room Engines (`src/agents/creativeDirector/`, `src/agents/writingRoom/`, `src/tools/creativeTools.ts`, `src/tools/scriptTools.ts`).
4. **Stage 4**: Storyboard, Animatic & Asset Engines (`src/agents/storyboardDirector/`, `src/agents/assetDirector/`, `src/services/assetRegistry/`, `src/tools/storyboardTools.ts`, `src/tools/assetRegistryTools.ts`).
5. **Stage 5**: Style Consistency & Character Identity Engines (`src/services/styleConsistency/`, `src/tools/styleTools.ts`).
6. **Stage 6**: Rigging Engine & Master Controller Builder (`src/agents/rigDirector/`, `src/services/rigSynthesizer/`, `src/tools/riggingEngineTools.ts`).
7. **Stage 7**: Acting, Animation & Audio/LipSync Engines (`src/agents/actingDirector/`, `src/agents/audioDirector/`, `src/tools/actingEngineTools.ts`, `src/tools/audioEngineTools.ts`).
8. **Stage 8**: Layout, Camera, FX & Compositing Engines (`src/agents/layoutDirector/`, `src/agents/fxDirector/`, `src/tools/layoutCameraTools.ts`, `src/tools/fxCompositingTools.ts`).
9. **Stage 9**: Render Farm, Quality Director & Automatic Fix Loop (`src/services/renderFarm/`, `src/agents/qualityDirector/`, `src/tools/renderFarmTools.ts`, `src/tools/qualityEngineTools.ts`).
10. **Stage 10**: Model Router, Production Memory & Legal Provenance (`src/services/modelRouter/`, `src/services/productionMemory/`, `src/tools/modelRouterTools.ts`, `src/tools/productionMemoryTools.ts`, `src/tools/legalTools.ts`).
11. **Stage 11**: Human-in-the-Loop Approval & System Health (`src/tools/approvalTools.ts`, `src/tools/systemHealthTools.ts`).
12. **Stage 12**: Complete End-to-End Vertical Slice Execution (`RealSceneExecutor` expansion, commercial demo scenario `examples/autonomous_episode_demo/`, test suite, and full documentation update).
