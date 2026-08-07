"""
test_preflight.py — беда ловится ДО начала счёта, а не посреди ночи.

Каждая проверка соответствует аварии, которая иначе обнаруживается через час
работы: не тот путь к рисункам, пропавший звук, кончившееся место, дубль имени
шота. Стоимость проверки — секунды; стоимость её отсутствия — ночь.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from episode import Episode, ShotSpec, default_workers, preflight


def parts(tmp: Path) -> Path:
    """Минимальный годный набор рисунков."""
    from test_artwork import make_png
    make_png(tmp / "torso.png", 60, 120)
    pj = tmp / "parts.json"
    pj.write_text(json.dumps({"name": "x", "parts": [
        {"name": "torso", "image": "torso.png", "parent": None,
         "pivot": [0.5, 0.9], "attach": [0, 0], "depth": 0.0}]}), encoding="utf-8")
    return pj


def ep_with(tmp: Path, **kw) -> Episode:
    pj = parts(tmp)
    s = ShotSpec(name=kw.pop("name", "sc001"), parts_json=str(pj),
                 frames=kw.pop("frames", 4), **kw)
    return Episode("t", [s], tmp / "out")


def codes(ep: Episode, **kw) -> set[str]:
    return {p["code"] for p in preflight(ep, **kw).problems}


def test_healthy_episode_passes():
    with tempfile.TemporaryDirectory() as d:
        r = preflight(ep_with(Path(d)))
        assert r.ok, r.problems


def test_ffmpeg_reported_once_for_both_tools():
    """ffmpeg и ffprobe идут одним пакетом. Две проблемы на одну беду означают,
    что оператор не понимает, что именно чинить — а различение бед и есть смысл
    кода ошибки. Регрессия раунда 2."""
    import shutil as sh
    with tempfile.TemporaryDirectory() as d:
        ep = ep_with(Path(d))
        real = sh.which
        sh.which = lambda name: None if name in ("ffmpeg", "ffprobe") else real(name)
        try:
            probs = [p for p in preflight(ep).problems if p["code"] == "NO_FFMPEG"]
        finally:
            sh.which = real
        assert len(probs) == 1, f"NO_FFMPEG reported {len(probs)} times"
        assert "ffmpeg" in probs[0]["message"] and "ffprobe" in probs[0]["message"]


def test_missing_parts_json_caught():
    with tempfile.TemporaryDirectory() as d:
        ep = ep_with(Path(d))
        ep.shots[0].parts_json = str(Path(d) / "nope.json")
        assert "NO_PARTS" in codes(ep)


def test_missing_audio_caught():
    """Пропавшая дорожка иначе обнаруживается на сборке — после часа рендера."""
    with tempfile.TemporaryDirectory() as d:
        ep = ep_with(Path(d), audio=str(Path(d) / "gone.wav"))
        assert "NO_AUDIO" in codes(ep)


def test_duplicate_shot_names_caught():
    """Имена шотов адресуют каталоги: дубль означает, что один шот затирает
    другой, и серия выходит короче на один шот без единой ошибки."""
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        pj = parts(tmp)
        ep = Episode("t", [ShotSpec("sc001", str(pj), 4),
                           ShotSpec("sc001", str(pj), 4)], tmp / "out")
        assert "DUPLICATE_SHOT" in codes(ep)


def test_empty_episode_caught():
    with tempfile.TemporaryDirectory() as d:
        assert "EMPTY_EPISODE" in codes(Episode("t", [], Path(d) / "out"))


def test_bad_frame_count_caught():
    with tempfile.TemporaryDirectory() as d:
        ep = ep_with(Path(d), frames=0)
        assert "BAD_FRAMES" in codes(ep)


def test_every_problem_carries_a_remedy():
    """Ошибка без указания действия для оператора бесполезна. Регрессия
    раунда 6: BAD_FRAMES был единственным без remedy, и гейт нашёл его
    механической проверкой всех проблем, а не чтением кода."""
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        cases = [
            ep_with(tmp, frames=0),
            Episode("t", [], tmp / "out"),
        ]
        bad = ep_with(tmp)
        bad.shots[0].parts_json = str(tmp / "nope.json")
        cases.append(bad)
        missing = []
        for ep in cases:
            for p in preflight(ep).problems:
                if not p.get("remedy"):
                    missing.append(p["code"])
        assert not missing, f"problems without a remedy: {sorted(set(missing))}"


def test_disk_space_estimated_from_episode_volume():
    """Требование места считается из объёма серии, а не берётся константой:
    31 680 кадров при 720p — это десятки гигабайт."""
    with tempfile.TemporaryDirectory() as d:
        ep = ep_with(Path(d), frames=31_680)
        r = preflight(ep, need_free_gb=10_000.0)
        assert "NO_SPACE" in {p["code"] for p in r.problems}
        assert r.info["estimated_gb"] > 3.0, r.info


def test_space_problem_names_a_remedy():
    """Ошибка без указания, что делать, для оператора бесполезна."""
    with tempfile.TemporaryDirectory() as d:
        r = preflight(ep_with(Path(d)), need_free_gb=10_000.0)
        sp = next(p for p in r.problems if p["code"] == "NO_SPACE")
        assert sp.get("remedy")


def test_info_reports_episode_scale():
    with tempfile.TemporaryDirectory() as d:
        r = preflight(ep_with(Path(d), frames=100))
        assert r.info["total_frames"] == 100
        assert r.info["shots"] == 1
        assert r.info["seconds"] > 0


def test_workers_leave_headroom():
    """Забрать все ядра — уйти в свап и получить БОЛЬШЕЕ общее время. Два ядра
    остаются системе и ffmpeg."""
    import os
    n = os.cpu_count() or 4
    w = default_workers()
    assert 1 <= w <= max(1, n - 2), (w, n)


# ---------------------------------------------------------------------------
# Загрузка описания серии
# ---------------------------------------------------------------------------

def test_episode_loads_from_json():
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        pj = parts(tmp)
        (tmp / "ep.json").write_text(json.dumps({
            "name": "e07", "outDir": str(tmp / "out"),
            "shots": [{"name": "sc001", "partsJson": str(pj), "frames": 24,
                       "fps": 24, "channels": {"torso.y": [[1, 0], [24, 0.2]]}}],
        }), encoding="utf-8")
        ep = Episode.load(tmp / "ep.json")
        assert ep.name == "e07"
        assert ep.shots[0].frames == 24
        assert ep.shots[0].channels["torso.y"][1] == (24, 0.2)


def test_episode_volume_arithmetic():
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        pj = parts(tmp)
        ep = Episode("t", [ShotSpec("a", str(pj), 48), ShotSpec("b", str(pj), 24)],
                     tmp / "out")
        assert ep.total_frames == 72
        assert abs(ep.seconds - 3.0) < 1e-9


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
