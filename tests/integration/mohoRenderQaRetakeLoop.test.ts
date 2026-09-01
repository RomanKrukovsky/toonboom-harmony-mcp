import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  validMohoCharacterBible,
  validMohoQaThresholds
} from '../fixtures/mohoShowBible.valid';
import { MohoCommandBuilder } from '../../src/services/mohoCommandBuilder/index';
import { MohoRenderRunner } from '../../src/services/mohoRenderRunner/index';
import { MohoVisualDiffer } from '../../src/services/mohoVisualDiffer/index';
import { MohoQaGate } from '../../src/services/mohoQaGate/index';
import { MohoRetakeEngine } from '../../src/services/mohoRetakeEngine/index';
import type { MohoPerformancePir } from '../../src/schemas/mohoPerformancePir';
import type { MohoCharacterBible } from '../../src/schemas/mohoCharacterBible';
import type { MohoQaThresholds } from '../../src/schemas/mohoQaThresholds';

function buildHumanoidPir(characterBible: MohoCharacterBible): MohoPerformancePir {
  const now = new Date(0).toISOString();
  return {
    schemaVersion: '1.0',
    performanceId: 'MOHO-TESTPERF01234567',
    rigType: characterBible.rigType,
    shotManifestRef: 'shot_retake_loop_test',
    mohoShowBibleRef: characterBible.characterId,
    boneKeys: [
      {
        boneId: 0,
        boneName: 'head_root',
        channel: 'rotation',
        frame: 1,
        value: 0,
        interpolation: 'ease_in_out'
      },
      {
        boneId: 0,
        boneName: 'head_root',
        channel: 'rotation',
        frame: 2,
        value: 1,
        interpolation: 'ease_in_out'
      },
      {
        boneId: 0,
        boneName: 'head_root',
        channel: 'rotation',
        frame: 3,
        value: 1.5,
        interpolation: 'ease_in_out'
      }
    ],
    switchKeys: [],
    smartBoneActions: [
      {
        actionName: 'wave',
        targetBone: 'arm_right',
        frame: 1,
        angleDeg: 0,
        scaleX: 1,
        scaleY: 1
      }
    ],
    cameraKeys: [],
    fxKeys: [],
    deterministicFingerprint: 'a'.repeat(64),
    provenance: {
      compiledAt: now,
      compilerVersion: 'moho-pir-compiler-v1'
    }
  };
}

function buildBadAnglePir(characterBible: MohoCharacterBible): MohoPerformancePir {
  const now = new Date(0).toISOString();
  return {
    schemaVersion: '1.0',
    performanceId: 'MOHO-BADANGLE01234567',
    rigType: characterBible.rigType,
    shotManifestRef: 'shot_retake_bad_angle',
    mohoShowBibleRef: characterBible.characterId,
    boneKeys: [
      {
        boneId: 2,
        boneName: 'arm_left',
        channel: 'rotation',
        frame: 1,
        value: 0,
        interpolation: 'ease_in_out'
      },
      {
        boneId: 2,
        boneName: 'arm_left',
        channel: 'rotation',
        frame: 2,
        value: 3,
        interpolation: 'ease_in_out'
      },
      {
        boneId: 2,
        boneName: 'arm_left',
        channel: 'rotation',
        frame: 3,
        value: 5,
        interpolation: 'ease_in_out'
      }
    ],
    switchKeys: [],
    smartBoneActions: [],
    cameraKeys: [],
    fxKeys: [],
    deterministicFingerprint: 'b'.repeat(64),
    provenance: {
      compiledAt: now,
      compilerVersion: 'moho-pir-compiler-v1'
    }
  };
}

