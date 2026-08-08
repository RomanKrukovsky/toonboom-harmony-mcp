"""
test_boundaries.py — условия, при которых механизм перестаёт работать.

Раунд 21: метка прогона (`run_id`) из секунд и PID давала ОДИНАКОВОЕ значение
двум прогонам в одну секунду из одного процесса. Механизм был объявлен готовым в
раунде 11 и три раунда жил с дефектом, который снимается одним вопросом: «а если
два подряд?». Нашёлся он случайно — регрессия начала падать от порядка запуска.

Отсюда правило, и этот файл — его механическая форма: у каждого механизма,
объявленного готовым, выписываются граничные условия и проверяются сразу.

Вопросы, которые задаются каждому идентификатору и каждой проверке:
  - два вызова подряд в одну секунду, один процесс, один PID — различимы?
  - пустой ввод — не падает и говорит внятно?
  - один элемент — не путается с нулём?
  - вход, где ответ заранее известен неверным — ловится?
"""

from __future__ import annotations

import json
import tempfile
import time
from pathlib import Path

import episode as E
from episode import Episode, ShotSpec, read_journal, run_episode


def parts(tmp: Path) -> Path:
    from test_artwork import make_png
    make_png(tmp / "torso.png", 60, 120)
    pj = tmp / "parts.json"
    pj.write_text(json.dumps({"name": "x", "parts": [
        {"name": "torso", "image": "torso.png", "parent": None,
         "pivot": [0.5, 0.9], "attach": [0, 0], "depth": 0.0}]}), encoding="utf-8")
    return pj


def fake(payload: dict) -> dict:
    d = Path(payload["shot_dir"])
    d.mkdir(parents=True, exist_ok=True)
    for i in range(1, payload["frames"] + 1):
        (d / f"f{i:04d}.png").write_bytes(b"\x89PNG\r\n\x1a\nstub")
    return {"name": payload["name"], "status": "ok", "frames": payload["frames"],
            "seconds": 0.01, "dir": str(d), "audio": payload.get("audio")}


def ep_of(tmp: Path, n: int = 2, frames: int = 4) -> Episode:
    pj = parts(tmp)
    return Episode("t", [ShotSpec(f"sc{i:03d}", str(pj), frames)
                         for i in range(1, n + 1)], tmp / "out")


# ---------------------------------------------------------------------------
# Идентификаторы: различают ли то, что обязаны различать
# ---------------------------------------------------------------------------

def test_run_id_differs_within_the_same_second():
    """Досчёт сразу после падения идёт в ту же секунду тем же процессом."""
    with tempfile.TemporaryDirectory() as d:
        ep = ep_of(Path(d), n=2)
        run_episode(Episode(ep.name, ep.shots[:1], ep.out_dir), renderer=fake)
        run_episode(ep, renderer=fake)          # без sleep
        ids = [h["run"] for h in E.run_history(ep.out_dir)]
        assert len(ids) == len(set(ids)) == 2, ids


def test_fingerprint_differs_on_every_field_that_changes_pixels():
    """Отпечаток шота обязан меняться от КАЖДОГО поля, влияющего на кадр —
    иначе правка проходит незамеченной и серия собирается по вчерашней версии."""
    with tempfile.TemporaryDirectory() as d:
        pj = str(parts(Path(d)))
        base = ShotSpec("a", pj, 24)
        variants = {
            "frames": ShotSpec("a", pj, 25),
            "fps": ShotSpec("a", pj, 24, fps=12),
            "resolution": ShotSpec("a", pj, 24, resolution=(320, 180)),
            "audio": ShotSpec("a", pj, 24, audio="/x.wav"),
            "channels": ShotSpec("a", pj, 24, channels={"torso.y": [(1, 0.0), (24, 1.0)]}),
            "camera": ShotSpec("a", pj, 24, camera_ortho_scale=9.0),
            "bg": ShotSpec("a", pj, 24, bg_color=(1.0, 0.0, 0.0)),
        }
        same = [k for k, v in variants.items() if v.fingerprint() == base.fingerprint()]
        assert not same, f"отпечаток НЕ меняется от: {same}"


def test_ledger_hash_differs_for_neighbouring_entries():
    """Две одинаковые записи подряд обязаны дать разные хэши — иначе цепочка
    не отличает подмену от повтора."""
    from provenance import Ledger
    with tempfile.TemporaryDirectory() as d:
        lg = Ledger(Path(d) / "l.jsonl")
        a = lg.record("tool", "t", "shot_rendered", "e", (1, 4), ["x"])
        b = lg.record("tool", "t", "shot_rendered", "e", (1, 4), ["x"])
        assert a.hash != b.hash, (a.hash, b.hash)
        assert lg.verify() == []


# ---------------------------------------------------------------------------
# Пустой и одиночный вход
# ---------------------------------------------------------------------------

def test_recover_report_on_an_empty_directory():
    with tempfile.TemporaryDirectory() as d:
        assert E.recover_report(Path(d)) is None


def test_run_history_on_an_empty_directory():
    with tempfile.TemporaryDirectory() as d:
        assert E.run_history(Path(d)) == []


def test_group_failures_on_an_empty_list():
    assert E._group_failures([]) == {}


def test_one_shot_episode_is_not_confused_with_zero():
    with tempfile.TemporaryDirectory() as d:
        ep = ep_of(Path(d), n=1)
        rep = run_episode(ep, renderer=fake)
        assert rep["shots_ok"] == 1 and rep["complete"] is True, rep
        assert rep["attempts"] == 1, rep


def test_verify_on_an_empty_ledger():
    from provenance import Ledger
    with tempfile.TemporaryDirectory() as d:
        assert Ledger(Path(d) / "nope.jsonl").verify() == []


# ---------------------------------------------------------------------------
# Вход, где ответ заранее известен неверным
# ---------------------------------------------------------------------------

def test_master_frame_report_rejects_a_frame_past_the_end():
    from provenance import Ledger
    with tempfile.TemporaryDirectory() as d:
        lg = Ledger(Path(d) / "l.jsonl")
        lg.record("tool", "t", "master_assembled", "e", (1, 4), ["m.mp4"],
                  detail={"layout": [{"shot": "sc001", "from": 1, "to": 4}]})
        assert lg.master_frame_report("e", 99)["verdict"] == "out_of_range"


def test_tampered_ledger_is_caught():
    """Проверка целостности на входе, где ответ известен неверным."""
    from provenance import Ledger
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "l.jsonl"
        lg = Ledger(p)
        for i in range(4):
            lg.record("agent", "claude", "shot_rendered", "e", (i + 1, i + 1), ["x"])
        lines = p.read_text(encoding="utf-8").splitlines()
        rec = json.loads(lines[1]); rec["origin"] = "human"
        lines[1] = json.dumps(rec, sort_keys=True, separators=(",", ":"))
        p.write_text("\n".join(lines) + "\n", encoding="utf-8")
        broken = Ledger(p).verify()
        assert broken, "подделка не поймана"


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
