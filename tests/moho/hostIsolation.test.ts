/**
 * hostIsolation.test.ts — два набора тулов не пересекаются.
 *
 * ЗАЧЕМ ЭТОТ ТЕСТ СУЩЕСТВУЕТ. Это главное свойство новой архитектуры: сервер
 * обслуживает два пакета анимации, но НИКОГДА оба сразу. `ANIM_HOST` выбирает
 * один набор, и наборы обязаны быть разделены по именам.
 *
 * ЧТО СЛОМАЕТСЯ, ЕСЛИ ИЗОЛЯЦИЯ ПОТЕЧЁТ. Диспетчер в src/index.ts находит тул
 * через `this.tools.find(t => t.name === name)` — по первому совпадению. Одно
 * и то же имя в двух наборах означает, что выбор зависит от порядка спреда в
 * массиве, а не от хоста. Тул-тень не даёт ни ошибки сборки, ни исключения в
 * рантайме: он просто молча выполняет чужую работу. Именно поэтому пересечение
 * проверяется отдельным утверждением, а не выводится из проверки префиксов.
 *
 * КАК СОБИРАЮТСЯ НАБОРЫ. `resolveActiveTools()` из src/index.ts не
 * экспортируется, и править этот файл нельзя (владелец — координатор). Поэтому
 * Harmony-набор собирается здесь тем же способом, что и там: список групп
 * читается из литерала `harmonyTools` в src/index.ts, а сами группы
 * импортируются из src/tools/*. Разбор источника, а не хардкод списка: иначе
 * добавленная кем-то группа осталась бы вне проверки, и тест давал бы ложное
 * «изоляция цела» на неполном наборе.
 */

import fs from 'fs';
import path from 'path';
import type { z } from 'zod';
import type { TypedTool } from '../../src/tools/defineTool.js';
import { buildMohoTools } from '../../src/moho/mohoTools.js';
import { MOHO_TOOL_NAMES } from '../../src/moho/toolNames.js';

const REPO_ROOT = process.cwd();
const INDEX_FILE = path.join(REPO_ROOT, 'src', 'index.ts');
const TOOLS_DIR = path.join(REPO_ROOT, 'src', 'tools');

/** Сколько тулов отдаёт Moho. Зафиксировано контрактом. */
const EXPECTED_MOHO_COUNT = 59;

/**
 * Нижняя граница набора Harmony.
 *
 * Порог, а не точное число: Harmony-тулы добавляют другие люди, и падение
 * этого файла на каждом новом туле было бы шумом. Но набор не должен
 * схлопнуться: если групп импортировано мало, проверка пересечения стала бы
 * почти вакуумной, а тест — зелёным без содержания.
 */
const MIN_HARMONY_COUNT = 500;

type AnyTool = TypedTool<z.ZodTypeAny>;

/** Имена групп, реально спреднутых в литерал `harmonyTools` в src/index.ts. */
function readHarmonyGroupNames(source: string): string[] {
  const block = source.match(/const harmonyTools = \[([\s\S]*?)\n\];/);
  if (!block) {
    throw new Error(
      'не найден литерал `const harmonyTools = [...]` в src/index.ts — ' +
        'набор Harmony собрать нечем, тест не может судить об изоляции'
    );
  }
  return [...block[1].matchAll(/\.\.\.(\w+)/g)].map(match => match[1]);
}

/** Соответствие «имя группы -> модуль в src/tools», взятое из импортов src/index.ts. */
function readToolModuleMap(source: string): Map<string, string> {
  const byExport = new Map<string, string>();
  for (const match of source.matchAll(/import \{ (\w+) \} from '\.\/tools\/(\w+)\.js';/g)) {
    byExport.set(match[1], match[2]);
  }
  return byExport;
}

/** Все группы тулов, экспортированные из src/tools/*.ts. */
function readExportedGroupNames(): { group: string; file: string }[] {
  const found: { group: string; file: string }[] = [];
  for (const file of fs.readdirSync(TOOLS_DIR).filter(name => name.endsWith('.ts'))) {
    // defineTool.ts — инфраструктура; в его доккоментариях есть примеры вида
    // `export const xTools = ...`, которые не являются настоящими экспортами.
    if (file === 'defineTool.ts') continue;
    const source = fs.readFileSync(path.join(TOOLS_DIR, file), 'utf8');
    for (const match of source.matchAll(/export const (\w+Tools)\b/g)) {
      found.push({ group: match[1], file });
    }
  }
  return found;
}

/** Собирает Harmony-набор так же, как это делает src/index.ts. */
async function loadHarmonyTools(): Promise<AnyTool[]> {
  const source = fs.readFileSync(INDEX_FILE, 'utf8');
  const groups = readHarmonyGroupNames(source);
  const modules = readToolModuleMap(source);

  const collected: AnyTool[] = [];
  for (const group of groups) {
    const moduleName = modules.get(group);
    if (!moduleName) {
      throw new Error(`группа ${group} спреднута в harmonyTools, но её импорт не найден в src/index.ts`);
    }

    const modulePath = path.join(TOOLS_DIR, `${moduleName}.ts`);
    const imported = (await import(modulePath)) as Record<string, unknown>;
    const tools = imported[group];
    if (!Array.isArray(tools)) {
      throw new Error(`экспорт ${group} из src/tools/${moduleName}.ts не массив тулов`);
    }
    collected.push(...(tools as AnyTool[]));
  }
  return collected;
}

