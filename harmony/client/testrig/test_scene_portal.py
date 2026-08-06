"""
test_scene_portal.py — тесты 30-секундной сцены. Без Harmony, без рендера.

Тесты проверяют ХОРЕОГРАФИЮ как данные: что каналы покрывают все 720
кадров, что физика падений — настоящая (ускорение, а не замедление),
что события совпадают по кадрам между персонажами, что портал успевает
открыться до выстрела, а причёска примята НАВСЕГДА.

Отдельный класс тестов — на синхронизацию. Классическая ошибка длинной
сцены: правишь тайминг бонка в одном канале, забываешь в трёх других, и
рассинхрон видно только глазом на просмотре. Здесь он падает тестом.
"""

from __future__ import annotations

import _bootstrap  # noqa: F401  (ставит harmony/client в sys.path)

from columns import Key
from renderer import eval_keys
from scene_portal import (
    DRICK_X,
    FRAMES,
    HEAD_TOP,
    PORTAL_X,
    PORTAL_Y,
    camera_channels,
    crystal_channels,
    drick_channels,
    drick_face,
    portal1_open,
    portal2_open,
    vorty_channels,
    vorty_face,
)

BONK1 = 318
BONK2 = 645
FALL_START, FALL_END = 462, 498
RETURN_START, RETURN_END = 556, 596


def span(keys: list[Key]) -> tuple[int, int]:
    return int(min(k.frame for k in keys)), int(max(k.frame for k in keys))


# ---------------------------------------------------------------------------
# Покрытие: ни один канал не обрывается посреди сцены
# ---------------------------------------------------------------------------

def test_all_drick_channels_cover_scene():
    for name, keys in drick_channels().items():
        f0, f1 = span(keys)
        assert f0 <= 1, f"{name} starts at {f0}"
        assert f1 >= FRAMES - 1, f"{name} ends at {f1}, scene is {FRAMES}"


def test_all_vorty_channels_cover_scene():
    for name, keys in vorty_channels().items():
        f0, f1 = span(keys)
        assert f0 <= 1, f"{name} starts at {f0}"
        assert f1 >= FRAMES - 1, f"{name} ends at {f1}"


def test_camera_channels_cover_scene():
    for name, keys in camera_channels().items():
        f0, f1 = span(keys)
        assert f0 <= 1 and f1 >= FRAMES - 1, f"{name}: {f0}..{f1}"


def test_no_channel_has_duplicate_conflicting_keys():
    """Два разных значения на одном кадре — верный признак, что участки
    хореографии склеены с наложением и один молча затирает другой."""
    for who, chans in (("drick", drick_channels()),
                       ("vorty", vorty_channels())):
        for name, keys in chans.items():
            seen: dict[int, float] = {}
            for k in keys:
                if k.frame in seen and abs(seen[k.frame] - k.value) > 1e-6:
                    raise AssertionError(
                        f"{who}.{name} frame {k.frame}: conflicting values "
                        f"{seen[k.frame]} vs {k.value}")
                seen[k.frame] = k.value


# ---------------------------------------------------------------------------
# Физика падений: t², а не всплытие
# ---------------------------------------------------------------------------

def accelerates(keys: list[Key], f0: int, f1: int) -> bool:
    """Второй половина падения быстрее первой = ускорение."""
    mid = (f0 + f1) // 2
    v0, vm, v1 = (eval_keys(keys, f0), eval_keys(keys, mid),
                  eval_keys(keys, f1))
    first_half, second_half = abs(vm - v0), abs(v1 - vm)
    return second_half > first_half * 1.25


def test_drick_falls_into_portal_accelerating():
    y = drick_channels()["master.y"]
    assert accelerates(y, FALL_START, FALL_END), \
        "падение в портал замедляется — это всплытие, не падение"


def test_drick_returns_accelerating():
    y = drick_channels()["master.y"]
    assert accelerates(y, RETURN_START, RETURN_END - 4)


