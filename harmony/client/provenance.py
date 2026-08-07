"""
provenance.py — реестр происхождения кадра (идея №60).

Из исходного списка, дословно: «Каждый кадр несёт подпись: что
сгенерировано, что нарисовано человеком, чей стиль использован.
Единственный способ, при котором вся конструкция выше вообще
юридически существует».

Реализация: append-only журнал с хэш-цепочкой.

  - Каждая запись: кто (человек/агент/инструмент), что сделал
    (какой тул, какие кадры, какой сид), когда, на основе чего
    (чей стиль, какой референс).
  - Каждая запись включает хэш предыдущей => задним числом переписать
    середину журнала нельзя, не сломав всю цепочку после неё.
    Это не криптографическая подпись (ключей нет), это защита от
    ТИХОЙ правки: подделка возможна только полной перезаписью хвоста,
    а она видна по расхождению с любой сохранённой копией.
  - Отчёт по кадру: свод всех записей, коснувшихся кадра N, —
    ответ на вопрос юриста «кто нарисовал этот кадр».

Интеграция: фасады слоёв уже возвращают паспорта (ImperfectionRecord,
blink seed, mouth mapping) — сюда они складываются как attribution.
"""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator, Literal, Sequence

Origin = Literal["human", "agent", "tool", "style-transfer"]

GENESIS = "0" * 16


def _canon(data: dict) -> str:
    """Канонический JSON: сортированные ключи, без пробелов.
    Без этого одинаковая запись может дать разные хэши."""
    return json.dumps(data, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=True)


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


@dataclass(frozen=True)
class Entry:
    seq: int
    prev_hash: str
    origin: Origin
    actor: str                    # "ivan.petrov" | "claude/lipsync" | "mcpb/boil"
    action: str                   # "substitution_set", "curve_set", ...
    scene: str
    frames: tuple[int, int]       # диапазон включительно
    targets: tuple[str, ...]      # ноды/колонки
    style_of: str | None = None   # чей стиль использован (идея №10/№14)
    seed: int | None = None
    detail: dict = field(default_factory=dict)
    timestamp: str = ""           # ISO; проставляет журнал

    def payload(self) -> dict:
        return {
            "seq": self.seq, "prev_hash": self.prev_hash,
            "origin": self.origin, "actor": self.actor,
            "action": self.action, "scene": self.scene,
            "frames": list(self.frames), "targets": list(self.targets),
            "style_of": self.style_of, "seed": self.seed,
            "detail": self.detail, "timestamp": self.timestamp,
        }

    @property
    def hash(self) -> str:
        return _hash(_canon(self.payload()))


