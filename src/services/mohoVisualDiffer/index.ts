import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';

export const MOHO_VISUAL_DIFFER_SCHEMA_VERSION = '1.0' as const;

export const DEFAULT_HIGH_DELTA_MSE_THRESHOLD = 0.05;
export const MSE_PASS_THRESHOLD = 0.02;
export const SSIM_PASS_THRESHOLD = 0.95;
export const PHASH_PASS_THRESHOLD = 10;

export type MohoVisualDiffErrorCode =
  | 'PNG_DECODE_UNAVAILABLE'
  | 'FRAMES_DIR_MISSING'
  | 'FRAME_READ_FAILED'
  | 'DIMENSION_MISMATCH';

export class MohoVisualDiffError extends Error {
  readonly code: MohoVisualDiffErrorCode;

  constructor(code: MohoVisualDiffErrorCode, message: string) {
    super(message);
    this.name = 'MohoVisualDiffError';
    this.code = code;
  }
}

export interface MohoVisualDiffInput {
  baselineFramesDir: string;
  candidateFramesDir: string;
  frameRange?: { start: number; end: number };
}

export type DeltaCategory = 'none' | 'minor' | 'major';

export interface MohoVisualDiffFrameDetail {
  frame: number;
  mse: number;
  ssim: number;
  phashDistance: number;
  delta: DeltaCategory;
}

export interface MohoVisualDiffResult {
  schemaVersion: typeof MOHO_VISUAL_DIFFER_SCHEMA_VERSION;
  comparedFrames: number;
  averageMSE: number;
  averageSSIM: number;
  averagePerceptualHash: number;
  framesWithHighDelta: number[];
  passes: boolean;
  details: MohoVisualDiffFrameDetail[];
}

interface PngHeader {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  bytesPerPixel: number;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function decodePngHeader(buf: Buffer): PngHeader {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new MohoVisualDiffError('PNG_DECODE_UNAVAILABLE', 'Buffer is not a valid PNG (missing signature).');
  }
  if (buf.toString('ascii', 12, 16) !== 'IHDR') {
    throw new MohoVisualDiffError('PNG_DECODE_UNAVAILABLE', 'PNG missing IHDR chunk.');
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf.readUInt8(24);
  const colorType = buf.readUInt8(25);

  let channels = 0;
  if (colorType === 0) channels = 1;
  else if (colorType === 2) channels = 3;
  else if (colorType === 3) channels = 1;
  else if (colorType === 4) channels = 2;
  else if (colorType === 6) channels = 4;
  else {
    throw new MohoVisualDiffError(
      'PNG_DECODE_UNAVAILABLE',
      `Unsupported PNG color type ${colorType}; cannot decode pixels without an external library.`
    );
  }

  if (bitDepth !== 8) {
    throw new MohoVisualDiffError(
      'PNG_DECODE_UNAVAILABLE',
      `Unsupported PNG bit depth ${bitDepth} (only 8-bit supported in fallback decoder).`
    );
  }

  return { width, height, bitDepth, colorType, bytesPerPixel: channels };
}

function inflateIdatChunks(buf: Buffer): Buffer {
  const chunks: Buffer[] = [];
  let offset = 8;
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IDAT') chunks.push(data);
    if (type === 'IEND') break;
    offset += 12 + length;
  }
  if (chunks.length === 0) {
    throw new MohoVisualDiffError('PNG_DECODE_UNAVAILABLE', 'PNG contained no IDAT chunks.');
  }
  try {
    return zlib.inflateSync(Buffer.concat(chunks));
  } catch {
    throw new MohoVisualDiffError('PNG_DECODE_UNAVAILABLE', 'Failed to inflate PNG IDAT data.');
  }
}

interface DecodedImage {
  width: number;
  height: number;
  bytesPerPixel: number;
  pixels: Uint8Array;
}

