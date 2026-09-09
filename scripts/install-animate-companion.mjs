#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

console.log('=== Adobe Animate MCP Companion Extension Setup ===\n');

const platform = process.platform;
let targetDir = '';

if (platform === 'darwin') {
  targetDir = path.join(process.env.HOME || '', 'Library', 'Application Support', 'Adobe', 'CEP', 'extensions');
} else if (platform === 'win32') {
  targetDir = path.join(process.env.APPDATA || '', 'Adobe', 'CEP', 'extensions');
} else {
  console.error(`Unsupported platform for Adobe CEP extension: ${platform}`);
  process.exit(1);
}

const sourceDir = path.join(repoRoot, 'extensions', 'com.toonboomharmony.animate.bridge');
if (!fs.existsSync(sourceDir)) {
  console.error(`Source extension directory not found: ${sourceDir}`);
  process.exit(1);
}

const destDir = path.join(targetDir, 'com.toonboomharmony.animate.bridge');

try {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`Created user extensions directory: ${targetDir}`);
  }

  // Copy extension directory recursively
  console.log(`Installing companion to:\n  ${destDir}`);
  fs.cpSync(sourceDir, destDir, { recursive: true });
  console.log('Files copied successfully.');

  // Enable unsigned CEP extension loading in developer mode
  if (platform === 'darwin') {
    try {
      // CSXS versions 9 to 16
      const versions = ['9', '10', '11', '12', '13', '14', '15', '16'];
      for (const v of versions) {
        try {
          execSync(`defaults write com.adobe.CSXS.${v} PlayerDebugMode 1`, { stdio: 'ignore' });
        } catch {}
      }
      console.log('Enabled PlayerDebugMode for Adobe CSXS runtime.');
    } catch (e) {
      console.warn('Note: Could not set PlayerDebugMode automatically:', e.message);
    }
  }

  console.log('\nVerification:');
  const manifest = path.join(destDir, 'CSXS', 'manifest.xml');
  if (fs.existsSync(manifest)) {
    console.log(`  [OK] Manifest found at: ${manifest}`);
  } else {
    console.warn(`  [WARNING] Manifest not found at: ${manifest}`);
  }

  console.log('\nSUCCESS: Adobe Animate MCP companion extension installed.');
  console.log('IMPORTANT: If Adobe Animate is currently open, please restart it, then open:');
  console.log('           Window -> Extensions -> Animate MCP Bridge.');
} catch (err) {
  console.error('Installation failed:', err.message);
  process.exit(1);
}
