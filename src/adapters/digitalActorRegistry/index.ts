import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  type DigitalActor,
  type DigitalActorValidation,
  digitalActorSchema,
  digitalActorValidationSchema,
  DIGITAL_ACTOR_SCHEMA_VERSION
} from '../../schemas/digitalActor.js';
import { verifyPathAccess, HarmonyError } from '../../security.js';
import { config } from '../../config.js';
import { DEFAULT_360_VIEWS, DEFAULT_MOUTH_SHAPES } from '../../schemas/characterSpec.js';

export class DigitalActorRegistry {
  readonly rootDir: string;

  constructor(rootDir?: string) {
    const base = rootDir || path.join(config.allowedRoots[0] || '.', 'output', 'factory');
    this.rootDir = verifyPathAccess(base);
    const actorsDir = path.join(this.rootDir, 'actors');
    if (!fs.existsSync(actorsDir)) {
      fs.mkdirSync(actorsDir, { recursive: true });
    }
  }

  /**
   * Validates a Digital Actor against structural rules, schema and integrity constraints.
   */
  validate(actor: unknown): DigitalActorValidation {
    // 1. Zod schema validation
    let parsedActor: DigitalActor;
    try {
      parsedActor = digitalActorSchema.parse(actor);
    } catch (e: any) {
      return {
        valid: false,
        errors: [`Zod schema validation failed: ${e.message}`],
        warnings: [],
        inferredCount: 0,
        checks: {
          viewsCoverage: false,
          hierarchyCycleFree: false,
          pivotsCompleteness: false,
          colorConflictFree: false,
          substitutionsCompleteness: false
        }
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let inferredCount = 0;

    // Count inferred parts/drawings/pivots
    parsedActor.masterDrawings.forEach(d => { if (d.inferred) inferredCount++; });
    parsedActor.pivots.forEach(p => { if (p.inferred) inferredCount++; });
    parsedActor.poseFamilies.forEach(pf => { if (pf.inferred) inferredCount++; });
    inferredCount += parsedActor.provenance.inferredParts.length;

    // Checks flags
    let viewsCoverage = true;
    let hierarchyCycleFree = true;
    let pivotsCompleteness = true;
    let colorConflictFree = true;
    let substitutionsCompleteness = true;

    // 2. Validate views coverage (at least front view is required, warning if others missing)
    const requiredViews = DEFAULT_360_VIEWS;
    const coveredHeadViews = new Set(parsedActor.headViews);
    const coveredBodyViews = new Set(parsedActor.bodyViews);

    if (!coveredHeadViews.has('front') && !coveredBodyViews.has('front')) {
      errors.push("Missing core 'front' view in both head and body views.");
      viewsCoverage = false;
    }

    for (const view of requiredViews) {
      if (!coveredHeadViews.has(view)) {
        warnings.push(`Missing head view: ${view}`);
      }
      if (!coveredBodyViews.has(view)) {
        warnings.push(`Missing body view: ${view}`);
      }
    }

    // 3. Validate conflicting color/swatch IDs
    const colorIds = new Set<string>();
    const colorMap = new Map<string, { r: number; g: number; b: number; a: number; name: string }>();
    for (const palette of parsedActor.palettes) {
      for (const color of palette.colors) {
        if (colorIds.has(color.colorId)) {
          const existing = colorMap.get(color.colorId)!;
          if (
            existing.r !== color.r ||
            existing.g !== color.g ||
            existing.b !== color.b ||
            existing.a !== color.a
          ) {
            errors.push(`Conflicting color ID: ${color.colorId} has multiple definitions.`);
            colorConflictFree = false;
          }
        } else {
          colorIds.add(color.colorId);
          colorMap.set(color.colorId, { r: color.r, g: color.g, b: color.b, a: color.a, name: color.name });
        }
      }
    }

    // 4. Validate hierarchy (cycle detection and parent validation)
    const parents = new Map<string, string | null>();
    const allParts = new Set<string>();
    for (const node of parsedActor.hierarchy) {
      parents.set(node.partId, node.parentId);
      allParts.add(node.partId);
      if (node.parentId) allParts.add(node.parentId);
    }

    // Cycle detection using DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      if (recStack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      recStack.add(node);

      const parent = parents.get(node);
      if (parent !== undefined && parent !== null) {
        if (hasCycle(parent)) return true;
      }

      recStack.delete(node);
      return false;
    };

    for (const part of allParts) {
      if (hasCycle(part)) {
        errors.push(`Cycle detected in hierarchy involving part: ${part}`);
        hierarchyCycleFree = false;
        break;
      }
    }

    // Check if hierarchy parent nodes exist in parts list
    for (const node of parsedActor.hierarchy) {
      if (node.parentId && !parents.has(node.parentId)) {
        warnings.push(`Parent part '${node.parentId}' in hierarchy is not declared as a separate part node.`);
      }
    }

    // 5. Validate pivots completeness
    const pivotParts = new Set(parsedActor.pivots.map(p => p.partId));
    for (const node of parsedActor.hierarchy) {
      if (!pivotParts.has(node.partId)) {
        warnings.push(`Part '${node.partId}' is in hierarchy but is missing a pivot point.`);
        pivotsCompleteness = false;
      }
    }

    // 6. Validate substitutions completeness for mouths
    const mouthSubstitutions = parsedActor.substitutions.filter(s => s.partId === 'mouth');
    const substitutionDrawingIds = new Set(mouthSubstitutions.map(s => s.name));
    for (const shape of parsedActor.mouths) {
      if (!substitutionDrawingIds.has(shape)) {
        warnings.push(`Mouth shape '${shape}' is required but has no corresponding drawing substitution.`);
        substitutionsCompleteness = false;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      inferredCount,
      checks: {
        viewsCoverage,
        hierarchyCycleFree,
        pivotsCompleteness,
        colorConflictFree,
        substitutionsCompleteness
      }
    };
  }

  /**
   * Persists the Digital Actor to output directory.
   */
  register(actor: DigitalActor): { filePath: string; sha256: string } {
    const actorId = actor.actorId;
    const filePath = path.join(this.rootDir, 'actors', `${actorId}.json`);
    const content = JSON.stringify(actor, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    return { filePath, sha256 };
  }

  /**
   * Retrieves an actor by ID.
   */
  getActor(actorId: string): DigitalActor {
    const filePath = path.join(this.rootDir, 'actors', `${actorId}.json`);
    if (!fs.existsSync(filePath)) {
      throw new HarmonyError('INVALID_HARMONY_OBJECT', `Actor ${actorId} not found in registry.`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return digitalActorSchema.parse(JSON.parse(content));
  }

  /**
   * Imports a Digital Actor from a reconstruction manifest JSON.
   */
  importFromReconstructionManifest(manifestPath: string, name: string): DigitalActor {
    const realPath = verifyPathAccess(manifestPath);
    const content = fs.readFileSync(realPath, 'utf-8');
    const manifest = JSON.parse(content);

    const actorId = `actor_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    // Extract drawings and palettes
    const masterDrawings: any[] = [];
    const substitutions: any[] = [];
    const inferredParts: string[] = [];

    if (Array.isArray(manifest.drawings)) {
      for (const d of manifest.drawings) {
        masterDrawings.push({
          drawingId: d.id,
          name: d.id,
          path: d.normalizedImagePath || d.imagePath,
          inferred: d.inferred || false
        });
        if (d.inferred) {
          inferredParts.push(d.id);
        }
      }
    }

    const palettes: any[] = [];
    if (Array.isArray(manifest.palettes)) {
      for (const p of manifest.palettes) {
        const colors = Array.isArray(p.colors) ? p.colors.map((c: any) => ({
          colorId: c.colorId || c.id,
          name: c.name || `color_${c.colorId}`,
          r: c.r ?? 128,
          g: c.g ?? 128,
          b: c.b ?? 128,
          a: c.a ?? 255
        })) : [];

        palettes.push({
          paletteId: p.paletteId || p.id || 'default_palette',
          name: p.name || 'Default Palette',
          colors
        });
      }
    }

    // Default hierarchy and pivots based on elements
    const hierarchy: any[] = [];
    const pivots: any[] = [];
    if (Array.isArray(manifest.elements)) {
      for (const el of manifest.elements) {
        hierarchy.push({
          partId: el.nodeName,
          parentId: el.parentPegName || null
        });
        pivots.push({
          partId: el.nodeName,
          x: el.pivotX || 0,
          y: el.pivotY || 0,
          inferred: true
        });
      }
    }

    // Populate standard mouth shapes
    if (Array.isArray(manifest.exposures)) {
      for (const exp of manifest.exposures) {
        if (exp.elementName === 'mouth' || exp.drawingId?.includes('mouth')) {
          substitutions.push({
            partId: 'mouth',
            drawingId: exp.drawingId,
            name: exp.drawingId.split('_').pop() || 'rest'
          });
        }
      }
    }

    const actor: DigitalActor = {
      schemaVersion: DIGITAL_ACTOR_SCHEMA_VERSION,
      actorId,
      identity: {
        name,
        description: `Imported from reconstruction manifest at ${path.basename(manifestPath)}`,
        tags: ['imported', 'reconstruction']
      },
      modelSheets: [],
      palettes,
      masterDrawings,
      headViews: DEFAULT_360_VIEWS,
      bodyViews: DEFAULT_360_VIEWS,
      eyes: ['eye_L', 'eye_R'],
      brows: ['brow_L', 'brow_R'],
      mouths: DEFAULT_MOUTH_SHAPES,
      hands: ['hand_L', 'hand_R'],
      props: [],
      pivots,
      hierarchy,
      deformRules: [],
      substitutions,
      poseFamilies: [],
      gestureLibrary: [],
      actingProfile: {
        defaultStyle: 'restrained',
        tempoBias: 1.0,
        gestureRate: 0.5
      },
      provenance: {
        importedFrom: manifestPath,
        importedAt: new Date().toISOString(),
        inferredParts
      },
      origin: 'generated'
    };

    return digitalActorSchema.parse(actor);
  }

  /**
   * Imports a Digital Actor from other formats.
   */
  importFromFile(sourceType: 'psd' | 'svg' | 'png_dir' | 'harmony_template' | 'harmony_scene', sourcePath: string, name: string): DigitalActor {
    const realPath = verifyPathAccess(sourcePath);
    const actorId = `actor_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    // A lightweight heuristic parser depending on file formats
    const masterDrawings: any[] = [];
    const hierarchy: any[] = [];
    const pivots: any[] = [];
    const substitutions: any[] = [];
    const inferredParts: string[] = [];

    if (sourceType === 'png_dir') {
      const files = fs.readdirSync(realPath).filter(f => f.endsWith('.png'));
      for (const file of files) {
        const partName = path.basename(file, '.png');
        masterDrawings.push({
          drawingId: partName,
          name: partName,
          path: path.join(realPath, file),
          inferred: false
        });
        hierarchy.push({ partId: partName, parentId: null });
        pivots.push({ partId: partName, x: 0, y: 0, inferred: true });
        inferredParts.push(partName);
      }
    } else if (sourceType === 'psd') {
      // In offline CPU fallback, mock layers mapping based on typical PSD layer naming
      const mockLayers = ['head', 'torso', 'arm_L', 'arm_R', 'hand_L', 'hand_R', 'leg_L', 'leg_R', 'mouth', 'eyes'];
      for (const layer of mockLayers) {
        masterDrawings.push({
          drawingId: layer,
          name: layer,
          path: path.join(realPath, `${layer}.png`),
          inferred: true
        });
        hierarchy.push({ partId: layer, parentId: layer === 'head' || layer === 'torso' ? null : 'torso' });
        pivots.push({ partId: layer, x: 0, y: 0, inferred: true });
        inferredParts.push(layer);
      }
    } else {
      // General baseline fallback for SVG, Template, Scene
      masterDrawings.push({
        drawingId: 'master_body',
        name: 'master_body',
        path: realPath,
        inferred: true
      });
      hierarchy.push({ partId: 'master_body', parentId: null });
      pivots.push({ partId: 'master_body', x: 0, y: 0, inferred: true });
      inferredParts.push('master_body');
    }

    // Default palettes
    const palettes = [{
      paletteId: 'default_palette',
      name: 'Default Palette',
      colors: [
        { colorId: 'c1', name: 'skin', r: 240, g: 200, b: 180, a: 255 },
        { colorId: 'c2', name: 'outline', r: 0, g: 0, b: 0, a: 255 }
      ]
    }];

    const actor: DigitalActor = {
      schemaVersion: DIGITAL_ACTOR_SCHEMA_VERSION,
      actorId,
      identity: {
        name,
        description: `Imported from ${sourceType} at ${path.basename(sourcePath)}`,
        tags: ['imported', sourceType]
      },
      modelSheets: [],
      palettes,
      masterDrawings,
      headViews: DEFAULT_360_VIEWS,
      bodyViews: DEFAULT_360_VIEWS,
      eyes: ['eyes'],
      brows: [],
      mouths: DEFAULT_MOUTH_SHAPES,
      hands: [],
      props: [],
      pivots,
      hierarchy,
      deformRules: [],
      substitutions,
      poseFamilies: [],
      gestureLibrary: [],
      actingProfile: {
        defaultStyle: 'restrained',
        tempoBias: 1.0,
        gestureRate: 0.5
      },
      provenance: {
        importedFrom: sourcePath,
        importedAt: new Date().toISOString(),
        inferredParts
      },
      origin: 'generated'
    };

    return digitalActorSchema.parse(actor);
  }
}
