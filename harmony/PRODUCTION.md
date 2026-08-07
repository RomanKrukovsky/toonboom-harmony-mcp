# PRODUCTION.md — выпуск серии

Для человека, который будет запускать конвейер. Читать только этот файл; в
исходники заглядывать не нужно.

## Что нужно один раз

```bash
# 1. Blender (бесплатный, лицензия не нужна)
ls "/Applications/Blender.app/Contents/MacOS/Blender"   # должен существовать

# 2. ffmpeg и ffprobe
ffmpeg -version | head -1
ffprobe -version | head -1

# 3. Питон с Pillow
python3 -c "import PIL; print('Pillow', PIL.__version__)"
```

Если Blender лежит в другом месте — `export BLENDER_BIN=/путь/к/Blender`.

## Быстрый старт

Проверить, что конвейер живой, на сгенерированной демо-серии:

```bash
cd harmony/client

# Сухой прогон: только проверки, ничего не считается. Секунды.
python3 episode.py --demo --shots 3 --dry-run

# Настоящий прогон: 3 шота, склейка в мастер.
python3 episode.py --demo --shots 3 --frames 12 --out /tmp/my_first_episode
```

На выходе должно быть примерно это:

```
episode: demo — 3 shots, 36 frames, 1.5s
preflight: ok (~0.0 GB needed, 32.1 GB free)
start: 3 shots to render (0 already done), 12 workers
  ok   sc002  1/3  3.4 fps, eta 7.1s
  ok   sc001  2/3  4.9 fps, eta 2.5s
  ok   sc003  3/3  6.1 fps
rendered 36 frames in 5.9s (6.1 fps), 0 failed
master: /tmp/my_first_episode/master.mp4 — 1.523s (expected 1.5s, drift +0.023s), streams ['video', 'audio']
```

Готовая серия — `master.mp4` в каталоге, который вы указали в `--out`.

Если увидели `preflight: PROBLEMS` — конвейер **не начал** считать и написал, что
именно не так и что с этим делать. Это специально: узнать про кончившееся место
через час рендера дороже, чем сразу.

## Своя серия

Описание серии — один JSON. Минимальный пример:

```json
{
  "name": "e07",
  "outDir": "/Volumes/work/e07/out",
  "shots": [
    { "name": "sc001", "partsJson": "/Volumes/work/chars/masha/parts.json",
      "frames": 96, "fps": 24, "resolution": [1920, 1080],
      "channels": { "arm_near.rot": [[1, -10], [40, -45], [96, 80]] },
      "audio": "/Volumes/work/e07/audio/sc001.wav" },

    { "name": "sc002", "partsJson": "/Volumes/work/chars/masha/parts.json",
      "frames": 120, "fps": 24,
      "lipsync": {
        "phonemes": [{ "sound": "AA", "start": 0.2, "end": 0.6 },
                     { "sound": "EE", "start": 0.6, "end": 1.1 }],
        "mouthMap": { "AA": "A", "EE": "E" },
        "defaultVariant": "flat"
      },
      "audio": "/Volumes/work/e07/audio/sc002.wav" }
  ]
}
```

Запуск:

```bash
python3 episode.py /Volumes/work/e07/episode.json
```

Порядок шотов в мастере — тот, в котором они перечислены в JSON. Не по алфавиту:
`sc10` не встанет перед `sc2`.

Про `partsJson` (набор рисунков персонажа) — отдельный файл `../ARTWORK.md`.

## Что делать, если прогон упал

**Просто запустите ту же команду снова.** Конвейер ведёт журнал и досчитает
только то, чего нет:

```
start: 6 shots to render (2 already done), 12 workers
```

`2 already done` — эти два шота не пересчитываются. Журнал переживает `kill -9`,
выключение питания и закрытый ноутбук.

**Один шот упал, остальные прошли.** Так и задумано: ночной прогон, падающий на
первом плохом рисунке, бесполезен. Сбойный шот назван в отчёте:

```
  FAIL sc003  3/6  [BAD_ARTWORK] 1 blocking artwork problem(s)
```

Почините рисунки этого шота и запустите снова — посчитается только он.

**Отчёт лежит на диске:** `<outDir>/report.json`. Утром смотреть его, а не
закрытый терминал.

## Полезные ключи

| ключ | зачем |
|---|---|
| `--dry-run` | только проверки, ничего не считать |
| `--workers N` | сколько шотов считать одновременно (по умолчанию: ядра минус 2) |
| `--no-assemble` | не склеивать мастер, оставить кадры |
| `--json` | машинный отчёт для скриптов и CI |
| `--out DIR` | куда писать (перекрывает `outDir` из JSON) |

Почему по умолчанию не все ядра: два оставляются системе и ffmpeg. Забрать все —
уйти в свап и получить **большее** общее время.

## Сколько это займёт

На 14 ядрах конвейер выдаёт около **7.4 кадра/с** (замерено). Отсюда:

| объём | кадров | время |
|---|---|---|
| один шот 4 с | 96 | ~13 с |
| минута экрана | 1 440 | ~3 мин |
| серия 22 мин | 31 680 | **~70 мин** |

Оценка честная для этой машины. `eta` в прогрессе считается по фактической
скорости текущего прогона, а не по этой таблице.

## Ночной прогон

```bash
caffeinate -i python3 episode.py /path/episode.json > /tmp/night.log 2>&1
```

`caffeinate -i` не даёт машине уснуть — уснувший ноутбук останавливает прогон
(он возобновится, но утром вы получите половину серии).

Утром: `report.json`, затем `grep FAIL /tmp/night.log`.

## Кто сделал этот кадр

У каждой серии есть журнал происхождения — `provenance.jsonl`. На любой кадр
отвечается, кто рисовал, что сгенерировано, каким сидом, чей стиль использован:

```bash
python3 -c "
from provenance import Ledger
lg = Ledger('/Volumes/work/e07/out/provenance.jsonl')
import json; print(json.dumps(lg.frame_report('e07', 1234), ensure_ascii=False, indent=1))
print('цепочка цела:', lg.verify() == [])
"
```

Записи сцеплены хэшами: переписать одну задним числом нельзя, не сломав
проверку. Это то, что делает конструкцию юридически существующей.

## Границы — честно

**Конвейер не рисует.** Он принимает готовые рисунки (PNG с прозрачностью) и
собирает из них анимацию. Рисует человек, см. `../ARTWORK.md`.

**Конвейер не решает, смешно ли.** Тайминг, липсинк, проверки и рендер — да.
Вкус — нет.

**Harmony не поддерживается на этой машине.** Нет лицензии FlexNet, и код моста
(`packages/mcp-bridge/`) ни разу не исполнялся. Работающий хост — Blender.