function decodePngPixels(buf: Buffer): DecodedImage {
  const header = decodePngHeader(buf);
  const inflated = inflateIdatChunks(buf);
  const stride = header.width * header.bytesPerPixel;
  const expected = header.height * (stride + 1);
  if (inflated.length < expected) {
    throw new MohoVisualDiffError('PNG_DECODE_UNAVAILABLE', 'PNG pixel data is truncated.');
  }

  const out = new Uint8Array(header.width * header.height * header.bytesPerPixel);
  let prevRow = new Uint8Array(stride);
  let srcPos = 0;
  let dstPos = 0;

  for (let y = 0; y < header.height; y += 1) {
    const filter = inflated[srcPos];
    srcPos += 1;
    const row = new Uint8Array(stride);
    for (let x = 0; x < stride; x += 1) {
      const cur = inflated[srcPos];
      srcPos += 1;
      const left = x >= header.bytesPerPixel ? row[x - header.bytesPerPixel] : 0;
      const up = prevRow[x];
      const upLeft = x >= header.bytesPerPixel ? prevRow[x - header.bytesPerPixel] : 0;

      let val = cur;
      switch (filter) {
        case 0:
          val = cur;
          break;
        case 1:
          val = (cur + left) & 0xff;
          break;
        case 2:
          val = (cur + up) & 0xff;
          break;
        case 3:
          val = (cur + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          const pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
          val = (cur + pred) & 0xff;
          break;
        }
        default:
          throw new MohoVisualDiffError('PNG_DECODE_UNAVAILABLE', `Unknown PNG filter ${filter}.`);
      }
      row[x] = val;
    }
    out.set(row, dstPos);
    dstPos += stride;
    prevRow = row;
  }

  return { width: header.width, height: header.height, bytesPerPixel: header.bytesPerPixel, pixels: out };
}

function decodeOrFallback(buf: Buffer): DecodedImage {
  try {
    return decodePngPixels(buf);
  } catch (err) {
    if (err instanceof MohoVisualDiffError) throw err;
    throw new MohoVisualDiffError(
      'PNG_DECODE_UNAVAILABLE',
      `PNG decode failed: ${(err as Error).message || 'unknown error'}`
    );
  }
}

function ensureSameShape(a: DecodedImage, b: DecodedImage): void {
  if (a.width !== b.width || a.height !== b.height) {
    throw new MohoVisualDiffError(
      'DIMENSION_MISMATCH',
      `Image dimensions differ: ${a.width}x${a.height} vs ${b.width}x${b.height}.`
    );
  }
  if (a.bytesPerPixel !== b.bytesPerPixel) {
    throw new MohoVisualDiffError(
      'DIMENSION_MISMATCH',
      `Channel count differs: ${a.bytesPerPixel} vs ${b.bytesPerPixel}.`
    );
  }
}

function averageMSE(a: DecodedImage, b: DecodedImage): number {
  ensureSameShape(a, b);
  const n = a.pixels.length;
  if (n === 0) return 0;
  let acc = 0;
  for (let i = 0; i < n; i += 1) {
    const d = a.pixels[i] - b.pixels[i];
    acc += d * d;
  }
  const perChannel = acc / n;
  const normalized = perChannel / (255 * 255);
  return Math.max(0, Math.min(1, normalized));
}

interface BlockStats {
  muX: number;
  muY: number;
  sigmaX: number;
  sigmaY: number;
  sigmaXY: number;
}

function computeBlockStats(a: DecodedImage, b: DecodedImage, gridX: number, gridY: number): BlockStats[] {
  const w = a.width;
  const h = a.height;
  const cellW = w / gridX;
  const cellH = h / gridY;
  const channels = a.bytesPerPixel;
  const out: BlockStats[] = [];
  for (let gy = 0; gy < gridY; gy += 1) {
    for (let gx = 0; gx < gridX; gx += 1) {
      const x0 = Math.floor(gx * cellW);
      const y0 = Math.floor(gy * cellH);
      const x1 = Math.min(w, Math.floor((gx + 1) * cellW));
      const y1 = Math.min(h, Math.floor((gy + 1) * cellH));
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const idx = (y * w + x) * channels;
          let vx = 0;
          let vy = 0;
          if (channels >= 3) {
            vx = 0.299 * a.pixels[idx] + 0.587 * a.pixels[idx + 1] + 0.114 * a.pixels[idx + 2];
            vy = 0.299 * b.pixels[idx] + 0.587 * b.pixels[idx + 1] + 0.114 * b.pixels[idx + 2];
          } else {
            vx = a.pixels[idx];
            vy = b.pixels[idx];
          }
          sumX += vx;
          sumY += vy;
          count += 1;
        }
      }
      if (count === 0) {
        out.push({ muX: 0, muY: 0, sigmaX: 0, sigmaY: 0, sigmaXY: 0 });
        continue;
      }
      const muX = sumX / count;
      const muY = sumY / count;

      let varX = 0;
      let varY = 0;
      let covXY = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const idx = (y * w + x) * channels;
          let vx = 0;
          let vy = 0;
          if (channels >= 3) {
            vx = 0.299 * a.pixels[idx] + 0.587 * a.pixels[idx + 1] + 0.114 * a.pixels[idx + 2];
            vy = 0.299 * b.pixels[idx] + 0.587 * b.pixels[idx + 1] + 0.114 * b.pixels[idx + 2];
          } else {
            vx = a.pixels[idx];
            vy = b.pixels[idx];
          }
          const dx = vx - muX;
          const dy = vy - muY;
          varX += dx * dx;
          varY += dy * dy;
          covXY += dx * dy;
        }
      }
      out.push({
        muX,
        muY,
        sigmaX: varX / count,
        sigmaY: varY / count,
        sigmaXY: covXY / count
      });
    }
  }
  return out;
}