describe('Moho render -> QA -> retake loop integration (SPRINT 4)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-render-qa-retake-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it('builds humanoid plan, dry-runs render, and yields a pass-through QA gate', async () => {
    const characterBible = validMohoCharacterBible();
    const pir = buildHumanoidPir(characterBible);
    const { plan } = new MohoCommandBuilder().buildWithFingerprint({
      pir,
      characterBible
    });

    const renderResult = await new MohoRenderRunner().run({
      commandPlan: plan,
      outputDir: tmpDir,
      dryRun: true,
      startFrame: 1,
      endFrame: 24,
      fps: 24
    });

    expect(renderResult.status).toBe('dry_run');
    expect(renderResult.renderedFiles).toEqual([]);

    const qaResult = new MohoQaGate().evaluate({
      shotId: 'shot_rqa_pass_through',
      renderResult,
      pir,
      thresholds: validMohoQaThresholds(),
      characterBible: {
        characterId: characterBible.characterId,
        bones: characterBible.controllers.map(c => ({
          boneId: c.boneId,
          boneName: c.boneName
        }))
      }
    });

    expect(qaResult.overallStatus).toBe('pass');
    expect(qaResult.findings).toEqual([]);
    expect(qaResult.criticalFindings).toBe(0);
    expect(qaResult.autoFixableFindings).toBe(0);
    expect(qaResult.requiresHumanApproval).toBe(false);
    expect(qaResult.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('chains PIR -> render -> visual diff -> QA gate with synthetic frames', async () => {
    const characterBible = validMohoCharacterBible();
    const pir = buildHumanoidPir(characterBible);
    const { plan } = new MohoCommandBuilder().buildWithFingerprint({
      pir,
      characterBible
    });

    const renderResult = await new MohoRenderRunner().run({
      commandPlan: plan,
      outputDir: path.join(tmpDir, 'render'),
      dryRun: true,
      startFrame: 1,
      endFrame: 3,
      fps: 24
    });
    expect(renderResult.status).toBe('dry_run');

    const baselineDir = path.join(tmpDir, 'baseline_frames');
    const candidateDir = path.join(tmpDir, 'candidate_frames');
    fs.mkdirSync(baselineDir, { recursive: true });
    fs.mkdirSync(candidateDir, { recursive: true });

    for (const frame of [1, 2, 3]) {
      const baselinePng = buildSolidPng(8, 8, [120, 120, 120]);
      const candidatePng = buildSolidPng(8, 8, [120, 120, 120]);
      fs.writeFileSync(path.join(baselineDir, `frame_${frame}.png`), baselinePng);
      fs.writeFileSync(path.join(candidateDir, `frame_${frame}.png`), candidatePng);
    }

    const differ = new MohoVisualDiffer();
    const diffResult = await differ.diff({
      baselineFramesDir: baselineDir,
      candidateFramesDir: candidateDir
    });

    expect(diffResult.comparedFrames).toBe(3);
    expect(diffResult.averageMSE).toBe(0);
    expect(diffResult.passes).toBe(true);

    const visualDiffInput = {
      shotId: 'shot_rqa_visual_diff',
      silhouetteQuality: 0.9,
      paletteDelta: 0.005,
      poseLibraryMatch: 0.92,
      mse: 0,
      referencePath: baselineDir,
      candidatePath: candidateDir
    };

    const qaResult = new MohoQaGate().evaluate({
      shotId: 'shot_rqa_visual_diff',
      renderResult,
      visualDiff: visualDiffInput,
      pir,
      thresholds: validMohoQaThresholds(),
      characterBible: {
        characterId: characterBible.characterId,
        bones: characterBible.controllers.map(c => ({
          boneId: c.boneId,
          boneName: c.boneName
        }))
      }
    });

    expect(qaResult.overallStatus).toBe('pass');
    expect(qaResult.findings).toEqual([]);

    const allFingerprints = {
      planFingerprint: new MohoCommandBuilder().buildWithFingerprint({ pir, characterBible }).fingerprint,
      diffFingerprint: differ.fingerprint(diffResult),
      qaFingerprint: qaResult.fingerprint
    };
    expect(allFingerprints.planFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(allFingerprints.diffFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(allFingerprints.qaFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('QA gate surfaces bone_angle_tolerance, and retake engine produces at least 1 patch', () => {
    const characterBible = validMohoCharacterBible();
    const pir = buildBadAnglePir(characterBible);

    const renderResult: Parameters<MohoQaGate['evaluate']>[0]['renderResult'] = {
      jobId: 'render_synthetic',
      status: 'dry_run',
      detectedMohoPath: null,
      commandLine: '<dry-run>',
      outputDir: tmpDir,
      renderedFiles: [],
      totalFrames: 24,
      durationMs: 0,
      fps: 24,
      resolution: { width: 1920, height: 1080 },
      codec: null,
      qaFindings: [],
      exitCode: 0
    };

    const qaResult = new MohoQaGate().evaluate({
      shotId: 'shot_rqa_bad_angle',
      renderResult,
      pir,
      thresholds: validMohoQaThresholds(),
      characterBible: {
        characterId: characterBible.characterId,
        bones: characterBible.controllers.map(c => ({
          boneId: c.boneId,
          boneName: c.boneName
        }))
      }
    });

    const boneAngleFindings = qaResult.findings.filter(f => f.check === 'bone_angle_tolerance');
    expect(boneAngleFindings.length).toBeGreaterThan(0);
    expect(qaResult.overallStatus).not.toBe('pass');

    const retake = new MohoRetakeEngine().generatePatches({
      pir,
      characterBible,
      qaResult,
      thresholds: validMohoQaThresholds()
    });

    expect(retake.patches.length).toBeGreaterThanOrEqual(1);
    expect(retake.patches.some(p => p.channel === 'rotation' && p.boneName === 'arm_left')).toBe(true);
    expect(retake.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic: same inputs -> same gate fingerprint AND same retake fingerprint', () => {
    const characterBible = validMohoCharacterBible();
    const pir = buildBadAnglePir(characterBible);
    const thresholds = validMohoQaThresholds();

    const renderResult: Parameters<MohoQaGate['evaluate']>[0]['renderResult'] = {
      jobId: 'render_det',
      status: 'dry_run',
      detectedMohoPath: null,
      commandLine: '<dry-run>',
      outputDir: tmpDir,
      renderedFiles: [],
      totalFrames: 24,
      durationMs: 0,
      fps: 24,
      resolution: { width: 1920, height: 1080 },
      codec: null,
      qaFindings: [],
      exitCode: 0
    };

    const gate1 = new MohoQaGate().evaluate({
      shotId: 'shot_rqa_determin',
      renderResult,
      pir,
      thresholds,
      characterBible: {
        characterId: characterBible.characterId,
        bones: characterBible.controllers.map(c => ({
          boneId: c.boneId,
          boneName: c.boneName
        }))
      }
    });
    const gate2 = new MohoQaGate().evaluate({
      shotId: 'shot_rqa_determin',
      renderResult,
      pir,
      thresholds,
      characterBible: {
        characterId: characterBible.characterId,
        bones: characterBible.controllers.map(c => ({
          boneId: c.boneId,
          boneName: c.boneName
        }))
      }
    });

    expect(gate1.fingerprint).toBe(gate2.fingerprint);
    expect(gate1.findings.length).toBe(gate2.findings.length);

    const retake1 = new MohoRetakeEngine().generatePatches({ pir, characterBible, qaResult: gate1, thresholds });
    const retake2 = new MohoRetakeEngine().generatePatches({ pir, characterBible, qaResult: gate2, thresholds });

    expect(retake1.fingerprint).toBe(retake2.fingerprint);
    expect(retake1.patches.length).toBe(retake2.patches.length);
    expect(retake1.patches.map(p => p.patchId)).toEqual(retake2.patches.map(p => p.patchId));
    expect(retake1.severity).toBe(retake2.severity);
    expect(retake1.autoApplicable).toBe(retake2.autoApplicable);
  });

  it('auto-apply policy: low-severity retake CAN auto-apply, high-severity retake CANNOT', () => {
    const characterBible = validMohoCharacterBible();
    const thresholds = validMohoQaThresholds();
    const lowRetake: Parameters<typeof MohoRetakeEngine.canAutoApply>[0] = {
      retakeId: 'rtk_low_test',
      patches: [
        {
          patchId: 'rtp_0001',
          targetRigType: characterBible.rigType,
          boneId: 0,
          boneName: 'head_root',
          channel: 'rotation',
          frame: 5,
          newValue: 1.5,
          interpolation: 'ease_in_out',
          note: 'low-severity patch',
          recordedBy: 'moho-retake-engine-v1',
          recordedAt: '1970-01-01T00:00:00.000Z'
        }
      ],
      severity: 'low',
      autoApplicable: false,
      requiresHumanApproval: false,
      fingerprint: 'placeholder'
    };
    const highRetake: Parameters<typeof MohoRetakeEngine.canAutoApply>[0] = {
      retakeId: 'rtk_high_test',
      patches: [
        {
          patchId: 'rtp_0001',
          targetRigType: characterBible.rigType,
          boneId: 2,
          boneName: 'arm_left',
          channel: 'rotation',
          frame: 2,
          newValue: 90,
          interpolation: 'ease_in_out',
          note: 'high-severity patch',
          recordedBy: 'moho-retake-engine-v1',
          recordedAt: '1970-01-01T00:00:00.000Z'
        }
      ],
      severity: 'high',
      autoApplicable: false,
      requiresHumanApproval: false,
      fingerprint: 'placeholder'
    };

    const lowDecision = MohoRetakeEngine.canAutoApply(lowRetake, thresholds);
    const highDecision = MohoRetakeEngine.canAutoApply(highRetake, thresholds);

    expect(lowDecision.canAutoApply).toBe(true);
    expect(lowDecision.reasons).toEqual([]);

    expect(highDecision.canAutoApply).toBe(false);
    expect(highDecision.reasons.some(r => r.toLowerCase().includes('high'))).toBe(true);
  });

  it('honest requires_real_moho: missing Moho -> render status flips to finding in QA', async () => {
    const characterBible = validMohoCharacterBible();
    const pir = buildHumanoidPir(characterBible);

    const renderResult = {
      jobId: 'render_no_moho',
      status: 'requires_real_moho' as const,
      detectedMohoPath: null,
      commandLine: '<no Moho installed>',
      outputDir: tmpDir,
      renderedFiles: [],
      totalFrames: 12,
      durationMs: 0,
      fps: 24,
      resolution: { width: 1920, height: 1080 },
      codec: null,
      qaFindings: [],
      exitCode: 1,
      errorMessage: 'Moho executable not detected on this host.'
    };

    expect(renderResult.status).toBe('requires_real_moho');
    expect(renderResult.detectedMohoPath).toBeNull();

    const qaResult = new MohoQaGate().evaluate({
      shotId: 'shot_rqa_requires_moho',
      renderResult,
      pir,
      thresholds: validMohoQaThresholds(),
      characterBible: {
        characterId: characterBible.characterId,
        bones: characterBible.controllers.map(c => ({
          boneId: c.boneId,
          boneName: c.boneName
        }))
      }
    });

    const renderFindings = qaResult.findings.filter(
      f => f.check === 'render_dry' || f.check === 'render_failed'
    );
    expect(renderFindings.length).toBe(1);
    expect(renderFindings[0].check).toBe('render_dry');
    expect(renderFindings[0].severity).toBe('high');
    expect(renderFindings[0].autoFixable).toBe(false);
    expect(qaResult.requiresHumanApproval).toBe(true);
    expect(qaResult.overallStatus).toBe('fail');
    expect(qaResult.criticalFindings).toBeGreaterThan(0);
  });
});

function buildSolidPng(width: number, height: number, rgb: [number, number, number]): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(2, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0;
    offset += 1;
    for (let x = 0; x < width; x += 1) {
      raw[offset] = rgb[0];
      raw[offset + 1] = rgb[1];
      raw[offset + 2] = rgb[2];
      offset += 3;
    }
  }
  const zlib = require('zlib') as typeof import('zlib');
  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}