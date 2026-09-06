"""Deterministic Animation Planner for Moho (Stage 2).

Converts creative text briefs, dialogue/lyrics, and camera constraints
into a structured, deterministic AnimationPlanJSON with SHA-256 fingerprint.
"""
from __future__ import annotations

import hashlib
import json
import re
from typing import Any, Optional

from .lipsync import text_to_phonemes


def compute_plan_fingerprint(plan: dict[str, Any]) -> str:
    """Compute deterministic SHA-256 fingerprint for canonical plan representation."""
    canonical = json.dumps(plan, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class AnimationPlanner:
    """Builds comprehensive animation plans from high-level creative briefs."""

    @classmethod
    def plan_from_brief(
        cls,
        brief: str,
        duration_frames: int = 120,
        fps: int = 24,
        emotion: str = "neutral",
        motion_style: str = "default",
        dialogue: Optional[str] = None,
        lyrics: Optional[str] = None,
        dialogue_lines: Optional[list[dict[str, Any]]] = None,
        language: str = "en",
        camera_constraints: str = "static",
    ) -> dict[str, Any]:
        duration_frames = max(12, int(duration_frames))
        fps = max(12, int(fps))
        lower_brief = brief.lower()

        # 1. Infer emotion if not explicitly specified as non-neutral
        resolved_emotion = emotion.lower()
        if resolved_emotion == "neutral":
            if any(k in lower_brief for k in ["happy", "smile", "laugh", "joy", "cheerful"]):
                resolved_emotion = "happy"
            elif any(k in lower_brief for k in ["sad", "cry", "grief", "depressed", "sorrow"]):
                resolved_emotion = "sad"
            elif any(k in lower_brief for k in ["angry", "mad", "furious", "rage", "scowl"]):
                resolved_emotion = "angry"
            elif any(k in lower_brief for k in ["surprised", "gasp", "shock", "astonished"]):
                resolved_emotion = "surprised"

        # 2. Timeline Beats
        mid_frame = duration_frames // 2
        beats = [
            {"beat": 1, "description": "Anticipation / Enter", "frame": max(1, fps // 2)},
            {"beat": 2, "description": "Main Performance", "frame": mid_frame},
            {"beat": 3, "description": "Settle / Exit", "frame": max(mid_frame + 1, duration_frames - max(6, fps // 3))},
        ]

        # 3. Actions (Locomotion & Idle)
        actions: list[dict[str, Any]] = []
        is_run = any(k in lower_brief for k in ["run", "sprint", "dash", "hurry", "rush"])
        is_walk = any(k in lower_brief for k in ["walk", "enter", "stroll", "step", "march"]) or not is_run
        has_stop = any(k in lower_brief for k in ["stop", "stand", "halt", "freeze", "pause", "wait"])

        if is_run:
            loco_end = min(duration_frames, 40) if has_stop else duration_frames
            actions.append({"type": "run", "startFrame": 1, "endFrame": loco_end})
            if loco_end < duration_frames:
                actions.append({"type": "idle", "startFrame": loco_end + 1, "endFrame": duration_frames})
        elif is_walk:
            loco_end = min(duration_frames, 40) if (has_stop or duration_frames > 60) else duration_frames
            actions.append({"type": "walk", "startFrame": 1, "endFrame": loco_end})
            if loco_end < duration_frames:
                actions.append({"type": "idle", "startFrame": loco_end + 1, "endFrame": duration_frames})
        else:
            actions.append({"type": "idle", "startFrame": 1, "endFrame": duration_frames})

        # 4. Key Poses
        key_poses = [
            {"frame": 1, "pose": "neutral"},
            {"frame": max(2, min(50, mid_frame)), "pose": resolved_emotion},
        ]

        # 5. Look Target / Gaze
        gaze_target = "camera"
        has_look_verb = any(k in lower_brief for k in ["look", "glance", "turn", "face", "stare", "gaze"])
        if has_look_verb and "left" in lower_brief:
            gaze_target = "left"
        elif has_look_verb and "right" in lower_brief:
            gaze_target = "right"
        elif has_look_verb and "up" in lower_brief:
            gaze_target = "up"
        elif has_look_verb and "down" in lower_brief:
            gaze_target = "down"

        gaze = [{"target": gaze_target, "startFrame": 1, "endFrame": duration_frames}]

        # 6. Natural Blinks
        blinks = []
        blink_interval = int(fps * (2.0 if motion_style == "snappy" else 3.0))
        for f in range(max(10, fps // 2), duration_frames - 6, blink_interval):
            blinks.append({"frame": f, "duration": 3})

        # 7. Lip-Sync / Phonemes
        speech_text = dialogue or lyrics
        if not speech_text:
            # Check for quotes in the brief
            quotes = re.findall(r'["\']([^"\']+)["\']', brief)
            if quotes:
                speech_text = quotes[0]
            elif "says" in lower_brief:
                match = re.search(r'says\s+([A-Za-z0-9_\s\.,!]+)', brief, re.IGNORECASE)
                if match:
                    speech_text = match.group(1).strip()

        phonemes: list[dict[str, Any]] = []
        if dialogue_lines:
            for line in dialogue_lines:
                cues = text_to_phonemes(
                    line.get("text", ""),
                    int(line.get("startFrame", 1)),
                    int(line.get("endFrame", 20)),
                    language=language,
                )
                phonemes.extend(cues)
        elif speech_text:
            speech_start = min(duration_frames - 10, max(6, mid_frame - 15))
            speech_end = min(duration_frames, speech_start + max(12, fps * 2))
            phonemes = text_to_phonemes(
                speech_text,
                start_frame=speech_start,
                end_frame=speech_end,
                language=language,
            )
        else:
            phonemes = [{
                "word": "Default",
                "startFrame": min(10, duration_frames - 5),
                "endFrame": min(25, duration_frames),
                "phonemeSequence": ["Rest", "A", "E", "O", "Rest"],
            }]

        # 8. Gestures & Hand Swaps
        hand_pose = "point"
        if any(k in lower_brief for k in ["wave", "waving"]):
            hand_pose = "open"
        elif any(k in lower_brief for k in ["fist", "angry", "clench"]):
            hand_pose = "fist"
        elif any(k in lower_brief for k in ["relax", "rest"]):
            hand_pose = "relaxed"

        gestures = [{"frame": min(20, mid_frame), "type": "hand-swap", "newHand": hand_pose}]

        # 9. IK Targets (Zero-slip foot pinning)
        ik_targets = [
            {"bone": "Foot_L", "lock": True, "frame": 1},
            {"bone": "Foot_R", "lock": True, "frame": 1},
        ]

        # 10. Secondary Motion
        magnitude = 0.5
        if motion_style == "expressive":
            magnitude = 0.8
        elif motion_style == "robotic":
            magnitude = 0.1
        secondary_motion = [{"type": "hair-follow-through", "magnitude": magnitude}]

        # 11. Camera Constraints
        camera_type = camera_constraints.lower()
        if camera_type == "static":
            if any(k in lower_brief for k in ["push in", "push-in", "zoom in", "close-up"]):
                camera_type = "push-in"
            elif any(k in lower_brief for k in ["whip pan", "whip-pan", "pan"]):
                camera_type = "whip-pan"
            elif any(k in lower_brief for k in ["tracking", "follow"]):
                camera_type = "tracking"

        camera_moves = []
        if camera_type == "push-in":
            camera_moves.append({"type": "push-in", "startFrame": 1, "endFrame": duration_frames, "scaleZ": 0.5})
        elif camera_type == "whip-pan":
            pan_start = max(1, mid_frame - 10)
            pan_end = min(duration_frames, pan_start + 10)
            camera_moves.append({"type": "whip-pan", "startFrame": pan_start, "endFrame": pan_end, "offsetX": 0.8})
        elif camera_type == "tracking":
            camera_moves.append({"type": "tracking", "startFrame": 1, "endFrame": duration_frames, "target": "Character"})
        else:
            camera_moves.append({"type": "static", "startFrame": 1, "endFrame": duration_frames})

        # 12. Diagnostic / Inspection Frames
        diagnostic_frames = sorted(list({
            1,
            max(2, mid_frame // 2),
            mid_frame,
            min(duration_frames - 1, mid_frame + (duration_frames - mid_frame) // 2),
            duration_frames,
        }))

        plan: dict[str, Any] = {
            "scenes": [{"id": 1, "duration": duration_frames, "description": brief}],
            "beats": beats,
            "actions": actions,
            "keyPoses": key_poses,
            "transitions": [],
            "gaze": gaze,
            "blinks": blinks,
            "phonemes": phonemes,
            "gestures": gestures,
            "ikTargets": ik_targets,
            "secondaryMotion": secondary_motion,
            "camera": camera_moves,
            "diagnosticFrames": diagnostic_frames,
            "inspectionFrames": diagnostic_frames,
        }

        plan["fingerprint"] = compute_plan_fingerprint(plan)
        return plan
