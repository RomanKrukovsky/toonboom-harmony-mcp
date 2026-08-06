"""
artwork.py — приём НАСТОЯЩИХ рисунков и сборка рига из них.

ЧТО Я ПУТАЛ РАНЬШЕ. «Рисовать должен тот, кто видит» — правда только
про суждение: похоже ли, живой ли штрих, красиво ли. Но приём готовых
рисунков и превращение их в анимируемый риг — это КОНСТРУКЦИЯ, и она
проверяется числами: есть ли альфа, где пивот, сходятся ли стыки,
попадают ли части в кадр. Прикрываться слепотой здесь было нечестно.

КАК ЭТО РАБОТАЕТ. Художник рисует части персонажа в любом редакторе и
сохраняет PNG с прозрачностью:

    parts/
      torso.png        head.png
      arm_near.png     hand_near.png
      leg_far.png      ...
      parts.json       <- где у каждой части пивот и к кому крепится

Модуль читает это, ПРОВЕРЯЕТ (главная работа) и отдаёт спеку сцены для
Blender, где каждая часть — плоскость с текстурой и альфой, а иерархия и
пивоты те же, что в rigging.py. Движок таймингов не меняется вообще.

ПОЧЕМУ ПРОВЕРКИ ВАЖНЕЕ САМОЙ СБОРКИ. Ошибки в наборе рисунков не
проявляются сообщением. Они проявляются так: часть не видно (нет альфы),
рука вращается от плеча соседа (пивот в пикселях перепутан с
нормализованным), персонаж разваливается в позе (пивот вне картинки),
кисть под халатом (порядок отрисовки). Всё это ищется арифметикой ДО
рендера — и должно искаться, потому что художник не обязан отлаживать
чужой риг.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal, Sequence

# Пивот задаётся в НОРМАЛИЗОВАННЫХ координатах картинки: (0,0) — левый
# верхний угол, (1,1) — правый нижний. Это единственная конвенция,
# которая не ломается при перерисовке части в другом разрешении.
PivotMode = Literal["normalized", "pixels"]


@dataclass
class ArtPart:
    """Часть персонажа как файл рисунка."""
    name: str
    image: str                      # путь к PNG с альфой
    parent: str | None
    pivot: tuple[float, float]      # см. PivotMode
    pivot_mode: PivotMode = "normalized"
    # Куда пивот части попадает в системе координат РОДИТЕЛЯ (в мировых
    # единицах). Это то же самое, что pivot в rigging.py.
    attach: tuple[float, float] = (0.0, 0.0)
    depth: float = 0.0              # порядок отрисовки: меньше = ближе
    scale: float = 1.0              # мировых единиц на 1000 пикселей ширины

    def as_dict(self) -> dict:
        return {
            "name": self.name, "image": self.image, "parent": self.parent,
            "pivot": list(self.pivot), "pivot_mode": self.pivot_mode,
            "attach": list(self.attach), "depth": self.depth,
            "scale": self.scale,
        }


@dataclass
class ArtSet:
    """Полный набор рисунков персонажа."""
    name: str
    parts: list[ArtPart]
    root_dir: Path

    @staticmethod
    def load(parts_json: str | Path) -> "ArtSet":
        p = Path(parts_json)
        data = json.loads(p.read_text(encoding="utf-8"))
        parts = []
        for d in data.get("parts", []):
            parts.append(ArtPart(
                name=d["name"], image=d["image"], parent=d.get("parent"),
                pivot=tuple(d.get("pivot", (0.5, 0.5))),      # type: ignore[arg-type]
                pivot_mode=d.get("pivot_mode", "normalized"),
                attach=tuple(d.get("attach", (0.0, 0.0))),    # type: ignore[arg-type]
                depth=float(d.get("depth", 0.0)),
                scale=float(d.get("scale", 1.0)),
            ))
        return ArtSet(data.get("name", p.stem), parts, p.parent)

    def resolve(self, part: ArtPart) -> Path:
        q = Path(part.image)
        return q if q.is_absolute() else (self.root_dir / q)


# ---------------------------------------------------------------------------
# Проверки набора — основная ценность модуля
# ---------------------------------------------------------------------------

@dataclass
class Finding:
    severity: Literal["error", "warning", "info"]
    rule: str
    part: str
    message: str
    remedy: str = ""

    def as_dict(self) -> dict:
        return {"severity": self.severity, "rule": self.rule,
                "part": self.part, "message": self.message,
                "remedy": self.remedy}


def _png_size_and_alpha(path: Path) -> tuple[int, int, bool, float]:
    """
    (ширина, высота, есть_альфа_канал, доля_непрозрачных_пикселей).

    Читается через PIL. Доля непрозрачного нужна отдельно от наличия
    канала: PNG может иметь альфу и быть при этом полностью прозрачным
    (типовой результат экспорта не того слоя) — такая часть «есть», но
    не видна, и это худший вид ошибки.
    """
    from PIL import Image
    with Image.open(path) as im:
        w, h = im.size
        has_alpha = im.mode in ("RGBA", "LA") or "transparency" in im.info
        if not has_alpha:
            return w, h, False, 1.0
        a = im.convert("RGBA").getchannel("A")
        # Пороговое сжатие: считаем «видимым» всё выше 8/255.
        hist = a.histogram()
        opaque = sum(hist[9:])
        return w, h, True, opaque / float(w * h)


def validate(art: ArtSet, min_opaque: float = 0.005) -> list[Finding]:
    """
    Проверка набора ДО рендера. Ошибки здесь стоят минуты, а на просмотре —
    дня работы художника.
    """
    out: list[Finding] = []
    names = [p.name for p in art.parts]

    if not art.parts:
        return [Finding("error", "empty-set", "-", "the set has no parts")]

    dupes = {n for n in names if names.count(n) > 1}
    for n in sorted(dupes):
        out.append(Finding("error", "duplicate-part", n,
                           f"part {n!r} is declared more than once",
                           "Part names must be unique: they address channels."))

    roots = [p for p in art.parts if p.parent is None]
    if not roots:
        out.append(Finding("error", "no-root", "-",
                           "every part has a parent — the hierarchy has no root",
                           "Exactly one part (usually the master or hips) must have parent=null."))
    elif len(roots) > 1:
        out.append(Finding("warning", "many-roots", ",".join(p.name for p in roots),
                           f"{len(roots)} parts have no parent",
                           "Multiple roots animate independently; usually a mistake."))

    known = set(names)
    for p in art.parts:
        if p.parent is not None and p.parent not in known:
            out.append(Finding("error", "unknown-parent", p.name,
                               f"parent {p.parent!r} is not in the set",
                               "Check for a typo or a missing part file."))

    # Циклы в иерархии: риг с циклом уходит в бесконечную рекурсию при
    # вычислении трансформаций, и падение выглядит как «Blender упал».
    parent_of = {p.name: p.parent for p in art.parts}
    for p in art.parts:
        seen, cur = set(), p.name
        while cur is not None:
            if cur in seen:
                out.append(Finding("error", "cycle", p.name,
                                   f"hierarchy cycle through {cur!r}",
                                   "A part cannot be its own ancestor."))
                break
            seen.add(cur)
            cur = parent_of.get(cur)

    for p in art.parts:
        path = art.resolve(p)
        if not path.exists():
            out.append(Finding("error", "missing-image", p.name,
                               f"image not found: {path}",
                               "Export the part as PNG with transparency."))
            continue
        try:
            w, h, has_alpha, opaque = _png_size_and_alpha(path)
        except Exception as e:                       # noqa: BLE001
            out.append(Finding("error", "unreadable-image", p.name,
                               f"cannot read {path.name}: {e}"))
            continue

        if not has_alpha:
            # Без альфы часть закроет всё под собой белым прямоугольником.
            out.append(Finding("error", "no-alpha", p.name,
                               f"{path.name} has no alpha channel",
                               "Re-export as PNG-24/32 with transparency, not JPEG or flat PNG."))
        elif opaque < min_opaque:
            out.append(Finding("error", "empty-image", p.name,
                               f"{path.name} is {opaque:.2%} opaque — effectively blank",
                               "Usually the wrong layer was exported. The part will be invisible "
                               "and Blender will report no error."))
        elif opaque > 0.98:
            out.append(Finding("warning", "opaque-rectangle", p.name,
                               f"{path.name} is {opaque:.0%} opaque — looks like an uncut rectangle",
                               "If this is not a background, the silhouette was not cut out."))

        # Пивот внутри картинки?
        px, py = p.pivot
        if p.pivot_mode == "normalized":
            inside = -0.25 <= px <= 1.25 and -0.25 <= py <= 1.25
            if not (0.0 <= px <= 1.0 and 0.0 <= py <= 1.0):
                sev = "warning" if inside else "error"
                out.append(Finding(sev, "pivot-outside", p.name,
                                   f"normalized pivot ({px:.2f}, {py:.2f}) is outside the image",
                                   "A pivot far outside makes the part swing around empty space."))
            if px > 1.5 or py > 1.5:
                # Классическая путаница: пиксели записаны как нормализованные.
                out.append(Finding("error", "pivot-looks-like-pixels", p.name,
                                   f"pivot ({px}, {py}) is way above 1.0 — pixel coordinates?",
                                   'Set "pivot_mode": "pixels" or divide by image size.'))
        else:
            if not (0 <= px <= w and 0 <= py <= h):
                out.append(Finding("error", "pivot-outside", p.name,
                                   f"pixel pivot ({px}, {py}) is outside {w}x{h}"))

        if p.scale <= 0:
            out.append(Finding("error", "bad-scale", p.name,
                               f"scale must be positive, got {p.scale}"))

    # Одинаковая глубина у соседей по родителю: порядок отрисовки не
    # определён, и части будут мерцать между кадрами.
    by_parent: dict[str | None, list[ArtPart]] = {}
    for p in art.parts:
        by_parent.setdefault(p.parent, []).append(p)
    for parent, group in by_parent.items():
        depths: dict[float, list[str]] = {}
        for p in group:
            depths.setdefault(p.depth, []).append(p.name)
        for d, ns in depths.items():
            if len(ns) > 1:
                out.append(Finding("warning", "depth-tie", ",".join(sorted(ns)),
                                   f"parts share depth {d} under {parent!r}",
                                   "Draw order between them is undefined — give distinct depths."))
    return out


def summary(findings: Sequence[Finding]) -> dict:
    errors = [f for f in findings if f.severity == "error"]
    return {
        "errors": len(errors),
        "warnings": sum(1 for f in findings if f.severity == "warning"),
        "usable": not errors,
        "verdict": ("set is usable" if not errors else
                    f"{len(errors)} blocking problem(s) — the rig would render wrong or invisible"),
        "findings": [f.as_dict() for f in findings],
    }


# ---------------------------------------------------------------------------
# Сборка спеки для Blender
# ---------------------------------------------------------------------------

def pivot_normalized(art: ArtSet, p: ArtPart) -> tuple[float, float]:
    if p.pivot_mode == "normalized":
        return p.pivot
    from PIL import Image
    with Image.open(art.resolve(p)) as im:
        w, h = im.size
    return (p.pivot[0] / w, p.pivot[1] / h)


def image_part_specs(art: ArtSet) -> list[dict]:
    """
    Части в виде описания плоскостей с текстурой — для build_scene.py.

    Геометрия плоскости считается ЗДЕСЬ, а не в Blender: размер части в
    мировых единицах выводится из пикселей и `scale`, а начало координат
    сдвигается так, чтобы пивот оказался в (0,0) — тогда вращение части
    вокруг своего пивота получается само, без вспомогательных пустышек.
    """
    from PIL import Image
    out = []
    for p in art.parts:
        path = art.resolve(p)
        with Image.open(path) as im:
            w, h = im.size
        # мировых единиц на пиксель
        upp = p.scale / 1000.0
        world_w, world_h = w * upp, h * upp
        nx, ny = pivot_normalized(art, p)
        # Пивот кладётся в начало локальных координат — тогда вращение
        # вокруг него получается само, без вспомогательных пустышек.
        #
        # Ось Y: в картинке ny растёт ВНИЗ (0 — верх), в сцене вверх.
        # Значит над пивотом остаётся ny высоты, под ним — (1-ny).
        #
        # Дефект, пойманный проверкой ОРИЕНТАЦИИ на живом рендере: я
        # написал top=(1-ny)*h, то есть перевернул ось. Пивот у верха
        # картинки (ny=0.04) давал руку, висящую ВВЕРХ от плеча, и она
        # уезжала за кадр. Проверки геометрии этого не видели: quad был
        # правильного размера, симметрия по X сходилась, UV были на
        # месте. Увидел только асимметричный маркер в рисунке.
        left = -nx * world_w
        right = left + world_w
        top = ny * world_h
        bottom = top - world_h
        out.append({
            "name": p.name,
            "parent": p.parent,
            "image": str(path),
            "pivot": list(p.attach),
            "depth": p.depth,
            "quad": [[left, bottom], [right, bottom], [right, top], [left, top]],
            "size": [world_w, world_h],
        })
    return out
