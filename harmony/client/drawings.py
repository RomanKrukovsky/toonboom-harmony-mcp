"""
drawings.py — подмена рисунков: липсинк и моргания.

Садится на HarmonyBridge (bridge_client.py) и операции из drawings.js:
    drawing_nodes, substitution_get, substitution_set.

Разделение то же, что в columns.py:
  Harmony  — только «какие рисунки есть» и «поставь рисунок на кадр».
  Здесь    — вся логика: фонемы -> рты, моргания, правила холдов.

Почему логика снаружи: правило «рот не держится меньше 2 кадров» должно
проверяться тестом без запущенного Harmony. Правило, которое нельзя
протестировать, — это правило, которое однажды молча перестанет выполняться.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Literal, Sequence

from bridge_client import HarmonyBridge, HarmonyError


# ---------------------------------------------------------------------------
# Типы
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Assignment:
    """Один рисунок на кадр (или на несколько кадров подряд)."""
    frame: int
    drawing: str | None          # None = пустой кадр
    duration: int = 1

    def as_dict(self) -> dict:
        return {"frame": self.frame, "drawing": self.drawing, "duration": self.duration}


@dataclass(frozen=True)
class Phoneme:
    """Фонема из внешнего анализа звука: что звучит и когда."""
    sound: str            # "AA", "M", "F", "rest", ...
    start_s: float
    end_s: float


# ---------------------------------------------------------------------------
# Карта фонем -> рты.
#
# Стандартный набор ртов в cutout-ригах — 8-10 позиций (схема Престона Блэра).
# Ключи словаря — обобщённые классы звуков; конкретный риг подключается через
# MouthSet: перечисление, какие рисунки в этом риге соответствуют классам.
# ---------------------------------------------------------------------------

# Класс звука -> каноническое имя позиции рта
PHONEME_CLASS: dict[str, str] = {
    # гласные открытые
    "AA": "open", "AE": "open", "AH": "open", "AO": "open", "AW": "open", "AY": "open",
    # гласные узкие
    "IY": "wide", "IH": "wide", "EY": "wide", "EH": "wide",
    # округлённые
    "UW": "round", "UH": "round", "OW": "round", "OY": "round",
    "W": "round",
    # смычные губные — губы сомкнуты
    "M": "closed", "B": "closed", "P": "closed",
    # губно-зубные
    "F": "teeth", "V": "teeth",
    # язык к зубам
    "TH": "tongue", "DH": "tongue", "L": "tongue",
    # остальные согласные — полуоткрытый нейтральный
    "S": "narrow", "Z": "narrow", "T": "narrow", "D": "narrow", "N": "narrow",
    "K": "narrow", "G": "narrow", "CH": "narrow", "JH": "narrow", "SH": "narrow",
    "ZH": "narrow", "R": "narrow", "Y": "narrow", "HH": "narrow", "ER": "narrow",
    # тишина
    "rest": "rest", "sil": "rest", "sp": "rest", "": "rest",
}

CANONICAL_MOUTHS = ["rest", "closed", "narrow", "wide", "open", "round", "teeth", "tongue"]


@dataclass
class MouthSet:
    """
    Привязка канонических позиций к рисункам конкретного рига.
    fallback-цепочка: если в риге нет 'tongue', берём 'narrow', и т.д.
    """
    mapping: dict[str, str]      # canonical -> имя рисунка в элементе

    _FALLBACK = {
        "tongue": "narrow", "teeth": "narrow", "round": "open",
        "wide": "narrow", "narrow": "open", "open": "rest", "closed": "rest",
    }

    def resolve(self, canonical: str) -> str:
        seen = set()
        c = canonical
        while c not in self.mapping:
            if c in seen or c not in self._FALLBACK:
                raise KeyError(f"mouth set cannot express {canonical!r}; mapping={list(self.mapping)}")
            seen.add(c)
            c = self._FALLBACK[c]
        return self.mapping[c]

    @staticmethod
    def guess_from_library(drawings: Sequence[str]) -> "MouthSet":
        """
        Пытается угадать привязку по именам рисунков рига.
        Работает для ригов с осмысленными именами (mouth_open, M_closed, ...).
        Для ригов с именами '1'..'8' привязку задаёт человек — угадывать нечего.
        """
        hints = {
            "rest": ("rest", "neutral", "default", "idle"),
            "closed": ("closed", "mbp", "shut"),
            "narrow": ("narrow", "small", "cdgk", "etc"),
            "wide": ("wide", "ee", "smile"),
            "open": ("open", "aa", "ah", "big"),
            "round": ("round", "oo", "uw", "o"),
            "teeth": ("teeth", "fv"),
            "tongue": ("tongue", "th", "l"),
        }
        mapping: dict[str, str] = {}
        low = [(d, d.lower()) for d in drawings]
        for canon, keys in hints.items():
            for d, dl in low:
                if any(k in dl for k in keys):
                    mapping[canon] = d
                    break
        if "rest" not in mapping and drawings:
            mapping["rest"] = drawings[0]
        return MouthSet(mapping)


# ---------------------------------------------------------------------------
# Липсинк: фонемы -> назначения рисунков
# ---------------------------------------------------------------------------

def lipsync_assignments(
    phonemes: Sequence[Phoneme],
    mouths: MouthSet,
    fps: float = 24.0,
    *,
    min_hold: int = 2,
    lead_frames: int = 1,
    start_frame: int = 1,
    end_frame: int | None = None,
) -> list[Assignment]:
    """
    Правила, ради которых эта функция существует (а не тривиальный маппинг):

    min_hold=2 — рот не может держаться один кадр. Однокадровый рот на
      24 fps не читается, а мерцает; классическое правило «анимируй рты
      по двойкам». Слишком короткая фонема ПОГЛОЩАЕТСЯ соседней, а не
      выжимается в мерцающий кадр.

    lead_frames=1 — рот опережает звук на кадр. Зритель сначала видит
      артикуляцию, потом слышит звук: так работает восприятие речи, и
      синхрон «кадр в кадр» парадоксально выглядит отстающим.
      Это и есть настраиваемая часть идеи №22: lead_frames можно гнать
      в минус для намеренного рассинхрона (комедийный дубляж).
    """
    if fps <= 0:
        raise ValueError("fps must be positive")
    if min_hold < 1:
        raise ValueError("min_hold must be >= 1")

    # 1. Фонемы -> (кадр начала, рисунок), с опережением
    raw: list[tuple[int, str]] = []
    for p in phonemes:
        canon = PHONEME_CLASS.get(p.sound.upper() if p.sound else "", None)
        if canon is None:
            canon = PHONEME_CLASS.get(p.sound.lower(), "narrow")
        f = start_frame + int(round(p.start_s * fps)) - lead_frames
        raw.append((max(start_frame, f), mouths.resolve(canon)))

    if not raw:
        return []
    raw.sort(key=lambda t: t[0])

    # 2. Схлопываем одинаковых соседей и поглощаем слишком короткие
    merged: list[tuple[int, str]] = []
    for f, d in raw:
        if merged and merged[-1][1] == d:
            continue                      # тот же рот — продолжается
        if merged and f - merged[-1][0] < min_hold:
            # предыдущий рот не успел прожить min_hold: он поглощается,
            # НО только если он не 'closed' — смычка губ (М/Б/П) обязана
            # быть видна, иначе «мама» превращается в «ааа»
            prev_f, prev_d = merged[-1]
            if prev_d == mouths.resolve("closed"):
                f = prev_f + min_hold     # сдвигаем текущий, смычку сохраняем
            else:
                merged.pop()              # поглощаем предыдущий
                if merged and merged[-1][1] == d:
                    continue
        merged.append((f, d))

    # 3. В назначения с длительностями
    out: list[Assignment] = []
    last = end_frame if end_frame is not None else (
        start_frame + int(round(phonemes[-1].end_s * fps)) if phonemes else start_frame
    )
    for i, (f, d) in enumerate(merged):
        nxt = merged[i + 1][0] if i + 1 < len(merged) else last + 1
        dur = max(min_hold, nxt - f)
        out.append(Assignment(frame=f, drawing=d, duration=dur))
    return out


# ---------------------------------------------------------------------------
# Моргания: процесс Пуассона, засеянный состоянием (идея №23)
# ---------------------------------------------------------------------------

EmotionalState = Literal["calm", "focused", "nervous", "tired", "lying"]

# Средний интервал между морганиями, секунды. Числа из наблюдений за людьми:
# спокойный человек ~ каждые 4 с, сосредоточенный реже, нервный чаще.
BLINK_MEAN_INTERVAL_S: dict[str, float] = {
    "calm": 4.0,
    "focused": 7.0,
    "nervous": 1.8,
    "tired": 3.0,      # реже сами моргания, но длиннее (см. hold ниже)
    "lying": 2.2,
}

# Сколько кадров глаз закрыт (на 24 fps): у уставшего веки тяжёлые
BLINK_HOLD_FRAMES: dict[str, int] = {
    "calm": 2, "focused": 2, "nervous": 1, "tired": 4, "lying": 2,
}


def blink_assignments(
    duration_s: float,
    *,
    state: EmotionalState = "calm",
    fps: float = 24.0,
    start_frame: int = 1,
    eye_open: str = "open",
    eye_half: str = "half",
    eye_closed: str = "closed",
    seed: int | None = None,
    min_gap_s: float = 0.6,
    avoid_frames: Sequence[int] = (),
) -> list[Assignment]:
    """
    Генерирует моргания как пуассоновский процесс.

    Почему не «каждые N секунд»: регулярное моргание — главный признак
    мёртвой анимации, глаз зрителя ловит метроном мгновенно. Пуассоновский
    процесс даёт правильную «случайность с характером»: интервалы разные,
    средняя частота задана состоянием персонажа.

    seed делает результат воспроизводимым: тот же сид — те же моргания.
    Это важно для ретейков — «поменяй только рты» не должно перетряхивать глаза.

    avoid_frames — кадры, где моргать нельзя (акценты игры: удар, ключевой
    взгляд). Моргание, попавшее в запретный кадр, сдвигается после него.

    Одно моргание = 4 назначения: half -> closed(hold) -> half -> open.
    Без полукадров моргание выглядит как щелчок, а не движение век.
    """
    if duration_s <= 0:
        return []
    mean = BLINK_MEAN_INTERVAL_S[state]
    hold = BLINK_HOLD_FRAMES[state]
    rng = random.Random(seed)
    avoid = set(int(f) for f in avoid_frames)

    # Экспоненциальные интервалы = пуассоновский поток событий
    times: list[float] = []
    t = rng.expovariate(1.0 / mean)
    while t < duration_s:
        if not times or (t - times[-1]) >= min_gap_s:
            times.append(t)
        t += rng.expovariate(1.0 / mean)

    out: list[Assignment] = []
    blink_len = 2 + hold  # half(1) + closed(hold) + half(1); open идёт следом
    last_end = start_frame - 1
    for bt in times:
        f = start_frame + int(round(bt * fps))
        # сдвиг из запретных кадров и от предыдущего моргания
        while any((f + k) in avoid for k in range(blink_len)) or f <= last_end:
            f += 1
        if f + blink_len > start_frame + int(duration_s * fps):
            break
        out.append(Assignment(f, eye_half, 1))
        out.append(Assignment(f + 1, eye_closed, hold))
        out.append(Assignment(f + 1 + hold, eye_half, 1))
        out.append(Assignment(f + 2 + hold, eye_open, 1))
        last_end = f + blink_len
    return out


# ---------------------------------------------------------------------------
# Фасад
# ---------------------------------------------------------------------------

class Drawings:
    def __init__(self, bridge: HarmonyBridge):
        self.b = bridge

    def selftest(self) -> dict:
        return self.b.call("drawings_selftest", deadline_s=15.0).result

    def nodes(self) -> list[dict]:
        return self.b.call("drawing_nodes", deadline_s=120.0).result["nodes"]

    def get(self, node: str, frm: int | None = None, to: int | None = None) -> dict:
        return self.b.call("substitution_get", {
            "node": node, "from": frm, "to": to,
        }, deadline_s=120.0).result

    def set(self, node: str, assignments: Sequence[Assignment],
            validate: bool = True, verify: bool = True) -> dict:
        if not assignments:
            return {"applied": 0}
        return self.b.call("substitution_set", {
            "node": node,
            "assignments": [a.as_dict() for a in assignments],
            "validate": validate, "verify": verify,
        }, deadline_s=180.0).result

    def library(self, node: str) -> list[str]:
        return [d["drawing"] for d in self.get(node, 1, 1)["library"]]

    # -- готовые сценарии ----------------------------------------------------

    def apply_lipsync(self, node: str, phonemes: Sequence[Phoneme],
                      mouths: MouthSet | None = None, fps: float = 24.0,
                      lead_frames: int = 1, start_frame: int = 1) -> dict:
        if mouths is None:
            mouths = MouthSet.guess_from_library(self.library(node))
        plan = lipsync_assignments(phonemes, mouths, fps,
                                   lead_frames=lead_frames, start_frame=start_frame)
        res = self.set(node, plan)
        res["plan"] = [a.as_dict() for a in plan]
        res["mouth_mapping"] = mouths.mapping
        return res

    def apply_blinks(self, node: str, duration_s: float,
                     state: EmotionalState = "calm", seed: int | None = None,
                     fps: float = 24.0, start_frame: int = 1,
                     avoid_frames: Sequence[int] = (), **eye_names) -> dict:
        plan = blink_assignments(duration_s, state=state, fps=fps, seed=seed,
                                 start_frame=start_frame, avoid_frames=avoid_frames,
                                 **eye_names)
        res = self.set(node, plan)
        res["plan"] = [a.as_dict() for a in plan]
        res["blink_count"] = sum(1 for a in plan if a.duration > 1)
        return res


if __name__ == "__main__":
    import json
    import sys

    b = HarmonyBridge(sys.argv[1] if len(sys.argv) > 1 else "/tmp/mcp-harmony")
    d = Drawings(b)
    print("selftest:", json.dumps(d.selftest(), indent=2))
    for n in d.nodes()[:20]:
        print(f"  {n['drawing_count'] or 0:>3} drawings  {n['node']}")
