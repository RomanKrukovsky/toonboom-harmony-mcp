import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { assetLicenseSchema, assertLicenseAllowed, type AssetLicense } from '../schemas/assetLicense.js';
import { verifyPathAccess } from '../security.js';
import { defineTool } from './defineTool.js';

/**
 * legalTools — asset provenance and licence compliance.
 *
 * These were placeholders that returned invented paths and a hardcoded
 * `provenanceValid: true` / `missingPermissions: []`. Everything needed to do the
 * work for real already existed and was unit-tested in
 * `src/schemas/assetLicense.ts` — this module simply never imported it.
 *
 * All four tools are pure filesystem + schema work: no Harmony, no network, no
 * model weights. Each now reads the actual `asset_license.json` files on disk,
 * validates them against the schema, applies `assertLicenseAllowed()` and writes
 * real reports with SHA-256 digests.
 */

const LICENSE_FILENAME = 'asset_license.json';

/** Media extensions that require a licence declaration. */
const LICENSABLE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.tga', '.tif', '.tiff', '.psd', '.svg', '.exr',
  '.wav', '.mp3', '.aiff', '.aif', '.flac', '.m4a',
  '.mp4', '.mov', '.avi', '.mkv',
  '.tpl', '.tvg', '.ttf', '.otf'
]);

/** Files that are project output rather than licensable input. */
const IGNORED_DIRECTORIES = new Set(['provenance', 'delivery', 'renders', 'previews', '.git']);

function sha256OfFile(filePath: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

interface WalkedFile {
  absolutePath: string;
  relativePath: string;
  extension: string;
  sizeBytes: number;
}

/** Recursively list files under `root`, skipping generated output directories. */
function walkFiles(root: string, current = root, collected: WalkedFile[] = []): WalkedFile[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(current, { withFileTypes: true });
  } catch {
    return collected;
  }

  for (const entry of entries) {
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      walkFiles(root, absolutePath, collected);
      continue;
    }
    if (!entry.isFile()) continue;

    let sizeBytes = 0;
    try {
      sizeBytes = fs.statSync(absolutePath).size;
    } catch {
      continue;
    }
    collected.push({
      absolutePath,
      relativePath: path.relative(root, absolutePath),
      extension: path.extname(entry.name).toLowerCase(),
      sizeBytes
    });
  }
  return collected;
}

interface LoadedLicense {
  /** Directory the licence governs, relative to the package root. */
  scope: string;
  filePath: string;
  license?: AssetLicense;
  parseError?: string;
}

