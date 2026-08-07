"""
test_no_placeholders.py — в отгружаемом коде нет заглушек, TODO и мёртвых веток.

Гейт для сдачи. Заглушка, дожившая до продакшна, это не косметика: `pass` в
обработчике ошибки означает, что серия молча продолжит с испорченным шотом, а
`if False` — что кто-то отключил проверку и забыл.

Проверка идёт по ОТГРУЖАЕМЫМ модулям. Пробы (smoke_*) и тесты исключены
намеренно: в них слова «fake» и «stub» — это имя предмета, а не дефект.
"""

from __future__ import annotations

import re
from pathlib import Path

HERE = Path(__file__).resolve().parent

# Отгружаемое: то, что исполняется в продакшн-прогоне серии.
SHIPPED = [
    "episode.py", "artwork.py", "audio.py", "swaps.py", "blender_host.py",
    "columns.py", "craft.py", "camera.py", "drawings.py", "phonemes.py",
    "nodes.py", "palettes.py", "provenance.py", "continuity.py",
    "imperfection.py", "reference.py", "rigging.py", "rig_ci.py",
    "keyframes.py", "bridge_client.py",
    "blender/build_scene.py",
]

# Маркеры ищутся С УЧЁТОМ РЕГИСТРА: без этого переменная `todo` в очереди
# эпизода ловится как маркер TODO, и гейт краснеет на совершенно корректном
# коде. Ложное срабатывание тут особенно вредно — оно учит игнорировать
# именно тот гейт, который стоит перед сдачей.
BANNED = [
    (r"\bTODO\b", "TODO"),
    (r"\bFIXME\b", "FIXME"),
    (r"\bXXX\b", "XXX"),
    (r"\bHACK\b", "HACK"),
    (r"\bif\s+False\b", "disabled branch (`if False`)"),
    (r"raise\s+NotImplementedError", "NotImplementedError"),
    # Пустое тело `...` ищется ТОЛЬКО как отдельная инструкция после двоеточия:
    # `tuple[str, ...]` — законный синтаксис типа, и ловить его как заглушку
    # значит краснеть на корректной аннотации.
    (r":\s*\n\s*\.\.\.\s*(\n|$)", "bare ellipsis body"),
    (r"\blorem\b", "lorem"),
    (r"\bplaceholder\b", "the word 'placeholder'"),
    (r"\bstub\b", "the word 'stub'"),
]


def strip_comments_and_docstrings(src: str) -> str:
    """Оставить только исполняемый код.

    Иначе гейт ловит собственные объяснения: комментарий «раньше здесь была
    заглушка» — это документация решения, а не заглушка. Такой ложный
    срабатыв учит игнорировать гейт, что хуже его отсутствия.
    """
    import io
    import tokenize
    out: list[str] = []
    try:
        toks = list(tokenize.generate_tokens(io.StringIO(src).readline))
    except (tokenize.TokenError, IndentationError, SyntaxError):
        return src
    prev_type = None
    for tok in toks:
        if tok.type == tokenize.COMMENT:
            continue
        if tok.type == tokenize.STRING and prev_type in (
                None, tokenize.INDENT, tokenize.DEDENT, tokenize.NEWLINE,
                tokenize.NL):
            continue                      # docstring в позиции инструкции
        out.append(tok.string if tok.type != tokenize.NL else "\n")
        if tok.type not in (tokenize.NL, tokenize.COMMENT):
            prev_type = tok.type
    return "\n".join(out)


def test_shipped_files_exist():
    missing = [f for f in SHIPPED if not (HERE / f).is_file()]
    assert not missing, f"shipped modules missing: {missing}"


def test_no_banned_markers_in_shipped_code():
    hits: list[str] = []
    for rel in SHIPPED:
        p = HERE / rel
        if not p.is_file():
            continue
        code = strip_comments_and_docstrings(p.read_text(errors="replace"))
        for pat, label in BANNED:
            for m in re.finditer(pat, code, re.M):
                line = code[:m.start()].count("\n") + 1
                hits.append(f"{rel}: {label} (~line {line} of stripped source)")
    assert not hits, "placeholders in shipped code:\n  " + "\n  ".join(hits[:12])


def test_no_silent_except_pass():
    """`except: pass` в конвейере означает, что серия продолжит с испорченным
    шотом и никто не узнает. Осознанное игнорирование пишется с комментарием
    ПОЧЕМУ, и тогда попадает в исключения ниже по имени файла."""
    bad: list[str] = []
    pat = re.compile(r"except[^\n:]*:\s*\n\s*pass\s*(\n|$)")
    for rel in SHIPPED:
        p = HERE / rel
        if not p.is_file():
            continue
        src = p.read_text(errors="replace")
        for m in pat.finditer(src):
            line = src[:m.start()].count("\n") + 1
            # Комментарий в той же строке, что pass, объясняет намерение.
            frag = src[m.start():m.end()]
            if "#" in frag:
                continue
            bad.append(f"{rel}:{line}")
    assert not bad, ("silent `except: pass` in shipped code — a swallowed error "
                     "means the episode continues with a broken shot:\n  "
                     + "\n  ".join(bad[:10]))


def test_every_shipped_module_imports():
    """Модуль, который не импортируется, не отгружаем — он падёт в прогоне."""
    import importlib
    import sys
    sys.path.insert(0, str(HERE))
    failed = []
    for rel in SHIPPED:
        if "/" in rel:
            continue                       # build_scene исполняется внутри Blender
        mod = rel[:-3]
        try:
            importlib.import_module(mod)
        except Exception as e:             # noqa: BLE001
            failed.append(f"{mod}: {type(e).__name__}: {e}")
    assert not failed, "shipped modules that do not import:\n  " + "\n  ".join(failed)


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
