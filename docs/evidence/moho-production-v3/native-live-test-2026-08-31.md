# Moho Production v3 native live test — 2026-08-31

Status: failed closed with an explicit license classification.

The opt-in real-Moho test launched the installed Moho executable. A fail-fast license preflight completed in 225 ms and Moho reported: `Unable to launch the command-line renderer as it is a Pro level feature only.` The backend returned `MOHO_PRO_REQUIRED` before running build Lua. It did not create or publish a `.moho` or `.mp4` as verified output.

Before this fix, the same local condition was misclassified as a generic render failure or led to a 180-second Lua timeout. The current result proves fail-fast Pro-license classification and fail-closed behavior only. It is not native feature evidence and does not certify Smart Actions, Smart Warp, mesh, binding, shadow, render, or full profession replacement.

Next proof required: activate a Moho Pro 14 license with command-line rendering, then rerun `RUN_REAL_MOHO_TESTS=1 npm test -- --runInBand tests/integration/mohoProductionV3.realMoho.test.ts` and retain successful open/save/reopen/render artifacts.
