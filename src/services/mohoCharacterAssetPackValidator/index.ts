import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { mohoCharacterAssetPackV1Schema } from '../../schemas/mohoCharacterAssetPackV1.js';
import { verifyPathAccess } from '../../security.js';

export type MohoCharacterAssetPackErrorCode =
  | 'PACK_NOT_FOUND'
  | 'PACK_INVALID_JSON'
  | 'PACK_SCHEMA_INVALID'
  | 'JOINT_OVERLAP_REQUIRED'
  | 'ASSET_NOT_FOUND'
  | 'ASSET_EMPTY'
  | 'ASSET_FORMAT_INVALID'
  | 'ASSET_NOT_TRANSPARENT'
  | 'HASH_MISMATCH';

export interface MohoCharacterAssetPackValidationError {
  code: MohoCharacterAssetPackErrorCode;
  path: string;
  message: string;
}

export interface MohoCharacterAssetPackValidationReport {
  valid: boolean;
  characterId: string | null;
  assetCount: number;
  resolvedAssets: string[];
  errors: MohoCharacterAssetPackValidationError[];
}

function schemaErrorCode(message: string): MohoCharacterAssetPackErrorCode {
  return message === 'jointOverlapPx must be greater than zero for limb layers.'
    ? 'JOINT_OVERLAP_REQUIRED'
    : 'PACK_SCHEMA_INVALID';
}

function hasPngAlpha(bytes: Buffer): boolean {
  if (bytes.length < 26 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return false;
  }
  const colourType = bytes[25];
  return colourType === 4 || colourType === 6 || bytes.includes(Buffer.from('tRNS'));
}

function isSvg(bytes: Buffer): boolean {
  return /<svg(?:\s|>)/i.test(bytes.toString('utf8', 0, Math.min(bytes.length, 4096)));
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function validateMohoCharacterAssetPack(packPath: string): MohoCharacterAssetPackValidationReport {
  const errors: MohoCharacterAssetPackValidationError[] = [];
  let verifiedPackPath: string;
  try {
    verifiedPackPath = verifyPathAccess(packPath);
  } catch (error) {
    return {
      valid: false,
      characterId: null,
      assetCount: 0,
      resolvedAssets: [],
      errors: [{ code: 'PACK_NOT_FOUND', path: 'packPath', message: error instanceof Error ? error.message : String(error) }]
    };
  }
  if (!fs.existsSync(verifiedPackPath) || !fs.statSync(verifiedPackPath).isFile()) {
    return {
      valid: false,
      characterId: null,
      assetCount: 0,
      resolvedAssets: [],
      errors: [{ code: 'PACK_NOT_FOUND', path: 'packPath', message: `Character pack does not exist: ${verifiedPackPath}` }]
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(verifiedPackPath, 'utf8'));
  } catch (error) {
    return {
      valid: false,
      characterId: null,
      assetCount: 0,
      resolvedAssets: [],
      errors: [{ code: 'PACK_INVALID_JSON', path: 'packPath', message: error instanceof Error ? error.message : String(error) }]
    };
  }

  const parsed = mohoCharacterAssetPackV1Schema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({
        code: schemaErrorCode(issue.message),
        path: issue.path.join('.'),
        message: issue.message
      });
    }
    return {
      valid: false,
      characterId: typeof (raw as { characterId?: unknown })?.characterId === 'string'
        ? (raw as { characterId: string }).characterId
        : null,
      assetCount: 0,
      resolvedAssets: [],
      errors
    };
  }

  const resolvedAssets: string[] = [];
  for (const [index, layer] of parsed.data.layers.entries()) {
    let assetPath: string;
    try {
      assetPath = verifyPathAccess(path.resolve(path.dirname(verifiedPackPath), layer.sourcePath));
    } catch (error) {
      errors.push({
        code: 'ASSET_NOT_FOUND',
        path: `layers.${index}.sourcePath`,
        message: error instanceof Error ? error.message : String(error)
      });
      continue;
    }
    if (!fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) {
      errors.push({ code: 'ASSET_NOT_FOUND', path: `layers.${index}.sourcePath`, message: `Asset does not exist: ${layer.sourcePath}` });
      continue;
    }
    const bytes = fs.readFileSync(assetPath);
    if (bytes.length === 0) {
      errors.push({ code: 'ASSET_EMPTY', path: `layers.${index}.sourcePath`, message: `Asset is empty: ${layer.sourcePath}` });
      continue;
    }
    const extension = path.extname(assetPath).toLowerCase();
    if (extension === '.png') {
      if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        errors.push({ code: 'ASSET_FORMAT_INVALID', path: `layers.${index}.sourcePath`, message: `Asset is not a valid PNG: ${layer.sourcePath}` });
      } else if (!hasPngAlpha(bytes)) {
        errors.push({ code: 'ASSET_NOT_TRANSPARENT', path: `layers.${index}.sourcePath`, message: `PNG has no alpha channel: ${layer.sourcePath}` });
      }
    } else if (extension === '.svg') {
      if (!isSvg(bytes)) {
        errors.push({ code: 'ASSET_FORMAT_INVALID', path: `layers.${index}.sourcePath`, message: `Asset is not a valid SVG: ${layer.sourcePath}` });
      }
    } else {
      errors.push({ code: 'ASSET_FORMAT_INVALID', path: `layers.${index}.sourcePath`, message: `Unsupported asset format: ${layer.sourcePath}` });
    }
    if (sha256(bytes) !== layer.sha256) {
      errors.push({ code: 'HASH_MISMATCH', path: `layers.${index}.sha256`, message: `SHA-256 mismatch for ${layer.sourcePath}` });
    }
    resolvedAssets.push(assetPath);
  }

  return {
    valid: errors.length === 0,
    characterId: parsed.data.characterId,
    assetCount: parsed.data.layers.length,
    resolvedAssets,
    errors
  };
}
