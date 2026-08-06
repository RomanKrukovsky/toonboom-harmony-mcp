# Harmony Native Verification — Phase 2

Дата: 2026-07-12. Статус: `requires_real_harmony`.

## Факты

- Пользователь подтвердил, что рабочей лицензированной Harmony в окружении нет.
- Наличие `/Applications/Harmony 25 Premium.app` не считается доказательством: рабочая лицензия и native session не подтверждены.
- Импорт Python DOM вне Harmony не дал рабочую session.
- TVG round-trip, palette, exposures, Pegs, deformers, save/reopen/render и rollback не выполнялись.

## Подготовленный внешний пакет

`output/harmony-integration-package` собран из реального reconstruction demo, а не из пустого manifest.

- source: 12 кадров MP4;
- выбранный вариант: `frame_by_frame_vector`;
- silhouette IoU: 0.916;
- foreground mean error: 5.78;
- centroid trajectory error: 0.94 px;
- package size: 384 KB;
- содержит manifest, command plan, bridge, test scene, previews и run script.

## Офлайн-готовность V4

Без Harmony реализовано и проверено:

- `HarmonyCommandPlanV4` с 44 командами;
- preconditions, destructive level и уникальный idempotency key для каждой команды;
- ожидаемый артефакт и acceptance-проверка для каждого шага;
- обязательная последовательность snapshot → native apply → save → close → reopen → inspect → render → compare → rollback → reopen;
- реальный reconstruction manifest используется как вход;
- runner проверяет inventory и SHA-256;
- bundle включает три реальные нормализованные source PNG;
- runner декодирует PNG чистым Python и считает попиксельный mean absolute error;
- проверяется сохранение TVG, drawing count, непустая геометрия, exposure timing, palette links и Peg после reopen;
- fault injection: изменение `manifest.json` обнаруживается checksum-проверкой и закрывает запуск с ошибкой;
- runner не может вернуть `verified_real` в режиме `--validate-only`;
- переносимый пакет: `output/harmony-phase2-offline-bundle`.

Проверки: 4/4 V4 tests PASS, 2/2 pure-Python runner tests PASS, offline runner validation PASS. Полный regression: Jest 191 PASS / 6 SKIPPED; Python 35 PASS / 1 SKIPPED. Статус остаётся `implemented_unverified`.

## Что требуется для принятия Phase 2

На лицензированной Harmony-машине обязательно выполнить:

```text
create candidate scene
→ create native TVG drawings
→ create palette and colours
→ set exposures
→ create and connect Peg
→ add transform keys
→ save
→ close
→ reopen from disk
→ inspect native entities
→ render
→ compare output
→ inject change
→ rollback
→ reopen and verify rollback
```

До этого Phase 2 не завершена, commit завершения фазы не создаётся, Phase 3 не начинается.
