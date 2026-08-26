"""Round-trip тест: .moho -> PIR -> .moho -> структурная сверка с оригиналом."""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from pipeline.moho.emit import emit  # noqa: E402
from pipeline.moho.extract import extract_from_file  # noqa: E402
from pipeline.tools.structural_audit import audit  # noqa: E402

REFERENCE = REPO / "fixtures/moho_reference/gramps_rig.moho"
OUT_DIR = REPO / "output/pipeline_roundtrip"


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rig = extract_from_file(str(REFERENCE))
    pir_path = OUT_DIR / "gramps.pir.json"
    pir_path.write_text(json.dumps(rig.to_dict(), indent=1))
    print(f"PIR записан: {pir_path}")
    print(f"  костей: {len(rig.bones)}, частей верхнего уровня: {len(rig.root_parts)}")
    for p in rig.root_parts:
        print(f"  - {p.type} '{p.name}' children={len(p.children)}")

    out_moho = OUT_DIR / "gramps_regenerated.moho"
    emit(rig, str(out_moho))
    print(f"Собран .moho: {out_moho} ({out_moho.stat().st_size} байт; "
          f"оригинал {REFERENCE.stat().st_size} байт)")

    ok, problems = audit(str(REFERENCE), str(out_moho))
    if ok:
        print("STRUCTURAL AUDIT: PASS — регенерированный файл структурно "
              "идентичен оригиналу (кости, дерево, mesh, transforms)")
        return 0
    print(f"STRUCTURAL AUDIT: FAIL — {len(problems)} расхождений:")
    for p in problems[:30]:
        print("  -", p)
    return 1


if __name__ == "__main__":
    sys.exit(main())
