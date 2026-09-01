import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';

import {
  MohoVisualDiffer,
  MohoVisualDiffError,
  DEFAULT_HIGH_DELTA_MSE_THRESHOLD
} from '../src/services/mohoVisualDiffer/index.js';

interface PngSpec {
  width: number;
  height: number;
  colorType: 2;
  pixelBytes: Buffer;
}

let crc32Table: Uint32Array | null = null;

function crc32(buf: Buffer): number {
  if (!crc32Table) {
    crc32Table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      crc32Table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = (crc32Table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

function buildPng(spec: PngSpec): Buffer {
  const { width, height, pixelBytes } = spec;
  const channels = 3;
  if (pixelBytes.length !== width * height * channels) {
    throw new Error(`pixelBytes length mismatch: got ${pixelBytes.length}, expected ${width * height * channels}`);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(2, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const stride = width * channels;
  const filtered = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    filtered[y * (stride + 1)] = 0;
    pixelBytes.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(filtered);

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function solidPng(width: number, height: number, r: number, g: number, b: number): Buffer {
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixels.length; i += 3) {
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
  }
  return buildPng({ width, height, colorType: 2, pixelBytes: pixels });
}

function splitHalfPng(width: number, height: number, top: [number, number, number], bottom: [number, number, number]): Buffer {
  const pixels = Buffer.alloc(width * height * 3);
  const half = Math.floor(height / 2);
  for (let y = 0; y < height; y += 1) {
    const color = y < half ? top : bottom;
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 3;
      pixels[idx] = color[0];
      pixels[idx + 1] = color[1];
      pixels[idx + 2] = color[2];
    }
  }
  return buildPng({ width, height, colorType: 2, pixelBytes: pixels });
}

function writeFrame(dir: string, frame: number, buf: Buffer): void {
  const filename = path.join(dir, `frame_${String(frame).padStart(4, '0')}.png`);
  fs.writeFileSync(filename, buf);
}

function flipBits(hash: string): string {
  let out = '';
  for (let i = 0; i < hash.length; i += 1) {
    out += hash[i] === '0' ? '1' : '0';
  }
  return out;
}

describe('MohoVisualDiffer — pure static helpers', () => {
  const W = 16;
  const H = 16;
  const BLACK = () => solidPng(W, H, 0, 0, 0);
  const WHITE = () => solidPng(W, H, 255, 255, 255);

  describe('computeMSE', () => {
    it('returns 0 for identical buffers', () => {
      const buf = BLACK();
      expect(MohoVisualDiffer.computeMSE(buf, Buffer.from(buf))).toBe(0);
    });

    it('returns > 0 for different buffers', () => {
      const a = BLACK();
      const b = WHITE();
      const mse = MohoVisualDiffer.computeMSE(a, b);
      expect(mse).toBeGreaterThan(0);
      expect(mse).toBeLessThanOrEqual(1);
    });
  });

  describe('computeSSIM', () => {
    it('returns ~1.0 for identical buffers', () => {
      const buf = BLACK();
      const ssim = MohoVisualDiffer.computeSSIM(buf, Buffer.from(buf));
      expect(ssim).toBeGreaterThan(0.99);
      expect(ssim).toBeLessThanOrEqual(1);
    });

    it('returns < 0.5 for very different buffers', () => {
      const a = BLACK();
      const b = WHITE();
      const ssim = MohoVisualDiffer.computeSSIM(a, b);
      expect(ssim).toBeLessThan(0.5);
    });
  });

  describe('computePerceptualHash', () => {
    it('returns the same hash for identical buffers', () => {
      const buf = BLACK();
      expect(MohoVisualDiffer.computePerceptualHash(buf)).toBe(
        MohoVisualDiffer.computePerceptualHash(Buffer.from(buf))
      );
    });

    it('returns a different hash for visually different buffers', () => {
      const a = splitHalfPng(W, H, [0, 0, 0], [255, 255, 255]);
      const b = solidPng(W, H, 255, 255, 255);
      const hashA = MohoVisualDiffer.computePerceptualHash(a);
      const hashB = MohoVisualDiffer.computePerceptualHash(b);
      expect(hashA).not.toBe(hashB);
      expect(MohoVisualDiffer.hammingDistance(hashA, hashB)).toBeGreaterThan(0);
    });
  });

  describe('hammingDistance', () => {
    it('returns 0 for two identical hashes', () => {
      const buf = BLACK();
      const h = MohoVisualDiffer.computePerceptualHash(buf);
      expect(MohoVisualDiffer.hammingDistance(h, h)).toBe(0);
    });

    it('returns 64 for two bitwise-opposite hashes', () => {
      const buf = splitHalfPng(W, H, [0, 0, 0], [255, 255, 255]);
      const h = MohoVisualDiffer.computePerceptualHash(buf);
      const flipped = flipBits(h);
      expect(h.length).toBe(64);
      expect(flipped.length).toBe(64);
      expect(MohoVisualDiffer.hammingDistance(h, flipped)).toBe(64);
    });

    it('throws typed error when hash lengths mismatch', () => {
      expect(() => MohoVisualDiffer.hammingDistance('01', '0110')).toThrow(MohoVisualDiffError);
    });
  });
});

describe('MohoVisualDiffer.diff() — integration', () => {
  const W = 16;
  const H = 16;
  const BLACK = () => solidPng(W, H, 0, 0, 0);
  const WHITE = () => solidPng(W, H, 255, 255, 255);
  const SPLIT = () => splitHalfPng(W, H, [0, 0, 0], [255, 255, 255]);

  let tmpRoot: string;
  let baselineDir: string;
  let candidateDir: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'moho-visual-differ-'));
    baselineDir = path.join(tmpRoot, 'baseline');
    candidateDir = path.join(tmpRoot, 'candidate');
    fs.mkdirSync(baselineDir, { recursive: true });
    fs.mkdirSync(candidateDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('returns MSE=0 and SSIM~=1 when every frame is identical', async () => {
    for (let frame = 1; frame <= 3; frame += 1) {
      const png = BLACK();
      writeFrame(baselineDir, frame, png);
      writeFrame(candidateDir, frame, Buffer.from(png));
    }
    const differ = new MohoVisualDiffer();
    const result = await differ.diff({ baselineFramesDir: baselineDir, candidateFramesDir: candidateDir });

    expect(result.comparedFrames).toBe(3);
    expect(result.averageMSE).toBe(0);
    expect(result.averageSSIM).toBeGreaterThan(0.99);
    expect(result.averageSSIM).toBeLessThanOrEqual(1);
    expect(result.averagePerceptualHash).toBe(0);
    expect(result.framesWithHighDelta).toEqual([]);
    expect(result.passes).toBe(true);
    expect(result.details).toHaveLength(3);
    expect(result.details.every((d) => d.delta === 'none')).toBe(true);
  });

  it('returns MSE > 0 when frames differ', async () => {
    for (let frame = 1; frame <= 3; frame += 1) {
      writeFrame(baselineDir, frame, BLACK());
      writeFrame(candidateDir, frame, WHITE());
    }
    const differ = new MohoVisualDiffer();
    const result = await differ.diff({ baselineFramesDir: baselineDir, candidateFramesDir: candidateDir });

    expect(result.comparedFrames).toBe(3);
    expect(result.averageMSE).toBeGreaterThan(0);
    expect(result.averageSSIM).toBeLessThan(0.5);
    expect(result.passes).toBe(false);
  });

  it('populates framesWithHighDelta only for frames above the MSE threshold', async () => {
    writeFrame(baselineDir, 1, BLACK());
    writeFrame(candidateDir, 1, BLACK());
    writeFrame(baselineDir, 2, BLACK());
    writeFrame(candidateDir, 2, WHITE());
    writeFrame(baselineDir, 3, BLACK());
    writeFrame(candidateDir, 3, BLACK());

    const differ = new MohoVisualDiffer();
    const result = await differ.diff({ baselineFramesDir: baselineDir, candidateFramesDir: candidateDir });

    expect(result.framesWithHighDelta).toContain(2);
    expect(result.framesWithHighDelta).not.toContain(1);
    expect(result.framesWithHighDelta).not.toContain(3);
    expect(result.framesWithHighDelta).toHaveLength(1);
    expect(DEFAULT_HIGH_DELTA_MSE_THRESHOLD).toBe(0.05);
  });

  it('reports passes=true only when averages and framesWithHighDelta all clear', async () => {
    for (let frame = 1; frame <= 4; frame += 1) {
      const png = BLACK();
      writeFrame(baselineDir, frame, png);
      writeFrame(candidateDir, frame, Buffer.from(png));
    }
    const differ = new MohoVisualDiffer();
    const passResult = await differ.diff({ baselineFramesDir: baselineDir, candidateFramesDir: candidateDir });
    expect(passResult.passes).toBe(true);
    expect(passResult.framesWithHighDelta).toEqual([]);

    for (let frame = 1; frame <= 4; frame += 1) {
      writeFrame(candidateDir, frame, WHITE());
    }
    const failResult = await differ.diff({ baselineFramesDir: baselineDir, candidateFramesDir: candidateDir });
    expect(failResult.passes).toBe(false);
    expect(failResult.framesWithHighDelta.length).toBe(4);
  });

  it('throws typed FRAMES_DIR_MISSING when the baseline dir is absent', async () => {
    const differ = new MohoVisualDiffer();
    const missingDir = path.join(tmpRoot, 'does-not-exist');
    let caught: unknown;
    try {
      await differ.diff({ baselineFramesDir: missingDir, candidateFramesDir: candidateDir });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(MohoVisualDiffError);
    expect((caught as MohoVisualDiffError).code).toBe('FRAMES_DIR_MISSING');
  });

  it('throws typed FRAMES_DIR_MISSING when the candidate dir is absent', async () => {
    const differ = new MohoVisualDiffer();
    const missingDir = path.join(tmpRoot, 'does-not-exist');
    let caught: unknown;
    try {
      await differ.diff({ baselineFramesDir: baselineDir, candidateFramesDir: missingDir });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(MohoVisualDiffError);
    expect((caught as MohoVisualDiffError).code).toBe('FRAMES_DIR_MISSING');
  });

  it('throws typed DIMENSION_MISMATCH when frame sizes differ', async () => {
    writeFrame(baselineDir, 1, BLACK());
    writeFrame(candidateDir, 1, solidPng(W + 8, H, 0, 0, 0));

    const differ = new MohoVisualDiffer();
    let caught: unknown;
    try {
      await differ.diff({ baselineFramesDir: baselineDir, candidateFramesDir: candidateDir });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(MohoVisualDiffError);
    expect((caught as MohoVisualDiffError).code).toBe('DIMENSION_MISMATCH');
  });

  it('records major delta and marks high-delta frames when frames diverge', async () => {
    writeFrame(baselineDir, 1, BLACK());
    writeFrame(candidateDir, 1, WHITE());

    const differ = new MohoVisualDiffer();
    const result = await differ.diff({ baselineFramesDir: baselineDir, candidateFramesDir: candidateDir });

    expect(result.details).toHaveLength(1);
    expect(result.details[0].delta).toBe('major');
    expect(result.framesWithHighDelta).toEqual([1]);
  });

  it('honors frameRange to compare a subset of frames', async () => {
    for (let frame = 1; frame <= 4; frame += 1) {
      writeFrame(baselineDir, frame, BLACK());
      writeFrame(candidateDir, frame, WHITE());
    }
    const differ = new MohoVisualDiffer();
    const result = await differ.diff({
      baselineFramesDir: baselineDir,
      candidateFramesDir: candidateDir,
      frameRange: { start: 2, end: 3 }
    });

    expect(result.comparedFrames).toBe(2);
    expect(result.details.map((d) => d.frame)).toEqual([2, 3]);
    expect(result.averageMSE).toBeGreaterThan(0);
  });

  it('uses the frameWithHighDelta criterion consistently with split vs solid', async () => {
    writeFrame(baselineDir, 1, BLACK());
    writeFrame(candidateDir, 1, SPLIT());
    writeFrame(baselineDir, 2, BLACK());
    writeFrame(candidateDir, 2, BLACK());

    const differ = new MohoVisualDiffer();
    const result = await differ.diff({ baselineFramesDir: baselineDir, candidateFramesDir: candidateDir });

    expect(result.framesWithHighDelta).toContain(1);
    expect(result.framesWithHighDelta).not.toContain(2);
  });
});