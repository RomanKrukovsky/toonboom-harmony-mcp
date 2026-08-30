"""Unit tests for the declarative topology pipeline.

Covers: topology_spec round-trip, topology_solver joint placement,
secondary_motion keyframe generation, mesh_composer geometry build,
topology_translator LLM description parsing, topology_compiler
end-to-end compile.
"""
from __future__ import annotations

import json
import math
import tempfile
import unittest
from pathlib import Path

from pipeline.pir.schema import Bone
from pipeline.riggen.mesh_composer import (
    mesh_dict_from_spec,
    mesh_part_from_spec,
)
from pipeline.riggen.secondary_motion import (
    _frames_in_cycle,
    _generate_swing_frames,
    apply_all,
    apply_to_bones,
    generate_chain_motion,
)
from pipeline.riggen.topology_compiler import (
    build_rig_from_topology,
    compile_topology_to_moho,
)
from pipeline.riggen.topology_solver import (
    attach_ik_constraints,
    solve_topology,
    to_moho_coords,
    weighted_binding_check,
)
from pipeline.riggen.topology_spec import (
    BoneSpec,
    DialActionSpec,
    DialSpec,
    JointSpec,
    MeshLayerSpec,
    PointBindingSpec,
    SecondaryMotionSpec,
    SwitchSpec,
    TopologySpec,
)
from pipeline.riggen.topology_translator import (
    description_to_topology,
    parse_description,
)


class TopologySpecRoundTripTests(unittest.TestCase):
    def test_round_trip_preserves_data(self):
        spec = TopologySpec(name="round_trip_hero")
        spec.joints.append(JointSpec(id="root", px=200, py=300))
        spec.bones.append(BoneSpec(
            id="Spine", parent_id=None, px=200, py=300, length=0.5, angle=0.0,
        ))
        spec.mesh_layers.append(MeshLayerSpec(
            id="torso", name="Torso", parent_bone="Spine",
            polygons=[[(0, 0), (10, 0), (10, 10), (0, 10)]],
            fill_rgb=(0.8, 0.4, 0.2), smoothness=0.3,
        ))
        spec.secondary_motion.append(SecondaryMotionSpec(
            name="Tail", root_bone="Spine", chain_bones=["Spine", "Tail1"],
            keyframe_count=8, lag=0.5, cycle_frames=24, amplitude=0.4,
        ))
        spec.palette["skin"] = (0.9, 0.7, 0.5)
        payload = spec.to_dict()
        rebuilt = TopologySpec.from_dict(payload)
        self.assertEqual(rebuilt.name, spec.name)
        self.assertEqual(len(rebuilt.joints), 1)
        self.assertEqual(len(rebuilt.bones), 1)
        self.assertEqual(len(rebuilt.mesh_layers), 1)
        self.assertEqual(len(rebuilt.secondary_motion), 1)
        self.assertEqual(rebuilt.palette["skin"], (0.9, 0.7, 0.5))
        self.assertEqual(rebuilt.secondary_motion[0].chain_bones,
                         spec.secondary_motion[0].chain_bones)

    def test_json_file_round_trip(self):
        spec = TopologySpec(name="disk_test")
        spec.joints.append(JointSpec(id="a", px=10, py=20))
        with tempfile.TemporaryDirectory() as td:
            path = str(Path(td) / "spec.json")
            spec.to_json_file(path)
            self.assertTrue(Path(path).is_file())
            loaded = TopologySpec.from_json_file(path)
            self.assertEqual(loaded.name, "disk_test")
            self.assertEqual(loaded.joints[0].px, 10.0)


class TopologySolverTests(unittest.TestCase):
    def test_to_moho_coords_inverts_y(self):
        x, y = to_moho_coords(200, 300, width=400, height=600)
        self.assertAlmostEqual(x, 0.0, places=4)
        self.assertAlmostEqual(y, 0.0, places=4)
        x, y = to_moho_coords(0, 0, width=400, height=600)
        # y=0 is top of canvas -> positive Moho y
        self.assertLess(x, 0.0)
        self.assertGreater(y, 0.0)

    def test_solve_topology_returns_ordered_bones(self):
        spec = TopologySpec(name="solver")
        spec.joints.extend([
            JointSpec(id="a", px=100, py=100),
            JointSpec(id="b", px=100, py=200),
        ])
        spec.bones.append(BoneSpec(
            id="root", parent_id=None, root_joint="a", tip_joint="b",
        ))
        spec.bones.append(BoneSpec(
            id="child", parent_id="root", root_joint="a", tip_joint="b",
        ))
        bones, abs_angles, root_world = solve_topology(spec)
        self.assertEqual([b.id for b in bones], ["root", "child"])
        self.assertIn("root", abs_angles)
        self.assertIn("child", abs_angles)
        self.assertAlmostEqual(root_world["root"][0],
                               to_moho_coords(100, 100, 400, 600)[0], places=4)

    def test_attach_ik_constraints(self):
        spec = TopologySpec(name="ik")
        spec.joints.append(JointSpec(id="a", px=100, py=100))
        spec.joints.append(JointSpec(id="b", px=100, py=200))
        spec.bones.append(BoneSpec(
            id="leg", parent_id=None, root_joint="a", tip_joint="b",
            ik_target="leg_tgt", ik_min=-0.1, ik_max=2.0,
        ))
        bones, _, _ = solve_topology(spec)
        attach_ik_constraints(bones, spec)
        leg = next(b for b in bones if b.id == "leg")
        self.assertTrue(leg.constraints)
        self.assertEqual(leg.target_bone, "leg_tgt")
        self.assertAlmostEqual(leg.min_constraint, -0.1)
        self.assertAlmostEqual(leg.max_constraint, 2.0)

    def test_weighted_binding_check_sums_to_one(self):
        spec = TopologySpec(name="wb")
        spec.bones.append(BoneSpec(id="A", parent_id=None, px=0, py=0))
        spec.bones.append(BoneSpec(id="B", parent_id="A", px=10, py=0))
        mesh = MeshLayerSpec(id="m", name="m", parent_bone="A",
                              polygons=[[(0, 0), (10, 0), (10, 10)]])
        mesh.bindings.append(PointBindingSpec(
            point_index=0, weights={"A": 0.6, "B": 0.4}))
        mesh.bindings.append(PointBindingSpec(
            point_index=1, weights={"B": 1.5}))
        spec.mesh_layers.append(mesh)
        errors = weighted_binding_check(spec)
        self.assertTrue(any("weights sum" in e for e in errors))


