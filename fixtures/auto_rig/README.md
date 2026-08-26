# Auto-rig fixture — real DWPose skeleton + structural drawing PIR

`skeleton_dwpose_real.json` is a byte-for-byte copy of the committed
real-model artifact `docs/evidence/sprint0-pose/skeleton.json`: whole-body
keypoints produced by actual YOLOX_l + dw-ll_ucoco_384 ONNX inference on
`fixtures/character.png` (Sprint 0 evidence, hash-verified there).

`drawing_pir_structural.json` is a STRUCTURAL layer decomposition (semantic
groups only, zero strokes): it declares which artwork layers a cut-out rigger
would slice, so the assembler can plan peg hierarchy, deformers and the face
master controller. It is NOT vectorized artwork; when a real character is
commissioned this file is replaced by a real CharacterDrawingPIR from the
vectorization stage.

Both feed the auto-rigger golden path (`scripts/run_auto_rig_golden_path.mjs`):

```
skeleton -> CharacterTopologyPIR (pivots + reliability audit)
         -> biped_standard template binding
         -> HarmonyCommandPlanV4 (peg hierarchy, pivots, node graph)
drawing  -> rig assembly plan (parts, patches, backdrops)
         -> deformer + master-controller plan (Curve/Envelope/Grid MC)
```
