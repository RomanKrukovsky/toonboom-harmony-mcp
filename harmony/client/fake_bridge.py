"""
fake_bridge.py — поддельный мост: говорит по протоколу bridge.js без Harmony.

ЗАЧЕМ. Мост (2028 строк QtScript) не исполнялся ни разу и не может быть
исполнен: Harmony без лицензии. Но ПРОТОКОЛ между сторонами — это
файлы в каталоге, и его можно проверить целиком, подменив только
дальнюю сторону.

Что это проверяет по-настоящему:
  - формат конверта запроса/ответа (клиент и мост должны совпадать);
  - клейм заявки через rename (двойной забор невозможен);
  - атомарность записи (.part -> replace: читатель не видит полуфайла);
  - токен (без него мост не обслуживает);
  - поведение при таймауте, при ошибке, при busy;
  - отказ разоружённого моста на мутирующих операциях.

Что это НЕ проверяет: сами вызовы Harmony API. Их проверит только
лицензия. Разделение честное: протокол — здесь, семантика — там.

Подделка нарочно ВРЕДНАЯ там, где это разрешено контрактом: отвечает с
задержкой, иногда клеймит заявку и умирает, возвращает ошибки. Мост,
который тестируют только на счастливом пути, ломается у первого
художника.
"""

from __future__ import annotations

import json
import os
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

PROTOCOL_V = 1


@dataclass
class FakeHarmony:
    """Состояние поддельного Harmony: то, что мост бы менял в сцене."""
    version: str = "25.0.0 (fake)"
    armed: bool = False
    scene: str = "fake_scene"
    frame_count: int = 48
    columns: dict[str, list[tuple[int, float]]] = field(default_factory=dict)
    saved: int = 0
    busy: bool = False


MUTATING = {"eval", "save", "xsheet_set", "curve_set", "node_edit",
            "substitution_set", "palette_set"}


