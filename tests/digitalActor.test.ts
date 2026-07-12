import fs from 'fs';
import os from 'os';
import path from 'path';
import { DigitalActorRegistry } from '../src/adapters/digitalActorRegistry/index.js';
import { type DigitalActor } from '../src/schemas/digitalActor.js';
import { DEFAULT_360_VIEWS, DEFAULT_MOUTH_SHAPES } from '../src/schemas/characterSpec.js';

describe('DigitalActorRegistry', () => {
  let tempDir: string;
  let registry: DigitalActorRegistry;

  beforeEach(() => {
    const baseDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    tempDir = fs.mkdtempSync(path.join(baseDir, 'actor-registry-test-'));
    registry = new DigitalActorRegistry(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const getValidActorFixture = (): DigitalActor => ({
    schemaVersion: '3.0',
    actorId: 'actor_masha',
    identity: {
      name: 'Masha',
      description: 'Masha model sheet rig',
      tags: ['hero', 'rig']
    },
    modelSheets: [],
    palettes: [
      {
        paletteId: 'main_palette',
        name: 'Main Palette',
        colors: [
          { colorId: 'c_skin', name: 'Skin Tone', r: 245, g: 210, b: 190, a: 255 },
          { colorId: 'c_hair', name: 'Hair Color', r: 90, g: 50, b: 30, a: 255 }
        ]
      }
    ],
    masterDrawings: [
      { drawingId: 'dr_face_front', name: 'Face Front', path: 'drawing_face_front.png', inferred: false },
      { drawingId: 'dr_torso_front', name: 'Torso Front', path: 'drawing_torso_front.png', inferred: false }
    ],
    headViews: DEFAULT_360_VIEWS,
    bodyViews: DEFAULT_360_VIEWS,
    eyes: ['eyes'],
    brows: [],
    mouths: DEFAULT_MOUTH_SHAPES,
    hands: [],
    props: [],
    pivots: [
      { partId: 'head', x: 0, y: 150, inferred: false },
      { partId: 'torso', x: 0, y: 50, inferred: false }
    ],
    hierarchy: [
      { partId: 'head', parentId: 'torso' },
      { partId: 'torso', parentId: null }
    ],
    deformRules: [],
    substitutions: [
      ...DEFAULT_MOUTH_SHAPES.map(shape => ({ partId: 'mouth', drawingId: `dr_mouth_${shape}`, name: shape }))
    ],
    poseFamilies: [],
    gestureLibrary: [],
    actingProfile: {
      defaultStyle: 'restrained',
      tempoBias: 1.0,
      gestureRate: 0.5
    },
    provenance: {
      importedFrom: 'mock_import',
      importedAt: new Date().toISOString(),
      inferredParts: []
    },
    origin: 'planned'
  });

  test('validates a complete and correct Digital Actor successfully', () => {
    const actor = getValidActorFixture();
    const result = registry.validate(actor);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.inferredCount).toBe(0);
    expect(result.checks.viewsCoverage).toBe(true);
    expect(result.checks.hierarchyCycleFree).toBe(true);
    expect(result.checks.pivotsCompleteness).toBe(true);
    expect(result.checks.colorConflictFree).toBe(true);
    expect(result.checks.substitutionsCompleteness).toBe(true);
  });

  test('detects missing front view', () => {
    const actor = getValidActorFixture();
    actor.headViews = ['side_left'];
    actor.bodyViews = ['side_left'];
    const result = registry.validate(actor);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('front'))).toBe(true);
    expect(result.checks.viewsCoverage).toBe(false);
  });

  test('detects conflicting color IDs', () => {
    const actor = getValidActorFixture();
    actor.palettes.push({
      paletteId: 'second_palette',
      name: 'Alternate Palette',
      colors: [
        { colorId: 'c_skin', name: 'Skin Tone Redefined', r: 10, g: 20, b: 30, a: 255 }
      ]
    });
    const result = registry.validate(actor);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('c_skin'))).toBe(true);
    expect(result.checks.colorConflictFree).toBe(false);
  });

  test('detects hierarchy cycles', () => {
    const actor = getValidActorFixture();
    actor.hierarchy = [
      { partId: 'head', parentId: 'torso' },
      { partId: 'torso', parentId: 'neck' },
      { partId: 'neck', parentId: 'head' }
    ];
    const result = registry.validate(actor);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Cycle detected'))).toBe(true);
    expect(result.checks.hierarchyCycleFree).toBe(false);
  });

  test('warns about missing pivots', () => {
    const actor = getValidActorFixture();
    actor.pivots = [{ partId: 'head', x: 0, y: 150, inferred: false }]; // missing torso pivot
    const result = registry.validate(actor);
    expect(result.valid).toBe(true); // missing pivot is a warning
    expect(result.warnings.some(w => w.includes("missing a pivot point"))).toBe(true);
    expect(result.checks.pivotsCompleteness).toBe(false);
  });

  test('warns about missing mouth substitutions', () => {
    const actor = getValidActorFixture();
    actor.substitutions = actor.substitutions.filter(s => s.name !== 'A'); // remove shape A
    const result = registry.validate(actor);
    expect(result.valid).toBe(true); // incomplete substitutions is a warning
    expect(result.warnings.some(w => w.includes("no corresponding drawing substitution"))).toBe(true);
    expect(result.checks.substitutionsCompleteness).toBe(false);
  });

  test('registers and retrieves a digital actor', () => {
    const actor = getValidActorFixture();
    const regResult = registry.register(actor);
    expect(fs.existsSync(regResult.filePath)).toBe(true);
    expect(regResult.sha256).toBeDefined();

    const loaded = registry.getActor(actor.actorId);
    expect(loaded.identity.name).toBe('Masha');
    expect(loaded.palettes[0].colors).toHaveLength(2);
  });

  test('imports from a PNG directory', () => {
    const pngDir = path.join(tempDir, 'png_sources');
    fs.mkdirSync(pngDir);
    fs.writeFileSync(path.join(pngDir, 'head.png'), 'fake-png-data');
    fs.writeFileSync(path.join(pngDir, 'torso.png'), 'fake-png-data');

    const actor = registry.importFromFile('png_dir', pngDir, 'Ivan');
    expect(actor.actorId).toBe('actor_ivan');
    expect(actor.identity.name).toBe('Ivan');
    expect(actor.masterDrawings).toHaveLength(2);
    expect(actor.hierarchy).toHaveLength(2);
    expect(actor.pivots.every(p => p.inferred)).toBe(true);
  });

  test('imports from a reconstruction manifest', () => {
    const manifestPath = path.join(tempDir, 'manifest.json');
    const mockManifest = {
      manifestId: 'man_test',
      schemaVersion: '1.0',
      mode: 'frame_by_frame_vector',
      source: { frameCount: 12 },
      scene: { name: 'TestScene', fps: 24 },
      drawings: [
        { id: 'dr_head', imagePath: 'head.png', inferred: false },
        { id: 'dr_torso', imagePath: 'torso.png', inferred: true }
      ],
      palettes: [
        {
          id: 'pal_1',
          name: 'Pal 1',
          colors: [
            { id: 'c1', name: 'outline', r: 0, g: 0, b: 0, a: 255 }
          ]
        }
      ],
      elements: [
        { nodeName: 'head', pivotX: 10, pivotY: 20 },
        { nodeName: 'torso', pivotX: 0, pivotY: 0 }
      ],
      exposures: [
        { elementName: 'mouth', frame: 1, duration: 5, drawingId: 'dr_mouth_A' }
      ]
    };

    fs.writeFileSync(manifestPath, JSON.stringify(mockManifest));

    const actor = registry.importFromReconstructionManifest(manifestPath, 'Masha');
    expect(actor.actorId).toBe('actor_masha');
    expect(actor.identity.name).toBe('Masha');
    expect(actor.masterDrawings).toHaveLength(2);
    expect(actor.palettes[0].colors).toHaveLength(1);
    expect(actor.hierarchy).toHaveLength(2);
    expect(actor.pivots[0].x).toBe(10);
    expect(actor.pivots[0].y).toBe(20);
    expect(actor.substitutions[0].partId).toBe('mouth');
    expect(actor.substitutions[0].name).toBe('A');
  });
});