class Ledger:
    """
    Журнал в JSONL-файле: одна строка — одна запись + её хэш.
    Файл лежит рядом со сценой и коммитится в git вместе с ней.
    """

    def __init__(self, path: str | Path):
        self.path = Path(path)
        self._entries: list[Entry] = []
        self._hashes: list[str] = []
        self.truncated = 0     # обрубков, отброшенных при загрузке
        if self.path.exists():
            self._load()

    def _load(self) -> None:
        for line in self.path.read_text(encoding="utf-8",
                                        errors="replace").splitlines():
            if not line.strip():
                continue
            try:
                rec = json.loads(line)
                stored_hash = rec.pop("hash")
            except (json.JSONDecodeError, KeyError):
                # Падение посреди дописки: последняя строка обрублена. Она
                # означает касание, которое не завершилось, то есть его нет.
                # Ронять весь реестр из-за неё нельзя — тогда авария стирает
                # ВСЮ историю серии, а не последнюю запись.
                self.truncated += 1
                continue
            e = Entry(
                seq=rec["seq"], prev_hash=rec["prev_hash"],
                origin=rec["origin"], actor=rec["actor"],
                action=rec["action"], scene=rec["scene"],
                frames=tuple(rec["frames"]), targets=tuple(rec["targets"]),
                style_of=rec.get("style_of"), seed=rec.get("seed"),
                detail=rec.get("detail") or {},
                timestamp=rec.get("timestamp", ""),
            )
            self._entries.append(e)
            self._hashes.append(stored_hash)

    # -- запись --------------------------------------------------------------

    def record(self, origin: Origin, actor: str, action: str, scene: str,
               frames: tuple[int, int], targets: Sequence[str],
               style_of: str | None = None, seed: int | None = None,
               detail: dict | None = None,
               timestamp: str | None = None) -> Entry:
        if frames[1] < frames[0]:
            raise ValueError(f"bad frame range {frames}")
        if timestamp is None:
            import datetime
            timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
        prev = self._hashes[-1] if self._hashes else GENESIS
        e = Entry(
            seq=len(self._entries), prev_hash=prev, origin=origin,
            actor=actor, action=action, scene=scene, frames=frames,
            targets=tuple(targets), style_of=style_of, seed=seed,
            detail=detail or {}, timestamp=timestamp,
        )
        self._entries.append(e)
        self._hashes.append(e.hash)
        with self.path.open("a", encoding="utf-8") as f:
            f.write(_canon({**e.payload(), "hash": e.hash}) + "\n")
            f.flush()
            os.fsync(f.fileno())   # без этого запись теряется при kill -9
        return e

    # -- проверка ------------------------------------------------------------

    def verify(self) -> list[str]:
        """
        Пустой список = цепочка цела. Ловим:
          - подменённую запись (хэш не сходится с содержимым);
          - разрыв цепочки (prev_hash не равен хэшу предыдущей);
          - перенумерацию.

        Сообщается ПЕРВАЯ точка разрыва, а каскад после неё сворачивается в
        одну строку. Дефект, найденный раундом 5: удаление одной записи из
        середины давало 345 жалоб — каждая последующая запись жаловалась на
        разрыв предшественника. Технически верно и практически бесполезно:
        ни юрист, ни супервайзер не найдёт в трёхсотстрочном списке точку
        взлома, а именно её и надо назвать.
        """
        problems: list[str] = []
        prev = GENESIS
        first_break: int | None = None
        cascade = 0
        for i, (e, stored) in enumerate(zip(self._entries, self._hashes)):
            broken = False
            if e.seq != i:
                if first_break is None:
                    problems.append(f"entry {i}: seq mismatch ({e.seq}) — records "
                                    f"were renumbered")
                broken = True
            if e.hash != stored:
                if first_break is None:
                    problems.append(f"entry {i}: content does not match its hash "
                                    f"— record was edited after the fact")
                broken = True
            elif e.prev_hash != prev:
                if first_break is None:
                    problems.append(f"entry {i}: chain broken here — the previous "
                                    f"record was edited, deleted or inserted")
                broken = True
            if broken and first_break is None:
                first_break = i
            elif broken:
                cascade += 1
            prev = stored
        if cascade:
            problems.append(f"entries {first_break + 1}..{len(self._entries) - 1}: "
                            f"{cascade} further mismatch(es) — consequence of the "
                            f"break at entry {first_break}, not separate tampering")
        return problems

    def first_break(self) -> int | None:
        """Индекс первой повреждённой записи, или None. Для отчётов и аудита."""
        prev = GENESIS
        for i, (e, stored) in enumerate(zip(self._entries, self._hashes)):
            if e.seq != i or e.hash != stored or e.prev_hash != prev:
                return i
            prev = stored
        return None

    # -- отчёты --------------------------------------------------------------

    def entries(self) -> Iterator[Entry]:
        return iter(self._entries)

    def frame_report(self, scene: str, frame: int) -> dict:
        """Ответ на вопрос «кто сделал кадр N»: все касания, по порядку."""
        touched = [e for e in self._entries
                   if e.scene == scene and e.frames[0] <= frame <= e.frames[1]]
        origins = {e.origin for e in touched}
        styles = sorted({e.style_of for e in touched if e.style_of})
        if not touched:
            verdict = "untracked"
        elif origins == {"human"}:
            verdict = "human"
        elif "human" in origins:
            verdict = "mixed"
        else:
            verdict = "generated"
        return {
            "scene": scene, "frame": frame, "verdict": verdict,
            "styles_used": styles,
            "touches": [{
                "seq": e.seq, "origin": e.origin, "actor": e.actor,
                "action": e.action, "targets": list(e.targets),
                "seed": e.seed, "timestamp": e.timestamp,
                "detail": e.detail,
            } for e in touched],
        }

    def scene_summary(self, scene: str, frame_count: int) -> dict:
        """Свод по сцене: сколько кадров каких. Для титров и для юриста."""
        counts = {"human": 0, "generated": 0, "mixed": 0, "untracked": 0}
        for f in range(1, frame_count + 1):
            counts[self.frame_report(scene, f)["verdict"]] += 1
        styles = sorted({e.style_of for e in self._entries
                         if e.scene == scene and e.style_of})
        return {"scene": scene, "frames": frame_count,
                "breakdown": counts, "styles_used": styles}
