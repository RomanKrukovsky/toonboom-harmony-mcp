# Stage 3: Visual QA & Autonomous Repair Engine

## Overview
Successfully implemented the Moho Stage 3 Visual QA and Autonomous Repair Engine. The engine performs automated visual inspection checks to detect and repair errors in Moho animations. It supports up to 5 iterative passes of detection and repair until the project is certified.

## Implemented Checks
- Empty/nearly empty frames (0 visible pixels or <1% canvas).
- Character clipping or off-screen positions.
- Sudden position jumps / frame-to-frame popping.
- Extreme silhouette area explosions/collapses.
- Foot sliding during ground contact.
- Joint seam tears and transparent gaps between limbs.
- Facial feature drift / eye & mouth misalignment with skull contour.
- Z-order layer sorting errors (e.g. back arm rendered in front of torso).
- Missing eye blinks (>5 sec without blink) or frozen mouth during dialogue lines.
- Animator control bones leaking into final render.
- Native Moho corruptions or warnings.

## Auto-Repair Fixes
- Clamps extreme joint angles and IK targets.
- Adjusts joint overlap padding (+15% circular expansion) to close seam tears.
- Inserts neutral/rest mouth phonemes and natural blink keys.
- Fixes Z-order layer sorting and bone parent connections.
- Restores missing visibility and resets corrupted frame 0 channels.
- Hides control bones from final render.

## Test Results
Both Python (`pipeline/tests/test_visual_qa_repair.py`) and TypeScript (`tests/mohoVisualQaRepair.test.ts`) test suites have passed successfully. The simulated pipeline ensures that iterative repairs converge on a fully certified file.

## MCP Integration
Exposed the `moho.qa.certify_and_repair` tool with Zod schemas to run this repair loop through the MCP architecture.
