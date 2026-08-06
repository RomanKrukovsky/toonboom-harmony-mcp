"""
test_rig_ci.py — тесты CI ригов: кинематика, разрывы, растяжения. Без Harmony.
"""

from __future__ import annotations

import math

from rig_ci import Pose, _fk_positions, check_joints, check_stretch, run_rig_ci, standard_stress_poses
from rigging import Part, RigSpec, humanoid_spec


def arm() -> RigSpec:
    """Рука из трёх костей вдоль X: плечо(0,0) -> локоть(2,0) -> кисть(3.5,0)."""
    return RigSpec(
        "Arm",
        [Part("upper", pivot=(0, 0)),
         Part("lower", parent="upper", pivot=(2, 0)),
         Part("hand", parent="lower", pivot=(3.5, 0))],
        ["upper", "lower", "hand"],
    )


# ---------------------------------------------------------------------------
# Прямая кинематика
# ---------------------------------------------------------------------------

def test_rest_pose_matches_spec_pivots():
    w = _fk_positions(arm(), Pose("rest"))
    assert w["upper"][:2] == (0, 0)
    assert w["lower"][:2] == (2, 0)
    assert w["hand"][:2] == (3.5, 0)


def test_rotation_carries_children():
    """Плечо на 90° — локоть уходит вверх, на ту же длину кости."""
    w = _fk_positions(arm(), Pose("p", rotations={"upper": 90.0}))
    lx, ly, _ = w["lower"]
    assert abs(lx - 0) < 1e-9 and abs(ly - 2) < 1e-9
    hx, hy, _ = w["hand"]
    assert abs(hx - 0) < 1e-9 and abs(hy - 3.5) < 1e-9


def test_rotations_compose_down_the_chain():
    """Плечо 90 + локоть 90: кисть складывается назад."""
    w = _fk_positions(arm(), Pose("p", rotations={"upper": 90.0, "lower": 90.0}))
    hx, hy, ang = w["hand"]
    assert abs(hx - (-1.5)) < 1e-9 and abs(hy - 2) < 1e-9
    assert ang == 180.0


def test_rigid_rotation_preserves_bone_lengths():
    """Инвариант жёсткого рига: любые повороты не меняют длины костей."""
    spec = arm()
    for rot in ({"upper": 37}, {"lower": -120}, {"upper": 90, "lower": 45, "hand": 30}):
        w = _fk_positions(spec, Pose("p", rotations=rot))
        d1 = math.hypot(w["lower"][0] - w["upper"][0], w["lower"][1] - w["upper"][1])
        d2 = math.hypot(w["hand"][0] - w["lower"][0], w["hand"][1] - w["lower"][1])
        assert abs(d1 - 2.0) < 1e-9
        assert abs(d2 - 1.5) < 1e-9


# ---------------------------------------------------------------------------
# Разрывы и растяжения
# ---------------------------------------------------------------------------

def test_pure_rotation_never_tears():
    assert check_joints(arm(), Pose("p", rotations={"upper": 120, "lower": -120})) == []


def test_manual_offset_tears_joint():
    """Аниматор подвинул кисть на 0.5 — кисть оторвана от предплечья."""
    reports = check_joints(arm(), Pose("p", offsets={"hand": (0.5, 0.0)}))
    assert len(reports) == 1
    assert reports[0].part == "hand"
    assert abs(reports[0].gap - 0.5) < 1e-9


def test_offset_stretches_bone():
    f = check_stretch(arm(), Pose("p", offsets={"lower": (1.0, 0.0)}), max_scale=1.15)
    assert any(x["rule"] == "stretched" and x["part"] == "lower" for x in f)


def test_offset_toward_parent_compresses():
    f = check_stretch(arm(), Pose("p", offsets={"lower": (-1.0, 0.0)}), max_scale=1.15)
    assert any(x["rule"] == "compressed" and x["part"] == "lower" for x in f)


def test_small_offset_within_tolerance():
    """Допуск 15%: микросдвиги для акцентов легальны, риг не наручники."""
    f = check_stretch(arm(), Pose("p", offsets={"lower": (0.2, 0.0)}), max_scale=1.15)
    assert f == []


# ---------------------------------------------------------------------------
# Полный прогон
# ---------------------------------------------------------------------------

def test_clean_rig_passes_ci():
    rep = run_rig_ci(humanoid_spec("Alice"))
    assert rep.passed, rep.findings
    assert rep.poses_checked > 30    # rest + 2 общих + по 2 на сустав


def test_stress_poses_generated_from_spec():
    poses = standard_stress_poses(arm())
    names = {p.name for p in poses}
    assert "rest" in names
    assert "lower_max" in names and "lower_min" in names
    assert "all_plus_45" in names


def test_broken_pose_fails_ci_with_readable_report():
    bad = Pose("bad_hand", rotations={"upper": 90},
               offsets={"hand": (2.0, 0.0)})
    rep = run_rig_ci(arm(), poses=[bad])
    assert not rep.passed
    rules = {f["rule"] for f in rep.findings}
    assert "torn-joint" in rules
    torn = next(f for f in rep.findings if f["rule"] == "torn-joint")
    assert "detached" in torn["message"]
    assert torn["pose"] == "bad_hand"


def test_report_names_pose_for_every_finding():
    rep = run_rig_ci(arm(), poses=[Pose("x", offsets={"lower": (1.5, 0)})])
    assert all("pose" in f for f in rep.findings)


if __name__ == "__main__":
    import sys
    import traceback

    failures = 0
    for name, fn in sorted(globals().items()):
        if not name.startswith("test_") or not callable(fn):
            continue
        try:
            fn()
            print(f"  ok   {name}")
        except Exception:
            failures += 1
            print(f"  FAIL {name}")
            traceback.print_exc()
    print(f"\n{failures} failure(s)")
    sys.exit(1 if failures else 0)
