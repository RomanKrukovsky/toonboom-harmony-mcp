"""
camera.py — хореограф камеры (№37) и раздатчик мультиплана (№38).

Камера в Harmony — это пег: те же кривые position/scale, что у персонажей.
Значит хореография камеры = spacing_synthesize по трём колонкам, и весь
готовый аппарат (профили, калибровка, тесты) переиспользуется.

Здесь два уровня:

  CameraMove   — «медленный наезд, 36 кадров, изинг к концу» как данные.
                 shot_plan() собирает список движений в ключи по колонкам.

  layout_multiplane() — раскладка слоёв по Z из описания пространства.
                 Параллакс в Harmony вычисляется камерой автоматически —
                 достаточно правильно расставить Z. Вся хитрость в том,
                 ЧТО значит «правильно», и она записана в комментарии
                 к функции.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Literal, Sequence

from columns import Key, sample_profile, Profile


# ---------------------------------------------------------------------------
# Движения камеры
# ---------------------------------------------------------------------------

MoveKind = Literal["push_in", "pull_out", "pan", "tilt", "hold"]


@dataclass(frozen=True)
class CameraMove:
    """
    Одно движение камеры человеческими словами.

    kind:
      push_in  — наезд   (scale растёт; amount = во сколько раз, 1.2 = +20%)
      pull_out — отъезд  (scale падает)
      pan      — панорама по X (amount = единицы сцены)
      tilt     — по Y
      hold     — стоим (amount игнорируется)

    profile — тот же словарь, что у spacing_synthesize: «медленный наезд» =
    push_in с ease_in_out, «удар» = pan с heavy_impact.
    """
    kind: MoveKind
    frames: int
    amount: float = 0.0
    profile: Profile = "ease_in_out"


@dataclass
class CameraState:
    x: float = 0.0
    y: float = 0.0
    scale: float = 1.0


@dataclass
class CameraPlan:
    """Ключи по трём колонкам пега камеры + защита решения словами."""
    x_keys: list[Key] = field(default_factory=list)
    y_keys: list[Key] = field(default_factory=list)
    scale_keys: list[Key] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    end_state: CameraState = field(default_factory=CameraState)
    end_frame: int = 1


def shot_plan(moves: Sequence[CameraMove], start_frame: int = 1,
              start: CameraState | None = None) -> CameraPlan:
    """
    Последовательность движений -> ключи. Правила:

    - движения СТЫКУЮТСЯ: каждое стартует из конечного состояния прошлого.
      Камера не телепортируется — это главное отличие от наивной генерации
      «каждое движение с нуля»;
    - hold не ставит лишних ключей: два ключа с одним значением на кривой
      уже дают полку, третий посередине — мусор для ревью дифа;
    - dense-ключи (кадр за кадром) — потому что профили вроде
      anticipation_overshoot двумя безье-ключами не выражаются, а
      конвенция хендлов может быть неоткалибрована (см. COLUMNS.md #16).
      Для камеры плотность дешёвая: колонок всего три.
    """
    st = CameraState(**vars(start)) if start else CameraState()
    plan = CameraPlan()
    f = start_frame

    def put(keys: list[Key], frame: float, value: float) -> None:
        if keys and keys[-1].frame == frame:
            keys[-1] = Key(frame=frame, value=value)
        else:
            keys.append(Key(frame=frame, value=value))

    # стартовые ключи: камера явно зафиксирована в начале
    put(plan.x_keys, f, st.x)
    put(plan.y_keys, f, st.y)
    put(plan.scale_keys, f, st.scale)

    for mv in moves:
        if mv.frames < 1:
            raise ValueError(f"move {mv.kind} has {mv.frames} frames")
        f_end = f + mv.frames

        if mv.kind == "hold":
            put(plan.x_keys, f_end, st.x)
            put(plan.y_keys, f_end, st.y)
            put(plan.scale_keys, f_end, st.scale)
            plan.notes.append(f"f{f}-{f_end}: hold")
            f = f_end
            continue

        n = mv.frames + 1
        s = sample_profile(mv.profile, n)

        if mv.kind in ("push_in", "pull_out"):
            target = st.scale * (mv.amount if mv.kind == "push_in" else 1.0 / mv.amount)
            if mv.amount <= 0:
                raise ValueError("zoom amount must be positive")
            # зум — геометрический: интерполируем в лог-пространстве,
            # иначе «равномерный наезд» ускоряется к концу на глаз
            lo, hi = math.log(st.scale), math.log(target)
            for i in range(n):
                put(plan.scale_keys, f + i, math.exp(lo + (hi - lo) * s[i]))
            # x/y стоят: ключи по краям
            put(plan.x_keys, f_end, st.x)
            put(plan.y_keys, f_end, st.y)
            st.scale = target
            plan.notes.append(
                f"f{f}-{f_end}: {mv.kind} x{mv.amount} ({mv.profile}); "
                f"log-space so perceived zoom speed is constant")
        elif mv.kind in ("pan", "tilt"):
            keys = plan.x_keys if mv.kind == "pan" else plan.y_keys
            base = st.x if mv.kind == "pan" else st.y
            for i in range(n):
                put(keys, f + i, base + mv.amount * s[i])
            if mv.kind == "pan":
                st.x = base + mv.amount
                put(plan.y_keys, f_end, st.y)
            else:
                st.y = base + mv.amount
                put(plan.x_keys, f_end, st.x)
            put(plan.scale_keys, f_end, st.scale)
            plan.notes.append(f"f{f}-{f_end}: {mv.kind} {mv.amount:+} ({mv.profile})")
        f = f_end

    plan.end_state = st
    plan.end_frame = f
    return plan


# ---------------------------------------------------------------------------
# Мультиплан
# ---------------------------------------------------------------------------

DepthWord = Literal["far_bg", "bg", "midground", "action", "fg", "extreme_fg"]

# Z в единицах Harmony (камера смотрит в -Z... на самом деле в Harmony
# положительный Z уводит ОТ камеры для задников; знак настраивается
# параметром сцены, поэтому наружу отдаём abstract depth, а знак — параметр).
DEPTH_UNITS: dict[str, float] = {
    "far_bg": 12.0,     # небо, горы
    "bg": 6.0,          # дальние дома
    "midground": 2.5,   # улица за спиной
    "action": 0.0,      # план действия: Z=0, персонажи живут тут
    "fg": -1.5,         # стол перед персонажем
    "extreme_fg": -3.0, # ветка, лезущая в кадр
}


@dataclass(frozen=True)
class LayerDepth:
    node: str            # путь пега слоя
    depth: DepthWord
    z: float             # вычисленный Z
    scale_comp: float    # компенсация масштаба (см. layout_multiplane)


def layout_multiplane(layers: Sequence[tuple[str, DepthWord]],
                      depth_scale: float = 1.0,
                      z_sign: float = 1.0,
                      compensate_scale: bool = True,
                      camera_distance: float = 12.0) -> list[LayerDepth]:
    """
    Слои по художественному описанию -> Z-глубины.

    compensate_scale — ключевой флаг. Когда слой уезжает по Z, он
    уменьшается в кадре (перспектива). Художник рисовал задник в размере,
    в котором тот должен БЫТЬ ВИДЕН. Поэтому одновременно с Z ставится
    обратный масштаб: слой на своём месте выглядит как нарисован, а
    параллакс от движения камеры остаётся. Это стандартный приём
    постановки мультиплана; без него после раздачи глубин макет
    «схлопывается» и лейаут-художник вручную возвращает размеры.

    scale_comp = (camera_distance + z) / camera_distance — линейная
    аппроксимация перспективной проекции для умеренных глубин.
    """
    out: list[LayerDepth] = []
    for node, word in layers:
        if word not in DEPTH_UNITS:
            raise KeyError(f"unknown depth word {word!r}; use {list(DEPTH_UNITS)}")
        z = DEPTH_UNITS[word] * depth_scale * z_sign
        comp = 1.0
        if compensate_scale:
            comp = (camera_distance + DEPTH_UNITS[word] * depth_scale) / camera_distance
            if comp <= 0:
                raise ValueError(
                    f"layer {node}: depth {word} puts it behind the camera "
                    f"(camera_distance={camera_distance})")
        out.append(LayerDepth(node, word, z, comp))
    return out


def multiplane_edits(depths: Sequence[LayerDepth]) -> list[dict]:
    """LayerDepth -> правки для node_edit (set_attr по пегам слоёв)."""
    edits: list[dict] = []
    for d in depths:
        edits.append({"op": "set_attr", "path": d.node,
                      "attr": "POSITION.Z", "value": d.z})
        if abs(d.scale_comp - 1.0) > 1e-9:
            edits.append({"op": "set_attr", "path": d.node,
                          "attr": "SCALE.X", "value": d.scale_comp})
            edits.append({"op": "set_attr", "path": d.node,
                          "attr": "SCALE.Y", "value": d.scale_comp})
    return edits
