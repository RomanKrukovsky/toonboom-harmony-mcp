# Deliverable — what "done" means for this product

The definition of done, written before round 1 and ticked as it is met. **next.py
will not open a quality round while any gate here is unchecked.** That refusal is
the point of this file: a gauntlet is a polishing loop, and polishing something
that cannot yet be played end to end produces a beautiful thing that is not the
thing that was asked for.

Продукт здесь — **конвейер выпуска серий**, а не кадр и не ролик. Гейт считается
взятым, только когда его `check:` реально проходит на этой машине.

## Gates

- [x] Серия ставится в очередь ОДНОЙ командой из описания эпизода (список шотов) — check: python3 harmony/client/episode.py --demo --shots 3 --dry-run
- [x] Шоты считаются параллельно по ядрам, а не по одному — check: python3 harmony/client/test_episode.py
- [x] Прогон возобновляется после kill -9: досчитывается остаток, готовые шоты не пересчитываются — check: python3 harmony/client/smoke_resume.py
- [x] Битый шот не роняет серию: остальные доходят, сбойный назван в отчёте — check: python3 harmony/client/smoke_partial_failure.py
- [x] Отсутствие Blender/ffmpeg/места ловится ДО начала счёта с внятной ошибкой — check: python3 harmony/client/test_preflight.py
- [x] На выходе один мастер: видео+звук, длительность равна сумме шотов ±0.1с, порядок по раскадровке — check: python3 harmony/client/smoke_assemble.py
- [x] Виден прогресс: сколько шотов готово, сколько осталось, сколько времени займёт — check: python3 harmony/client/test_episode.py
- [x] На случайный кадр серии отвечается кто/чем/каким сидом, цепочка хэшей цела — check: python3 harmony/client/smoke_traceability.py
- [x] Конвейер запускается по документации человеком, не читавшим исходники — check: manual: открыть harmony/PRODUCTION.md, выполнить раздел «Быстрый старт» ничего больше не читая
- [x] Ни один shipped-модуль не содержит заглушек, TODO и мёртвого кода — check: python3 harmony/client/test_no_placeholders.py

## Что НЕ является гейтом

Визуальное качество кадра. Оно — одна грань из шести в `PIECES.md` и идёт последней.
Гейт про рисунок здесь означал бы, что серия не может быть сдана, пока картинка не
идеальна, а это неверно: студия сдаёт серии с картинкой «достаточно», но никогда не
сдаёт серию, которая не собралась.
