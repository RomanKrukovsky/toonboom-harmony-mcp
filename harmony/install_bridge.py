#!/usr/bin/env python3
"""
install_bridge.py — установщик моста в Harmony. Для чужих рук.

ЗАЧЕМ. Инструмент, который ставится только автором, — не инструмент.
До этого скрипта установка выглядела как «скопируй шесть файлов туда,
где, я думаю, Harmony их найдёт», и один раз я угадал каталог
неправильно: мост не загрузился, а понять это можно было только по
отсутствию спула.

ЧТО ДЕЛАЕТ:
  1. находит установленный Harmony (или принимает путь);
  2. СПРАШИВАЕТ У САМОГО HARMONY, где его каталог скриптов
     (`specialFolders.userScripts`) — вместо угадывания по шаблону;
  3. копирует пакет, проверяет контрольные суммы;
  4. говорит человеку, что делать дальше, и чего ожидать.

ЧЕСТНОЕ ОГРАНИЧЕНИЕ: шаг 2 требует рабочей лицензии Harmony, потому что
`-batch -script` без неё не стартует. Если лицензии нет, установщик
скажет это прямо и предложит каталог по шаблону — ПОМЕТИВ его как
догадку, а не как факт.
"""

from __future__ import annotations

import argparse
import hashlib
import platform
import shutil
import subprocess
import sys
from pathlib import Path

PACKAGE_FILES = ["configure.js", "bridge.js", "columns.js", "drawings.js",
                 "nodes.js", "palettes.js"]


def find_harmony(explicit: str | None) -> tuple[Path | None, str]:
    if explicit:
        p = Path(explicit)
        return (p, "given on the command line") if p.exists() else (None, f"{p} does not exist")
    system = platform.system()
    if system == "Darwin":
        cands = sorted(Path("/Applications").glob("Harmony*Premium.app")) + \
                sorted(Path("/Applications").glob("Toon Boom Harmony*/*.app"))
        for c in cands:
            exe = c / "Contents" / "MacOS" / "Harmony Premium"
            if exe.exists():
                return exe, f"found {c.name}"
        return None, "no Harmony*.app found in /Applications"
    if system == "Windows":
        for base in (Path("C:/Program Files (x86)/Toon Boom Animation"),
                     Path("C:/Program Files/Toon Boom Animation")):
            for c in sorted(base.glob("Toon Boom Harmony*/win64/bin/HarmonyPremium.exe")):
                return c, f"found {c.parent.parent.parent.name}"
        return None, "no Harmony install found under Program Files"
    for c in (Path("/usr/local/ToonBoomAnimation"),):
        for exe in sorted(c.glob("harmony*/lnx86_64/bin/HarmonyPremium")):
            return exe, f"found {exe.parent.parent.parent.name}"
    return None, "no Harmony install found"


def ask_harmony_for_scripts_dir(exe: Path) -> tuple[Path | None, str]:
    """
    Спросить у Harmony его собственный каталог скриптов.

    Это единственный надёжный способ: шаблон каталога отличается между
    версиями и платформами, а ошибка в нём проявляется не сообщением, а
    тишиной — мост просто не загружается.
    """
    probe = ("var f = new QFile(specialFolders.temp + '/mcpb_scripts_dir.txt');"
             "if (f.open(QIODevice.WriteOnly)) {"
             "  var s = new QTextStream(f);"
             "  s.writeString(specialFolders.userScripts); f.close(); }")
    import tempfile
    out = Path(tempfile.gettempdir()) / "mcpb_scripts_dir.txt"
    out.unlink(missing_ok=True)
    try:
        r = subprocess.run([str(exe), "-batch", "-script", probe],
                           capture_output=True, text=True, timeout=180)
    except (OSError, subprocess.TimeoutExpired) as e:
        return None, f"could not run Harmony: {e}"
    if out.exists():
        return Path(out.read_text(encoding="utf-8").strip()), "asked Harmony directly"
    blob = (r.stdout or "") + (r.stderr or "")
    if "FlexNet" in blob or "license" in blob.lower():
        return None, ("Harmony has no licence (FlexNet error), so it cannot be asked "
                      "where its scripts live")
    return None, "Harmony ran but did not report its scripts folder"


def guess_scripts_dir() -> tuple[Path | None, str]:
    """Каталог по шаблону. Возвращается ПОМЕЧЕННЫМ как догадка."""
    home = Path.home()
    system = platform.system()
    if system == "Darwin":
        base = home / "Library" / "Preferences" / "Toon Boom Animation"
    elif system == "Windows":
        import os
        base = Path(os.environ.get("APPDATA", home)) / "Toon Boom Animation"
    else:
        base = home / "Toon Boom Animation"
    if not base.exists():
        return None, f"{base} does not exist"
    apps = [d for d in base.iterdir() if d.is_dir() and "Harmony" in d.name]
    if not apps:
        return None, f"no Harmony folder under {base}"
    app = sorted(apps)[-1]
    scripts = [d for d in app.iterdir() if d.is_dir() and d.name.endswith("-scripts")]
    if scripts:
        return sorted(scripts)[-1], f"guessed from existing {sorted(scripts)[-1].name}"
    vers = [d.name.split("-")[0] for d in app.iterdir()
            if d.is_dir() and "-" in d.name and d.name.split("-")[0].isdigit()]
    if vers:
        return app / f"{sorted(vers)[-1]}-scripts", "guessed from sibling folder names"
    return None, f"could not infer a version prefix under {app}"


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()[:12]


