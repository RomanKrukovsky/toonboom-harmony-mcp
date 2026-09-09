import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { animateConfig, detectAnimatePaths } from '../../config.js';

export interface AnimateInstallationInfo {
  installed: boolean;
  version: string;
  appPath: string;
  binPath: string;
  installDir: string;
  platform: NodeJS.Platform;
  arch: string;
  cepSupported: boolean;
  userCepDir: string;
  systemCepDir: string;
}

export interface AnimateSystemProfile {
  installation: AnimateInstallationInfo;
  running: boolean;
  pid?: number;
  bridgeConfigured: boolean;
  bridgeMode: string;
  bridgeDir: string;
  bridgePort: number;
}

export class AnimateDetector {
  public static getInstallation(): AnimateInstallationInfo {
    const platform = process.platform;
    const arch = process.arch;
    const detected = detectAnimatePaths();

    const appPath = animateConfig.animateAppPath || detected.appPath;
    const binPath = animateConfig.animateBin || detected.bin;
    const installDir = animateConfig.animateInstall || detected.install;
    const version = animateConfig.animateVersion || detected.version;
    const installed = Boolean((appPath && fs.existsSync(appPath)) || (binPath && fs.existsSync(binPath)));

    // Determine CEP directories based on platform
    let userCepDir = '';
    let systemCepDir = '';
    if (platform === 'darwin') {
      userCepDir = path.join(process.env.HOME || '', 'Library', 'Application Support', 'Adobe', 'CEP', 'extensions');
      systemCepDir = '/Library/Application Support/Adobe/CEP/extensions';
    } else if (platform === 'win32') {
      userCepDir = path.join(process.env.APPDATA || '', 'Adobe', 'CEP', 'extensions');
      systemCepDir = 'C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions';
    }

    // Check if CEP engine is packaged in the app bundle
    let cepSupported = true;
    if (platform === 'darwin' && appPath && fs.existsSync(appPath)) {
      const cepEnginePath = path.join(appPath, 'Contents', 'MacOS', 'CEPHtmlEngine.app');
      cepSupported = fs.existsSync(cepEnginePath);
    }

    return {
      installed,
      version: version || 'unknown',
      appPath,
      binPath,
      installDir,
      platform,
      arch,
      cepSupported,
      userCepDir,
      systemCepDir
    };
  }

  public static isRunning(): { running: boolean; pid?: number } {
    const platform = process.platform;
    try {
      if (platform === 'darwin') {
        const stdout = execSync('pgrep -fl "Adobe Animate"', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[0], 10);
          if (!isNaN(pid)) {
            return { running: true, pid };
          }
        }
      } else if (platform === 'win32') {
        const stdout = execSync('tasklist /FI "IMAGENAME eq Animate.exe" /NH /FO CSV', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        if (stdout.toLowerCase().includes('animate.exe')) {
          const match = stdout.match(/"Animate\.exe","(\d+)"/i);
          const pid = match ? parseInt(match[1], 10) : undefined;
          return { running: true, pid };
        }
      }
    } catch {
      // Process not running
    }
    return { running: false };
  }

  public static getSystemProfile(): AnimateSystemProfile {
    const installation = this.getInstallation();
    const runningState = this.isRunning();

    return {
      installation,
      running: runningState.running,
      pid: runningState.pid,
      bridgeConfigured: animateConfig.enabled,
      bridgeMode: animateConfig.bridgeMode,
      bridgeDir: animateConfig.bridgeDir,
      bridgePort: animateConfig.bridgePort
    };
  }
}
