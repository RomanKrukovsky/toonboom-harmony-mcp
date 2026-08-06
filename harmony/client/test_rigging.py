"""
test_rigging.py — тесты генератора ригов. Без Harmony.

План рига — данные, поэтому все инварианты проверяются до сцены:
иерархия без циклов, порядок отрисовки полный, связи ссылаются только
на созданные ноды, передняя часть — в порт 0 композита.
"""

from __future__ import annotations

from rigging import Part, RigSpec, generate_rig, humanoid_spec, validate_spec


def tiny() -> RigSpec:
    return RigSpec(
        "Bob",
        [Part("body"), Part("head", parent="body", pivot=(0, 2)),
         Part("arm", parent="body", pivot=(1, 1.5))],
        ["arm", "body", "head"],   # рука за телом, голова поверх
    )


# ---------------------------------------------------------------------------
# Валидация спеки
# ---------------------------------------------------------------------------

def test_valid_spec_no_errors():
    assert validate_spec(tiny()) == []
    assert validate_spec(humanoid_spec("Alice")) == []


def test_unknown_parent_caught():
    s = RigSpec("X", [Part("a", parent="ghost")], ["a"])
    errs = validate_spec(s)
    assert any("unknown parent" in e for e in errs)


def test_parent_cycle_caught():
    s = RigSpec("X", [Part("a", parent="b"), Part("b", parent="a")], ["a", "b"])
    assert any("cycle" in e for e in validate_spec(s))


def test_incomplete_draw_order_is_a_spec_defect():
    """Недосказанный z-order не угадывается за художника — это ошибка."""
    s = RigSpec("X", [Part("a"), Part("b")], ["a"])
    errs = validate_spec(s)
    assert any("misses parts" in e for e in errs)
    assert any("artist" in e for e in errs)


def test_duplicate_in_draw_order_caught():
    s = RigSpec("X", [Part("a"), Part("b")], ["a", "b", "a"])
    assert any("twice" in e for e in validate_spec(s))


def test_all_errors_reported_at_once():
    """Дефекты списком, не по одному: чинить спеку итерациями по одной
    ошибке — способ потратить день."""
    s = RigSpec("X", [Part("a", parent="ghost"), Part("a")], ["a", "zz"])
    errs = validate_spec(s)
    assert len(errs) >= 3


def test_invalid_spec_refuses_to_generate():
    s = RigSpec("X", [Part("a")], [])
    try:
        generate_rig(s)
        assert False, "generated from invalid spec"
    except ValueError as e:
        assert "invalid" in str(e)


# ---------------------------------------------------------------------------
# План
# ---------------------------------------------------------------------------

def added_paths(plan):
    return {f'{e["parent"]}/{e["name"]}' for e in plan.edits if e["op"] == "add"}


def test_links_only_reference_created_nodes():
    plan = generate_rig(tiny())
    created = added_paths(plan)
    for e in plan.edits:
        if e["op"] == "link":
            assert e["src"] in created, e
            assert e["dst"] in created, e


def test_nodes_created_before_links():
    plan = generate_rig(tiny())
    ops = [e["op"] for e in plan.edits]
    assert ops.index("link") > max(i for i, o in enumerate(ops) if o == "add")


def test_front_part_gets_port_zero():
    """Порт 0 композита рисуется ПОВЕРХ. draw_order идёт зад->перед,
    значит ПОСЛЕДНЯЯ часть списка — в порт 0. Ошибка на единицу здесь —
    персонаж с головой за туловищем."""
    plan = generate_rig(tiny())
    comp_links = [e for e in plan.edits
                  if e["op"] == "link" and e["dst"] == plan.composite]
    by_port = {e["dst_port"]: e["src"] for e in comp_links}
    assert by_port[0].endswith("/head")      # передняя
    assert by_port[2].endswith("/arm")       # задняя


def test_hierarchy_wired_parent_to_child():
    plan = generate_rig(tiny())
    links = [(e["src"], e["dst"]) for e in plan.edits if e["op"] == "link"]
    assert (plan.peg_of["body"], plan.peg_of["head"]) in links
    assert (plan.master_peg, plan.peg_of["body"]) in links


def test_each_read_fed_by_its_peg():
    plan = generate_rig(tiny())
    links = [(e["src"], e["dst"]) for e in plan.edits if e["op"] == "link"]
    for part in ("body", "head", "arm"):
        assert (plan.peg_of[part], plan.read_of[part]) in links


def test_pivots_set_on_pegs():
    plan = generate_rig(tiny())
    pivot_edits = [e for e in plan.edits if e["op"] == "set_attr"
                   and e["attr"].startswith("PIVOT")]
    paths = {e["path"] for e in pivot_edits}
    assert plan.peg_of["head"] in paths
    assert plan.peg_of["arm"] in paths
    # у body пивот (0,0) — правок нет
    assert plan.peg_of["body"] not in paths


def test_humanoid_full_size():
    plan = generate_rig(humanoid_spec("Alice", mouth_drawings=["m1", "m2"]))
    adds = [e for e in plan.edits if e["op"] == "add"]
    # 17 частей * 2 (пег + READ) + мастер-пег + композит
    assert len(adds) == 17 * 2 + 2
    comp_links = [e for e in plan.edits
                  if e["op"] == "link" and e["dst"] == plan.composite]
    assert len(comp_links) == 17
    # ближняя рука поверх головы (порт меньше)
    ports = {e["src"].rpartition("/")[2]: e["dst_port"] for e in comp_links}
    assert ports["hand_near"] < ports["head"] < ports["arm_far_upper"]


def test_plan_survives_simulated_apply():
    """Прогон плана через тот же симулятор, что в test_nodes: связность
    итогового графа — все READ достигают композита."""
    from nodes import GraphSnapshot, Link, find_unreachable
    plan = generate_rig(humanoid_spec("Alice"))

    nodes, links = {}, []
    for e in plan.edits:
        if e["op"] == "add":
            nodes[f'{e["parent"]}/{e["name"]}'] = {
                "type": e["type"], "name": e["name"], "enabled": True, "attrs": None}
        elif e["op"] == "link":
            links.append(Link(e["src"], e.get("src_port", 0),
                              e["dst"], e.get("dst_port", 0)))
    # добавим дисплей, чтобы у графа был сток
    nodes["Top/disp"] = {"type": "DISPLAY", "name": "disp", "enabled": True, "attrs": None}
    links.append(Link(plan.composite, 0, "Top/disp", 0))

    dead = find_unreachable(GraphSnapshot(nodes, links))
    assert dead == [], f"rig has unreachable parts: {dead}"


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