class FakeBridge:
    """
    Крутится в потоке, обрабатывает заявки из спула — как QTimer в bridge.js.

    Поведение задаётся флагами, чтобы тесты могли воспроизвести аварии:
      hang_ops        — по этим операциям НЕ отвечать (имитация зависания
                        GUI-потока: клиент обязан отвалиться по таймауту,
                        а не ждать вечно);
      die_after_claim — заклеймить заявку и «умереть» (проверка, что
                        клиент не зависает на брошенной работе);
      latency_s       — задержка ответа;
      require_token   — проверять токен.
    """

    def __init__(self, spool: str | os.PathLike, state: FakeHarmony | None = None,
                 latency_s: float = 0.0, hang_ops: set[str] | None = None,
                 die_after_claim: set[str] | None = None,
                 require_token: bool = True, poll_s: float = 0.01):
        self.spool = Path(spool)
        (self.spool / "img").mkdir(parents=True, exist_ok=True)
        self.state = state or FakeHarmony()
        self.latency_s = latency_s
        self.hang_ops = hang_ops or set()
        self.die_after_claim = die_after_claim or set()
        self.require_token = require_token
        self.poll_s = poll_s
        self.served = 0
        self.rejected = 0
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.ops: dict[str, Callable[[dict], object]] = {}
        self._register_default_ops()

    # -- жизненный цикл ------------------------------------------------------

    def start(self) -> "FakeBridge":
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        return self

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2.0)

    def __enter__(self):
        return self.start()

    def __exit__(self, *exc):
        self.stop()

    # -- протокол ------------------------------------------------------------

    def _loop(self) -> None:
        while not self._stop.is_set():
            for req in sorted(self.spool.glob("req-*.json")):
                self._handle(req)
            time.sleep(self.poll_s)

    def _handle(self, req_path: Path) -> None:
        rid = req_path.name[len("req-"):-len(".json")]
        work = self.spool / f"work-{rid}.json"
        # Клейм через rename: если две стороны заберут одну заявку,
        # выиграет одна — вторая получит FileNotFoundError.
        try:
            os.replace(req_path, work)
        except OSError:
            return

        try:
            env = json.loads(work.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            work.unlink(missing_ok=True)
            return

        op = env.get("op", "")

        if op in self.die_after_claim:
            # Заклеймили и «упали»: work-файл остался, ответа нет.
            return
        if op in self.hang_ops:
            return

        if self.latency_s:
            time.sleep(self.latency_s)

        out = self._dispatch(env)
        self._write_atomic(self.spool / f"res-{rid}.json",
                           json.dumps(out, ensure_ascii=True))
        work.unlink(missing_ok=True)

    def _dispatch(self, env: dict) -> dict:
        op = env.get("op", "")
        args = env.get("args") or {}

        if env.get("v") != PROTOCOL_V:
            self.rejected += 1
            return self._err("BAD_PROTOCOL",
                             f"expected v={PROTOCOL_V}, got {env.get('v')!r}")
        if self.require_token:
            tok_file = self.spool / ".token"
            expected = (tok_file.read_text(encoding="utf-8").strip()
                        if tok_file.exists() else None)
            if not env.get("token") or env.get("token") != expected:
                self.rejected += 1
                return self._err("NO_TOKEN", "missing or wrong token")

        # Разоружённый мост обслуживает только безопасное.
        if not self.state.armed and op in MUTATING:
            self.rejected += 1
            return self._err("DISARMED",
                             f"bridge is disarmed; {op} refused")

        fn = self.ops.get(op)
        if fn is None:
            self.rejected += 1
            return self._err("UNKNOWN_OP", f"no such op {op!r}")

        try:
            result = fn(args)
        except Exception as e:                      # noqa: BLE001
            self.rejected += 1
            return self._err(getattr(e, "code", "SCRIPT_ERROR"), str(e))

        self.served += 1
        return {"v": PROTOCOL_V, "ok": True, "result": result,
                "log": [f"[fake] {op}"],
                "harmony": {"version": self.state.version,
                            "scene": self.state.scene}}

    def _err(self, code: str, message: str) -> dict:
        return {"v": PROTOCOL_V, "ok": False,
                "error": {"code": code, "message": message},
                "log": [], "harmony": {"version": self.state.version}}

    @staticmethod
    def _write_atomic(path: Path, text: str) -> None:
        tmp = path.with_suffix(path.suffix + ".part")
        tmp.write_text(text, encoding="utf-8")
        os.replace(tmp, path)

    # -- операции ------------------------------------------------------------

    def _register_default_ops(self) -> None:
        s = self.state

        def ping(_a):
            return {"pong": True, "armed": s.armed}

        def status(_a):
            return {"armed": s.armed, "busy": s.busy,
                    "served": self.served, "failed": self.rejected}

        def capabilities(_a):
            # Ключевое: мост отдаёт результаты ПРОБ, а не номер версии.
            return {"version": s.version, "protocol": PROTOCOL_V,
                    "probes": {"render.renderScene": True,
                               "column.setEntry": True,
                               "func.setBezierPoint": True,
                               "Action.perform": True,
                               "exportOGL": False}}

        def arm(a):
            s.armed = bool(a.get("armed", True))
            return {"armed": s.armed}

        def save(a):
            s.saved += 1
            return {"saved": s.saved, "all": bool(a.get("all", True))}

        def xsheet_get(a):
            name = a.get("column")
            if name not in s.columns:
                e = ValueError(f"no column {name!r}")
                e.code = "NO_COLUMN"                # type: ignore[attr-defined]
                raise e
            return {"column": name,
                    "entries": [{"frame": f, "value": v}
                                for f, v in s.columns[name]]}

        def xsheet_set(a):
            name = a.get("column")
            entries = [(int(e["frame"]), e["value"]) for e in a.get("edits", [])]
            s.columns.setdefault(name, [])
            s.columns[name] = sorted(set(s.columns[name] + entries))
            return {"column": name, "applied": len(entries)}

        def render_frame(a):
            f = int(a.get("frame", 1))
            p = self.spool / "img" / f"fake_{f:04d}.png"
            p.write_bytes(b"\x89PNG\r\n\x1a\n" + b"fake")
            return {"path": str(p), "frame": f}

        for name, fn in (("ping", ping), ("status", status),
                         ("capabilities", capabilities), ("arm", arm),
                         ("save", save), ("xsheet_get", xsheet_get),
                         ("xsheet_set", xsheet_set),
                         ("render_frame", render_frame)):
            self.ops[name] = fn
