# Материалы 40-шотового benchmark

Каждый шот получает отдельную папку `p95-01` … `p95-40`. Пустые файлы и заглушки preflight не принимает.

Файлы зависят от `artworkMode`:

- `layered_manifest`: `layered-manifest-v3.json`, соответствующий схеме Production v3. Это не `character-pack.json`.
- `flat_characters`: `character-01.png` … `character-NN.png`, где количество равно `activeCharacterCount`.
- `flat_scene`: `scene.png`.
- Для каждого шота с `hasDialogue: true`: дополнительно `dialogue.wav`.

Главный персонаж всегда соответствует `character-01.png`. Остальные изображения получают стабильные ссылки `<characterId>_support_02`, `<characterId>_support_03` и так далее.

Проверка пяти пилотных шотов:

```bash
npm run moho:v3:preflight95 -- fixtures/moho95/benchmark-manifest.json --pilot
```

Проверка всех 40 шотов:

```bash
npm run moho:v3:preflight95 -- fixtures/moho95/benchmark-manifest.json
```
