"""
test_swaps.py — тесты подмены рисунков. Без Blender.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

from artwork import ArtPart, ArtSet
from drawings import Assignment
from swaps import (
    SwapGroup,
    assignments_to_timeline,
    discover_groups,
    non_swap_parts,
    swap_groups_spec,
)
from test_artwork import make_png


def art_with_mouths(tmp: Path, variants=("flat", "A", "O")) -> ArtSet:
    make_png(tmp / "torso.png")
    parts = [ArtPart("torso", "torso.png", None, (0.5, 0.9))]
    for v in variants:
        make_png(tmp / f"mouth_{v}.png", 40, 30)
        parts.append(ArtPart(f"mouth__{v}", f"mouth_{v}.png", "torso",
                             (0.5, 0.5), attach=(0.0, 0.5), depth=-0.3))
    return ArtSet("hero", parts, tmp)


# ---------------------------------------------------------------------------
# Обнаружение групп
# ---------------------------------------------------------------------------

def test_groups_discovered_from_names():
    with tempfile.TemporaryDirectory() as d:
        gs = discover_groups(art_with_mouths(Path(d)))
        assert len(gs) == 1
        assert gs[0].name == "mouth"
        assert gs[0].members == ["mouth__A", "mouth__O", "mouth__flat"]


def test_plain_parts_are_not_groups():
    with tempfile.TemporaryDirectory() as d:
        art = art_with_mouths(Path(d))
        assert [p.name for p in non_swap_parts(art)] == ["torso"]


def test_single_variant_group_rejected():
    """Группа из одного варианта — это опечатка в имени файла, а не
    группа. Молча создать её значит спрятать ошибку."""
    with tempfile.TemporaryDirectory() as d:
        try:
            discover_groups(art_with_mouths(Path(d), variants=("flat",)))
            assert False
        except ValueError as e:
            assert "nothing to swap" in str(e)


def test_trailing_separator_rejected():
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        make_png(tmp / "a.png")
        art = ArtSet("x", [ArtPart("mouth__", "a.png", None, (0.5, 0.5))], tmp)
        try:
            discover_groups(art)
            assert False
        except ValueError as e:
            assert "variant" in str(e)


# ---------------------------------------------------------------------------
# Таймлайн
# ---------------------------------------------------------------------------

def test_assignments_become_timeline():
    g = SwapGroup("mouth", ["mouth__flat", "mouth__A", "mouth__O"], "mouth__flat")
    tl = assignments_to_timeline(g, [Assignment(frame=5, drawing="A"),
                                     Assignment(frame=9, drawing="O")])
    assert tl == [{"frame": 5, "drawing": "mouth__A"},
                  {"frame": 9, "drawing": "mouth__O"}]


def test_timeline_sorted_by_frame():
    g = SwapGroup("mouth", ["mouth__A", "mouth__O"], "mouth__A")
    tl = assignments_to_timeline(g, [Assignment(frame=9, drawing="O"),
                                     Assignment(frame=2, drawing="A")])
    assert [x["frame"] for x in tl] == [2, 9]


def test_unknown_variant_raises():
    """«Рот не открылся на половине слов» — дефект, который надо увидеть
    сразу, а не искать на просмотре."""
    g = SwapGroup("mouth", ["mouth__A", "mouth__O"], "mouth__A")
    try:
        assignments_to_timeline(g, [Assignment(frame=1, drawing="EE")])
        assert False
    except KeyError as e:
        assert "EE" in str(e)


def test_assignments_past_end_dropped():
    g = SwapGroup("mouth", ["mouth__A", "mouth__O"], "mouth__A")
    tl = assignments_to_timeline(g, [Assignment(frame=5, drawing="A"),
                                     Assignment(frame=500, drawing="O")],
                                 frame_end=48)
    assert [x["frame"] for x in tl] == [5]


# ---------------------------------------------------------------------------
# Полная спека
# ---------------------------------------------------------------------------

def test_spec_includes_all_groups():
    with tempfile.TemporaryDirectory() as d:
        art = art_with_mouths(Path(d))
        spec = swap_groups_spec(art, {"mouth": [Assignment(frame=3, drawing="A")]})
        assert len(spec) == 1
        assert spec[0]["members"] == ["mouth__A", "mouth__O", "mouth__flat"]
        assert spec[0]["timeline"] == [{"frame": 3, "drawing": "mouth__A"}]


def test_group_without_track_keeps_default():
    """Кисть меняется не всегда — группа без трека законна."""
    with tempfile.TemporaryDirectory() as d:
        spec = swap_groups_spec(art_with_mouths(Path(d)), {})
        assert spec[0]["timeline"] == []
        assert spec[0]["default"] in spec[0]["members"]


def test_track_without_group_raises():
    """Опечатка в имени трека молча отключила бы липсинк."""
    with tempfile.TemporaryDirectory() as d:
        try:
            swap_groups_spec(art_with_mouths(Path(d)),
                             {"mouths": [Assignment(frame=1, drawing="A")]})
            assert False
        except KeyError as e:
            assert "mouths" in str(e)


def test_lipsync_pipeline_end_to_end():
    """Фонемы -> кадры -> канал рта -> спека подмены. Полная цепочка,
    ради которой этот модуль и написан."""
    from audio import align_phonemes_to_frames, lipsync_channel
    from drawings import Phoneme
    with tempfile.TemporaryDirectory() as d:
        art = art_with_mouths(Path(d), variants=("flat", "A", "E"))
        report = align_phonemes_to_frames(
            [Phoneme("AA", 0.0, 0.2), Phoneme("EE", 0.2, 0.45)], fps=24)
        ch = lipsync_channel(report, {"AA": "A", "EE": "E"}, default="flat")
        spec = swap_groups_spec(art, {"mouth": ch}, frame_end=48)
        drawings = [x["drawing"] for x in spec[0]["timeline"]]
        assert drawings[:2] == ["mouth__A", "mouth__E"]
        assert drawings[-1] == "mouth__flat", "рот не закрылся в конце"


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
