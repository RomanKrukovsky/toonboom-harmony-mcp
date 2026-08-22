/**
 * Tests for riggingEngineTools — real template registry and binding.
 *
 * The placeholders' own comments admitted the gap:
 *   "In a real implementation, this would instantiate RigTemplateRegistry"
 *   "In a real flow, this would call HarmonyCommandBuilder.buildPlan(...)"
 *
 * Both services existed and worked. These tests prove the tools now use them:
 * templates come from disk with canonical hashes, an unknown id is refused, a
 * missing PIR landmark blocks binding, and generated command plans are ordered
 * so nothing is referenced before it is created.
 */

import fs from 'fs';
import path from 'path';

import { riggingEngineTools } from '../src/tools/riggingEngineTools.js';
import { requireTool } from './helpers/toolInvocation.js';

const analyzeSource = requireTool(riggingEngineTools, 'harmony.rig.analyze_source');
const listTemplates = requireTool(riggingEngineTools, 'harmony.rig.templates.list');
const getTemplate = requireTool(riggingEngineTools, 'harmony.rig.templates.get');
const resolveBinding = requireTool(riggingEngineTools, 'harmony.rig.resolve_binding');
const planCutout = requireTool(riggingEngineTools, 'harmony.rig.plan_cutout');
const generate360 = requireTool(riggingEngineTools, 'harmony.rig.generate_360');
const mouthChart = requireTool(riggingEngineTools, 'harmony.rig.generate_mouth_chart');
const handLibrary = requireTool(riggingEngineTools, 'harmony.rig.generate_hand_library');
const expressionLibrary = requireTool(riggingEngineTools, 'harmony.rig.generate_expression_library');
const masterControllers = requireTool(riggingEngineTools, 'harmony.rig.create_master_controllers');
const motionTests = requireTool(riggingEngineTools, 'harmony.rig.run_motion_tests');
const publishTemplate = requireTool(riggingEngineTools, 'harmony.rig.publish_template');

const ROOT = path.resolve(process.cwd(), 'output', 'rigging-tests');
/** The template that actually ships in templates/rig/builtin. */
const TEMPLATE_ID = 'biped_standard';
const FULL_PIR = {
  points: ['head_top', 'neck', 'shoulder_left', 'shoulder_right', 'hip_left', 'hip_right']
    .map(name => ({ name, confidence: 0.9 }))
};

beforeAll(() => fs.mkdirSync(ROOT, { recursive: true }));
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

