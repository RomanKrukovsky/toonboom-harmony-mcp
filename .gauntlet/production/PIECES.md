# Pieces

Одна строка на часть: имя в двойных звёздочках, затем `facet:`, затем `capture:` —
next.py читает всё после `capture:` как команду.

**A piece is a promise of rounds.** Rounds are spent per piece, so whatever is not
a piece here simply never gets worked on.

Здесь «play» — то, что конвейер ДЕЛАЕТ, когда его запускают: считает серию. Это и есть
его основная деятельность, аналог игрового цикла. Порядок — по тому, чего конвейер
сейчас не умеет вовсе: очереди нет, возобновления нет, сборки серии нет. Визуал
последний.

В командах ниже `ARTIFACT` — путь, который подставляет next.py (rounds/NN/artifact.*).

Захват для каждой части — не картинка, а **filmstrip + metrics.json**: прогон эпизода
пишет числа (сколько шотов, за сколько, сколько ядер занято, что упало) и полосу
кадров. Полоса показывает то, чего не видно в одном кадре, числа снимают половину линз
бесплатно.

- **очередь эпизода** — facet: play — capture: python3 harmony/client/capture_episode.py --shots 6 --out ARTIFACT
- **возобновление после аварии** — facet: play — capture: python3 harmony/client/capture_resume.py --out ARTIFACT
- **сборка мастера** — facet: content — capture: python3 harmony/client/capture_assembly.py --out ARTIFACT
- **отчёт и прогресс для оператора** — facet: ux — capture: python3 harmony/client/capture_report.py --out ARTIFACT
- **отслеживаемость кадра** — facet: meta — capture: python3 harmony/client/capture_trace.py --out ARTIFACT
- **кадр серии** — facet: visual — capture: python3 harmony/client/capture_frame.py --out ARTIFACT
