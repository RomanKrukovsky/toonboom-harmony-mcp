"""Secondary motion generator: tail, hair strand, cape, ear dynamics.

Given a SecondaryMotionSpec + a list of bones, generate SmartBone-style
keyframes that make a chain swing with inertia. The keyframes are
written into each chain bone's anim_angle channel so the runtime
animator only has to "activate" the chain once.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

from ..pir.schema import Bone, Channel
from .topology_spec import SecondaryMotionSpec, TopologySpec


INTERP = {
    "im": 1, "v1": -1.0, "v2": -1.0,
    "in": 1, "h": 0, "s": False, "t": 0,
}


@dataclass
class MotionKeyframes:
    """One chain of generated keyframes. frames + angles match by index."""
    bone_id: str
    frames: list[int]
    angles: list[float]
    cycle_frames: int
    one_shot: bool

    def to_channel(self) -> Channel:
        return Channel(
            type="Val",
            when=list(self.frames),
            val=list(self.angles),
            interp=[dict(INTERP) for _ in self.frames],
        )


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _ease(t: float) -> float:
    """Cubic ease in/out. 0 -> 0, 1 -> 1, smooth at both ends."""
    return 0.5 * (1.0 - math.cos(math.pi * t))


def _generate_swing_frames(
    bone_count: int,
    keyframe_count: int,
    lag: float,
    amplitude: float,
    cycle_frames: int,
) -> list[list[float]]:
    """For each chain bone, produce a list of `keyframe_count` angles.

    The bones nearer the root swing first; downstream bones follow with
    `lag`-controlled phase delay and reduced amplitude."""
    if bone_count <= 0 or keyframe_count <= 0:
        return [[] for _ in range(bone_count)]
    if cycle_frames <= 0:
        cycle_frames = max(keyframe_count * 2, 12)
    out: list[list[float]] = []
    for i in range(bone_count):
        # Phase shift per bone: the deeper in the chain, the later the swing
        phase_shift = i * lag / max(bone_count - 1, 1)
        amp_falloff = 1.0 - 0.45 * (i / max(bone_count - 1, 1))
        angles: list[float] = []
        for k in range(keyframe_count):
            t = ((k + phase_shift) % keyframe_count) / keyframe_count
            swing = math.sin(2.0 * math.pi * t)
            # ease at the extremes
            eased = math.copysign(_ease(abs(swing)), swing)
            angles.append(round(eased * amplitude * amp_falloff, 4))
        out.append(angles)
    return out


def _frames_in_cycle(cycle_frames: int, keyframe_count: int) -> list[int]:
    """Spread `keyframe_count` frames evenly across `cycle_frames`."""
    if cycle_frames <= 0 or keyframe_count <= 0:
        return []
    return [
        int(round(i * cycle_frames / max(keyframe_count - 1, 1)))
        for i in range(keyframe_count)
    ]


def generate_chain_motion(
    spec: SecondaryMotionSpec,
) -> list[MotionKeyframes]:
    """Generate per-bone keyframes for one secondary motion chain.

    The result is a list ordered to match the chain_bones list."""
    angles_per_bone = _generate_swing_frames(
        bone_count=len(spec.chain_bones),
        keyframe_count=spec.keyframe_count,
        lag=spec.lag,
        amplitude=spec.amplitude,
        cycle_frames=spec.cycle_frames,
    )
    frames = _frames_in_cycle(spec.cycle_frames, spec.keyframe_count)
    return [
        MotionKeyframes(
            bone_id=bone_id,
            frames=list(frames),
            angles=angles,
            cycle_frames=spec.cycle_frames,
            one_shot=spec.cycle_frames == 0,
        )
        for bone_id, angles in zip(spec.chain_bones, angles_per_bone)
    ]


def apply_to_bones(
    bones: list[Bone],
    motion: SecondaryMotionSpec,
) -> list[Bone]:
    """Return a new bones list with anim_angle channels populated for
    every chain bone. Original bones are not mutated."""
    bone_index = {b.id: i for i, b in enumerate(bones)}
    new_bones = list(bones)
    keyframes_list = generate_chain_motion(motion)
    for kf in keyframes_list:
        if kf.bone_id not in bone_index:
            continue
        idx = bone_index[kf.bone_id]
        b = new_bones[idx]
        b = Bone(
            id=b.id, parent=b.parent,
            position=b.position, angle=b.angle, length=b.length,
            strength=b.strength,
            constraints=b.constraints,
            min_constraint=b.min_constraint,
            max_constraint=b.max_constraint,
            angle_keys=None,
            pos_keys=None,
            angle_channel=kf.to_channel(),
            pos_channel=b.pos_channel,
            pos_channel_raw=b.pos_channel_raw,
            scale_channel_raw=b.scale_channel_raw,
            extra_channels_raw=b.extra_channels_raw,
            anim_parent_raw=b.anim_parent_raw,
            offset_x=b.offset_x,
            offset_y=b.offset_y,
            dial_actions=b.dial_actions,
            is_dial=b.is_dial,
            is_flexi_endpoint=b.is_flexi_endpoint,
            flexi_pair=b.flexi_pair,
            flexi_chain=b.flexi_chain,
            hidden=b.hidden,
            shy=b.shy,
            ignored_by_ik=b.ignored_by_ik,
            target_bone=b.target_bone,
            ik_lock=b.ik_lock,
        )
        new_bones[idx] = b
    return new_bones


def apply_all(bones: list[Bone], spec: TopologySpec) -> list[Bone]:
    """Apply every SecondaryMotionSpec in the topology to the bones."""
    out = list(bones)
    for motion in spec.secondary_motion:
        out = apply_to_bones(out, motion)
    return out
