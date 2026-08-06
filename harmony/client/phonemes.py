"""
phonemes.py — из WAV-файла в список «звук + время» для липсинка.

Замыкает цепочку: WAV -> Phoneme[] -> lipsync_assignments() -> substitution_set.

ЧЕСТНОЕ ОГРАНИЧЕНИЕ, написанное большими буквами:
это НЕ распознавание речи. Настоящие фонемы даёт внешняя модель
(Whisper, Montreal Forced Aligner) — сюда она втыкается через
`phonemes_from_alignment()`, интерфейс уже готов.

То, что здесь, — акустическая сегментация на слух:
  тишина          -> rest   (рот в покое)
  короткая пауза  -> M      (смычка губ: в речи короткое молчание
                             посреди слова — это почти всегда п/б/м)
  низкий тон      -> AA     (открытая гласная)
  высокий тон     -> IY     (узкая гласная)
  шум/шипение     -> S      (согласная)

Для ртов из 8 позиций этого достаточно, чтобы речь читалась.
Различить «о» и «а» без формантного анализа нельзя — и мы не делаем вид,
что можем.

Только стандартная библиотека: wave + struct. Никаких numpy/scipy —
модуль обязан работать на голом python рядом с MCP-сервером.
"""

from __future__ import annotations

import struct
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from drawings import Phoneme


# ---------------------------------------------------------------------------
# Чтение WAV
# ---------------------------------------------------------------------------

def load_wav(path: str | Path) -> tuple[list[float], int]:
    """16-бит PCM, моно или стерео (стерео сводится в моно). -> (samples, rate)"""
    with wave.open(str(path), "rb") as w:
        ch, sw, rate, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        if sw != 2:
            raise ValueError(f"only 16-bit PCM supported, got {sw * 8}-bit")
        raw = w.readframes(n)

    total = len(raw) // 2
    ints = struct.unpack(f"<{total}h", raw)
    if ch == 1:
        return [s / 32768.0 for s in ints], rate
    if ch == 2:
        return [(ints[i] + ints[i + 1]) / 65536.0 for i in range(0, total - 1, 2)], rate
    raise ValueError(f"unsupported channel count: {ch}")


# ---------------------------------------------------------------------------
# Оконный анализ: энергия + частота пересечений нуля
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Window:
    t: float      # центр окна, секунды
    rms: float    # громкость
    zcr: float    # zero-crossing rate: доля смен знака
    hz: float     # оценка доминирующей частоты: zcr * rate / 2


def analyze(samples: Sequence[float], rate: int,
            win_ms: float = 20.0, hop_ms: float = 10.0) -> list[Window]:
    win = max(8, int(rate * win_ms / 1000))
    hop = max(4, int(rate * hop_ms / 1000))
    out: list[Window] = []
    i = 0
    n = len(samples)
    while i + win <= n:
        chunk = samples[i:i + win]
        acc = 0.0
        flips = 0
        prev_pos = chunk[0] >= 0
        for s in chunk:
            acc += s * s
            pos = s >= 0
            if pos != prev_pos:
                flips += 1
                prev_pos = pos
        zcr = flips / win
        out.append(Window(
            t=(i + win / 2) / rate,
            rms=(acc / win) ** 0.5,
            zcr=zcr,
            hz=zcr * rate / 2.0,   # для синуса ZCR = 2f/rate, отсюда f
        ))
        i += hop
    return out


# ---------------------------------------------------------------------------
# Сегментация и классификация
# ---------------------------------------------------------------------------

# Пороги в ГЕРЦАХ, не в долях ZCR.
#
# Регрессия, которую поймал тест: пороги в сырых долях ZCR зависят от
# частоты дискретизации записи. Тон 2200 Гц на записи 24 кГц давал
# ZCR=0.181 и падал ровно на границу «узкая гласная / шум» — та же
# запись на 48 кГц дала бы 0.09 и распозналась бы правильно. То есть
# один и тот же голос классифицировался бы по-разному в зависимости от
# настроек рекордера. Герцы от рекордера не зависят.
#
# Физика: основной тон гласных 100-300 Гц, у узких гласных (и/э) энергия
# смещена вверх (~2-3 кГц у второй форманты), шипящие — широкополосный шум
# с центром 4-8 кГц.
HZ_OPEN_MAX = 800.0    # ниже — открытая гласная
HZ_WIDE_MAX = 3200.0   # ниже — узкая гласная; выше — шум/шипящая

# Пауза короче этого — не тишина, а смычка губ (п/б/м).
CLOSURE_MIN_S = 0.03
CLOSURE_MAX_S = 0.16


def _classify(w: Window, silence_rms: float) -> str:
    if w.rms < silence_rms:
        return "rest"
    if w.hz < HZ_OPEN_MAX:
        return "AA"
    if w.hz < HZ_WIDE_MAX:
        return "IY"
    return "S"


def segment(windows: Sequence[Window],
            min_seg_s: float = 0.04,
            silence_floor: float = 0.004,
            silence_ratio: float = 0.08) -> list[Phoneme]:
    """
    Окна -> сегменты. Порог тишины адаптивный: доля от пиковой громкости,
    но не ниже абсолютного пола (иначе тихая запись целиком станет «речью
    из шума»).
    """
    if not windows:
        return []
    peak = max(w.rms for w in windows)
    silence_rms = max(silence_floor, peak * silence_ratio)

    # 1. Классифицируем каждое окно, склеиваем одинаковых соседей
    raw: list[list] = []   # [label, start, end]
    for w in windows:
        lab = _classify(w, silence_rms)
        if raw and raw[-1][0] == lab:
            raw[-1][2] = w.t
        else:
            raw.append([lab, w.t, w.t])

    # 2. Сегменты короче min_seg_s поглощаются предыдущим (дребезг окон)
    segs: list[list] = []
    for lab, a, b in raw:
        if segs and (b - a) < min_seg_s and lab != "rest":
            segs[-1][2] = b
        else:
            segs.append([lab, a, b])

    # 3. Короткая тишина МЕЖДУ речью -> смычка губ "M".
    #    Это самое ценное правило: без него все п/б/м пропадают,
    #    а именно их отсутствие зритель ловит как «рот врёт».
    out: list[Phoneme] = []
    for i, (lab, a, b) in enumerate(segs):
        if (lab == "rest"
                and 0 < i < len(segs) - 1
                and segs[i - 1][0] != "rest"
                and segs[i + 1][0] != "rest"
                and CLOSURE_MIN_S <= (b - a) <= CLOSURE_MAX_S):
            out.append(Phoneme("M", a, b))
        else:
            out.append(Phoneme(lab, a, b))
    return out


def wav_to_phonemes(path: str | Path, **kw) -> list[Phoneme]:
    samples, rate = load_wav(path)
    return segment(analyze(samples, rate), **kw)


# ---------------------------------------------------------------------------
# Разъём для настоящего распознавания
# ---------------------------------------------------------------------------

def phonemes_from_alignment(items: Sequence[dict]) -> list[Phoneme]:
    """
    Вход — выравнивание из внешней модели (Whisper с таймстемпами, MFA, gentle):
        [{"phone": "AA1", "start": 0.12, "end": 0.31}, ...]
    Стресс-суффиксы ARPAbet (AA1 -> AA) срезаются.
    """
    out = []
    for it in items:
        p = str(it.get("phone") or it.get("sound") or "").strip()
        while p and p[-1].isdigit():
            p = p[:-1]
        out.append(Phoneme(p or "rest", float(it["start"]), float(it["end"])))
    return out
