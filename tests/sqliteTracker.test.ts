import { tracker } from '../src/adapters/sqliteTracker.js';

describe('Тестирование SQLite трекера', () => {
  beforeAll(async () => {
    await tracker.initialize();
  });

  afterAll(() => {
    tracker.close();
  });

  test('должен создавать и выводить список производств', async () => {
    const prodName = `Тест Производства ${Date.now()}`;
    const prod = await tracker.createProduction(prodName, 'Тестовое описание');

    expect(prod).toBeDefined();
    expect(prod.id).toBeGreaterThan(0);
    expect(prod.name).toBe(prodName);

    const list = await tracker.listProductions();
    const found = list.find(p => p.name === prodName);
    expect(found).toBeDefined();
    expect(found.description).toBe('Тестовое описание');
  });

  test('должен создавать и выводить список эпизодов', async () => {
    const prod = await tracker.createProduction(`Прод Эпизода ${Date.now()}`);
    const ep = await tracker.createEpisode(prod.id, 'EP101', 'Эпизод 1');

    expect(ep).toBeDefined();
    expect(ep.name).toBe('EP101');

    const list = await tracker.listEpisodes(prod.id);
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('EP101');
  });

  test('должен поддерживать вывод иерархических отчетов', async () => {
    const report = await tracker.generateProductionReport();
    expect(Array.isArray(report)).toBe(true);
  });
});
