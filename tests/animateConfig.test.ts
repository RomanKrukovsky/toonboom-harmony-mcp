import { animateConfig, detectAnimatePaths, validateAnimatePath } from '../src/config.js';

describe('Adobe Animate Configuration', () => {
  it('detects or parses Animate paths', () => {
    const detected = detectAnimatePaths();
    expect(detected).toBeDefined();
    expect(typeof detected.version).toBe('string');
    expect(typeof detected.appPath).toBe('string');
    expect(typeof detected.bin).toBe('string');
  });

  it('provides default animateConfig properties', () => {
    expect(animateConfig).toBeDefined();
    expect(typeof animateConfig.enabled).toBe('boolean');
    expect(typeof animateConfig.bridgeMode).toBe('string');
    expect(typeof animateConfig.bridgePort).toBe('number');
    expect(Array.isArray(animateConfig.allowedRoots)).toBe(true);
    expect(animateConfig.allowedRoots.length).toBeGreaterThan(0);
    expect(typeof animateConfig.requestTimeoutMs).toBe('number');
  });

  it('validates allowed paths correctly', () => {
    // Project root should always be allowed
    const projectRoot = process.cwd();
    expect(validateAnimatePath(projectRoot)).toBe(true);

    // Outside path traversal should be rejected
    expect(validateAnimatePath('/nonexistent_root_12345/outside/path')).toBe(false);
  });
});