function averageSSIM(a: DecodedImage, b: DecodedImage): number {
  ensureSameShape(a, b);
  if (a.pixels.length === 0) return 1;

  const gridX = 8;
  const gridY = 8;
  const blocks = computeBlockStats(a, b, gridX, gridY);

  const K1 = 0.01;
  const K2 = 0.03;
  const L = 255;
  const C1 = (K1 * L) * (K1 * L);
  const C2 = (K2 * L) * (K2 * L);

  let acc = 0;
  let valid = 0;
  for (const block of blocks) {
    const { muX, muY, sigmaX, sigmaY, sigmaXY } = block;
    const numerator = (2 * muX * muY + C1) * (2 * sigmaXY + C2);
    const denominator = (muX * muX + muY * muY + C1) * (sigmaX + sigmaY + C2);
    if (denominator === 0) continue;
    acc += numerator / denominator;
    valid += 1;
  }

  if (valid === 0) return 0;
  const avg = acc / valid;
  return Math.max(-1, Math.min(1, avg));
}

function computePerceptualHashFromImage(image: DecodedImage): string {
  const target = 8;
  const resized = new Float64Array(target * target);
  const cellW = image.width / target;
  const cellH = image.height / target;
  const channels = image.bytesPerPixel;
  for (let gy = 0; gy < target; gy += 1) {
    for (let gx = 0; gx < target; gx += 1) {
      const x0 = Math.floor(gx * cellW);
      const y0 = Math.floor(gy * cellH);
      const x1 = Math.min(image.width, Math.floor((gx + 1) * cellW));
      const y1 = Math.min(image.height, Math.floor((gy + 1) * cellH));
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const idx = (y * image.width + x) * channels;
          let r = 0;
          let g = 0;
          let b = 0;
          if (channels >= 3) {
            r = image.pixels[idx];
            g = image.pixels[idx + 1];
            b = image.pixels[idx + 2];
          } else {
            r = image.pixels[idx];
            g = image.pixels[idx];
            b = image.pixels[idx];
          }
          sum += 0.299 * r + 0.587 * g + 0.114 * b;
          count += 1;
        }
      }
      resized[gy * target + gx] = count > 0 ? sum / count : 0;
    }
  }

  let mean = 0;
  for (let i = 0; i < resized.length; i += 1) mean += resized[i];
  mean /= resized.length;

  let bits = '';
  for (let i = 0; i < resized.length; i += 1) {
    bits += resized[i] >= mean ? '1' : '0';
  }
  return bits;
}

function classifyDelta(mse: number, ssim: number, phashDist: number): DeltaCategory {
  if (mse > DEFAULT_HIGH_DELTA_MSE_THRESHOLD || ssim < 0.85 || phashDist > 20) return 'major';
  if (mse > 0.01 || ssim < 0.95 || phashDist > 6) return 'minor';
  return 'none';
}

function listFrameNumbers(dir: string): number[] {
  if (!fs.existsSync(dir)) {
    throw new MohoVisualDiffError('FRAMES_DIR_MISSING', `Frames directory not found: ${dir}`);
  }
  const entries = fs.readdirSync(dir);
  const frames: number[] = [];
  for (const entry of entries) {
    if (!entry.toLowerCase().endsWith('.png')) continue;
    const stem = entry.replace(/\.png$/i, '');
    const m = stem.match(/(\d+)$/);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n)) frames.push(n);
  }
  return frames.sort((a, b) => a - b);
}

function readFrameBuffer(dir: string, frame: number): Buffer {
  const candidates = [
    path.join(dir, `frame_${frame}.png`),
    path.join(dir, `${frame}.png`),
    path.join(dir, `frame_${String(frame).padStart(4, '0')}.png`)
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate);
    }
  }
  throw new MohoVisualDiffError(
    'FRAME_READ_FAILED',
    `No PNG frame matching index ${frame} found in ${dir}.`
  );
}