def install(src: Path, dest_root: Path, dry_run: bool) -> dict:
    dest = dest_root / "packages" / "mcp-bridge"
    missing = [f for f in PACKAGE_FILES if not (src / f).exists()]
    if missing:
        raise FileNotFoundError(f"package incomplete, missing: {', '.join(missing)}")
    plan = [{"file": f, "sha": sha(src / f),
             "action": "overwrite" if (dest / f).exists() else "create"}
            for f in PACKAGE_FILES]
    if dry_run:
        return {"dry_run": True, "dest": str(dest), "files": plan}

    dest.mkdir(parents=True, exist_ok=True)
    verified = []
    for f in PACKAGE_FILES:
        shutil.copy2(src / f, dest / f)
        # Проверка после копирования: неполная запись на сетевой диск
        # даёт мост, который загрузится частично и будет вести себя
        # необъяснимо.
        if sha(dest / f) != sha(src / f):
            raise RuntimeError(f"copy verification failed for {f}")
        verified.append(f)
    return {"dry_run": False, "dest": str(dest), "verified": verified}


def main() -> int:
    ap = argparse.ArgumentParser(description="Install the MCP bridge into Harmony.")
    ap.add_argument("--harmony", help="path to the Harmony executable")
    ap.add_argument("--scripts-dir", help="override the user scripts folder")
    ap.add_argument("--source", default=str(Path(__file__).resolve().parent / "packages" / "mcp-bridge"))
    ap.add_argument("--apply", action="store_true",
                    help="actually copy (default is a dry run)")
    a = ap.parse_args()

    print("Harmony MCP bridge installer\n" + "-" * 32)

    src = Path(a.source)
    print(f"package source : {src}")
    if not src.exists():
        print("ERROR: package source not found")
        return 1

    guessed = False
    if a.scripts_dir:
        dest_root, how = Path(a.scripts_dir), "given on the command line"
    else:
        exe, found = find_harmony(a.harmony)
        print(f"harmony        : {found}" + (f" ({exe})" if exe else ""))
        dest_root, how = (None, "not attempted")
        if exe:
            dest_root, how = ask_harmony_for_scripts_dir(exe)
        if dest_root is None:
            print(f"  could not ask Harmony: {how}")
            dest_root, how = guess_scripts_dir()
            guessed = dest_root is not None

    if dest_root is None:
        print(f"ERROR: no scripts folder ({how})")
        print("Pass --scripts-dir explicitly. In Harmony you can find it with:")
        print("  MessageLog.trace(specialFolders.userScripts);")
        return 1

    print(f"scripts folder : {dest_root}\n                 ({how})")
    if guessed:
        # Это то место, где я однажды угадал неправильно и не заметил.
        print("  WARNING: this path is a GUESS, not confirmed by Harmony.")
        print("  If the bridge does not appear, run inside Harmony:")
        print("      MessageLog.trace(specialFolders.userScripts);")
        print("  and re-run with --scripts-dir <that path>")

    try:
        rep = install(src, dest_root, dry_run=not a.apply)
    except Exception as e:                     # noqa: BLE001
        print(f"ERROR: {e}")
        return 1

    if rep["dry_run"]:
        print(f"\nDRY RUN — nothing was written. Target: {rep['dest']}")
        for f in rep["files"]:
            print(f"  {f['action']:9} {f['file']:14} sha={f['sha']}")
        print("\nRe-run with --apply to install.")
        return 0

    print(f"\nInstalled {len(rep['verified'])} files into:\n  {rep['dest']}")
    print("""
Next steps, in this order:

  1. Restart Harmony. The package loads at startup.
  2. The bridge starts DISARMED on purpose: it serves only ping, status
     and capabilities. Nothing can touch a scene yet.
  3. To enable edits: Windows > "MCP Bridge: Arm / Disarm".
     Do this only in an instance no artist is working in — an armed
     bridge executes arbitrary code with your privileges, and a runaway
     script freezes Harmony's GUI thread with no way to interrupt it
     from inside.
  4. Check from outside:
       harmony.bridge.status        (is it installed and responding)
       harmony.bridge.capabilities  (what this build's API actually supports)

If harmony.bridge.status reports "spool does not exist", the package did
not load — the scripts folder above is probably wrong. See the WARNING
note if one was printed.
""")
    return 0


if __name__ == "__main__":
    sys.exit(main())
