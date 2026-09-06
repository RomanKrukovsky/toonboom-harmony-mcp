"""Phoneme synthesis and lip-sync keyframe injection for Moho projects.

Supports:
1. Standard 6 distinct mouth shapes + Closed/Rest:
   - Rest / Closed (M, B, P, silence)
   - A (wide open, Ah)
   - E (stretched horizontal, Eh/Ee)
   - I (narrow teeth, Ih)
   - O (round, Oh)
   - U (pursed, Oo)
   - F_V (lip tuck, F/V)
2. Rule-based text-to-phonemes for English and Russian.
3. Rhubarb lip-sync cue ingestion and mapping.
4. Dual rig application:
   - Bone dials (Mouth Switch angle channel)
   - SwitchLayers (mouth switch String channel)
"""
from __future__ import annotations

import re
from typing import Any, Optional

from ..pir.schema import Bone, Channel, Part, Rig


# Dial index mapping for standard 6+1 humanoid mouth dial
PHONEME_TO_DIAL_INDEX = {
    "rest": 0,
    "closed": 0,
    "m_b_p": 0,
    "a": 1,
    "ai": 1,
    "o": 2,
    "i": 3,
    "u": 4,
    "e": 5,
    "f_v": 6,
    "fv": 6,
}

# Rhubarb phonetic mapping to standard 6+1 shapes
RHUBARB_MAP = {
    "x": "Rest",
    "a": "Closed",
    "b": "E",
    "c": "E",
    "d": "A",
    "e": "O",
    "f": "U",
    "g": "F_V",
    "h": "I",
}

INTERP_STEP = {"im": 0, "v1": 0.1, "v2": 0.5, "in": 1, "h": 0, "s": False, "t": 0}
INTERP_SMOOTH = {"im": 1, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0, "s": False, "t": 0}


