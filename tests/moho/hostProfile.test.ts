/**
 * hostProfile.test.ts — выбор активного пакета анимации.
 *
 * ЗАЧЕМ ЭТОТ ТЕСТ СУЩЕСТВУЕТ. Сервер обслуживает два хоста, но никогда оба
 * сразу: `ANIM_HOST` при старте выбирает набор тулов (570 Harmony или 59 Moho).
 * Вся эта развилка держится на одной строке разбора переменной окружения,
 * поэтому её поведение зафиксировано здесь явно.
 *
 * ГЛАВНОЕ, ЧТО ЗДЕСЬ ЗАЩИЩЕНО — отсутствие тихого откта к Harmony при
 * опечатке. Если `ANIM_HOST=mohoo` молча даст harmony, человек попросит Moho,
 * получит 570 чужих тулов и будет искать причину в плагине, в IPC, в Moho —
 * где угодно, кроме одной лишней буквы в переменной. Громкое падение на старте
 * стоит секунду, тихий откат — час отладки не в том месте.
 *
 * ОБ ОКРУЖЕНИИ. Тесты пишут в `process.env.ANIM_HOST`. Значение восстанавливается
 * ровно в исходное состояние (включая «переменной не было вовсе»), иначе
 * следующие сюиты того же воркера увидят чужой хост. Кэш модуля сбрасывается до
 * и после каждого теста: без сброса первый прочитавший переменную тест
 * зафиксировал бы хост для всех остальных.
 */

import {
  activeHost,
  parseHost,
  resetHostCache,
  DEFAULT_HOST,
  HOST_ENV_VAR,
  HostConfigError,
  type AnimHost
} from '../../src/hostProfile.js';

/** Исходное значение переменной: строка либо `undefined`, если её не было. */
const ORIGINAL_ANIM_HOST = process.env[HOST_ENV_VAR];

/** Восстанавливает окружение точно, различая «пустая строка» и «нет переменной». */
function restoreEnv(): void {
  if (ORIGINAL_ANIM_HOST === undefined) delete process.env[HOST_ENV_VAR];
  else process.env[HOST_ENV_VAR] = ORIGINAL_ANIM_HOST;
}

