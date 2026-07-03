import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Загрузка переменных окружения из .env
dotenv.config();

export type HarmonyEngineMode = 'real' | 'simulation' | 'hybrid' | 'moonshot';

export interface OnePromptIterationConfig {
  maxIterations: number;
  targetScore: number;
  stopIfNoImprovement: boolean;
  requireHumanApprovalForFinal: boolean;
}

export interface HarmonyConfig {
  harmonyInstall: string;
  harmonyCcBin: string;
  harmonyBin: string;
  harmonyPythonPackages: string;
  harmonyCcHost: string;
  harmonyCcPort: number;
  harmonyCcUser: string;
  scriptTimeoutMs: number;
  dryRunDefault: boolean;
  allowDestructive: boolean;
  allowRawScripts: boolean;
  allowedRoots: string[];
  logDir: string;
  engineMode: HarmonyEngineMode;
  onePromptIteration: OnePromptIterationConfig;
}

function parseEngineMode(raw?: string): HarmonyEngineMode {
  switch ((raw || 'moonshot').toLowerCase()) {
    case 'real': return 'real';
    case 'simulation': return 'simulation';
    case 'hybrid': return 'hybrid';
    case 'moonshot': return 'moonshot';
    default: return 'moonshot';
  }
}

const DEFAULT_TIMEOUT_MS = 10000;

function detectPaths(): { install: string; ccBin: string; bin: string; pythonPackages: string } {
  const platform = process.platform;
  let install = process.env.HARMONY_INSTALL || '';
  let ccBin = process.env.HARMONY_CC_BIN || '';
  let bin = process.env.HARMONY_BIN || '';
  let pythonPackages = process.env.HARMONY_PYTHON_PACKAGES || '';

  if (platform === 'darwin') {
    // macOS
    if (!install) {
      const parentDir = '/Applications';
      if (fs.existsSync(parentDir)) {
        const files = fs.readdirSync(parentDir);
        const harmonyDirs = files.filter(f => f.startsWith('Toon Boom Harmony') && f.endsWith('Premium'));
        // Сортировка для получения последней версии
        harmonyDirs.sort().reverse();
        if (harmonyDirs.length > 0) {
          install = path.join(parentDir, harmonyDirs[0]);
        }
      }
    }

    if (install) {
      // Поиск внутри app bundle
      const appDirs = fs.readdirSync(install).filter(f => f.endsWith('.app'));
      if (appDirs.length > 0) {
        const appPath = path.join(install, appDirs[0]);
        const macosBinPath = path.join(appPath, 'Contents/tba/macosx/bin');
        const macosLibPath = path.join(appPath, 'Contents/tba/macosx/lib');

        if (!ccBin) {
          const testCc = path.join(macosBinPath, 'controlcenter');
          if (fs.existsSync(testCc)) ccBin = testCc;
        }
        if (!bin) {
          const testBin = path.join(macosBinPath, 'HarmonyPremium');
          if (fs.existsSync(testBin)) bin = testBin;
        }
        if (!pythonPackages) {
          const testPy = path.join(macosLibPath, 'python-packages');
          if (fs.existsSync(testPy)) pythonPackages = testPy;
        }
      }
    }
  } else if (platform === 'win32') {
    // Windows
    if (!install) {
      const parentDir = 'C:\\Program Files\\Toon Boom Animation';
      if (fs.existsSync(parentDir)) {
        const files = fs.readdirSync(parentDir);
        const harmonyDirs = files.filter(f => f.startsWith('Toon Boom Harmony') && f.endsWith('Premium'));
        harmonyDirs.sort().reverse();
        if (harmonyDirs.length > 0) {
          install = path.join(parentDir, harmonyDirs[0]);
        }
      }
    }

    if (install) {
      const winBinPath = path.join(install, 'win64/bin');
      if (!ccBin) {
        const testCc = path.join(winBinPath, 'controlcenter.exe');
        if (fs.existsSync(testCc)) ccBin = testCc;
      }
      if (!bin) {
        const testBin = path.join(winBinPath, 'HarmonyPremium.exe');
        if (fs.existsSync(testBin)) bin = testBin;
      }
      if (!pythonPackages) {
        const testPy = path.join(winBinPath, 'python-packages');
        if (fs.existsSync(testPy)) pythonPackages = testPy;
      }
    }
  } else if (platform === 'linux') {
    // Linux
    if (!install) {
      const possibleInstalls = [
        '/usr/local/ToonBoomAnimation/harmony_24',
        '/usr/local/ToonBoomAnimation/harmony_22'
      ];
      for (const p of possibleInstalls) {
        if (fs.existsSync(p)) {
          install = p;
          break;
        }
      }
    }

    if (install) {
      const lnxBinPath = path.join(install, 'lnx86_64/bin');
      const lnxLibPath = path.join(install, 'lnx86_64/lib');
      if (!ccBin) {
        const testCc = path.join(lnxBinPath, 'controlcenter');
        if (fs.existsSync(testCc)) ccBin = testCc;
      }
      if (!bin) {
        const testBin = path.join(lnxBinPath, 'HarmonyPremium');
        if (fs.existsSync(testBin)) bin = testBin;
      }
      if (!pythonPackages) {
        const testPy = path.join(lnxLibPath, 'python-packages');
        if (fs.existsSync(testPy)) pythonPackages = testPy;
      }
    }
  }

  return { install, ccBin, bin, pythonPackages };
}