export class MohoVisualDiffer {
  async diff(input: MohoVisualDiffInput): Promise<MohoVisualDiffResult> {
    if (!fs.existsSync(input.baselineFramesDir)) {
      throw new MohoVisualDiffError(
        'FRAMES_DIR_MISSING',
        `Baseline frames directory not found: ${input.baselineFramesDir}`
      );
    }
    if (!fs.existsSync(input.candidateFramesDir)) {
      throw new MohoVisualDiffError(
        'FRAMES_DIR_MISSING',
        `Candidate frames directory not found: ${input.candidateFramesDir}`
      );
    }

    const allFrames = listFrameNumbers(input.baselineFramesDir);
    const range = input.frameRange;
    const frames = range
      ? allFrames.filter(n => n >= range.start && n <= range.end)
      : allFrames;

    const details: MohoVisualDiffFrameDetail[] = [];
    let mseSum = 0;
    let ssimSum = 0;
    let phashSum = 0;
    let counted = 0;

    for (const frame of frames) {
      let baselineBuf: Buffer;
      let candidateBuf: Buffer;
      try {
        baselineBuf = readFrameBuffer(input.baselineFramesDir, frame);
      } catch (err) {
        if (err instanceof MohoVisualDiffError) throw err;
        throw new MohoVisualDiffError(
          'FRAME_READ_FAILED',
          `Failed to read baseline frame ${frame}: ${(err as Error).message}`
        );
      }
      try {
        candidateBuf = readFrameBuffer(input.candidateFramesDir, frame);
      } catch {
        details.push({ frame, mse: 1, ssim: -1, phashDistance: 64, delta: 'major' });
        mseSum += 1;
        ssimSum += -1;
        phashSum += 64;
        counted += 1;
        continue;
      }

      const baselineImage = decodeOrFallback(baselineBuf);
      const candidateImage = decodeOrFallback(candidateBuf);

      const mse = MohoVisualDiffer.computeMSEFromImages(baselineImage, candidateImage);
      const ssim = MohoVisualDiffer.computeSSIMFromImages(baselineImage, candidateImage);
      const baseHash = computePerceptualHashFromImage(baselineImage);
      const candHash = computePerceptualHashFromImage(candidateImage);
      const phash = MohoVisualDiffer.hammingDistance(baseHash, candHash);
      const delta = classifyDelta(mse, ssim, phash);

      details.push({ frame, mse, ssim, phashDistance: phash, delta });
      mseSum += mse;
      ssimSum += ssim;
      phashSum += phash;
      counted += 1;
    }

    const comparedFrames = counted;
    const averageMSE = counted > 0 ? mseSum / counted : 0;
    const averageSSIM = counted > 0 ? ssimSum / counted : 0;
    const averagePerceptualHash = counted > 0 ? phashSum / counted : 0;
    const framesWithHighDelta = details
      .filter(d => d.mse > DEFAULT_HIGH_DELTA_MSE_THRESHOLD)
      .map(d => d.frame);

    const passes =
      counted > 0 &&
      averageMSE <= MSE_PASS_THRESHOLD &&
      averageSSIM >= SSIM_PASS_THRESHOLD &&
      averagePerceptualHash <= PHASH_PASS_THRESHOLD &&
      framesWithHighDelta.length === 0;

    return {
      schemaVersion: MOHO_VISUAL_DIFFER_SCHEMA_VERSION,
      comparedFrames,
      averageMSE,
      averageSSIM,
      averagePerceptualHash,
      framesWithHighDelta,
      passes,
      details
    };
  }

  static computeMSE(buf1: Buffer, buf2: Buffer): number {
    const a = decodeOrFallback(buf1);
    const b = decodeOrFallback(buf2);
    return MohoVisualDiffer.computeMSEFromImages(a, b);
  }

  static computeSSIM(buf1: Buffer, buf2: Buffer): number {
    const a = decodeOrFallback(buf1);
    const b = decodeOrFallback(buf2);
    return MohoVisualDiffer.computeSSIMFromImages(a, b);
  }

  static computePerceptualHash(buf: Buffer): string {
    const image = decodeOrFallback(buf);
    return computePerceptualHashFromImage(image);
  }

  static hammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      throw new MohoVisualDiffError(
        'PNG_DECODE_UNAVAILABLE',
        `Hash length mismatch: ${hash1.length} vs ${hash2.length}.`
      );
    }
    let dist = 0;
    for (let i = 0; i < hash1.length; i += 1) {
      if (hash1[i] !== hash2[i]) dist += 1;
    }
    return dist;
  }

  static computeMSEFromImages(a: DecodedImage, b: DecodedImage): number {
    return averageMSE(a, b);
  }

  static computeSSIMFromImages(a: DecodedImage, b: DecodedImage): number {
    return averageSSIM(a, b);
  }

  fingerprint(payload: object): string {
    const json = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }
}