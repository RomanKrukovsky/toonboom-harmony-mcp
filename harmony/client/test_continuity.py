"""
test_continuity.py — тесты оракула непрерывности и переверстки. Без Harmony.
"""

from __future__ import annotations

from continuity import (
    Bible,
    FrameBox,
    ShotManifest,
    Span,
    addr_key,
    check_shot,
    reframe_check,
)

BIBLE = Bible.from_dict({
    "characters": {
        "masha": {
            "palette": "MASHA_MAIN",
            "props": {
                "scarf_red": {"from": "e03s01", "to": "e04s12"},
                "glasses": {"from": "e01s01", "to": "e07s04",
                            "note": "broken on-screen in e07s04"},
                "glasses_taped": {"from": "e07s05"},
            },
        },
    },
})


def manifest(addr, props, palettes=("MASHA_MAIN",)):
    return ShotManifest(addr, {"masha": list(props)}, list(palettes))


# ---------------------------------------------------------------------------
# Адреса
# ---------------------------------------------------------------------------

def test_addr_ordering_not_lexicographic():
    """e10 больше e9 — строкой это наоборот, и это классическая ловушка."""
    assert addr_key("e10s01") > addr_key("e9s99")
    assert addr_key("e02s10") > addr_key("e02s09")


def test_bad_addr_rejected():
    for bad in ("s01e02", "e1", "episode1shot2", ""):
        try:
            addr_key(bad)
            assert False, bad
        except ValueError:
            pass


def test_span_boundaries_inclusive():
    s = Span("e03s01", "e04s12")
    assert s.contains("e03s01") and s.contains("e04s12")
    assert not s.contains("e02s99") and not s.contains("e04s13")


def test_open_span():
    s = Span("e07s05")
    assert s.contains("e99s01")
    assert not s.contains("e07s04")


# ---------------------------------------------------------------------------
# Проверка шота
# ---------------------------------------------------------------------------

def test_correct_shot_is_clean():
    f = check_shot(BIBLE, manifest("e03s05", ["scarf_red", "glasses"]))
    assert f == [], f


def test_scarf_after_span_is_error():
    """Дословно из идеи №39: «персонаж не может носить шарф после
    четвёртой серии»."""
    f = check_shot(BIBLE, manifest("e05s01", ["scarf_red", "glasses"]))
    errs = [x for x in f if x["rule"] == "prop-out-of-span"]
    assert len(errs) == 1
    assert errs[0]["prop"] == "scarf_red"
    assert "e04s12" in errs[0]["message"]


def test_note_carried_into_message():
    """Библия объясняет ПОЧЕМУ: очки разбились в кадре — это в сообщении."""
    f = check_shot(BIBLE, manifest("e08s01", ["glasses", "glasses_taped"]))
    err = next(x for x in f if x["prop"] == "glasses")
    assert "broken on-screen" in err["message"]


def test_missing_required_prop_warned():
    """В e08 у Маши обязаны быть заклеенные очки — их нет, предупреждаем."""
    f = check_shot(BIBLE, manifest("e08s01", []))
    missing = {x["prop"] for x in f if x["rule"] == "prop-missing"}
    assert "glasses_taped" in missing
    assert "scarf_red" not in missing     # шарф в e08 уже не обязателен


def test_unknown_prop_is_info_not_error():
    """Оракул не выдумывает правил: чего нет в библии — «неизвестно»."""
    f = check_shot(BIBLE, manifest("e03s05", ["scarf_red", "glasses", "hat"]))
    hat = next(x for x in f if x.get("prop") == "hat")
    assert hat["rule"] == "unknown-prop"
    assert hat["severity"] == "info"


def test_unknown_character_is_info():
    m = ShotManifest("e01s01", {"stranger": ["coat"]}, [])
    f = check_shot(BIBLE, m)
    assert all(x["severity"] == "info" for x in f
               if x["rule"] == "unknown-character")


def test_missing_palette_warned():
    f = check_shot(BIBLE, manifest("e03s05", ["scarf_red", "glasses"],
                                   palettes=()))
    assert any(x["rule"] == "palette-missing" for x in f)


def test_bible_self_validation():
    bad = Bible.from_dict({"characters": {"x": {"props": {
        "p1": {"from": "e05s01", "to": "e03s01"},
        "p2": {"from": "garbage"},
    }}}})
    errs = bad.validate()
    assert len(errs) == 2
    assert any("before it starts" in e for e in errs)


def test_good_bible_validates_clean():
    assert BIBLE.validate() == []


# ---------------------------------------------------------------------------
# Переверстка формата (№56)
# ---------------------------------------------------------------------------

def test_centre_action_survives_vertical():
    boxes = {"masha": FrameBox(0.40, 0.1, 0.60, 0.9)}
    assert reframe_check(boxes, target_aspect=9 / 16) == []


def test_side_action_needs_restage():
    """Персонаж у левого края 16:9 в вертикали не виден вовсе —
    и отчёт говорит «переставь камеру», а не «обрежь»."""
    boxes = {"masha": FrameBox(0.05, 0.1, 0.25, 0.9)}
    f = reframe_check(boxes, target_aspect=9 / 16)
    assert len(f) == 1
    assert "restage" in f[0]["message"]
    assert "crop" in f[0]["message"]


def test_square_keeps_more_than_vertical():
    boxes = {"a": FrameBox(0.30, 0.1, 0.70, 0.9)}
    assert reframe_check(boxes, target_aspect=1.0) == []
    assert reframe_check(boxes, target_aspect=9 / 16) != []


def test_same_aspect_never_flags():
    boxes = {"a": FrameBox(0.0, 0.0, 1.0, 1.0)}
    assert reframe_check(boxes, target_aspect=16 / 9) == []


def test_bad_aspect_rejected():
    try:
        reframe_check({}, target_aspect=0)
        assert False
    except ValueError:
        pass


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
