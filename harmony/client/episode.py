"""
episode.py — очередь эпизода: от списка шотов до мастер-файла.

ЧЕГО НЕ БЫЛО. Конвейер умел считать ОДИН шот одной командой в одном процессе.
Серия — это ≈314 шотов и ≈31 680 кадров; в один поток это ~3 часа чистого счёта,
и при первом же падении всё начиналось заново. Ни очереди, ни возобновления, ни
сборки серии не существовало (проверено `ls`, ноль файлов).

ЧТО ЗДЕСЬ:
  - `Episode` — описание серии: список шотов, fps, разрешение, выход;
  - `preflight` — проверка окружения ДО начала счёта;
  - `run_episode` — параллельный счёт по ядрам с журналом и возобновлением;
  - `assemble` — склейка шотов в один мастер со звуком.

ТРИ РЕШЕНИЯ, КОТОРЫЕ ОПРЕДЕЛЯЮТ ВСЁ ОСТАЛЬНОЕ

**Единица возобновления — шот, а не кадр.** Журнал пишется после КАЖДОГО
завершённого шота, атомарной допиской строки в JSONL. Возобновление читает журнал
и считает только отсутствующее. Если бы единицей был кадр, журнал стал бы
горячей точкой на 31 680 записей; если бы единицей была серия, падение на 300-м
шоте стоило бы всей ночи.

**Процессы, а не потоки.** Blender — отдельный процесс на шот, GIL тут ни при
чём: параллелизм даёт сам факт запуска N процессов. Потому пул процессов, а
`max_workers` по умолчанию `cores-2` — два ядра остаются системе и ffmpeg, иначе
машина уходит в свап и общее время растёт.

**Сбой шота не отменяет серию.** Один битый рисунок не должен стоить ночи: шот
помечается провалившимся, остальные доходят, отчёт называет виновника. Обратное
поведение (падать на первом же) для ночного прогона бесполезно.
"""

from __future__ import annotations

import json
import math
import os
import shutil
import subprocess
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable, Iterable, Sequence

JOURNAL = "journal.jsonl"
MASTER = "master.mp4"
# Промежуточный сегмент: .mov с PCM, чтобы aac не сдвигал звук на склейке
# (раунд 16). Имя в одном месте: смоук искал "segment.mp4" и после смены
# расширения молча получал None вместо числа кадров.
SEGMENT = "segment.mov"
LOCK = "run.lock"


# ---------------------------------------------------------------------------
# Описание серии
# ---------------------------------------------------------------------------

