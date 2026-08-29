"""Real Moho Animation Engine - Injects keyframes into .moho files based on animation plans."""

from __future__ import annotations

import json
import math
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..moho.emit import emit
from ..moho.extract import extract_from_file
from ..pir.schema import Bone, Channel, Part, Rig


def load_rig(project_path: str) -> Rig:
    """Load a Rig from a .moho file."""
    return extract_from_file(project_path)


def save_rig(rig: Rig, project_path: str) -> str:
    """Save a Rig to a .moho file."""
    return emit(rig, project_path)


def find_bone(rig: Rig, name: str) -> Optional[Bone]:
    """Find a bone by name."""
    for bone in rig.bones:
        if bone.id == name:
            return bone
    return None


def add_angle_keyframes(bone: Bone, keyframes: List[Dict[str, Any]]) -> None:
    """Add angle keyframes to a bone."""
    existing_when = list(bone.angle_channel.when) if bone.angle_channel else [0]
    existing_val = list(bone.angle_channel.val) if bone.angle_channel else [bone.angle]
    
    pairs = dict(zip(existing_when, existing_val))
    for kf in keyframes:
        frame = int(kf["frame"])
        value = float(kf["value"])
        pairs[frame] = value
    
    sorted_pairs = sorted(pairs.items())
    bone.angle_channel = Channel(
        type="Val",
        when=[p[0] for p in sorted_pairs],
        val=[p[1] for p in sorted_pairs],
        interp=[{"im": 1, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0, "s": False, "t": 0} for _ in sorted_pairs]
    )


def add_pos_keyframes(bone: Bone, keyframes: List[Dict[str, Any]]) -> None:
    """Add position keyframes to a bone."""
    existing_when = list(bone.pos_channel.when) if bone.pos_channel else [0]
    existing_val = list(bone.pos_channel.val) if bone.pos_channel else [{"x": bone.position[0], "y": bone.position[1]}]
    
    pairs = {}
    for i, frame in enumerate(existing_when):
        if isinstance(existing_val[i], dict):
            pairs[int(frame)] = (existing_val[i]["x"], existing_val[i]["y"])
        else:
            pairs[int(frame)] = bone.position
    
    for kf in keyframes:
        frame = int(kf["frame"])
        x = float(kf.get("x", bone.position[0]))
        y = float(kf.get("y", bone.position[1]))
        pairs[frame] = (x, y)
    
    sorted_pairs = sorted(pairs.items())
    bone.pos_channel = Channel(
        type="Vec2",
        when=[p[0] for p in sorted_pairs],
        val=[{"x": p[1][0], "y": p[1][1]} for p in sorted_pairs],
        interp=[{"im": 1, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0, "s": False, "t": 0} for _ in sorted_pairs]
    )


def add_switch_keyframes(rig: Rig, switch_name: str, keyframes: List[Dict[str, Any]]) -> None:
    """Add switch state keyframes to a switch layer."""
    def find_switch(part: Part) -> Optional[Part]:
        if part.type == "switch" and part.name == switch_name:
            return part
        for child in part.children:
            result = find_switch(child)
            if result:
                return result
        return None
    
    switch_part = None
    for root in rig.root_parts:
        switch_part = find_switch(root)
        if switch_part:
            break
    
    if not switch_part:
        return
    
    existing_when = list(switch_part.switch_channel.when) if switch_part.switch_channel else [0]
    existing_val = list(switch_part.switch_channel.val) if switch_part.switch_channel else [switch_part.switch_states[0] if switch_part.switch_states else ""]
    
    pairs = dict(zip(existing_when, existing_val))
    for kf in keyframes:
        frame = int(kf["frame"])
        state = str(kf["state"])
        if state in switch_part.switch_states:
            pairs[frame] = state
    
    sorted_pairs = sorted(pairs.items())
    switch_part.switch_channel = Channel(
        type="String",
        when=[p[0] for p in sorted_pairs],
        val=[p[1] for p in sorted_pairs],
        interp=[{"im": 0, "v1": 0.1, "v2": 0.5, "in": 1, "h": 0, "s": False, "t": 0} for _ in sorted_pairs]
    )


