/**
 * toolNames.test.ts — карта переименования Moho-тулов.
 *
 * ЗАЧЕМ ЭТОТ ТЕСТ СУЩЕСТВУЕТ. Moho-тулы приехали из своего репозитория как
 * `document_getInfo`, а в едином сервере должны называться
 * `moho.document.get_info`. Карта в src/moho/toolNames.ts — единственное место,
 * где живёт это соответствие, и она СВЯЗЫВАЕТ ДВА НЕЗАВИСИМЫХ ФАЙЛА:
 * `src/moho/tools.ts` регистрирует старые имена, коллектор переименовывает их
 * по карте. Ключи карты не проверяются компилятором против tools.ts — тип
 * `Record<string, string>` примет любую строку. Значит, забытый тул или лишняя
 * запись не дадут ошибки сборки; поймать их может только тест.
 *
 * КРИТИЧЕСКИЙ ИНВАРИАНТ, КОТОРЫЙ ЗДЕСЬ НЕ ПРОВЕРЯЕТСЯ. Имя MCP-тула не равно
 * имени Lua-метода в плагине: тул `moho.document.get_info` вызывает Lua-метод
 * `document.getInfo`. Строки Lua-методов уходят в `safeSend(...)` и этой картой
 * не управляются. Тест намеренно не трогает их: он про границу MCP.
 */

import { MOHO_TOOL_NAMES, allMohoToolNames, renamed } from '../../src/moho/toolNames.js';
import { buildMohoTools } from '../../src/moho/mohoTools.js';

/** Сколько тулов Moho отдаёт сервер. Число зафиксировано контрактом. */
const EXPECTED_TOOL_COUNT = 59;

/**
 * Форма нового имени: `moho.<домен>.<действие>`.
 *
 * Домен — только строчные буквы и `_`, действие — плюс цифры. camelCase-остаток
 * (`get_Info`, `setFrame`) регуляркой не пройдёт: заглавных в классах нет.
 */
const NAME_SHAPE = /^moho\.[a-z_]+\.[a-z0-9_]+$/;

