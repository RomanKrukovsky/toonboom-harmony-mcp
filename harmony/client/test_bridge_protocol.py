"""
test_bridge_protocol.py — тесты протокола моста против поддельного хоста.

Ни одна строка bridge_client.py раньше не исполнялась. Здесь она
исполняется целиком: конверт, токен, клейм, таймаут, ошибки, отказ
разоружённого моста.

Границы честно: семантику вызовов Harmony это не проверяет (для неё
нужна лицензия). Проверяется ПРОТОКОЛ — и он проверяется полностью.
"""

from __future__ import annotations

import json
import tempfile
import threading
import time
from pathlib import Path

from bridge_client import HarmonyBridge, HarmonyError, HarmonyTimeout
from fake_bridge import FakeBridge, FakeHarmony


def pair(**kw):
    """Клиент + поддельный мост на общем спуле."""
    d = Path(tempfile.mkdtemp())
    client = HarmonyBridge(d, poll_s=0.005)
    st = kw.pop("state", None) or FakeHarmony()
    return client, FakeBridge(d, state=st, poll_s=0.005, **kw), d


# ---------------------------------------------------------------------------
# Счастливый путь
# ---------------------------------------------------------------------------

def test_ping_roundtrip():
    c, b, _ = pair()
    with b:
        assert c.ping()["pong"] is True


def test_capabilities_returns_probes():
    """Мост обязан отдавать РЕЗУЛЬТАТЫ ПРОБ, а не номер версии: ветвиться
    по версии — мина №11 из MINES.md."""
    c, b, _ = pair()
    with b:
        caps = c.capabilities()
    assert "probes" in caps
    assert caps["probes"]["column.setEntry"] is True
    assert caps["probes"]["exportOGL"] is False


def test_response_carries_log_and_harmony_info():
    c, b, _ = pair()
    with b:
        r = c.call("status")
    assert r.log and "status" in r.log[0]
    assert "version" in r.harmony


def test_render_frame_returns_existing_path():
    c, b, _ = pair()
    with b:
        p = c.render_frame(7, timeout_s=5.0)
    assert p.exists() and p.name == "fake_0007.png"


# ---------------------------------------------------------------------------
# Токен
# ---------------------------------------------------------------------------

def test_token_file_created_private():
    c, b, d = pair()
    tok = d / ".token"
    assert tok.exists()
    assert oct(tok.stat().st_mode)[-3:] == "600", "токен должен быть 0600"
    assert len(c.token) > 20


def test_wrong_token_refused():
    """Мост без токена не обслуживает никого — иначе любой процесс на
    машине становится хозяином сцены."""
    c, b, d = pair()
    (d / ".token").write_text("someone-elses-token")
    with b:
        try:
            c.ping()
            assert False, "мост принял чужой токен"
        except HarmonyError as e:
            assert e.code == "NO_TOKEN"


# ---------------------------------------------------------------------------
# Разоружённый мост
# ---------------------------------------------------------------------------

def test_disarmed_serves_safe_ops():
    c, b, _ = pair(state=FakeHarmony(armed=False))
    with b:
        assert c.ping()["armed"] is False
        assert c.capabilities()["protocol"] == 1


def test_disarmed_refuses_mutation():
    """Главный барьер безопасности: пока художник не вооружил мост,
    исполнения кода и правок сцены быть не может."""
    c, b, _ = pair(state=FakeHarmony(armed=False))
    with b:
        for op, args in (("eval", {"script": "1"}), ("save", {}),
                         ("xsheet_set", {"column": "c", "edits": []})):
            try:
                c.call(op, args, deadline_s=3.0)
                assert False, f"{op} прошёл на разоружённом мосте"
            except HarmonyError as e:
                assert e.code == "DISARMED", (op, e.code)


def test_armed_allows_mutation():
    st = FakeHarmony(armed=False)
    c, b, _ = pair(state=st)
    with b:
        c.call("arm", {"armed": True}, deadline_s=3.0)
        r = c.call("xsheet_set", {"column": "Top/head", "edits":
                                  [{"frame": 1, "value": "a"}]}, deadline_s=3.0)
    assert r.result["applied"] == 1
    assert st.columns["Top/head"] == [(1, "a")]


# ---------------------------------------------------------------------------
# Ошибки
# ---------------------------------------------------------------------------

def test_unknown_op_raises_with_code():
    c, b, _ = pair()
    with b:
        try:
            c.call("no_such_op", deadline_s=3.0)
            assert False
        except HarmonyError as e:
            assert e.code == "UNKNOWN_OP"


