"""
swaps.py — подмена рисунков для слоя рисунков (идея №24).

Мост между `drawings.Assignment` (что показать на каком кадре) и
`swap_groups` в спеке Blender.

ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. `drawings.py` умеет строить план липсинка и
моргания, `artwork.py` умеет принимать PNG. Между ними была дыра: план
говорит «на кадре 12 показать mouth_A», а слой рисунков не умел ничего
подменять — все варианты рта светились бы одновременно.

КОНВЕНЦИЯ ИМЁН. Варианты одной группы называются `<группа>__<вариант>`:

    mouth__flat.png  mouth__A.png  mouth__O.png
    eyes__open.png   eyes__half.png  eyes__closed.png

Это даёт две вещи бесплатно: группы выводятся из имён файлов (не надо
описывать их дважды), и в `parts.json` каждый вариант — обычная часть со
своим пивотом, потому что рот в профиль крепится не туда, где рот анфас.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from artwork import ArtPart, ArtSet
from drawings import Assignment

SEP = "__"


@dataclass
class SwapGroup:
    """Группа взаимоисключающих рисунков."""
    name: str
    members: list[str]              # полные имена частей
    default: str                    # что показывать до первого назначения

    def variant_to_part(self, variant: str) -> str:
        return f"{self.name}{SEP}{variant}"


def discover_groups(art: ArtSet) -> list[SwapGroup]:
    """
    Найти группы подмены по именам частей.

    Часть без разделителя в имени — обычная часть, не группа. Группа из
    одного варианта группой не считается: подменять нечем, и молча
    создавать её значит прятать опечатку в имени файла.
    """
    buckets: dict[str, list[str]] = {}
    for p in art.parts:
        if SEP not in p.name:
            continue
        group, _, variant = p.name.partition(SEP)
        if not variant:
            raise ValueError(
                f"part {p.name!r} ends with {SEP!r} and has no variant name")
        buckets.setdefault(group, []).append(p.name)

    out: list[SwapGroup] = []
    for group, members in sorted(buckets.items()):
        if len(members) < 2:
            raise ValueError(
                f"swap group {group!r} has only {members[0]!r}: nothing to swap "
                f"with. Either add variants or drop {SEP!r} from the name.")
        out.append(SwapGroup(group, sorted(members), sorted(members)[0]))
    return out


def assignments_to_timeline(group: SwapGroup,
                            assignments: Sequence[Assignment],
                            frame_end: int | None = None) -> list[dict]:
    """
    `Assignment` (кадр + имя рисунка) -> таймлайн подмены.

    Имя в назначении — ВАРИАНТ ("A", "open"), а не полное имя части:
    план липсинка не должен знать про конвенцию файлов. Неизвестный
    вариант — ошибка, а не тихий пропуск: «рот не открылся на половине
    слов» надо увидеть сразу.
    """
    known = {m.partition(SEP)[2] for m in group.members}
    out: list[dict] = []
    for a in sorted(assignments, key=lambda x: x.frame):
        if a.drawing not in known:
            raise KeyError(
                f"group {group.name!r} has no variant {a.drawing!r}; "
                f"available: {', '.join(sorted(known))}")
        if frame_end is not None and a.frame > frame_end:
            continue
        out.append({"frame": int(a.frame),
                    "drawing": group.variant_to_part(a.drawing)})
    return out


def swap_groups_spec(art: ArtSet,
                     tracks: dict[str, Sequence[Assignment]],
                     frame_end: int | None = None) -> list[dict]:
    """
    Полное описание подмен для спеки Blender.

    tracks: {"mouth": [Assignment...], "eyes": [...]}. Группа без трека
    остаётся на своём default — это законно (кисть меняется не всегда).
    Трек без группы — ошибка: значит опечатка в имени, и липсинк молча
    не сработает.
    """
    groups = {g.name: g for g in discover_groups(art)}
    unknown = sorted(set(tracks) - set(groups))
    if unknown:
        raise KeyError(
            f"no swap group for track(s): {', '.join(unknown)}. "
            f"Groups found in the artwork: {', '.join(sorted(groups)) or 'none'}")

    out = []
    for name, g in sorted(groups.items()):
        out.append({
            "name": g.name,
            "members": g.members,
            "default": g.default,
            "timeline": assignments_to_timeline(g, tracks.get(name, []),
                                                frame_end),
        })
    return out


def non_swap_parts(art: ArtSet) -> list[ArtPart]:
    """Обычные части (не варианты подмены) — для проверок и отчётов."""
    return [p for p in art.parts if SEP not in p.name]
