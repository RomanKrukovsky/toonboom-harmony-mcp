import { RigTemplateRegistry } from '../src/services/rigTemplateRegistry/index.js';
import { RigBindingResolver } from '../src/services/rigBindingResolver/index.js';
import { HarmonyCommandBuilder } from '../src/services/harmonyCommandBuilder/index.js';
import { CharacterTopologyPIR, CharacterTopologyPIRSchema as characterTopologyPirSchema } from '../src/services/pivotEstimator/index.js';
import { harmonyCommandPlanV4Schema } from '../src/schemas/harmonyCommandPlanV4.js';
import crypto from 'crypto';

describe('Phase 3: Rigging Pipeline', () => {
  let registry: RigTemplateRegistry;
  let resolver: RigBindingResolver;
  let builder: HarmonyCommandBuilder;

  beforeAll(async () => {
    registry = new RigTemplateRegistry();
    await registry.initialize();
    resolver = new RigBindingResolver();
    builder = new HarmonyCommandBuilder();
  });

  it('loads biped_standard_v1 template successfully', () => {
    const entry = registry.getTemplate('biped_standard', '1.0.0');
    expect(entry).toBeDefined();
    expect(entry.template.template_id).toBe('biped_standard');
    expect(entry.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('fails binding resolution if required landmarks are missing', () => {
    const mockPir: CharacterTopologyPIR = {
      version: '1.0',
      characterId: 'CHAR-01',
      points: [], // Missing required landmarks
      requiresHumanReview: false,
      missingOrUnreliableJoints: []
    };
    
    const entry = registry.getTemplate('biped_standard', '1.0.0');
    expect(() => resolver.resolveBinding('CHAR-01', mockPir, 'sha256:dummy', entry)).toThrow(/missing required landmarks/);
  });

  it('generates a valid HarmonyCommandPlanV4 deterministically', () => {
    const mockPir: CharacterTopologyPIR = {
      version: '1.0',
      characterId: 'CHAR-01',
      requiresHumanReview: false,
      missingOrUnreliableJoints: [],
      points: [
        { name: 'head_top', x: 0, y: 10, normalizedX: 0.5, normalizedY: 0.9, confidence: 0.99, visible: true, sourceModel: 'dwpose' },
        { name: 'neck', x: 0, y: 5, normalizedX: 0.5, normalizedY: 0.7, confidence: 0.99, visible: true, sourceModel: 'dwpose' },
        { name: 'shoulder_left', x: -5, y: 5, normalizedX: 0.4, normalizedY: 0.7, confidence: 0.99, visible: true, sourceModel: 'dwpose' },
        { name: 'shoulder_right', x: 5, y: 5, normalizedX: 0.6, normalizedY: 0.7, confidence: 0.99, visible: true, sourceModel: 'dwpose' },
        { name: 'hip_left', x: -3, y: 0, normalizedX: 0.45, normalizedY: 0.5, confidence: 0.99, visible: true, sourceModel: 'dwpose' },
        { name: 'hip_right', x: 3, y: 0, normalizedX: 0.55, normalizedY: 0.5, confidence: 0.99, visible: true, sourceModel: 'dwpose' }
      ]
    };
    
    // Validate PIR
    expect(characterTopologyPirSchema.safeParse(mockPir).success).toBe(true);

    const pirHash = 'sha256:dummypirhash01234567890123456789012345678901234567890123456789';
    const entry = registry.getTemplate('biped_standard', '1.0.0');
    
    // 1. Resolve binding
    const bindingPlan = resolver.resolveBinding('CHAR-01', mockPir, pirHash, entry);
    expect(bindingPlan.bindings.length).toBeGreaterThan(0);
    expect(bindingPlan.unresolved.length).toBe(0);

    // 2. Build harmony command plan
    const commandPlan = builder.buildPlan(mockPir, bindingPlan, entry);
    
    // 3. Validate command plan
    const validation = harmonyCommandPlanV4Schema.safeParse(commandPlan);
    expect(validation.success).toBe(true);
    
    // 4. Test deterministic source hash
    const commandPlan2 = builder.buildPlan(mockPir, bindingPlan, entry);
    expect(commandPlan.sourceManifestSha256).toBe(commandPlan2.sourceManifestSha256);
  });
});
