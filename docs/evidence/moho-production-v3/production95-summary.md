# Production95 benchmark

Статус: **не запущен**.

Обновление 2026-09-05: добавлено автоматическое исправление после неудачной
финальной QA. Замечания сохраняются, передаются этапу финальной анимации,
затем повторяются сборка, рендер и QA. Автоматические попытки и отклонения
режиссёра используют общий лимит в две попытки. Утверждённые ключевые позы
сохраняются; ошибки исходного рисунка или рига могут потребовать возврата на
более ранний этап и этим циклом не гарантированно исправляются.
Проверено на тестовых исполнителях; на реальных сценах ещё не проверено.

Программный runner и сбалансированный манифест на 40 шотов готовы. Реальных
успешных шотов пока 0 из 40. Сертификация 38/40 не заявляется.

Для запуска нужны:

- активированный Moho Pro 14;
- ровно 20 утверждённых и лицензированных character packs по формату
  `fixtures/moho95/characters/README.md`, а также материалы всех 40 шотов;
- WAV-файлы для 20 диалоговых шотов;
- настроенные planning и artwork providers;
- Rhubarb Lip Sync и ffmpeg.

Команды:

```bash
RUN_REAL_MOHO_TESTS=1 MOHO_REAL_RIG_EVIDENCE_DIR="$PWD/docs/evidence/moho-production-v3/real-rig-suite" npm test -- --runInBand tests/integration/mohoProductionV3.realRigSuite.test.ts
npm run moho:v3:preflight95 -- fixtures/moho95/benchmark-manifest.json --pilot
npm run moho:v3:benchmark95 -- fixtures/moho95/benchmark-manifest.json --pilot
npm run moho:v3:preflight95 -- fixtures/moho95/benchmark-manifest.json
npm run moho:v3:benchmark95 -- fixtures/moho95/benchmark-manifest.json
npm run moho:v3:certify -- --profile production95 docs/evidence/moho-production-v3/production95-report.json
```

Runner сохраняет состояние после каждого шота и продолжает незавершённый прогон.
Заблокированный, упавший или частично отрендеренный шот никогда не отмечается
успешным. Код завершения runner теперь определяется тем же строгим
сертификатором, а не простым подсчётом статусов `completed`.

Пилот использует пять заранее выбранных шотов разных категорий и пишет отдельный
`production95-pilot-report.json`, не перезаписывая основной отчёт. На approval-гейте
runner останавливается. Режиссёр добавляет решение с точными `shotId`, `gate` и
`approvalId` в `fixtures/moho95/director-approvals.json`, после чего повторная
команда продолжает тот же job. Автоматические approvals не засчитываются.
Сертификатор требует три решения из внешнего файла, совпадение доказательств
вызовов моделей с метриками и реальные SHA-256 непустых `.moho`/`.mp4` файлов.

Текущий локальный preflight пилота от 2026-09-05:

- ffmpeg, ffprobe, Rhubarb 1.14.0, манифест и файл approvals проходят;
- настройки провайдеров и директорский токен ещё не заданы;
- проверка CLI подтвердила, что рендер Moho Pro не лицензирован; найдено 0 из 20 пакетов персонажей;
- восемь материалов пяти пилотных сцен ещё не переданы.

Проверка сохранённых изменений от 2026-09-05:

- сборка TypeScript в составе `npm run moho:v3:preflight95` прошла;
- `npm run test:moho:v3`: 18 наборов, 66 тестов прошли;
- `python3 -m unittest pipeline.tests.test_moho_native_acceptance -v`:
  6 тестов прошли, 2 реальных интеграционных теста пропущены;
- `git diff --check`: ошибок нет.

Сам preflight завершился кодом 1 (`ready: false`) из-за перечисленных внешних
условий. Пилот и полный benchmark не запускались; успешные модульные тесты
не подтверждают качество реального рига или анимации.
