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
    Готовность проверяется по ДИСКУ, а не только по журналу.

    Журнал может утверждать, что шот готов, а кадры быть удалены (чистка, полный
    диск, ручное вмешательство). Доверять записи без проверки — значит собрать
    мастер с дырой на месте шота и не заметить.
    """
    if not rec or rec.get("status") != "ok":
        return False
    d = ep.out_dir / s.name
    return len(list(d.glob("f*.png"))) >= s.frames


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
                "dir": str(out), "audio": payload.get("audio")}
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

    journal = read_journal(ep)
    todo = [s for s in ep.shots if not shot_is_done(ep, s, journal.get(s.name))]
    skipped = [s.name for s in ep.shots if s.name not in {t.name for t in todo}]

    t0 = time.monotonic()
    emit = on_event or (lambda e: None)
    emit({"event": "start", "shots": len(ep.shots), "todo": len(todo),
          "resumed": len(skipped), "workers": workers,
          "frames_todo": sum(s.frames for s in todo)})

    results: dict[str, dict] = {n: journal[n] for n in skipped if n in journal}
    done_frames = 0

    def settle(rec: dict, i: int) -> None:
        """Один завершённый шот: в журнал, в результаты, в событие."""
        nonlocal done_frames
        rec["finished_at"] = time.time()
        append_journal(ep, rec)              # пережить kill -9 сразу же
        results[rec["name"]] = rec
        done_frames += rec.get("frames", 0)
        elapsed = time.monotonic() - t0
        rate = done_frames / elapsed if elapsed > 0 else 0.0
        left = sum(s.frames for s in todo) - done_frames
        emit({"event": "shot_done" if rec["status"] == "ok" else "shot_failed",
              "name": rec["name"], "status": rec["status"],
              "done": i, "of": len(todo),
              "frames_per_s": round(rate, 2),
              "eta_s": round(left / rate, 1) if rate > 0 else None,
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
    report = {
        "episode": ep.name, "out_dir": str(ep.out_dir),
        "shots_total": len(ep.shots), "shots_ok": len(ok), "shots_failed": len(failed),
        "resumed": len(skipped), "workers": workers,
        "frames_rendered": frames, "seconds": round(elapsed, 2),
        "frames_per_s": round(frames / elapsed, 2) if elapsed > 0 else 0.0,
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

def assemble(ep: Episode, master: Path | None = None,
             tolerance_s: float = 0.1) -> dict:
    """
    Склеивает шоты в ОДИН мастер в порядке раскадровки, со звуком.

    Порядок берётся из `ep.shots`, а не из имён файлов на диске: сортировка по
    имени поставила бы sc10 перед sc2, и серия вышла бы в неверном порядке —
    ошибка, которую заметит только человек на просмотре.

    Длительность проверяется против суммы шотов: расхождение означает потерянные
    кадры или лишний шот, и молча отдавать такой мастер нельзя.

    Про цену: каждый шот сначала перекодируется в промежуточный сегмент, и это
    выглядит как расточительство. Замерено — 40 шотов собираются за 1.16 с, то
    есть серия из 314 шотов за ~9 с, против ~45 минут счёта. 0.3% времени.
    Сегменты нужны потому, что у шота может быть СВОЙ звук, а concat без
    перекодирования требует совпадения параметров потоков; прямая склейка кадров
    сэкономила бы девять секунд и сломала бы шоты с индивидуальными дорожками.
    """
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        raise RuntimeError("ffmpeg/ffprobe not on PATH")
    master = master or (ep.out_dir / MASTER)
    journal = read_journal(ep)

    parts: list[Path] = []
    missing: list[str] = []
    for s in ep.shots:
        if not shot_is_done(ep, s, journal.get(s.name)):
            missing.append(s.name)
            continue
        seg = ep.out_dir / s.name / "segment.mp4"
        args = ["ffmpeg", "-y", "-framerate", str(s.fps),
                "-i", str(ep.out_dir / s.name / "f%04d.png")]
        if s.audio:
            args += ["-i", s.audio, "-c:a", "aac", "-b:a", "192k",
                     "-map", "0:v:0", "-map", "1:a:0"]
        else:
            # Тишина нужной длины: без звуковой дорожки concat склеит шоты с
            # разъезжающимся звуком у последующих сегментов.
            args += ["-f", "lavfi", "-t", f"{s.seconds:.4f}",
                     "-i", "anullsrc=channel_layout=mono:sample_rate=44100",
                     "-c:a", "aac", "-b:a", "192k",
                     "-map", "0:v:0", "-map", "1:a:0"]
        args += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
                 "-r", str(s.fps), "-shortest", str(seg)]
        r = subprocess.run(args, capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError(f"segment failed for {s.name}: {r.stderr[-400:]}")
        parts.append(seg)

    if not parts:
        raise RuntimeError("nothing to assemble: no completed shots")

    listing = ep.out_dir / "concat.txt"
    listing.write_text("".join(f"file '{p.resolve()}'\n" for p in parts),
                       encoding="utf-8")
    r = subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listing),
         "-c", "copy", str(master)], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"concat failed: {r.stderr[-500:]}")

    info = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "format=duration:stream=codec_type", "-of", "default=nw=1", str(master)],
        capture_output=True, text=True).stdout
    kinds = [l.split("=", 1)[1] for l in info.splitlines() if l.startswith("codec_type")]
    durs = [float(l.split("=", 1)[1]) for l in info.splitlines() if l.startswith("duration")]
    expect = sum(s.seconds for s in ep.shots if s.name not in missing)
    actual = durs[0] if durs else 0.0
    return {
        "master": str(master), "segments": len(parts),
        "streams": kinds, "duration": round(actual, 3),
        "expected": round(expect, 3), "drift": round(actual - expect, 3),
        "in_tolerance": abs(actual - expect) <= tolerance_s,
        "missing_shots": missing,
        "order": [s.name for s in ep.shots if s.name not in missing],
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
    ap.add_argument("--no-assemble", action="store_true")
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
            print(f"  [{p['code']}] {p['message']}")
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

    def show(e: dict) -> None:
        if a.json:
            return
        ev = e.get("event")
        if ev == "start":
            print(f"start: {e['todo']} shots to render "
                  f"({e['resumed']} already done), {e['workers']} workers")
        elif ev in ("shot_done", "shot_failed"):
            tag = "ok  " if ev == "shot_done" else "FAIL"
            eta = f", eta {e['eta_s']}s" if e.get("eta_s") else ""
            extra = f" [{e.get('code')}] {e.get('message')}" if ev == "shot_failed" else ""
            print(f"  {tag} {e['name']}  {e['done']}/{e['of']}  "
                  f"{e['frames_per_s']} fps{eta}{extra}")
        elif ev == "done":
            print(f"rendered {e['frames_rendered']} frames in {e['seconds']}s "
                  f"({e['frames_per_s']} fps), {e['shots_failed']} failed")

    report = run_episode(ep, workers=a.workers or None, on_event=show)

    if not a.no_assemble and report["shots_ok"]:
        try:
            asm = assemble(ep)
            report["assembly"] = asm
            if not a.json:
                print(f"master: {asm['master']} — {asm['duration']}s "
                      f"(expected {asm['expected']}s, drift {asm['drift']:+.3f}s), "
                      f"streams {asm['streams']}")
        except Exception as e:                              # noqa: BLE001
            report["assembly_error"] = str(e)
            if not a.json:
                print(f"assembly failed: {e}")

    if a.json:
        print(json.dumps(report, ensure_ascii=False, indent=1))
    return 0 if report["complete"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
