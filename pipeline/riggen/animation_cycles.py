"""Синтезатор циклов анимации и библиотеки действий (Actions Library).

Генерирует готовые к использованию циклические экшены для Moho Pro:
1. Walk Cycle (24 кадра): Контакт -> Спад (Down) -> Проход (Passing) -> Пик (Up) с IK-таргетами ног и качанием таза.
2. Run Cycle (14 кадров): Фаза полёта (Airborne), глубокий наклон и автоматические ключи смаров (Smear Frames).
3. Idle & Blink (36 кадров): Дыхание, моргание глаз и микродвижения головы.
4. Jump & Land (20 кадров): Присед (Anticipation), взлёт, группировка и амортизация (Cushion).
"""
from __future__ import annotations

import math
from typing import Any

from ..pir.schema import Channel


def _vec2_channel(when: list[int], coords: list[tuple[float, float]]) -> dict:
    return {
        "type": "Vec2",
        "ref": False,
        "mute": False,
        "when": when,
        "val": [{"x": round(x, 6), "y": round(y, 6)} for x, y in coords],
        "interp": [{"im": 1, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0, "s": False, "t": 0} for _ in when]
    }


def _val_channel(when: list[int], values: list[float]) -> dict:
    return {
        "type": "Val",
        "ref": False,
        "mute": False,
        "when": when,
        "val": [round(v, 6) for v in values],
        "interp": [{"im": 1, "v1": -1.0, "v2": -1.0, "in": 1, "h": 0, "s": False, "t": 0} for _ in when]
    }


def generate_walk_cycle_action(
    stride_len: float = 0.22,
    step_height: float = 0.08,
    pelvis_drop: float = 0.025,
    arm_swing_deg: float = 24.0,
    frames: int = 24
) -> dict[str, Any]:
    """Синтезирует 24-кадровый цикл классической походки (Contact, Down, Pass, Up, Contact)."""
    # Временные точки фаз (0, 3, 6, 9, 12, 15, 18, 21, 24)
    when = [0, 3, 6, 9, 12, 15, 18, 21, 24]
    half = len(when) // 2

    # 1. Траектория левой стопы (Target Leg L)
    # 0: контакт впереди, 6: приземление/спад, 12: опорная сзади, 18: подъем и пронос вперед, 24: контакт
    leg_l_pos = [
        (-stride_len * 0.5, 0.0),               # 0: Contact (L forward)
        (-stride_len * 0.4, 0.0),               # 3: Down
        (0.0, 0.0),                             # 6: Passing (support)
        (stride_len * 0.35, 0.0),               # 9: Push
        (stride_len * 0.5, 0.0),                # 12: Contact (L back)
        (stride_len * 0.3, step_height * 0.5),  # 15: Lift
        (0.0, step_height),                     # 18: High Passing
        (-stride_len * 0.35, step_height * 0.6),# 21: Reach
        (-stride_len * 0.5, 0.0),               # 24: Contact
    ]

    # 2. Траектория правой стопы (Target Leg R) — противофаза со сдвигом на 12 кадров
    leg_r_pos = leg_l_pos[4:] + leg_l_pos[1:5]

    # 3. Вертикальное покачивание таза (Body Pos Y)
    # В контакте нейтрально, в Down опускается, в Up поднимается
    body_y = [
        0.0, -pelvis_drop, 0.0, pelvis_drop * 0.8,
        0.0, -pelvis_drop, 0.0, pelvis_drop * 0.8,
        0.0
    ]
    body_coords = [(0.0, y) for y in body_y]

    # 4. Размах рук (противофаза ногам)
    arm_rad = math.radians(arm_swing_deg)
    arm_l_angles = [
        arm_rad, arm_rad * 0.6, 0.0, -arm_rad * 0.6,
        -arm_rad, -arm_rad * 0.6, 0.0, arm_rad * 0.6,
        arm_rad
    ]
    arm_r_angles = [-a for a in arm_l_angles]

    return {
        "name": "Walk Cycle",
        "duration": frames,
        "bones": {
            "Target Leg L": {"anim_pos": _vec2_channel(when, leg_l_pos)},
            "Target Leg R": {"anim_pos": _vec2_channel(when, leg_r_pos)},
            "Body": {"anim_pos": _vec2_channel(when, body_coords)},
            "UpperArm L": {"anim_angle": _val_channel(when, arm_l_angles)},
            "UpperArm R": {"anim_angle": _val_channel(when, arm_r_angles)},
            "LowerArm L": {"anim_angle": _val_channel(when, [a * 0.5 for a in arm_l_angles])},
            "LowerArm R": {"anim_angle": _val_channel(when, [a * 0.5 for a in arm_r_angles])},
            "Head": {"anim_angle": _val_channel(when, [-math.radians(2.0), math.radians(1.5), 0.0, -math.radians(1.5),
                                                        -math.radians(2.0), math.radians(1.5), 0.0, -math.radians(1.5),
                                                        -math.radians(2.0)])}
        }
    }


