import fs from 'fs';

describe('Python suite dependency closure', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const workflow = fs.readFileSync('.github/workflows/ci.yml', 'utf-8');

  it('exposes every Python suite through package scripts', () => {
    expect(packageJson.scripts['test:python']).toContain('services/reconstruction-core/tests');
    expect(packageJson.scripts['test:ml']).toContain('services/ml-core/tests');
    expect(packageJson.scripts['test:ml-runtime']).toContain('services/ml-runtime/tests');
    expect(packageJson.scripts['test:python:all']).toContain('test:ml-runtime');
  });

  it('installs and runs every Python service in CI', () => {
    expect(workflow).toContain('services/reconstruction-core/requirements.lock');
    expect(workflow).toContain('services/ml-runtime/requirements.lock');
    // ml-core теперь ставится из pinned lock-файла + editable без зависимостей,
    // как и остальные сервисы (воспроизводимая сборка).
    expect(workflow).toContain('services/ml-core/requirements.lock');
    expect(workflow).toContain('pip install -e services/ml-core --no-deps');
    expect(workflow).toContain('pytest services/reconstruction-core/tests');
    expect(workflow).toContain('pytest services/ml-core/tests');
    expect(workflow).toContain('pytest services/ml-runtime/tests');
  });
});
