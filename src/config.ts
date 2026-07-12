import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Загрузка переменных окружения из .env
dotenv.config();

export type HarmonyEngineMode = 'real' | 'simulation' | 'hybrid' | 'moonshot';

export interface OnePromptIterationConfig {
  maxIterations: number;
  targetScore: number;
  stopIfNoImprovement: boolean;
  requireHumanApprovalForFinal: boolean;
}

export interface BackendConfig {
  image: 'none' | 'openai' | 'stability' | 'mock';
  audio: 'none' | 'openai' | 'elevenlabs' | 'mock';
  llm: 'none' | 'openai' | 'anthropic' | 'mock';
  apiKeys: {
    openai?: string;
    stability?: string;
    elevenlabs?: string;
    anthropic?: string;
  };
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
  backends: BackendConfig;
  reconstruction: {
    coreUrl: string;
    mlCoreUrl: string;
    cacheRoot: string;
    modelRoot: string;
    device: string;
    maxConcurrentJobs: number;
    requestTimeoutMs: number;
    maxDurationSeconds: number;
    maxWidth: number;
    maxHeight: number;
    ffmpegPath: string;
    ffprobePath: string;
  };
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

export function getProjectRoot(): string {
  // Use process.cwd() which works in both Jest and runtime
  // This works regardless of where the process is started from
  return path.resolve(process.cwd());
}

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
        const harmonyDirs = files.filter(f => (f.includes('Harmony') || f.includes('Toon Boom')) && f.includes('Premium'));
        // Сортировка для получения последней версии
        harmonyDirs.sort().reverse();
        if (harmonyDirs.length > 0) {
          install = path.join(parentDir, harmonyDirs[0]);
        }
      }
    }

    if (install) {
      let appPath = install;
      if (!install.endsWith('.app') && fs.lstatSync(install).isDirectory()) {
        const appDirs = fs.readdirSync(install).filter(f => f.endsWith('.app'));
        if (appDirs.length > 0) {
          appPath = path.join(install, appDirs[0]);
        }
      }
      const macosBinPath = path.join(appPath, 'Contents/tba/macosx/bin');
      const macosLibPath = path.join(appPath, 'Contents/tba/macosx/lib');

      if (!ccBin) {
        const testCc = path.join(macosBinPath, 'controlcenter');
        if (fs.existsSync(testCc)) ccBin = testCc;
      }
      if (!bin) {
        const testBin = path.join(macosBinPath, 'Harmony Premium');
        if (fs.existsSync(testBin)) bin = testBin;
        else {
          const testBin2 = path.join(appPath, 'Contents/MacOS/Harmony Premium');
          if (fs.existsSync(testBin2)) bin = testBin2;
        }
      }
      if (!pythonPackages) {
        const testPy = path.join(macosLibPath, 'python-packages');
        if (fs.existsSync(testPy)) pythonPackages = testPy;
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
    : [getProjectRoot()],
  logDir: process.env.HARMONY_LOG_DIR || './logs',
  engineMode: parseEngineMode(process.env.HARMONY_ENGINE_MODE),
  onePromptIteration: {
    maxIterations: parseInt(process.env.HARMONY_ONEPROMPT_MAX_ITERATIONS || '5', 10),
    targetScore: parseInt(process.env.HARMONY_ONEPROMPT_TARGET_SCORE || '85', 10),
    stopIfNoImprovement: (process.env.HARMONY_ONEPROMPT_STOP_IF_NO_IMPROVEMENT ?? 'true') !== 'false',
    requireHumanApprovalForFinal: (process.env.HARMONY_ONEPROMPT_REQUIRE_HUMAN_FINAL ?? 'true') !== 'false'
  },
  backends: {
    image: (process.env.HARMONY_BACKEND_IMAGE || 'none') as BackendConfig['image'],
    audio: (process.env.HARMONY_BACKEND_AUDIO || 'none') as BackendConfig['audio'],
    llm: (process.env.HARMONY_BACKEND_LLM || 'none') as BackendConfig['llm'],
    apiKeys: {
      openai: process.env.OPENAI_API_KEY,
      stability: process.env.STABILITY_API_KEY,
      elevenlabs: process.env.ELEVENLABS_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY
    }
  },
  reconstruction: {
    coreUrl: process.env.RECONSTRUCTION_CORE_URL || 'http://127.0.0.1:8765',
    mlCoreUrl: process.env.ML_CORE_URL || 'http://127.0.0.1:8766',
    cacheRoot: path.resolve(process.env.RECONSTRUCTION_CACHE_ROOT || path.join(process.cwd(), 'output', 'reconstruction-cache')),
    modelRoot: path.resolve(process.env.RECONSTRUCTION_MODEL_ROOT || path.join(process.cwd(), 'models', 'reconstruction')),
    device: process.env.RECONSTRUCTION_DEVICE || 'cpu',
    maxConcurrentJobs: parseInt(process.env.RECONSTRUCTION_MAX_CONCURRENT_JOBS || '1', 10),
    requestTimeoutMs: parseInt(process.env.RECONSTRUCTION_REQUEST_TIMEOUT_MS || '600000', 10),
    maxDurationSeconds: parseInt(process.env.RECONSTRUCTION_MAX_DURATION_SECONDS || '300', 10),
    maxWidth: parseInt(process.env.RECONSTRUCTION_MAX_WIDTH || '4096', 10),
    maxHeight: parseInt(process.env.RECONSTRUCTION_MAX_HEIGHT || '4096', 10),
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
    ffprobePath: process.env.FFPROBE_PATH || 'ffprobe'
  }
};

export const DEFAULT_MOUTH_SHAPES = ['A','E','I','O','U','M','F','L','S','rest'] as const;
export const REQUIRED_VIEWS_360 = [
  'front','front_3q_left','side_left','back_3q_left','back','back_3q_right','side_right','front_3q_right'
] as const;

// Валидация разрешенных путей для безопасности
export function validatePath(filePath: string): boolean {
  try {
    const resolvedPath = canonicalPath(filePath);
    return config.allowedRoots.some(root => {
      const resolvedRoot = canonicalPath(root);
      const relative = path.relative(resolvedRoot, resolvedPath);
      return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
    });
  } catch {
    return false;
  }
}

function canonicalPath(candidate: string): string {
  const resolved = path.resolve(candidate);
  let existing = resolved;
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  const realExisting = fs.existsSync(existing) ? fs.realpathSync(existing) : existing;
  return path.resolve(realExisting, path.relative(existing, resolved));
}
