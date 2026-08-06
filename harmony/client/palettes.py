"""
palettes.py — дирижёр палитр: цветовой сценарий как данные (идея №33)
и сигнализация цветового дрейфа (идея №46).

Цветовой сценарий — файл в репозитории:

    {
      "scenes": [
        {"tag": "ep01_night", "overrides": [
            {"palette": "SKIN", "colour": "cheek", "rgba": [110, 90, 140, 255]},
            ...
        ]},
        ...
      ]
    }

apply_colour_script() — его «компилятор» в сцену. Ретроактивное выравнивание
дрейфа за 26 серий — это re-run компилятора по всем сериям.

drift_report() — сравнение фактических палитр сцены со сценарием:
что уехало, насколько, в какую сторону. Работает в dry-run всегда.

ЕДИНСТВЕННОЕ МЕСТО ПАЙПЛАЙНА, ГДЕ UNDO НЕ СПАСАЕТ: правка палитры пишется
в файл палитры. Поэтому здесь всё по умолчанию dry-run, а commit требует
явного слова.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from bridge_client import HarmonyBridge

RGBA = tuple[int, int, int, int]


@dataclass(frozen=True)
class ColourTarget:
    palette: str
    colour: str          # id или имя
    rgba: RGBA


@dataclass
class ColourScript:
    """Цветовой сценарий: тег сцены -> список целевых цветов."""
    scenes: dict[str, list[ColourTarget]]

    @staticmethod
    def load(path: str | Path) -> "ColourScript":
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        scenes: dict[str, list[ColourTarget]] = {}
        for s in data["scenes"]:
            targets = []
            for o in s["overrides"]:
                r = o["rgba"]
                rgba = (int(r[0]), int(r[1]), int(r[2]), int(r[3]) if len(r) > 3 else 255)
                targets.append(ColourTarget(str(o["palette"]), str(o["colour"]), rgba))
            scenes[str(s["tag"])] = targets
        return ColourScript(scenes)

    def dump(self, path: str | Path) -> None:
        data = {"scenes": [
            {"tag": tag, "overrides": [
                {"palette": t.palette, "colour": t.colour, "rgba": list(t.rgba)}
                for t in targets
            ]}
            for tag, targets in self.scenes.items()
        ]}
        Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


# ---------------------------------------------------------------------------
# Метрика дрейфа
#
# Дельту цвета считаем в грубом перцептивном приближении (redmean):
# полноценный CIEDE2000 без numpy — страница формул; redmean даёт
# сопоставимый порядок качества для «уехал/не уехал» и укладывается
# в пять строк. Порог по умолчанию 5 — ниже человеческий глаз на
# соседних кадрах не различает.
# ---------------------------------------------------------------------------

def colour_distance(a: Sequence[int], b: Sequence[int]) -> float:
    rmean = (a[0] + b[0]) / 2.0
    dr, dg, db = a[0] - b[0], a[1] - b[1], a[2] - b[2]
    return math.sqrt(
        (2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db
    )


@dataclass
class Drift:
    palette: str
    colour: str
    expected: RGBA
    actual: RGBA | None      # None = цвет из сценария в сцене не найден
    distance: float

    @property
    def missing(self) -> bool:
        return self.actual is None


# ---------------------------------------------------------------------------
# Фасад
# ---------------------------------------------------------------------------

class Palettes:
    def __init__(self, bridge: HarmonyBridge):
        self.b = bridge

    def selftest(self) -> dict:
        return self.b.call("palettes_selftest", deadline_s=15.0).result

    def list(self) -> list[dict]:
        return self.b.call("palette_list", deadline_s=120.0).result["palettes"]

    def snapshot_as_script(self, tag: str) -> ColourScript:
        """Текущие палитры сцены -> сценарий. Так сценарий ЗАВОДИТСЯ:
        выкрасили эталонную серию руками, сняли снимок, положили в git."""
        targets = []
        for p in self.list():
            for c in p["colours"]:
                if c.get("rgba"):
                    targets.append(ColourTarget(
                        p["name"], c.get("name") or c.get("id"),
                        tuple(int(v) for v in c["rgba"]),  # type: ignore[arg-type]
                    ))
        return ColourScript({tag: targets})

    def drift_report(self, script: ColourScript, tag: str,
                     threshold: float = 5.0) -> list[Drift]:
        """Что уехало от сценария. Всегда только чтение."""
        targets = script.scenes.get(tag)
        if targets is None:
            raise KeyError(f"no scene tag {tag!r} in colour script; have {list(script.scenes)}")

        actual: dict[tuple[str, str], RGBA] = {}
        for p in self.list():
            for c in p["colours"]:
                if not c.get("rgba"):
                    continue
                rgba = tuple(int(v) for v in c["rgba"])
                for key in (c.get("id"), c.get("name")):
                    if key:
                        actual[(p["name"], str(key))] = rgba  # type: ignore[assignment]

        out: list[Drift] = []
        for t in targets:
            got = actual.get((t.palette, t.colour))
            if got is None:
                out.append(Drift(t.palette, t.colour, t.rgba, None, math.inf))
                continue
            d = colour_distance(t.rgba, got)
            if d > threshold:
                out.append(Drift(t.palette, t.colour, t.rgba, got, d))
        return out

    def apply_colour_script(self, script: ColourScript, tag: str,
                            commit: bool = False) -> dict:
        """
        Компилятор сценария в сцену. По умолчанию dry-run: возвращает план.
        commit=True пишет В ФАЙЛЫ ПАЛИТР — undo это не откатит, поэтому
        слово commit должно быть написано вызывающим, а не подразумеваться.
        """
        targets = script.scenes.get(tag)
        if targets is None:
            raise KeyError(f"no scene tag {tag!r} in colour script")
        edits = [{"palette": t.palette, "colour": t.colour, "rgba": list(t.rgba)}
                 for t in targets]
        return self.b.call("palette_set", {
            "edits": edits, "commit": commit,
        }, deadline_s=180.0).result


if __name__ == "__main__":
    import sys

    b = HarmonyBridge(sys.argv[1] if len(sys.argv) > 1 else "/tmp/mcp-harmony")
    p = Palettes(b)
    print("selftest:", p.selftest())
    for pal in p.list():
        print(f"  {pal['name']}: {len(pal['colours'])} colours")
