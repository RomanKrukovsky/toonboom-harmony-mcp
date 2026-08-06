"""
continuity.py — оракул непрерывности (идея №39) + проверка формата шота.

Библия сериала — JSON в репозитории:

    {
      "characters": {
        "masha": {
          "props": {
            "scarf_red":  {"from": "e03s01", "to": "e04s12"},
            "glasses":    {"from": "e01s01", "to": "e07s04",
                           "note": "broken on-screen in e07s04"},
            "glasses_taped": {"from": "e07s05"}
          },
          "palette": "MASHA_MAIN"
        }
      },
      "locations": {
        "kitchen": {"palette": "KITCHEN_DAY", "layers": ["bg_kitchen"]}
      }
    }

Ключевая идея представления: время сериала — это ПОРЯДОК шотов, а не
даты. Адрес шота "e07s04" (эпизод 7, шот 4) сравнивается лексикографически
после нормализации, и «шарф до e04s12» — это одно сравнение.

Проверка шота = снимок сцены через мост (какие READ-ноды включены,
какие палитры подцеплены) против того, что библия разрешает в этом
адресе. Всё, что вне библии, — не ошибка, а «неизвестно»: оракул
не выдумывает правил, которых нет.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Sequence

_ADDR = re.compile(r"^e(\d+)s(\d+)$")


def addr_key(addr: str) -> tuple[int, int]:
    """'e07s04' -> (7, 4). Нормализация нужна, чтобы e10 > e9
    (строкой 'e10' < 'e9' — классическая ловушка)."""
    m = _ADDR.match(addr.strip().lower())
    if not m:
        raise ValueError(f"bad shot address {addr!r}; expected like 'e07s04'")
    return int(m.group(1)), int(m.group(2))


@dataclass(frozen=True)
class Span:
    """Интервал жизни пропа: от адреса до адреса включительно.
    to=None — «по сей день»."""
    frm: str
    to: str | None = None
    note: str = ""

    def contains(self, addr: str) -> bool:
        k = addr_key(addr)
        if k < addr_key(self.frm):
            return False
        if self.to is not None and k > addr_key(self.to):
            return False
        return True


@dataclass
class CharacterBible:
    props: dict[str, Span] = field(default_factory=dict)
    palette: str | None = None


@dataclass
class Bible:
    characters: dict[str, CharacterBible] = field(default_factory=dict)
    locations: dict[str, dict] = field(default_factory=dict)

    @staticmethod
    def load(path: str | Path) -> "Bible":
        return Bible.from_dict(json.loads(Path(path).read_text(encoding="utf-8")))

    @staticmethod
    def from_dict(data: dict) -> "Bible":
        chars: dict[str, CharacterBible] = {}
        for name, c in (data.get("characters") or {}).items():
            props = {}
            for pname, span in (c.get("props") or {}).items():
                props[pname] = Span(span["from"], span.get("to"),
                                    span.get("note", ""))
            chars[name] = CharacterBible(props, c.get("palette"))
        return Bible(chars, dict(data.get("locations") or {}))

    def validate(self) -> list[str]:
        """Библия сама может быть противоречивой — проверяем при загрузке."""
        errors = []
        for cname, c in self.characters.items():
            for pname, span in c.props.items():
                try:
                    fk = addr_key(span.frm)
                except ValueError as e:
                    errors.append(f"{cname}.{pname}: {e}")
                    continue
                if span.to is not None:
                    try:
                        tk = addr_key(span.to)
                    except ValueError as e:
                        errors.append(f"{cname}.{pname}: {e}")
                        continue
                    if tk < fk:
                        errors.append(
                            f"{cname}.{pname}: span ends ({span.to}) before "
                            f"it starts ({span.frm})")
        return errors


# ---------------------------------------------------------------------------
# Проверка шота
# ---------------------------------------------------------------------------

@dataclass
class ShotManifest:
    """
    Что фактически есть в сцене шота. Собирается из моста
    (Continuity.manifest_from_scene) или руками в тестах.

    visible_props: {"masha": ["scarf_red", "glasses"]} — имена READ-нод
    вида "<char>__<prop>" в сцене разбираются в это автоматически.
    """
    addr: str
    visible_props: dict[str, list[str]] = field(default_factory=dict)
    palettes: list[str] = field(default_factory=list)


def check_shot(bible: Bible, manifest: ShotManifest) -> list[dict]:
    findings: list[dict] = []
    k = addr_key(manifest.addr)  # заодно валидирует адрес

    for char, props in manifest.visible_props.items():
        cb = bible.characters.get(char)
        if cb is None:
            findings.append({
                "rule": "unknown-character", "severity": "info",
                "character": char,
                "message": f"{char!r} not in bible; nothing to check",
            })
            continue
        for prop in props:
            span = cb.props.get(prop)
            if span is None:
                findings.append({
                    "rule": "unknown-prop", "severity": "info",
                    "character": char, "prop": prop,
                    "message": f"{char}.{prop} not in bible; not checked",
                })
                continue
            if not span.contains(manifest.addr):
                when = (f"exists {span.frm}..{span.to}" if span.to
                        else f"exists from {span.frm}")
                msg = (f"{char} wears {prop} in {manifest.addr}, but it {when}")
                if span.note:
                    msg += f" ({span.note})"
                findings.append({
                    "rule": "prop-out-of-span", "severity": "error",
                    "character": char, "prop": prop, "shot": manifest.addr,
                    "message": msg,
                })

        # обратная проверка: проп, который ОБЯЗАН быть, отсутствует.
        # Обязателен = его интервал покрывает шот и у него нет заканчивающей
        # альтернативы (упрощение: считаем обязательным всё покрывающее).
        for pname, span in cb.props.items():
            if span.contains(manifest.addr) and pname not in props:
                findings.append({
                    "rule": "prop-missing", "severity": "warning",
                    "character": char, "prop": pname, "shot": manifest.addr,
                    "message": f"{char} should have {pname} in "
                               f"{manifest.addr} per bible, but scene shows none",
                })

        if cb.palette and cb.palette not in manifest.palettes:
            findings.append({
                "rule": "palette-missing", "severity": "warning",
                "character": char, "palette": cb.palette,
                "message": f"{char}'s palette {cb.palette!r} not attached to scene",
            })
    return findings


# ---------------------------------------------------------------------------
# №56: переверстка формата — проверка, что шот переживёт вертикаль/квадрат
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class FrameBox:
    """Прямоугольник в нормализованных координатах кадра 16:9 (0..1)."""
    x0: float
    y0: float
    x1: float
    y1: float


def reframe_check(action_boxes: dict[str, FrameBox],
                  target_aspect: float,
                  source_aspect: float = 16 / 9) -> list[dict]:
    """
    Проверяет, влезает ли действие в другой формат БЕЗ перестановки.
    Кроп по центру: видимая ширина = target/source (для вертикали 9:16 от
    16:9 остаётся 31.6% ширины). Всё, что торчит, — список «этим шотам
    нужна живая переверстка» (идея №56: сцена живая, можно двигать камеру,
    а не резать кадр).
    """
    if target_aspect <= 0 or source_aspect <= 0:
        raise ValueError("aspects must be positive")
    visible_w = min(1.0, target_aspect / source_aspect)
    lo, hi = 0.5 - visible_w / 2, 0.5 + visible_w / 2

    out = []
    for name, b in action_boxes.items():
        if b.x0 < lo or b.x1 > hi:
            overflow = max(lo - b.x0, b.x1 - hi)
            out.append({
                "rule": "reframe-needed", "element": name,
                "overflow": round(overflow, 3),
                "message": f"{name} sticks {overflow:.0%} outside centre-crop "
                           f"{target_aspect:.2f}; needs camera/layout restage, "
                           f"not a crop",
            })
    return out


# ---------------------------------------------------------------------------
# Фасад: манифест из живой сцены
# ---------------------------------------------------------------------------

class Continuity:
    def __init__(self, bridge, bible: Bible):
        self.b = bridge
        self.bible = bible

    def manifest_from_scene(self, addr: str) -> ShotManifest:
        """
        Конвенция имён: READ-ноды пропов зовутся '<char>__<prop>'
        ("masha__scarf_red"). Включённая нода = проп видим.
        Палитры — из palette_list.
        """
        graph = self.b.call("node_graph", {"types": ["READ"]},
                            deadline_s=120.0).result
        visible: dict[str, list[str]] = {}
        for n in graph["nodes"]:
            name = n.get("name") or ""
            if "__" not in name or n.get("enabled") is False:
                continue
            char, _, prop = name.partition("__")
            visible.setdefault(char, []).append(prop)

        pals = self.b.call("palette_list", deadline_s=60.0).result
        palettes = [p["name"] for p in pals["palettes"] if p.get("name")]
        return ShotManifest(addr, visible, palettes)

    def check(self, addr: str) -> list[dict]:
        return check_shot(self.bible, self.manifest_from_scene(addr))
