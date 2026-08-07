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
import time
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
# Происхождение кадра (раунд 11)
# ---------------------------------------------------------------------------

def test_episode_writes_provenance():
    """PRODUCTION.md обещает ответ на «кто сделал этот кадр». Механизм был
    проверен 44 тестами и НЕ ВЫЗЫВАЛСЯ конвейером: отчёт возвращал untracked на
    любой кадр любой серии. Регрессия раунда 11."""
    from provenance import Ledger
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=2, frames=4)
        run(ep)
        led = ep.out_dir / "provenance.jsonl"
        assert led.is_file(), "provenance.jsonl не создан"
        lg = Ledger(led)
        r = lg.frame_report(ep.name, 5)      # первый кадр второго шота
        assert r["verdict"] != "untracked", r
        assert lg.verify() == [], lg.verify()


def test_provenance_frames_are_global_not_per_shot():
    """Оператор смотрит МАСТЕР и знает глобальный номер кадра, а не «кадр 3
    шота sc002». Нумерация от начала серии, по ВСЕЙ раскадровке — иначе при
    досчёте после аварии номера поедут."""
    from provenance import Ledger
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=3, frames=4)
        run(ep)
        lg = Ledger(ep.out_dir / "provenance.jsonl")
        for frame, shot in ((1, "sc001"), (5, "sc002"), (9, "sc003")):
            t = lg.frame_report(ep.name, frame)["touches"]
            assert t, f"кадр {frame} не отслежен"
            assert shot in t[0]["targets"], (frame, t[0]["targets"])


def test_provenance_distinguishes_runs_across_a_crash():
    """Между падением и досчётом Blender мог обновиться, машина могла быть
    другой. Отпечаток шота стережёт ОПИСАНИЕ и о рендерере не знает — если
    серия разъехалась по виду на границе шотов, ответ должен быть здесь."""
    from provenance import Ledger
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=4, frames=4)
        run(Episode(ep.name, ep.shots[:2], ep.out_dir))
        time.sleep(1.05)                      # метка прогона в секундах
        run(ep)
        lg = Ledger(ep.out_dir / "provenance.jsonl")
        runs = {lg.frame_report(ep.name, f)["touches"][0]["detail"]["run"]
                for f in (1, 5, 9, 13)}
        assert len(runs) == 2, f"прогоны не различимы: {runs}"
        rend = lg.frame_report(ep.name, 1)["touches"][0]["detail"]["renderer"]
        assert rend and rend != "None", rend


def test_journal_records_which_run_made_the_shot():
    """То же на уровне журнала шотов: ответить можно без чтения реестра."""
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=2, frames=4)
        run(ep)
        for rec in read_journal(ep).values():
            assert rec.get("run"), rec


# ---------------------------------------------------------------------------
# Сборка недосчитанной серии
# ---------------------------------------------------------------------------

def test_partial_master_names_missing_shots():
    """Ночь кончилась на 3 шотах из 5, утром надо показать что есть. Мастер
    обязан собраться И назвать дыру: короткое видео без предупреждения — это
    серия, про которую никто не знает, что она неполная. Регрессия раунда 10."""
    import shutil as sh
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=5, frames=4)
        run(Episode(ep.name, ep.shots[:3], ep.out_dir))
        # assemble требует ffmpeg; без него проверяем только учёт готовности
        journal = read_journal(ep)
        done = [s.name for s in ep.shots if shot_is_done(ep, s, journal.get(s.name))]
        missing = [s.name for s in ep.shots if s.name not in done]
        assert done == ["sc001", "sc002", "sc003"], done
        assert missing == ["sc004", "sc005"], missing


def test_length_check_uses_shots_that_went_in():
    """Сверка с ПОЛНОЙ раскадровкой объявляла бы расхождение при каждой
    частичной сборке; сверка ни с чем проглотила бы потерянные кадры."""
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=6, frames=5)
        run(Episode(ep.name, ep.shots[:4], ep.out_dir))
        journal = read_journal(ep)
        done = [s for s in ep.shots if shot_is_done(ep, s, journal.get(s.name))]
        expect = sum(s.seconds for s in done)
        assert abs(expect - 4 * 5 / 24) < 1e-9, expect


# ---------------------------------------------------------------------------
# Отпечаток описания шота
# ---------------------------------------------------------------------------

