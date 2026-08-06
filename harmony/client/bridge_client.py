"""
bridge_client.py — внешняя сторона файлового моста в Harmony.

Это тот кусок, поверх которого садятся все восемь тулов из спеки:
harmony_eval, harmony_render_frame, xsheet_*, curve_*, spacing_synthesize,
substitution_*, scene_lint, palette_apply_script.

Контракт (симметричен bridge.js):
    пишем   <spool>/req-<id>.json   через .part + os.replace
    ждём    <spool>/res-<id>.json
    удаляем res-<id>.json после чтения
"""

from __future__ import annotations

import json
import os
import secrets
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class HarmonyError(RuntimeError):
    def __init__(self, code: str, message: str, log: list[str] | None = None, stack: str | None = None):
        super().__init__(f"{code}: {message}")
        self.code, self.message, self.log, self.stack = code, message, log or [], stack


class HarmonyTimeout(HarmonyError):
    pass


@dataclass
class Response:
    result: Any
    log: list[str]
    harmony: dict


class HarmonyBridge:
    def __init__(self, spool: str | os.PathLike, poll_s: float = 0.02):
        self.spool = Path(spool)
        self.spool.mkdir(parents=True, exist_ok=True)
        self.poll_s = poll_s
        self.token = self._ensure_token()

    def _ensure_token(self) -> str:
        p = self.spool / ".token"
        if p.exists():
            return p.read_text(encoding="utf-8").strip()
        tok = secrets.token_urlsafe(32)
        p.write_text(tok, encoding="utf-8")
        os.chmod(p, 0o600)  # мост читает; больше никто
        return tok

    def _write_atomic(self, path: Path, text: str) -> None:
        tmp = path.with_suffix(path.suffix + ".part")
        tmp.write_text(text, encoding="utf-8")
        os.replace(tmp, path)  # атомарно в пределах одной ФС

    def call(self, op: str, args: dict | None = None, deadline_s: float = 30.0) -> Response:
        rid = uuid.uuid4().hex[:16]
        req = {
            "v": 1,
            "id": rid,
            "token": self.token,
            "op": op,
            "args": args or {},
            "deadline_ms": int(deadline_s * 1000),
        }
        self._write_atomic(self.spool / f"req-{rid}.json", json.dumps(req, ensure_ascii=True))

        res_path = self.spool / f"res-{rid}.json"
        # Клиентский дедлайн даём с запасом: рендер может честно идти дольше
        # логического таймаута скрипта.
        hard_deadline = time.monotonic() + max(deadline_s * 1.5, deadline_s + 5.0)

        while time.monotonic() < hard_deadline:
            if res_path.exists():
                raw = res_path.read_text(encoding="utf-8")
                res_path.unlink(missing_ok=True)
                env = json.loads(raw)
                if not env.get("ok"):
                    err = env.get("error") or {}
                    raise HarmonyError(
                        err.get("code", "UNKNOWN"),
                        err.get("message", ""),
                        env.get("log"),
                        err.get("stack"),
                    )
                return Response(env.get("result"), env.get("log", []), env.get("harmony", {}))
            time.sleep(self.poll_s)

        # Важно: таймаут здесь означает «мы перестали ждать», а НЕ «Harmony
        # остановился». Скрипт внутри может крутиться вечно на GUI-потоке.
        # См. MINES.md #2.
        self._abandon(rid)
        raise HarmonyTimeout("CLIENT_TIMEOUT", f"no response for {op} within {deadline_s}s")

    def _abandon(self, rid: str) -> None:
        for name in (f"req-{rid}.json", f"work-{rid}.json"):
            (self.spool / name).unlink(missing_ok=True)

    # ---- удобные обёртки ---------------------------------------------------

    def ping(self) -> dict:
        return self.call("ping", deadline_s=3.0).result

    def capabilities(self) -> dict:
        return self.call("capabilities", deadline_s=10.0).result

    def eval(self, script: str, args: dict | None = None, deadline_s: float = 30.0) -> Response:
        return self.call("eval", {"script": script, "args": args or {}}, deadline_s)

    def render_frame(self, frame: int, width: int = 960, display: str | None = None,
                     timeout_s: float = 180.0) -> Path:
        r = self.call(
            "render_frame",
            {"frame": frame, "width": width, "display": display,
             "timeout_ms": int(timeout_s * 1000)},
            deadline_s=timeout_s,
        )
        return Path(r.result["path"])

    def render_range(self, frm: int, to: int, stride: int = 1, width: int = 480,
                     timeout_s: float = 600.0) -> list[dict]:
        r = self.call(
            "render_range",
            {"from": frm, "to": to, "stride": stride, "width": width,
             "timeout_ms": int(timeout_s * 1000)},
            deadline_s=timeout_s,
        )
        return r.result["frames"]

    def save(self, all_: bool = True) -> dict:
        return self.call("save", {"all": all_}, deadline_s=120.0).result


if __name__ == "__main__":
    import sys

    b = HarmonyBridge(sys.argv[1] if len(sys.argv) > 1 else "/tmp/mcp-harmony")
    print("token:", b.token)
    print("ping:", b.ping())
    print("caps:", json.dumps(b.capabilities(), indent=2, ensure_ascii=False))
