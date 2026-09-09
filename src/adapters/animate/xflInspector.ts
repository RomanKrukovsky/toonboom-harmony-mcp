import fs from 'fs';
import path from 'path';
import { AnimateError } from '../../security.js';

export interface XflDocumentMetadata {
  width?: number;
  height?: number;
  frameRate?: number;
  backgroundColor?: string;
  scenes: string[];
  layerNames: string[];
  libraryItems: string[];
}

export interface XflDiffResult {
  dimensionChanged: boolean;
  frameRateChanged: boolean;
  scenesAdded: string[];
  scenesRemoved: string[];
  layersAdded: string[];
  layersRemoved: string[];
  itemsAdded: string[];
  itemsRemoved: string[];
}

export class AnimateXflInspector {
  public static inspect(xflPath: string): XflDocumentMetadata {
    if (!fs.existsSync(xflPath)) {
      throw new AnimateError('ANIMATE_DOCUMENT_NOT_FOUND', `XFL path does not exist: ${xflPath}`);
    }

    let domDocumentPath = '';
    let libraryPath = '';

    const stats = fs.statSync(xflPath);
    if (stats.isDirectory()) {
      domDocumentPath = path.join(xflPath, 'DOMDocument.xml');
      libraryPath = path.join(xflPath, 'LIBRARY');
    } else if (xflPath.endsWith('.xfl') || xflPath.endsWith('.xml')) {
      domDocumentPath = xflPath;
      libraryPath = path.join(path.dirname(xflPath), 'LIBRARY');
    } else {
      throw new AnimateError('ANIMATE_INVALID_ARGUMENT', `Expected an XFL directory or DOMDocument.xml, received: ${xflPath}`);
    }

    const scenes: string[] = [];
    const layerNames: string[] = [];
    let width: number | undefined;
    let height: number | undefined;
    let frameRate: number | undefined;
    let backgroundColor: string | undefined;

    if (fs.existsSync(domDocumentPath)) {
      const xml = fs.readFileSync(domDocumentPath, 'utf-8');

      const widthMatch = xml.match(/width="(\d+)"/);
      if (widthMatch) width = parseInt(widthMatch[1], 10);

      const heightMatch = xml.match(/height="(\d+)"/);
      if (heightMatch) height = parseInt(heightMatch[1], 10);

      const fpsMatch = xml.match(/frameRate="([\d.]+)"/);
      if (fpsMatch) frameRate = parseFloat(fpsMatch[1]);

      const bgMatch = xml.match(/backgroundColor="(#[a-fA-F0-9]+)"/);
      if (bgMatch) backgroundColor = bgMatch[1];

      // Extract scenes
      const sceneMatches = xml.matchAll(/<DOMTimeline[^>]+name="([^"]+)"/g);
      for (const sm of sceneMatches) {
        scenes.push(sm[1]);
      }

      // Extract layer names
      const layerMatches = xml.matchAll(/<DOMLayer[^>]+name="([^"]+)"/g);
      for (const lm of layerMatches) {
        layerNames.push(lm[1]);
      }
    }

    const libraryItems: string[] = [];
    if (fs.existsSync(libraryPath) && fs.statSync(libraryPath).isDirectory()) {
      this.collectFilesRecursive(libraryPath, libraryItems, libraryPath);
    }

    return {
      width,
      height,
      frameRate,
      backgroundColor,
      scenes,
      layerNames,
      libraryItems
    };
  }

  public static diff(before: XflDocumentMetadata, after: XflDocumentMetadata): XflDiffResult {
    const scenesAdded = after.scenes.filter(s => !before.scenes.includes(s));
    const scenesRemoved = before.scenes.filter(s => !after.scenes.includes(s));

    const layersAdded = after.layerNames.filter(l => !before.layerNames.includes(l));
    const layersRemoved = before.layerNames.filter(l => !after.layerNames.includes(l));

    const itemsAdded = after.libraryItems.filter(i => !before.libraryItems.includes(i));
    const itemsRemoved = before.libraryItems.filter(i => !after.libraryItems.includes(i));

    return {
      dimensionChanged: before.width !== after.width || before.height !== after.height,
      frameRateChanged: before.frameRate !== after.frameRate,
      scenesAdded,
      scenesRemoved,
      layersAdded,
      layersRemoved,
      itemsAdded,
      itemsRemoved
    };
  }

  public static createBackup(sourcePath: string, backupDir: string): string {
    if (!fs.existsSync(sourcePath)) {
      throw new AnimateError('ANIMATE_DOCUMENT_NOT_FOUND', `Source document not found for backup: ${sourcePath}`);
    }

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const baseName = path.basename(sourcePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const targetPath = path.join(backupDir, `${baseName}.backup-${timestamp}`);

    const stats = fs.statSync(sourcePath);
    if (stats.isDirectory()) {
      this.copyDirRecursive(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }

    return targetPath;
  }

  private static collectFilesRecursive(dir: string, result: string[], baseDir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory()) {
        this.collectFilesRecursive(fullPath, result, baseDir);
      } else {
        const relative = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        result.push(relative);
      }
    }
  }

  private static copyDirRecursive(src: string, dest: string): void {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const e of entries) {
      const srcPath = path.join(src, e.name);
      const destPath = path.join(dest, e.name);
      if (e.isDirectory()) {
        this.copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