def test_timing_edit_without_length_change_forces_recompute():
    """Самая частая правка на монтаже: поменяли тайминг, длина та же. Раньше
    старый рендер принимался за готовый, и серия собиралась по вчерашней
    версии БЕЗ единой ошибки. Регрессия раунда 9."""
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=3, frames=5)
        ep.shots[1].channels = {"arm.rot": [(1.0, 0.0), (5.0, 40.0)]}
        run(ep)
        # правим ТОЛЬКО значения канала, длина неизменна
        ep.shots[1].channels = {"arm.rot": [(1.0, 0.0), (5.0, 90.0)]}
        _, events = run(ep)
        assert events[0]["todo"] == 1, \
            f"пересчитано {events[0]['todo']} — правка тайминга прошла молча"
        assert events[0]["resumed"] == 2


def test_unrelated_shots_not_recomputed_after_an_edit():
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=4, frames=4)
        run(ep)
        ep.shots[0].camera_ortho_scale = 3.5
        _, events = run(ep)
        assert events[0]["todo"] == 1 and events[0]["resumed"] == 3


def test_fingerprint_ignores_irrelevant_fields():
    """Отпечаток обязан меняться только от того, что влияет на пиксели.
    Иначе любая правка описания пересчитывает всю серию."""
    from episode import ShotSpec
    a = ShotSpec("sc001", "p.json", 24)
    b = ShotSpec("sc001", "p.json", 24)
    assert a.fingerprint() == b.fingerprint()
    b.name = "sc002"                      # имя адресует каталог, не пиксели
    assert a.fingerprint() == b.fingerprint()
    b.frames = 25
    assert a.fingerprint() != b.fingerprint()


def test_old_journal_without_fingerprint_is_honoured():
    """Иначе первый запуск после обновления пересчитал бы всю серию — три часа
    за то, что мы добавили поле."""
    from episode import shot_is_done
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=2, frames=4)
        run(ep)
        jp = ep.out_dir / "journal.jsonl"
        lines = []
        for line in jp.read_text().splitlines():
            if not line.strip():
                continue
            rec = json.loads(line)
            rec.pop("fingerprint", None)          # журнал старого формата
            lines.append(json.dumps(rec, ensure_ascii=False))
        jp.write_text("\n".join(lines) + "\n")
        journal = read_journal(ep)
        assert all(shot_is_done(ep, s, journal.get(s.name)) for s in ep.shots)


# ---------------------------------------------------------------------------
# Замок: один прогон на серию
# ---------------------------------------------------------------------------

def test_second_run_refused_while_first_holds_lock():
    """Два прогона на одной серии ТИХО удваивают работу: замер раунда 8 дал
    6 дублей в журнале из 12 записей при целых кадрах. Ошибки нет, оператор
    не замечает, журнал перестаёт говорить правду о готовности."""
    from episode import AlreadyRunning, RunLock
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=2)
        ep.out_dir.mkdir(parents=True, exist_ok=True)
        first = RunLock(ep.out_dir)
        first.acquire()
        try:
            try:
                run(ep)
                assert False, "второй прогон не был отклонён"
            except AlreadyRunning as e:
                assert "already working" in str(e)
                assert str(first.path) in str(e), "не сказано, как снять замок"
        finally:
            first.release()


def test_lock_released_after_run():
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=2)
        run(ep)
        assert not (ep.out_dir / "run.lock").exists(), "замок остался после прогона"


def test_lock_released_even_when_a_shot_fails():
    """Замок, оставшийся после падения шота, заблокировал бы серию навсегда."""
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=3)
        run(ep, renderer=fail_on({"sc002"}))
        assert not (ep.out_dir / "run.lock").exists()


def test_stale_lock_from_dead_process_is_cleared():
    """После kill -9 замок остаётся на диске. Если считать его живым, серию
    нельзя будет запустить больше никогда."""
    import json as _json
    import os as _os
    from episode import RunLock
    with tempfile.TemporaryDirectory() as d:
        ep = make_ep(Path(d), n=2)
        ep.out_dir.mkdir(parents=True, exist_ok=True)
        # PID, которого точно нет: свой же, но недостижимо большой
        (ep.out_dir / "run.lock").write_text(
            _json.dumps({"pid": 2 ** 22, "started": "1999-01-01 00:00:00"}))
        # on_event НЕ передаём: run() ставит свой сборщик событий, и два
        # обработчика конфликтуют. Дефект был в тесте, не в замке.
        rep, evs = run(ep)
        assert rep["shots_ok"] == 2, "мёртвый замок не дал прогону пройти"
        assert any(e.get("event") == "stale_lock" for e in evs), \
            "снятие мёртвого замка не сообщено — выглядит как магия"


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