describe('изоляция хостов: наборы тулов Harmony и Moho', () => {
  let harmony: AnyTool[];
  let moho: AnyTool[];

  beforeAll(async () => {
    harmony = await loadHarmonyTools();
    moho = buildMohoTools();
  }, 120_000);

  describe('оба набора реально собраны', () => {
    // Первым делом: дальнейшие проверки на пустых массивах прошли бы вакуумно.
    // Пересечение пустого множества с чем угодно пусто, и тест был бы зелёным,
    // ничего не проверив.

    it('набор Moho непуст и содержит ожидаемое число тулов', () => {
      expect(moho.length).toBe(EXPECTED_MOHO_COUNT);
    });

    it('набор Harmony непуст и не схлопнулся', () => {
      expect(harmony.length).toBeGreaterThanOrEqual(MIN_HARMONY_COUNT);
    });

    it('наборы различны по размеру и не являются одним и тем же массивом', () => {
      expect(harmony).not.toBe(moho);
      expect(harmony.length).not.toBe(moho.length);
    });
  });

  describe('набор Moho не содержит ничего от Harmony', () => {
    it('ни один тул Moho не начинается с "harmony."', () => {
      const leaked = moho.filter(tool => tool.name.startsWith('harmony.')).map(tool => tool.name);
      expect(leaked).toEqual([]);
    });

    it('все 59 тулов Moho начинаются с "moho."', () => {
      const foreign = moho.filter(tool => !tool.name.startsWith('moho.')).map(tool => tool.name);
      expect(foreign).toEqual([]);
      expect(moho).toHaveLength(EXPECTED_MOHO_COUNT);
    });

    it('набор Moho совпадает по именам с картой переименования', () => {
      expect([...moho.map(tool => tool.name)].sort()).toEqual([...Object.values(MOHO_TOOL_NAMES)].sort());
    });

    it('имена в наборе Moho уникальны', () => {
      const names = moho.map(tool => tool.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('набор Harmony не содержит ничего от Moho', () => {
    it('ни один тул Harmony не начинается с "moho."', () => {
      // Прямая проверка того, что Moho не «просочился» в общий массив: при
      // ANIM_HOST=harmony мост Moho вообще не должен подключаться.
      const leaked = harmony.filter(tool => tool.name.startsWith('moho.')).map(tool => tool.name);
      expect(leaked).toEqual([]);
    });

    it('все тулы Harmony начинаются с "harmony."', () => {
      const foreign = harmony.filter(tool => !tool.name.startsWith('harmony.')).map(tool => tool.name);
      expect(foreign).toEqual([]);
    });

    it('имена в наборе Harmony уникальны', () => {
      // Тень внутри одного набора так же невидима, как тень между наборами.
      const names = harmony.map(tool => tool.name);
      const duplicates = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];
      expect(duplicates).toEqual([]);
    });

    it('ни одно имя Harmony не совпадает со СТАРЫМ именем Moho-тула', () => {
      // Старые имена (`document_getInfo`) больше не выходят наружу, но если
      // они где-то остались в Harmony-наборе, переименование прошло не до конца.
      const oldNames = new Set(Object.keys(MOHO_TOOL_NAMES));
      const collisions = harmony.filter(tool => oldNames.has(tool.name)).map(tool => tool.name);
      expect(collisions).toEqual([]);
    });
  });

  describe('пересечение имён пусто', () => {
    // ЯДРО ФАЙЛА. Одинаковое имя в двух наборах = непредсказуемый выбор в
    // диспетчере: `find` вернёт первый по порядку спреда, а не тул активного
    // хоста. Ошибка не проявится ни в сборке, ни в исключении — только в
    // неверном поведении.

    it('множества имён не имеют общих элементов', () => {
      const harmonyNames = new Set(harmony.map(tool => tool.name));
      const shared = moho.map(tool => tool.name).filter(name => harmonyNames.has(name));

      if (shared.length > 0) {
        throw new Error(
          'имена присутствуют в обоих наборах — диспетчер выберет тул по порядку ' +
            `спреда, а не по активному хосту:\n${shared.map(name => `  ${name}`).join('\n')}`
        );
      }
      expect(shared).toEqual([]);
    });

    it('пересечение проверено на непустых множествах', () => {
      // Утверждение о том, что предыдущий тест не был вакуумным.
      expect(new Set(harmony.map(t => t.name)).size).toBeGreaterThanOrEqual(MIN_HARMONY_COUNT);
      expect(new Set(moho.map(t => t.name)).size).toBe(EXPECTED_MOHO_COUNT);
    });

    it('объединение наборов не создаёт теней: уникальных имён ровно столько, сколько тулов', () => {
      // Прямая модель того, что произошло бы при регистрации обоих наборов:
      // счётчики должны совпасть, иначе часть тулов недостижима.
      const all = [...harmony, ...moho].map(tool => tool.name);
      expect(new Set(all).size).toBe(all.length);
      expect(all).toHaveLength(harmony.length + moho.length);
    });

    it('префиксы наборов взаимно исключающи', () => {
      // Разделение держится на префиксе, поэтому оно зафиксировано явно:
      // ни один тул не может относиться к обоим хостам.
      for (const tool of [...harmony, ...moho]) {
        const isHarmony = tool.name.startsWith('harmony.');
        const isMoho = tool.name.startsWith('moho.');
        expect(isHarmony && isMoho).toBe(false);
        expect(isHarmony || isMoho).toBe(true);
      }
    });
  });

  describe('каждый тул обоих наборов пригоден для диспетчера', () => {
    /**
     * Диспетчер делает ровно две вещи с каждым тулом: показывает описание в
     * ListTools и валидирует аргументы через `inputSchema.safeParse`. Тул без
     * описания модель не выберет; тул без работающей схемы уронит вызов.
     */
    function describeFailures(tools: AnyTool[], label: string): void {
      const noDescription: string[] = [];
      const noSchema: string[] = [];
      const brokenParse: string[] = [];

      for (const tool of tools) {
        if (typeof tool.description !== 'string' || tool.description.trim().length === 0) {
          noDescription.push(tool.name);
        }

        const schema = tool.inputSchema as { safeParse?: unknown } | undefined;
        if (typeof schema?.safeParse !== 'function') {
          noSchema.push(tool.name);
          continue;
        }

        try {
          // Пустой объект: интересует не результат валидации, а что safeParse
          // отрабатывает и возвращает нормальную форму `{ success: boolean }`.
          const result = (tool.inputSchema as z.ZodTypeAny).safeParse({});
          if (typeof result?.success !== 'boolean') brokenParse.push(tool.name);
        } catch (error) {
          brokenParse.push(`${tool.name}: ${(error as Error).message}`);
        }
      }

      expect({ label, noDescription, noSchema, brokenParse }).toEqual({
        label,
        noDescription: [],
        noSchema: [],
        brokenParse: []
      });
    }

    it('у каждого тула Moho есть непустое описание и работающий safeParse', () => {
      describeFailures(moho, 'moho');
    });

    it('у каждого тула Harmony есть непустое описание и работающий safeParse', () => {
      describeFailures(harmony, 'harmony');
    });

    it('у каждого тула обоих наборов есть вызываемый handler', () => {
      const missing = [...harmony, ...moho]
        .filter(tool => typeof tool.handler !== 'function')
        .map(tool => tool.name);
      expect(missing).toEqual([]);
    });

    it('имя каждого тула — непустая строка без пробелов', () => {
      // Пробел в имени сделал бы тул невызываемым по протоколу.
      const malformed = [...harmony, ...moho]
        .filter(tool => typeof tool.name !== 'string' || tool.name.trim().length === 0 || /\s/.test(tool.name))
        .map(tool => JSON.stringify(tool.name));
      expect(malformed).toEqual([]);
    });
  });

  describe('полнота сборки Harmony-набора', () => {
    it('импортирована каждая группа, спреднутая в src/index.ts', () => {
      // Если бы часть групп потерялась, проверка пересечения шла бы по
      // неполному набору Harmony и могла пропустить настоящую тень.
      const source = fs.readFileSync(INDEX_FILE, 'utf8');
      const groups = readHarmonyGroupNames(source);
      const modules = readToolModuleMap(source);

      expect(groups.length).toBeGreaterThan(0);
      const unmapped = groups.filter(group => !modules.has(group));
      expect(unmapped).toEqual([]);
    });

    it('набор собран более чем из одной группы', () => {
      const groups = readHarmonyGroupNames(fs.readFileSync(INDEX_FILE, 'utf8'));
      expect(groups.length).toBeGreaterThan(10);
    });

    it('каждая экспортированная группа тулов попала в набор', () => {
      // ПРЕДУСЛОВИЕ ДЛЯ ПРОВЕРКИ ПЕРЕСЕЧЕНИЯ. Если группа экспортирована из
      // src/tools, но не спреднута в harmonyTools, набор Harmony в этом файле
      // окажется неполным — и пересечение будет считаться по части тулов.
      // Тест остался бы зелёным, хотя настоящая тень могла прятаться именно в
      // выпавшей группе. Поэтому полнота фиксируется отдельно и явно.
      const spread = new Set(readHarmonyGroupNames(fs.readFileSync(INDEX_FILE, 'utf8')));
      const exported = readExportedGroupNames();

      expect(exported.length).toBeGreaterThan(10);
      const missing = exported
        .filter(({ group }) => !spread.has(group))
        .map(({ group, file }) => `${group} (src/tools/${file})`);

      if (missing.length > 0) {
        throw new Error(
          'группы экспортированы, но не спреднуты в harmonyTools — набор Harmony ' +
            `неполный, проверка пересечения имён идёт по части тулов:\n${missing
              .map(entry => `  ${entry}`)
              .join('\n')}`
        );
      }
      expect(missing).toEqual([]);
    });
  });
});