describe('toolNames: карта переименования Moho-тулов', () => {
  const oldNames = Object.keys(MOHO_TOOL_NAMES);
  const newNames = Object.values(MOHO_TOOL_NAMES);

  describe('размер и форма', () => {
    it(`содержит ровно ${EXPECTED_TOOL_COUNT} записей`, () => {
      expect(oldNames).toHaveLength(EXPECTED_TOOL_COUNT);
      expect(newNames).toHaveLength(EXPECTED_TOOL_COUNT);
    });

    it('все новые имена начинаются с "moho."', () => {
      // Без префикса тул затерялся бы среди 570 Harmony-тулов, и по имени было
      // бы не видно, к какому пакету анимации он относится.
      const foreign = newNames.filter(name => !name.startsWith('moho.'));
      expect(foreign).toEqual([]);
    });

    it('ни одно новое имя не начинается с "harmony."', () => {
      expect(newNames.filter(name => name.startsWith('harmony.'))).toEqual([]);
    });

    it('все новые имена в snake_case без camelCase-остатков', () => {
      const malformed = newNames.filter(name => !NAME_SHAPE.test(name));
      if (malformed.length > 0) {
        throw new Error(
          `имена не соответствуют moho.<домен>.<действие> в snake_case:\n` +
            malformed.map(n => `  ${n}`).join('\n')
        );
      }
      expect(malformed).toEqual([]);
    });

    it('ни в одном новом имени нет заглавных букв', () => {
      // Отдельно от регулярки: явное утверждение про то, ради чего вообще
      // затевалось переименование — `document_getInfo` -> `document.get_info`.
      const withUppercase = newNames.filter(name => name !== name.toLowerCase());
      expect(withUppercase).toEqual([]);
    });

    it('каждое новое имя состоит ровно из трёх сегментов через точку', () => {
      const wrongDepth = newNames.filter(name => name.split('.').length !== 3);
      expect(wrongDepth).toEqual([]);
    });

    it('старые имена сохранены в исходном виде: подчёркивание плюс camelCase', () => {
      // Ключи — контракт с tools.ts. Их «причёсывание» разорвало бы карту:
      // коллектор искал бы `document_get_info`, а регистрируется `document_getInfo`.
      const malformed = oldNames.filter(name => !/^[a-z]+_[A-Za-z][A-Za-z_]*$/.test(name));
      expect(malformed).toEqual([]);
    });

    it('домен нового имени согласован с префиксом старого', () => {
      // `layer_selectLayer -> moho.bone.select` было бы синтаксически валидным,
      // но увело бы тул в чужой домен.
      const mismatched = oldNames
        .filter(oldName => {
          const domain = oldName.split('_')[0];
          return !MOHO_TOOL_NAMES[oldName].startsWith(`moho.${domain}.`);
        })
        .map(oldName => `${oldName} -> ${MOHO_TOOL_NAMES[oldName]}`);
      expect(mismatched).toEqual([]);
    });
  });

  describe('уникальность: два старых имени не ведут в одно новое', () => {
    it('все новые имена различны', () => {
      // Схлопывание двух тулов в одно имя — потеря тула. Коллектор бросит на
      // втором, но сообщение будет про дубликат, а не про то, какой тул исчез.
      const seen = new Map<string, string[]>();
      for (const oldName of oldNames) {
        const newName = MOHO_TOOL_NAMES[oldName];
        if (!seen.has(newName)) seen.set(newName, []);
        seen.get(newName)!.push(oldName);
      }

      const collisions = [...seen.entries()].filter(([, sources]) => sources.length > 1);
      if (collisions.length > 0) {
        const rendered = collisions
          .map(([newName, sources]) => `  ${newName} <- ${sources.join(', ')}`)
          .join('\n');
        throw new Error(`несколько старых имён ведут в одно новое (потеря тула):\n${rendered}`);
      }
      expect(collisions).toEqual([]);
    });

    it('множество новых имён того же размера, что и множество ключей', () => {
      expect(new Set(newNames).size).toBe(oldNames.length);
    });

    it('старые имена уникальны как ключи объекта', () => {
      expect(new Set(oldNames).size).toBe(oldNames.length);
    });
  });

  describe('renamed()', () => {
    it('возвращает новое имя для каждого известного старого', () => {
      for (const oldName of oldNames) {
        expect(renamed(oldName)).toBe(MOHO_TOOL_NAMES[oldName]);
      }
    });

    it.each([
      'document_getInfo',
      'layer_selectLayer',
      'bone_createBone',
      'animation_setKeyframe',
      'system_sloSnapshot'
    ])('renamed(%p) даёт ожидаемое имя из карты', oldName => {
      expect(renamed(oldName)).toBe(MOHO_TOOL_NAMES[oldName]);
      expect(renamed(oldName)).toMatch(NAME_SHAPE);
    });

    it.each([
      'document_getInfoo',
      'layer_unknownAction',
      'moho.document.get_info',
      'harmony.scene.open_project',
      '',
      'document_getinfo',
      'layer_getproperties'
    ])('renamed(%p) бросает, а не возвращает undefined', unknownName => {
      // Тихий `undefined` дошёл бы до коллектора и зарегистрировал тул под
      // именем `undefined` — тул был бы недоступен, а причина неочевидна.
      // Два последних случая — потеря регистра: карта чувствительна к нему,
      // и «почти правильное» имя должно отвергаться так же явно, как чужое.
      expect(() => renamed(unknownName)).toThrow();
      let returned: string | 'НЕ ВЕРНУЛ' = 'НЕ ВЕРНУЛ';
      try {
        returned = renamed(unknownName);
      } catch {
        // Ожидаемо.
      }
      expect(returned).toBe('НЕ ВЕРНУЛ');
    });

    it('сообщение об ошибке называет проблемное имя', () => {
      expect(() => renamed('document_getInfoo')).toThrow(/document_getInfoo/);
    });

    it('не переименовывает уже переименованное имя (не идемпотентен по замыслу)', () => {
      // Двойной прогон через renamed — признак ошибки в вызывающем коде.
      // Карта должна об этом сообщить, а не вернуть что-то похожее на правду.
      expect(() => renamed('moho.document.get_info')).toThrow();
    });

    /**
     * ЗАКРЫТЫЙ ДЕФЕКТ (оставлено под охраной теста).
     *
     * `renamed()` раньше искал имя через `MOHO_TOOL_NAMES[oldName]`, то есть по
     * всей цепочке прототипов. Для `toString`, `constructor`, `valueOf`,
     * `hasOwnProperty` возвращалась унаследованная от `Object.prototype`
     * ФУНКЦИЯ, и проверка `if (!next)` её не отсекала, потому что функция
     * истинна: вместо честного отказа наружу уходила нативная функция.
     *
     * Исправлено переходом на `Object.hasOwn`. Оба теста ниже оставлены как
     * охрана: один держит границу самой функции, другой — свойство данных
     * (ни один ключ карты не пересекается с `Object.prototype`).
     */
    it('ни один ключ карты не совпадает с членом Object.prototype', () => {
      // Свойство данных, независимое от реализации renamed(): даже если проверку
      // в функции однажды ослабят, эта строка покажет, что карта чиста.
      const inherited = oldNames.filter(name => !Object.hasOwn(MOHO_TOOL_NAMES, name));
      expect(inherited).toEqual([]);
    });

    it('renamed отказывает на членах Object.prototype', () => {
      // Раньше здесь фиксировался ДЕФЕКТ: поиск шёл обычным доступом по ключу,
      // поэтому renamed('toString') возвращал Object.prototype.toString —
      // проверка `if (!next)` не отсекает истинную функцию. Дефект закрыт
      // переходом на Object.hasOwn, и тест переписан на желаемое поведение.
      for (const inherited of ['toString', 'constructor', '__proto__', 'valueOf', 'hasOwnProperty']) {
        expect(() => renamed(inherited)).toThrow(/отсутствует в карте переименования/);
      }
    });

    it('renamed отказывает на легаси-алиасах старого репозитория и объясняет причину', () => {
      // Алиасы вида moho_doc_info вводили ТРЕТЬЮ конвенцию имён поверх
      // harmony.* и moho.*, поэтому в едином сервере не поддерживаются.
      // Важно, что отказ отличается от «забытого тула»: это разные ситуации,
      // и по сообщению должно быть видно, какая именно.
      expect(() => renamed('moho_doc_info')).toThrow(/Легаси-алиас/);
      expect(() => renamed('moho_batch_execute')).toThrow(/MOHO_MCP_ENABLE_LEGACY_ALIASES/);
      // Незнакомое имя даёт ДРУГОЕ сообщение — про отсутствие в карте.
      expect(() => renamed('document_somethingNew')).toThrow(/отсутствует в карте переименования/);
    });
  });

  describe('allMohoToolNames()', () => {
    it('отдаёт все новые имена', () => {
      expect(allMohoToolNames().sort()).toEqual([...newNames].sort());
      expect(allMohoToolNames()).toHaveLength(EXPECTED_TOOL_COUNT);
    });
  });

  describe('карта неизменяема', () => {
    it('заморожена, чтобы имена не подменялись в рантайме', () => {
      expect(Object.isFrozen(MOHO_TOOL_NAMES)).toBe(true);
    });

    it('allMohoToolNames возвращает копию: правка результата не портит карту', () => {
      const snapshot = [...newNames];
      const list = allMohoToolNames();
      list.push('moho.fake.tool');
      list[0] = 'moho.fake.overwritten';
      expect(Object.values(MOHO_TOOL_NAMES)).toEqual(snapshot);
    });
  });

  /**
   * ЯДРО ФАЙЛА. Карта и tools.ts — два независимых файла без связи через
   * типы. Здесь они сверяются по факту: набор имён, реально вышедших из
   * `buildMohoTools()`, должен совпадать с `Object.values(MOHO_TOOL_NAMES)`.
   *
   * Расхождение в любую сторону — дефект:
   *   лишнее в карте  -> запись для тула, которого нет (мёртвый нейминг);
   *   лишнее в наборе -> тул зарегистрирован, но не переименован (упал бы
   *                      на старте `ANIM_HOST=moho`, но не в сборке).
   */
  describe('карта соответствует реально зарегистрированным тулам', () => {
    // Сборка обёрнута в try/catch намеренно. `buildMohoTools()` БРОСАЕТ, если
    // карта свела два тула в одно имя (коллектор ловит дубликат). Прямой вызов
    // в теле describe уронил бы загрузку файла целиком — Jest напечатал бы
    // «Tests: 0 total», и было бы не видно, какой именно инвариант нарушен.
    // Здесь отказ сборки превращается в конкретный падающий тест.
    let registered: string[] = [];
    let buildError: Error | undefined;

    try {
      registered = buildMohoTools().map(tool => tool.name);
    } catch (caught) {
      buildError = caught as Error;
    }

    it('buildMohoTools собирается без ошибок', () => {
      // Типичная причина падения — дубликат имени после переименования, то есть
      // потеря тула. Сообщение коллектора называет оба имени.
      if (buildError) {
        throw new Error(`buildMohoTools() не смог собрать набор тулов: ${buildError.message}`);
      }
      expect(buildError).toBeUndefined();
    });

    it('оба сравниваемых множества непусты', () => {
      // Страховка от вакуумного ассерта: два пустых набора «совпадают» всегда.
      expect(registered.length).toBeGreaterThan(0);
      expect(newNames.length).toBeGreaterThan(0);
      expect(registered).toHaveLength(EXPECTED_TOOL_COUNT);
    });

    it('набор имён из buildMohoTools совпадает с картой', () => {
      const inMap = new Set(newNames);
      const inRegistry = new Set(registered);

      const missingFromRegistry = [...inMap].filter(name => !inRegistry.has(name));
      const missingFromMap = [...inRegistry].filter(name => !inMap.has(name));

      if (missingFromRegistry.length > 0 || missingFromMap.length > 0) {
        throw new Error(
          'карта переименования расходится с набором зарегистрированных тулов:\n' +
            (missingFromRegistry.length
              ? `  есть в карте, но тул не регистрируется:\n${missingFromRegistry
                  .map(n => `    ${n}`)
                  .join('\n')}\n`
              : '') +
            (missingFromMap.length
              ? `  тул регистрируется, но отсутствует в карте:\n${missingFromMap
                  .map(n => `    ${n}`)
                  .join('\n')}`
              : '')
        );
      }

      expect([...inRegistry].sort()).toEqual([...inMap].sort());
    });

    it('регистрирует ровно столько тулов, сколько записей в карте', () => {
      expect(registered).toHaveLength(Object.keys(MOHO_TOOL_NAMES).length);
    });

    it('не регистрирует один и тот же тул дважды', () => {
      // Коллектор бросает на дубликате, но набор мог бы прийти и другим путём.
      expect(new Set(registered).size).toBe(registered.length);
    });

    it('каждое зарегистрированное имя проходит проверку формы', () => {
      const malformed = registered.filter(name => !NAME_SHAPE.test(name));
      expect(malformed).toEqual([]);
    });
  });
});
