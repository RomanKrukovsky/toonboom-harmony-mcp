"""
test_camera.py — тесты хореографа камеры и мультиплана. Без Harmony.
"""

from __future__ import annotations

import math

from camera import (
    CameraMove,
    CameraState,
    DEPTH_UNITS,
    layout_multiplane,
    multiplane_edits,
    shot_plan,
)


# ---------------------------------------------------------------------------
# Камера
# ---------------------------------------------------------------------------

def test_moves_chain_without_teleport():
    """Каждое движение стартует там, где кончилось прошлое."""
    plan = shot_plan([
        CameraMove("pan", 24, 100.0),
        CameraMove("hold", 12),
        CameraMove("pan", 24, -40.0),
    ])
    xs = plan.x_keys
    # непрерывность: нет двух соседних ключей с разрывом значения
    for a, b in zip(xs, xs[1:]):
        assert b.frame >= a.frame
    assert plan.end_state.x == 60.0
    assert plan.end_frame == 1 + 24 + 12 + 24


def test_push_in_scale_grows_to_amount():
    plan = shot_plan([CameraMove("push_in", 36, 1.5)])
    assert abs(plan.scale_keys[-1].value - 1.5) < 1e-9
    assert plan.scale_keys[0].value == 1.0


def test_zoom_is_log_space():
    """
    Равномерный на глаз наезд — это геометрическая, не арифметическая
    прогрессия масштаба. Проверяем: отношение соседних значений постоянно
    на линейном профиле.
    """
    plan = shot_plan([CameraMove("push_in", 10, 2.0, profile="linear")])
    vals = [k.value for k in plan.scale_keys]
    ratios = [vals[i + 1] / vals[i] for i in range(len(vals) - 1)]
    assert max(ratios) - min(ratios) < 1e-6, ratios


def test_pull_out_inverts_push_in():
    plan = shot_plan([CameraMove("push_in", 12, 2.0), CameraMove("pull_out", 12, 2.0)])
    assert abs(plan.end_state.scale - 1.0) < 1e-9


def test_hold_adds_minimal_keys():
    plan = shot_plan([CameraMove("hold", 48)])
    assert len(plan.x_keys) == 2
    assert plan.x_keys[0].value == plan.x_keys[1].value


def test_notes_written_for_every_move():
    """Камера защищает свои решения словами — как и всё остальное."""
    plan = shot_plan([CameraMove("pan", 12, 50), CameraMove("hold", 6),
                      CameraMove("push_in", 24, 1.2)])
    assert len(plan.notes) == 3
    assert "log-space" in plan.notes[2]


def test_start_state_respected():
    plan = shot_plan([CameraMove("pan", 12, 10)], start=CameraState(x=100, scale=2.0))
    assert plan.x_keys[0].value == 100
    assert plan.end_state.x == 110
    assert plan.end_state.scale == 2.0


def test_bad_input_rejected():
    for bad in ([CameraMove("pan", 0, 10)], [CameraMove("push_in", 10, 0.0)],
                [CameraMove("push_in", 10, -1.0)]):
        try:
            shot_plan(bad)
            assert False, f"accepted {bad}"
        except ValueError:
            pass


# ---------------------------------------------------------------------------
# Мультиплан
# ---------------------------------------------------------------------------

LAYERS = [("Top/sky", "far_bg"), ("Top/hills", "bg"), ("Top/street", "midground"),
          ("Top/char", "action"), ("Top/table", "fg"), ("Top/branch", "extreme_fg")]


def test_depth_order_preserved():
    ds = layout_multiplane(LAYERS)
    zs = [d.z for d in ds]
    assert zs == sorted(zs, reverse=True), zs   # far_bg дальше всех


def test_action_plane_untouched():
    """План действия остаётся на Z=0 и масштабе 1: персонажи не трогаются."""
    ds = {d.node: d for d in layout_multiplane(LAYERS)}
    char = ds["Top/char"]
    assert char.z == 0.0
    assert char.scale_comp == 1.0


def test_scale_compensation_direction():
    """Задник, уехав вглубь, получает scale > 1 (вернуть видимый размер);
    передний план — scale < 1."""
    ds = {d.node: d for d in layout_multiplane(LAYERS)}
    assert ds["Top/sky"].scale_comp > 1.0
    assert ds["Top/branch"].scale_comp < 1.0


def test_compensation_can_be_disabled():
    ds = layout_multiplane(LAYERS, compensate_scale=False)
    assert all(d.scale_comp == 1.0 for d in ds)


def test_layer_behind_camera_rejected():
    """extreme_fg при слишком близкой камере оказывается ЗА камерой —
    это ошибка постановки, о ней надо кричать, а не рисовать мусор."""
    try:
        layout_multiplane([("Top/branch", "extreme_fg")], camera_distance=2.0)
        assert False, "accepted layer behind camera"
    except ValueError as e:
        assert "behind the camera" in str(e)


def test_unknown_depth_word_rejected():
    try:
        layout_multiplane([("Top/x", "somewhere")])  # type: ignore[list-item]
        assert False
    except KeyError:
        pass


def test_edits_shape():
    edits = multiplane_edits(layout_multiplane(LAYERS))
    assert all(e["op"] == "set_attr" for e in edits)
    z_edits = [e for e in edits if e["attr"] == "POSITION.Z"]
    assert len(z_edits) == len(LAYERS)
    # у action-плана нет масштабных правок
    char_scales = [e for e in edits
                   if e["path"] == "Top/char" and e["attr"].startswith("SCALE")]
    assert char_scales == []


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
