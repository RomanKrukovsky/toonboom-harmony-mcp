"""Тесты на генерацию векторных MeshLayer-ригов, привязку точек, маски и bone actions."""
from __future__ import annotations

import unittest
import tempfile
from pathlib import Path

from PIL import Image

from pipeline.pir.schema import Rig
from pipeline.riggen.artgen import generate_all_vector_art, HEAD_VIEWS, PHONEMES
from pipeline.riggen.build import build_rig
from pipeline.riggen.vector_shapes import (
    generate_head_skull_mesh, generate_eye_mesh, generate_brow_mesh,
    generate_mouth_mesh, generate_torso_mesh, generate_limb_mesh,
    make_point, make_curve, make_shape, assemble_mesh
)
from pipeline.moho.emit import emit, build_doc
from pipeline.moho.extract import extract, extract_from_file
from pipeline.tools.moho_format_validator import validate
from pipeline.tools.qa_check import qa_rig
from pipeline.tools.render_preview import render
from pipeline.examples.build_dial_demo import JOINTS


class TestVectorMeshRig(unittest.TestCase):
    def test_vector_shapes_building(self):
        head = generate_head_skull_mesh("Front", parent_bone=4)
        self.assertEqual(head["type"], "Mesh")
        self.assertGreater(len(head["points"]), 0)
        self.assertGreater(len(head["curves"]), 0)
        self.assertGreater(len(head["shapes"]), 0)
        # Проверяем, что parent установлен
        self.assertEqual(head["points"][0]["parent"], 4)
        self.assertEqual(head["points"][0]["width"]["val"], [1.0])
        self.assertEqual(head["points"][0]["color"]["type"], "Color")
        self.assertEqual(head["points"][0]["color_strength"]["type"], "Val")
        self.assertIn("points", head["curves"][0])
        self.assertNotIn("curve_points", head["curves"][0])
        self.assertEqual(head["curves"][0]["num_points"],
                         len(head["curves"][0]["points"]))
        self.assertIsInstance(head["points"][0]["curves"][0]["curve_points"], int)

        eye = generate_eye_mesh("R", state="open", parent_bone=4)
        self.assertGreater(len(eye["points"]), 0)
        self.assertGreater(len(eye["shapes"]), 0)

        mouth = generate_mouth_mesh("A", parent_bone=4)
        self.assertGreater(len(mouth["points"]), 0)

        torso = generate_torso_mesh(parent_bone=2)
        self.assertGreater(len(torso["points"]), 0)

    def test_full_vector_rig_assembly_and_qa(self):
        art = generate_all_vector_art()
        spec = {
            "name": "test_vector_char",
            "canvas": {"width": 400, "height": 600},
            "joints": JOINTS,
            "parts": [
                {"id": "Torso", "name": "Torso", "type": "mesh", "mesh": art["body"]["Torso"], "bone": "Body", "center": [200, 272]},
                {"id": "LArm", "name": "LArm", "type": "mesh", "mesh": art["body"]["LArm"], "bone": "UpperArm L", "center": [136, 274]},
                {"id": "RArm", "name": "RArm", "type": "mesh", "mesh": art["body"]["RArm"], "bone": "UpperArm R", "center": [264, 274]},
            ],
            "bone_actions": [
                {"action": "Body Squash", "bone": "Body", "channel": "scale", "vals": [1.0, 0.75, 1.25]},
                {"action": "Arm Bend L", "bone": "LowerArm L", "channel": "angle", "vals": [0.0, -1.2, 1.2]},
            ],
            "head_turn": {
                "bone": "Head",
                "states": {v: art["heads"][v] for v in HEAD_VIEWS},
                "center_by_state": {v: [200, 135] for v in HEAD_VIEWS},
                "face": {
                    "mouth": {
                        "views": ["Front"],
                        "states": {p: art["mouths"][p] for p in PHONEMES},
                        "center_by_state": {p: [200, 163] for p in PHONEMES},
                    }
                }
            }
        }
        rig = build_rig(spec)
        verdict, lines = qa_rig(rig)
        self.assertEqual(verdict, "PASS", f"QA failed: {lines}")

        # Проверка групп костей
        bg = rig.extras.get("bones_groups")
        self.assertIsNotNone(bg)
        self.assertGreaterEqual(len(bg), 3)

        # Проверка генерации документа
        doc = build_doc(rig)
        self.assertEqual(len(doc["layers"]), 1)
        skel = doc["layers"][0]["skeleton"]
        self.assertIn("bones_groups", skel)
        self.assertEqual(len(skel["bones_groups"]), len(bg))
        mesh_layers = []

        def collect_meshes(layers):
            for layer in layers:
                if layer.get("type") == "MeshLayer":
                    mesh_layers.append(layer)
                collect_meshes(layer.get("layers", []))

        collect_meshes(doc["layers"])
        self.assertGreater(len(mesh_layers), 0)
        self.assertTrue(all(layer.get("parent_bone") == -1
                            for layer in mesh_layers))
        self.assertTrue(all(any(point.get("parent", -1) >= 0
                                for point in layer["mesh"]["points"])
                            for layer in mesh_layers))

    def test_emit_and_validate_vector_moho(self):
        art = generate_all_vector_art()
        spec = {
            "name": "test_validate_char",
            "canvas": {"width": 400, "height": 600},
            "joints": JOINTS,
            "parts": [
                {"id": "Torso", "name": "Torso", "type": "mesh", "mesh": art["body"]["Torso"], "bone": "Body", "center": [200, 272]},
            ],
            "head_turn": {
                "bone": "Head",
                "states": {"Front": art["heads"]["Front"], "Back": art["heads"]["Back"]},
                "center_by_state": {"Front": [200, 135], "Back": [200, 135]},
            }
        }
        rig = build_rig(spec)
        out_path = "/tmp/test_vector_char.moho"
        emit(rig, out_path)

        ok, problems = validate(out_path)
        self.assertTrue(ok, f"Validation failed: {problems}")

        # Re-extraction round-trip
        r2 = extract_from_file(out_path)
        self.assertEqual(r2.name, "test_validate_char")
        meshes = [p for p in r2.walk_parts() if p.type == "mesh"]
        self.assertGreater(len(meshes), 0)

        doc = build_doc(rig)
        with tempfile.TemporaryDirectory() as tmp:
            preview = Path(tmp) / "preview.png"
            render(doc, Path(out_path), preview, 400, 600)
            colors = Image.open(preview).convert("RGB").getcolors(maxcolors=1_000_000)
            self.assertIsNotNone(colors)
            self.assertGreater(len(colors), 1, "векторный preview не должен быть пустым")

    def test_leg_ik_and_constraints(self):
        art = generate_all_vector_art()
        spec = {
            "name": "test_ik_char",
            "canvas": {"width": 400, "height": 600},
            "joints": JOINTS,
            "parts": [
                {"id": "Torso", "name": "Torso", "type": "mesh", "mesh": art["body"]["Torso"], "bone": "Body", "center": [200, 272]},
            ],
            "leg_ik": True,
        }
        rig = build_rig(spec)
        shin_l = next((b for b in rig.bones if b.id == "Shin L"), None)
        self.assertIsNotNone(shin_l)
        self.assertTrue(shin_l.constraints)
        self.assertEqual(shin_l.target_bone, "Target Leg L")

        target_l = next((b for b in rig.bones if b.id == "Target Leg L"), None)
        self.assertIsNotNone(target_l)
        self.assertTrue(target_l.ignored_by_ik)

        out_path = "/tmp/test_ik_char.moho"
        emit(rig, out_path)
        ok, problems = validate(out_path)
        self.assertTrue(ok, f"Validation failed: {problems}")

        r2 = extract_from_file(out_path)
        r2_shin = next((b for b in r2.bones if b.id == "Shin L"), None)
        self.assertIsNotNone(r2_shin)
        self.assertEqual(r2_shin.target_bone, "Target Leg L")
        self.assertTrue(r2_shin.constraints)

    def test_hands_and_point_morphing(self):
        from pipeline.riggen.vector_shapes import generate_hand_mesh, HAND_POSES
        for pose in HAND_POSES:
            hand_l = generate_hand_mesh("L", pose=pose, parent_bone=6)
            self.assertEqual(hand_l["type"], "Mesh")
            self.assertGreater(len(hand_l["points"]), 0)
            self.assertGreater(len(hand_l["shapes"]), 0)

        art = generate_all_vector_art()
        self.assertIn("hands", art)
        self.assertEqual(len(art["hands"]["L"]), len(HAND_POSES))
        self.assertEqual(len(art["hands"]["R"]), len(HAND_POSES))

        # Проверка point actions на руках/ногах
        larm_mesh = art["body"]["LArm"]
        has_action = any("actions" in pt.get("position", {}) for pt in larm_mesh["points"])
        self.assertTrue(has_action, "LArm должен содержать point morph actions для Arm Bend L")


if __name__ == "__main__":
    unittest.main()