@dataclass
class ShotSpec:
    """Один шот серии. `partsJson` и `audio` — пути; `channels` — каналы движка."""
    name: str
    parts_json: str
    frames: int
    fps: int = 24
    resolution: tuple[int, int] = (1280, 720)
    channels: dict[str, list[tuple[float, float]]] = field(default_factory=dict)
    audio: str | None = None
    lipsync: dict | None = None
    camera_ortho_scale: float = 2.0
    camera_loc: tuple[float, float] = (0.0, 0.3)
    bg_color: tuple[float, float, float] = (0.07, 0.08, 0.10)

    @property
    def seconds(self) -> float:
        return self.frames / self.fps

    def fingerprint(self) -> str:
        """
        Отпечаток ОПИСАНИЯ шота: всё, что влияет на пиксели.

        Зачем: готовность шота проверялась по числу кадров и записи в журнале.
        Правка тайминга без изменения длины — самая частая правка на монтаже —
        проходила незамеченной, и серия собиралась по вчерашней версии без
        единой ошибки.

        Пути к рисункам и звуку входят как строки, а не как содержимое: читать
        все PNG на каждый запуск дороже, чем пересчитать шот. Если художник
        перерисовал файл, не меняя имени, это ловится не здесь, а флагом
        --force на шот.
        """
        import hashlib
        payload = json.dumps({
            "frames": self.frames, "fps": self.fps,
            "resolution": list(self.resolution),
            "parts": self.parts_json,
            "channels": {k: [list(x) for x in v]
                         for k, v in sorted(self.channels.items())},
            "audio": self.audio, "lipsync": self.lipsync,
            "camera": [self.camera_ortho_scale, list(self.camera_loc)],
            "bg": list(self.bg_color),
        }, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(payload.encode()).hexdigest()[:16]


@dataclass
class Episode:
    name: str
    shots: list[ShotSpec]
    out_dir: Path

    @property
    def total_frames(self) -> int:
        return sum(s.frames for s in self.shots)

    @property
    def seconds(self) -> float:
        return sum(s.seconds for s in self.shots)

    @staticmethod
    def load(path: str | Path) -> "Episode":
        p = Path(path)
        d = json.loads(p.read_text(encoding="utf-8"))
        shots = []
        for s in d["shots"]:
            shots.append(ShotSpec(
                name=s["name"], parts_json=s["partsJson"], frames=int(s["frames"]),
                fps=int(s.get("fps", 24)),
                resolution=tuple(s.get("resolution", (1280, 720))),   # type: ignore[arg-type]
                channels={k: [tuple(x) for x in v]                     # type: ignore[misc]
                          for k, v in (s.get("channels") or {}).items()},
                audio=s.get("audio"), lipsync=s.get("lipsync"),
                camera_ortho_scale=float(s.get("cameraOrthoScale", 2.0)),
                camera_loc=tuple(s.get("cameraLoc", (0.0, 0.3))),      # type: ignore[arg-type]
                bg_color=tuple(s.get("bgColor", (0.07, 0.08, 0.10))),  # type: ignore[arg-type]
            ))
        return Episode(d.get("name", p.stem), shots,
                       Path(d.get("outDir") or (p.parent / "out")))


# ---------------------------------------------------------------------------
# Preflight: ловить беду ДО начала счёта
# ---------------------------------------------------------------------------

@dataclass
class PreflightResult:
    ok: bool
    problems: list[dict]
    info: dict

    def as_dict(self) -> dict:
        return {"ok": self.ok, "problems": self.problems, "info": self.info}


def preflight(ep: Episode, need_free_gb: float | None = None) -> PreflightResult:
    """
    Всё, что может убить ночной прогон, проверяется здесь — за секунды, до того
    как занять машину на часы.

    Оценка места считается из объёма серии, а не берётся константой: 31 680
    кадров PNG при 1280x720 — это десятки гигабайт, и «кончилось место на 280-м
    шоте» стоит всей ночи.
    """
    problems: list[dict] = []
    info: dict = {}

    from blender_host import BLENDER, blender_available
    ok, msg = blender_available()
    info["blender"] = msg
    if not ok:
        problems.append({"code": "NO_BLENDER", "message": msg,
                         "remedy": f"Install Blender or set BLENDER_BIN (looked at {BLENDER})."})

    # ОДНА проблема на все отсутствующие утилиты, а не по одной на каждую.
    # Дефект, найденный раундом 2: preflight выдавал NO_FFMPEG дважды (ffmpeg и
    # ffprobe идут в одном пакете), и оператор не мог понять, две у него беды
    # или одна. Различение бед — весь смысл кода ошибки; дубль его уничтожает.
    absent = [t for t in ("ffmpeg", "ffprobe") if shutil.which(t) is None]
    if absent:
        problems.append({
            "code": "NO_FFMPEG",
            "message": f"not on PATH: {', '.join(absent)}",
            "remedy": "Install ffmpeg (it ships ffprobe too); without it shots "
                      "cannot be assembled into a master."})

    if not ep.shots:
        problems.append({"code": "EMPTY_EPISODE", "message": "the episode has no shots",
                         "remedy": "Add shots to the episode JSON."})

    seen: set[str] = set()
    for s in ep.shots:
        if s.name in seen:
            problems.append({"code": "DUPLICATE_SHOT", "message": f"shot {s.name!r} appears twice",
                             "remedy": "Shot names address directories; they must be unique."})
        seen.add(s.name)
        if not Path(s.parts_json).exists():
            problems.append({"code": "NO_PARTS", "message": f"{s.name}: parts.json not found: {s.parts_json}",
                             "remedy": "Fix the path in the episode JSON."})
        if s.audio and not Path(s.audio).exists():
            problems.append({"code": "NO_AUDIO", "message": f"{s.name}: audio not found: {s.audio}",
                             "remedy": "Fix the path or drop the audio field."})
        if s.frames < 1:
            # remedy обязателен у КАЖДОЙ проблемы. Раунд 6 нашёл единственную
            # без него: оператор видел «sc001: frames=0» и не знал, где править.
            # «Почти все ошибки объясняют себя» для человека в три ночи означает
            # «однажды не объяснит».
            problems.append({
                "code": "BAD_FRAMES",
                "message": f"{s.name}: frames={s.frames}, must be at least 1",
                "remedy": f"Set a positive \"frames\" for shot {s.name} in the "
                          f"episode JSON — it is the shot length in frames "
                          f"(4 seconds at 24 fps = 96)."})

    # Формат серии: шоты РАЗНОГО размера склеиваются в один контейнер, и concat
    # с `-c copy` менять размер не умеет — он берёт заголовок первого сегмента и
    # дописывает остальные как есть. Раунд 16: шот 320x180 внутри мастера
    # 320x240 отдавался ffmpeg-ом как 320x180, то есть кадры разного размера в
    # одном файле, а что с ними сделает плеер — не наше решение. Проверки это
    # пропускали: кадров ровно столько, сколько нужно, длина сходится.
    #
    # Ловится ДО счёта, потому что самая вероятная причина — опечатка в JSON
    # ([1920, 1800] вместо [1920, 1080]), и узнать о ней через час рендера
    # дороже, чем сразу. Разный fps при этом законен (шот на двойках), а разный
    # размер — нет.
    sizes = {tuple(s.resolution) for s in ep.shots}
    if len(sizes) > 1:
        by_size: dict[tuple, list[str]] = {}
        for sh in ep.shots:
            by_size.setdefault(tuple(sh.resolution), []).append(sh.name)
        main_size = max(by_size, key=lambda k: len(by_size[k]))
        odd = [(k, v) for k, v in by_size.items() if k != main_size]
        listing = "; ".join(
            f"{w}x{h}: {', '.join(v[:3])}{'...' if len(v) > 3 else ''}"
            for (w, h), v in odd)
        problems.append({
            "code": "MIXED_RESOLUTION",
            "message": (f"shots have different frame sizes — most are "
                        f"{main_size[0]}x{main_size[1]}, but {listing}"),
            "remedy": ('Set the same "resolution" for every shot in the episode '
                       'JSON. The master is one container: a shot of a different '
                       'size is joined without rescaling, and how a player shows '
                       'it is not up to us. If an inset of another size is '
                       'intended, render it at the episode size with the inset '
                       'composed inside the frame.')})

    # Место: ~120 КБ на кадр PNG при 720p — эмпирика с этого конвейера.
    est_gb = ep.total_frames * 120_000 / 1e9
    info["estimated_gb"] = round(est_gb, 2)
    info["total_frames"] = ep.total_frames
    info["shots"] = len(ep.shots)
    info["seconds"] = round(ep.seconds, 1)
    try:
        ep.out_dir.mkdir(parents=True, exist_ok=True)
        free_gb = shutil.disk_usage(ep.out_dir).free / 1e9
        info["free_gb"] = round(free_gb, 2)
        want = need_free_gb if need_free_gb is not None else est_gb * 1.3
        if free_gb < want:
            problems.append({
                "code": "NO_SPACE",
                "message": f"needs ~{want:.1f} GB, only {free_gb:.1f} GB free",
                "remedy": "Free space or point outDir at a bigger volume. Running out of disk "
                          "mid-episode wastes the whole night."})
    except OSError as e:
        problems.append({"code": "BAD_OUTDIR", "message": f"cannot use {ep.out_dir}: {e}"})

    return PreflightResult(not problems, problems, info)


# ---------------------------------------------------------------------------
# Журнал: единица возобновления — шот
# ---------------------------------------------------------------------------

def journal_path(ep: Episode) -> Path:
    return ep.out_dir / JOURNAL


_RENDERER_ID: str | None = None


def _group_failures(failed: list[dict]) -> dict:
    """Упавшие шоты по ПРИЧИНЕ: одна беда обычно валит много шотов."""
    out: dict = {}
    for f in failed:
        out.setdefault((f.get("code") or "?", f.get("message") or ""), []).append(f["name"])
    return out


def _renderer_id() -> str:
    """
    Чем рендерилось. Нужно именно на возобновлении: между падением и досчётом
    Blender мог обновиться, `BLENDER_BIN` мог смениться, машина могла быть
    другой. Отпечаток шота стережёт изменения ОПИСАНИЯ и о версии рендерера не
    знает — тот же шот, посчитанный 5.1 и 5.2, даёт один отпечаток и считается
    готовым. Если серия разъехалась по виду на границе шотов, ответ здесь.

    Спрашивается один раз на процесс: `--version` стоит около секунды, а шотов
    в серии триста.
    """
    global _RENDERER_ID
    if _RENDERER_ID is None:
        from blender_host import BLENDER
        exe = os.environ.get("BLENDER_BIN", str(BLENDER))
        try:
            out = subprocess.run([exe, "--version"], capture_output=True,
                                 text=True, timeout=30).stdout
            _RENDERER_ID = (out.strip().splitlines() or ["?"])[0].strip()
        except Exception:
            _RENDERER_ID = f"unknown ({Path(exe).name})"
    return _RENDERER_ID


def read_journal(ep: Episode) -> dict[str, dict]:
    """Готовые шоты из журнала. Битая последняя строка (падение посреди записи)
    отбрасывается: она означает шот, который не дописался, то есть не готов."""
    out: dict[str, dict] = {}
    p = journal_path(ep)
    if not p.is_file():
        return out
    for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue          # обрубок — считаем шот незавершённым
        if rec.get("name"):
            out[rec["name"]] = rec
    return out


def append_journal(ep: Episode, rec: dict) -> None:
    """Одна строка = один завершённый шот. Дописка + flush + fsync: после
    возврата из этой функции запись переживёт kill -9."""
    p = journal_path(ep)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        f.flush()
        os.fsync(f.fileno())


def shot_is_done(ep: Episode, s: ShotSpec, rec: dict | None) -> bool:
    """
    Готовность = журнал + кадры на диске + СОВПАДЕНИЕ ОПИСАНИЯ.

    Три условия, каждое из-за конкретной ловушки:

    - запись в журнале со статусом ok — иначе пересчитываем;
    - кадры реально лежат на диске: журнал может утверждать «готово», а кадры
      быть удалены (чистка, полный диск, ручное вмешательство). Доверять записи
      без проверки — собрать мастер с дырой и не заметить;
    - отпечаток описания совпадает: правка тайминга без изменения длины иначе
      проходит молча, и серия собирается по вчерашней версии.

    Старые журналы без отпечатка считаются совпадающими: иначе первый запуск
    после обновления пересчитал бы всю серию, а это три часа за то, что мы
    добавили поле.
    """
    if not rec or rec.get("status") != "ok":
        return False
    d = ep.out_dir / s.name
    if len(list(d.glob("f*.png"))) < s.frames:
        return False
    stored = rec.get("fingerprint")
    return stored is None or stored == s.fingerprint()


# ---------------------------------------------------------------------------
# Замок: один прогон на серию
# ---------------------------------------------------------------------------

class AlreadyRunning(RuntimeError):
    """Другой прогон уже держит эту серию."""


class RunLock:
    """
    Файл-замок на каталоге серии.

    Зачем: два прогона на одной серии не падают, а ТИХО удваивают работу.
    Замер раунда 8 — 6 дублей в журнале из 12 записей, кадры при этом целы.
    Именно целость кадров делает дефект опасным: ошибки нет, оператор ничего
    не замечает, а журнал перестаёт говорить правду о готовности, ядра делятся
    на два процесса и ночь растягивается вдвое.

    Проверка живости — по PID, а не по наличию файла: после kill -9 замок
    остаётся на диске, и «есть файл» означало бы, что серию нельзя больше
    запустить никогда. Мёртвый замок снимается сам и об этом сообщается.
    """

    def __init__(self, out_dir: Path):
        self.path = out_dir / LOCK
        self.acquired = False

    def _holder(self) -> dict | None:
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None

    @staticmethod
    def _alive(pid: int) -> bool:
        try:
            os.kill(pid, 0)          # сигнал 0 не убивает, только проверяет
        except ProcessLookupError:
            return False
        except PermissionError:
            return True              # чужой процесс, но живой
        return True

    def acquire(self, on_event: Callable[[dict], None] | None = None) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        while True:
            try:
                # O_EXCL: создание файла и проверка его отсутствия — одна
                # атомарная операция. Проверить-потом-создать проиграло бы
                # гонку ровно в том случае, ради которого замок и нужен.
                fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
            except FileExistsError:
                held = self._holder()
                pid = (held or {}).get("pid")
                if pid and self._alive(int(pid)):
                    raise AlreadyRunning(
                        f"another run is already working on this episode "
                        f"(pid {pid}, started {held.get('started')}). "
                        f"Wait for it, or stop that process. If you are sure it "
                        f"is dead, delete {self.path}")
                # Замок мёртв: снимаем и сообщаем, чтобы это не выглядело магией.
                if on_event:
                    on_event({"event": "stale_lock", "pid": pid,
                              "message": f"removed a stale lock from pid {pid}"})
                self.path.unlink(missing_ok=True)
                continue
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump({"pid": os.getpid(), "started": time.strftime("%F %T")}, f)
            self.acquired = True
            return

    def release(self) -> None:
        if self.acquired:
            self.path.unlink(missing_ok=True)
            self.acquired = False

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.release()


# ---------------------------------------------------------------------------
# Счёт одного шота (исполняется в рабочем процессе)
# ---------------------------------------------------------------------------

def render_one_shot(payload: dict) -> dict:
    """
    Считает один шот. Выполняется в ОТДЕЛЬНОМ процессе, поэтому принимает и
    возвращает только простые типы: всё, что нельзя запиклить, здесь ломается.

    Исключения не пробрасываются наружу — они возвращаются как результат со
    статусом failed. Иначе одно битое parts.json уносит весь пул, и ночь
    заканчивается на первом же плохом шоте.
    """
    t0 = time.monotonic()
    name = payload["name"]
    try:
        import sys
        sys.path.insert(0, payload["client_dir"])
        from artwork import ArtSet, image_part_specs, summary, validate
        from audio import AudioTrack, align_phonemes_to_frames, lipsync_channel
        from blender_host import BSceneSpec, build_scene, channels_from_engine
        from columns import Key
        from drawings import Phoneme
        from swaps import swap_groups_spec

        art = ArtSet.load(payload["parts_json"])
        check = summary(validate(art))
        if not check["usable"]:
            return {"name": name, "status": "failed", "code": "BAD_ARTWORK",
                    "message": f"{check['errors']} blocking artwork problem(s)",
                    "findings": [f for f in check["findings"] if f["severity"] == "error"][:4],
                    "seconds": round(time.monotonic() - t0, 2), "frames": 0}

        channels = {k: [Key(frame=float(f), value=float(v)) for f, v in pairs]
                    for k, pairs in (payload.get("channels") or {}).items()}

        swaps = []
        if payload.get("lipsync"):
            ls = payload["lipsync"]
            phon = [Phoneme(p["sound"], float(p["start"]), float(p["end"]))
                    for p in ls["phonemes"]]
            rep = align_phonemes_to_frames(phon, fps=payload["fps"])
            track = lipsync_channel(rep, ls["mouthMap"],
                                    default=ls.get("defaultVariant") or "flat")
            swaps = swap_groups_spec(art, {ls.get("group") or "mouth": track},
                                     frame_end=payload["frames"])

        tracks = []
        if payload.get("audio"):
            t = AudioTrack(payload["audio"], 1, 1.0, "voice")
            t.validate()
            tracks.append(t.as_dict())

        spec = BSceneSpec(
            name=name, fps=payload["fps"], frame_start=1, frame_end=payload["frames"],
            resolution=tuple(payload["resolution"]), parts=[],
            image_parts=image_part_specs(art), swap_groups=swaps,
            channels=channels_from_engine(channels),
            bg_color=tuple(payload["bg_color"]),
            camera_ortho_scale=payload["camera_ortho_scale"],
            camera_loc=tuple(payload["camera_loc"]),
            audio_tracks=tracks)

        out = Path(payload["shot_dir"])
        rep = build_scene(spec, out, render=True, frames=(1, payload["frames"]))
        rendered = len(list(out.glob("f*.png")))
        if rep["returncode"] != 0 or rendered < payload["frames"]:
            return {"name": name, "status": "failed", "code": "RENDER_FAILED",
                    "message": f"rc={rep['returncode']}, {rendered}/{payload['frames']} frames",
                    "log_tail": rep["log_tail"][-400:],
                    "seconds": round(time.monotonic() - t0, 2), "frames": rendered}
        return {"name": name, "status": "ok", "frames": rendered,
                "seconds": round(time.monotonic() - t0, 2),
                "dir": str(out), "audio": payload.get("audio"),
                "fingerprint": payload.get("fingerprint")}
    except Exception as e:                                  # noqa: BLE001
        return {"name": name, "status": "failed", "code": type(e).__name__,
                "message": str(e)[:400],
                "seconds": round(time.monotonic() - t0, 2), "frames": 0}


# ---------------------------------------------------------------------------
# Прогон серии
# ---------------------------------------------------------------------------

def default_workers() -> int:
    """cores-2: два ядра системе и ffmpeg. Забрать все — уйти в свап и получить
    БОЛЬШЕЕ общее время, что проверяется числами, а не мнением."""
    return max(1, (os.cpu_count() or 4) - 2)


def _payload(ep: Episode, s: ShotSpec, client_dir: str) -> dict:
    return {
        "name": s.name, "parts_json": s.parts_json, "frames": s.frames, "fps": s.fps,
        "resolution": list(s.resolution), "channels": {k: [list(x) for x in v]
                                                       for k, v in s.channels.items()},
        "audio": s.audio, "lipsync": s.lipsync,
        "camera_ortho_scale": s.camera_ortho_scale,
        "camera_loc": list(s.camera_loc), "bg_color": list(s.bg_color),
        "shot_dir": str(ep.out_dir / s.name), "client_dir": client_dir,
        "fingerprint": s.fingerprint(),
    }


def render_batch(payload: dict) -> list[dict]:
    """
    Считает группу шотов за ОДИН запуск Blender.

    Числа, ради которых это написано (раунд 1): 12 воркеров давали 1.8×
    ускорения вместо 8×. Пустой запуск Blender стоит ~0.67 с, на 12 шотов это
    8 из 15 секунд — больше половины прогона уходило на старт процесса.

    Первая попытка лечения была неверной и это показал замер: батч на уровне
    питона (несколько шотов в одном процессе-воркере) стал МЕДЛЕННЕЕ на 13%,
    потому что build_scene всё равно запускал Blender подпроцессом на каждый
    шот. Экономит только батч внутри самого Blender — здесь.

    Подготовка спек (проверка рисунков, липсинк, каналы) остаётся на шот:
    она дешёвая и её провал должен убивать один шот, а не группу.
    """
    import sys
    import time
    if payload["client_dir"] not in sys.path:
        sys.path.insert(0, payload["client_dir"])

    from artwork import ArtSet, image_part_specs, summary, validate
    from audio import AudioTrack, align_phonemes_to_frames, lipsync_channel
    from blender_host import BSceneSpec, build_scenes, channels_from_engine
    from columns import Key
    from drawings import Phoneme
    from swaps import swap_groups_spec

    prepared: list[tuple] = []
    out: list[dict] = []
    starts: dict[str, float] = {}

    for shot in payload["shots"]:
        name = shot["name"]
        starts[name] = time.monotonic()
        try:
            art = ArtSet.load(shot["parts_json"])
            check = summary(validate(art))
            if not check["usable"]:
                out.append({"name": name, "status": "failed", "code": "BAD_ARTWORK",
                            "message": f"{check['errors']} blocking artwork problem(s)",
                            "findings": [f for f in check["findings"]
                                         if f["severity"] == "error"][:4],
                            "seconds": round(time.monotonic() - starts[name], 2),
                            "frames": 0})
                continue

            channels = {k: [Key(frame=float(f), value=float(v)) for f, v in pairs]
                        for k, pairs in (shot.get("channels") or {}).items()}
            swaps = []
            if shot.get("lipsync"):
                ls = shot["lipsync"]
                phon = [Phoneme(x["sound"], float(x["start"]), float(x["end"]))
                        for x in ls["phonemes"]]
                rep = align_phonemes_to_frames(phon, fps=shot["fps"])
                track = lipsync_channel(rep, ls["mouthMap"],
                                        default=ls.get("defaultVariant") or "flat")
                swaps = swap_groups_spec(art, {ls.get("group") or "mouth": track},
                                         frame_end=shot["frames"])
            tracks = []
            if shot.get("audio"):
                t = AudioTrack(shot["audio"], 1, 1.0, "voice")
                t.validate()
                tracks.append(t.as_dict())

            spec = BSceneSpec(
                name=name, fps=shot["fps"], frame_start=1, frame_end=shot["frames"],
                resolution=tuple(shot["resolution"]), parts=[],
                image_parts=image_part_specs(art), swap_groups=swaps,
                channels=channels_from_engine(channels),
                bg_color=tuple(shot["bg_color"]),
                camera_ortho_scale=shot["camera_ortho_scale"],
                camera_loc=tuple(shot["camera_loc"]),
                audio_tracks=tracks)
            prepared.append((spec, Path(shot["shot_dir"]),
                             (1, shot["frames"]), shot))
        except Exception as e:                              # noqa: BLE001
            out.append({"name": name, "status": "failed", "code": type(e).__name__,
                        "message": str(e)[:400],
                        "seconds": round(time.monotonic() - starts[name], 2),
                        "frames": 0})

    if prepared:
        reports = build_scenes([(sp, d, fr) for sp, d, fr, _ in prepared],
                               render=True)
        for rep, (spec, d, fr, shot) in zip(reports, prepared):
            ok = rep["returncode"] == 0 and rep["frames_rendered"] >= shot["frames"]
            out.append({
                "name": spec.name,
                "fingerprint": shot.get("fingerprint"),
                "status": "ok" if ok else "failed",
                "code": None if ok else "RENDER_FAILED",
                "message": None if ok else
                f"rc={rep['returncode']}, {rep['frames_rendered']}/{shot['frames']} frames",
                "frames": rep["frames_rendered"],
                "seconds": round(time.monotonic() - starts[spec.name], 2),
                "dir": str(d), "audio": shot.get("audio"),
                "log_tail": None if ok else rep["log_tail"][-400:],
            })
    return out


def make_batches(items: list, workers: int) -> list[list]:
    """
    Раскладывает шоты по воркерам круговым способом, а не блоками.

    Блоками (`items[i::n]` против `items[:k]`) первый воркер получил бы все
    длинные шоты подряд, если раскадровка отсортирована по длине, и остальные
    ждали бы его. Круговая раскладка усредняет длины между воркерами без
    знания их продолжительности.
    """
    n = max(1, min(workers, len(items)))
    buckets: list[list] = [[] for _ in range(n)]
    for i, it in enumerate(items):
        buckets[i % n].append(it)
    return [b for b in buckets if b]


def run_episode(ep: Episode, workers: int | None = None,
                on_event: Callable[[dict], None] | None = None,
                client_dir: str | None = None,
                renderer: Callable[[dict], dict] | None = None,
                batch: bool = False) -> dict:
    """
    Считает серию параллельно, возобновляясь с того места, где остановилась.

    on_event зовётся на каждое событие (start / shot_done / shot_failed) — так
    оператор видит прогресс, а не молчащий терминал на три часа.

    renderer позволяет подставить свой счётчик шота и тогда прогон идёт В ЭТОМ
    процессе, без пула. Это не «ход для тестов»: пул процессов пиклит функцию,
    поэтому любая подстановка (быстрая пустышка в тестах, планировщик на
    рендер-ферме, обёртка с логированием) через пул невозможна в принципе.
    Развилка честная — либо пул и модульная функция, либо свой счётчик и один
    процесс.

    batch=True считает группу шотов за один запуск Blender. По умолчанию ВЫКЛЮЧЕН:
    замер на этой машине (3 прогона на конфигурацию, чередуя порядок) дал разброс
    20 с при измеряемом эффекте меньше 4 с — то есть вывод сделать нельзя, а
    включать по вере в гипотезу нельзя тем более. См. open_gaps.md, раунд 1.
    """
    client_dir = client_dir or str(Path(__file__).resolve().parent)
    workers = workers or default_workers()
    ep.out_dir.mkdir(parents=True, exist_ok=True)

    emit_early = on_event or (lambda e: None)
    lock = RunLock(ep.out_dir)
    lock.acquire(on_event=emit_early)

    try:
        return _run_locked(ep, workers, on_event, client_dir, renderer, batch)
    finally:
        lock.release()


def _run_locked(ep: Episode, workers: int,
                on_event: Callable[[dict], None] | None,
                client_dir: str, renderer, batch: bool) -> dict:
    # Метка прогона: шоты, посчитанные до аварии и после, различаются по ней.
    # Без неё мастер после досчёта — смесь из неизвестно чего.
    run_id = f"{int(time.time())}-{os.getpid()}"
    journal = read_journal(ep)
    todo = [s for s in ep.shots if not shot_is_done(ep, s, journal.get(s.name))]
    skipped = [s.name for s in ep.shots if s.name not in {t.name for t in todo}]

    t0 = time.monotonic()
    emit = on_event or (lambda e: None)
    emit({"event": "start", "shots": len(ep.shots), "todo": len(todo),
          "resumed": len(skipped), "workers": workers,
          "first_up": [x.name for x in todo[:workers]],
          "frames_todo": sum(s.frames for s in todo)})

    results: dict[str, dict] = {n: journal[n] for n in skipped if n in journal}
    done_frames = 0

    by_name = {s.name: s for s in todo}

    # Номер кадра значит ДВЕ РАЗНЫЕ ВЕЩИ, и путать их нельзя (раунд 17):
    #
    #   позиция в РАСКАДРОВКЕ — стабильна при досчёте: шоты добавляются, полная
    #     раскадровка не меняется, и записи первого прогона остаются верными;
    #   позиция в МАСТЕРЕ — зависит от того, что в него вошло: упавший шот
    #     сдвигает всё, что за ним.
    #
    # В раунде 11 записана была только первая, и на вопрос «кадр 1234 мастера —
    # чей?» реестр отвечал чужим шотом или untracked (8 неверных ответов из 12
    # на серии, где упал один шот из пяти при разных длинах). Оператор смотрит
    # МАСТЕР, поэтому нужны обе: раскадровочная как основная адресация (её
    # знает и planning, и досчёт), мастерная — в detail, и она пишется на
    # сборке, когда состав мастера уже известен.
    frame_offsets: dict[str, int] = {}
    _acc = 0
    for _s in ep.shots:
        frame_offsets[_s.name] = _acc
        _acc += _s.frames

    def record_provenance(rec: dict, spec: "ShotSpec") -> None:
        """
        Реестр происхождения кадра. Раунд 11: механизм существовал и был
        проверен, но конвейер его не вызывал — на любой кадр посчитанной серии
        отчёт отвечал `untracked`, хотя PRODUCTION.md обещал обратное.

        Пишется ПОСЛЕ журнала: если упасть между ними, шот считается
        непосчитанным и на следующем прогоне пересчитается вместе с записью.
        Обратный порядок дал бы запись о кадрах, которых нет.
        """
        try:
            from provenance import Ledger
            lg = Ledger(ep.out_dir / "provenance.jsonl")
            lg.record(
                origin="tool", actor="mcpb/episode",
                action="shot_rendered", scene=ep.name,
                frames=(frame_offsets[spec.name] + 1,
                        frame_offsets[spec.name] + spec.frames),
                targets=[spec.name, Path(spec.parts_json).name],
                detail={"fingerprint": rec.get("fingerprint"),
                        "renderer": _renderer_id(),
                        "run": run_id,
                        "artwork": spec.parts_json,
                        "audio": spec.audio,
                        "generated": sorted(
                            k for k in ("channels", "lipsync")
                            if getattr(spec, k, None)),
                        "fps": spec.fps},
            )
        except Exception as exc:                 # реестр не должен ронять прогон
            emit({"event": "provenance_failed", "name": rec.get("name"),
                  "message": f"{type(exc).__name__}: {exc}"})

    def settle(rec: dict, i: int) -> None:
        """Один завершённый шот: в журнал, в результаты, в событие."""
        nonlocal done_frames
        rec["finished_at"] = time.time()
        # Отпечаток ставит оркестратор, а не счётчик шота. Иначе любой свой
        # renderer (тест, планировщик фермы, обёртка с логированием) молча
        # теряет поле, и проверка «описание не менялось» перестаёт работать —
        # ровно так и вышло при первой попытке.
        spec = by_name.get(rec.get("name"))
        if spec is not None and rec.get("status") == "ok":
            rec.setdefault("fingerprint", spec.fingerprint())
            rec.setdefault("run", run_id)
        append_journal(ep, rec)              # пережить kill -9 сразу же
        if spec is not None and rec.get("status") == "ok":
            record_provenance(rec, spec)
        results[rec["name"]] = rec
        done_frames += rec.get("frames", 0)
        elapsed = time.monotonic() - t0
        rate = done_frames / elapsed if elapsed > 0 else 0.0
        # Прогноз считается ВОЛНАМИ, а не наблюдённой скоростью. Раунд 18:
        # `left / rate` верно для последовательного счёта и врёт для
        # параллельного — на первом готовом шоте посчитан ОДИН, а работали
        # `workers`, и скорость измерялась по одному. Замер: 30 шотов, 12
        # воркеров — первая eta показывала 301 с при фактических 26 с (ошибка
        # 11x). Это первое число, которое видит оператор, и по нему он решает,
        # ждать или идти спать.
        #
        # Волна = столько шотов, сколько воркеров. Время волны = прошедшее время
        # на число завершённых волн; остаток — целое число волн, а не дробь
        # кадров.
        #
        # Замер обеих формул на одних данных (один прогон, оценки пересчитаны
        # offline), отношение оценки к фактическому остатку, идеал 1.0:
        #
        #   масштаб        первая оценка     медиана по прогону
        #                  старая  новая     старая  новая
        #    30 шотов      24.0x    2.5x      2.54x  2.49x
        #    60 шотов      10.9x    0.9x      1.45x  1.49x
        #   120 шотов      12.6x    1.1x      1.30x  1.27x
        #   314 шотов      11.6x    1.0x      0.99x  0.99x   <- серия 22 минуты
        #
        # То есть новая формула на порядок точнее в ПЕРВЫХ строках (единственное
        # место, где старая ошибалась) и не хуже по медиане ни на одном масштабе,
        # включая настоящий. Проверка на 314 шотах добавлена потому, что первая
        # правка была сделана по замеру на 30 — а конвейер существует ради 314.
        shots_left = len(todo) - i
        waves_done = max(1, math.ceil(i / workers))
        wave_s = elapsed / waves_done
        waves_left = math.ceil(shots_left / workers) if shots_left > 0 else 0
        eta_s = round(waves_left * wave_s, 1) if waves_left else None
        emit({"event": "shot_done" if rec["status"] == "ok" else "shot_failed",
              "name": rec["name"], "status": rec["status"],
              "done": i, "of": len(todo),
              "frames_per_s": round(rate, 2),
              "eta_s": eta_s,
              "code": rec.get("code"), "message": rec.get("message")})

    if todo and renderer is not None:
        # Свой счётчик — значит в этом процессе, последовательно.
        for i, s in enumerate(todo, 1):
            settle(renderer(_payload(ep, s, client_dir)), i)
    elif todo and batch:
        groups = make_batches([_payload(ep, s, client_dir) for s in todo], workers)
        emit({"event": "batches", "count": len(groups),
              "sizes": [len(g) for g in groups]})
        i = 0
        with ProcessPoolExecutor(max_workers=len(groups)) as pool:
            futs = [pool.submit(render_batch, {"shots": g, "client_dir": client_dir})
                    for g in groups]
            for fut in as_completed(futs):
                for rec in fut.result():
                    i += 1
                    settle(rec, i)
    elif todo:
        with ProcessPoolExecutor(max_workers=workers) as pool:
            futs = {pool.submit(render_one_shot, _payload(ep, s, client_dir)): s
                    for s in todo}
            for i, fut in enumerate(as_completed(futs), 1):
                settle(fut.result(), i)

    elapsed = time.monotonic() - t0
    ok = [r for r in results.values() if r.get("status") == "ok"]
    failed = [r for r in results.values() if r.get("status") != "ok"]
    frames = sum(r.get("frames", 0) for r in ok)
    # Кадры, ПОСЧИТАННЫЕ ЭТИМ прогоном, отдельно от взятых из журнала. Раунд 12:
    # `frames_rendered` включал возобновлённые шоты, и при нулевом досчёте отчёт
    # утверждал «rendered 12 frames» со скоростью 1241336 fps (деление на
    # округлённый до нуля интервал). Утро оператора начинается с report.json,
    # поэтому врать нельзя ни в терминале, ни в файле.
    fresh = sum(r.get("frames", 0) for r in ok if r["name"] not in set(skipped))
    report = {
        "episode": ep.name, "out_dir": str(ep.out_dir),
        "shots_total": len(ep.shots), "shots_ok": len(ok), "shots_failed": len(failed),
        "resumed": len(skipped), "workers": workers,
        "frames_rendered": frames, "rendered_now": fresh,
        "seconds": round(elapsed, 2),
        # Скорость имеет смысл только при измеримом интервале и реальном счёте.
        "frames_per_s": (round(fresh / elapsed, 2)
                         if fresh and elapsed >= 0.05 else 0.0),
        "failed": [{"name": r["name"], "code": r.get("code"),
                    "message": r.get("message")} for r in failed],
        "complete": not failed,
    }
    (ep.out_dir / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    emit({"event": "done", **report})
    return report


# ---------------------------------------------------------------------------
# Сборка мастера
# ---------------------------------------------------------------------------

class AssemblyError(RuntimeError):
    """
    Сбой сборки: причина первой строкой, действие второй, лог ffmpeg — отдельным
    полем.

    Раунд 14: сообщения были обрезанным хвостом `r.stderr[-400:]`, и оператор
    получал «concat failed: 24 fps, 24 tbr, 12288 tbn Metadata: handler_name» —
    технический лог без причины. Тот же класс, что трейсбек вместо инструкции в
    раунде 8: информация есть, подача непригодна. Лог нужен тому, кто полезет
    разбираться, и не должен быть ТЕКСТОМ ошибки.
    """

    def __init__(self, reason: str, remedy: str = "", log: str = ""):
        self.reason = reason
        self.remedy = remedy
        self.log = log
        text = reason if not remedy else f"{reason}\n  -> {remedy}"
        super().__init__(text)


def _segment_is_current(seg: Path, shot_dir: Path, spec: "ShotSpec",
                        stamp: Path) -> bool:
    """
    Можно ли взять готовый сегмент вместо пересборки.

    Раунд 15: сборка пересчитывала ВСЕ сегменты каждый раз. Замер на 1080p —
    1137 мс на шот, то есть 357 с на серию из 314 шотов. При досчёте одного шота
    после аварии это 5.9 минуты лишней работы на каждый прогон, тогда как нужно
    0.7 с. Ночь, упавшая трижды, платит этот налог трижды.

    Четыре условия, и каждое закрывает свой способ отдать неверный мастер:

      1. сегмент существует и содержит РОВНО столько кадров, сколько в шоте —
         иначе переиспользуется обрубок от прерванной сборки;
      2. сегмент новее ВСЕХ кадров шота. Критично: правка тайминга даёт тот же
         набор имён файлов, и сегмент от вчерашних кадров выглядит исправным;
      3. сегмент новее файла звука — звук могли перезаписать;
      4. отпечаток описания совпадает с тем, что был при сборке сегмента.
         Хранится рядом с сегментом: изменение разрешения или fps не меняет ни
         одного имени файла и по времени не ловится.
    """
    if not seg.is_file():
        return False
    if not stamp.is_file() or stamp.read_text(encoding="utf-8").strip() != spec.fingerprint():
        return False
    seg_mtime = seg.stat().st_mtime
    for f in shot_dir.glob("f*.png"):
        if f.stat().st_mtime > seg_mtime:
            return False
    if spec.audio:
        a = Path(spec.audio)
        if not a.is_file() or a.stat().st_mtime > seg_mtime:
            return False
    return _count_frames(seg) == spec.frames


def _count_frames(path: Path) -> int | None:
    """
    Сколько кадров в файле. НЕ длительность контейнера: её задаёт звук, и потеря
    кадров по ней не видна (раунд 14).

    Берётся из заголовка (`nb_frames`), а не подсчётом (`-count_frames`). Раунд
    15: подсчёт декодирует весь сегмент — 373 мс на шот при 1080p, то есть 117 с
    на серию из 314 шотов ТОЛЬКО на проверку. Заголовок даёт то же за 26 мс на
    десять шотов.

    Заголовку можно верить именно для этой задачи: mp4, записанный ffmpeg-ом до
    конца, несёт верное число, а у обрубка поле пустое — проверено на файле,
    урезанном до трети. То есть оба интересующих случая (целый и недописанный)
    различаются без декодирования.
    """
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                        "-show_entries", "stream=nb_frames", "-of", "csv=p=0",
                        str(path)], capture_output=True, text=True)
    try:
        return int(r.stdout.strip())
    except ValueError:
        return None


