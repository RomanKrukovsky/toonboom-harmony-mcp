# Лицензированные персонажи для проверки 19/20

Эта папка намеренно не содержит чужих изображений. Положите сюда ровно 20 папок — по одной на лицензированного персонажа:

```text
characters/
  character-01/
    fixture.json
    character-pack.json
    artwork-pack-v3.json
    rig-blueprint-v3.json
    expected-native-structure.json
    assets/...
  ...
  character-20/
```

`character-pack.json` обязан проходить `moho.character_pack.validate`. Пути к изображениям в обоих пакетах задаются относительно папки персонажа.

`fixture.json`:

```json
{
  "characterId": "licensed-character-01",
  "manualMohoEdits": 0,
  "startFrame": 1,
  "endFrame": 24,
  "fps": 24,
  "width": 1280,
  "height": 720
}
```

`expected-native-structure.json` хранит независимо утверждённую структуру рига: ID и порядок слоёв, кости и их родителей, привязки, варианты Switch, Smart Actions, число точек Smart Warp и Vitruvian-группы. Его нельзя получать копированием результата проверяемого запуска.

Запуск с сохранением доказательств:

```bash
RUN_REAL_MOHO_TESTS=1 \
MOHO_REAL_RIG_EVIDENCE_DIR="$PWD/docs/evidence/moho-production-v3/real-rig-suite" \
npm test -- --runInBand tests/integration/mohoProductionV3.realRigSuite.test.ts
```

Тест закрыт по умолчанию. При запуске он требует ровно 20 пакетов, делает сборку и свежий open/save/reopen в Moho, рендерит первый/средний/последний кадры до и после сохранения и принимает результат только при 19 или 20 успешных ригах без ручных правок.
