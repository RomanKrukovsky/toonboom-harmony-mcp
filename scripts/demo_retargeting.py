#!/usr/bin/env python3
"""
AI Animation Studio — Motion Retargeting demo.

Reproducible end-to-end pipeline that:
  1. builds a synthetic MediaPipe-like landmark trajectory (arm raise by 45°),
  2. builds a standard Harmony rig profile + joint mapping,
  3. runs `run_motion_retargeting` to produce a RetargetingManifest (Peg
     keyframes per joint),
  4. generates SVG previews per-frame to output/ai_studio/retargeting_demo,
  5. asserts basic frame coverage and prints a summary.

Run:
  .venv-reconstruction/bin/python scripts/demo_retargeting.py
"""
from __future__ import annotations

import math
import os
import sys
from pathlib import Path

# Make the in-tree package importable when run directly.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'services' / 'reconstruction-core'))

from reconstruction_core.retargeting_models import (  # type: ignore
    RigProfile, RigJoint, JointMapping, JointLimit,
)
from reconstruction_core.retargeting_core import (  # type: ignore
    SyntheticPoseProvider, run_motion_retargeting,
)


def create_demo_rig() -> RigProfile:
    joints = [
        RigJoint(name='Root', parent=None, pegNodePath='Top/Vex/Root_Peg',
                 pivotX=0.0, pivotY=0.0, length=1.0),
        RigJoint(name='Shoulder_L', parent='Root', pegNodePath='Top/Vex/Shoulder_L_Peg',
                 pivotX=0.0, pivotY=0.0, length=1.0),
        RigJoint(name='Elbow_L', parent='Shoulder_L', pegNodePath='Top/Vex/Elbow_L_Peg',
                 pivotX=1.0, pivotY=0.0, length=1.0),
        RigJoint(name='Wrist_L', parent='Elbow_L', pegNodePath='Top/Vex/Wrist_L_Peg',
                 pivotX=2.0, pivotY=0.0, length=0.2),
    ]
    return RigProfile(name='Vex', joints=joints,
                      restPose={'Root': 0.0, 'Shoulder_L': 0.0, 'Elbow_L': 0.0})


def create_demo_mappings() -> list[JointMapping]:
    return [
        JointMapping(pegNodePath='Top/Vex/Root_Peg',
                     sourceJoints=['LEFT_HIP'], transformType='translation'),
        JointMapping(pegNodePath='Top/Vex/Shoulder_L_Peg',
                     sourceJoints=['LEFT_SHOULDER', 'LEFT_ELBOW'],
                     transformType='rotation'),
        JointMapping(pegNodePath='Top/Vex/Elbow_L_Peg',
                     sourceJoints=['LEFT_ELBOW', 'LEFT_WRIST'],
                     transformType='rotation'),
    ]


def build_arm_raise_trajectory() -> SyntheticPoseProvider:
    """3 frames: 0°, 22.5°, 45° — pure shoulder rotation, elbow fixed."""
    provider = SyntheticPoseProvider()

    # Fixed LEFT_HIP landmark (root reference)
    for frame in (1, 2, 3):
        provider.set_landmark(frame, 'LEFT_HIP', 0.0, 0.0, 0.0, 1.0 - (frame - 1) * 0.05)

    angles = [0.0, math.radians(22.5), math.radians(45.0)]
    shin_len = 1.0
    elbow_len = 1.0
    for i, a in enumerate(angles, start=1):
        # Shoulder anchored at origin
        provider.set_landmark(i, 'LEFT_SHOULDER', 0.0, 0.0, 0.0, 1.0 - (i - 1) * 0.05)
        # Elbow extends along rotating direction
        provider.set_landmark(i, 'LEFT_ELBOW', math.cos(a) * shin_len, math.sin(a) * shin_len, 0.0,
                              1.0 - (i - 1) * 0.05)
        provider.set_landmark(i, 'LEFT_WRIST',
                              math.cos(a) * (shin_len + elbow_len),
                              math.sin(a) * (shin_len + elbow_len),
                              0.0, 1.0 - (i - 1) * 0.05)
    return provider


def main() -> int:
    out_dir = ROOT / 'output' / 'ai_studio' / 'retargeting_demo'
    out_dir.mkdir(parents=True, exist_ok=True)

    print('══════════════════════════════════════════════════════════════════')
    print('  AI ANIMATION STUDIO — MOTION RETARGETING DEMO')
    print('══════════════════════════════════════════════════════════════════')

    rig = create_demo_rig()
    mappings = create_demo_mappings()
    poses = build_arm_raise_trajectory()

    print(f'Rig profile:        {rig.name}  ({len(rig.joints)} joints)')
    print(f'Mappings:           {len(mappings)} Peg↔source mappings')
    print(f'Frames:             3 (0° → 22.5° → 45° shoulder raise)')

    try:
        manifest = run_motion_retargeting(
            provider=poses,
            rig_profile=rig,
            mappings=mappings,
            start_frame=1,
            end_frame=3,
            fps=24,
            mirror=False,
            foot_locking=False,
        )
    except Exception as exc:  # pragma: no cover — explicit failure path
        print(f'  ❌ run_motion_retargeting failed: {exc}')
        return 1

    print(f'Result:             {len(manifest.tracks)} Peg keyframe tracks')
    for kf in manifest.tracks:
        frames = [k.frame for k in kf.keyframes]
        values = [round(k.value, 2) for k in kf.keyframes]
        print(f'  • {kf.peg_node_path:<32} frames={frames}  {kf.transform_type}(values)={values}')

    # Try the optional SVG preview path — non-fatal if missing
    try:
        from reconstruction_core.retargeting_preview import generate_svg_previews  # type: ignore
        source_landmarks = {frame: poses.get_landmarks(frame) or {} for frame in (1, 2, 3)}
        generate_svg_previews(manifest, source_landmarks, out_dir)
        svg_files = list(out_dir.glob('preview_*.svg'))
        print(f'SVG previews:       {len(svg_files)} files in {out_dir}')
    except Exception as exc:  # pragma: no cover
        print(f'SVG preview:        skipped ({exc})')

    # Basic coverage validation
    expected_pegs = {m.peg_node_path for m in mappings}
    got_pegs = {kf.peg_node_path for kf in manifest.tracks}
    missing = expected_pegs - got_pegs
    if missing:
        print(f'  ❌ Missing peg tracks: {sorted(missing)}')
        return 2

    # NICELY VALIDATED: every mapping peg got at least one keyframe
    print('══════════════════════════════════════════════════════════════════')
    print('  STATUS:  pipelineBuilt=true  retargetingManifestGenerated=true')
    print('           harmonyApplied=false  nativePegVerified=false')
    print('  Honest limitation: Pegs are derived from synthetic landmark data;')
    print('  real MediaPipe video feed and Harmony bridge verification are')
    print('  out of scope for this demo.')
    print('══════════════════════════════════════════════════════════════════')
    return 0


if __name__ == '__main__':
    sys.exit(main())