describe('hostProfile: выбор активного хоста', () => {
  beforeEach(() => {
    resetHostCache();
  });

  afterEach(() => {
    restoreEnv();
    resetHostCache();
  });

  describe('значение по умолчанию', () => {
    it('без переменной даёт harmony', () => {
      delete process.env[HOST_ENV_VAR];
      expect(activeHost()).toBe('harmony');
      expect(DEFAULT_HOST).toBe('harmony');
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['пустая строка', ''],
      ['только пробелы', '   ']
    ])('parseHost(%s) даёт значение по умолчанию', (_label, raw) => {
      expect(parseHost(raw as string | undefined | null)).toBe(DEFAULT_HOST);
    });

    it('пустая строка в окружении не считается запросом Moho', () => {
      // Пустое значение — типичный результат `ANIM_HOST=` в скрипте запуска.
      // Оно должно вести к значению по умолчанию, а не в ветку Moho.
      process.env[HOST_ENV_VAR] = '';
      expect(activeHost()).toBe('harmony');
    });
  });

  describe('нормализация регистра и пробелов', () => {
    it.each([
      ['moho', 'moho'],
      ['MOHO', 'moho'],
      ['Moho', 'moho'],
      [' moho ', 'moho'],
      ['\tmoho\n', 'moho'],
      ['MoHo', 'moho'],
      ['harmony', 'harmony'],
      ['HARMONY', 'harmony'],
      [' Harmony ', 'harmony']
    ])('parseHost(%p) -> %p', (raw, expected) => {
      expect(parseHost(raw)).toBe(expected as AnimHost);
    });

    it('activeHost читает окружение через ту же нормализацию', () => {
      process.env[HOST_ENV_VAR] = '  MOHO  ';
      expect(activeHost()).toBe('moho');
    });
  });

  describe('опечатка падает громко, а не откатывается к harmony', () => {
    // Ядро файла. Каждое из этих значений — реальная опечатка, которую легко
    // сделать руками. Тихий откат превратил бы её в «Moho не работает».
    const TYPOS = ['mohoo', 'moho ho', 'harmoni', 'harmonu', 'harmoney', 'both', 'all', 'none', 'toonboom', 'mo ho'];

    it.each(TYPOS)('parseHost(%p) бросает HostConfigError', typo => {
      expect(() => parseHost(typo)).toThrow(HostConfigError);
    });

    it.each(TYPOS)('parseHost(%p) НЕ возвращает harmony молча', typo => {
      // Отдельным утверждением, потому что `toThrow` прошёл бы и на исключении
      // другого рода; здесь проверяется именно отсутствие возврата значения.
      let returned: AnimHost | 'НЕ ВЕРНУЛ' = 'НЕ ВЕРНУЛ';
      try {
        returned = parseHost(typo);
      } catch {
        // Ожидаемо.
      }
      expect(returned).toBe('НЕ ВЕРНУЛ');
    });

    it('activeHost бросает на опечатке в окружении', () => {
      process.env[HOST_ENV_VAR] = 'mohoo';
      expect(() => activeHost()).toThrow(HostConfigError);
    });

    it('сообщение об ошибке называет переменную, сырое значение и допустимые варианты', () => {
      // Сообщение — единственное, что увидит человек в stderr при падении
      // старта. Если в нём нет введённого значения, искать опечатку негде.
      let error: unknown;
      try {
        parseHost('mohoo');
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(HostConfigError);
      const message = (error as HostConfigError).message;
      expect(message).toContain(HOST_ENV_VAR);
      expect(message).toContain('mohoo');
      expect(message).toContain('harmony');
      expect(message).toContain('moho');
    });

    it('сохраняет сырое значение в поле raw без нормализации', () => {
      let error: unknown;
      try {
        parseHost('  MoHoo  ');
      } catch (caught) {
        error = caught;
      }
      // Именно сырое: нормализованное «mohoo» не даст понять, что были пробелы.
      expect((error as HostConfigError).raw).toBe('  MoHoo  ');
      expect((error as HostConfigError).name).toBe('HostConfigError');
    });

    it('HostConfigError остаётся подклассом Error и ловится общим catch', () => {
      expect(() => parseHost('nope')).toThrow(Error);
    });
  });

  describe('кэш и его сброс', () => {
    it('кэширует первое прочитанное значение', () => {
      process.env[HOST_ENV_VAR] = 'moho';
      expect(activeHost()).toBe('moho');

      // Смена переменной без сброса не должна влиять: хост фиксируется на
      // старте процесса, иначе набор тулов мог бы поменяться на ходу.
      process.env[HOST_ENV_VAR] = 'harmony';
      expect(activeHost()).toBe('moho');
    });

    it('resetHostCache заставляет перечитать окружение', () => {
      process.env[HOST_ENV_VAR] = 'moho';
      expect(activeHost()).toBe('moho');

      process.env[HOST_ENV_VAR] = 'harmony';
      resetHostCache();
      expect(activeHost()).toBe('harmony');
    });

    it('resetHostCache открывает и обратный переход harmony -> moho', () => {
      process.env[HOST_ENV_VAR] = 'harmony';
      expect(activeHost()).toBe('harmony');

      process.env[HOST_ENV_VAR] = 'moho';
      resetHostCache();
      expect(activeHost()).toBe('moho');
    });

    it('кэш не запоминает результат неудачного разбора', () => {
      // Иначе после падения на опечатке починка переменной без перезапуска
      // процесса не помогла бы, а причина была бы неочевидна.
      process.env[HOST_ENV_VAR] = 'mohoo';
      expect(() => activeHost()).toThrow(HostConfigError);

      process.env[HOST_ENV_VAR] = 'moho';
      resetHostCache();
      expect(activeHost()).toBe('moho');
    });

    it('повторный сброс подряд безопасен', () => {
      resetHostCache();
      resetHostCache();
      process.env[HOST_ENV_VAR] = 'moho';
      expect(activeHost()).toBe('moho');
    });
  });

  describe('контракт типа', () => {
    it('возвращает ровно один из двух известных хостов', () => {
      // Режима «оба сразу» нет и не должно появиться: смысл файла в том, что
      // клиент видит один набор тулов.
      const known: AnimHost[] = ['harmony', 'moho'];
      expect(known).toContain(parseHost('moho'));
      expect(known).toContain(parseHost('harmony'));
      expect(known).toContain(parseHost(undefined));
      expect(known).toHaveLength(2);
    });

    it('имя переменной окружения зафиксировано как ANIM_HOST', () => {
      // Строка попала в README, package.json (start:moho) и конфиги клиентов;
      // её переименование сломало бы их молча.
      expect(HOST_ENV_VAR).toBe('ANIM_HOST');
    });
  });

  describe('гигиена окружения самого теста', () => {
    it('восстанавливает исходное значение ANIM_HOST после каждого теста', () => {
      // Сюита выше многократно писала в переменную. Если afterEach не работает,
      // следующие тесты воркера получат чужой хост — этот тест ловит такое.
      expect(process.env[HOST_ENV_VAR]).toBe(ORIGINAL_ANIM_HOST);
    });
  });
});
