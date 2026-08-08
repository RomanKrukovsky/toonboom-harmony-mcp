/**
 * hostProfile.ts — какой пакет анимации обслуживает этот процесс.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ. Сервер умеет два хоста: Harmony (561 тул) и
 * Moho (~45 тулов). Отдавать клиенту оба набора сразу — вредно: 606 описаний
 * тулов уходят в контекст модели при каждом запуске и ухудшают выбор тула.
 * Поэтому активный хост фиксируется ОДИН раз при старте, и сервер отдаёт
 * ровно один набор.
 *
 * Кросс-приложенческих сценариев нет: человек работает либо в Moho, либо в
 * Harmony. Поэтому здесь нет и не должно появиться режима «оба сразу».
 */

/** Пакет анимации, которым управляет этот процесс. */
export type AnimHost = 'harmony' | 'moho';

/** Значение по умолчанию: проект исторически про Harmony. */
export const DEFAULT_HOST: AnimHost = 'harmony';

/** Имя переменной окружения, задающей активный хост. */
export const HOST_ENV_VAR = 'ANIM_HOST';

const KNOWN_HOSTS: readonly AnimHost[] = ['harmony', 'moho'];

/**
 * Ошибка конфигурации хоста.
 *
 * Отдельный класс, а не строка: запуск с опечаткой в ANIM_HOST должен падать
 * громко на старте, а не тихо откатываться к Harmony. Тихий откат — худший
 * из вариантов: человек просит Moho, получает 561 чужой тул и не понимает,
 * почему Moho «не работает».
 */
export class HostConfigError extends Error {
  constructor(public readonly raw: string) {
    super(
      `Неизвестное значение ${HOST_ENV_VAR}=${JSON.stringify(raw)}. ` +
        `Допустимые значения: ${KNOWN_HOSTS.join(', ')}.`
    );
    this.name = 'HostConfigError';
  }
}

/** Приводит сырое значение переменной к known-хосту. Пусто -> значение по умолчанию. */
export function parseHost(raw: string | undefined | null): AnimHost {
  if (raw === undefined || raw === null) return DEFAULT_HOST;
  const normalised = raw.trim().toLowerCase();
  if (normalised.length === 0) return DEFAULT_HOST;
  const match = KNOWN_HOSTS.find(host => host === normalised);
  if (!match) throw new HostConfigError(raw);
  return match;
}

/**
 * Активный хост процесса.
 *
 * Читается лениво и кэшируется: тесты должны иметь возможность подменить
 * переменную окружения до первого обращения, а прод-путь — не платить за
 * повторный разбор на каждый запрос.
 */
let cached: AnimHost | undefined;

export function activeHost(): AnimHost {
  if (cached === undefined) cached = parseHost(process.env[HOST_ENV_VAR]);
  return cached;
}

/** Сбрасывает кэш. Только для тестов, которые меняют окружение. */
export function resetHostCache(): void {
  cached = undefined;
}
