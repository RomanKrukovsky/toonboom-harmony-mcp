"""
test_artwork.py — тесты приёма настоящих рисунков. Без Blender.

Проверяется то, из-за чего наборы рисунков ломаются молча: отсутствие
альфы, пустой экспорт не того слоя, пивот в пикселях там, где ждут
нормализованный, цикл в иерархии, ничья по глубине.

Каждая из этих ошибок в живом рендере даёт НЕ сообщение, а странность:
часть невидима, рука вращается вокруг пустоты, кисть под халатом. Ловить
их надо арифметикой заранее — художник не обязан отлаживать чужой риг.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from artwork import ArtPart, ArtSet, image_part_specs, summary, validate


def make_png(path: Path, w=100, h=200, alpha=True, fill_ratio=0.6):
    """Тестовый PNG: вертикальная полоса непрозрачного в центре."""
    from PIL import Image
    mode = "RGBA" if alpha else "RGB"
    im = Image.new(mode, (w, h), (200, 100, 100, 0) if alpha else (200, 100, 100))
    if alpha and fill_ratio > 0:
        px = im.load()
        band = int(w * fill_ratio)
        x0 = (w - band) // 2
        for y in range(h):
            for x in range(x0, x0 + band):
                px[x, y] = (200, 100, 100, 255)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    return path


def build_set(tmp: Path, **overrides) -> ArtSet:
    make_png(tmp / "torso.png", 120, 240)
    make_png(tmp / "arm.png", 60, 200)
    parts = [
        ArtPart("torso", "torso.png", None, (0.5, 0.9), attach=(0.0, 0.0), depth=0.2),
        ArtPart("arm", "arm.png", "torso", (0.5, 0.05), attach=(0.25, 0.75), depth=-0.2),
    ]
    for p in parts:
        for k, v in overrides.get(p.name, {}).items():
            setattr(p, k, v)
    return ArtSet("hero", parts, tmp)


# ---------------------------------------------------------------------------
# Здоровый набор
# ---------------------------------------------------------------------------

def test_good_set_is_usable():
    with tempfile.TemporaryDirectory() as d:
        s = summary(validate(build_set(Path(d))))
        assert s["usable"] is True, s["findings"]
        assert s["errors"] == 0


def test_loads_from_json():
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        make_png(tmp / "torso.png")
        (tmp / "parts.json").write_text(json.dumps({
            "name": "hero",
            "parts": [{"name": "torso", "image": "torso.png", "parent": None,
                       "pivot": [0.5, 0.9], "attach": [0, 0], "depth": 0.0}],
        }))
        art = ArtSet.load(tmp / "parts.json")
        assert art.name == "hero"
        assert art.parts[0].name == "torso"
        assert validate(art) == [] or all(f.severity != "error" for f in validate(art))


# ---------------------------------------------------------------------------
# Ошибки, которые в рендере молчат
# ---------------------------------------------------------------------------

def test_missing_alpha_is_error():
    """Без альфы часть закроет всё под собой прямоугольником."""
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        art = build_set(tmp)
        make_png(tmp / "arm.png", alpha=False)
        f = validate(art)
        assert any(x.rule == "no-alpha" and x.part == "arm" for x in f), f


def test_blank_export_is_error():
    """Экспортировали не тот слой: альфа есть, но всё прозрачно. Часть
    «есть» и невидима — худший вид ошибки, Blender не скажет ничего."""
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        art = build_set(tmp)
        make_png(tmp / "arm.png", fill_ratio=0.0)
        f = validate(art)
        assert any(x.rule == "empty-image" for x in f), f
        assert summary(f)["usable"] is False


def test_uncut_rectangle_is_warning():
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        art = build_set(tmp)
        make_png(tmp / "arm.png", fill_ratio=1.0)
        f = validate(art)
        assert any(x.rule == "opaque-rectangle" for x in f), f
        # предупреждение, не блокировка: фон и правда бывает сплошным
        assert summary(f)["usable"] is True


def test_missing_file_is_error():
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        art = build_set(tmp)
        (tmp / "arm.png").unlink()
        assert any(x.rule == "missing-image" for x in validate(art))


def test_pixel_pivot_mistaken_for_normalized():
    """Пивот 60,100 в поле «нормализованный» — типовая путаница. Молча
    это даёт часть, вращающуюся вокруг точки в шестидесяти ширинах от себя."""
    with tempfile.TemporaryDirectory() as d:
        art = build_set(Path(d), arm={"pivot": (30.0, 100.0)})
        f = validate(art)
        assert any(x.rule == "pivot-looks-like-pivot" or
                   x.rule == "pivot-looks-like-pixels" for x in f), f


def test_pixel_mode_accepted_when_declared():
    with tempfile.TemporaryDirectory() as d:
        art = build_set(Path(d), arm={"pivot": (30.0, 10.0),
                                      "pivot_mode": "pixels"})
        errs = [x for x in validate(art) if x.severity == "error"]
        assert errs == [], errs


def test_pixel_pivot_out_of_bounds():
    with tempfile.TemporaryDirectory() as d:
        art = build_set(Path(d), arm={"pivot": (999.0, 10.0),
                                      "pivot_mode": "pixels"})
        assert any(x.rule == "pivot-outside" for x in validate(art))


def test_unknown_parent_is_error():
    with tempfile.TemporaryDirectory() as d:
        art = build_set(Path(d), arm={"parent": "shoulder"})
        assert any(x.rule == "unknown-parent" for x in validate(art))


def test_cycle_detected():
    """Цикл в иерархии — это бесконечная рекурсия при вычислении
    трансформаций, и падение выглядит как «Blender упал»."""
    with tempfile.TemporaryDirectory() as d:
        art = build_set(Path(d), torso={"parent": "arm"})
        f = validate(art)
        assert any(x.rule == "cycle" for x in f), f


def test_no_root_is_error():
    with tempfile.TemporaryDirectory() as d:
        art = build_set(Path(d), torso={"parent": "arm"}, arm={"parent": "torso"})
        assert any(x.rule in ("no-root", "cycle") for x in validate(art))


def test_duplicate_names_rejected():
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        art = build_set(tmp)
        art.parts.append(ArtPart("arm", "arm.png", "torso", (0.5, 0.05)))
        assert any(x.rule == "duplicate-part" for x in validate(art))


def test_depth_tie_warned():
    """Одинаковая глубина у сиблингов = неопределённый порядок отрисовки,
    и части мерцают между кадрами."""
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        make_png(tmp / "a.png"); make_png(tmp / "b.png")
        art = ArtSet("x", [
            ArtPart("root", "a.png", None, (0.5, 0.5), depth=0.0),
            ArtPart("l", "a.png", "root", (0.5, 0.5), depth=0.1),
            ArtPart("r", "b.png", "root", (0.5, 0.5), depth=0.1),
        ], tmp)
        assert any(x.rule == "depth-tie" for x in validate(art))


def test_bad_scale_rejected():
    with tempfile.TemporaryDirectory() as d:
        art = build_set(Path(d), arm={"scale": 0.0})
        assert any(x.rule == "bad-scale" for x in validate(art))


def test_empty_set_rejected():
    with tempfile.TemporaryDirectory() as d:
        assert validate(ArtSet("x", [], Path(d)))[0].rule == "empty-set"


# ---------------------------------------------------------------------------
# Геометрия: пивот попадает в (0,0)
# ---------------------------------------------------------------------------

def test_pivot_lands_at_origin():
    """Ключ ко вращению: часть строится так, что её пивот — начало
    локальных координат. Тогда вращение вокруг пивота получается само,
    без вспомогательных пустышек."""
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        make_png(tmp / "p.png", 100, 200)
        art = ArtSet("x", [ArtPart("p", "p.png", None, (0.5, 0.25), scale=1.0)], tmp)
        spec = image_part_specs(art)[0]
        xs = [q[0] for q in spec["quad"]]
        zs = [q[1] for q in spec["quad"]]
        # пивот по x в середине -> левый и правый края симметричны
        assert abs(min(xs) + max(xs)) < 1e-9
        # Пивот на 25% СВЕРХУ картинки: над ним 25% высоты, под ним 75%.
        # Регрессия: раньше здесь стояло наоборот, и тест «подтверждал»
        # перевёрнутую ось — рука висела вверх от плеча. Числа сходились,
        # ошибку показал только асимметричный маркер в живом рендере.
        assert abs(max(zs) - 0.05) < 1e-6, zs      # 200px * 0.25 / 1000
        assert abs(min(zs) + 0.15) < 1e-6, zs      # 200px * 0.75 / 1000


def test_scale_controls_world_size():
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        make_png(tmp / "p.png", 1000, 500)
        for scale, want_w in ((1.0, 1.0), (2.0, 2.0), (0.5, 0.5)):
            art = ArtSet("x", [ArtPart("p", "p.png", None, (0.5, 0.5),
                                        scale=scale)], tmp)
            s = image_part_specs(art)[0]
            assert abs(s["size"][0] - want_w) < 1e-9, (scale, s["size"])


def test_quad_winding_is_bl_br_tr_tl():
    """build_scene кладёт UV по этому порядку. Перепутанный порядок даёт
    зеркальный рисунок БЕЗ сообщения об ошибке."""
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        make_png(tmp / "p.png", 100, 100)
        art = ArtSet("x", [ArtPart("p", "p.png", None, (0.0, 1.0))], tmp)
        q = image_part_specs(art)[0]["quad"]
        (blx, blz), (brx, brz), (trx, trz), (tlx, tlz) = q
        assert blx < brx and trx > tlx        # низ слева-направо, верх справа-налево
        assert blz < tlz and brz < trz        # низ ниже верха


def test_parent_and_attach_preserved():
    with tempfile.TemporaryDirectory() as d:
        art = build_set(Path(d))
        specs = {s["name"]: s for s in image_part_specs(art)}
        assert specs["arm"]["parent"] == "torso"
        assert specs["arm"]["pivot"] == [0.25, 0.75]


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
