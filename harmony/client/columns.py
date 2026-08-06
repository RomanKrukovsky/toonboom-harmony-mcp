"""
columns.py — типизированная сторона xsheet_* / curve_* + spacing_synthesize.

Садится на HarmonyBridge из bridge_client.py.

Разделение обязанностей, важное для остальных семи тулов:
  Harmony  — только доступ к колонкам (читать/писать).
  Здесь    — вся математика: профили спейсинга, кривизна дуг, детект холдов.

Причина: математику в ES3 на GUI-потоке художника считать нельзя ни по
скорости, ни по отлаживаемости. Внутри Harmony живёт то, что снаружи
недоступно, и ничего больше.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Iterable, Literal, Sequence

from bridge_client import HarmonyBridge, HarmonyError

ColumnType = str  # "DRAWING" | "BEZIER" | "EASE" | "VELOBASED" | "3DPATH" | "SOUND" | ...
Continuity = Literal["SMOOTH", "CORNER", "STRAIGHT"]
Convention = Literal["relative", "absolute", "inconclusive", "failed", "unknown"]

VALUE_TYPES = {"BEZIER", "EASE", "VELOBASED", "3DPATH", "QUATERNIONPATH", "EXPR"}


class UncalibratedCurves(HarmonyError):
    """Синтез хендлов запрещён, пока конвенция не установлена эмпирически."""


@dataclass(frozen=True)
class Handles:
    lx: float = 0.0
    ly: float = 0.0
    rx: float = 0.0
    ry: float = 0.0

    def as_dict(self) -> dict:
        return {"lx": self.lx, "ly": self.ly, "rx": self.rx, "ry": self.ry}


@dataclass(frozen=True)
class Key:
    frame: float
    value: float
    handles: Handles | None = None
    const_segment: bool = False
    continuity: Continuity = "SMOOTH"

    def as_dict(self) -> dict:
        d: dict[str, Any] = {
            "frame": self.frame,
            "value": self.value,
            "const_segment": self.const_segment,
            "continuity": self.continuity,
        }
        if self.handles is not None:
            d["handles"] = self.handles.as_dict()
        return d

    @staticmethod
    def from_dict(d: dict) -> "Key":
        h = d.get("handles") or {}
        has_handles = any(h.get(k) is not None for k in ("lx", "ly", "rx", "ry"))
        return Key(
            frame=float(d["frame"]),
            value=float(d["value"]) if d.get("value") is not None else 0.0,
            handles=Handles(
                float(h.get("lx") or 0.0), float(h.get("ly") or 0.0),
                float(h.get("rx") or 0.0), float(h.get("ry") or 0.0),
            ) if has_handles else None,
            const_segment=bool(d.get("const_segment")),
            continuity=d.get("continuity") or "SMOOTH",
        )


@dataclass
class Exposure:
    """Запись экспозиции drawing-колонки: рисунок держится duration кадров."""
    frame: int
    value: str | None
    duration: int = 1

    @property
    def last_frame(self) -> int:
        return self.frame + self.duration - 1


@dataclass
class ColumnInfo:
    name: str
    type: ColumnType
    nodes: list[dict] = field(default_factory=list)
    frames: int | None = None

    @property
    def is_drawing(self) -> bool:
        return self.type == "DRAWING"

    @property
    def is_curve(self) -> bool:
        return self.type in VALUE_TYPES


# ---------------------------------------------------------------------------
# Профили спейсинга. Единственное место, где живёт «ремесло».
#
# Профиль возвращает нормализованный path: t in [0,1] -> s in [0,1].
# Дальше он превращается в ключи с хендлами; на неоткалиброванной сборке —
# в плотные ключи без хендлов (деградация, а не отказ).
# ---------------------------------------------------------------------------

Profile = Literal[
    "linear", "ease_in", "ease_out", "ease_in_out",
    "heavy_impact", "settle", "anticipation_overshoot", "custom",
]


def _bezier_1d(p0: float, p1: float, p2: float, p3: float, t: float) -> float:
    u = 1.0 - t
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3


# Control points (x1,y1,x2,y2) в нормализованном пространстве, как CSS-easing.
_EASINGS: dict[str, tuple[float, float, float, float]] = {
    "linear":       (0.33, 0.33, 0.67, 0.67),
    "ease_in":      (0.42, 0.00, 1.00, 1.00),
    "ease_out":     (0.00, 0.00, 0.58, 1.00),
    "ease_in_out":  (0.42, 0.00, 0.58, 1.00),
    # Тяжёлое падение = свободное падение = s ~ t².
    # Эти контрольные точки приближают t² с погрешностью 0.003 по позиции;
    # проверено тестом. Важно именно оно, а не «на глаз похоже»: скорость
    # должна расти МОНОТОННО до контакта. Первый подобранный вариант
    # (0.55,0.06,0.9,0.99) замедлялся на последних кадрах — тело перед
    # ударом притормаживало, что читается как всплытие, а не как вес.
    "heavy_impact": (0.33, 0.00, 0.67, 0.33),
}


def _solve_bezier_t_for_x(cx1: float, cx2: float, x: float) -> float:
    """Ньютон + бисекция: устойчиво там, где производная около нуля."""
    t = x
    for _ in range(8):
        fx = _bezier_1d(0.0, cx1, cx2, 1.0, t) - x
        if abs(fx) < 1e-7:
            return t
        d = 3 * (1 - t) ** 2 * cx1 + 6 * (1 - t) * t * (cx2 - cx1) + 3 * t ** 2 * (1 - cx2)
        if abs(d) < 1e-9:
            break
        t -= fx / d
    lo, hi = 0.0, 1.0
    for _ in range(40):
        t = (lo + hi) / 2
        if _bezier_1d(0.0, cx1, cx2, 1.0, t) < x:
            lo = t
        else:
            hi = t
    return (lo + hi) / 2


def sample_profile(profile: Profile, n: int, params: dict | None = None) -> list[float]:
    """n нормализованных значений s(t), t равномерно по кадрам."""
    params = params or {}
    if n < 2:
        return [1.0] * max(n, 1)

    if profile == "custom":
        vel = params.get("custom_velocity")
        if not vel:
            raise ValueError("profile='custom' requires params['custom_velocity']")
        total = float(sum(vel)) or 1.0
        out, acc = [0.0], 0.0
        for v in vel:
            acc += v
            out.append(acc / total)
        # Подгонка длины под n
        return [out[min(int(round(i * (len(out) - 1) / (n - 1))), len(out) - 1)] for i in range(n)]

    if profile == "anticipation_overshoot":
        anti = float(params.get("anticipation_pct", 8.0)) / 100.0
        over = float(params.get("overshoot_pct", 12.0)) / 100.0
        # три фазы: замах назад, основной ход с перелётом, возврат
        a_end = float(params.get("anticipation_frac", 0.18))
        o_peak = float(params.get("overshoot_frac", 0.72))
        out = []
        for i in range(n):
            t = i / (n - 1)
            if t <= a_end:
                u = t / a_end if a_end > 0 else 1.0
                out.append(-anti * math.sin(u * math.pi / 2))
            elif t <= o_peak:
                u = (t - a_end) / max(o_peak - a_end, 1e-6)
                cx1, cy1, cx2, cy2 = _EASINGS["ease_out"]
                bt = _solve_bezier_t_for_x(cx1, cx2, u)
                s = _bezier_1d(0.0, cy1, cy2, 1.0, bt)
                out.append(-anti + (1.0 + over + anti) * s)
            else:
                u = (t - o_peak) / max(1.0 - o_peak, 1e-6)
                out.append(1.0 + over * (1.0 - u) * math.cos(u * math.pi / 2))
        out[-1] = 1.0
        return out

    if profile == "settle":
        cycles = float(params.get("settle_cycles", 2.0))
        damp = float(params.get("damping", 4.5))
        out = []
        for i in range(n):
            t = i / (n - 1)
            out.append(1.0 - math.exp(-damp * t) * math.cos(cycles * math.pi * t))
        out[-1] = 1.0
        return out

    cx1, cy1, cx2, cy2 = _EASINGS.get(profile, _EASINGS["linear"])
    out = []
    for i in range(n):
        x = i / (n - 1)
        bt = _solve_bezier_t_for_x(cx1, cx2, x)
        out.append(_bezier_1d(0.0, cy1, cy2, 1.0, bt))
    out[-1] = 1.0
    return out


# ---------------------------------------------------------------------------
# Фасад
# ---------------------------------------------------------------------------


class Columns:
    def __init__(self, bridge: HarmonyBridge):
        self.b = bridge
        self._convention: Convention = "unknown"

    # -- инвентарь ---------------------------------------------------------

    def list(self, types: Sequence[str] | None = None,
             columns: Sequence[str] | None = None,
             with_nodes: bool = True) -> list[ColumnInfo]:
        r = self.b.call("xsheet_list", {
            "types": list(types) if types else None,
            "columns": list(columns) if columns else None,
            "with_nodes": with_nodes,
        }, deadline_s=60.0)
        return [ColumnInfo(c["name"], c["type"], c.get("nodes") or [], c.get("frames"))
                for c in r.result["columns"]]

    def selftest(self) -> dict:
        return self.b.call("columns_selftest", deadline_s=15.0).result

    # -- xsheet ------------------------------------------------------------

    def get_exposures(self, column: str, frm: int | None = None, to: int | None = None,
                      collapse: bool = True) -> list[Exposure]:
        r = self.b.call("xsheet_get", {
            "columns": [column], "from": frm, "to": to, "collapse_holds": collapse,
        }, deadline_s=120.0)
        cols = r.result["columns"]
        if not cols:
            raise HarmonyError("NO_SUCH_COLUMN", column)
        entries = cols[0].get("entries") or []
        return [Exposure(int(e["frame"]), e.get("value"), int(e.get("duration", 1))) for e in entries]

    def get_table(self, columns: Sequence[str] | None = None,
                  types: Sequence[str] | None = None,
                  frm: int | None = None, to: int | None = None) -> dict:
        return self.b.call("xsheet_get", {
            "columns": list(columns) if columns else None,
            "types": list(types) if types else None,
            "from": frm, "to": to,
        }, deadline_s=180.0).result

    def set_entries(self, edits: Iterable[dict], strict: bool = True,
                    verify: bool = True) -> dict:
        """edits: [{column, frame, value, duration?}]"""
        payload = list(edits)
        if not payload:
            return {"applied": 0, "rejected": []}
        return self.b.call("xsheet_set", {
            "edits": payload, "strict": strict, "verify": verify,
        }, deadline_s=120.0).result

    def set_exposure(self, column: str, frame: int, drawing: str, duration: int = 1) -> dict:
        return self.set_entries([{"column": column, "frame": frame,
                                  "value": drawing, "duration": duration}])

    # -- curves ------------------------------------------------------------

    def calibrate(self, force: bool = False) -> Convention:
        """Обязательно до любого синтеза хендлов. Идемпотентно."""
        if self._convention in ("relative", "absolute") and not force:
            return self._convention
        r = self.b.call("curve_calibrate", deadline_s=30.0).result
        self._convention = r["convention"]
        return self._convention

    @property
    def can_synthesize(self) -> bool:
        return self._convention in ("relative", "absolute")

    def get_curve(self, column: str) -> list[Key]:
        r = self.b.call("curve_get", {"column": column}, deadline_s=60.0).result
        conv = r.get("handle_convention")
        if conv in ("relative", "absolute"):
            self._convention = conv
        return [Key.from_dict(k) for k in r["keys"]]

    def set_curve(self, column: str, keys: Sequence[Key],
                  replace: bool = False, clear: bool = False) -> dict:
        needs_handles = any(k.handles is not None for k in keys)
        if needs_handles and not self.can_synthesize:
            self.calibrate()
        if needs_handles and not self.can_synthesize:
            raise UncalibratedCurves(
                "UNCALIBRATED",
                f"handle convention is {self._convention!r}; refusing to write synthesized handles. "
                "Use dense_keys=True to emit handle-free keys instead.",
            )
        return self.b.call("curve_set", {
            "column": column,
            "keys": [k.as_dict() for k in keys],
            "replace": replace, "clear": clear,
        }, deadline_s=120.0).result

    def sample(self, column: str, frm: int, to: int) -> dict:
        return self.b.call("curve_sample", {
            "column": column, "from": frm, "to": to,
        }, deadline_s=120.0).result

    # -- spacing_synthesize -----------------------------------------------

    def spacing_synthesize(
        self,
        column: str,
        from_frame: int,
        to_frame: int,
        from_value: float,
        to_value: float,
        profile: Profile = "ease_in_out",
        params: dict | None = None,
        *,
        dense_keys: bool | None = None,
        apply: bool = True,
        replace: bool = True,
    ) -> dict:
        """
        Из «тяжёлое падение, 6 кадров, потом сеттл на 3» — в ключи на кривой.

        dense_keys=None (по умолчанию) — решает автоматически:
          профиль выражается двумя ключами с хендлами и конвенция известна →
          два ключа; иначе — ключ на каждый кадр без хендлов. Второй путь
          некрасив в редакторе кривых, но численно точен на любой сборке.
        """
        if to_frame <= from_frame:
            raise ValueError("to_frame must be > from_frame")

        n = int(to_frame - from_frame) + 1
        s = sample_profile(profile, n, params)
        delta = to_value - from_value
        values = [from_value + delta * v for v in s]

        analytic = profile in _EASINGS
        if dense_keys is None:
            if analytic:
                self.calibrate()
            dense_keys = not (analytic and self.can_synthesize)

        if dense_keys:
            keys = [Key(frame=from_frame + i, value=values[i], continuity="SMOOTH")
                    for i in range(n)]
        else:
            cx1, cy1, cx2, cy2 = _EASINGS[profile]
            span = float(to_frame - from_frame)
            # Хендлы в кадрах/единицах значения; конвенция учтена в bridge.
            keys = [
                Key(from_frame, from_value,
                    handles=Handles(0.0, 0.0, cx1 * span, cy1 * delta)),
                Key(to_frame, to_value,
                    handles=Handles(-(1.0 - cx2) * span, -(1.0 - cy2) * delta, 0.0, 0.0)),
            ]

        preview = [{"frame": from_frame + i, "value": values[i]} for i in range(n)]
        result: dict[str, Any] = {
            "column": column,
            "profile": profile,
            "mode": "dense" if dense_keys else "handles",
            "keys_planned": len(keys),
            "preview": preview,
            "velocity": [round(values[i + 1] - values[i], 6) for i in range(n - 1)],
            "convention": self._convention,
        }
        if apply:
            result["write"] = self.set_curve(column, keys, replace=replace)
        return result

    # -- аналитика: то, на чём стоят идеи 18 и 25 --------------------------

    def audit_arcs(self, columns: Sequence[str], frm: int, to: int,
                   flat_threshold: float = 1e-3) -> list[dict]:
        """
        Кривизна траектории по паре колонок (обычно pivot X/Y).
        Плоская дуга — участок, где радиус кривизны стремится к бесконечности.
        """
        if len(columns) < 2:
            raise ValueError("audit_arcs needs at least X and Y columns")
        xs = self.sample(columns[0], frm, to)["values"]
        ys = self.sample(columns[1], frm, to)["values"]
        findings = []
        for i in range(1, min(len(xs), len(ys)) - 1):
            if None in (xs[i - 1], xs[i], xs[i + 1], ys[i - 1], ys[i], ys[i + 1]):
                continue
            dx1, dy1 = xs[i] - xs[i - 1], ys[i] - ys[i - 1]
            dx2, dy2 = xs[i + 1] - xs[i], ys[i + 1] - ys[i]
            cross = dx1 * dy2 - dy1 * dx2
            mag = (math.hypot(dx1, dy1) * math.hypot(dx2, dy2)) or 1e-12
            curvature = abs(cross) / mag
            if curvature < flat_threshold and (abs(dx1) + abs(dy1)) > 1e-6:
                findings.append({
                    "frame": frm + i, "curvature": curvature,
                    "rule": "flat-arc",
                    "message": "movement is locally straight; classic 'no arc' tell",
                })
        return findings

    def find_dead_holds(self, column: str, frm: int, to: int,
                        min_frames: int = 8) -> list[dict]:
        """Статичные удержания на кривой — вход для микродрейфа (идея №25)."""
        s = self.sample(column, frm, to)
        vel = s["velocity"]
        out, run_start = [], None
        for i, v in enumerate(vel):
            still = v is not None and abs(v) < 1e-9
            if still and run_start is None:
                run_start = i
            elif not still and run_start is not None:
                if i - run_start >= min_frames:
                    out.append({"from": frm + run_start, "to": frm + i,
                                "frames": i - run_start, "rule": "dead-hold"})
                run_start = None
        if run_start is not None and len(vel) - run_start >= min_frames:
            out.append({"from": frm + run_start, "to": frm + len(vel),
                        "frames": len(vel) - run_start, "rule": "dead-hold"})
        return out


if __name__ == "__main__":
    import json
    import sys

    b = HarmonyBridge(sys.argv[1] if len(sys.argv) > 1 else "/tmp/mcp-harmony")
    c = Columns(b)
    print("selftest:", json.dumps(c.selftest(), indent=2))
    print("convention:", c.calibrate())
    for ci in c.list()[:20]:
        print(f"  {ci.type:<14} {ci.name}")
