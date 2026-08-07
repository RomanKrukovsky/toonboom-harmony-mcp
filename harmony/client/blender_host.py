"""
blender_host.py — Blender как host для 2D cutout-анимации вместо Harmony.

ПОЧЕМУ. Harmony Premium требует лицензию FlexNet, её нет
(`/usr/local/flexlm/licenses/license.dat` отсутствует, ошибка -1,359).
Ни GUI, ни `-batch -script` не работают. Кодом это не лечится.

Blender 5.1.1 установлен, headless Python работает, лицензия не нужна.
Он умеет всё, что нужно cutout-конвейеру:
  - плоские полигоны с материалами (части персонажа);
  - иерархию parent-child с пивотами (FK-цепочки рига);
  - ключи на loc/rot/scale с явными интерполяциями (тайминг);
  - ортографическую камеру (2D-плоскость);
  - Grease Pencil (реальные рисованные линии — путь к настоящему стилю);
  - рендер в PNG/видео без GUI.

ЧТО ЭТОТ МОДУЛЬ НЕ ДЕЛАЕТ. Он не заменяет `renderer.py` (стенд) и не
рисует. Он транслирует УЖЕ ПОСЧИТАННЫЕ каналы (`columns.Key`) и
описание рига (`rigging.RigSpec`) в .blend-сцену. Вся семантика ремесла
— изинги, overlap, сквош, физлинтер — остаётся в движке снаружи и не
дублируется.

АРХИТЕКТУРА. Тот же принцип, что с мостом Harmony: код внутри хоста
максимально тупой, вся логика снаружи.

    движок (columns/craft/rigging)  ->  scene spec (JSON)
                                          |
                            blender -b --python build_scene.py
                                          |
                                    .blend + PNG-секвенция

JSON вместо прямых вызовов bpy — потому что bpy существует только внутри
Blender. Снаружи мы его не импортируем (это и невозможно), а собираем
описание сцены и отдаём его процессу.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Literal, Sequence

from columns import Key

BLENDER = Path("/Applications/Blender.app/Contents/MacOS/Blender")

Interp = Literal["LINEAR", "BEZIER", "CONSTANT"]


# ---------------------------------------------------------------------------
# Описание сцены (сериализуемое)
# ---------------------------------------------------------------------------

@dataclass
class BPart:
    """Плоская часть персонажа: полигон в XZ-плоскости (Y — глубина слоя).

    points  — контур в локальных координатах, единицы = метры Blender;
    pivot    — точка вращения в координатах РОДИТЕЛЯ (та же конвенция,
               что в rigging.py, чтобы риги переносились без пересчёта);
    depth    — Y-смещение: порядок отрисовки в 2D. Меньше Y = ближе к
               камере, если камера смотрит вдоль +Y.
    """
    name: str
    parent: str | None
    pivot: tuple[float, float]
    points: list[tuple[float, float]]
    color: tuple[float, float, float]
    depth: float = 0.0
    outline: bool = True


@dataclass
class BChannel:
    """Канал анимации: объект + свойство + ключи."""
    part: str
    prop: Literal["rot", "x", "y", "sx", "sy"]
    keys: list[tuple[float, float]]          # (frame, value)
    interp: Interp = "LINEAR"


@dataclass
class BSceneSpec:
    name: str
    fps: int
    frame_start: int
    frame_end: int
    resolution: tuple[int, int]
    parts: list[BPart]
    channels: list[BChannel]
    bg_color: tuple[float, float, float] = (0.17, 0.20, 0.26)
    camera_ortho_scale: float = 6.0
    camera_loc: tuple[float, float] = (0.0, 1.6)     # x, z (y фиксирован)
    line_width: float = 0.012
    # Звук В СЦЕНЕ (Blender VSE), а не только в финальном сведении:
    # без него нельзя проверить липсинк до рендера.
    audio_tracks: list[dict] = field(default_factory=list)
    # Части-рисунки (PNG художника с альфой) — см. artwork.py.
    # Полигонные `parts` и рисованные `image_parts` сосуществуют:
    # фон может быть фигурами, персонаж — рисунком.
    image_parts: list[dict] = field(default_factory=list)
    # Подмена рисунков: {name, members:[part], timeline:[{frame,drawing}],
    # default}. Рот/глаза/кисть — набор вариантов, видим один (идея №24).
    swap_groups: list[dict] = field(default_factory=list)

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=1)


# ---------------------------------------------------------------------------
# Трансляция из движка
# ---------------------------------------------------------------------------

def keys_to_pairs(keys: Sequence[Key]) -> list[tuple[float, float]]:
    """Key -> (frame, value). Плотные ключи движка ложатся на LINEAR:
    вся семантика изинга уже в значениях, и Blender не должен её
    «улучшать» своими безье — иначе профиль поедет."""
    return [(float(k.frame), float(k.value)) for k in keys]


def channels_from_engine(engine_channels: dict[str, list[Key]]) -> list[BChannel]:
    """Каналы движка ("part.prop") -> BChannel. Имена свойств совпадают
    с renderer.py, так что стенд и Blender едят одно и то же."""
    out: list[BChannel] = []
    for full, keys in engine_channels.items():
        if "." not in full:
            raise ValueError(f"channel {full!r} must be 'part.prop'")
        part, prop = full.rsplit(".", 1)
        if prop not in ("rot", "x", "y", "sx", "sy"):
            raise ValueError(f"unsupported prop {prop!r} in {full!r}")
        out.append(BChannel(part=part, prop=prop,  # type: ignore[arg-type]
                            keys=keys_to_pairs(keys)))
    return out


# ---------------------------------------------------------------------------
# Запуск
# ---------------------------------------------------------------------------

def blender_available() -> tuple[bool, str]:
    """Проверка ДО работы, а не после. Возвращает (ок, сообщение)."""
    if not BLENDER.exists():
        return False, f"Blender not found at {BLENDER}"
    try:
        r = subprocess.run([str(BLENDER), "--version"], capture_output=True,
                           text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired) as e:
        return False, f"Blender failed to start: {e}"
    first = (r.stdout or "").splitlines()[:1]
    return (r.returncode == 0), (first[0] if first else "no version output")


def build_scene(spec: BSceneSpec, out_dir: Path,
                builder: Path | None = None,
                render: bool = True,
                frames: tuple[int, int] | None = None,
                timeout_s: float = 900.0) -> dict:
    """
    Собирает .blend по спеке и (опционально) рендерит PNG-секвенцию.

    Возвращает отчёт: код возврата, путь к .blend, число кадров,
    хвост лога. Ошибки Blender НЕ проглатываются: если он упал,
    об этом видно из отчёта, а не по отсутствию файлов.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    spec_path = out_dir / "scene_spec.json"
    spec_path.write_text(spec.to_json(), encoding="utf-8")

    builder = builder or (Path(__file__).parent / "blender" / "build_scene.py")
    if not builder.exists():
        raise FileNotFoundError(f"builder script missing: {builder}")

    args = [str(BLENDER), "-b", "--python", str(builder), "--",
            "--spec", str(spec_path), "--out", str(out_dir)]
    if render:
        args.append("--render")
    if frames:
        args += ["--frames", str(frames[0]), str(frames[1])]

    r = subprocess.run(args, capture_output=True, text=True, timeout=timeout_s)
    pngs = sorted(out_dir.glob("f*.png"))
    return {
        "returncode": r.returncode,
        "blend": str(out_dir / f"{spec.name}.blend"),
        "frames_rendered": len(pngs),
        "log_tail": (r.stdout or "")[-1500:],
        "stderr_tail": (r.stderr or "")[-800:],
    }