def assemble(ep: Episode, master: Path | None = None,
             tolerance_s: float = 0.1) -> dict:
    """
    Склеивает шоты в ОДИН мастер в порядке раскадровки, со звуком.

    Порядок берётся из `ep.shots`, а не из имён файлов на диске: сортировка по
    имени поставила бы sc10 перед sc2, и серия вышла бы в неверном порядке —
    ошибка, которую заметит только человек на просмотре.

    Длительность проверяется против суммы шотов: расхождение означает потерянные
    кадры или лишний шот, и молча отдавать такой мастер нельзя.

    Про цену (замерено, раунд 13; условия названы, потому что цифра от них
    зависит на порядок):

      96 кадров 1080p, детальный кадр  ~500 мс на шот
      серия 22 минуты (314 шотов)      ~156 с = 5.8% от ~45 минут прогона

    Раньше здесь стояло «~9 с, 0.3%». Та цифра получена экстраполяцией с демо —
    24 кадра, 480x270, однотонный фон, — и завышала скорость в 17 раз: 480x270
    даёт 35 мс на шот, 1080p уже 119 мс, 96 кадров вместо 24 — 293 мс, а
    детальный кадр вместо однотонного — 498 мс. Вывод «сборка не узкое место»
    от этого не изменился, но основание под ним было ложным.

    Из этих 500 мс склейка concat — 1.5% (идёт с `-c copy`, без перекодирования).
    Остальное — кодирование сегментов: три четверти H.264, четверть распаковка
    PNG. То есть трогать надо кодирование, а не склейку.

    Известный рычаг: `-preset ultrafast` даёт 2.5x (156 с -> 62 с) ценой файла в
    2.2 раза больше. Не включён: для мастера качество важнее пяти процентов
    прогона; для просмотровой копии — имеет смысл.

    Опровергнуто замером: раздать кодирование сегментов по процессам НЕ помогает
    (4x3 потока = 1.0x, 6x2 = 0.8x, 12x1 = 0.7x). libx264 уже занимает ядра сам,
    и дробление отнимает у него внутренний параллелизм. Второй случай после
    батчинга Blender, когда «раздать по ядрам» проваливается.

    Сегменты нужны потому, что у шота может быть СВОЙ звук, а concat без
    перекодирования требует совпадения параметров потоков; прямая склейка кадров
    сломала бы шоты с индивидуальными дорожками.
    """
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        raise RuntimeError("ffmpeg/ffprobe not on PATH")
    master = master or (ep.out_dir / MASTER)
    # Предсказуемое проверяется ДО запуска ffmpeg. Раунд 14: занятое имя мастера
    # давало «concat failed: 24 fps, 24 tbr, 12288 tbn Metadata: handler_name» —
    # обрезанный хвост лога, из которого причину не восстановить.
    if master.exists() and not master.is_file():
        raise AssemblyError(
            f"master destination is not a file: {master}",
            remedy="remove it (it is a directory) and assemble again")
    journal = read_journal(ep)

    parts: list[Path] = []
    missing: list[str] = []
    short_segments: list[dict] = []
    reused: list[str] = []
    for s in ep.shots:
        if not shot_is_done(ep, s, journal.get(s.name)):
            missing.append(s.name)
            continue
        # .mov с PCM, а не .mp4 с aac. Раунд 16: aac кладёт priming-кадр с
        # отрицательным pts (-0.023 с), и concat съезжает — в мастере видео
        # стартовало на 23 мс позже звука, то есть звук шёл впереди картинки ВСЮ
        # серию. Ни один флаг concat этого не лечит (проверены -avoid_negative_ts,
        # -fflags +genpts, перекодирование звука на выходе) — потому что источник
        # в сегменте, а не в склейке. PCM priming не имеет: сдвиг 0 мс.
        # Цена: сегменты 1390 МБ вместо 1280 на серию 314 шотов, времени не
        # добавляет (3.5 с против 3.9 на шести шотах).
        seg = ep.out_dir / s.name / SEGMENT
        stamp = ep.out_dir / s.name / "segment.fingerprint"
        if _segment_is_current(seg, ep.out_dir / s.name, s, stamp):
            reused.append(s.name)
            parts.append(seg)
            continue
        # Звук мог исчезнуть между рендером и сборкой (перемонтировали том,
        # почистили каталог). Проверка здесь даёт причину одной строкой вместо
        # 426 символов лога ffmpeg, где она лежала в середине.
        if s.audio and not Path(s.audio).is_file():
            raise AssemblyError(
                f"audio file missing for {s.name}: {s.audio}",
                remedy=('restore the file, or clear "audio" for this shot in '
                        'the episode JSON, then assemble again'))
        args = ["ffmpeg", "-y", "-framerate", str(s.fps),
                "-i", str(ep.out_dir / s.name / "f%04d.png")]
        if s.audio:
            args += ["-i", s.audio, "-c:a", "pcm_s16le",
                     "-map", "0:v:0", "-map", "1:a:0"]
        else:
            # Тишина нужной длины: без звуковой дорожки concat склеит шоты с
            # разъезжающимся звуком у последующих сегментов.
            args += ["-f", "lavfi", "-t", f"{s.seconds:.4f}",
                     "-i", "anullsrc=channel_layout=mono:sample_rate=44100",
                     "-c:a", "pcm_s16le",
                     "-map", "0:v:0", "-map", "1:a:0"]
        # БЕЗ -shortest. Раунд 14: -shortest обрезал сегмент по КОРОТЧАЙШЕМУ
        # потоку, и им оказывалась не тишина, а видео — последний кадр каждого
        # шота не влезал. На серии 22 минуты это 314 потерянных кадров = 13
        # секунд анимации, по одному кадру на КАЖДОМ стыке. Проверка длины этого
        # видеть не могла: ffprobe отдаёт длительность контейнера, а её задаёт
        # звук (aac округляет вверх), и «drift +0.023s» читался как погрешность
        # округления, хотя кадров в шоте было на один меньше.
        # Звуковая дорожка теперь обрезается по видео (-t), а не наоборот.
        args += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
                 "-r", str(s.fps), "-frames:v", str(s.frames), str(seg)]
        r = subprocess.run(args, capture_output=True, text=True)
        if r.returncode != 0:
            raise AssemblyError(
                f"ffmpeg could not encode {s.name}",
                remedy=(f"check the frames in {ep.out_dir / s.name} — a PNG may "
                        f"be unreadable; delete the folder and re-run the same "
                        f"command to render the shot again"),
                log=r.stderr[-1200:])

        # Кадры сегмента сверяются с кадрами шота. Раунд 14: битый PNG (запись
        # оборвалась, диск сбойнул) останавливает ffmpeg на нём БЕЗ ошибки —
        # sc002 отдал 3 кадра из 8, мастер вышел на 0.185 с короче, и по итогу
        # был виден только неверный drift без указания шота. Молча отдавать
        # такой мастер нельзя: короткий шот в середине серии заметит человек на
        # просмотре, а не конвейер.
        got = _count_frames(seg)
        if got is not None and got != s.frames:
            short_segments.append({"shot": s.name, "frames": got,
                                   "expected": s.frames})
        else:
            # Отпечаток кладётся только к ЦЕЛОМУ сегменту: обрубок не должен
            # переиспользоваться на следующем прогоне.
            stamp.write_text(s.fingerprint(), encoding="utf-8")
        parts.append(seg)

    if not parts:
        raise RuntimeError("nothing to assemble: no completed shots")

    listing = ep.out_dir / "concat.txt"
    listing.write_text("".join(f"file '{p.resolve()}'\n" for p in parts),
                       encoding="utf-8")
    r = subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listing),
         # Видео копируется, звук кодируется в aac ОДИН РАЗ на весь мастер —
         # именно поэтому priming попадает в начало один раз и не сдвигает
         # ничего внутри. PCM в мастере дал бы гигабайты.
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
         str(master)], capture_output=True, text=True)
    if r.returncode != 0:
        raise AssemblyError(
            "ffmpeg could not join the segments into a master",
            remedy=(f"check that {master} is writable and that the segments in "
                    f"{ep.out_dir} are intact"),
            log=r.stderr[-1200:])

    # Раскладка мастера считается по ВОШЕДШИМ шотам в порядке раскадровки:
    # это единственный источник ответа на «кадр N мастера — чей».
    layout, _acc = [], 0
    for sh in ep.shots:
        if sh.name in missing:
            continue
        layout.append({"shot": sh.name, "from": _acc + 1, "to": _acc + sh.frames})
        _acc += sh.frames

    # Сборка регистрируется в реестре. Раунд 17: реестр знал только про шоты, и
    # на вопрос «из чего сделан этот мастер» ответа не было — притом что именно
    # мастер уходит заказчику. Запись несёт раскладку кадров, поэтому по кадру
    # готового файла можно назвать шот, даже если состав серии потом поменяется.
    try:
        from provenance import Ledger
        lg = Ledger(ep.out_dir / "provenance.jsonl")
        lg.record(origin="tool", actor="mcpb/episode", action="master_assembled",
                  scene=ep.name, frames=(1, max(1, _acc)),
                  targets=[Path(master).name],
                  detail={"layout": layout, "missing_shots": missing,
                          "segments": len(parts), "reused": reused})
    except Exception as exc:      # реестр не должен ронять сборку
        # ...но и молчать нельзя: раунд 17 потерял на этом полчаса, потому что
        # `pass` съел причину и запись просто не появлялась.
        provenance_error = f"{type(exc).__name__}: {exc}"
    else:
        provenance_error = None

    info = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "format=duration:stream=codec_type", "-of", "default=nw=1", str(master)],
        capture_output=True, text=True).stdout
    kinds = [l.split("=", 1)[1] for l in info.splitlines() if l.startswith("codec_type")]
    durs = [float(l.split("=", 1)[1]) for l in info.splitlines() if l.startswith("duration")]
    expect = sum(s.seconds for s in ep.shots if s.name not in missing)
    actual = durs[0] if durs else 0.0

    # Целостность мастера проверяется КАДРАМИ, а не длительностью контейнера.
    # Раунд 14: длительность задаёт звук (aac округляет вверх), поэтому потеря
    # кадра давала ПОЛОЖИТЕЛЬНЫЙ дрейф и читалась как погрешность округления.
    # Раунд 15: после исправления «drift +0.023s» остался — он весь от звука, и
    # пока итог считался по нему, всякий следующий сбой кадров прятался бы там
    # же. Кадры — величина, которая отвечает на вопрос «серия цела».
    frames_expect = sum(s.frames for s in ep.shots if s.name not in missing)
    frames_actual = _count_frames(master)
    frames_ok = frames_actual is None or frames_actual == frames_expect
    return {
        "master": str(master), "segments": len(parts),
        "streams": kinds, "duration": round(actual, 3),
        "expected": round(expect, 3), "drift": round(actual - expect, 3),
        # Дрейф по длительности остаётся в отчёте как справка, но вердикт о
        # целостности даёт сверка кадров.
        "frames": frames_actual, "frames_expected": frames_expect,
        "in_tolerance": frames_ok and abs(actual - expect) <= tolerance_s + 0.05,
        "missing_shots": missing,
        # Шоты, у которых кадров в сегменте меньше, чем в шоте: битый или
        # пропавший PNG. Названы поимённо — «мастер короче» без указания шота
        # не даёт оператору куда смотреть.
        "short_segments": short_segments,
        # Шоты, чей сегмент взят готовым. При досчёте одного шота после аварии
        # пересборка остальных — 5.9 минуты лишней работы на серии 314 шотов.
        "reused_segments": reused,
        "order": [s.name for s in ep.shots if s.name not in missing],
        # Раскладка МАСТЕРА: какой кадр готового файла к какому шоту относится.
        # Отличается от раскадровочной нумерации, когда шот не вошёл (раунд 17).
        "layout": layout,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def demo_episode(out_dir: Path, shots: int = 3, frames: int = 12) -> Episode:
    """Демо-серия на сгенерированных рисунках: чтобы `--demo` работал у
    человека, у которого ещё нет своих parts.json."""
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from smoke_full_shot import draw_character
    parts_dir = out_dir / "demo_parts"
    art = draw_character(parts_dir)
    pj = parts_dir / "parts.json"
    if not pj.exists():
        pj.write_text(json.dumps(
            {"name": art.name, "parts": [p.as_dict() for p in art.parts]}, indent=1),
            encoding="utf-8")
    specs = []
    for i in range(shots):
        specs.append(ShotSpec(
            name=f"sc{i + 1:03d}", parts_json=str(pj), frames=frames, fps=24,
            resolution=(320, 240),
            channels={"arm.rot": [(1.0, -10.0), (float(frames), 60.0 + i * 20)]},
            camera_ortho_scale=1.9, camera_loc=(0.0, 0.3)))
    return Episode("demo", specs, out_dir)


def main() -> int:
    import argparse
    ap = argparse.ArgumentParser(description="Render an episode: queue, resume, assemble.")
    ap.add_argument("episode", nargs="?", help="episode JSON")
    ap.add_argument("--demo", action="store_true", help="build a generated demo episode")
    ap.add_argument("--shots", type=int, default=3, help="demo: how many shots")
    ap.add_argument("--frames", type=int, default=12, help="demo: frames per shot")
    ap.add_argument("--out", default="", help="output directory")
    ap.add_argument("--workers", type=int, default=0)
    ap.add_argument("--dry-run", action="store_true", help="preflight only, render nothing")
    ap.add_argument("--no-assemble", action="store_true",
                    help="render only, do not join the master")
    ap.add_argument("--assemble-only", action="store_true",
                    help="join the master from frames already on disk, render "
                         "nothing (PRODUCTION.md says «assemble again» — this "
                         "is it)")
    ap.add_argument("--json", action="store_true", help="machine-readable report only")
    a = ap.parse_args()

    if a.demo:
        out = Path(a.out or "/tmp/episode_demo")
        ep = demo_episode(out, shots=a.shots, frames=a.frames)
    elif a.episode:
        ep = Episode.load(a.episode)
        if a.out:
            ep.out_dir = Path(a.out)
    else:
        ap.error("give an episode JSON or --demo")

    pf = preflight(ep)
    if not a.json:
        print(f"episode: {ep.name} — {len(ep.shots)} shots, {ep.total_frames} frames, "
              f"{ep.seconds:.1f}s")
        print(f"preflight: {'ok' if pf.ok else 'PROBLEMS'} "
              f"(~{pf.info.get('estimated_gb')} GB needed, "
              f"{pf.info.get('free_gb')} GB free)")
        for p in pf.problems:
            print(f"  [{p['code']}] {p['message']}", flush=True)
            if p.get("remedy"):
                print(f"      -> {p['remedy']}")
    if not pf.ok:
        if a.json:
            print(json.dumps({"preflight": pf.as_dict()}, ensure_ascii=False, indent=1))
        return 2
    if a.dry_run:
        if a.json:
            print(json.dumps({"preflight": pf.as_dict(), "dry_run": True},
                             ensure_ascii=False, indent=1))
        else:
            print("dry run: nothing rendered")
        return 0

    # «Собрать снова» без пересчёта. Раунд 18: PRODUCTION.md трижды говорит
    # «assemble again», а сделать это можно было только полным прогоном — то
    # есть повторив preflight и учёт готовности ради одной склейки.
    if a.assemble_only:
        try:
            asm = assemble(ep)
        except AssemblyError as exc:
            print(f"\nASSEMBLY FAILED: {exc.reason}", flush=True)
            if exc.remedy:
                print(f"  -> {exc.remedy}", flush=True)
            return 1
        except RuntimeError as exc:
            print(f"\nASSEMBLY FAILED: {exc}", flush=True)
            return 1
        if a.json:
            print(json.dumps({"assembly": asm}, ensure_ascii=False, indent=1))
        else:
            print(f"master: {asm['master']} — {asm['duration']}s "
                  f"(expected {asm['expected']}s, drift {asm['drift']:+.3f}s), "
                  f"streams {asm['streams']}", flush=True)
            if asm.get("reused_segments"):
                print(f"  reused {len(asm['reused_segments'])} segment(s) "
                      f"unchanged since the last assembly", flush=True)
            if asm["missing_shots"]:
                print(f"  INCOMPLETE: {len(asm['missing_shots'])} shot(s) missing "
                      f"from the master: {', '.join(asm['missing_shots'])}",
                      flush=True)
                # Здесь подсказка нужнее, чем в полном прогоне: оператор явно
                # попросил не считать, и должен узнать, как досчитать.
                print(f"  Run the same command WITHOUT --assemble-only to render "
                      f"them, then assemble again.", flush=True)
            if asm.get("short_segments"):
                print(f"  DAMAGED ARTWORK: {len(asm['short_segments'])} shot(s) "
                      f"lost frames:", flush=True)
                for sh in asm["short_segments"]:
                    print(f"    {sh['shot']}: {sh['frames']} of {sh['expected']} "
                          f"frames — a PNG is missing or unreadable", flush=True)
        return 1 if (asm["missing_shots"] or asm.get("short_segments")
                     or not asm["in_tolerance"]) else 0

    def say(text: str) -> None:
        """
        Строка выходит НЕМЕДЛЕННО. Раунд 12: без flush все строки прогресса
        буферизовались и вываливались пачкой в конце. В терминале Python
        буферизует построчно, а в ФАЙЛ — блоками, и `PRODUCTION.md` предлагает
        ночной прогон как раз в файл: замер дал 10.6 с неизменного лога на 14
        шотах, то есть ~45 минут пустого `tail -f` на серии 22 минуты. Прогноз
        `eta`, доставленный после конца работы, — не прогноз.
        """
        print(text, flush=True)

    def show(e: dict) -> None:
        if a.json:
            return
        ev = e.get("event")
        if ev == "start":
            if e["todo"] == 0:
                # Прямая фраза вместо служебного «0 shots to render» среди
                # прочих строк: человек, запустивший команду дважды, должен
                # понять, что делать нечего, а не искать это в цифрах.
                say(f"nothing to do: all {e['resumed']} shot(s) are already "
                    f"rendered and up to date")
            else:
                say(f"start: {e['todo']} shots to render "
                    f"({e['resumed']} already done), {e['workers']} workers")
                # Признак жизни ДО первого готового шота. Шот считается
                # секунды-минуты, и до раунда 12 лог всё это время был пуст —
                # оператор не мог отличить работу от зависания. Печатается
                # ожидание, а не факт, поэтому названо «working on».
                first = ", ".join(n for n in e.get("first_up", [])[:4])
                if first:
                    more = ("" if len(e.get("first_up", [])) <= 4
                            else f" (+{len(e['first_up']) - 4} more)")
                    say(f"  working on {first}{more} — first result in a few "
                        f"seconds to a few minutes")
        elif ev in ("shot_done", "shot_failed"):
            tag = "ok  " if ev == "shot_done" else "FAIL"
            eta = f", eta {e['eta_s']}s" if e.get("eta_s") else ""
            extra = f" [{e.get('code')}] {e.get('message')}" if ev == "shot_failed" else ""
            say(f"  {tag} {e['name']}  {e['done']}/{e['of']}  "
                f"{e['frames_per_s']} fps{eta}{extra}")
        elif ev == "done":
            # Ничего не считали — нельзя говорить «rendered N frames»: кадры
            # взяты из журнала прошлого прогона. И нельзя печатать скорость,
            # посчитанную делением на нулевой интервал («1241336 fps»).
            if e.get("rendered_now", e["frames_rendered"]) == 0:
                say("nothing rendered this run — the episode was already complete")
            else:
                rate = (f" ({e['frames_per_s']} fps)"
                        if e["seconds"] >= 0.05 and e["frames_per_s"] else "")
                say(f"rendered {e['frames_rendered']} frames in "
                    f"{e['seconds']}s{rate}, {e['shots_failed']} failed")
            # Сводка по ПРИЧИНАМ, а не по шотам. Раунд 19: одна беда (у
            # художника в рисунке нет альфа-канала) валит десятки шотов, и в
            # выводе появлялось столько же одинаковых строк. Тот же класс, что
            # 345 жалоб вместо одной в раунде 5: число верное, вывод из него
            # сделать нельзя. Полный список остаётся в report.json.
            if e.get("failed"):
                from collections import Counter
                by_cause = Counter((f.get("code"), f.get("message"))
                                   for f in e["failed"])
                say(f"  {len(e['failed'])} shot(s) failed, "
                    f"{len(by_cause)} distinct cause(s):")
                for (code, msg), names in _group_failures(e["failed"]).items():
                    shown = ", ".join(names[:4])
                    more = "" if len(names) <= 4 else f" (+{len(names) - 4} more)"
                    say(f"    [{code}] {msg}")
                    say(f"      {len(names)} shot(s): {shown}{more}")

    # Замок ловится ЗДЕСЬ, а не отдаётся трейсбеком: оператор, запустивший
    # команду дважды, должен увидеть инструкцию, а не стек питона. Раунд 8:
    # сообщение было правильным, но приходило как traceback, и на фоне
    # красного стека его никто не читает.
    try:
        report = run_episode(ep, workers=a.workers or None, on_event=show)
    except AlreadyRunning as e:
        msg = {"error": {"code": "ALREADY_RUNNING", "message": str(e)}}
        if a.json:
            print(json.dumps(msg, ensure_ascii=False, indent=1))
        else:
            print(f"\nALREADY RUNNING: {e}", flush=True)
        return 3

    if not a.no_assemble and report["shots_ok"]:
        try:
            asm = assemble(ep)
            # Раскладка кадров и порядок шотов — машинные данные: на серии 314
            # шотов это 1884 строки из 1920, то есть 98% отчёта, который человек
            # открывает утром чтобы узнать три вещи. Оба уже лежат в
            # provenance.jsonl записью master_assembled, откуда по ним отвечает
            # master_frame_report. Раунд 19: в report.json остаётся счёт, а не
            # дубль данных.
            report["assembly"] = {k: v for k, v in asm.items()
                                  if k not in ("layout", "order")}
            report["assembly"]["shots_in_master"] = len(asm.get("order") or [])
            # Отчёт перезаписывается ПОСЛЕ сборки. Раунд 15: report.json писался
            # только в run_episode, до склейки, и результат сборки в него не
            # попадал вообще — при успехе. Оператор утром открывал файл и не
            # находил ни длины мастера, ни пропущенных шотов, ни порчи кадров,
            # хотя в терминале всё это было напечатано.
            (ep.out_dir / "report.json").write_text(
                json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
            if not a.json:
                print(f"master: {asm['master']} — {asm['duration']}s "
                      f"(expected {asm['expected']}s, drift {asm['drift']:+.3f}s), "
                      f"streams {asm['streams']}")
                # Дыра в мастере обязана быть ВИДНА, а не лежать в словаре.
                # Раунд 10: данные о пропущенных шотах были, до терминала не
                # доходили, и оператор утром видел «master: 1.523s» над серией
                # без двух шотов. Тот же класс дефекта, что трейсбек вместо
                # инструкции — верная информация в непригодной подаче.
                if asm.get("reused_segments"):
                    print(f"  reused {len(asm['reused_segments'])} segment(s) "
                          f"unchanged since the last assembly", flush=True)
                if asm.get("short_segments"):
                    print(f"  DAMAGED ARTWORK: {len(asm['short_segments'])} "
                          f"shot(s) lost frames during assembly:", flush=True)
                    for sh in asm["short_segments"]:
                        print(f"    {sh['shot']}: {sh['frames']} of "
                              f"{sh['expected']} frames — a PNG is missing or "
                              f"unreadable", flush=True)
                    print(f"    -> delete these shot folders and re-run the "
                          f"same command to render them again", flush=True)
                if asm["missing_shots"]:
                    print(f"  INCOMPLETE: {len(asm['missing_shots'])} shot(s) "
                          f"missing from the master: "
                          f"{', '.join(asm['missing_shots'])}")
                    print(f"  Re-run the same command to render them, then "
                          f"assemble again.")
                if not asm["in_tolerance"]:
                    print(f"  LENGTH MISMATCH: {asm['drift']:+.3f}s against the "
                          f"shots that went in — frames were lost or doubled.")
        except Exception as e:                              # noqa: BLE001
            # Причина и действие — оператору; лог ffmpeg — в отчёт на диск, для
            # того, кто полезет разбираться. Печатать 1200 символов лога в
            # терминал значит утопить в нём причину (раунд 14).
            report["assembly_error"] = getattr(e, "reason", str(e))
            report["assembly_remedy"] = getattr(e, "remedy", "")
            report["assembly_log"] = getattr(e, "log", "")
            if not a.json:
                print(f"\nASSEMBLY FAILED: {report['assembly_error']}", flush=True)
                if report["assembly_remedy"]:
                    print(f"  -> {report['assembly_remedy']}", flush=True)
                if report["assembly_log"]:
                    print(f"  (ffmpeg log saved to report.json)", flush=True)
            # Отчёт с ошибкой обязан лечь на диск: утро оператора начинается с
            # него, а не с закрытого терминала.
            (ep.out_dir / "report.json").write_text(
                json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
            return 1

    if a.json:
        print(json.dumps(report, ensure_ascii=False, indent=1))
    # Неполный мастер — тоже ненулевой код: скрипт в CI не должен считать
    # «собралось» успехом, если в серии дыра.
    asm = report.get("assembly") or {}
    if (asm.get("missing_shots") or asm.get("short_segments")
            or not asm.get("in_tolerance", True)):
        return 1
    return 0 if report["complete"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
