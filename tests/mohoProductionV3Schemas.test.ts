import {
  MOHO_PRODUCTION_V3_GATES,
  MOHO_PRODUCTION_V3_STAGES,
  artworkPackV3Schema,
  mohoProductionV3StartInputSchema,
  rigBlueprintV3Schema
} from '../src/schemas/mohoProductionV3.js';

describe('Moho Production v3 schemas', () => {
  it('applies production defaults and accepts exact dialogue timing', () => {
    const input = mohoProductionV3StartInputSchema.parse({
      shotId: 'shot-010',
      outputDir: '/tmp/moho-v3/shot-010',
      artwork: {
        mode: 'flat_characters',
        imagePaths: ['/tmp/moho-v3/hero.png']
      },
      styleReferencePaths: ['/tmp/moho-v3/style.jpg'],
      brief: 'Hero listens, reacts, then answers.',
      durationFrames: 96,
      dialogueTracks: [{
        characterRef: 'hero',
        audioPath: '/tmp/moho-v3/hero.wav',
        text: 'I understand.',
        startFrame: 24
      }]
    });

    expect(input).toMatchObject({
      schemaVersion: '3.0',
      fps: 24,
      width: 1920,
      height: 1080,
      outputFormat: 'mp4_h264'
    });
  });

  it('rejects PSD and unsupported artwork extensions', () => {
    expect(() => mohoProductionV3StartInputSchema.parse({
      shotId: 'shot-psd',
      outputDir: '/tmp/moho-v3/shot-psd',
      artwork: { mode: 'flat_scene', imagePath: '/tmp/moho-v3/scene.psd' },
      brief: 'Unsupported PSD input.',
      durationFrames: 48
    })).toThrow();
  });

  it('publishes the exact stage and approval-gate order', () => {
    expect(MOHO_PRODUCTION_V3_STAGES).toEqual([
      'ingest',
      'decomposition',
      'rig_blueprint',
      'native_rig',
      'performance_plan',
      'key_pose_animatic',
      'final_animation',
      'native_render',
      'qa',
      'delivery'
    ]);
    expect(MOHO_PRODUCTION_V3_GATES).toEqual([
      'rig_blueprint',
      'key_pose_animatic',
      'final_render'
    ]);
  });

  it('validates a decomposed artwork pack with confidence and provenance', () => {
    const pack = artworkPackV3Schema.parse({
      schemaVersion: '3.0',
      shotId: 'shot-010',
      parts: [{
        partId: 'hero_head',
        characterRef: 'hero',
        sourcePath: '/tmp/moho-v3/hero_head.png',
        maskPath: '/tmp/moho-v3/hero_head_mask.png',
        zIndex: 20,
        confidence: 0.91,
        pivot: { x: 300, y: 180 }
      }],
      occlusionGraph: [],
      joints: [{ jointId: 'neck', parentPartId: 'hero_body', childPartId: 'hero_head', x: 300, y: 260, confidence: 0.9 }],
      requiredViews: ['front', 'three_quarter'],
      drawingSets: { mouth: ['Rest', 'A', 'O'], eyes: ['open', 'closed'], hands: ['open'] },
      overallConfidence: 0.89,
      provenance: { provider: 'openai', model: 'vision-model', callId: 'call-1' }
    });

    expect(pack.overallConfidence).toBe(0.89);
  });

  it('supports an arbitrary bone graph instead of four fixed topologies', () => {
    const blueprint = rigBlueprintV3Schema.parse({
      schemaVersion: '3.0',
      shotId: 'shot-010',
      bones: [
        { boneId: 'root', name: 'Root', parentBoneId: null, x: 0, y: 0, angleDeg: 90, lengthPx: 40 },
        { boneId: 'wing_7', name: 'Wing Segment 7', parentBoneId: 'root', x: 20, y: 50, angleDeg: 15, lengthPx: 28 }
      ],
      bindings: [{ partId: 'wing_art', boneId: 'wing_7', mode: 'layer' }],
      constraints: [],
      switches: [],
      actions: [],
      warpMeshes: [],
      controlPoses: [],
      provenance: { provider: 'claude', model: 'planning-model', callId: 'call-2' }
    });

    expect(blueprint.bones[1].name).toBe('Wing Segment 7');
  });
});