def build_scenes(jobs: list[tuple[BSceneSpec, Path, tuple[int, int] | None]],
                 builder: Path | None = None, render: bool = True,
                 timeout_s: float = 3600.0) -> list[dict]:
    """
    Собрать НЕСКОЛЬКО сцен за один запуск Blender.

    Ради чего: пустой запуск Blender стоит ~0.67 с. На 12 шотов это 8 секунд из
    15 — больше половины прогона. Батч на уровне питона эти секунды не убирал
    (проверено: стало медленнее), потому что каждая сборка всё равно стартовала
    Blender заново. Здесь процесс запускается один раз на всю группу.

    Отчёты возвращаются по шоту, чтобы провал одного было видно отдельно.
    """
    if not jobs:
        return []
    builder = builder or (Path(__file__).parent / "blender" / "build_scene.py")
    if not builder.exists():
        raise FileNotFoundError(f"builder script missing: {builder}")

    manifest: list[dict] = []
    for spec, out_dir, frames in jobs:
        out_dir.mkdir(parents=True, exist_ok=True)
        sp = out_dir / "scene_spec.json"
        sp.write_text(spec.to_json(), encoding="utf-8")
        manifest.append({"spec": str(sp), "out": str(out_dir),
                         "frames": list(frames) if frames else None,
                         "name": spec.name})

    list_path = jobs[0][1].parent / f"batch_{os.getpid()}_{id(jobs)}.json"
    list_path.write_text(json.dumps(manifest), encoding="utf-8")

    args = [str(BLENDER), "-b", "--python", str(builder), "--",
            "--specs", str(list_path), "--out", str(jobs[0][1])]
    if render:
        args.append("--render")
    r = subprocess.run(args, capture_output=True, text=True, timeout=timeout_s)
    log = (r.stdout or "")
    list_path.unlink(missing_ok=True)

    out = []
    for spec, out_dir, _ in jobs:
        pngs = sorted(out_dir.glob("f*.png"))
        failed = f"SHOT_FAILED {spec.name} " in log
        out.append({
            "name": spec.name,
            "returncode": 1 if (failed or not pngs) else 0,
            "blend": str(out_dir / f"{spec.name}.blend"),
            "frames_rendered": len(pngs),
            "log_tail": log[-800:],
            "stderr_tail": (r.stderr or "")[-400:],
        })
    return out


def encode(out_dir: Path, mp4: Path, fps: int) -> Path:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg not on PATH")
    subprocess.run([
        "ffmpeg", "-y", "-framerate", str(fps),
        "-i", str(out_dir / "f%04d.png"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", str(mp4),
    ], check=True, capture_output=True)
    return mp4
