import { QtScriptBuilder, escapeString } from '../src/adapters/qtScriptBuilder.js';

describe('Тестирование генератора Qt Script', () => {
  test('escapeString должен экранировать кавычки и обратные косые черты', () => {
    expect(escapeString('hello "world" \\ ok')).toBe('hello \\"world\\" \\\\ ok');
  });

  test('должен генерировать корректный скрипт создания окружения', () => {
    const script = QtScriptBuilder.buildCreateEnvironment('TestEnv', '/path/to/nfs', 'localhost', 'usabatch');
    expect(script).toContain('ControlCentre.addEnvironment');
    expect(script).toContain('"TestEnv"');
    expect(script).toContain('"/path/to/nfs"');
    expect(script).toContain('"localhost"');
    expect(script).toContain('"usabatch"');
  });

  test('должен генерировать корректный скрипт создания проекта (job)', () => {
    const script = QtScriptBuilder.buildCreateJob('TestEnv', 'TestJob');
    expect(script).toContain('ControlCentre.environment("TestEnv")');
    expect(script).toContain('ControlCentre.addJob');
    expect(script).toContain('"TestJob"');
  });

  test('должен генерировать корректный скрипт создания сцены', () => {
    const script = QtScriptBuilder.buildCreateScene('TestEnv', 'TestJob', 'TestScene');
    expect(script).toContain('ControlCentre.job');
    expect(script).toContain('ControlCentre.addScene');
    expect(script).toContain('"TestScene"');
  });
});