describe('templates registry', () => {
  it('lists templates loaded from disk with canonical hashes', async () => {
    const result: any = await listTemplates.handler({});
    expect(result.details.templateCount).toBeGreaterThan(0);
    const template = result.details.templates[0];
    // RFC 8785 canonical SHA-256 computed by RigTemplateRegistry.
    expect(template.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(template.nodeCount).toBeGreaterThan(0);
    expect(template.requiredLandmarks.length).toBeGreaterThan(0);
  });

  it('does not report duplicate entries for id and id_vN pointers', async () => {
    const result: any = await listTemplates.handler({});
    const hashes = result.details.templates.map((t: any) => t.contentHash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('returns the real template body for a known id', async () => {
    const result: any = await getTemplate.handler({ templateId: TEMPLATE_ID });
    expect(result.details.found).toBe(true);
    expect(result.details.nodes.length).toBeGreaterThan(0);
    expect(result.details.contentHash).toMatch(/^sha256:/);
  });

  it('refuses an unknown template instead of answering found: true', async () => {
    // The placeholder answered `found: true` for any id.
    const result: any = await getTemplate.handler({ templateId: 'no_such_rig' });
    expect(result.details.found).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.details.availableTemplates).toContain(TEMPLATE_ID);
  });
});

describe('resolve_binding', () => {
  it('binds every required slot when the PIR is complete', async () => {
    const result: any = await resolveBinding.handler({
      characterId: 'Hero', templateId: TEMPLATE_ID, pir: FULL_PIR
    });
    expect(result.status).toBe('success');
    expect(result.details.bindingPlanCreated).toBe(true);
    expect(result.details.bindingCount).toBeGreaterThanOrEqual(6);
  });

  it('blocks and names the missing landmarks', async () => {
    // The placeholder said `bindingPlanCreated: true` regardless.
    const result: any = await resolveBinding.handler({
      characterId: 'Hero', templateId: TEMPLATE_ID,
      pir: { points: [{ name: 'head_top', confidence: 0.9 }] }
    });
    expect(result.status).toBe('blocked');
    expect(result.details.bindingPlanCreated).toBe(false);
    expect(result.details.unresolvedSlots).toContain('neck');
    expect(result.details.unresolvedSlots).toContain('hip_left');
  });

  it('hashes the PIR so a binding is traceable to its input', async () => {
    const a: any = await resolveBinding.handler({ characterId: 'H', templateId: TEMPLATE_ID, pir: FULL_PIR });
    const b: any = await resolveBinding.handler({ characterId: 'H', templateId: TEMPLATE_ID, pir: FULL_PIR });
    expect(a.details.pirHash).toBe(b.details.pirHash);
    expect(a.details.pirHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('blocks on an unknown template rather than throwing', async () => {
    const result: any = await resolveBinding.handler({
      characterId: 'Hero', templateId: 'ghost_rig', pir: FULL_PIR
    });
    expect(result.status).toBe('blocked');
  });
});

describe('plan_cutout', () => {
  it('builds commands from the real template, not a PLAN-XXXXX literal', async () => {
    const result: any = await planCutout.handler({ characterId: 'Hero', templateId: TEMPLATE_ID });
    expect(result.details.commandPlanId).toMatch(/^cutout_[a-f0-9]{12}$/);
    expect(result.details.commandCount).toBeGreaterThan(0);
    expect(result.details.nodeCount).toBeGreaterThan(0);
  });

  it('orders creation before connection', async () => {
    const result: any = await planCutout.handler({ characterId: 'Hero', templateId: TEMPLATE_ID });
    // Harmony cannot connect a node that does not exist yet.
    expect(result.details.orderValid).toBe(true);
    expect(result.status).toBe('success');
  });

  it('prefixes every node with the character id', async () => {
    const result: any = await planCutout.handler({ characterId: 'Villain', templateId: TEMPLATE_ID });
    for (const command of result.details.commands) {
      const ref = command.nodeName ?? command.srcNodePath;
      expect(String(ref)).toContain('Villain');
    }
  });

  it('resolves connection endpoints instead of emitting undefined', async () => {
    const result: any = await planCutout.handler({ characterId: 'Hero', templateId: TEMPLATE_ID });
    const connections = result.details.commands.filter((c: any) => c.command === 'connect_nodes');
    expect(connections.length).toBeGreaterThan(0);
    for (const connection of connections) {
      expect(connection.srcNodePath).not.toContain('undefined');
      expect(connection.destNodePath).not.toContain('undefined');
    }
  });

  it('is a plan, not a claim that Harmony ran', async () => {
    const result: any = await planCutout.handler({ characterId: 'Hero', templateId: TEMPLATE_ID });
    expect(result.isRealHarmonyExecution).toBe(false);
    expect(result.requiresRealHarmony).toBe(true);
    expect(result.verification).toBe('implemented_unverified');
  });

  it('is deterministic for identical input', async () => {
    const a: any = await planCutout.handler({ characterId: 'Hero', templateId: TEMPLATE_ID });
    const b: any = await planCutout.handler({ characterId: 'Hero', templateId: TEMPLATE_ID });
    expect(a.details.commandPlanId).toBe(b.details.commandPlanId);
  });
});

describe('analyze_source', () => {
  it('reads real layer names out of an SVG', async () => {
    const svg = path.join(ROOT, 'char.svg');
    fs.writeFileSync(svg, `<svg xmlns="http://www.w3.org/2000/svg">
      <g inkscape:label="head"><path id="skull"/></g>
      <g inkscape:label="arm_left"/>
      <g inkscape:label="leg_right"/>
    </svg>`);

    const result: any = await analyzeSource.handler({ filePath: svg });
    expect(result.details.detectedFormat).toBe('svg');
    expect(result.details.detectedLayers).toContain('head');
    expect(result.details.detectedLayers).toContain('arm_left');
    // The placeholder returned the same six invented parts for any input.
    expect(result.details.parseable).toBe(true);
  });

  it('classifies layers into body parts and reports gaps', async () => {
    const svg = path.join(ROOT, 'partial.svg');
    fs.writeFileSync(svg, `<svg><g inkscape:label="head"/><g inkscape:label="torso"/></svg>`);
    const result: any = await analyzeSource.handler({ filePath: svg });
    expect(result.details.partsFound).toContain('head');
    expect(result.details.partsFound).toContain('torso');
    expect(result.details.missingParts).toContain('arm_left');
    expect(result.status).toBe('partial_success');
  });

  it('admits it cannot parse PSD layers instead of inventing them', async () => {
    const psd = path.join(ROOT, 'char.psd');
    fs.writeFileSync(psd, Buffer.concat([Buffer.from('8BPS'), Buffer.alloc(60)]));
    const result: any = await analyzeSource.handler({ filePath: psd });
    expect(result.details.detectedFormat).toBe('psd');
    expect(result.details.parseable).toBe(false);
    expect(result.details.detectedLayers).toEqual([]);
    expect(result.status).toBe('blocked');
  });

  it('accepts manually supplied layer names', async () => {
    const psd = path.join(ROOT, 'manual.psd');
    fs.writeFileSync(psd, Buffer.concat([Buffer.from('8BPS'), Buffer.alloc(60)]));
    const result: any = await analyzeSource.handler({
      filePath: psd, layerNames: ['head', 'torso', 'arm_left', 'arm_right', 'leg_left', 'leg_right']
    });
    expect(result.details.parseable).toBe(true);
    expect(result.details.missingParts).toEqual([]);
    expect(result.status).toBe('success');
  });

  it('reads a directory of PNG layers', async () => {
    const dir = path.join(ROOT, 'layers');
    fs.mkdirSync(dir, { recursive: true });
    for (const name of ['head.png', 'torso.png', 'notes.txt']) {
      fs.writeFileSync(path.join(dir, name), 'x');
    }
    const result: any = await analyzeSource.handler({ filePath: dir });
    expect(result.details.detectedFormat).toBe('image_directory');
    expect(result.details.detectedLayers.sort()).toEqual(['head', 'torso']);
  });

  it('blocks on a missing source file', async () => {
    const result: any = await analyzeSource.handler({ filePath: path.join(ROOT, 'ghost.svg') });
    expect(result.status).toBe('blocked');
  });
});

describe('libraries and charts', () => {
  it('generates a mouth chart compatible with VisemeMapper', async () => {
    const result: any = await mouthChart.handler({ characterId: 'Hero' });
    const names = result.details.drawingSubstitutions.map((s: any) => s.drawingName);
    // VisemeMapper's phonemeToDrawingMap expects exactly these names.
    expect(names).toContain('Mouth_A');
    expect(names).toContain('Mouth_X');
    expect(result.details.visemes).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X']);
    expect(result.details.restViseme).toBe('X');
  });

  it('gives every viseme a distinct exposure slot', async () => {
    const result: any = await mouthChart.handler({ characterId: 'Hero' });
    const slots = result.details.drawingSubstitutions.map((s: any) => s.exposureSlot);
    expect(new Set(slots).size).toBe(slots.length);
  });

  it('generates hand poses per requested hand', async () => {
    const both: any = await handLibrary.handler({ characterId: 'Hero' });
    const one: any = await handLibrary.handler({ characterId: 'Hero', hands: ['left'] });
    expect(both.details.drawingCount).toBe(one.details.drawingCount * 2);
  });

  it('maps expressions onto grid cells inside the requested grid', async () => {
    const result: any = await expressionLibrary.handler({ characterId: 'Hero', gridSize: 3 });
    for (const entry of result.details.library) {
      expect(entry.gridCell.x).toBeGreaterThanOrEqual(0);
      expect(entry.gridCell.x).toBeLessThanOrEqual(2);
      expect(entry.gridCell.y).toBeLessThanOrEqual(2);
    }
    expect(result.details.faceController.gridWidth).toBe(3);
  });

  it('saves drawings by mirroring symmetric 360 views', async () => {
    const mirrored: any = await generate360.handler({ characterId: 'Hero', useMirroring: true });
    const full: any = await generate360.handler({ characterId: 'Hero', useMirroring: false });
    expect(mirrored.details.drawingsRequired).toBeLessThan(full.details.drawingsRequired);
    expect(mirrored.details.drawingsSavedByMirroring).toBeGreaterThan(0);
    expect(full.details.drawingsSavedByMirroring).toBe(0);
  });
});

describe('plans that need Harmony', () => {
  it('plans master controllers without claiming they were created', async () => {
    const result: any = await masterControllers.handler({
      characterId: 'Hero', controllers: ['head_turn', 'face']
    });
    expect(result.details.masterControllersPlanned.length).toBe(2);
    expect(result.requiresRealHarmony).toBe(true);
    expect(result.verification).toBe('implemented_unverified');
  });

  it('reports motion test outcome as unknown rather than passed', async () => {
    // The placeholder always answered motionTestPassed: true.
    const result: any = await motionTests.handler({ characterId: 'Hero' });
    expect(result.details.motionTestPassed).toBeNull();
    expect(result.details.testCount).toBeGreaterThan(0);
    expect(result.details.reason).toMatch(/деформац/i);
  });

  it('drives each motion test through its joint extremes', async () => {
    const result: any = await motionTests.handler({ characterId: 'Hero', durationFrames: 48 });
    for (const test of result.details.tests) {
      expect(test.from).toBeLessThan(0);
      expect(test.to).toBeGreaterThan(0);
      expect(test.keyframes.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('writes a real spec file and admits .tpl is not produced', async () => {
    const target = path.join(ROOT, 'hero.tpl');
    const result: any = await publishTemplate.handler({
      characterId: 'Hero', templatePath: target, rigSpec: { nodes: 5 }
    });
    expect(fs.existsSync(target)).toBe(true);
    expect(result.details.binaryTplExported).toBe(false);
    expect(result.warnings.join(' ')).toMatch(/\.tpl/);

    const onDisk = JSON.parse(fs.readFileSync(target, 'utf-8'));
    expect(onDisk.specDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hashes the spec independently of publish time', async () => {
    const a: any = await publishTemplate.handler({
      characterId: 'Hero', templatePath: path.join(ROOT, 'a.json'), rigSpec: { nodes: 5 }
    });
    const b: any = await publishTemplate.handler({
      characterId: 'Hero', templatePath: path.join(ROOT, 'b.json'), rigSpec: { nodes: 5 }
    });
    expect(a.details.specDigest).toBe(b.details.specDigest);
  });
});
