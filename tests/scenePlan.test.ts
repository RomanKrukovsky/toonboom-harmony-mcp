import { scenePlanSchema, assertScenePlanVersion, SCENE_PLAN_VERSION } from '../src/schemas/scenePlan';

describe('scene_plan schema version lock', () => {
  const validPlan = {
    schemaVersion: '1.0',
    production: 'Test Show',
    episode: 'EP01',
    sceneName: 'SH010'
  };

  it('exposes a stable version string', () => {
    expect(SCENE_PLAN_VERSION).toBe('1.0');
  });

  it('accepts a plan with the current schemaVersion', () => {
    const res = scenePlanSchema.safeParse(validPlan);
    expect(res.success).toBe(true);
  });

  it('rejects a plan missing schemaVersion', () => {
    expect(() => assertScenePlanVersion({ production: 'x', episode: 'y', sceneName: 'z' })).toThrow(
      /schemaVersion/
    );
  });

  it('rejects a future major version', () => {
    expect(() => assertScenePlanVersion({ ...validPlan, schemaVersion: '2.0' })).toThrow(
      /Unsupported scene_plan schemaVersion major 2/
    );
  });

  it('accepts a future minor version (forward-compatible, warn not fail)', () => {
    expect(() => assertScenePlanVersion({ ...validPlan, schemaVersion: '1.5' })).not.toThrow();
  });

  it('accepts a fully populated scene plan', () => {
    const full = JSON.parse(
      require('fs').readFileSync(__dirname + '/../examples/sample_scene_plan.json', 'utf8')
    );
    const res = scenePlanSchema.safeParse(full);
    expect(res.success).toBe(true);
    expect(res.data?.characters).toHaveLength(1);
  });

  it('rejects a plan where schemaVersion is not a string', () => {
    expect(() => assertScenePlanVersion({ ...validPlan, schemaVersion: 1 })).toThrow();
  });
});