/** Load and schema-validate every asset_license.json in the package. */
function loadLicenses(packageDir: string): LoadedLicense[] {
  return walkFiles(packageDir)
    .filter(file => path.basename(file.absolutePath) === LICENSE_FILENAME)
    .map(file => {
      const scope = path.dirname(file.relativePath) === '.' ? '' : path.dirname(file.relativePath);
      try {
        const raw = JSON.parse(fs.readFileSync(file.absolutePath, 'utf-8'));
        const parsed = assetLicenseSchema.safeParse(raw);
        if (!parsed.success) {
          return { scope, filePath: file.relativePath, parseError: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') };
        }
        return { scope, filePath: file.relativePath, license: parsed.data };
      } catch (err: any) {
        return { scope, filePath: file.relativePath, parseError: `unreadable: ${err?.message ?? err}` };
      }
    });
}

/** Find the licence governing a file: nearest declaration at or above its directory. */
function licenseForFile(file: WalkedFile, licenses: LoadedLicense[]): LoadedLicense | undefined {
  const dir = path.dirname(file.relativePath) === '.' ? '' : path.dirname(file.relativePath);
  const candidates = licenses
    .filter(entry => dir === entry.scope || dir.startsWith(entry.scope === '' ? '' : entry.scope + path.sep))
    // Deepest scope wins, so a per-asset licence overrides a folder-wide one.
    .sort((a, b) => b.scope.length - a.scope.length);
  return candidates[0];
}

function licensableFiles(packageDir: string): WalkedFile[] {
  return walkFiles(packageDir).filter(
    file => LICENSABLE_EXTENSIONS.has(file.extension) && path.basename(file.absolutePath) !== LICENSE_FILENAME
  );
}

function requirePackageDir(packageDir: string): string {
  const resolved = verifyPathAccess(packageDir);
  if (!fs.existsSync(resolved)) {
    throw new Error(`[PATH_NOT_FOUND] Каталог пакета не найден: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`[NOT_A_DIRECTORY] Ожидался каталог, получен файл: ${resolved}`);
  }
  return resolved;
}

export const legalTools = [
  defineTool({
    name: 'harmony.legal.generate_asset_report',
    description: 'Сгенерировать юридический отчёт по всем ассетам проекта (реальный обход файлов и лицензий).',
    inputSchema: z.object({
      packageDir: z.string().describe('Каталог production package.'),
      forbiddenSources: z.array(z.string()).optional().describe('Запрещённые лицензии/источники из ShowBible.'),
      writeReport: z.boolean().optional().default(true).describe('Записать отчёт в provenance/legal_asset_report.json.')
    }),
    handler: async (args) => {
      const packageDir = requirePackageDir(args.packageDir);
      const forbidden = args.forbiddenSources ?? ['NC', 'NonCommercial'];

      const licenses = loadLicenses(packageDir);
      const files = licensableFiles(packageDir);

      const assets = files.map(file => {
        const entry = licenseForFile(file, licenses);
        if (!entry) {
          return {
            file: file.relativePath,
            sizeBytes: file.sizeBytes,
            sha256: sha256OfFile(file.absolutePath),
            status: 'undeclared' as const,
            reason: `Нет ${LICENSE_FILENAME} для этого файла или его каталога.`
          };
        }
        if (!entry.license) {
          return {
            file: file.relativePath,
            sizeBytes: file.sizeBytes,
            sha256: sha256OfFile(file.absolutePath),
            status: 'invalid_declaration' as const,
            licenseFile: entry.filePath,
            reason: entry.parseError
          };
        }

        const verdict = assertLicenseAllowed(entry.license, forbidden);
        const actualDigest = sha256OfFile(file.absolutePath);
        // A declared digest that no longer matches means the file changed after
        // the licence was signed off.
        const digestMismatch = entry.license.sha256 !== undefined && entry.license.sha256 !== actualDigest;

        return {
          file: file.relativePath,
          sizeBytes: file.sizeBytes,
          sha256: actualDigest,
          licenseFile: entry.filePath,
          assetId: entry.license.assetId,
          creator: entry.license.creator,
          source: entry.license.source,
          license: entry.license.license,
          commercialUse: entry.license.commercialUse,
          contractPath: entry.license.contractPath,
          contractPresent: fs.existsSync(path.resolve(packageDir, entry.license.contractPath)),
          digestMismatch,
          status: (!verdict.allowed ? 'rejected' : digestMismatch ? 'digest_mismatch' : 'cleared') as
            'rejected' | 'digest_mismatch' | 'cleared',
          reason: verdict.reason
        };
      });

      const summary = {
        totalFiles: assets.length,
        cleared: assets.filter(a => a.status === 'cleared').length,
        rejected: assets.filter(a => a.status === 'rejected').length,
        undeclared: assets.filter(a => a.status === 'undeclared').length,
        invalidDeclarations: assets.filter(a => a.status === 'invalid_declaration').length,
        digestMismatches: assets.filter(a => a.status === 'digest_mismatch').length,
        licenseFilesFound: licenses.length
      };

      const report = {
        schemaVersion: '1.0',
        packageDir,
        generatedAt: new Date().toISOString(),
        forbiddenSources: forbidden,
        summary,
        // Delivery is only clean when nothing is rejected, undeclared or altered.
        deliverable: summary.rejected === 0 && summary.undeclared === 0
          && summary.invalidDeclarations === 0 && summary.digestMismatches === 0,
        assets
      };

      let reportPath: string | undefined;
      if (args.writeReport) {
        const provenanceDir = path.join(packageDir, 'provenance');
        fs.mkdirSync(provenanceDir, { recursive: true });
        reportPath = path.join(provenanceDir, 'legal_asset_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      }

      return {
        status: 'success',
        verification: 'verified_real',
        isRealHarmonyExecution: false,
        simulated: false,
        reportPath,
        ...report
      };
    }
  }),

  defineTool({
    name: 'harmony.legal.check_provenance',
    description: 'Проверить происхождение и права конкретного ассета по его asset_license.json.',
    inputSchema: z.object({
      packageDir: z.string().describe('Каталог production package.'),
      assetId: z.string().describe('assetId из asset_license.json.'),
      forbiddenSources: z.array(z.string()).optional()
    }),
    handler: async (args) => {
      const packageDir = requirePackageDir(args.packageDir);
      const forbidden = args.forbiddenSources ?? ['NC', 'NonCommercial'];

      const licenses = loadLicenses(packageDir);
      const match = licenses.find(entry => entry.license?.assetId === args.assetId);

      if (!match) {
        const known = licenses.map(e => e.license?.assetId).filter(Boolean);
        return {
          status: 'error',
          verification: 'verified_real',
          provenanceValid: false,
          assetId: args.assetId,
          reason: `Не найден ${LICENSE_FILENAME} с assetId="${args.assetId}".`,
          knownAssetIds: known
        };
      }
      if (!match.license) {
        return {
          status: 'error',
          verification: 'verified_real',
          provenanceValid: false,
          assetId: args.assetId,
          licenseFile: match.filePath,
          reason: `Декларация не проходит валидацию схемы: ${match.parseError}`
        };
      }

      const license = match.license;
      const verdict = assertLicenseAllowed(license, forbidden);
      const contractAbsolute = path.resolve(packageDir, license.contractPath);
      const contractPresent = fs.existsSync(contractAbsolute);

      // Verify the declared digest against the governed files, when declared.
      const governed = licensableFiles(packageDir).filter(
        file => licenseForFile(file, licenses)?.filePath === match.filePath
      );
      const digestChecks = license.sha256
        ? governed.map(file => ({
            file: file.relativePath,
            expected: license.sha256,
            actual: sha256OfFile(file.absolutePath),
            matches: sha256OfFile(file.absolutePath) === license.sha256
          }))
        : [];
      const digestOk = digestChecks.length === 0 || digestChecks.some(c => c.matches);

      const provenanceValid = verdict.allowed && contractPresent && digestOk;
      const blockers: string[] = [];
      if (!verdict.allowed && verdict.reason) blockers.push(verdict.reason);
      if (!contractPresent) blockers.push(`Файл договора отсутствует: ${license.contractPath}`);
      if (!digestOk) blockers.push('Ни один управляемый файл не совпадает с объявленным sha256.');

      return {
        status: provenanceValid ? 'success' : 'blocked',
        verification: 'verified_real',
        isRealHarmonyExecution: false,
        simulated: false,
        assetId: license.assetId,
        provenanceValid,
        blockers,
        licenseFile: match.filePath,
        declaration: {
          creator: license.creator,
          source: license.source,
          license: license.license,
          commercialUse: license.commercialUse,
          modificationAllowed: license.modificationAllowed,
          datasetUseAllowed: license.datasetUseAllowed,
          redistributionAllowed: license.redistributionAllowed,
          forbiddenTags: license.forbiddenTags
        },
        contract: { path: license.contractPath, present: contractPresent },
        governedFiles: governed.map(f => f.relativePath),
        digestChecks
      };
    }
  }),

  defineTool({
    name: 'harmony.legal.build_delivery_manifest',
    description: 'Собрать delivery manifest: файлы, размеры, SHA-256 и права использования.',
    inputSchema: z.object({
      packageDir: z.string().describe('Каталог production package.'),
      forbiddenSources: z.array(z.string()).optional(),
      allowIncomplete: z.boolean().optional().default(false)
        .describe('Собрать манифест даже при нарушениях (по умолчанию — отказ).')
    }),
    handler: async (args) => {
      const packageDir = requirePackageDir(args.packageDir);
      const forbidden = args.forbiddenSources ?? ['NC', 'NonCommercial'];

      const licenses = loadLicenses(packageDir);
      const files = licensableFiles(packageDir);

      const entries = files.map(file => {
        const owner = licenseForFile(file, licenses);
        const license = owner?.license;
        const verdict = license ? assertLicenseAllowed(license, forbidden) : { allowed: false, reason: 'Лицензия не объявлена.' };
        return {
          file: file.relativePath,
          sizeBytes: file.sizeBytes,
          // Real digests: the previous FinalPackager manifest carried neither
          // hashes nor sizes, so a delivery could not be verified downstream.
          sha256: sha256OfFile(file.absolutePath),
          assetId: license?.assetId ?? null,
          license: license?.license ?? null,
          creator: license?.creator ?? null,
          commercialUse: license?.commercialUse ?? false,
          redistributionAllowed: license?.redistributionAllowed ?? false,
          cleared: verdict.allowed,
          reason: verdict.reason
        };
      });

      const violations = entries.filter(e => !e.cleared);
      if (violations.length > 0 && !args.allowIncomplete) {
        return {
          status: 'blocked',
          verification: 'verified_real',
          isRealHarmonyExecution: false,
          simulated: false,
          reason: `${violations.length} файл(ов) не имеют действующей коммерческой лицензии. Передайте allowIncomplete=true, чтобы собрать манифест с пометками.`,
          violations: violations.map(v => ({ file: v.file, reason: v.reason }))
        };
      }

      const manifest = {
        schemaVersion: '1.0',
        packageDir,
        generatedAt: new Date().toISOString(),
        forbiddenSources: forbidden,
        fileCount: entries.length,
        totalSizeBytes: entries.reduce((sum, e) => sum + e.sizeBytes, 0),
        clearedCount: entries.filter(e => e.cleared).length,
        violationCount: violations.length,
        redistributable: entries.every(e => e.redistributionAllowed),
        files: entries
      };

      const deliveryDir = path.join(packageDir, 'delivery');
      fs.mkdirSync(deliveryDir, { recursive: true });
      const deliveryManifestPath = path.join(deliveryDir, 'delivery_manifest.json');
      fs.writeFileSync(deliveryManifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

      return {
        status: violations.length === 0 ? 'success' : 'partial_success',
        verification: 'verified_real',
        isRealHarmonyExecution: false,
        simulated: false,
        deliveryManifestPath,
        ...manifest
      };
    }
  }),

  defineTool({
    name: 'harmony.legal.detect_missing_permissions',
    description: 'Найти файлы без коммерческой лицензии, без договора или с несовпадающим хешем.',
    inputSchema: z.object({
      packageDir: z.string().describe('Каталог production package.'),
      forbiddenSources: z.array(z.string()).optional()
    }),
    handler: async (args) => {
      const packageDir = requirePackageDir(args.packageDir);
      const forbidden = args.forbiddenSources ?? ['NC', 'NonCommercial'];

      const licenses = loadLicenses(packageDir);
      const files = licensableFiles(packageDir);
      const missingPermissions: Array<{ file: string; issue: string; detail?: string }> = [];

      for (const file of files) {
        const owner = licenseForFile(file, licenses);
        if (!owner) {
          missingPermissions.push({
            file: file.relativePath,
            issue: 'no_license_declaration',
            detail: `Отсутствует ${LICENSE_FILENAME} для файла или его каталога.`
          });
          continue;
        }
        if (!owner.license) {
          missingPermissions.push({
            file: file.relativePath,
            issue: 'invalid_license_declaration',
            detail: owner.parseError
          });
          continue;
        }

        const verdict = assertLicenseAllowed(owner.license, forbidden);
        if (!verdict.allowed) {
          missingPermissions.push({
            file: file.relativePath,
            issue: 'license_not_permitted',
            detail: verdict.reason
          });
          continue;
        }
        if (!fs.existsSync(path.resolve(packageDir, owner.license.contractPath))) {
          missingPermissions.push({
            file: file.relativePath,
            issue: 'contract_missing',
            detail: `Не найден файл договора: ${owner.license.contractPath}`
          });
          continue;
        }
        if (owner.license.sha256 && owner.license.sha256 !== sha256OfFile(file.absolutePath)) {
          missingPermissions.push({
            file: file.relativePath,
            issue: 'digest_mismatch',
            detail: 'Файл изменён после подписания лицензии (sha256 не совпадает).'
          });
        }
      }

      // Declarations that govern nothing are dead weight and usually a sign of a
      // moved or deleted asset.
      const orphanDeclarations = licenses
        .filter(entry => entry.license)
        .filter(entry => !files.some(file => licenseForFile(file, licenses)?.filePath === entry.filePath))
        .map(entry => ({ licenseFile: entry.filePath, assetId: entry.license!.assetId }));

      return {
        status: missingPermissions.length === 0 ? 'success' : 'blocked',
        verification: 'verified_real',
        isRealHarmonyExecution: false,
        simulated: false,
        scannedFileCount: files.length,
        licenseFilesFound: licenses.length,
        missingPermissions,
        orphanDeclarations,
        clearedForCommercialUse: missingPermissions.length === 0
      };
    }
  })
];
