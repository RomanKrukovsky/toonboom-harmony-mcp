# AI Animation Factory — Phase 1 Walkthrough

## Запуск

```bash
npm run typecheck
npm run build
npm test -- --runInBand
npm run test:python
npm run demo:factory:phase1
```

Демо создаёт новый MP4 с движущейся фигурой и PCM WAV. Затем оно запускает отдельный Python worker, проходит token authentication, создаёт durable job, выполняет OpenCV inference, ретаргетинг, 24 SVG preview и переносит 26 файлов в content-addressed store.

Главный отчёт: `output/factory/phase1_real_demo/factory_job_result.json`.

## Реальные проверки

- входные файлы ненулевые;
- SHA-256 источников записан в provenance;
- наблюдения зависят от пикселей видео;
- audio energy рассчитана из PCM samples;
- preview-файлы существуют и ненулевые;
- job и checkpoints переживают повторное открытие БД;
- повторный ingest использует тот же content hash.

## Ограничения

- OpenCV baseline видит движущийся силуэт и выводит грубую структуру по bbox. Это не RTMPose и не доказательство анатомического pose inference.
- SQLite/local artifacts — dev mode.
- Harmony отсутствует, поэтому TVG, save/reopen/render не проверены.
- Старые MCP tools с mock/placeholder поведением остаются legacy surface и не считаются factory tools.
