"""
renderer.py — свой просмотрщик (замена OpenGL-превью Harmony, пока его нет).

Рисует cutout-персонажа из векторных частей в стиле «толстый контур +
плоская заливка» (Gravity Falls / R&M): полигоны и капсулы, FK-иерархия
с пивотами, камера, суперсэмплинг.

Принципиально: рендерер потребляет ТЕ ЖЕ структуры, что и мост Harmony —
Key из columns.py, Assignment из drawings.py, профили из sample_profile.
Когда появится живой Harmony, вся хореография переносится без перевода:
меняется только «кто рисует».

Система координат: мировая, y ВВЕРХ, единица = ~рост половины персонажа.
Экран: y вниз, что учтено в проекции.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Callable, Sequence

from PIL import Image, ImageDraw

from columns import Key
from drawings import Assignment

Vec = tuple[float, float]
Affine = tuple[float, float, float, float, float, float]   # a b c d e f
IDENTITY: Affine = (1, 0, 0, 1, 0, 0)


# ---------------------------------------------------------------------------
# Аффинные преобразования (2x3)
# ---------------------------------------------------------------------------

def affine_mul(m1: Affine, m2: Affine) -> Affine:
    """m1 ∘ m2: сначала применяется m2, потом m1."""
    a1, b1, c1, d1, e1, f1 = m1
    a2, b2, c2, d2, e2, f2 = m2
    return (
        a1 * a2 + c1 * b2, b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2, b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1, b1 * e2 + d1 * f2 + f1,
    )


def affine_apply(m: Affine, p: Vec) -> Vec:
    a, b, c, d, e, f = m
    return (a * p[0] + c * p[1] + e, b * p[0] + d * p[1] + f)


def make_transform(tx: float = 0.0, ty: float = 0.0, rot_deg: float = 0.0,
                   sx: float = 1.0, sy: float = 1.0) -> Affine:
    """T(tx,ty) ∘ R(rot) ∘ S(sx,sy) — порядок как в пеге Harmony."""
    r = math.radians(rot_deg)
    cr, sr = math.cos(r), math.sin(r)
    # R∘S
    a, b = cr * sx, sr * sx
    c, d = -sr * sy, cr * sy
    return (a, b, c, d, tx, ty)


# ---------------------------------------------------------------------------
# Формы
# ---------------------------------------------------------------------------

def ellipse_points(rx: float, ry: float, cx: float = 0.0, cy: float = 0.0,
                   segments: int = 32) -> list[Vec]:
    return [(cx + rx * math.cos(2 * math.pi * i / segments),
             cy + ry * math.sin(2 * math.pi * i / segments))
            for i in range(segments)]


def capsule_points(length: float, radius: float, segments: int = 9) -> list[Vec]:
    """Капсула вдоль -Y от (0,0) до (0,-length): конечность, свисающая из
    пивота-сустава. Поворот вокруг (0,0) = поворот в суставе."""
    pts: list[Vec] = []
    for i in range(segments + 1):                    # верхний полукруг
        a = math.pi * i / segments
        pts.append((radius * math.cos(a), radius * math.sin(a) * 0.99))
    for i in range(segments + 1):                    # нижний полукруг
        a = math.pi + math.pi * i / segments
        pts.append((radius * math.cos(a), -length - radius * math.sin(a) * 0.99))
    # верхняя дуга идёт слева направо по x=cos: от +r к -r; нижняя от -r к +r
    return pts


def rect_points(w: float, h: float, cx: float = 0.0, cy: float = 0.0) -> list[Vec]:
    return [(cx - w / 2, cy - h / 2), (cx + w / 2, cy - h / 2),
            (cx + w / 2, cy + h / 2), (cx - w / 2, cy + h / 2)]


@dataclass
class Shape:
    points: list[Vec]
    fill: tuple[int, int, int] | None
    outline: tuple[int, int, int] | None = (26, 22, 24)
    outline_units: float = 0.045          # толщина контура в МИРОВЫХ единицах
    boil: bool = True                     # участвует ли контур в кипении


@dataclass
class RPart:
    """Часть персонажа. Пивот — в системе координат РОДИТЕЛЯ."""
    name: str
    parent: str | None
    pivot: Vec
    shapes: list[Shape] = field(default_factory=list)


@dataclass
class Puppet:
    parts: dict[str, RPart]
    draw_order: list[str]                 # от задней к передней

    def __post_init__(self) -> None:
        missing = [n for n in self.draw_order if n not in self.parts]
        extra = [n for n in self.parts if n not in self.draw_order]
        if missing or extra:
            raise ValueError(f"draw_order mismatch: missing={missing} extra={extra}")


# ---------------------------------------------------------------------------
# Поза и каналы
# ---------------------------------------------------------------------------

# канал: "part.rot" | "part.x" | "part.y" | "part.sx" | "part.sy"
Channels = dict[str, list[Key]]
Pose = dict[str, dict[str, float]]


def eval_keys(keys: Sequence[Key], frame: float) -> float:
    """Линейная интерполяция между ключами. Мы генерируем ключи плотно
    (кадр за кадром из sample_profile), так что линейности достаточно —
    профиль уже вшит в значения."""
    if not keys:
        return 0.0
    ks = keys if all(ks_next.frame >= ks_prev.frame for ks_prev, ks_next
                     in zip(keys, keys[1:])) else sorted(keys, key=lambda k: k.frame)
    if frame <= ks[0].frame:
        return ks[0].value
    if frame >= ks[-1].frame:
        return ks[-1].value
    for i in range(len(ks) - 1):
        k0, k1 = ks[i], ks[i + 1]
        if k0.frame <= frame <= k1.frame:
            if k1.frame == k0.frame:
                return k1.value
            t = (frame - k0.frame) / (k1.frame - k0.frame)
            return k0.value + (k1.value - k0.value) * t
    return ks[-1].value


def eval_pose(channels: Channels, frame: float,
              defaults: Pose | None = None) -> Pose:
    pose: Pose = {}
    if defaults:
        for part, vals in defaults.items():
            pose[part] = dict(vals)
    for ch, keys in channels.items():
        part, _, attr = ch.rpartition(".")
        if not part:
            raise ValueError(f"bad channel name {ch!r}; want 'part.attr'")
        pose.setdefault(part, {})[attr] = eval_keys(keys, frame)
    return pose


def drawing_at(assignments: Sequence[Assignment], frame: int,
               default: str = "") -> str:
    """Какой рисунок стоит на кадре (substitution). Assignment с duration
    покрывает [frame, frame+duration)."""
    current = default
    for a in sorted(assignments, key=lambda a: a.frame):
        if a.frame <= frame:
            if frame < a.frame + max(a.duration, 1) or True:
                # экспозиция в Harmony держится до следующего назначения
                current = a.drawing if a.drawing is not None else current
        else:
            break
    return current


# ---------------------------------------------------------------------------
# FK: мировые трансформы
# ---------------------------------------------------------------------------

def world_transforms(puppet: Puppet, pose: Pose) -> dict[str, Affine]:
    out: dict[str, Affine] = {}

    def build(name: str) -> Affine:
        if name in out:
            return out[name]
        part = puppet.parts[name]
        p = pose.get(name, {})
        local = affine_mul(
            make_transform(part.pivot[0] + p.get("x", 0.0),
                           part.pivot[1] + p.get("y", 0.0),
                           p.get("rot", 0.0),
                           p.get("sx", 1.0), p.get("sy", 1.0)),
            IDENTITY,
        )
        if part.parent is None:
            out[name] = local
        else:
            out[name] = affine_mul(build(part.parent), local)
        return out[name]

    for name in puppet.parts:
        build(name)
    return out


# ---------------------------------------------------------------------------
# Камера и рендер
# ---------------------------------------------------------------------------

@dataclass
class Camera:
    x: float = 0.0
    y: float = 0.0
    scale: float = 1.0


class Renderer:
    def __init__(self, width: int = 1280, height: int = 720,
                 px_per_unit: float = 130.0,
                 bg: tuple[int, int, int] = (245, 240, 230),
                 supersample: int = 2):
        self.w, self.h = width, height
        self.ppu = px_per_unit
        self.bg = bg
        self.ss = max(1, supersample)

    def to_screen(self, p: Vec, cam: Camera) -> Vec:
        s = self.ppu * cam.scale * self.ss
        x = (p[0] - cam.x) * s + self.w * self.ss / 2
        y = self.h * self.ss / 2 - (p[1] - cam.y) * s      # y вверх -> вниз
        return (x, y)

    def _boiled(self, pts: list[Vec], seed: int, amp_px: float) -> list[Vec]:
        """Кипение линии: детерминированный сдвиг вершин. seed = frame//2 —
        boil на двойках (см. imperfection.py: на единицах слишком нервно)."""
        rng = random.Random(seed)
        return [(x + rng.uniform(-amp_px, amp_px),
                 y + rng.uniform(-amp_px, amp_px)) for x, y in pts]

    def render(self, puppet: Puppet | None = None, pose: Pose | None = None,
               cam: Camera | None = None,
               layers: Sequence[tuple[Puppet, Pose]] | None = None,
               draw_bg: Callable[[ImageDraw.ImageDraw,
                                  Callable[[Vec], Vec], float], None] | None = None,
               draw_fg: Callable[[ImageDraw.ImageDraw,
                                  Callable[[Vec], Vec], float], None] | None = None,
               boil_seed: int | None = None,
               boil_amp_units: float = 0.012) -> Image.Image:
        """layers — несколько марионеток по порядку (задние первыми):
        персонаж и пропы анимируются независимо, как отдельные пеги
        в сцене Harmony. Старый вызов (puppet, pose) остаётся рабочим."""
        cam = cam or Camera()
        if layers is None:
            if puppet is None or pose is None:
                raise ValueError("either (puppet, pose) or layers required")
            layers = [(puppet, pose)]

        img = Image.new("RGB", (self.w * self.ss, self.h * self.ss), self.bg)
        d = ImageDraw.Draw(img)
        proj = lambda p: self.to_screen(p, cam)             # noqa: E731
        unit_px = self.ppu * cam.scale * self.ss

        if draw_bg:
            draw_bg(d, proj, unit_px)

        boil_px = boil_amp_units * unit_px
        for li, (pup, ps) in enumerate(layers):
            transforms = world_transforms(pup, ps)
            for i, name in enumerate(pup.draw_order):
                part = pup.parts[name]
                m = transforms[name]
                for j, sh in enumerate(part.shapes):
                    pts = [proj(affine_apply(m, p)) for p in sh.points]
                    if boil_seed is not None and sh.boil:
                        pts = self._boiled(
                            pts, boil_seed * 7919 + li * 4093 + i * 131 + j,
                            boil_px)
                    if len(pts) < 3:
                        continue
                    if sh.fill is not None:
                        d.polygon(pts, fill=sh.fill)
                    if sh.outline is not None:
                        w = max(1, int(round(sh.outline_units * unit_px)))
                        d.line(pts + [pts[0]], fill=sh.outline, width=w,
                               joint="curve")

        if draw_fg:
            draw_fg(d, proj, unit_px)

        if self.ss > 1:
            img = img.resize((self.w, self.h), Image.LANCZOS)
        return img


# ---------------------------------------------------------------------------
# Контактный лист — чтобы я мог смотреть на движение, а не на кадр
# ---------------------------------------------------------------------------

def contact_sheet(frames: Sequence[Image.Image], cols: int = 6,
                  thumb_w: int = 320) -> Image.Image:
    if not frames:
        raise ValueError("no frames")
    ar = frames[0].height / frames[0].width
    tw, th = thumb_w, int(thumb_w * ar)
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * th), (30, 30, 30))
    for i, f in enumerate(frames):
        t = f.resize((tw, th), Image.LANCZOS)
        sheet.paste(t, ((i % cols) * tw, (i // cols) * th))
    return sheet