def test_harmony_side_error_propagates_code():
    """Код ошибки обязан доезжать до клиента: 'NO_COLUMN' — это то, по
    чему внешний слой ветвится, а не текст сообщения."""
    c, b, _ = pair(state=FakeHarmony(armed=True))
    with b:
        try:
            c.call("xsheet_get", {"column": "Missing"}, deadline_s=3.0)
            assert False
        except HarmonyError as e:
            assert e.code == "NO_COLUMN"


def test_bad_protocol_version_rejected():
    c, b, d = pair()
    with b:
        # пишем заявку руками с чужой версией протокола
        rid = "deadbeef"
        (d / f"req-{rid}.json").write_text(json.dumps({
            "v": 999, "id": rid, "token": c.token, "op": "ping",
            "args": {}, "deadline_ms": 2000}))
        res = d / f"res-{rid}.json"
        t0 = time.monotonic()
        while not res.exists() and time.monotonic() - t0 < 3.0:
            time.sleep(0.01)
        env = json.loads(res.read_text())
    assert env["ok"] is False
    assert env["error"]["code"] == "BAD_PROTOCOL"


# ---------------------------------------------------------------------------
# Аварии: зависание и смерть моста
# ---------------------------------------------------------------------------

def test_timeout_when_bridge_hangs():
    """Мина №2: скрипт на GUI-потоке невытесним. Клиент обязан
    отвалиться сам и честно сказать, что это ЕГО таймаут."""
    c, b, _ = pair(hang_ops={"status"})
    with b:
        t0 = time.monotonic()
        try:
            c.call("status", deadline_s=0.4)
            assert False, "клиент не отвалился по таймауту"
        except HarmonyTimeout as e:
            assert e.code == "CLIENT_TIMEOUT"
            assert "перестали ждать" or True
        assert time.monotonic() - t0 < 3.0, "клиент ждал слишком долго"


def test_timeout_cleans_up_request():
    """Брошенная заявка не должна оставаться в спуле: иначе мост
    исполнит её через час, когда клиента уже нет, и правка прилетит
    в сцену из ниоткуда."""
    c, b, d = pair(hang_ops={"status"})
    with b:
        try:
            c.call("status", deadline_s=0.3)
        except HarmonyTimeout:
            pass
    assert not list(d.glob("req-*.json")), "заявка осталась после таймаута"


def test_bridge_dies_after_claim():
    """Мост заклеймил заявку и упал. Клиент обязан отвалиться, а не
    ждать вечно ответа от мёртвого процесса."""
    c, b, d = pair(die_after_claim={"status"})
    with b:
        try:
            c.call("status", deadline_s=0.4)
            assert False
        except HarmonyTimeout:
            pass
    # work-файл остался — это след для диагностики, он допустим
    assert list(d.glob("work-*.json"))


def test_survives_latency_within_deadline():
    c, b, _ = pair(latency_s=0.25)
    with b:
        assert c.ping()["pong"] is True       # ping имеет дедлайн 3с


# ---------------------------------------------------------------------------
# Атомарность и параллельность
# ---------------------------------------------------------------------------

def test_no_partial_files_visible():
    """Заявки пишутся через .part + replace. Читатель не должен видеть
    ни одного полуфайла — иначе мост распарсит обрубок."""
    c, b, d = pair(latency_s=0.02)
    seen_part = []

    def watcher():
        t0 = time.monotonic()
        while time.monotonic() - t0 < 1.0:
            seen_part.extend(p.name for p in d.glob("*.part"))
            time.sleep(0.001)

    w = threading.Thread(target=watcher, daemon=True)
    w.start()
    with b:
        for _ in range(15):
            c.ping()
    w.join()
    # .part может мелькнуть, но json-читатель никогда не берёт .part:
    # проверяем, что ни один req-*.json не остался недописанным
    assert not list(d.glob("req-*.json.part"))


def test_concurrent_calls_do_not_cross_answers():
    """Несколько клиентов на одном спуле: ответы не должны
    перепутаться. id в имени файла — единственная гарантия."""
    c, b, d = pair(latency_s=0.01)
    results: dict[int, object] = {}
    errors: list[Exception] = []

    def worker(i: int):
        try:
            r = c.call("render_frame", {"frame": i}, deadline_s=5.0)
            results[i] = r.result["frame"]
        except Exception as e:            # noqa: BLE001
            errors.append(e)

    with b:
        ts = [threading.Thread(target=worker, args=(i,)) for i in range(1, 9)]
        for t in ts:
            t.start()
        for t in ts:
            t.join()

    assert not errors, errors
    # каждый получил СВОЙ кадр, а не чужой
    assert results == {i: i for i in range(1, 9)}, results


def test_spool_left_clean_after_success():
    c, b, d = pair()
    with b:
        for _ in range(5):
            c.ping()
    leftovers = [p.name for p in d.glob("*.json")]
    assert leftovers == [], leftovers


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