class SecondaryMotionTests(unittest.TestCase):
    def test_swing_frames_have_lag(self):
        frames = _generate_swing_frames(
            bone_count=4, keyframe_count=8,
            lag=0.5, amplitude=0.3, cycle_frames=24,
        )
        self.assertEqual(len(frames), 4)
        for angles in frames:
            self.assertEqual(len(angles), 8)
        # deeper bones have smaller amplitude (falloff)
        self.assertGreater(max(abs(a) for a in frames[0]),
                          max(abs(a) for a in frames[-1]))

    def test_frames_in_cycle_spreads_evenly(self):
        frames = _frames_in_cycle(cycle_frames=24, keyframe_count=5)
        self.assertEqual(frames, [0, 6, 12, 18, 24])

    def test_apply_to_bones_attaches_channel(self):
        spec = SecondaryMotionSpec(
            name="Tail", root_bone="T0", chain_bones=["T0", "T1"],
            keyframe_count=4, lag=0.5, cycle_frames=20, amplitude=0.4,
        )
        bones = [
            Bone(id="T0", parent=None, position=(0, 0), angle=0.0, length=0.2),
            Bone(id="T1", parent="T0", position=(0, 0.2), angle=0.0, length=0.2),
        ]
        new_bones = apply_to_bones(bones, spec)
        self.assertEqual(len(new_bones), 2)
        for b in new_bones:
            self.assertIsNotNone(b.angle_channel)

    def test_apply_all_preserves_bone_count(self):
        spec = TopologySpec(name="sa")
        spec.joints.append(JointSpec(id="a", px=100, py=100))
        spec.bones.append(BoneSpec(
            id="A", parent_id=None, root_joint="a", tip_joint="a"))
        bones, _, _ = solve_topology(spec)
        spec.secondary_motion.append(SecondaryMotionSpec(
            name="T", root_bone="A", chain_bones=["A"],
            keyframe_count=4, cycle_frames=12, amplitude=0.3,
        ))
        out = apply_all(bones, spec)
        self.assertEqual(len(out), 1)


class MeshComposerTests(unittest.TestCase):
    def test_mesh_dict_has_native_shape(self):
        spec = MeshLayerSpec(
            id="box", name="Box", parent_bone="A",
            polygons=[[(0, 0), (10, 0), (10, 10), (0, 10)]],
            fill_rgb=(0.5, 0.5, 0.5), smoothness=0.2,
        )
        parent_world = (0.0, 0.0)
        mesh = mesh_dict_from_spec(
            spec, parent_world, parent_bone_index=2,
            bone_index={"A": 2}, width=400, height=600,
        )
        self.assertEqual(mesh["type"], "Mesh")
        self.assertEqual(len(mesh["points"]), 4)
        self.assertEqual(len(mesh["curves"]), 1)
        self.assertEqual(len(mesh["shapes"]), 1)
        for p in mesh["points"]:
            self.assertEqual(p["parent"], 2)

    def test_weighted_binding_picks_dominant_bone(self):
        spec = MeshLayerSpec(
            id="mix", name="Mix", parent_bone="A",
            polygons=[[(0, 0), (10, 0)]],
            bindings=[PointBindingSpec(
                point_index=0, weights={"A": 0.3, "B": 0.7})],
        )
        parent_world = (0.0, 0.0)
        mesh = mesh_dict_from_spec(
            spec, parent_world, 0,
            bone_index={"A": 0, "B": 1}, width=400, height=600,
        )
        self.assertEqual(mesh["points"][0]["parent"], 1)


