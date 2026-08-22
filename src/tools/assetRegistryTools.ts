import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createStandardExecutionResult } from '../schemas/executionResult.js';
import { assetLicenseSchema, assertLicenseAllowed } from '../schemas/assetLicense.js';
import { verifyPathAccess } from '../security.js';
import { defineTool } from './defineTool.js';

/**
 * assetRegistryTools — asset planning, import, validation and versioning.
 *
 * This was the least honest module in the codebase: 8 of 10 tools returned
 * `status: 'success'` with invented data and no `placeholder` flag, so a caller
 * could not tell them from working code. Specifically:
 *   * `check_license` always answered `Commercial_Approved, clean: true`;
 *   * `validate` always answered `valid: true` without opening the file;
 *   * `version` always returned `2`;
 *   * `build_manifest` returned a path to a file it never wrote;
 *   * `find_reuse_candidates` always returned an empty list.
 *
 * All of it is filesystem + hashing work — no Harmony, no network, no models.
 * The registry lives as JSON on disk so versions and approvals actually persist.
 */

const DEFAULT_REGISTRY_DIR = path.join('output', 'asset_registry');
const REGISTRY_FILENAME = 'registry.json';

const assetTypeSchema = z.enum([
  'character', 'background', 'prop', 'rig', 'palette', 'audio', 'font', 'other'
]);

interface AssetVersion {
  version: number;
  sha256: string;
  sizeBytes: number;
  sourcePath: string;
  storedPath: string;
  createdAt: string;
}

interface AssetRecord {
  assetId: string;
  assetType: string;
  versions: AssetVersion[];
  currentVersion: number;
  approved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  licensePath?: string;
}

interface Registry {
  schemaVersion: string;
  updatedAt: string;
  assets: Record<string, AssetRecord>;
}

function registryPath(registryDir?: string): string {
  return path.join(
    verifyPathAccess(registryDir ?? path.join(process.cwd(), DEFAULT_REGISTRY_DIR)),
    REGISTRY_FILENAME
  );
}

function loadRegistry(registryDir?: string): { registry: Registry; file: string } {
  const file = registryPath(registryDir);
  if (!fs.existsSync(file)) {
    return {
      registry: { schemaVersion: '1.0', updatedAt: new Date().toISOString(), assets: {} },
      file
    };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as Registry;
    if (!parsed.assets) parsed.assets = {};
    return { registry: parsed, file };
  } catch {
    // A corrupt registry must not silently become an empty one that then gets
    // overwritten — surface it instead.
    throw new Error(`[REGISTRY_CORRUPT] Реестр повреждён и не читается: ${file}`);
  }
}

function saveRegistry(registry: Registry, file: string): void {
  registry.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(registry, null, 2), 'utf-8');
}

function sha256OfFile(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/** Image/media header inspection. Extension alone proves nothing. */
interface ProbedFile {
  format: string;
  width?: number;
  height?: number;
  hasAlpha?: boolean;
  bitDepth?: number;
}

function probeFile(buffer: Buffer): ProbedFile {
  // PNG: signature, then IHDR carries dimensions and colour type.
  if (buffer.length > 26 && buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    const bitDepth = buffer[24];
    const colourType = buffer[25];
    // Colour types 4 (grey+alpha) and 6 (RGBA) carry an alpha channel.
    return { format: 'png', width, height, bitDepth, hasAlpha: colourType === 4 || colourType === 6 };
  }

  // JPEG: walk segment markers to find a SOFn frame header.
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset++; continue; }
      const marker = buffer[offset + 1];
      // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
      const isSof = marker >= 0xc0 && marker <= 0xcf
        && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        return {
          format: 'jpeg',
          bitDepth: buffer[offset + 4],
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
          hasAlpha: false // JPEG has no alpha channel.
        };
      }
      offset += 2 + buffer.readUInt16BE(offset + 2);
    }
    return { format: 'jpeg', hasAlpha: false };
  }

  const head = buffer.toString('ascii', 0, Math.min(buffer.length, 400));
  if (head.includes('<svg')) {
    const width = /width="([\d.]+)/.exec(head)?.[1];
    const height = /height="([\d.]+)/.exec(head)?.[1];
    return {
      format: 'svg',
      width: width ? Math.round(Number(width)) : undefined,
      height: height ? Math.round(Number(height)) : undefined,
      hasAlpha: true
    };
  }
  if (buffer.length > 4 && buffer.toString('ascii', 0, 4) === '8BPS') {
    // PSD: header carries dimensions at fixed offsets.
    return {
      format: 'psd',
      height: buffer.length > 18 ? buffer.readUInt32BE(14) : undefined,
      width: buffer.length > 22 ? buffer.readUInt32BE(18) : undefined,
      hasAlpha: true
    };
  }
  if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE') {
    return { format: 'wav' };
  }
  if (buffer.length > 4 && buffer.toString('ascii', 0, 4) === 'TPL\0') {
    return { format: 'harmony_template' };
  }
  return { format: 'unknown' };
}

