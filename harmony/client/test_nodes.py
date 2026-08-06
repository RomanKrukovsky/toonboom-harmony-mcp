"""
test_nodes.py — тесты граф-логики: диф, план правок, мёртвые ветки, циклы.
Без Harmony: граф — это данные, и всё, что с ним делается, — чистые функции.
"""

from __future__ import annotations

from nodes import (
    GraphDiff,
    GraphSnapshot,
    Link,
    diff_graphs,
    find_cycles,
    find_unreachable,
    plan_edits,
)


def g(nodes: dict[str, str], links: list[tuple[str, str, int]],
      attrs: dict[str, dict] | None = None,
      disabled: set[str] = frozenset()) -> GraphSnapshot:
    """Хелпер: {путь: тип}, [(src, dst, dst_port)]."""
    return GraphSnapshot(
        nodes={p: {"type": t, "name": p.rpartition("/")[2],
                   "enabled": p not in disabled,
                   "attrs": (attrs or {}).get(p)}
               for p, t in nodes.items()},
        links=[Link(s, 0, d, port) for s, d, port in links],
    )


BASIC = g(
    {"Top/draw": "READ", "Top/peg": "PEG", "Top/comp": "COMPOSITE", "Top/disp": "DISPLAY"},
    [("Top/peg", "Top/draw", 0), ("Top/draw", "Top/comp", 0), ("Top/comp", "Top/disp", 0)],
)


# ---------------------------------------------------------------------------
# Диф
# ---------------------------------------------------------------------------

def test_identical_graphs_empty_diff():
    d = diff_graphs(BASIC, BASIC)
    assert d.empty
    assert d.summary() == "(no changes)"


def test_added_and_removed_nodes():
    b = g({"Top/draw": "READ", "Top/comp": "COMPOSITE", "Top/disp": "DISPLAY",
           "Top/blur": "BLUR_RADIAL"},
          [("Top/draw", "Top/blur", 0), ("Top/blur", "Top/comp", 0),
           ("Top/comp", "Top/disp", 0)])
    d = diff_graphs(BASIC, b)
    assert d.added_nodes == ["Top/blur"]
    assert d.removed_nodes == ["Top/peg"]
    # связи: draw->comp пропала, появились draw->blur и blur->comp
    assert Link("Top/draw", 0, "Top/blur", 0) in d.added_links
    assert Link("Top/draw", 0, "Top/comp", 0) in d.removed_links


def test_float_noise_is_not_a_change():
    """0.1 против 0.10000000000000003 — не изменение. Без допуска каждый
    снимок «менял» бы половину атрибутов, и диф был бы нечитаем."""
    a = g({"Top/p": "PEG"}, [], attrs={"Top/p": {"POSITION.X": 0.1}})
    b = g({"Top/p": "PEG"}, [], attrs={"Top/p": {"POSITION.X": 0.10000000000000003}})
    assert diff_graphs(a, b).empty


def test_real_attr_change_detected():
    a = g({"Top/p": "PEG"}, [], attrs={"Top/p": {"POSITION.X": 0.0}})
    b = g({"Top/p": "PEG"}, [], attrs={"Top/p": {"POSITION.X": 5.0}})
    d = diff_graphs(a, b)
    assert d.attr_changes == [("Top/p", "POSITION.X", 0.0, 5.0)]


def test_disable_detected():
    b = g({"Top/draw": "READ", "Top/peg": "PEG", "Top/comp": "COMPOSITE",
           "Top/disp": "DISPLAY"},
          [("Top/peg", "Top/draw", 0), ("Top/draw", "Top/comp", 0),
           ("Top/comp", "Top/disp", 0)],
          disabled={"Top/draw"})
    d = diff_graphs(BASIC, b)
    assert d.toggled_nodes == [("Top/draw", False)]
    assert "DISABLED" in d.summary()


# ---------------------------------------------------------------------------
# План правок
# ---------------------------------------------------------------------------

