"""
Left/right limb identity stability.

A top-down whole-body pose model labels keypoints `left_*` and `right_*`. Nothing in the
model guarantees those labels stay attached to the same physical limb across frames — and
when two limbs cross, they frequently do not. Temporal smoothing cannot repair this: a
label swap is not noise around a true position, it is the wrong position entirely, and
filtering it produces a smooth trajectory through a place the limb never was.

This matters downstream. Retargeting binds `left_ankle` to the left leg peg of a rig. If
the source labels swap mid-walk, the rig's legs cross incorrectly and no amount of
smoothing or easing will fix it, because the error is in the correspondence, not the curve.

Measured on the real cartoon walk-cycle fixture (153 frames, 1920x1080):

    pair       jumps>30px   swap-explained   left.x > right.x
    ankle          38          14 (37%)          80/153 (52%)
    hip            11           0 ( 0%)         153/153 (100%)
    wrist          25           0 ( 0%)         153/153 (100%)
    elbow          22           0 ( 0%)         153/153 (100%)
    shoulder       11           0 ( 0%)         153/153 (100%)

So the upper body is reliable and the legs are not, on this clip.

The metric is descriptive, not corrective. It does not reassign labels — doing so would
require deciding which limb is truly which, which this module has no basis for.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Sequence

LIMB_PAIRS: Dict[str, tuple] = {
    "shoulder": ("left_shoulder", "right_shoulder"),
    "elbow": ("left_elbow", "right_elbow"),
    "wrist": ("left_wrist", "right_wrist"),
    "hip": ("left_hip", "right_hip"),
    "ankle": ("left_ankle", "right_ankle"),
}

# A frame-to-frame move larger than this is treated as a candidate discontinuity worth
# explaining. Below it, a swap and a small genuine move are indistinguishable and the
# question is not interesting.
DEFAULT_JUMP_THRESHOLD_PX = 30.0

# A crossed interpretation must be at least this much cheaper than the straight one before
# it is called a swap. Requiring a 2x margin keeps ordinary fast motion from being
# misreported as an identity error.
SWAP_MARGIN = 0.5


def _distance(a: Dict[str, Any], b: Dict[str, Any]) -> float:
    return math.hypot(a["x"] - b["x"], a["y"] - b["y"])


def _usable(*points: Optional[Dict[str, Any]]) -> bool:
    return all(p is not None and p.get("observed") for p in points)


def measure_limb_identity(
    frames: Sequence[Dict[str, Any]],
    keypoint_index: Dict[str, int],
    jump_threshold_px: float = DEFAULT_JUMP_THRESHOLD_PX,
) -> Dict[str, Any]:
    """
    Assess whether each left/right pair keeps a consistent identity across the sequence.

    `frames` are raw-keypoint records: {"frameIndex": int, "keypoints": [{index,x,y,observed}]}.

    For every pair of consecutive frames with a large move, compare two readings:
      straight = |L(t-1) -> L(t)| + |R(t-1) -> R(t)|
      crossed  = |L(t-1) -> R(t)| + |R(t-1) -> L(t)|
    When `crossed` is much cheaper, the labels most likely exchanged limbs.

    Also reports how consistently `left` sits on one side of `right`. A value near 50% means
    the side assignment is effectively a coin flip.
    """
    indexed: List[Dict[int, Dict[str, Any]]] = [
        {k["index"]: k for k in frame.get("keypoints", [])} for frame in frames
    ]

    pairs: Dict[str, Any] = {}
    for pair_name, (left_name, right_name) in LIMB_PAIRS.items():
        if left_name not in keypoint_index or right_name not in keypoint_index:
            continue
        li, ri = keypoint_index[left_name], keypoint_index[right_name]

        jumps = swaps = 0
        swap_frames: List[int] = []
        for position, (before, after) in enumerate(zip(indexed, indexed[1:]), start=1):
            la, ra = before.get(li), before.get(ri)
            lb, rb = after.get(li), after.get(ri)
            if not _usable(la, ra, lb, rb):
                continue
            straight = _distance(la, lb) + _distance(ra, rb)
            crossed = _distance(la, rb) + _distance(ra, lb)
            if max(_distance(la, lb), _distance(ra, rb)) <= jump_threshold_px:
                continue
            jumps += 1
            if crossed < straight * SWAP_MARGIN:
                swaps += 1
                swap_frames.append(frames[position].get("frameIndex", position))

        side_consistent = comparable = 0
        for frame in indexed:
            left, right = frame.get(li), frame.get(ri)
            if not _usable(left, right):
                continue
            comparable += 1
            if left["x"] > right["x"]:
                side_consistent += 1

        # 1.0 = the left keypoint is always on the same side; 0.0 = always the other side.
        # 0.5 means the assignment carries no information.
        side_ratio = side_consistent / comparable if comparable else 0.0
        stability = abs(side_ratio - 0.5) * 2.0

        pairs[pair_name] = {
            "leftKeypoint": left_name,
            "rightKeypoint": right_name,
            "largeJumps": jumps,
            "swapExplainedJumps": swaps,
            "swapRatio": round(swaps / jumps, 4) if jumps else 0.0,
            "swapFrames": swap_frames,
            "comparableFrames": comparable,
            "leftOnRightSideRatio": round(side_ratio, 4),
            "sideStability": round(stability, 4),
            "identityReliable": bool(swaps == 0 and stability > 0.9),
        }

    unreliable = sorted(name for name, p in pairs.items() if not p["identityReliable"])
    return {
        "schemaVersion": "1.0.0",
        "kind": "LimbIdentityStability",
        "jumpThresholdPx": jump_threshold_px,
        "swapMargin": SWAP_MARGIN,
        "analyzedFrames": len(frames),
        "pairs": pairs,
        "unreliablePairs": unreliable,
        "allPairsReliable": not unreliable,
        "interpretation": (
            "A pair is reliable only when no large jump is better explained by a left/right "
            "exchange AND the left keypoint stays on a consistent side. Unreliable pairs must "
            "not be bound to per-side rig controls: the correspondence is wrong, and temporal "
            "smoothing cannot repair a label swap."
        ),
    }
