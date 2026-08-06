"""
test_blender_host.py — тесты трансляции движок -> Blender. Без запуска Blender.

Проверяют СПЕЦИФИКАЦИЮ: что каналы движка корректно превращаются в
описание сцены, что ошибки ловятся до запуска хоста, что цветовое
пространство переводится. Сам контакт с Blender проверяет
smoke_blender.py — он медленный и требует установленного приложения.
"""

from __future__ import annotations

import json

from blender_host import (
    BChannel,
    BPart,
    BSceneSpec,
    channels_from_engine,
    keys_to_pairs,
)
from columns import Key, sample_profile


def demo_spec() -> BSceneSpec:
    return BSceneSpec(
        name="t", fps=24, frame_start=1, frame_end=10,
        resolution=(320, 240),
        parts=[BPart("torso", None, (0.0, 0.0),
                     [(-1, -1), (1, -1), (1, 1), (-1, 1)], (0.5, 0.5, 0.5))],
        channels=[BChannel("torso", "rot", [(1.0, 0.0), (10.0, 90.0)])])


# ---------------------------------------------------------------------------
# Трансляция каналов
# ---------------------------------------------------------------------------

def test_keys_to_pairs_preserves_values():
    keys = [Key(frame=1, value=0.0), Key(frame=5, value=2.5)]
    assert keys_to_pairs(keys) == [(1.0, 0.0), (5.0, 2.5)]


def test_channels_from_engine_splits_names():
    ch = channels_from_engine({"arm_near.rot": [Key(1, 0.0), Key(9, 45.0)]})
    assert len(ch) == 1
    assert ch[0].part == "arm_near" and ch[0].prop == "rot"


def test_channels_rsplit_handles_dotted_part_names():
    """Имя части может содержать точку (Top/rig.head). Разделять надо по
    ПОСЛЕДНЕЙ точке, иначе часть и свойство перепутаются местами."""
    ch = channels_from_engine({"rig.head.sy": [Key(1, 1.0)]})
    assert ch[0].part == "rig.head" and ch[0].prop == "sy"


def test_channel_without_dot_rejected():
    try:
        channels_from_engine({"headrot": [Key(1, 0.0)]})
        assert False
    except ValueError as e:
        assert "part.prop" in str(e)


def test_unsupported_prop_rejected():
    """Опечатка в имени свойства обязана падать здесь, а не тихо
    пропадать внутри Blender."""
    for bad in ("rotation", "sz", "opacity", "Rot"):
        try:
            channels_from_engine({f"a.{bad}": [Key(1, 0.0)]})
            assert False, bad
        except ValueError:
            pass


def test_all_supported_props_accepted():
    for prop in ("rot", "x", "y", "sx", "sy"):
        ch = channels_from_engine({f"p.{prop}": [Key(1, 0.0)]})
        assert ch[0].prop == prop


def test_easing_survives_translation():
    """Профиль изинга живёт в ЗНАЧЕНИЯХ плотных ключей. После перевода
    в пары значения обязаны остаться теми же — иначе Blender получит
    другой тайминг, чем задумано."""
    s = sample_profile("heavy_impact", 12)
    keys = [Key(frame=i + 1, value=v) for i, v in enumerate(s)]
    pairs = keys_to_pairs(keys)
    assert [p[1] for p in pairs] == list(s)
    # heavy_impact ускоряется: второй половина проходит больше первой
    mid = len(s) // 2
    assert (s[-1] - s[mid]) > (s[mid] - s[0])


# ---------------------------------------------------------------------------
# Сериализация спеки
# ---------------------------------------------------------------------------

def test_spec_roundtrips_through_json():
    """Спека уходит в Blender файлом. Всё, что в ней есть, обязано быть
    JSON-сериализуемым — иначе падение случится в самый неудобный
    момент, после сборки сцены."""
    data = json.loads(demo_spec().to_json())
    assert data["name"] == "t"
    assert data["parts"][0]["name"] == "torso"
    assert data["channels"][0]["prop"] == "rot"
    assert data["resolution"] == [320, 240]


def test_spec_has_standard_defaults():
    s = demo_spec()
    assert s.camera_ortho_scale > 0
    assert len(s.bg_color) == 3


def test_part_parent_reference_kept():
    p = BPart("arm", "torso", (0.3, 0.7), [(0, 0), (1, 0), (1, 1)],
              (0.9, 0.7, 0.3), depth=-0.2)
    d = json.loads(json.dumps({"p": p.__dict__}, default=str))
    assert d["p"]["parent"] == "torso"
    assert d["p"]["depth"] == -0.2


# ---------------------------------------------------------------------------
# Цветовое пространство
# ---------------------------------------------------------------------------

def test_linear_to_srgb_matches_blender_output():
    """Проверено на живом рендере: линейный (0.92,0.72,0.35) выходит в
    PNG как (246,221,160). Если эта функция врёт, все проверки цвета
    врут вместе с ней."""
    from smoke_blender import linear_to_srgb
    assert [linear_to_srgb(c) for c in (0.92, 0.72, 0.35)] == [246, 221, 160]
    assert [linear_to_srgb(c) for c in (0.28, 0.45, 0.72)] == [144, 179, 221]


def test_linear_to_srgb_edges():
    from smoke_blender import linear_to_srgb
    assert linear_to_srgb(0.0) == 0
    assert linear_to_srgb(1.0) == 255


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
