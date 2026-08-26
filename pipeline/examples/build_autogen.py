"""Полный автогенератор: машина сама рисует персонажа (8 ракурсов, лицо)
и сама собирает профессиональный риг. Ноль ручного арта.

  <venv>/bin/python pipeline/examples/build_autogen.py
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from pipeline.moho.emit import emit  # noqa: E402
from pipeline.moho.extract import extract_from_file  # noqa: E402
from pipeline.riggen.artgen import (BROW_STATES, EYE_STATES, FACE_VIEWS,
                                    HEAD_VIEWS, MOUTH_VIEWS, PHONEMES,
                                    generate_all_vector_art)  # noqa: E402
from pipeline.riggen.build import build_rig  # noqa: E402
from pipeline.tools.qa_check import qa_rig  # noqa: E402
from pipeline.tools.structural_audit import audit  # noqa: E402
from pipeline.examples.build_dial_demo import JOINTS  # noqa: E402

OUT = REPO / "output/riggen"


def main() -> int:
    print("1) Генерирую векторный арт персонажа (MeshLayer / Безье-геометрия)...")
    art = generate_all_vector_art()

    center = [200, 135]
    mouth_center = [200, 163]

    spec = {
        "name": "autogen_char",
        "canvas": {"width": 400, "height": 600},
        "joints": JOINTS,
        "parts": [
            {"id": p, "name": p, "type": "mesh", "mesh": art["body"][p], "bone": bone,
             "center": c}
            for p, bone, c in [
                ("LArm", "UpperArm L", [136, 274]),
                ("RArm", "UpperArm R", [264, 274]),
                ("LLeg", "Thigh L", [183, 443]),
                ("RLeg", "Thigh R", [217, 443]),
                ("Torso", "Body", [200, 272]),
            ]
        ],
        "flexi": ["LowerArm L", "LowerArm R", "Shin L", "Shin R"],
        "bone_actions": [
            {"action": "Body Squash", "bone": "Body", "channel": "scale",
             "vals": [1.0, 0.75, 1.25]},
            {"action": "Arm Bend L", "bone": "LowerArm L", "channel": "angle",
             "vals": [0.0, -1.2, 1.2]},
            {"action": "Arm Bend R", "bone": "LowerArm R", "channel": "angle",
             "vals": [0.0, -1.2, 1.2]},
            {"action": "Leg Bend L", "bone": "Shin L", "channel": "angle",
             "vals": [0.0, -1.5, 0.5]},
            {"action": "Leg Bend R", "bone": "Shin R", "channel": "angle",
             "vals": [0.0, -1.5, 0.5]},
            {"action": "Eyes Look X", "bone": "Head", "channel": "angle",
             "vals": [0.0, -0.6, 0.6], "spread_deg": 40.0,
             "dial_id": "Eyes Look X Dial"},
            {"action": "Eyes Look Y", "bone": "Head", "channel": "angle",
             "vals": [0.0, -0.5, 0.5], "spread_deg": 35.0,
             "dial_id": "Eyes Look Y Dial"},
        ],
        "simple_switches": [
            {
                "id": "Hand L",
                "name": "Hand L",
                "bone": "LowerArm L",
                "action": "Hand Switch L",
                "states": art["hands"]["L"],
                "center_by_state": {p: [136, 330] for p in art["hands"]["L"]},
            },
            {
                "id": "Hand R",
                "name": "Hand R",
                "bone": "LowerArm R",
                "action": "Hand Switch R",
                "states": art["hands"]["R"],
                "center_by_state": {p: [264, 330] for p in art["hands"]["R"]},
            },
        ],
        "head_turn": {
            "bone": "Head",
            "states": {v: art["heads"][v] for v in HEAD_VIEWS},
            "center_by_state": {v: center for v in HEAD_VIEWS},
            "face": {
                "mouth": {
                    "views": MOUTH_VIEWS,
                    "states": {p: art["mouths"][p] for p in PHONEMES},
                    "center_by_state": {p: mouth_center for p in PHONEMES},
                },
                "eyes": {
                    "views": FACE_VIEWS,
                    "masking": 2,
                    "group_mask": 2,
                    "states_by_view": {
                        v: {s: art["eyes"][(s, v)] for s in EYE_STATES}
                        for v in FACE_VIEWS},
                    "centers_by_view": {
                        v: {s: [200, 128] for s in EYE_STATES}
                        for v in FACE_VIEWS},
                },
                "brows": {
                    "views": FACE_VIEWS,
                    "states_by_view": {
                        v: {s: art["brows"][(s, v)] for s in BROW_STATES}
                        for v in FACE_VIEWS},
                    "centers_by_view": {
                        v: {s: [200, 112] for s in BROW_STATES}
                        for v in FACE_VIEWS},
                },
            },
        },
    }

    print("2) Собираю векторный риг по стандарту V1...")
    rig = build_rig(spec)
    verdict, lines = qa_rig(rig)
    print(f"QA: [{verdict}]")
    for line in lines:
        print(f"  {line}")
    if verdict == "FAIL":
        return 1

    out = OUT / "autogen_char_fixed.moho"
    emit(rig, str(out))
    print(f"3) .moho: {out} ({out.stat().st_size} байт)")

    r2 = extract_from_file(str(out))
    switches = [p for p in r2.walk_parts() if p.type == "switch"]
    head = next(p for p in switches if p.name == "Head")
    meshes = [p for p in r2.walk_parts() if p.type == "mesh"]
    print(f"4) контроль: видов головы={len(head.switch_states)}, "
          f"свитчей лица={len(switches) - 1}, векторных мешей={len(meshes)}, "
          f"связей={len(r2.dial_links)}, костей={len(r2.bones)}")
    emit(r2, "/tmp/autogen_rt.moho")
    ok, _problems = audit(str(out), "/tmp/autogen_rt.moho")
    print(f"5) round-trip audit: {'PASS' if ok else 'FAIL'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