def test_crystal_arc_is_real_parabola():
    """Вверх — замедляется, вниз — ускоряется. Обе половины обязаны быть
    правильными: если перепутать профили, предмет всплывает как шарик."""
    ch = crystal_channels(292, BONK1, DRICK_X + 0.10, DRICK_X + 0.72, 3.55)
    y = ch["crystal.y"]
    apex_f = 292 + (BONK1 - 292) // 2
    # подъём: замедляется
    up_first = abs(eval_keys(y, 292 + 6) - eval_keys(y, 292))
    up_last = abs(eval_keys(y, apex_f) - eval_keys(y, apex_f - 6))
    assert up_last < up_first, "подъём ускоряется — так предметы не летают"
    # спуск: ускоряется
    assert accelerates(y, apex_f, BONK1)


def test_crystal_starts_at_portal_centre():
    """Иначе не читается «вылетело ИЗ портала»."""
    ch = crystal_channels(292, BONK1, DRICK_X + 0.10, DRICK_X + 0.72, 3.55)
    assert abs(eval_keys(ch["crystal.x"], 292) - PORTAL_X) < 1e-6
    assert abs(eval_keys(ch["crystal.y"], 292) - PORTAL_Y) < 1e-6


def test_crystal_hits_head_height():
    ch = crystal_channels(292, BONK1, DRICK_X + 0.10, DRICK_X + 0.72, 3.55)
    assert abs(eval_keys(ch["crystal.y"], BONK1) - HEAD_TOP) < 0.02


def test_crystal_hidden_before_launch():
    """До вылета кристалл должен быть ЗА кадром, а не висеть в воздухе."""
    ch = crystal_channels(292, BONK1, DRICK_X + 0.10, DRICK_X + 0.72, 3.55)
    assert eval_keys(ch["crystal.y"], 100) < -5.0


def test_crystal_ends_on_floor():
    ch = crystal_channels(292, BONK1, DRICK_X + 0.10, DRICK_X + 0.72, 3.55)
    assert 0.0 < eval_keys(ch["crystal.y"], FRAMES) < 0.4


# ---------------------------------------------------------------------------
# Портал: успевает открыться, закрывается в конце
# ---------------------------------------------------------------------------

def test_portal1_closed_before_shot():
    assert eval_keys(portal1_open(), 100) == 0.0


def test_portal1_overshoots_on_open():
    """Портал ХЛОПАЕТ в бытие: перелёт > 1.0, потом доводчик к 1.0.
    Без перелёта появление читается как медленный рост — не событие."""
    k = portal1_open()
    peak = max(eval_keys(k, f) for f in range(130, 155))
    assert peak > 1.10, f"перелёта нет (peak={peak:.3f})"
    assert abs(eval_keys(k, 200) - 1.0) < 0.02


def test_portal1_open_through_the_gag():
    k = portal1_open()
    for f in (160, 300, 450, 560, 650):
        assert eval_keys(k, f) > 0.9, f"портал схлопнулся на f{f}"


def test_portal1_closes_at_end():
    assert eval_keys(portal1_open(), FRAMES) < 0.05


def test_portal2_opens_under_drick_then_closes():
    k = portal2_open()
    assert eval_keys(k, 400) == 0.0
    assert eval_keys(k, 470) > 0.9        # открыт, пока он падает
    assert eval_keys(k, FRAMES) < 0.05    # закрылся, следов нет


def test_portal2_open_covers_whole_fall():
    """Дыра обязана существовать все кадры падения. Если закроется раньше,
    персонаж провалится через сплошной пол."""
    k = portal2_open()
    for f in range(FALL_START, 479):
        assert eval_keys(k, f) > 0.5, f"дыра закрылась на f{f}, а он ещё падает"


# ---------------------------------------------------------------------------
# Синхронизация событий между каналами
# ---------------------------------------------------------------------------