def apply_animation_plan(project_path: str, plan: Dict[str, Any], output_path: str) -> Dict[str, Any]:
    """Apply an animation plan to a .moho file."""
    rig = load_rig(project_path)
    errors = []
    
    # Apply walk cycle to legs
    walk_actions = plan.get("actions", [])
    for action in walk_actions:
        if action.get("type") == "walk":
            start = action.get("startFrame", 1)
            end = action.get("endFrame", 40)
            
            # Animate leg IK targets
            thigh_l = find_bone(rig, "Thigh L")
            thigh_r = find_bone(rig, "Thigh R")
            target_leg_l = find_bone(rig, "Target Leg L")
            target_leg_r = find_bone(rig, "Target Leg R")
            upper_arm_l = find_bone(rig, "UpperArm L")
            upper_arm_r = find_bone(rig, "UpperArm R")
            
            if thigh_l and target_leg_l:
                add_pos_keyframes(target_leg_l, [
                    {"frame": start, "x": target_leg_l.position[0], "y": target_leg_l.position[1]},
                    {"frame": start + (end-start)//4, "x": target_leg_l.position[0] + 0.3, "y": target_leg_l.position[1] + 0.1},
                    {"frame": start + (end-start)//2, "x": target_leg_l.position[0], "y": target_leg_l.position[1]},
                    {"frame": start + 3*(end-start)//4, "x": target_leg_l.position[0] - 0.1, "y": target_leg_l.position[1] - 0.05},
                    {"frame": end, "x": target_leg_l.position[0], "y": target_leg_l.position[1]},
                ])
                add_angle_keyframes(thigh_l, [
                    {"frame": start, "value": thigh_l.angle},
                    {"frame": start + (end-start)//4, "value": thigh_l.angle + math.radians(35)},
                    {"frame": start + (end-start)//2, "value": thigh_l.angle},
                    {"frame": start + 3*(end-start)//4, "value": thigh_l.angle - math.radians(15)},
                    {"frame": end, "value": thigh_l.angle},
                ])
            
            if thigh_r and target_leg_r:
                add_pos_keyframes(target_leg_r, [
                    {"frame": start, "x": target_leg_r.position[0], "y": target_leg_r.position[1]},
                    {"frame": start + (end-start)//2, "x": target_leg_r.position[0] + 0.3, "y": target_leg_r.position[1] + 0.1},
                    {"frame": end, "x": target_leg_r.position[0], "y": target_leg_r.position[1]},
                ])
                add_angle_keyframes(thigh_r, [
                    {"frame": start, "value": thigh_r.angle},
                    {"frame": start + (end-start)//2, "value": thigh_r.angle + math.radians(35)},
                    {"frame": end, "value": thigh_r.angle},
                ])
            
            # Animate arm swing
            if upper_arm_l:
                add_angle_keyframes(upper_arm_l, [
                    {"frame": start, "value": upper_arm_l.angle},
                    {"frame": start + (end-start)//4, "value": upper_arm_l.angle - math.radians(45)},
                    {"frame": start + (end-start)//2, "value": upper_arm_l.angle},
                    {"frame": start + 3*(end-start)//4, "value": upper_arm_l.angle + math.radians(20)},
                    {"frame": end, "value": upper_arm_l.angle},
                ])
            
            if upper_arm_r:
                add_angle_keyframes(upper_arm_r, [
                    {"frame": start, "value": upper_arm_r.angle},
                    {"frame": start + (end-start)//4, "value": upper_arm_r.angle + math.radians(45)},
                    {"frame": start + (end-start)//2, "value": upper_arm_r.angle},
                    {"frame": start + 3*(end-start)//4, "value": upper_arm_r.angle - math.radians(20)},
                    {"frame": end, "value": upper_arm_r.angle},
                ])
    
    # Apply blinks
    blinks = plan.get("blinks", [])
    eyes_bone = find_bone(rig, "Eyes Switch")
    if eyes_bone and blinks:
        blink_keyframes = []
        for blink in blinks:
            frame = blink.get("frame", 24)
            duration = blink.get("duration", 3)
            blink_keyframes.append({"frame": frame, "value": math.radians(-15)})
            blink_keyframes.append({"frame": frame + duration, "value": 0.0})
        add_angle_keyframes(eyes_bone, blink_keyframes)
    
    # Apply phonemes (mouth)
    phonemes = plan.get("phonemes", [])
    mouth_bone = find_bone(rig, "Mouth Switch")
    if mouth_bone and phonemes:
        phoneme_keyframes = []
        phoneme_to_angle = {"A": math.radians(36), "E": math.radians(12), "I": math.radians(12), 
                           "O": math.radians(36), "U": math.radians(36), "rest": 0.0}
        for ph in phonemes:
            start = ph.get("startFrame", 36)
            end = ph.get("endFrame", 40)
            sequence = ph.get("phonemeSequence", ["rest"])
            duration = max(1, (end - start) // max(len(sequence), 1))
            for i, p in enumerate(sequence):
                frame = start + i * duration
                angle = phoneme_to_angle.get(p, 0.0)
                phoneme_keyframes.append({"frame": frame, "value": angle})
        add_angle_keyframes(mouth_bone, phoneme_keyframes)
    
    # Apply gestures (hand switches)
    gestures = plan.get("gestures", [])
    for gesture in gestures:
        if gesture.get("type") == "hand-swap":
            frame = gesture.get("frame", 20)
            hand = gesture.get("newHand", "point")
            # Apply to both hand switches
            add_switch_keyframes(rig, "Hand Switch L", [{"frame": frame, "state": hand}])
            add_switch_keyframes(rig, "Hand Switch R", [{"frame": frame, "state": hand}])
    
    # Apply head turn
    gaze = plan.get("gaze", [])
    head_bone = find_bone(rig, "Head Switch")
    if head_bone and gaze:
        for g in gaze:
            target = g.get("target", "camera")
            start = g.get("startFrame", 1)
            end = g.get("endFrame", 36)
            if target == "camera":
                # Turn head toward camera over time
                add_angle_keyframes(head_bone, [
                    {"frame": start, "value": math.radians(90)},
                    {"frame": start + (end-start)//2, "value": math.radians(180)},
                    {"frame": end, "value": math.radians(90)},
                ])
    
    # Apply camera moves (as document-level animation)
    camera_moves = plan.get("camera", [])
    for cam in camera_moves:
        if cam.get("type") == "push-in":
            # Camera zoom would be document-level, not bone-level
            pass
    
    # Save the animated rig
    save_rig(rig, output_path)
    
    return {
        "status": "success",
        "output_path": output_path,
        "errors": errors,
    }


def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: python -m pipeline.tools.animate_moho <input.moho> <plan.json> <output.moho>"}))
        sys.exit(1)
    
    input_path = sys.argv[1]
    plan_path = sys.argv[2]
    output_path = sys.argv[3]
    
    with open(plan_path, "r") as f:
        plan = json.load(f)
    
    result = apply_animation_plan(input_path, plan, output_path)
    print(json.dumps(result))


if __name__ == "__main__":
    main()