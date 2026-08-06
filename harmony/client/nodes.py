"""
nodes.py — сеть нод как данные: снимок, диф, план правок.

Идея №7 из списка: композитинг как декларативный конфиг. Здесь это сделано
не через YAML-файл, а через три операции, из которых YAML собирается тривиально:

    snapshot = графа сцены          (node_graph из nodes.js)
    diff     = что изменилось       (чистая функция, тестируется без Harmony)
    plan     = как из A сделать B   (список правок для node_edit)

Отсюда «рефактор рига с код-ревью»: snapshot до, snapshot после, diff — это
и есть предмет ревью. А plan — это применение одобренного дифа к другой сцене
(тот же риг в 40 шотах: починили в одном, раскатали во все).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Sequence

from bridge_client import HarmonyBridge


# ---------------------------------------------------------------------------
# Снимок графа
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Link:
    src: str          # путь ноды-источника
    src_port: int
    dst: str
    dst_port: int


@dataclass
class GraphSnapshot:
    """Граф как данные. Ключ ноды — путь ('Top/Char/Head/mouth')."""
    nodes: dict[str, dict]                  # path -> {type, name, enabled, attrs?}
    links: list[Link] = field(default_factory=list)

    @staticmethod
    def from_bridge_result(res: dict) -> "GraphSnapshot":
        nodes: dict[str, dict] = {}
        links: list[Link] = []
        for n in res["nodes"]:
            nodes[n["path"]] = {
                "type": n.get("type"),
                "name": n.get("name"),
                "enabled": n.get("enabled"),
                "attrs": {a["name"]: a["value"] for a in (n.get("attrs") or [])} or None,
            }
            for l in n.get("in_links") or []:
                if l.get("src"):
                    links.append(Link(l["src"], 0, n["path"], int(l["port"])))
        links.sort(key=lambda l: (l.dst, l.dst_port))
        return GraphSnapshot(nodes, links)

    def link_set(self) -> set[tuple[str, int, str, int]]:
        return {(l.src, l.src_port, l.dst, l.dst_port) for l in self.links}


# ---------------------------------------------------------------------------
# Диф: предмет ревью
# ---------------------------------------------------------------------------

@dataclass
class GraphDiff:
    added_nodes: list[str] = field(default_factory=list)
    removed_nodes: list[str] = field(default_factory=list)
    retyped_nodes: list[tuple[str, str, str]] = field(default_factory=list)   # path, was, now
    toggled_nodes: list[tuple[str, bool]] = field(default_factory=list)       # path, now_enabled
    attr_changes: list[tuple[str, str, Any, Any]] = field(default_factory=list)  # path, attr, was, now
    added_links: list[Link] = field(default_factory=list)
    removed_links: list[Link] = field(default_factory=list)

    @property
    def empty(self) -> bool:
        return not (self.added_nodes or self.removed_nodes or self.retyped_nodes
                    or self.toggled_nodes or self.attr_changes
                    or self.added_links or self.removed_links)

    def summary(self) -> str:
        """Человекочитаемый диф — то, что идёт в описание ревью."""
        lines: list[str] = []
        for p in self.added_nodes:
            lines.append(f"+ node {p}")
        for p in self.removed_nodes:
            lines.append(f"- node {p}")
        for p, was, now in self.retyped_nodes:
            lines.append(f"! node {p}: type {was} -> {now}")
        for p, en in self.toggled_nodes:
            lines.append(f"! node {p}: {'enabled' if en else 'DISABLED'}")
        for p, a, was, now in self.attr_changes:
            lines.append(f"! attr {p}.{a}: {was!r} -> {now!r}")
        for l in self.added_links:
            lines.append(f"+ link {l.src} -> {l.dst}:{l.dst_port}")
        for l in self.removed_links:
            lines.append(f"- link {l.src} -> {l.dst}:{l.dst_port}")
        return "\n".join(lines) if lines else "(no changes)"


def diff_graphs(a: GraphSnapshot, b: GraphSnapshot) -> GraphDiff:
    d = GraphDiff()
    ap, bp = set(a.nodes), set(b.nodes)
    d.added_nodes = sorted(bp - ap)
    d.removed_nodes = sorted(ap - bp)

    for p in sorted(ap & bp):
        na, nb = a.nodes[p], b.nodes[p]
        if na.get("type") != nb.get("type"):
            d.retyped_nodes.append((p, str(na.get("type")), str(nb.get("type"))))
        if na.get("enabled") is not None and nb.get("enabled") is not None \
                and na["enabled"] != nb["enabled"]:
            d.toggled_nodes.append((p, bool(nb["enabled"])))
        aa, ab = na.get("attrs") or {}, nb.get("attrs") or {}
        for k in sorted(set(aa) | set(ab)):
            va, vb = aa.get(k), ab.get(k)
            if _attr_differs(va, vb):
                d.attr_changes.append((p, k, va, vb))

    la, lb = a.link_set(), b.link_set()
    d.added_links = sorted((Link(*t) for t in lb - la), key=lambda l: (l.dst, l.dst_port))
    d.removed_links = sorted((Link(*t) for t in la - lb), key=lambda l: (l.dst, l.dst_port))
    return d


def _attr_differs(a: Any, b: Any) -> bool:
    """Числа сравниваем с допуском: 0.1 из Harmony может вернуться как
    0.10000000000000001, и без допуска каждый снимок «меняет» половину атрибутов."""
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(float(a) - float(b)) > 1e-9
    return a != b


# ---------------------------------------------------------------------------
# План: как применить диф к сцене
# ---------------------------------------------------------------------------

def plan_edits(diff: GraphDiff, target: GraphSnapshot | None = None,
               source: GraphSnapshot | None = None) -> list[dict]:
    """
    Диф -> список правок для node_edit, в безопасном порядке:
      1. unlink удаляемых связей   (нельзя удалять ноду с живыми связями)
      2. remove удаляемых нод
      3. add новых нод             (тип и родитель берём из source-снимка)
      4. link новых связей         (после того как обе стороны существуют)
      5. атрибуты и enable — последними: они не меняют топологию
    """
    edits: list[dict] = []

    for l in diff.removed_links:
        edits.append({"op": "unlink", "dst": l.dst, "dst_port": l.dst_port})
    for p in diff.removed_nodes:
        edits.append({"op": "remove", "path": p})
    for p in diff.added_nodes:
        meta = (source.nodes.get(p) if source else None) or {}
        parent, _, name = p.rpartition("/")
        edits.append({"op": "add", "type": meta.get("type") or "PEG",
                      "name": name, "parent": parent or "Top"})
    for l in diff.added_links:
        edits.append({"op": "link", "src": l.src, "src_port": l.src_port,
                      "dst": l.dst, "dst_port": l.dst_port})
    for p, k, _was, now in diff.attr_changes:
        edits.append({"op": "set_attr", "path": p, "attr": k, "value": now})
    for p, en in diff.toggled_nodes:
        edits.append({"op": "enable", "path": p, "enabled": en})
    return edits


# ---------------------------------------------------------------------------
# Граф-анализ для линтера (снаружи: это математика, не доступ)
# ---------------------------------------------------------------------------

def find_unreachable(snapshot: GraphSnapshot,
                     sink_types: Sequence[str] = ("DISPLAY", "WRITE")) -> list[str]:
    """
    Мёртвые ветки: ноды, от которых нет пути ни к одному дисплею/рендеру.
    Это «минификатор сцен» (идея №34) в режиме диагностики: сначала показать,
    что мертво, удалять — отдельным решением человека.
    """
    consumers: dict[str, list[str]] = {}
    for l in snapshot.links:
        consumers.setdefault(l.src, []).append(l.dst)

    sinks = [p for p, n in snapshot.nodes.items() if n.get("type") in sink_types]
    alive: set[str] = set()
    stack = list(sinks)
    # живое = то, из чего достижим сток, идя ПО направлению связей
    # (пройдём от стоков против связей)
    feeds: dict[str, list[str]] = {}
    for l in snapshot.links:
        feeds.setdefault(l.dst, []).append(l.src)
    while stack:
        p = stack.pop()
        if p in alive:
            continue
        alive.add(p)
        stack.extend(feeds.get(p, []))

    groups = {p for p, n in snapshot.nodes.items() if n.get("type") == "GROUP"}
    return sorted(p for p in snapshot.nodes
                  if p not in alive and p not in groups
                  and snapshot.nodes[p].get("type") not in sink_types)


def find_cycles(snapshot: GraphSnapshot) -> list[list[str]]:
    """Циклы в композите: Harmony такое иногда позволяет собрать через
    группы, а рендер потом виснет. Ловим до рендера."""
    adj: dict[str, list[str]] = {}
    for l in snapshot.links:
        adj.setdefault(l.src, []).append(l.dst)

    WHITE, GRAY, BLACK = 0, 1, 2
    color = {p: WHITE for p in snapshot.nodes}
    cycles: list[list[str]] = []

    def dfs(p: str, path: list[str]) -> None:
        color[p] = GRAY
        path.append(p)
        for q in adj.get(p, []):
            if q not in color:
                continue
            if color[q] == GRAY:
                cycles.append(path[path.index(q):] + [q])
            elif color[q] == WHITE:
                dfs(q, path)
        path.pop()
        color[p] = BLACK

    for p in snapshot.nodes:
        if color[p] == WHITE:
            dfs(p, [])
    return cycles


# ---------------------------------------------------------------------------
# Фасад
# ---------------------------------------------------------------------------

class Nodes:
    def __init__(self, bridge: HarmonyBridge):
        self.b = bridge

    def selftest(self) -> dict:
        return self.b.call("nodes_selftest", deadline_s=15.0).result

    def snapshot(self, root: str = "Top", attrs: bool = False,
                 types: Sequence[str] | None = None) -> GraphSnapshot:
        res = self.b.call("node_graph", {
            "root": root, "attrs": attrs,
            "types": list(types) if types else None,
        }, deadline_s=180.0).result
        return GraphSnapshot.from_bridge_result(res)

    def edit(self, edits: Sequence[dict]) -> dict:
        return self.b.call("node_edit", {"edits": list(edits)}, deadline_s=180.0).result

    def lint(self, rules: Sequence[str] | None = None) -> list[dict]:
        """Правила уровня графа — внутри Harmony; mертвые ветки и циклы — здесь."""
        res = self.b.call("scene_lint", {
            "rules": list(rules) if rules else None,
        }, deadline_s=300.0).result
        findings = list(res["findings"])

        snap = self.snapshot()
        if rules is None or "unreachable" in (rules or []):
            for p in find_unreachable(snap):
                findings.append({"rule": "unreachable", "severity": "warning", "node": p,
                                 "message": "no path to any display/write; renders nowhere"})
        if rules is None or "cycle" in (rules or []):
            for cyc in find_cycles(snap):
                findings.append({"rule": "cycle", "severity": "error",
                                 "node": cyc[0], "message": " -> ".join(cyc)})
        return findings

    def apply_diff(self, diff: GraphDiff, source: GraphSnapshot | None = None) -> dict:
        return self.edit(plan_edits(diff, source=source))


if __name__ == "__main__":
    import sys

    b = HarmonyBridge(sys.argv[1] if len(sys.argv) > 1 else "/tmp/mcp-harmony")
    n = Nodes(b)
    snap = n.snapshot()
    print(f"{len(snap.nodes)} nodes, {len(snap.links)} links")
    for f in n.lint():
        print(f"  [{f['severity']}] {f['rule']}: {f.get('node') or f.get('column')} — {f['message']}")
