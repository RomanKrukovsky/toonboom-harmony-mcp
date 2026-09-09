import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Загрузка переменных окружения из .env
dotenv.config({ path: process.env.MCP_ENV_FILE || '.env' });

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
  llm: 'none' | 'openai' | 'anthropic' | 'openrouter' | 'mock';
  apiKeys: {
    openai?: string;
    stability?: string;
    elevenlabs?: string;
    anthropic?: string;
    openrouter?: string;
  };
  openrouterModel?: string;
}

export type AnimateBridgeMode = 'auto' | 'companion' | 'jsfl_cli' | 'mock';

export interface AnimateConfig {
  animateInstall: string;
  animateAppPath: string;
  animateBin: string;
  animateVersion: string;
  enabled: boolean;
  bridgeMode: AnimateBridgeMode;
  bridgeDir: string;
  bridgePort: number;
  allowedRoots: string[];
  dryRunDefault: boolean;
  allowDestructive: boolean;
  allowRawJsfl: boolean;
  requestTimeoutMs: number;
  realTests: boolean;
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
  if (process.env.MCP_ENGINE === 'moho') return { install: '', ccBin: '', bin: '', pythonPackages: '' };
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
      anthropic: process.env.ANTHROPIC_API_KEY,
      openrouter: process.env.OPENROUTER_API_KEY
    },
    openrouterModel: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free'
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

export function detectAnimatePaths(): {
  install: string;
  appPath: string;
  bin: string;
  version: string;
} {
  const platform = process.platform;
  let appPath = process.env.ANIMATE_APP_PATH || '';
  let bin = process.env.ANIMATE_BIN || '';
  let install = process.env.ANIMATE_INSTALL || '';
  let version = process.env.ANIMATE_VERSION || '';

  if (platform === 'darwin') {
    if (!appPath && !bin) {
      const parentDirs = ['/Applications', path.join(process.env.HOME || '', 'Applications')];
      for (const parentDir of parentDirs) {
        if (!fs.existsSync(parentDir)) continue;
        try {
          const entries = fs.readdirSync(parentDir);
          const animateDirs = entries.filter(e => e.toLowerCase().includes('animate'));
          animateDirs.sort().reverse();
          for (const match of animateDirs) {
            const fullMatch = path.join(parentDir, match);
            if (match.endsWith('.app')) {
              appPath = fullMatch;
              install = parentDir;
              break;
            }
            try {
              if (fs.statSync(fullMatch).isDirectory()) {
                const innerFiles = fs.readdirSync(fullMatch);
                const innerApp = innerFiles.find(f => f.endsWith('.app') && f.toLowerCase().includes('animate'));
                if (innerApp) {
                  appPath = path.join(fullMatch, innerApp);
                  install = fullMatch;
                  break;
                }
              }
            } catch {}
          }
        } catch {}
        if (appPath) break;
      }
    }

    if (appPath && !bin) {
      const macosDir = path.join(appPath, 'Contents', 'MacOS');
      if (fs.existsSync(macosDir)) {
        try {
          const macosFiles = fs.readdirSync(macosDir);
          const mainExecutable = macosFiles.find(f => f.toLowerCase().includes('animate') && !f.endsWith('.app'));
          if (mainExecutable) {
            bin = path.join(macosDir, mainExecutable);
          }
        } catch {}
      }
    }

    if (appPath && !version) {
      const infoPlist = path.join(appPath, 'Contents', 'Info.plist');
      if (fs.existsSync(infoPlist)) {
        try {
          const plistContent = fs.readFileSync(infoPlist, 'utf-8');
          const match = plistContent.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/);
          if (match) {
            version = match[1];
          }
        } catch {}
      }
      if (!version) {
        const yearMatch = appPath.match(/20\d\d/);
        if (yearMatch) version = yearMatch[0];
      }
    }
  } else if (platform === 'win32') {
    if (!bin) {
      const winDirs = [
        'C:\\Program Files\\Adobe',
        'C:\\Program Files (x86)\\Adobe'
      ];
      for (const pDir of winDirs) {
        if (!fs.existsSync(pDir)) continue;
        try {
          const entries = fs.readdirSync(pDir);
          const animateDirs = entries.filter(e => e.toLowerCase().includes('animate'));
          animateDirs.sort().reverse();
          for (const ad of animateDirs) {
            const testBin = path.join(pDir, ad, 'Animate.exe');
            if (fs.existsSync(testBin)) {
              bin = testBin;
              appPath = testBin;
              install = path.join(pDir, ad);
              const yearMatch = ad.match(/20\d\d/);
              if (yearMatch) version = yearMatch[0];
              break;
            }
          }
        } catch {}
        if (bin) break;
      }
    }
  }

  return { install, appPath, bin, version: version || 'unknown' };
}

const detectedAnimate = detectAnimatePaths();

export const animateConfig: AnimateConfig = {
  animateInstall: detectedAnimate.install,
  animateAppPath: detectedAnimate.appPath,
  animateBin: detectedAnimate.bin,
  animateVersion: detectedAnimate.version,
  enabled: process.env.ANIMATE_ENABLED !== undefined ? process.env.ANIMATE_ENABLED === 'true' : Boolean(detectedAnimate.bin || detectedAnimate.appPath),
  bridgeMode: (process.env.ANIMATE_BRIDGE_MODE as AnimateBridgeMode) || 'auto',
  bridgeDir: path.resolve(process.env.ANIMATE_BRIDGE_DIR || path.join(getProjectRoot(), 'output', 'animate-mcp', 'bridge')),
  bridgePort: process.env.ANIMATE_BRIDGE_PORT ? parseInt(process.env.ANIMATE_BRIDGE_PORT, 10) : 8768,
  allowedRoots: process.env.ANIMATE_ALLOWED_ROOTS
    ? process.env.ANIMATE_ALLOWED_ROOTS.split(',').map(p => path.resolve(p.trim()))
    : [getProjectRoot(), path.resolve(getProjectRoot(), 'output')],
  dryRunDefault: process.env.ANIMATE_DRY_RUN_DEFAULT === 'true',
  allowDestructive: process.env.ANIMATE_ALLOW_DESTRUCTIVE === 'true',
  allowRawJsfl: process.env.ANIMATE_ALLOW_RAW_JSFL === 'true',
  requestTimeoutMs: process.env.ANIMATE_REQUEST_TIMEOUT_MS ? parseInt(process.env.ANIMATE_REQUEST_TIMEOUT_MS, 10) : 30000,
  realTests: process.env.ANIMATE_REAL_TESTS === '1' || process.env.ANIMATE_REAL_TESTS === 'true'
};

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

export function validateAnimatePath(filePath: string): boolean {
  try {
    const resolvedPath = canonicalPath(filePath);
    return animateConfig.allowedRoots.some(root => {
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