def test_plan_order_is_safe():
    """unlink -> remove -> add -> link -> attrs. Нарушение порядка либо
    падает в Harmony, либо линкует к ещё не созданной ноде."""
    b = g({"Top/draw": "READ", "Top/comp": "COMPOSITE", "Top/disp": "DISPLAY",
           "Top/blur": "BLUR_RADIAL"},
          [("Top/draw", "Top/blur", 0), ("Top/blur", "Top/comp", 0),
           ("Top/comp", "Top/disp", 0)])
    edits = plan_edits(diff_graphs(BASIC, b), source=b)
    ops = [e["op"] for e in edits]
    order = {"unlink": 0, "remove": 1, "add": 2, "link": 3, "set_attr": 4, "enable": 5}
    ranks = [order[o] for o in ops]
    assert ranks == sorted(ranks), ops


def test_plan_add_carries_type_from_source():
    b = g({"Top/blur": "BLUR_RADIAL", "Top/disp": "DISPLAY"}, [])
    a = g({"Top/disp": "DISPLAY"}, [])
    edits = plan_edits(diff_graphs(a, b), source=b)
    add = next(e for e in edits if e["op"] == "add")
    assert add["type"] == "BLUR_RADIAL"
    assert add["parent"] == "Top"
    assert add["name"] == "blur"


def test_roundtrip_diff_of_applied_plan_is_empty():
    """Свойство, ради которого всё затевалось: diff(B, A+plan(diff(A,B))) = 0.
    Симулируем применение плана к снимку и сверяем."""
    b = g({"Top/draw": "READ", "Top/comp": "COMPOSITE", "Top/disp": "DISPLAY",
           "Top/glow": "GLOW"},
          [("Top/draw", "Top/glow", 0), ("Top/glow", "Top/comp", 0),
           ("Top/comp", "Top/disp", 0)])
    d = diff_graphs(BASIC, b)
    edits = plan_edits(d, source=b)

    # симулятор node_edit
    nodes = {p: dict(v) for p, v in BASIC.nodes.items()}
    links = list(BASIC.links)
    for e in edits:
        if e["op"] == "unlink":
            links = [l for l in links if not (l.dst == e["dst"] and l.dst_port == e["dst_port"])]
        elif e["op"] == "remove":
            nodes.pop(e["path"], None)
        elif e["op"] == "add":
            nodes[f'{e["parent"]}/{e["name"]}'] = {"type": e["type"], "name": e["name"],
                                                   "enabled": True, "attrs": None}
        elif e["op"] == "link":
            links.append(Link(e["src"], e.get("src_port", 0), e["dst"], e.get("dst_port", 0)))
    result = GraphSnapshot(nodes, links)
    assert diff_graphs(result, b).empty, diff_graphs(result, b).summary()


# ---------------------------------------------------------------------------
# Мёртвые ветки и циклы
# ---------------------------------------------------------------------------

def test_unreachable_branch_found():
    snap = g({"Top/draw": "READ", "Top/comp": "COMPOSITE", "Top/disp": "DISPLAY",
              "Top/old_draw": "READ", "Top/old_blur": "BLUR_RADIAL"},
             [("Top/draw", "Top/comp", 0), ("Top/comp", "Top/disp", 0),
              ("Top/old_draw", "Top/old_blur", 0)])   # ветка в никуда
    dead = find_unreachable(snap)
    assert dead == ["Top/old_blur", "Top/old_draw"]


def test_everything_connected_nothing_dead():
    assert find_unreachable(BASIC) == []


def test_no_display_means_everything_dead():
    """Сцена без дисплея: всё мертво — и это правильный ответ, потому что
    рендерить действительно нечего. Линтер должен кричать, а не молчать."""
    snap = g({"Top/draw": "READ", "Top/comp": "COMPOSITE"},
             [("Top/draw", "Top/comp", 0)])
    assert set(find_unreachable(snap)) == {"Top/draw", "Top/comp"}


def test_cycle_detected():
    snap = g({"Top/a": "COMPOSITE", "Top/b": "COMPOSITE", "Top/c": "COMPOSITE",
              "Top/disp": "DISPLAY"},
             [("Top/a", "Top/b", 0), ("Top/b", "Top/c", 0), ("Top/c", "Top/a", 1),
              ("Top/a", "Top/disp", 0)])
    cycles = find_cycles(snap)
    assert cycles, "cycle not found"
    assert set(cycles[0][:-1]) == {"Top/a", "Top/b", "Top/c"}


def test_acyclic_graph_no_cycles():
    assert find_cycles(BASIC) == []


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
