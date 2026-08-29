# Stage 3: Visual QA & Autonomous Repair Engine Evidence

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

## Native Moho Integration
The engine uses `pipeline/tools/moho_native_acceptance.py` to:
1. Render diagnostic frames (1, 12, 24, 36) from the project
2. Analyze rendered pixels for defects
3. Apply fixes directly to the `.moho` archive via `pipeline/moho/emit.py`
4. Re-run acceptance test to verify fixes
5. Repeat up to 5 passes until certified

## Test Results
Both Python (`pipeline/tests/test_visual_qa_repair.py`) and TypeScript (`tests/mohoVisualQaRepair.test.ts`) test suites have passed successfully. The repair loop converges on a fully certified file.

## MCP Integration
Exposed the `moho.qa.certify_and_repair` tool with Zod schemas to run this repair loop through the MCP architecture.

## Native Moho Verification
A test project with intentional defects (missing blinks, frozen mouth, visible control bones) was:
1. Audited - defects detected correctly
2. Repaired - all defects fixed automatically  
3. Re-certified - passes native open/save-as/reopen/render with 0 errors

## Conclusion
Stage 3 (Visual QA & Autonomous Repair) requirements have been fully met.