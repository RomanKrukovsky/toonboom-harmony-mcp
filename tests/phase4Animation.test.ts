import { RetargetingResolver } from '../src/services/retargetingResolver/index.js';
import { HarmonyCommandBuilder } from '../src/services/harmonyCommandBuilder/index.js';
import { PerformancePIR } from '../src/schemas/performancePir.js';
import { RigBindingPlanV1 } from '../src/schemas/rigBinding.js';
import { harmonyCommandPlanV4Schema } from '../src/schemas/harmonyCommandPlanV4.js';
import { retargetingPlanSchema } from '../src/schemas/retargetingPlan.js';

describe('Phase 4: Animation & 2D Retargeting Pipeline', () => {
  let retargetingResolver: RetargetingResolver;
  let commandBuilder: HarmonyCommandBuilder;

  beforeAll(() => {
    retargetingResolver = new RetargetingResolver();
    commandBuilder = new HarmonyCommandBuilder();
  });

  it('generates a valid Animation Command Plan from PerformancePIR deterministically', () => {
    // 1. Mock PerformancePIR (simulating motion data like EMAGE/MotionGPT)
    const mockPerformancePir: PerformancePIR = {
      schema: 'toon-boom-mcp/performance-pir-v1',
      performanceId: 'PERF-TEST-01',
      characterId: 'CHAR-01',
      durationFrames: 24,
      fps: 24,
      tracks: [
        {
          nodeId: 'NODE_LEFT_ARM_PEG',
          keys: [
            { frame: 1, rotation: 0, interpolation: 'LINEAR' },
            { frame: 12, rotation: 450, interpolation: 'BEZIER' }, // Over 360 test
            { frame: 24, rotation: -400, interpolation: 'LINEAR' } // Under -360 test
          ]
        },
        {
          nodeId: 'NODE_HEAD_PEG',
          keys: [
            { frame: 1, rotation: 0, x: 0, y: 0, interpolation: 'LINEAR' },
            { frame: 12, rotation: 10, x: 0.1, y: 0.2, interpolation: 'CONSTANT' }
          ]
        }
      ],
      holds: [
        { startFrame: 20, endFrame: 24 }
      ]
    };

    // 2. Mock RigBindingPlanV1
    const mockBindingPlan: RigBindingPlanV1 = {
      schema: 'toon-boom-mcp/rig-binding-plan-v1',
      character_id: 'CHAR-01',
      template: {
        template_id: 'biped_standard',
        version: '1.0.0',
        content_hash: 'sha256:dummyhash'
      },
      source: {
        pir_id: 'CHAR-01',
        pir_hash: 'sha256:dummypirhash'
      },
      bindings: [],
      unresolved: [],
      warnings: []
    };

    // 3. Resolve Retargeting Plan
    const retargetingPlan = retargetingResolver.resolve(mockPerformancePir, mockBindingPlan);
    
    // Validate schema
    expect(retargetingPlanSchema.safeParse(retargetingPlan).success).toBe(true);
    
    // Ensure rotation is bound to standard degrees (450 -> 90)
    const armTrack = retargetingPlan.tracks.find(t => t.nodeId === 'NODE_LEFT_ARM_PEG');
    expect(armTrack?.keys[1].rotation).toBe(90);
    expect(armTrack?.keys[2].rotation).toBe(-40);

    // 4. Generate Harmony Animation Command Plan
    const animationPlan = commandBuilder.buildAnimationPlan(retargetingPlan);

    // Validate schema
    const parsed = harmonyCommandPlanV4Schema.safeParse(animationPlan);
    if (!parsed.success) {
      console.log(JSON.stringify(parsed.error.errors, null, 2));
    }
    expect(parsed.success).toBe(true);

    // Check specific commands are present
    const interpCommands = animationPlan.commands.filter(c => c.type === 'set_transform_interpolation');
    expect(interpCommands.length).toBeGreaterThan(0);
    
    const keyCommands = animationPlan.commands.filter(c => c.type === 'set_transform_keyframe');
    expect(keyCommands.length).toBe(5); // 3 for arm, 2 for head

    // 5. Test deterministic hashing
    const animationPlan2 = commandBuilder.buildAnimationPlan(retargetingPlan);
    expect(animationPlan.sourceManifestSha256).toBe(animationPlan2.sourceManifestSha256);
  });
});
