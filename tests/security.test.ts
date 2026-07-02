import { verifyPathAccess, enforceDestructiveSafety, executeWithDryRun, HarmonyError } from '../src/security.js';
import { config } from '../src/config.js';
import path from 'path';

describe('Тестирование безопасности', () => {
  test('verifyPathAccess должно успешно возвращать разрешенный путь', () => {
    const valid = path.resolve('./package.json');
    expect(verifyPathAccess(valid)).toBe(valid);
  });

  test('verifyPathAccess должно выкидывать ошибку при попытке выхода за рамки разрешенного пути', () => {
    expect(() => {
      verifyPathAccess('/Users/romanmolodyko/Documents/../../etc/passwd');
    }).toThrow(HarmonyError);

    try {
      verifyPathAccess('/etc/hosts');
    } catch (e: any) {
      expect(e.code).toBe('PATH_NOT_ALLOWED');
    }
  });

  test('enforceDestructiveSafety должно блокировать вызовы, если в конфигурации деструктивные действия выключены', () => {
    config.allowDestructive = false;
    expect(() => {
      enforceDestructiveSafety('delete_something', { confirm: true, confirmationText: 'Я понимаю, что это действие изменит базу данных Harmony' });
    }).toThrow(HarmonyError);
  });

  test('enforceDestructiveSafety должно выкидывать ошибку, если передан неверный токен подтверждения', () => {
    config.allowDestructive = true;
    expect(() => {
      enforceDestructiveSafety('delete_something', { confirm: false });
    }).toThrow(HarmonyError);

    expect(() => {
      enforceDestructiveSafety('delete_something', { confirm: true, confirmationText: 'неверный текст' });
    }).toThrow(HarmonyError);
  });

  test('enforceDestructiveSafety должно выполняться успешно при совпадении всех условий', () => {
    config.allowDestructive = true;
    expect(() => {
      enforceDestructiveSafety('delete_something', {
        confirm: true,
        confirmationText: 'Я понимаю, что это действие изменит базу данных Harmony'
      });
    }).not.toThrow();
  });

  test('executeWithDryRun должно перехватывать и симулировать выполнение при dryRun=true', async () => {
    const spy = jest.fn();
    const res = await executeWithDryRun('test_op', {}, true, spy);

    expect(spy).not.toHaveBeenCalled();
    expect(res).toEqual({
      dryRun: true,
      message: 'Симуляция (dry-run): операция "test_op" была бы запущена в обычном режиме.',
      params: {}
    });
  });

  test('executeWithDryRun должно вызывать коллбек при dryRun=false', async () => {
    const spy = jest.fn().mockReturnValue({ success: true });
    const res = await executeWithDryRun('test_op', {}, false, spy);

    expect(spy).toHaveBeenCalled();
    expect(res).toEqual({ success: true });
  });
});
