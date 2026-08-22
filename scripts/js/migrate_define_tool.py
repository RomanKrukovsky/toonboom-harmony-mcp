#!/usr/bin/env python3
"""Migrate `handler: async (args: any)` tool literals onto defineTool().

Each tool file exports one or more arrays of tool definitions. Wrapping each
object literal in `defineTool({...})` makes TypeScript infer the handler's
`args` type from the sibling `inputSchema`, which turns silent runtime typos
into compile errors.

The transform is deliberately conservative:
  * only object literals at array-element indentation are touched;
  * a literal must contain both `name: 'harmony.` and `handler:`;
  * `(args: any)` becomes `(args)` so inference kicks in;
  * files that already import defineTool are left alone on the import line.

Run from the repository root:  python3 scripts/js/migrate_define_tool.py
"""

import pathlib
import re
import sys

TOOLS_DIR = pathlib.Path("src/tools")
IMPORT_LINE = "import { defineTool } from './defineTool.js';"


def add_import(source: str) -> str:
    if "defineTool" in source and IMPORT_LINE in source:
        return source
    lines = source.split("\n")
    last_import = -1
    for i, line in enumerate(lines):
        if line.startswith("import "):
            last_import = i
    if last_import == -1:
        return IMPORT_LINE + "\n" + source
    lines.insert(last_import + 1, IMPORT_LINE)
    return "\n".join(lines)


def wrap_literals(source: str) -> tuple[str, int]:
    lines = source.split("\n")
    out: list[str] = []
    wrapped = 0
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.strip() == "{" and line.startswith("  ") and len(line) - len(line.lstrip()) == 2:
            depth = 0
            j = i
            while j < len(lines):
                depth += lines[j].count("{") - lines[j].count("}")
                if depth == 0:
                    break
                j += 1
            if j < len(lines):
                block = lines[i : j + 1]
                text = "\n".join(block)
                if "name: 'harmony." in text and "handler:" in text:
                    block[0] = "  defineTool({"
                    tail = block[-1].rstrip()
                    if tail == "  },":
                        block[-1] = "  }),"
                    elif tail == "  }":
                        block[-1] = "  })"
                    else:
                        out.append(line)
                        i += 1
                        continue
                    out.extend(block)
                    wrapped += 1
                    i = j + 1
                    continue
        out.append(line)
        i += 1
    return "\n".join(out), wrapped


def migrate(path: pathlib.Path) -> int:
    source = path.read_text()
    if "handler:" not in source or "name: 'harmony." not in source:
        return 0
    migrated, wrapped = wrap_literals(source)
    if wrapped == 0:
        return 0
    migrated = re.sub(r"handler: async \(args: any\)", "handler: async (args)", migrated)
    migrated = re.sub(r"handler: \(args: any\)", "handler: (args)", migrated)
    migrated = add_import(migrated)
    path.write_text(migrated)
    return wrapped


def main() -> int:
    if not TOOLS_DIR.is_dir():
        print("run me from the repository root", file=sys.stderr)
        return 1
    targets = sorted(TOOLS_DIR.glob("*.ts"))
    total = 0
    for path in targets:
        if path.name == "defineTool.ts":
            continue
        count = migrate(path)
        if count:
            print(f"{path.name}: wrapped {count}")
            total += count
    print(f"total wrapped: {total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
