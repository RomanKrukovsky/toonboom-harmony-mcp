# Round 06 — очередь эпизода — lens: operability

WINNER: A
GAP: из шести проблем preflight одна — BAD_FRAMES — идёт без указания действия, то есть оператор видит «sc001: frames=0» и не знает, где это править
WHY: бар требует три вещи: одна команда, понятный прогресс, внятные ошибки с
указанием что делать. Первые две наша сторона закрывает и это проверено машинно, а
не мнением автора: обе команды «Быстрого старта» вынуты из PRODUCTION.md и
выполнены дословно в чистом каталоге (код выхода 0, 0.3 с и 4.0 с), прогресс
отвечает на все шесть вопросов оператора — объём, потоки, позиция, скорость, ETA,
итог. Третье требование выполнено на 5 из 6: BAD_FRAMES не несёт remedy.
Разрыв малый, но именно он — предмет линзы: ошибка без действия в три ночи ничем не
лучше отсутствия ошибки, а «почти все ошибки объясняют себя» для оператора значит
«однажды не объяснит».
FIX: добавить remedy к BAD_FRAMES с указанием, где именно правится длина шота.

## Reveal

- A = candidate
- B = reference
- picked: A → **OURS WINS**
- You picked A, which was the candidate.
- Self-recognition check: you built this candidate, so you may have recognised it rather than judged it. Re-read the rubric line you scored on — if your stated reason does not survive that re-read, treat this as BAR WINS and keep going.