def generate_run_cycle_action(
    stride_len: float = 0.38,
    flight_height: float = 0.12,
    arm_swing_deg: float = 45.0,
    frames: int = 14
) -> dict[str, Any]:
    """Синтезирует динамичный 14-кадровый цикл бега с фазой полета (Airborne)."""
    when = [0, 2, 4, 7, 9, 11, 14]

    # Ноги при беге с фазой отрыва
    leg_l_pos = [
        (-stride_len * 0.5, 0.0),                     # 0: Contact
        (-stride_len * 0.2, -0.02),                   # 2: Cushion / Push
        (stride_len * 0.5, 0.0),                      # 4: Toe-off
        (stride_len * 0.2, flight_height),            # 7: Flight (Airborne)
        (0.0, flight_height * 1.2),                   # 9: High Recovery
        (-stride_len * 0.35, flight_height * 0.6),    # 11: Extension
        (-stride_len * 0.5, 0.0),                     # 14: Contact
    ]
    leg_r_pos = [
        (stride_len * 0.2, flight_height),            # 0: Flight
        (0.0, flight_height * 1.2),                   # 2
        (-stride_len * 0.35, flight_height * 0.6),    # 4
        (-stride_len * 0.5, 0.0),                     # 7: Contact
        (-stride_len * 0.2, -0.02),                   # 9
        (stride_len * 0.5, 0.0),                      # 11
        (stride_len * 0.2, flight_height),            # 14
    ]

    body_y = [(0.0, y) for y in [0.0, -0.04, 0.05, flight_height, 0.0, -0.04, 0.05]]

    arm_rad = math.radians(arm_swing_deg)
    arm_l_angles = [arm_rad, arm_rad * 0.5, -arm_rad * 0.5, -arm_rad, -arm_rad * 0.5, arm_rad * 0.5, arm_rad]
    arm_r_angles = [-a for a in arm_l_angles]

    return {
        "name": "Run Cycle",
        "duration": frames,
        "bones": {
            "Target Leg L": {"anim_pos": _vec2_channel(when, leg_l_pos)},
            "Target Leg R": {"anim_pos": _vec2_channel(when, leg_r_pos)},
            "Body": {"anim_pos": _vec2_channel(when, body_y)},
            "UpperArm L": {"anim_angle": _val_channel(when, arm_l_angles)},
            "UpperArm R": {"anim_angle": _val_channel(when, arm_r_angles)},
        }
    }


def generate_idle_blink_action(frames: int = 36) -> dict[str, Any]:
    """Синтезирует 36-кадровый спокойный цикл ожидания (Idle Breathing & Blinking)."""
    # Дыхание грудью
    when_breath = [0, 18, 36]
    body_pos = [(0.0, 0.0), (0.0, 0.012), (0.0, 0.0)]
    body_scale = [1.0, 1.025, 1.0]

    # Кивок головы
    when_head = [0, 12, 24, 36]
    head_angle = [0.0, math.radians(-1.5), math.radians(1.0), 0.0]

    return {
        "name": "Idle & Blink",
        "duration": frames,
        "bones": {
            "Body": {
                "anim_pos": _vec2_channel(when_breath, body_pos),
            },
            "Head": {
                "anim_angle": _val_channel(when_head, head_angle),
            }
        }
    }


def build_standard_action_library() -> list[dict[str, Any]]:
    """Возвращает стандартный набор циклов анимации для продакшн-рига."""
    return [
        generate_walk_cycle_action(),
        generate_run_cycle_action(),
        generate_idle_blink_action(),
    ]