/** A 1x1 fully transparent PNG, byte-for-byte valid. */
function transparentPngBytes(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYGBgAAAABQABijPjAAAAAElFTkSuQmCC',
    'base64'
  );
}

/** Locate the asset_license.json governing a file, nearest-first. */
function findLicenseFor(filePath: string): string | undefined {
  let dir = path.dirname(path.resolve(filePath));
  const root = path.parse(dir).root;
  while (true) {
    const candidate = path.join(dir, 'asset_license.json');
    if (fs.existsSync(candidate)) return candidate;
    if (dir === root) return undefined;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

export const assetRegistryTools = [
  defineTool({
    name: 'harmony.assets.plan',
    description: 'Спланировать нужные ассеты по составу сцены (реальный расчёт, не фиксированный список).',
    inputSchema: z.object({
      sceneId: z.string(),
      characters: z.array(z.string()).optional().default([]),
      locations: z.array(z.string()).optional().default([]),
      props: z.array(z.string()).optional().default([]),
      requiresLipSync: z.boolean().optional().default(false),
      viewAngles: z.array(z.string()).optional().default(['front', 'three_quarter', 'side'])
    }),
    handler: async (args) => {
      const characters = args.characters ?? [];
      const locations = args.locations ?? [];
      const props = args.props ?? [];
      const viewAngles = args.viewAngles ?? ['front', 'three_quarter', 'side'];
      const requiresLipSync = args.requiresLipSync ?? false;

      const requiredAssets: Array<{ id: string; type: string; reason: string }> = [];

      // Every character needs a design per view angle plus a rig.
      for (const character of characters) {
        for (const angle of viewAngles) {
          requiredAssets.push({
            id: `char_${character}_${angle}`,
            type: 'character',
            reason: `Дизайн персонажа "${character}", ракурс ${angle}.`
          });
        }
        requiredAssets.push({
          id: `rig_${character}`,
          type: 'rig',
          reason: `Cutout-риг для "${character}".`
        });
        if (requiresLipSync) {
          requiredAssets.push({
            id: `mouth_chart_${character}`,
            type: 'character',
            reason: `Карта рта (виземы A-H, X) для липсинка "${character}".`
          });
        }
      }
      // Backgrounds are multiplane: several layers per location.
      for (const location of locations) {
        for (const layer of ['sky', 'far_bg', 'mid_bg', 'floor', 'foreground']) {
          requiredAssets.push({
            id: `bg_${location}_${layer}`,
            type: 'background',
            reason: `Слой ${layer} для локации "${location}".`
          });
        }
      }
      for (const prop of props) {
        requiredAssets.push({ id: `prop_${prop}`, type: 'prop', reason: `Реквизит "${prop}".` });
      }

      const byType = requiredAssets.reduce<Record<string, number>>((acc, asset) => {
        acc[asset.type] = (acc[asset.type] ?? 0) + 1;
        return acc;
      }, {});

      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          warnings: requiredAssets.length === 0
            ? ['Ни персонажей, ни локаций, ни реквизита не передано — план пуст.']
            : [],
          details: {
            sceneId: args.sceneId,
            assetCount: requiredAssets.length,
            countsByType: byType,
            requiredAssets
          }
        }),
        verification: 'verified_real'
      };
    }
  }),

  defineTool({
    name: 'harmony.assets.generate',
    description: 'Сгенерировать ассет через image-бэкенд (реальный вызов или честный placeholder).',
    inputSchema: z.object({
      assetId: z.string(),
      prompt: z.string().describe('Описание стиля/содержания ассета.'),
      assetType: assetTypeSchema.optional().default('other'),
      view: z.string().optional().default('front').describe('Ракурс для персонажа.'),
      outputPath: z.string().optional()
    }),
    handler: async (args) => {
      const { generateCharacterTurnaround, generateBackground } =
        await import('../adapters/backends/imageBackend.js');
      const result = args.assetType === 'background'
        ? await generateBackground(args.assetId, args.prompt, args.outputPath)
        : await generateCharacterTurnaround(
            args.assetId, args.view ?? 'front', args.prompt, args.outputPath
          );

      const isReal = result.origin === 'real';
      return {
        ...createStandardExecutionResult({
          status: isReal ? 'success' : 'simulation_success',
          simulated: !isReal,
          placeholder: !isReal,
          isRealHarmonyExecution: false,
          artifacts: result.outputPath ? [result.outputPath] : [],
          details: {
            assetId: args.assetId,
            assetType: args.assetType,
            path: result.outputPath,
            origin: result.origin
          }
        }),
        verification: isReal ? 'verified_real' : 'mock_only'
      };
    }
  }),

  defineTool({
    name: 'harmony.assets.import',
    description: 'Импортировать ассет в реестр: копия, SHA-256, версия (реальная запись на диск).',
    inputSchema: z.object({
      filePath: z.string(),
      assetType: assetTypeSchema,
      assetId: z.string().optional().describe('По умолчанию — имя файла без расширения.'),
      registryDir: z.string().optional()
    }),
    handler: async (args) => {
      const source = verifyPathAccess(args.filePath);
      if (!fs.existsSync(source)) {
        return createStandardExecutionResult({
          status: 'blocked',
          simulated: false,
          isRealHarmonyExecution: false,
          errors: [`[FILE_NOT_FOUND] Файл не найден: ${source}`],
          details: { filePath: source }
        });
      }

      const assetId = args.assetId ?? path.basename(source, path.extname(source));
      const { registry, file } = loadRegistry(args.registryDir);
      const digest = sha256OfFile(source);
      const sizeBytes = fs.statSync(source).size;

      const record: AssetRecord = registry.assets[assetId] ?? {
        assetId, assetType: args.assetType, versions: [], currentVersion: 0, approved: false
      };

      // Re-importing identical bytes must not invent a new version.
      const existing = record.versions.find(v => v.sha256 === digest);
      if (existing) {
        return {
          ...createStandardExecutionResult({
            status: 'success',
            simulated: false,
            isRealHarmonyExecution: false,
            warnings: [`Файл уже импортирован как версия ${existing.version} (тот же SHA-256).`],
            details: {
              assetId, assetType: record.assetType, importedPath: existing.storedPath,
              version: existing.version, sha256: digest, deduplicated: true
            }
          }),
          verification: 'verified_real'
        };
      }

      const version = record.currentVersion + 1;
      const storeDir = path.join(path.dirname(file), 'assets', assetId, `v${version}`);
      fs.mkdirSync(storeDir, { recursive: true });
      const storedPath = path.join(storeDir, path.basename(source));
      fs.copyFileSync(source, storedPath);

      record.versions.push({
        version, sha256: digest, sizeBytes,
        sourcePath: source, storedPath, createdAt: new Date().toISOString()
      });
      record.currentVersion = version;
      // A new version invalidates any prior approval.
      record.approved = false;
      record.approvedAt = undefined;
      record.licensePath = findLicenseFor(source);
      registry.assets[assetId] = record;
      saveRegistry(registry, file);

      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          artifacts: [storedPath],
          details: {
            assetId, assetType: record.assetType, importedPath: storedPath,
            version, sha256: digest, sizeBytes,
            licenseFound: record.licensePath !== undefined,
            registryFile: file
          }
        }),
        verification: 'verified_real'
      };
    }
  }),

  defineTool({
    name: 'harmony.assets.validate',
    description: 'Проверить файл ассета: формат, размеры, альфа-канал (реальное чтение заголовков).',
    inputSchema: z.object({
      filePath: z.string(),
      minWidth: z.number().int().positive().optional(),
      minHeight: z.number().int().positive().optional(),
      requireAlpha: z.boolean().optional().default(false),
      expectedFormats: z.array(z.string()).optional()
    }),
    handler: async (args) => {
      const resolved = verifyPathAccess(args.filePath);
      if (!fs.existsSync(resolved)) {
        return createStandardExecutionResult({
          status: 'blocked',
          simulated: false,
          isRealHarmonyExecution: false,
          errors: [`[FILE_NOT_FOUND] Файл не найден: ${resolved}`],
          details: { filePath: resolved, valid: false }
        });
      }

      const buffer = fs.readFileSync(resolved);
      const probed = probeFile(buffer);
      const issues: string[] = [];

      if (buffer.length === 0) issues.push('Файл пустой.');
      if (probed.format === 'unknown') {
        issues.push('Формат не распознан по magic bytes — файл повреждён или не является ассетом.');
      }
      if (args.expectedFormats && !args.expectedFormats.includes(probed.format)) {
        issues.push(`Формат "${probed.format}" не входит в ожидаемые: ${args.expectedFormats.join(', ')}.`);
      }
      if (args.minWidth !== undefined && probed.width !== undefined && probed.width < args.minWidth) {
        issues.push(`Ширина ${probed.width}px меньше требуемых ${args.minWidth}px.`);
      }
      if (args.minHeight !== undefined && probed.height !== undefined && probed.height < args.minHeight) {
        issues.push(`Высота ${probed.height}px меньше требуемых ${args.minHeight}px.`);
      }
      if (args.requireAlpha && probed.hasAlpha === false) {
        issues.push('Требуется альфа-канал, но формат его не содержит.');
      }
      // Dimension checks are only meaningful if we could read them.
      const dimensionsUnknown = probed.width === undefined || probed.height === undefined;
      if ((args.minWidth || args.minHeight) && dimensionsUnknown) {
        issues.push('Размеры не читаются из заголовка — проверка разрешения не выполнена.');
      }

      const valid = issues.length === 0;
      return {
        ...createStandardExecutionResult({
          status: valid ? 'success' : 'partial_success',
          simulated: false,
          isRealHarmonyExecution: false,
          errors: valid ? [] : issues,
          details: {
            filePath: resolved,
            valid,
            sizeBytes: buffer.length,
            sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
            detectedFormat: probed.format,
            width: probed.width ?? null,
            height: probed.height ?? null,
            hasAlpha: probed.hasAlpha ?? null,
            bitDepth: probed.bitDepth ?? null,
            issues
          }
        }),
        verification: 'verified_real'
      };
    }
  }),

  defineTool({
    name: 'harmony.assets.version',
    description: 'Показать/создать версию ассета по реальному реестру (не фиксированное «2»).',
    inputSchema: z.object({
      assetId: z.string(),
      registryDir: z.string().optional()
    }),
    handler: async (args) => {
      const { registry } = loadRegistry(args.registryDir);
      const record = registry.assets[args.assetId];

      if (!record) {
        return {
          ...createStandardExecutionResult({
            status: 'blocked',
            simulated: false,
            isRealHarmonyExecution: false,
            errors: [`Ассет "${args.assetId}" отсутствует в реестре. Сначала выполните harmony.assets.import.`],
            details: { assetId: args.assetId, knownAssets: Object.keys(registry.assets) }
          }),
          verification: 'verified_real'
        };
      }

      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          details: {
            assetId: args.assetId,
            version: record.currentVersion,
            versionCount: record.versions.length,
            approved: record.approved,
            versions: record.versions.map(v => ({
              version: v.version, sha256: v.sha256, sizeBytes: v.sizeBytes, createdAt: v.createdAt
            }))
          }
        }),
        verification: 'verified_real'
      };
    }
  }),

  defineTool({
    name: 'harmony.assets.approve',
    description: 'Утвердить ассет: запись в реестр с версией и хешем (реальная фиксация).',
    inputSchema: z.object({
      assetId: z.string(),
      approvedBy: z.string().optional().default('unspecified'),
      registryDir: z.string().optional()
    }),
    handler: async (args) => {
      const { registry, file } = loadRegistry(args.registryDir);
      const record = registry.assets[args.assetId];

      if (!record) {
        return {
          ...createStandardExecutionResult({
            status: 'blocked',
            simulated: false,
            isRealHarmonyExecution: false,
            errors: [`Нельзя утвердить неизвестный ассет "${args.assetId}".`],
            details: { assetId: args.assetId }
          }),
          verification: 'verified_real'
        };
      }
      if (record.versions.length === 0) {
        return {
          ...createStandardExecutionResult({
            status: 'blocked',
            simulated: false,
            isRealHarmonyExecution: false,
            errors: [`У ассета "${args.assetId}" нет ни одной импортированной версии.`],
            details: { assetId: args.assetId }
          }),
          verification: 'verified_real'
        };
      }

      record.approved = true;
      record.approvedAt = new Date().toISOString();
      record.approvedBy = args.approvedBy;
      saveRegistry(registry, file);

      const current = record.versions.find(v => v.version === record.currentVersion)!;
      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          details: {
            assetId: args.assetId,
            approved: true,
            approvedVersion: record.currentVersion,
            // Pin the digest: an approval applies to exact bytes, not a name.
            approvedSha256: current.sha256,
            approvedAt: record.approvedAt,
            approvedBy: record.approvedBy
          }
        }),
        verification: 'verified_real'
      };
    }
  }),

  defineTool({
    name: 'harmony.assets.find_reuse_candidates',
    description: 'Найти в реестре ассеты для повторного использования (реальный поиск, не пустой список).',
    inputSchema: z.object({
      assetType: assetTypeSchema.optional(),
      approvedOnly: z.boolean().optional().default(false),
      nameContains: z.string().optional(),
      registryDir: z.string().optional()
    }),
    handler: async (args) => {
      const { registry } = loadRegistry(args.registryDir);
      let records = Object.values(registry.assets);

      if (args.assetType) records = records.filter(r => r.assetType === args.assetType);
      if (args.approvedOnly) records = records.filter(r => r.approved);
      if (args.nameContains) {
        const needle = args.nameContains.toLowerCase();
        records = records.filter(r => r.assetId.toLowerCase().includes(needle));
      }

      const candidates = records.map(record => {
        const current = record.versions.find(v => v.version === record.currentVersion);
        return {
          assetId: record.assetId,
          assetType: record.assetType,
          version: record.currentVersion,
          approved: record.approved,
          sha256: current?.sha256,
          sizeBytes: current?.sizeBytes,
          storedPath: current?.storedPath
        };
      });

      // Identical bytes under different ids: a real duplicate worth collapsing.
      const byDigest = new Map<string, string[]>();
      for (const candidate of candidates) {
        if (!candidate.sha256) continue;
        byDigest.set(candidate.sha256, [...(byDigest.get(candidate.sha256) ?? []), candidate.assetId]);
      }
      const duplicates = [...byDigest.entries()]
        .filter(([, ids]) => ids.length > 1)
        .map(([sha256, assetIds]) => ({ sha256, assetIds }));

      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          details: {
            registrySize: Object.keys(registry.assets).length,
            candidateCount: candidates.length,
            reuseCandidates: candidates,
            exactDuplicates: duplicates
          }
        }),
        verification: 'verified_real'
      };
    }
  }),

  defineTool({
    name: 'harmony.assets.generate_placeholder',
    description: 'Создать настоящий прозрачный PNG-заглушку на диске (валидный файл, не только путь).',
    inputSchema: z.object({
      assetName: z.string(),
      outputDir: z.string()
    }),
    handler: async (args) => {
      const outDir = verifyPathAccess(args.outputDir);
      fs.mkdirSync(outDir, { recursive: true });
      const target = path.join(outDir, `${args.assetName}.png`);

      // Write real bytes: the previous version returned a path to nothing.
      const bytes = transparentPngBytes();
      fs.writeFileSync(target, bytes);

      const probed = probeFile(bytes);
      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          // The FILE is real; the ARTWORK is a placeholder. Both facts reported.
          placeholder: true,
          isRealHarmonyExecution: false,
          artifacts: [target],
          details: {
            path: target,
            sizeBytes: bytes.length,
            sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
            detectedFormat: probed.format,
            width: probed.width,
            height: probed.height,
            hasAlpha: probed.hasAlpha,
            note: 'Файл — валидный прозрачный PNG 1x1. Это технический stand-in, а не финальный арт.'
          }
        }),
        verification: 'verified_real'
      };
    }
  }),

  defineTool({
    name: 'harmony.assets.check_license',
    description: 'Проверить лицензию ассета по его asset_license.json (реальная проверка, не «Commercial_Approved»).',
    inputSchema: z.object({
      assetId: z.string().optional(),
      filePath: z.string().optional().describe('Путь к файлу — лицензия ищется рядом и выше.'),
      forbiddenSources: z.array(z.string()).optional(),
      registryDir: z.string().optional()
    }),
    handler: async (args) => {
      const forbidden = args.forbiddenSources ?? ['NC', 'NonCommercial'];

      // Resolve the file: explicit path, or the registry's current version.
      let target: string | undefined;
      if (args.filePath) {
        target = verifyPathAccess(args.filePath);
      } else if (args.assetId) {
        const { registry } = loadRegistry(args.registryDir);
        const record = registry.assets[args.assetId];
        target = record?.versions.find(v => v.version === record.currentVersion)?.storedPath
          ?? record?.licensePath;
      }

      if (!target) {
        return {
          ...createStandardExecutionResult({
            status: 'blocked',
            simulated: false,
            isRealHarmonyExecution: false,
            errors: ['Нужен filePath или зарегистрированный assetId, иначе проверять нечего.'],
            details: { assetId: args.assetId ?? null, clean: false }
          }),
          verification: 'verified_real'
        };
      }

      const licenseFile = findLicenseFor(target);
      if (!licenseFile) {
        return {
          ...createStandardExecutionResult({
            status: 'blocked',
            simulated: false,
            isRealHarmonyExecution: false,
            errors: [`Не найден asset_license.json для ${target}.`],
            details: { assetId: args.assetId ?? null, filePath: target, clean: false, license: null }
          }),
          verification: 'verified_real'
        };
      }

      let parsedLicense;
      try {
        parsedLicense = assetLicenseSchema.safeParse(
          JSON.parse(fs.readFileSync(licenseFile, 'utf-8'))
        );
      } catch (err: any) {
        return {
          ...createStandardExecutionResult({
            status: 'blocked',
            simulated: false,
            isRealHarmonyExecution: false,
            errors: [`Лицензия не читается: ${err?.message ?? err}`],
            details: { licenseFile, clean: false }
          }),
          verification: 'verified_real'
        };
      }

      if (!parsedLicense.success) {
        return {
          ...createStandardExecutionResult({
            status: 'blocked',
            simulated: false,
            isRealHarmonyExecution: false,
            errors: parsedLicense.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
            details: { licenseFile, clean: false }
          }),
          verification: 'verified_real'
        };
      }

      const license = parsedLicense.data;
      const verdict = assertLicenseAllowed(license, forbidden);
      const contractPath = path.resolve(path.dirname(licenseFile), license.contractPath);
      const contractPresent = fs.existsSync(contractPath);
      const digestMatches = license.sha256 === undefined
        ? null
        : (fs.existsSync(target) && sha256OfFile(target) === license.sha256);

      const clean = verdict.allowed && contractPresent && digestMatches !== false;
      const blockers: string[] = [];
      if (!verdict.allowed && verdict.reason) blockers.push(verdict.reason);
      if (!contractPresent) blockers.push(`Договор не найден: ${license.contractPath}`);
      if (digestMatches === false) blockers.push('Файл изменён после подписания лицензии (sha256 не совпадает).');

      return {
        ...createStandardExecutionResult({
          status: clean ? 'success' : 'blocked',
          simulated: false,
          isRealHarmonyExecution: false,
          errors: blockers,
          details: {
            assetId: args.assetId ?? license.assetId,
            filePath: target,
            licenseFile,
            // The real label from the declaration, not a hardcoded verdict.
            license: license.license,
            creator: license.creator,
            source: license.source,
            commercialUse: license.commercialUse,
            contractPresent,
            digestMatches,
            clean,
            blockers
          }
        }),
        verification: 'verified_real'
      };
    }
  }),

  defineTool({
    name: 'harmony.assets.build_manifest',
    description: 'Собрать манифест ассетов: реально записать файл с размерами и SHA-256.',
    inputSchema: z.object({
      packageDir: z.string(),
      registryDir: z.string().optional()
    }),
    handler: async (args) => {
      const packageDir = verifyPathAccess(args.packageDir);
      if (!fs.existsSync(packageDir)) {
        return createStandardExecutionResult({
          status: 'blocked',
          simulated: false,
          isRealHarmonyExecution: false,
          errors: [`[PATH_NOT_FOUND] Каталог не найден: ${packageDir}`],
          details: { packageDir }
        });
      }

      const { registry } = loadRegistry(args.registryDir);
      const entries = Object.values(registry.assets).map(record => {
        const current = record.versions.find(v => v.version === record.currentVersion);
        const exists = current ? fs.existsSync(current.storedPath) : false;
        return {
          assetId: record.assetId,
          assetType: record.assetType,
          version: record.currentVersion,
          approved: record.approved,
          sha256: current?.sha256 ?? null,
          sizeBytes: current?.sizeBytes ?? null,
          storedPath: current?.storedPath ?? null,
          // A registry entry whose file vanished must be visible, not silently listed.
          fileMissing: current ? !exists : true
        };
      });

      const manifest = {
        schemaVersion: '1.0',
        packageDir,
        generatedAt: new Date().toISOString(),
        assetCount: entries.length,
        approvedCount: entries.filter(e => e.approved).length,
        missingFileCount: entries.filter(e => e.fileMissing).length,
        totalSizeBytes: entries.reduce((sum, e) => sum + (e.sizeBytes ?? 0), 0),
        assets: entries
      };

      const manifestPath = path.join(packageDir, 'asset_manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

      return {
        ...createStandardExecutionResult({
          status: manifest.missingFileCount === 0 ? 'success' : 'partial_success',
          simulated: false,
          isRealHarmonyExecution: false,
          warnings: manifest.missingFileCount > 0
            ? [`${manifest.missingFileCount} ассет(ов) в реестре указывают на отсутствующие файлы.`]
            : [],
          artifacts: [manifestPath],
          details: { ...manifest, manifestPath }
        }),
        verification: 'verified_real'
      };
    }
  })
];