const detected = detectPaths();

export const config: HarmonyConfig = {
  harmonyInstall: detected.install,
  harmonyCcBin: detected.ccBin,
  harmonyBin: detected.bin,
  harmonyPythonPackages: detected.pythonPackages,
  harmonyCcHost: process.env.HARMONY_CC_HOST || '127.0.0.1',
  harmonyCcPort: process.env.HARMONY_CC_PORT ? parseInt(process.env.HARMONY_CC_PORT, 10) : 1234,
  harmonyCcUser: process.env.HARMONY_CC_USER || 'usabatch',
  scriptTimeoutMs: process.env.HARMONY_SCRIPT_TIMEOUT_MS ? parseInt(process.env.HARMONY_SCRIPT_TIMEOUT_MS, 10) : DEFAULT_TIMEOUT_MS,
  dryRunDefault: process.env.HARMONY_DRY_RUN_DEFAULT === 'true',
  allowDestructive: process.env.HARMONY_ALLOW_DESTRUCTIVE === 'true',
  allowRawScripts: process.env.HARMONY_ALLOW_RAW_SCRIPTS === 'true',
  allowedRoots: process.env.HARMONY_ALLOWED_ROOTS 
    ? process.env.HARMONY_ALLOWED_ROOTS.split(',').map(p => path.resolve(p.trim()))
    : [path.resolve(process.cwd())],
  logDir: process.env.HARMONY_LOG_DIR || './logs',
  engineMode: parseEngineMode(process.env.HARMONY_ENGINE_MODE),
  onePromptIteration: {
    maxIterations: parseInt(process.env.HARMONY_ONEPROMPT_MAX_ITERATIONS || '5', 10),
    targetScore: parseInt(process.env.HARMONY_ONEPROMPT_TARGET_SCORE || '85', 10),
    stopIfNoImprovement: (process.env.HARMONY_ONEPROMPT_STOP_IF_NO_IMPROVEMENT ?? 'true') !== 'false',
    requireHumanApprovalForFinal: (process.env.HARMONY_ONEPROMPT_REQUIRE_HUMAN_FINAL ?? 'true') !== 'false'
  }
};

export const DEFAULT_MOUTH_SHAPES = ['A','E','I','O','U','M','F','L','S','rest'] as const;
export const REQUIRED_VIEWS_360 = [
  'front','front_3q_left','side_left','back_3q_left','back','back_3q_right','side_right','front_3q_right'
] as const;

// Валидация разрешенных путей для безопасности
export function validatePath(filePath: string): boolean {
  try {
    const resolvedPath = path.resolve(filePath);
    return config.allowedRoots.some(root => resolvedPath.startsWith(root));
  } catch {
    return false;
  }
}