def text_to_phonemes(
    text: str,
    start_frame: int,
    end_frame: int,
    language: str = "en",
) -> list[dict[str, Any]]:
    """Deterministically convert raw text/lyrics to a sequence of timed phonemes."""
    cleaned = re.sub(r"[^\w\s]", "", text.strip().lower())
    words = cleaned.split()
    if not words:
        return [{
            "word": "",
            "startFrame": start_frame,
            "endFrame": end_frame,
            "phonemeSequence": ["Rest"],
        }]

    total_duration = max(1, end_frame - start_frame)
    frames_per_word = max(4, total_duration // len(words))

    cues: list[dict[str, Any]] = []
    current_frame = start_frame

    for i, word in enumerate(words):
        word_start = current_frame
        word_end = min(end_frame, word_start + frames_per_word)
        current_frame = word_end

        seq = _word_to_phoneme_sequence(word, language=language)
        cues.append({
            "word": word,
            "startFrame": word_start,
            "endFrame": word_end,
            "phonemeSequence": seq,
        })

    return cues


def _word_to_phoneme_sequence(word: str, language: str = "en") -> list[str]:
    """Map letters and digraphs of a word to 6+1 mouth shapes."""
    if not word:
        return ["Rest"]

    seq: list[str] = ["Closed"]

    is_cyrillic = any("\u0400" <= ch <= "\u04ff" for ch in word)
    if is_cyrillic or language == "ru":
        vowel_map = {
            "а": "A", "я": "A",
            "о": "O", "ё": "O",
            "у": "U", "ю": "U",
            "э": "E", "е": "E",
            "и": "I", "ы": "I",
        }
        consonant_f_v = {"ф", "в"}
        consonant_closed = {"м", "б", "п"}

        for ch in word:
            if ch in vowel_map:
                seq.append(vowel_map[ch])
            elif ch in consonant_f_v:
                seq.append("F_V")
            elif ch in consonant_closed:
                seq.append("Closed")
            else:
                seq.append("E")
    else:
        # English rule-based phonemes
        vowels = {"a": "A", "e": "E", "i": "I", "o": "O", "u": "U", "y": "I"}
        idx = 0
        w_len = len(word)
        while idx < w_len:
            ch = word[idx]
            next_ch = word[idx + 1] if idx + 1 < w_len else ""
            two = ch + next_ch

            if two in {"th", "sh", "ch"}:
                seq.append("I")
                idx += 2
            elif two in {"oo"}:
                seq.append("U")
                idx += 2
            elif two in {"ee", "ea"}:
                seq.append("E")
                idx += 2
            elif two in {"ou", "ow"}:
                seq.append("O")
                idx += 2
            elif ch in {"f", "v"}:
                seq.append("F_V")
                idx += 1
            elif ch in {"m", "b", "p"}:
                seq.append("Closed")
                idx += 1
            elif ch in vowels:
                seq.append(vowels[ch])
                idx += 1
            elif ch in {"w", "q"}:
                seq.append("U")
                idx += 1
            else:
                seq.append("E")
                idx += 1

    # Remove immediate consecutive duplicates for cleaner animation
    deduped = [seq[0]]
    for item in seq[1:]:
        if item != deduped[-1]:
            deduped.append(item)
    deduped.append("Rest")
    return deduped


def rhubarb_cues_to_phonemes(
    rhubarb_json: list[dict[str, Any]],
    fps: int = 24,
) -> list[dict[str, Any]]:
    """Convert Rhubarb lip sync cue records to timed phoneme sequences."""
    cues: list[dict[str, Any]] = []
    for item in rhubarb_json:
        start_sec = float(item.get("start", 0.0))
        end_sec = float(item.get("end", start_sec + 0.1))
        val = str(item.get("value", "X")).lower()
        shape = RHUBARB_MAP.get(val, "Rest")
        start_f = max(0, int(round(start_sec * fps)))
        end_f = max(start_f + 1, int(round(end_sec * fps)))
        cues.append({
            "startFrame": start_f,
            "endFrame": end_f,
            "phonemeSequence": [shape],
        })
    return cues


def apply_phonemes_to_rig(
    rig: Rig,
    mouth_bone: Optional[Bone],
    phoneme_cues: list[dict[str, Any]],
) -> list[str]:
    """Inject phoneme keyframes into either bone dial or switch layer."""
    applied: list[str] = []

    # 1. Look for a Mouth SwitchLayer
    mouth_switch_part: Optional[Part] = next(
        (
            part for part in rig.walk_parts()
            if part.type == "switch"
            and any(k in part.name.lower() for k in ["mouth", "рот", "phoneme", "lips"])
        ),
        None,
    )

    if mouth_switch_part and mouth_switch_part.switch_states:
        # Apply to SwitchLayer using String step channel
        state_lookup = {st.casefold(): st for st in mouth_switch_part.switch_states}
        # Fallback aliases
        alias_map = {
            "closed": "rest",
            "m_b_p": "closed",
            "ai": "a",
            "fv": "f_v",
        }

        existing_when = list(mouth_switch_part.switch_channel.when) if mouth_switch_part.switch_channel else [0]
        existing_val = list(mouth_switch_part.switch_channel.val) if mouth_switch_part.switch_channel else [mouth_switch_part.switch_states[0]]
        pairs = dict(zip(existing_when, existing_val))

        for phrase in phoneme_cues:
            start = int(phrase.get("startFrame", 1))
            end = int(phrase.get("endFrame", start + 1))
            sequence = phrase.get("phonemeSequence", ["Rest"])
            if not sequence or end <= start:
                continue
            step = max(1, (end - start) // len(sequence))
            for idx, ph in enumerate(sequence):
                f = start + idx * step
                ph_norm = ph.casefold()
                target_state = state_lookup.get(ph_norm)
                if not target_state and ph_norm in alias_map:
                    target_state = state_lookup.get(alias_map[ph_norm])
                if not target_state:
                    # Pick closest or first state
                    target_state = mouth_switch_part.switch_states[0]
                pairs[f] = target_state

        sorted_pairs = sorted(pairs.items())
        mouth_switch_part.switch_channel = Channel(
            type="String",
            when=[pair[0] for pair in sorted_pairs],
            val=[pair[1] for pair in sorted_pairs],
            interp=[dict(INTERP_STEP) for _ in sorted_pairs],
        )
        applied.append(f"lipsync:switch_layer:{mouth_switch_part.name}")

    # 2. Also apply to Mouth Bone dial if present
    if mouth_bone:
        def _get_dial_val(bone: Bone, index: int, fallback: float = 0.0) -> float:
            for action in bone.dial_actions or []:
                pose = action.get("pose") or {}
                values = pose.get("val", [])
                if 0 <= index < len(values):
                    return float(values[index])
            return fallback

        existing_when = list(mouth_bone.angle_channel.when) if mouth_bone.angle_channel else [0]
        existing_val = list(mouth_bone.angle_channel.val) if mouth_bone.angle_channel else [mouth_bone.angle]
        bone_pairs = dict(zip(existing_when, existing_val))

        for phrase in phoneme_cues:
            start = int(phrase.get("startFrame", 1))
            end = int(phrase.get("endFrame", start + 1))
            sequence = phrase.get("phonemeSequence", ["Rest"])
            if not sequence or end <= start:
                continue
            step = max(1, (end - start) // len(sequence))
            for idx, ph in enumerate(sequence):
                f = start + idx * step
                norm = ph.casefold()
                dial_idx = PHONEME_TO_DIAL_INDEX.get(norm, 0)
                # Map high dial index down if dial has fewer states
                max_dials = max(len(a.get("pose", {}).get("val", [])) for a in (mouth_bone.dial_actions or [{}])) if mouth_bone.dial_actions else 1
                if max_dials > 1:
                    dial_idx = dial_idx % max_dials
                val = _get_dial_val(mouth_bone, dial_idx, fallback=mouth_bone.angle)
                bone_pairs[f] = val

        sorted_bone = sorted(bone_pairs.items())
        mouth_bone.angle_channel = Channel(
            type="Val",
            when=[pair[0] for pair in sorted_bone],
            val=[pair[1] for pair in sorted_bone],
            interp=[dict(INTERP_SMOOTH) for _ in sorted_bone],
        )
        applied.append(f"lipsync:bone_dial:{mouth_bone.id}")

    return applied
