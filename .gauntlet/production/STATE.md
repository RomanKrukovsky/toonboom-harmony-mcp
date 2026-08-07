# Gauntlet run — production

Read this first on every invocation. It is the run's memory: everything else in
context can be cleared between rounds and the run still resumes from here.

GOAL: Довести анимационный конвейер до состояния, в котором студия может выпускать серии
KIND: product

## Rules for this run

- Budget: stop after round 40.
- Rounds per firing: 3, then stop, so context never accumulates.
- Rubric is stricter-only. Log every edit here with the reason.

## Decisions taken without asking

<one line each, so the morning review can see what was guessed and when>

## Ledger
| 01 | очередь эпизода | throughput | B | BAR WINS | 12 воркеров дают лишь 1.8× ускорения вместо 8× — почти всё съедает запуск отдельного пр… |
| 02 | очередь эпизода | resilience | B | OURS WINS | NO_FFMPEG выдаётся ДВАЖДЫ одной строкой на две утилиты, а «обрубок в журнале» показывае… |
| 03 | очередь эпизода | resume | A | OURS WINS | возобновление проверено только на демо-серии из 8 шотов по 8 кадров — на 314 шотах журн… |
| 04 | очередь эпизода | assembly | A | BAR WINS | мастер собирается перекодированием каждого шота в промежуточный MP4 (12 сегментов на 12… |
| 05 | очередь эпизода | traceability | B | BAR WINS | правка одной записи даёт 1 жалобу, а удаление и вставка — 345 и 347: подделка середины… |
| 06 | очередь эпизода | operability | A | OURS WINS | из шести проблем preflight одна — BAD_FRAMES — идёт без указания действия, то есть опер… |
