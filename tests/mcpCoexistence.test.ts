/**
 * MCP tool coexistence test — verifies that Retargeting and Scene Intelligence
 * tools are simultaneously registered (via imports of the tool modules that
 * `src/index.ts` already aggregates into `allTools`).
 *
 * This is the regression-prevention test requested in the integration audit:
 * "Add a test that checks their simultaneous presence and the absence of
 * conflicting names."
 *
 * Why not import from `src/index.ts`? — `src/index.ts` boots an MCP server on
 * import side-effects; isolating the tool arrays keeps this test safe and fast.
 */
import { reconstructionTools } from '../src/tools/reconstructionTools.js';
import { retargetingTools } from '../src/tools/retargetingTools.js';
import { aiStudioTools } from '../src/tools/aiStudioTools.js';

const EXPECTED_RETARGETING = [
  'harmony.rig.generate_retargeting_config',
  'harmony.rig.apply_retargeting',
  'harmony.rig.get_retargeting_preview'
];

const EXPECTED_AI_STUDIO = [
  'harmony.ai_studio.analyze_scene',
  'harmony.ai_studio.generate_director_variants'
];

const EXPECTED_RECONSTRUCTION_SUBSET = [
  'harmony.reconstruct.health',
  'harmony.reconstruct.analyze_video',
  'harmony.reconstruct.video_to_editable_scene',
  'harmony.reconstruct.get_problem_frames',
  'harmony.reconstruct.refine_range',
  'harmony.reconstruct.propose_variants'
];

// All three modules combined — this mirrors what src/index.ts's `allTools`
// ships, restricted to the three subsystems under audit.
const combinedTools = [...reconstructionTools, ...retargetingTools, ...aiStudioTools];

describe('MCP tool registration coexistence', () => {
  test('combined tool arrays are non-empty for each subsystem', () => {
    expect(reconstructionTools.length).toBeGreaterThan(6);
    expect(retargetingTools.length).toBe(3);
    expect(aiStudioTools.length).toBe(5);
  });

  test('every tool has a non-empty name and a handler function', () => {
    for (const t of combinedTools) {
      expect(typeof t.name).toBe('string');
      expect(t.name.length).toBeGreaterThan(0);
      expect(typeof t.handler).toBe('function');
    }
  });

  test('all 3 Retargeting tools are present', () => {
    const names = combinedTools.map((t) => t.name);
    for (const expected of EXPECTED_RETARGETING) {
      expect(names).toContain(expected);
    }
  });

  test('all 2 Scene Intelligence (ai_studio) tools are present', () => {
    const names = combinedTools.map((t) => t.name);
    for (const expected of EXPECTED_AI_STUDIO) {
      expect(names).toContain(expected);
    }
  });

  test('all expected reconstruction tools remain present (no regression)', () => {
    const names = reconstructionTools.map((t) => t.name);
    for (const expected of EXPECTED_RECONSTRUCTION_SUBSET) {
      expect(names).toContain(expected);
    }
  });

  test('no two tools share the same name across the three subsystems', () => {
    const names = combinedTools.map((t) => t.name);
    const dup = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dup).toEqual([]);
  });

  test('Retargeting and Scene Intelligence tools do not collide on names', () => {
    const retargetingNames = retargetingTools.map((t) => t.name);
    const aiStudioNames = aiStudioTools.map((t) => t.name);
    const intersection = retargetingNames.filter((n) => aiStudioNames.includes(n));
    expect(intersection).toEqual([]);
  });

  test('Neither subsystem repeats reconstruction tool names', () => {
    const reconstructionNames = new Set(reconstructionTools.map((t) => t.name));
    for (const t of retargetingTools) {
      expect(reconstructionNames.has(t.name)).toBe(false);
    }
    for (const t of aiStudioTools) {
      expect(reconstructionNames.has(t.name)).toBe(false);
    }
  });

  test('Retargeting and Scene Intelligence tools are registered simultaneously', () => {
    const names = new Set(combinedTools.map((t) => t.name));
    const allExpected = [...EXPECTED_RETARGETING, ...EXPECTED_AI_STUDIO];
    for (const expected of allExpected) {
      expect(names.has(expected)).toBe(true);
    }
  });
});