def test_bonk_is_synchronised_across_channels():
    """На кадре бонка обязаны сработать: сквош, наклон головы, глаза,
    рот, тряска камеры. Рассинхрон хотя бы одного и удар «разваливается»."""
    d = drick_channels()
    sy_before = eval_keys(d["hips.sy"], BONK1 - 6)
    sy_after = eval_keys(d["hips.sy"], BONK1 + 5)
    assert sy_after < sy_before - 0.08, "нет сквоша на бонке"

    head_before = eval_keys(d["head.rot"], BONK1 - 6)
    head_after = eval_keys(d["head.rot"], BONK1 + 5)
    assert head_after < head_before - 5.0, "голова не дёрнулась вниз"

    eyes, mouth, _ = drick_face()
    assert any(a.frame == BONK1 and a.drawing == "closed" for a in eyes)
    assert any(a.frame == BONK1 and a.drawing == "yell" for a in mouth)

    shake = camera_channels()["cam.shake_y"]
    peak = max(abs(eval_keys(shake, f)) for f in range(BONK1, BONK1 + 12))
    assert peak > 0.01, "камера не тряслась на ударе"


def test_camera_still_when_nothing_happens():
    """Тряска — акцент. Если камера дрожит всё время, акцент исчезает."""
    shake = camera_channels()["cam.shake_y"]
    for f in (50, 200, 420, 520, 700):
        assert abs(eval_keys(shake, f)) < 1e-6, f"лишняя тряска на f{f}"


def test_vorty_reacts_after_bonk_not_before():
    """Реакция обязана идти ПОСЛЕ причины. Ворти, дёрнувшийся до удара,
    выдаёт, что аниматор двигал каналы независимо."""
    v = vorty_channels()
    head = v["head.rot"]
    before = eval_keys(head, BONK1 - 2)
    assert abs(before - eval_keys(head, BONK1 - 20)) < 3.0, \
        "Ворти отреагировал до удара"
    after = eval_keys(head, BONK1 + 12)
    assert abs(after - before) > 8.0, "Ворти не отреагировал на удар"


def test_drick_is_offscreen_while_underground():
    """Между провалом и возвращением его не должно быть видно: иначе
    «телепорт» к порталу заметен зрителю."""
    y = drick_channels()["master.y"]
    for f in (505, 530, 550):
        assert eval_keys(y, f) < -2.5, f"виден на f{f} (y={eval_keys(y, f)})"


def test_drick_lands_flat_on_back():
    rot = drick_channels()["master.rot"]
    assert abs(eval_keys(rot, FRAMES) - 80.0) < 10.0, "не лежит на спине"


# ---------------------------------------------------------------------------
# Причёска: последствие, которое не проходит
# ---------------------------------------------------------------------------

def test_hair_flattens_at_bonk_and_never_recovers():
    _, _, hair = drick_face()
    assert hair[0].drawing == "spiky"
    flat = [a for a in hair if a.drawing == "flat"]
    assert len(flat) == 1
    assert BONK1 <= flat[0].frame <= BONK1 + 6
    # после — ни одного возврата к шипам
    assert not any(a.drawing == "spiky" and a.frame > flat[0].frame
                   for a in hair)


# ---------------------------------------------------------------------------
# Лица: моргания и рты не выпадают из сцены
# ---------------------------------------------------------------------------

def test_faces_within_scene_bounds():
    for tracks in (drick_face(), vorty_face()):
        for track in tracks:
            for a in track:
                assert 1 <= a.frame <= FRAMES, f"assignment at f{a.frame}"


def test_no_blinking_during_the_gag():
    """Моргание в момент удара крадёт удар: зритель не видит реакции глаз."""
    eyes, _, _ = drick_face()
    closed = [a.frame for a in eyes if a.drawing == "closed"]
    # единственное закрытие в зоне бонка — сам бонк, а не случайное моргание
    in_zone = [f for f in closed if BONK1 - 8 <= f <= BONK1 + 8]
    assert in_zone == [BONK1], in_zone


def test_vorty_ends_smiling():
    """Финальный бит: робкий получает последний взгляд."""
    _, mouth = vorty_face()
    last = max(mouth, key=lambda a: a.frame)
    assert last.drawing == "smile"
    assert last.frame > FRAMES - 120


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
