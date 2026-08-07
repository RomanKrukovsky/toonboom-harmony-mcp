"""
test_episode.py — очередь, параллелизм, прогресс, журнал. Без Blender.

Счёт шота подменяется быстрой пустышкой: проверяется ОРКЕСТРАЦИЯ, а не рендер
(его проверяют пробы на живом Blender). Это позволяет прогонять тесты за секунды
и покрывать то, что в живом прогоне видно плохо: порядок, дубли, реакцию на
битый журнал, честность метрик.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import episode as E
from episode import Episode, ShotSpec, append_journal, read_journal, shot_is_done


def fake_render(payload: dict) -> dict:
    """Пустышка вместо Blender: создаёт нужное число PNG-заглушек."""
    d = Path(payload["shot_dir"])
    d.mkdir(parents=True, exist_ok=True)
    for i in range(1, payload["frames"] + 1):
        (d / f"f{i:04d}.png").write_bytes(b"\x89PNG\r\n\x1a\nstub")
    return {"name": payload["name"], "status": "ok", "frames": payload["frames"],
            "seconds": 0.01, "dir": str(d), "audio": payload.get("audio")}


def fail_on(names: set[str]):
    def r(payload: dict) -> dict:
        if payload["name"] in names:
            return {"name": payload["name"], "status": "failed", "code": "BOOM",
                    "message": "planted failure", "seconds": 0.01, "frames": 0}
        return fake_render(payload)
    return r


def make_ep(tmp: Path, n: int = 4, frames: int = 5) -> Episode:
    return Episode("t", [ShotSpec(f"sc{i:03d}", "unused.json", frames)
                         for i in range(1, n + 1)], tmp / "out")


def run(ep: Episode, renderer=fake_render, **kw):
    """Прогон со своим счётчиком шота — в этом процессе, без пула.

    Пул процессов пиклит функцию, поэтому подставить локальную (пустышку,
    планировщик, обёртку) через пул нельзя в принципе. `renderer=` в
    run_episode — не тестовый костыль, а честная развилка: либо пул и
    модульная функция, либо свой счётчик и один процесс.
    """
    events: list[dict] = []
    kw.setdefault("on_event", events.append)
    rep = E.run_episode(ep, renderer=renderer, **kw)
    return rep, events


# ---------------------------------------------------------------------------
# Счёт и отчёт
# ---------------------------------------------------------------------------

def test_all_shots_rendered():
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=4, frames=5)
        rep, _ = run(ep)
        assert rep["shots_ok"] == 4
        assert rep["frames_rendered"] == 20
        assert rep["complete"] is True


def test_report_written_to_disk():
    """Отчёт нужен на диске: утром смотрят его, а не терминал закрытой сессии."""
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d))
        run(ep)
        saved = json.loads((ep.out_dir / "report.json").read_text())
        assert saved["shots_ok"] == 4


def test_failed_shot_named_and_not_complete():
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=4)
        rep, _ = run(ep, renderer=fail_on({"sc002"}))
        assert rep["shots_ok"] == 3 and rep["shots_failed"] == 1
        assert rep["failed"][0]["name"] == "sc002"
        assert rep["failed"][0]["code"] == "BOOM"
        assert rep["complete"] is False


def test_one_failure_does_not_stop_the_rest():
    """Ночной прогон, падающий на первом плохом шоте, бесполезен."""
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=6)
        rep, _ = run(ep, renderer=fail_on({"sc001"}))
        assert rep["shots_ok"] == 5


# ---------------------------------------------------------------------------
# Прогресс для оператора
# ---------------------------------------------------------------------------

def test_progress_events_emitted():
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=3)
        _, events = run(ep)
        kinds = [e["event"] for e in events]
        assert kinds[0] == "start" and kinds[-1] == "done"
        assert kinds.count("shot_done") == 3


def test_progress_reports_position_and_rate():
    """Молчащий терминал на три часа — это не прогресс. Оператор обязан видеть
    сколько сделано, сколько всего и сколько ждать."""
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=4)
        _, events = run(ep)
        shot_events = [e for e in events if e["event"] == "shot_done"]
        assert [e["done"] for e in shot_events] == [1, 2, 3, 4]
        assert all(e["of"] == 4 for e in shot_events)
        assert all("frames_per_s" in e for e in shot_events)
        assert shot_events[0]["eta_s"] is not None


def test_start_event_declares_the_work():
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=5, frames=7)
        _, events = run(ep)
        st = events[0]
        assert st["shots"] == 5 and st["todo"] == 5
        assert st["frames_todo"] == 35
        assert st["workers"] >= 1


# ---------------------------------------------------------------------------
# Журнал и возобновление
# ---------------------------------------------------------------------------

def test_resume_skips_completed_shots():
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=4)
        run(ep)
        rep2, events2 = run(ep)
        assert events2[0]["todo"] == 0
        assert events2[0]["resumed"] == 4
        assert rep2["shots_ok"] == 4


def test_resume_recomputes_only_the_remainder():
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=6)
        # первый прогон падает на трёх последних
        run(ep, renderer=fail_on({"sc004", "sc005", "sc006"}))
        _, events = run(ep)
        assert events[0]["resumed"] == 3
        assert events[0]["todo"] == 3


def test_journal_survives_a_truncated_line():
    """kill -9 посреди записи оставляет обрубок. Такой шот обязан считаться
    НЕзавершённым, иначе мастер получит дыру."""
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=3)
        run(ep)
        jp = ep.out_dir / "journal.jsonl"
        jp.write_text(jp.read_text() + '{"name": "sc00')      # обрубок
        assert len(read_journal(ep)) == 3                     # обрубок отброшен
        _, events = run(ep)
        assert events[0]["resumed"] == 3


def test_journal_claim_without_frames_is_not_trusted():
    """Журнал говорит «готово», а кадров нет (чистка, полный диск). Доверять
    записи без проверки диска — собрать мастер с дырой и не заметить."""
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=2)
        run(ep)
        import shutil
        shutil.rmtree(ep.out_dir / "sc001")
        rec = read_journal(ep)["sc001"]
        assert rec["status"] == "ok"
        assert shot_is_done(ep, ep.shots[0], rec) is False
        _, events = run(ep)
        assert events[0]["todo"] == 1, "стёртый шот не пересчитался"


def test_journal_append_is_one_line_per_shot():
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=3)
        run(ep)
        lines = [l for l in (ep.out_dir / "journal.jsonl").read_text().splitlines() if l.strip()]
        assert len(lines) == 3
        assert all(json.loads(l)["name"] for l in lines)


def test_empty_journal_is_a_clean_first_run():
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=2)
        assert read_journal(ep) == {}


# ---------------------------------------------------------------------------
# Честность метрик
# ---------------------------------------------------------------------------

def test_rate_counts_only_successful_frames():
    """Кадры провалившегося шота не считаются сделанными — иначе метрика
    пропускной способности врёт тем сильнее, чем больше сбоев."""
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=4, frames=10)
        rep, _ = run(ep, renderer=fail_on({"sc002", "sc003"}))
        assert rep["frames_rendered"] == 20


def test_resumed_shots_reported_separately():
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=4)
        run(ep)
        rep, _ = run(ep)
        assert rep["resumed"] == 4


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
