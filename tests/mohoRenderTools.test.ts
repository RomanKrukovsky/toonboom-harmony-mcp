import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';

import { mohoRenderTools } from '../src/tools/mohoRenderTools.js';
import { MohoRenderManager } from '../src/services/mohoRenderManager/index.js';
import {
  buildRigFromTemplate,
  HUMANOID_TEMPLATE,
  QUADRUPED_TEMPLATE
} from '../src/services/mohoReferenceRigTemplates/index.js';
import type { MohoCommandPlan } from '../src/schemas/mohoCommandPlan.js';

import { validMohoCharacterBible } from './fixtures/mohoShowBible.valid.js';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function crc32(buf: Buffer): number {
  let table: number[] | null = (crc32 as any).__table;
  if (!table) {
    table = new Array<number>(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) {
        c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
    (crc32 as any).__table = table;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = (table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crcInput = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

interface PngSpec {
  width: number;
  height: number;
  colorType: 2 | 6;
  fill: { r: number; g: number; b: number; a?: number } | ((x: number, y: number) => { r: number; g: number; b: number; a: number });
}

function buildPngBytes(spec: PngSpec): Buffer {
  const { width, height, colorType } = spec;
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;

  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const px = typeof spec.fill === 'function' ? spec.fill(x, y) : { r: spec.fill.r, g: spec.fill.g, b: spec.fill.b, a: spec.fill.a ?? 255 };
      const off = rowStart + 1 + x * channels;
      raw[off + 0] = px.r;
      raw[off + 1] = px.g;
      raw[off + 2] = px.b;
      if (channels === 4) raw[off + 3] = px.a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(colorType, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const idat = zlib.deflateSync(raw);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function writePng(filePath: string, spec: PngSpec): void {
  fs.writeFileSync(filePath, buildPngBytes(spec));
}

function findTool(name: string): { name: string; description: string; inputSchema: any; handler: (...args: any[]) => any } {
  const t = mohoRenderTools.find(x => x.name === name);
  if (!t) throw new Error(`Tool ${name} not found in mohoRenderTools`);
  return t as any;
}

function buildHumanoidTemplatePlan(): MohoCommandPlan {
  return buildRigFromTemplate(HUMANOID_TEMPLATE, validMohoCharacterBible('humanoid_2leg'));
}

function buildQuadrupedTemplatePlan(): MohoCommandPlan {
  return buildRigFromTemplate(QUADRUPED_TEMPLATE, validMohoCharacterBible('quadruped'));
}

describe('mohoRenderTools — tool surface', () => {
  it('registers all four expected tool names', () => {
    const names = mohoRenderTools.map(t => t.name);
    expect(names).toEqual(expect.arrayContaining([
      'moho.render.run',
      'moho.render.detect_moho',
      'moho.visual_diff.run',
      'moho.visual_diff.compute_metrics'
    ]));
    expect(mohoRenderTools.length).toBe(4);
  });
});

describe('moho.render.detect_moho', () => {
  it('returns { status: "success", detected: boolean, path: string | null }', async () => {
    const tool = findTool('moho.render.detect_moho');
    const result = await tool.handler({});
    expect(result.status).toBe('success');
    expect(typeof result.detected).toBe('boolean');
    expect(result.path === null || typeof result.path === 'string').toBe(true);
  });

  it('agrees with MohoRenderManager.detectMohoExecutable()', async () => {
    const tool = findTool('moho.render.detect_moho');
    const result = await tool.handler({});
    const direct = MohoRenderManager.detectMohoExecutable();
    expect(result.detected).toBe(direct !== null);
    expect(result.path).toBe(direct);
  });
});

describe('moho.render.run — dry-run mode', () => {
  let outputDir: string;
  beforeEach(() => {
    outputDir = makeTempDir('moho-render-tools');
  });
  afterEach(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  it('returns dry_run status for a valid humanoid plan', async () => {
    const tool = findTool('moho.render.run');
    const plan = buildHumanoidTemplatePlan();
    const result = await tool.handler({
      commandPlan: plan,
      outputDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 24,
      dryRun: true
    });
    expect(result.status).toBe('success');
    expect(result.result.status).toBe('dry_run');
    expect(result.result.outputDir).toBe(outputDir);
    expect(result.result.totalFrames).toBe(24);
    expect(fs.existsSync(path.join(outputDir, 'build_rig.lua'))).toBe(true);
  });

  it('returns dry_run status for a valid quadruped plan', async () => {
    const tool = findTool('moho.render.run');
    const plan = buildQuadrupedTemplatePlan();
    const result = await tool.handler({
      commandPlan: plan,
      outputDir,
      format: 'png_sequence',
      startFrame: 1,
      endFrame: 12,
      dryRun: true
    });
    expect(result.status).toBe('success');
    expect(result.result.status).toBe('dry_run');
    expect(result.result.totalFrames).toBe(12);
  });

  it('returns an error envelope when commandPlan is missing', async () => {
    const tool = findTool('moho.render.run');
    const result = await tool.handler({
      outputDir,
      format: 'png_sequence',
      dryRun: true
    });
    expect(result.status).toBe('error');
    expect(typeof (result as any).code).toBe('string');
    expect((result as any).code.length).toBeGreaterThan(0);
    expect(typeof (result as any).message).toBe('string');
  });
});

describe('moho.visual_diff.compute_metrics', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = makeTempDir('moho-visual-diff');
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns MSE=0 and SSIM=1.0 for byte-identical PNGs', async () => {
    const path1 = path.join(tmpDir, 'a.png');
    const path2 = path.join(tmpDir, 'b.png');
    const bytes = buildPngBytes({ width: 16, height: 16, colorType: 2, fill: { r: 32, g: 64, b: 128 } });
    fs.writeFileSync(path1, bytes);
    fs.writeFileSync(path2, Buffer.from(bytes));

    const tool = findTool('moho.visual_diff.compute_metrics');
    const result = await tool.handler({ baselinePath: path1, candidatePath: path2 });
    expect(result.status).toBe('success');
    expect((result as any).mse).toBe(0);
    expect((result as any).ssim).toBe(1.0);
    expect((result as any).perceptualHashDistance).toBe(0);
  });

  it('returns MSE > 0 for visually different PNGs of the same shape', async () => {
    const path1 = path.join(tmpDir, 'a.png');
    const path2 = path.join(tmpDir, 'b.png');
    writePng(path1, { width: 16, height: 16, colorType: 2, fill: { r: 0, g: 0, b: 0 } });
    writePng(path2, {
      width: 16,
      height: 16,
      colorType: 2,
      fill: (x, y) => ({
        r: ((x * 17 + y * 31) & 0xff),
        g: ((x * 13 + y * 7) & 0xff),
        b: ((x * 5 + y * 11) & 0xff),
        a: 255
      })
    });

    const tool = findTool('moho.visual_diff.compute_metrics');
    const result = await tool.handler({ baselinePath: path1, candidatePath: path2 });
    expect(result.status).toBe('success');
    expect((result as any).mse).toBeGreaterThan(0);
  });
});

describe('moho.visual_diff.run', () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = makeTempDir('moho-visual-diff-run');
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('aggregates metrics over a synthetic frame range', async () => {
    const baselineDir = path.join(tmpDir, 'baseline');
    const candidateDir = path.join(tmpDir, 'candidate');
    fs.mkdirSync(baselineDir, { recursive: true });
    fs.mkdirSync(candidateDir, { recursive: true });

    for (let frame = 1; frame <= 3; frame += 1) {
      const base = path.join(baselineDir, `frame_${String(frame).padStart(4, '0')}.png`);
      const cand = path.join(candidateDir, `frame_${String(frame).padStart(4, '0')}.png`);
      writePng(base, {
        width: 16,
        height: 16,
        colorType: 2,
        fill: (x, y) => ({ r: (x + frame) & 0xff, g: (y + frame) & 0xff, b: 0, a: 255 })
      });
      writePng(cand, {
        width: 16,
        height: 16,
        colorType: 2,
        fill: (x, y) => ({ r: (x + frame) & 0xff, g: (y + frame) & 0xff, b: (frame * 30) & 0xff, a: 255 })
      });
    }

    const tool = findTool('moho.visual_diff.run');
    const result = await tool.handler({
      baselineFramesDir: baselineDir,
      candidateFramesDir: candidateDir,
      frameRange: { start: 1, end: 3 }
    });
    expect(result.status).toBe('success');
    const r: any = (result as any).result;
    expect(r.schemaVersion).toBeDefined();
    expect(r.comparedFrames).toBe(3);
    expect(typeof r.averageMSE).toBe('number');
    expect(typeof r.averageSSIM).toBe('number');
    expect(typeof r.averagePerceptualHash).toBe('number');
    expect(Array.isArray(r.framesWithHighDelta)).toBe(true);
    expect(typeof r.passes).toBe('boolean');
    expect(Array.isArray(r.details)).toBe(true);
    expect(r.details.length).toBe(3);
  });
});