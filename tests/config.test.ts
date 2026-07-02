import { config, validatePath } from '../src/config.js';
import path from 'path';

describe('Тестирование конфигурации', () => {
  test('должно загружать параметры конфигурации по умолчанию', () => {
    expect(config).toBeDefined();
    expect(typeof config.harmonyCcHost).toBe('string');
    expect(typeof config.harmonyCcPort).toBe('number');
    expect(typeof config.scriptTimeoutMs).toBe('number');
    expect(typeof config.dryRunDefault).toBe('boolean');
    expect(typeof config.allowDestructive).toBe('boolean');
  });

  test('должно пропускать файлы внутри разрешенных каталогов', () => {
    const root = path.resolve(process.cwd());
    expect(validatePath(path.join(root, 'src/index.ts'))).toBe(true);
    expect(validatePath('/tmp/test-file.js')).toBe(true);
  });

  test('должно блокировать файлы вне разрешенных каталогов', () => {
    expect(validatePath('/etc/passwd')).toBe(false);
    expect(validatePath('/var/log/syslog')).toBe(false);
  });
});
