import fs from 'fs';
import path from 'path';
import { HarmonyManifestV3Compiler } from '../src/adapters/harmonyManifestV3/index.js';
import { KeyPoseRankingEngine } from '../src/adapters/keyPoseRankingEngine/index.js';
import { RepresentationPolicyRouter } from '../src/adapters/representationPolicyRouter/index.js';
import { harmonyManifestV3Schema } from '../src/schemas/harmonyManifestV3.js';

describe('Phase 4: Advanced Studio AI Pipeline & Manifest V3 Engine', () => {
  const outputDir = path.resolve(process.cwd(), 'output/phase4_studio');

  beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  describe('4.1 Harmony Manifest V3 Engine', () => {
    it('compiles valid Manifest V3 JSON schema', () => {
      const compiler = new HarmonyManifestV3Compiler();
      const manifest = compiler.compile({
        sceneId: 'SCENE_MANIFEST_V3',
        digitalActors: [{ actorId: 'ACTOR_01', name: 'Hero' }]
      });

      expect(manifest.schemaVersion).toBe('3.0');
      expect(manifest.sceneId).toBe('SCENE_MANIFEST_V3');

      const parsed = harmonyManifestV3Schema.safeParse(manifest);
      expect(parsed.success).toBe(true);

      const samplePath = path.join(outputDir, 'manifest_v3_sample.json');
      fs.writeFileSync(samplePath, JSON.stringify(manifest, null, 2));
      expect(fs.existsSync(samplePath)).toBe(true);
    });
  });

  describe('4.2 Key Pose Ranking Engine', () => {
    it('ranks candidate key poses by silhouette readability and line of action dynamics', () => {
      const ranker = new KeyPoseRankingEngine();
      const ranking = ranker.rankPoses({
        poses: [
          { poseId: 'pose_weak', type: 'KeyPose', confidence: 0.5, features: { silhouetteQuality: 0.4 } as any },
          { poseId: 'pose_strong', type: 'AnticipationPose', confidence: 0.95, features: { silhouetteQuality: 0.9 } as any }
        ]
      } as any);

      expect(ranking.length).toBe(2);
      expect(ranking[0].poseId).toBe('pose_strong');
      expect(ranking[0].rank).toBe(1);
      expect(ranking[0].readabilityStatus).toBe('high');
      expect(ranking[1].recommendations.length).toBeGreaterThan(0);

      const reportPath = path.join(outputDir, 'keypose_ranking_report.json');
      fs.writeFileSync(reportPath, JSON.stringify(ranking, null, 2));
      expect(fs.existsSync(reportPath)).toBe(true);
    });
  });

  describe('4.3 Representation Policy Router', () => {
    it('routes rigid parts to peg_transform and non-rigid parts to frame_by_frame_vector', () => {
      const router = new RepresentationPolicyRouter();
      const routes = router.routeBatch([
        { partId: 'Torso', startFrame: 1, endFrame: 24, deformationScore: 0.1, rotationVelocity: 5 },
        { partId: 'Hair_Strand', startFrame: 1, endFrame: 24, deformationScore: 0.6, rotationVelocity: 10 },
        { partId: 'Cape_Whip', startFrame: 1, endFrame: 24, deformationScore: 0.9, rotationVelocity: 50 }
      ]);

      expect(routes.length).toBe(3);
      expect(routes[0].representation).toBe('peg_transform');
      expect(routes[1].representation).toBe('curve_deformer');
      expect(routes[2].representation).toBe('frame_by_frame_vector');
    });
  });
});