class TopologyTranslatorTests(unittest.TestCase):
    def test_parse_description_extracts_keywords(self):
        parsed = parse_description(
            "character called Forest Sprite slim with tail 6 bones with cape"
        )
        self.assertEqual(parsed.name, "Forest Sprite")
        self.assertEqual(parsed.proportion, "slim")
        self.assertEqual(parsed.has_tail, 6)
        self.assertTrue(parsed.has_cape)
        self.assertEqual(parsed.has_wings, 0)

    def test_parse_description_extracts_colors(self):
        parsed = parse_description(
            "slim with skin color #ffaa00 and hair #332211"
        )
        self.assertAlmostEqual(parsed.palette_overrides["skin"][0], 1.0, places=2)
        self.assertAlmostEqual(parsed.palette_overrides["skin"][1], 0.667, places=2)
        self.assertAlmostEqual(parsed.palette_overrides["skin"][2], 0.0, places=2)
        self.assertAlmostEqual(parsed.palette_overrides["hair"][0], 0.2, places=2)
        self.assertAlmostEqual(parsed.palette_overrides["hair"][1], 0.133, places=2)
        self.assertAlmostEqual(parsed.palette_overrides["hair"][2], 0.067, places=2)

    def test_parse_description_clamps_counts(self):
        parsed = parse_description("with tail 99 bones with wings 2")
        self.assertEqual(parsed.has_tail, 12)  # clamped
        self.assertEqual(parsed.has_wings, 2)

    def test_description_to_topology_biped_default(self):
        spec = description_to_topology("character named Default Hero")
        self.assertGreaterEqual(len(spec.bones), 15)
        self.assertEqual(len(spec.secondary_motion), 0)

    def test_description_to_topology_with_tail(self):
        spec = description_to_topology("with tail 6 bones")
        # tail joints + tail bones
        self.assertGreaterEqual(len([b for b in spec.bones
                                      if b.id.startswith("Tail")]), 6)
        self.assertEqual(len(spec.secondary_motion), 1)
        self.assertEqual(spec.secondary_motion[0].name, "Tail")

    def test_description_to_topology_with_cape(self):
        spec = description_to_topology("with cape")
        self.assertTrue(any(b.id.startswith("Cape") for b in spec.bones))
        self.assertTrue(any(m.name == "Cape" for m in spec.secondary_motion))

    def test_description_to_topology_with_wings(self):
        spec = description_to_topology("with wings 4")
        wing_bones = [b for b in spec.bones if b.id.startswith("Wing")]
        self.assertGreaterEqual(len(wing_bones), 8)  # 4 per side
        self.assertEqual(len(spec.secondary_motion), 2)  # L and R

    def test_description_to_topology_six_fingers(self):
        spec = description_to_topology("with six fingers")
        extras = [b for b in spec.bones if b.id.startswith("Extra")]
        self.assertEqual(len(extras), 2)  # one per hand

    def test_description_to_topology_horns(self):
        spec = description_to_topology("with horns")
        horns = [b for b in spec.bones if b.id.startswith("Horn")]
        self.assertEqual(len(horns), 4)  # 2 per side

    def test_description_to_topology_proportions(self):
        spec = description_to_topology("tall")
        # All joints have valid pixel coords
        for j in spec.joints:
            self.assertGreater(j.px, 0)
            self.assertLess(j.px, spec.canvas["width"])


class TopologyCompilerTests(unittest.TestCase):
    def test_build_rig_has_correct_bone_count(self):
        spec = description_to_topology("character named Treebeard with horns")
        rig = build_rig_from_topology(spec)
        # biped base 15 + horn base 4
        self.assertGreaterEqual(len(rig.bones), 19)
        self.assertEqual(len(rig.root_parts), 1)

    def test_compile_writes_moho(self):
        spec = description_to_topology("character named Smoke")
        with tempfile.TemporaryDirectory() as td:
            out = compile_topology_to_moho(spec, str(Path(td) / "smoke.moho"))
            self.assertTrue(Path(out).is_file())
            self.assertGreater(Path(out).stat().st_size, 1000)
            # topology.json sidecar
            sidecar = Path(out).with_suffix(".topology.json")
            self.assertTrue(sidecar.is_file())
            payload = json.loads(sidecar.read_text())
            self.assertEqual(payload["name"], "Smoke")

    def test_compile_with_weighted_binding_raises(self):
        spec = TopologySpec(name="bad")
        spec.bones.append(BoneSpec(id="A", parent_id=None, px=0, py=0))
        mesh = MeshLayerSpec(
            id="m", name="m", parent_bone="A",
            polygons=[[(0, 0), (10, 0)]],
            bindings=[PointBindingSpec(
                point_index=0, weights={"A": 0.5, "B": 0.3})],  # sums 0.8
        )
        spec.mesh_layers.append(mesh)
        with self.assertRaises(ValueError):
            build_rig_from_topology(spec)

    def test_compile_preserves_secondary_motion(self):
        spec = description_to_topology("with tail 4 bones")
        rig = build_rig_from_topology(spec)
        tail_bones = [b for b in rig.bones
                      if b.id.startswith("Tail") and b.angle_channel is not None]
        self.assertGreaterEqual(len(tail_bones), 4)


if __name__ == "__main__":
    unittest.main()
