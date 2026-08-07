"""
test_provenance.py — тесты реестра происхождения. Без Harmony.

Главный тест здесь — про подделку: журнал обязан ЗАМЕТИТЬ правку
задним числом. Реестр, который можно тихо переписать, юридически
хуже, чем отсутствие реестра: он создаёт ложную уверенность.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from provenance import GENESIS, Ledger


def make_ledger(tmp: Path) -> Ledger:
    lg = Ledger(tmp / "scene01.provenance.jsonl")
    lg.record("human", "ivan.petrov", "drawing", "scene01", (1, 48),
              ["Top/head"], timestamp="2026-08-01T10:00:00+00:00")
    lg.record("agent", "claude/lipsync", "substitution_set", "scene01",
              (10, 30), ["Top/mouth"], seed=42,
              detail={"phoneme_source": "ep01_line04.wav"},
              timestamp="2026-08-01T11:00:00+00:00")
    lg.record("style-transfer", "claude/inbetween", "curve_set", "scene01",
              (20, 40), ["Top/arm-P_rot"], style_of="anna.founder",
              timestamp="2026-08-01T12:00:00+00:00")
    return lg


def test_chain_starts_at_genesis():
    with tempfile.TemporaryDirectory() as d:
        lg = make_ledger(Path(d))
        first = next(lg.entries())
        assert first.prev_hash == GENESIS


def test_clean_ledger_verifies():
    with tempfile.TemporaryDirectory() as d:
        lg = make_ledger(Path(d))
        assert lg.verify() == []


def test_reload_from_disk_still_verifies():
    with tempfile.TemporaryDirectory() as d:
        make_ledger(Path(d))
        lg2 = Ledger(Path(d) / "scene01.provenance.jsonl")
        assert len(list(lg2.entries())) == 3
        assert lg2.verify() == []


def test_tampered_record_detected():
    """Кто-то переписал «agent» на «human» в середине журнала —
    verify обязан закричать."""
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "scene01.provenance.jsonl"
        make_ledger(Path(d))
        lines = p.read_text().splitlines()
        rec = json.loads(lines[1])
        rec["origin"] = "human"                      # подделка
        lines[1] = json.dumps(rec, sort_keys=True, separators=(",", ":"))
        p.write_text("\n".join(lines) + "\n")

        problems = Ledger(p).verify()
        assert any("edited after the fact" in x for x in problems)


def test_deleted_record_breaks_chain():
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "scene01.provenance.jsonl"
        make_ledger(Path(d))
        lines = p.read_text().splitlines()
        del lines[1]                                  # выкинули запись
        p.write_text("\n".join(lines) + "\n")
        problems = Ledger(p).verify()
        assert problems, "deletion went unnoticed"


def test_frame_report_mixed():
    """Кадр 25: рисовал человек, рты ставил агент, фазы — в чужом стиле.
    Вердикт mixed, стиль назван."""
    with tempfile.TemporaryDirectory() as d:
        lg = make_ledger(Path(d))
        r = lg.frame_report("scene01", 25)
        assert r["verdict"] == "mixed"
        assert r["styles_used"] == ["anna.founder"]
        assert len(r["touches"]) == 3


def test_frame_report_human_only():
    with tempfile.TemporaryDirectory() as d:
        lg = make_ledger(Path(d))
        r = lg.frame_report("scene01", 5)     # до кадра 10 — только рисунок
        assert r["verdict"] == "human"


def test_frame_report_untracked():
    with tempfile.TemporaryDirectory() as d:
        lg = make_ledger(Path(d))
        assert lg.frame_report("scene01", 200)["verdict"] == "untracked"
        assert lg.frame_report("scene99", 5)["verdict"] == "untracked"


def test_generated_only_verdict():
    with tempfile.TemporaryDirectory() as d:
        lg = Ledger(Path(d) / "x.jsonl")
        lg.record("agent", "claude/all", "curve_set", "s", (1, 10), ["c"])
        assert lg.frame_report("s", 5)["verdict"] == "generated"


def test_scene_summary_counts():
    with tempfile.TemporaryDirectory() as d:
        lg = make_ledger(Path(d))
        s = lg.scene_summary("scene01", 48)
        b = s["breakdown"]
        assert b["human"] + b["generated"] + b["mixed"] + b["untracked"] == 48
        assert b["human"] == 9 + 8       # 1-9 и 41-48
        assert b["mixed"] == 31          # 10-40: везде агент поверх человека
        assert s["styles_used"] == ["anna.founder"]


def test_bad_frame_range_rejected():
    with tempfile.TemporaryDirectory() as d:
        lg = Ledger(Path(d) / "x.jsonl")
        try:
            lg.record("human", "x", "y", "s", (10, 5), ["t"])
            assert False
        except ValueError:
            pass


def test_hash_stable_across_key_order():
    """Канонический JSON: хэш не зависит от порядка ключей в detail."""
    with tempfile.TemporaryDirectory() as d:
        lg1 = Ledger(Path(d) / "a.jsonl")
        lg2 = Ledger(Path(d) / "b.jsonl")
        e1 = lg1.record("agent", "x", "y", "s", (1, 2), ["t"],
                        detail={"a": 1, "b": 2}, timestamp="T")
        e2 = lg2.record("agent", "x", "y", "s", (1, 2), ["t"],
                        detail={"b": 2, "a": 1}, timestamp="T")
        assert e1.hash == e2.hash


def test_break_is_localised_not_cascaded():
    """Удаление записи из середины обязано дать НАЗВАНИЕ точки взлома, а не
    триста жалоб. Регрессия раунда 5: каскад из 345 строк технически верен и
    практически бесполезен — в нём не найти, где именно подделали."""
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "long.jsonl"
        lg = Ledger(p)
        for i in range(60):
            lg.record("agent", f"a{i}", "act", "s", (i + 1, i + 1), ["t"],
                      timestamp=f"T{i}")
        lines = [l for l in p.read_text().splitlines() if l.strip()]
        del lines[30]
        p.write_text("\n".join(lines) + "\n")

        problems = Ledger(p).verify()
        # Порог по СМЫСЛУ, не по числу: сколько бы строк ни было, все они
        # обязаны указывать на одну точку. Без удаления каскада здесь было 345
        # жалоб; сейчас три, и каждая называет запись 30 либо прямо, либо как
        # начало следствия. Требовать «не больше двух» было бы произвольной
        # цифрой — проверять надо локализацию.
        assert len(problems) <= 4, f"cascade not folded: {len(problems)} complaints"
        assert all("30" in x for x in problems), problems
        assert Ledger(p).first_break() == 30


def test_first_break_is_none_when_clean():
    with tempfile.TemporaryDirectory() as d:
        lg = make_ledger(Path(d))
        assert lg.first_break() is None


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


# ---------------------------------------------------------------------------
# Поведение в аварии (раунд 11)
# ---------------------------------------------------------------------------

def test_truncated_tail_does_not_destroy_the_ledger():
    """Падение посреди дописки обрубает последнюю строку. Ронять из-за неё весь
    реестр нельзя: тогда авария стирает ВСЮ историю серии, а не последнее
    касание. Журнал шотов это уже умел, реестр — нет. Регрессия раунда 11."""
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "l.jsonl"
        lg = Ledger(p)
        for i in range(3):
            lg.record("tool", "t", f"a{i}", "s", (1, 4), ["x"])
        raw = p.read_text(encoding="utf-8")
        p.write_text(raw + raw.splitlines()[0][:40], encoding="utf-8")
        again = Ledger(p)
        assert len(again._entries) == 3, len(again._entries)
        assert again.truncated == 1, again.truncated
        assert again.verify() == [], again.verify()


def test_record_survives_kill_nine():
    """Запись без fsync теряется при снятии питания, и кадр становится
    неотслеживаемым при том, что он посчитан и лежит в мастере."""
    import inspect
    src = inspect.getsource(Ledger.record)
    assert "fsync" in src, "record() пишет без fsync — запись не переживёт kill -9"


def test_frame_report_carries_detail():
    """«Кто сделал кадр» без «чем и в каком прогоне» — неполный ответ: именно
    этим отличаются шоты, посчитанные до аварии и после."""
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        lg = Ledger(Path(d) / "l.jsonl")
        lg.record("tool", "mcpb/episode", "shot_rendered", "e07", (1, 4), ["sc001"],
                  detail={"renderer": "Blender 5.1.1", "run": "123-456"})
        t = lg.frame_report("e07", 2)["touches"][0]
        assert t["detail"]["renderer"] == "Blender 5.1.1", t
        assert t["detail"]["run"] == "123-456", t
