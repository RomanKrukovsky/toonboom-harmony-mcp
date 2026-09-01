import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import type {
  MohoProductionV3StageArtifactOutput,
  MohoProductionV3StageContext,
  MohoProductionV3StageExecutor,
  MohoProductionV3StageResult
} from '../../orchestrators/mohoProductionV3/index.js';
import {
  artworkPackV3Schema,
  mohoProductionV3LayeredManifestSchema,
  performancePlanV3Schema,
  rigBlueprintV3Schema,
  type ArtworkPackV3,
  type MohoProductionV3LayeredManifest,
  type PerformancePlanV3,
  type RigBlueprintV3
} from '../../schemas/mohoProductionV3.js';
import { mohoCommandPlanSchema, type MohoCommandPlan } from '../../schemas/mohoCommandPlan.js';
import {
  OpenRouterProductionProvider,
  type StructuredProviderRequest,
  type StructuredProviderResult
} from '../../adapters/mohoProductionProviders/index.js';
import { RhubarbForcedAligner, type ForcedAlignmentResultV3 } from '../mohoForcedAlignmentV3/index.js';
import { compileMohoProductionPlanV3 } from '../mohoProductionV3Compiler/index.js';
import {
  MohoNativeProductionBackend,
  type MohoNativeBuildResult,
  type MohoNativeRenderResult
} from '../mohoProductionV3NativeBackend/index.js';
import { verifyPathAccess } from '../../security.js';

const execFileAsync = promisify(execFile) as (
  executable: string,
  args: string[],
  options: { timeout: number; maxBuffer: number }
) => Promise<{ stdout: string; stderr: string }>;

const artworkAnalysisSchema = z.object({
  parts: z.array(z.object({
    partId: z.string().regex(/^[A-Za-z0-9_.-]+$/),
    characterRef: z.string().min(1).nullable(),
    sourceIndex: z.number().int().nonnegative(),
    zIndex: z.number().int(),
    confidence: z.number().min(0).max(1),
    pivot: z.object({ x: z.number().finite(), y: z.number().finite() }).strict(),
    view: z.string().min(1),
    synthesisPrompt: z.string().min(1)
  }).strict()).min(1),
  occlusionGraph: z.array(z.object({ frontPartId: z.string(), backPartId: z.string() }).strict()),
  joints: z.array(z.object({
    jointId: z.string(), parentPartId: z.string(), childPartId: z.string(),
    x: z.number().finite(), y: z.number().finite(), confidence: z.number().min(0).max(1)
  }).strict()),
  requiredViews: z.array(z.string().min(1)),
  drawings: z.array(z.object({
    drawingId: z.string().regex(/^[A-Za-z0-9_.-]+$/),
    kind: z.enum(['mouth', 'eye', 'hand', 'view']),
    sourceIndex: z.number().int().nonnegative(),
    choiceName: z.string().min(1),
    confidence: z.number().min(0).max(1),
    synthesisPrompt: z.string().min(1)
  }).strict()),
  overallConfidence: z.number().min(0).max(1)
}).strict();

const artisticQaSchema = z.object({
  passed: z.boolean(),
  silhouette: z.boolean(),
  palette: z.boolean(),
  eyeLine: z.boolean(),
  poseReadability: z.boolean(),
  emotion: z.boolean(),
  matchesApprovedAnimatic: z.boolean(),
  issues: z.array(z.string())
}).strict();

interface PlannerProvider {
  generateStructured<T>(request: StructuredProviderRequest<T>): Promise<StructuredProviderResult<T>>;
}

interface ArtworkProvider {
  analyzeStructured<T>(request: Omit<StructuredProviderRequest<T>, 'system'> & { imagePaths: string[] }): Promise<StructuredProviderResult<T>>;
  synthesizeTransparentPart(input: { sourceImagePath: string; outputPath: string; prompt: string }): Promise<{
    outputPath: string;
    provider: string;
    model: string;
    callId: string;
    requestSha256: string;
    responseSha256: string;
  }>;
}

interface Aligner {
  align(input: {
    characterRef: string;
    audioPath: string;
    text: string;
    startFrame: number;
    fps: number;
    workDir: string;
  }): Promise<ForcedAlignmentResultV3>;
}

export interface MohoProductionV3StageExecutorDependencies {
  planner?: PlannerProvider;
  artworkProvider?: ArtworkProvider;
  aligner?: Aligner;
  nativeBackend?: MohoNativeProductionBackend;
  extractFrames?: (videoPath: string, outputDir: string, durationFrames: number, fps: number) => Promise<string[]>;
}

class StageExecutorError extends Error {
  public constructor(public readonly code: 'QA_FAILED' | 'ASSET_UNREADABLE' | 'INPUT_INVALID', message: string) {
    super(message);
    this.name = 'StageExecutorError';
  }
}

function sha256File(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function safeName(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]+/g, '_').slice(0, 100);
}

function writeJson(filePath: string, value: unknown): string {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return filePath;
}

function readJson<T>(filePath: string, schema: { parse(input: unknown): T }): T {
  return schema.parse(JSON.parse(fs.readFileSync(filePath, 'utf8')));
}

function stageDir(context: MohoProductionV3StageContext): string {
  const directory = verifyPathAccess(path.join(context.input.outputDir, '.moho-production-v3', context.jobId, context.stage));
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function artifact(pathValue: string, mediaType: string, provenance: Record<string, unknown>): MohoProductionV3StageArtifactOutput {
  return { path: pathValue, mediaType, provenance };
}

function modelCall(result: StructuredProviderResult<unknown>): NonNullable<MohoProductionV3StageResult['modelCalls']>[number] {
  return {
    provider: result.provider,
    model: result.model,
    requestSha256: result.requestSha256,
    responseSha256: result.responseSha256,
    status: 'completed',
    metadata: { providerCallId: result.callId }
  };
}

function imageModelCall(result: Awaited<ReturnType<ArtworkProvider['synthesizeTransparentPart']>>): NonNullable<MohoProductionV3StageResult['modelCalls']>[number] {
  return {
    provider: result.provider,
    model: result.model,
    requestSha256: result.requestSha256,
    responseSha256: result.responseSha256,
    status: 'completed',
    metadata: { providerCallId: result.callId }
  };
}

function provenance(result: StructuredProviderResult<unknown>): ArtworkPackV3['provenance'] {
  return {
    provider: result.provider,
    model: result.model,
    callId: result.callId,
    inputSha256: result.requestSha256,
    outputSha256: result.responseSha256
  };
}

function checkpointPath(context: MohoProductionV3StageContext, stage: keyof MohoProductionV3StageContext['previousCheckpoints'], field: string): string {
  const value = context.previousCheckpoints[stage]?.[field];
  if (typeof value !== 'string') throw new StageExecutorError('INPUT_INVALID', `Checkpoint ${String(stage)}.${field} is missing.`);
  return value;
}

function artworkPathsFromManifest(manifestPath: string): string[] {
  let value: unknown;
  try {
    value = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new StageExecutorError('ASSET_UNREADABLE', `Layer manifest is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const baseDir = path.dirname(manifestPath);
  const found = new Set<string>();
  const visit = (candidate: unknown): void => {
    if (typeof candidate === 'string' && /\.(?:png|jpe?g|svg)$/i.test(candidate)) {
      const resolved = path.isAbsolute(candidate) ? candidate : path.resolve(baseDir, candidate);
      const verified = verifyPathAccess(resolved);
      if (!fs.existsSync(verified) || !fs.statSync(verified).isFile() || fs.statSync(verified).size === 0) {
        throw new StageExecutorError('ASSET_UNREADABLE', `Layer manifest asset is missing or empty: ${candidate}`);
      }
      found.add(verified);
      return;
    }
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item);
      return;
    }
    if (candidate && typeof candidate === 'object') {
      for (const nested of Object.values(candidate as Record<string, unknown>)) visit(nested);
    }
  };
  visit(value);
  return [...found];
}

function sourceImages(context: MohoProductionV3StageContext): string[] {
  switch (context.input.artwork.mode) {
    case 'layered_manifest':
      return [...new Set([
        ...context.input.artwork.assetPaths,
        ...artworkPathsFromManifest(context.input.artwork.manifestPath),
        ...(context.input.artwork.backgroundPath ? [context.input.artwork.backgroundPath] : []),
        ...context.input.artwork.propPaths
      ])];
    case 'flat_characters':
      return [...context.input.artwork.imagePaths, ...(context.input.artwork.backgroundPath ? [context.input.artwork.backgroundPath] : []), ...context.input.artwork.propPaths];
    case 'flat_scene':
      return [context.input.artwork.imagePath];
    default: {
      const exhaustive: never = context.input.artwork;
      return exhaustive;
    }
  }
}

async function rasterizeForVision(sourcePath: string, destinationPath: string): Promise<string> {
  if (/\.png$/i.test(sourcePath)) {
    fs.copyFileSync(sourcePath, destinationPath);
    return destinationPath;
  }
  try {
    await execFileAsync('/usr/bin/sips', ['-s', 'format', 'png', sourcePath, '--out', destinationPath], {
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024
    });
  } catch (error) {
    throw new StageExecutorError('ASSET_UNREADABLE', `Could not rasterize artwork ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!fs.existsSync(destinationPath) || fs.statSync(destinationPath).size === 0) {
    throw new StageExecutorError('ASSET_UNREADABLE', `Rasterized artwork is empty: ${sourcePath}`);
  }
  return destinationPath;
}

function resolveLayeredManifestAsset(manifestPath: string, assetPath: string): string {
  const resolved = path.isAbsolute(assetPath) ? assetPath : path.resolve(path.dirname(manifestPath), assetPath);
  const verified = verifyPathAccess(resolved);
  if (!fs.existsSync(verified) || !fs.statSync(verified).isFile() || fs.statSync(verified).size === 0) {
    throw new StageExecutorError('ASSET_UNREADABLE', `Layered manifest asset is missing or empty: ${assetPath}`);
  }
  return verified;
}

function readLayeredManifest(manifestPath: string): MohoProductionV3LayeredManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new StageExecutorError('ASSET_UNREADABLE', `Layered manifest is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const parsed = mohoProductionV3LayeredManifestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new StageExecutorError('INPUT_INVALID', `Layered manifest does not match schema v3: ${parsed.error.message}`);
  }
  return parsed.data;
}

async function buildLayeredArtworkPack(
  context: MohoProductionV3StageContext,
  directory: string
): Promise<MohoProductionV3StageResult> {
  if (context.input.artwork.mode !== 'layered_manifest') {
    throw new StageExecutorError('INPUT_INVALID', 'Layered artwork builder received a non-layered input.');
  }
  const manifestPath = context.input.artwork.manifestPath;
  const manifest = readLayeredManifest(manifestPath);
  const partsDir = path.join(directory, 'parts');
  fs.mkdirSync(partsDir, { recursive: true });
  const manifestSha256 = sha256File(manifestPath);
  const manifestProvenance: ArtworkPackV3['provenance'] = {
    provider: 'manifest',
    model: 'layered-artwork-v3',
    callId: `manifest-${manifestSha256.slice(0, 16)}`,
    inputSha256: manifestSha256
  };
  const artifacts: MohoProductionV3StageArtifactOutput[] = [];
  const parts: ArtworkPackV3['parts'] = [];
  for (const part of manifest.parts) {
    const source = resolveLayeredManifestAsset(manifestPath, part.sourcePath);
    const outputPath = path.join(partsDir, `${safeName(part.partId)}.png`);
    await rasterizeForVision(source, outputPath);
    if (!pngIsValid(outputPath)) throw new StageExecutorError('ASSET_UNREADABLE', `Layered part is not a valid PNG after import: ${part.sourcePath}`);
    let maskPath: string | null = null;
    if (part.maskPath) {
      const maskSource = resolveLayeredManifestAsset(manifestPath, part.maskPath);
      maskPath = path.join(partsDir, `${safeName(part.partId)}.mask.png`);
      await rasterizeForVision(maskSource, maskPath);
      if (!pngIsValid(maskPath)) throw new StageExecutorError('ASSET_UNREADABLE', `Layered mask is not a valid PNG after import: ${part.maskPath}`);
      artifacts.push(artifact(maskPath, 'image/png', { ...manifestProvenance, partId: part.partId, kind: 'mask' }));
    }
    parts.push({
      partId: part.partId,
      characterRef: part.characterRef,
      sourcePath: outputPath,
      maskPath,
      zIndex: part.zIndex,
      confidence: part.confidence,
      pivot: part.pivot,
      synthesized: false,
      view: part.view
    });
    artifacts.push(artifact(outputPath, 'image/png', { ...manifestProvenance, partId: part.partId, kind: 'layered_part' }));
  }
  const drawingSets: ArtworkPackV3['drawingSets'] = { mouth: [], eyes: [], hands: [] };
  const drawingAssets: ArtworkPackV3['drawingAssets'] = [];
  for (const drawing of manifest.drawingAssets) {
    const source = resolveLayeredManifestAsset(manifestPath, drawing.sourcePath);
    const outputPath = path.join(partsDir, `drawing-${safeName(drawing.drawingId)}.png`);
    await rasterizeForVision(source, outputPath);
    if (!pngIsValid(outputPath)) throw new StageExecutorError('ASSET_UNREADABLE', `Layered drawing is not a valid PNG after import: ${drawing.sourcePath}`);
    drawingAssets.push({
      drawingId: drawing.drawingId,
      kind: drawing.kind,
      sourcePath: outputPath,
      confidence: drawing.confidence
    });
    if (drawing.kind === 'mouth') drawingSets.mouth.push(drawing.choiceName);
    else if (drawing.kind === 'eye') drawingSets.eyes.push(drawing.choiceName);
    else if (drawing.kind === 'hand') drawingSets.hands.push(drawing.choiceName);
    artifacts.push(artifact(outputPath, 'image/png', { ...manifestProvenance, drawingId: drawing.drawingId, kind: drawing.kind }));
  }
  const artworkPack = artworkPackV3Schema.parse({
    schemaVersion: '3.0',
    shotId: context.input.shotId,
    parts,
    occlusionGraph: manifest.occlusionGraph,
    joints: manifest.joints,
    requiredViews: manifest.requiredViews,
    drawingSets,
    drawingAssets,
    overallConfidence: manifest.overallConfidence,
    provenance: manifestProvenance
  });
  validateCharacterLimit(artworkPack);
  const artworkPackPath = writeJson(path.join(directory, 'artwork-pack-v3.json'), artworkPack);
  return {
    checkpoint: {
      artworkPackPath,
      characterCount: new Set(parts.map(part => part.characterRef).filter(Boolean)).size,
      generationRequired: false
    },
    confidence: artworkPack.overallConfidence,
    artifacts: [artifact(artworkPackPath, 'application/json', manifestProvenance), ...artifacts],
    modelCalls: []
  };
}

function pngIsValid(filePath: string): boolean {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 8) return false;
  return fs.readFileSync(filePath).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}

async function defaultExtractFrames(videoPath: string, outputDir: string, durationFrames: number, fps: number): Promise<string[]> {
  fs.mkdirSync(outputDir, { recursive: true });
  const frameNumbers = Array.from(new Set([0, Math.floor(durationFrames / 2), Math.max(0, durationFrames - 1)]));
  const outputs: string[] = [];
  for (const frameNumber of frameNumbers) {
    const outputPath = path.join(outputDir, `qa_${String(frameNumber).padStart(5, '0')}.png`);
    await execFileAsync('ffmpeg', [
      '-y', '-v', 'error', '-ss', String(frameNumber / fps), '-i', videoPath,
      '-frames:v', '1', outputPath
    ], { timeout: 60_000, maxBuffer: 8 * 1024 * 1024 });
    if (!pngIsValid(outputPath)) throw new StageExecutorError('QA_FAILED', `Could not extract QA frame ${frameNumber}.`);
    outputs.push(outputPath);
  }
  return outputs;
}

function patchesText(context: MohoProductionV3StageContext): string {
  const relevant = context.patches.filter(patch => patch.targetStage === context.stage);
  return relevant.length === 0 ? 'No director corrections.' : relevant.map(patch => `${patch.patchType}: ${patch.instruction}`).join('\n');
}

function validateCharacterLimit(artwork: ArtworkPackV3): void {
  const characters = new Set(artwork.parts.map(part => part.characterRef).filter((value): value is string => value !== null));
  if (characters.size > 10) throw new StageExecutorError('INPUT_INVALID', `Shot contains ${characters.size} active characters; production limit is 10.`);
}

function validatePerformancePlan(
  performance: PerformancePlanV3,
  artwork: ArtworkPackV3,
  durationFrames: number,
  alignments: ForcedAlignmentResultV3[]
): void {
  const artworkCharacters = new Set(artwork.parts.map(part => part.characterRef).filter((value): value is string => value !== null));
  const performanceCharacters = new Set<string>();
  for (const character of performance.characters) {
    if (performanceCharacters.has(character.characterRef)) {
      throw new StageExecutorError('INPUT_INVALID', `Duplicate performance track for ${character.characterRef}.`);
    }
    performanceCharacters.add(character.characterRef);
    if (!artworkCharacters.has(character.characterRef)) {
      throw new StageExecutorError('INPUT_INVALID', `Performance references unknown character ${character.characterRef}.`);
    }
    const allKeys = [
      ...character.poseKeys, ...character.gazeKeys, ...character.emotionKeys,
      ...character.gestureKeys, ...character.mouthKeys, ...character.blinkKeys,
      ...character.secondaryMotionKeys, ...character.interactionKeys
    ];
    if (allKeys.some(key => key.frame > durationFrames)) {
      throw new StageExecutorError('INPUT_INVALID', `Performance for ${character.characterRef} contains a key beyond frame ${durationFrames}.`);
    }
  }
  for (const key of performance.cameraKeys) {
    if (key.frame > durationFrames) throw new StageExecutorError('INPUT_INVALID', `Camera key exceeds frame ${durationFrames}.`);
  }
  for (const alignment of alignments) {
    const character = performance.characters.find(track => track.characterRef === alignment.characterRef);
    if (!character) throw new StageExecutorError('INPUT_INVALID', `Forced alignment has no performance track for ${alignment.characterRef}.`);
    for (const cue of alignment.cues) {
      const nearest = character.mouthKeys.reduce(
        (distance, key) => Math.min(distance, Math.abs(key.frame - cue.startFrame)),
        Number.POSITIVE_INFINITY
      );
      if (nearest > 2) {
        throw new StageExecutorError('INPUT_INVALID', `Lipsync drift exceeds two frames for ${alignment.characterRef} at frame ${cue.startFrame}.`);
      }
    }
  }
}

function assertApprovedKeysPreserved(approved: PerformancePlanV3, final: PerformancePlanV3): void {
  const keySignature = (value: unknown): string => JSON.stringify(value);
  for (const approvedCharacter of approved.characters) {
    const finalCharacter = final.characters.find(character => character.characterRef === approvedCharacter.characterRef);
    if (!finalCharacter) throw new StageExecutorError('INPUT_INVALID', `Final animation removed approved character ${approvedCharacter.characterRef}.`);
    const trackPairs: Array<[unknown[], unknown[], string]> = [
      [approvedCharacter.poseKeys, finalCharacter.poseKeys, 'pose'],
      [approvedCharacter.gazeKeys, finalCharacter.gazeKeys, 'gaze'],
      [approvedCharacter.emotionKeys, finalCharacter.emotionKeys, 'emotion'],
      [approvedCharacter.gestureKeys, finalCharacter.gestureKeys, 'gesture'],
      [approvedCharacter.mouthKeys, finalCharacter.mouthKeys, 'mouth'],
      [approvedCharacter.blinkKeys, finalCharacter.blinkKeys, 'blink']
    ];
    for (const [approvedKeys, finalKeys, trackName] of trackPairs) {
      const finalSet = new Set(finalKeys.map(keySignature));
      const removed = approvedKeys.find(key => !finalSet.has(keySignature(key)));
      if (removed) throw new StageExecutorError('INPUT_INVALID', `Final animation changed an approved ${trackName} key for ${approvedCharacter.characterRef}.`);
    }
  }
  const finalCamera = new Set(final.cameraKeys.map(keySignature));
  if (approved.cameraKeys.some(key => !finalCamera.has(keySignature(key)))) {
    throw new StageExecutorError('INPUT_INVALID', 'Final animation changed an approved camera key.');
  }
}

export function createMohoProductionV3StageExecutor(
  dependencies: MohoProductionV3StageExecutorDependencies = {}
): MohoProductionV3StageExecutor {
  const openRouter = new OpenRouterProductionProvider();
  const planner = dependencies.planner ?? openRouter;
  const artworkProvider = dependencies.artworkProvider ?? openRouter;
  const aligner = dependencies.aligner ?? new RhubarbForcedAligner();
  const nativeBackend = dependencies.nativeBackend ?? new MohoNativeProductionBackend();
  const extractFrames = dependencies.extractFrames ?? defaultExtractFrames;

  return async (context: MohoProductionV3StageContext): Promise<MohoProductionV3StageResult> => {
    const directory = stageDir(context);
    switch (context.stage) {
      case 'ingest': {
        const files = sourceImages(context);
        if (context.input.artwork.mode === 'layered_manifest') files.unshift(context.input.artwork.manifestPath);
        files.push(...context.input.styleReferencePaths, ...context.input.dialogueTracks.map(track => track.audioPath));
        const manifest = {
          schemaVersion: '3.0',
          shotId: context.input.shotId,
          input: context.input,
          assets: files.map(filePath => ({ path: filePath, sha256: sha256File(filePath), size: fs.statSync(filePath).size }))
        };
        const manifestPath = writeJson(path.join(directory, 'ingest-manifest.json'), manifest);
        return {
          checkpoint: { manifestPath, assetCount: manifest.assets.length },
          artifacts: [artifact(manifestPath, 'application/json', { kind: 'ingest_manifest', shotId: context.input.shotId })]
        };
      }
      case 'decomposition': {
        if (context.input.artwork.mode === 'layered_manifest') {
          return buildLayeredArtworkPack(context, directory);
        }
        const rawSources = sourceImages(context);
        if (rawSources.length === 0) throw new StageExecutorError('ASSET_UNREADABLE', 'Artwork manifest contains no PNG, JPG or SVG assets.');
        const visionDir = path.join(directory, 'vision-inputs');
        fs.mkdirSync(visionDir, { recursive: true });
        const visionSources: string[] = [];
        for (const [index, sourcePath] of rawSources.entries()) {
          visionSources.push(await rasterizeForVision(sourcePath, path.join(visionDir, `${index}_${safeName(path.basename(sourcePath, path.extname(sourcePath)))}.png`)));
        }
        const analysis = await artworkProvider.analyzeStructured({
          schemaName: 'moho_artwork_decomposition_v3',
          schema: artworkAnalysisSchema,
          imagePaths: visionSources,
          prompt: [
            'Analyze this Moho Pro 14 shot artwork for production rigging.',
            `Input mode: ${context.input.artwork.mode}. Brief: ${context.input.brief}`,
            'Separate characters, background and props. Define all riggable parts, pivots, occlusion, joints, required shot views, and mouth/eye/hand drawings.',
            'For hidden zones and missing views, provide precise synthesis prompts. sourceIndex must reference the supplied image list.',
            'Do not exceed 10 distinct non-null characterRef values.',
            patchesText(context)
          ].join('\n')
        });
        const partsDir = path.join(directory, 'parts');
        fs.mkdirSync(partsDir, { recursive: true });
        const calls = [modelCall(analysis)];
        const analyzedCharacters = new Set(analysis.data.parts.map(part => part.characterRef).filter((value): value is string => value !== null));
        if (analyzedCharacters.size > 10) {
          throw new StageExecutorError('INPUT_INVALID', `Artwork analysis found ${analyzedCharacters.size} active characters; production limit is 10.`);
        }
        const parts: ArtworkPackV3['parts'] = [];
        for (const descriptor of analysis.data.parts) {
          const source = visionSources[descriptor.sourceIndex];
          if (!source) throw new StageExecutorError('INPUT_INVALID', `Artwork analysis returned invalid sourceIndex ${descriptor.sourceIndex}.`);
          const outputPath = path.join(partsDir, `${safeName(descriptor.partId)}.png`);
          const result = await artworkProvider.synthesizeTransparentPart({
            sourceImagePath: source,
            outputPath,
            prompt: `${descriptor.synthesisPrompt} Preserve the approved visual style exactly. Complete hidden zones. Output only this isolated part on transparency.`
          });
          calls.push(imageModelCall(result));
          if (!pngIsValid(outputPath)) throw new StageExecutorError('ASSET_UNREADABLE', `Generated part is not a valid PNG: ${outputPath}`);
          parts.push({
            partId: descriptor.partId,
            characterRef: descriptor.characterRef,
            sourcePath: outputPath,
            maskPath: null,
            zIndex: descriptor.zIndex,
            confidence: descriptor.confidence,
            pivot: descriptor.pivot,
            synthesized: true,
            view: descriptor.view
          });
        }
        const drawingAssets: ArtworkPackV3['drawingAssets'] = [];
        const drawingSets: ArtworkPackV3['drawingSets'] = { mouth: [], eyes: [], hands: [] };
        for (const drawing of analysis.data.drawings) {
          const source = visionSources[drawing.sourceIndex];
          if (!source) throw new StageExecutorError('INPUT_INVALID', `Drawing analysis returned invalid sourceIndex ${drawing.sourceIndex}.`);
          const outputPath = path.join(partsDir, `${safeName(drawing.drawingId)}.png`);
          const result = await artworkProvider.synthesizeTransparentPart({
            sourceImagePath: source,
            outputPath,
            prompt: `${drawing.synthesisPrompt} Produce the ${drawing.kind} drawing named ${drawing.choiceName}, isolated on transparency, exact source style.`
          });
          calls.push(imageModelCall(result));
          if (!pngIsValid(outputPath)) throw new StageExecutorError('ASSET_UNREADABLE', `Generated drawing is not a valid PNG: ${outputPath}`);
          drawingAssets.push({ drawingId: drawing.drawingId, kind: drawing.kind, sourcePath: outputPath, confidence: drawing.confidence });
          if (drawing.kind === 'mouth') drawingSets.mouth.push(drawing.choiceName);
          else if (drawing.kind === 'eye') drawingSets.eyes.push(drawing.choiceName);
          else if (drawing.kind === 'hand') drawingSets.hands.push(drawing.choiceName);
        }
        const artworkPack = artworkPackV3Schema.parse({
          schemaVersion: '3.0',
          shotId: context.input.shotId,
          parts,
          occlusionGraph: analysis.data.occlusionGraph,
          joints: analysis.data.joints,
          requiredViews: analysis.data.requiredViews,
          drawingSets,
          drawingAssets,
          overallConfidence: analysis.data.overallConfidence,
          provenance: provenance(analysis)
        });
        validateCharacterLimit(artworkPack);
        const artworkPackPath = writeJson(path.join(directory, 'artwork-pack-v3.json'), artworkPack);
        return {
          checkpoint: { artworkPackPath, characterCount: new Set(parts.map(part => part.characterRef).filter(Boolean)).size },
          confidence: artworkPack.overallConfidence,
          artifacts: [
            artifact(artworkPackPath, 'application/json', artworkPack.provenance),
            ...parts.map(part => artifact(part.sourcePath, 'image/png', { ...artworkPack.provenance, partId: part.partId })),
            ...drawingAssets.map(drawing => artifact(drawing.sourcePath, 'image/png', { ...artworkPack.provenance, drawingId: drawing.drawingId }))
          ],
          modelCalls: calls
        };
      }
      case 'rig_blueprint': {
        const artwork = readJson(checkpointPath(context, 'decomposition', 'artworkPackPath'), artworkPackV3Schema);
        const result = await planner.generateStructured({
          schemaName: 'moho_rig_blueprint_v3',
          schema: rigBlueprintV3Schema,
          system: 'You are a senior Moho Pro 14 rigger. Design only native, testable rigs. Never use fake preview, marker or placeholder layers.',
          prompt: [
            `Create the full arbitrary-topology RigBlueprintV3 for shot ${context.input.shotId}.`,
            `ArtworkPackV3: ${JSON.stringify(artwork)}`,
            'Use native layer/flexi bindings, switches, Smart Actions, Smart Warp meshes, constraints, Vitruvian groups and projected shadows when needed.',
            'Every referenced ID must exist. Include provenance with any non-empty placeholder values; the server replaces it with actual call evidence.',
            patchesText(context)
          ].join('\n')
        });
        const blueprint = rigBlueprintV3Schema.parse({
          ...result.data,
          schemaVersion: '3.0',
          shotId: context.input.shotId,
          provenance: provenance(result)
        });
        const blueprintPath = writeJson(path.join(directory, 'rig-blueprint-v3.json'), blueprint);
        return {
          checkpoint: { blueprintPath, boneCount: blueprint.bones.length },
          artifacts: [artifact(blueprintPath, 'application/json', blueprint.provenance)],
          modelCalls: [modelCall(result)]
        };
      }
      case 'native_rig': {
        const artwork = readJson(checkpointPath(context, 'decomposition', 'artworkPackPath'), artworkPackV3Schema);
        const blueprint = readJson(checkpointPath(context, 'rig_blueprint', 'blueprintPath'), rigBlueprintV3Schema);
        const plan = compileMohoProductionPlanV3({
          artwork,
          blueprint,
          characterName: context.input.shotId,
          documentPath: path.join(directory, `${safeName(context.input.shotId)}.moho`)
        });
        const planPath = writeJson(path.join(directory, 'native-rig-command-plan.json'), plan);
        const result = await nativeBackend.buildAndRoundTrip({
          plan,
          outputDir: directory,
          startFrame: 1,
          endFrame: Math.max(1, context.input.durationFrames),
          fps: context.input.fps,
          width: context.input.width,
          height: context.input.height
        });
        return {
          checkpoint: {
            verified: true,
            freshProcessRoundTrip: result.freshProcessRoundTrip,
            mohoPath: result.roundtripMohoPath,
            commandPlanPath: planPath,
            sourceAudit: result.sourceAudit,
            roundtripAudit: result.roundtripAudit
          },
          artifacts: [
            artifact(result.roundtripMohoPath, 'application/x-moho-project', { kind: 'native_rig', nativeAcceptance: result.acceptance }),
            artifact(planPath, 'application/json', { kind: 'native_command_plan' }),
            artifact(result.luaPath, 'text/x-lua', { kind: 'native_build_lua' })
          ]
        };
      }
      case 'performance_plan': {
        const artwork = readJson(checkpointPath(context, 'decomposition', 'artworkPackPath'), artworkPackV3Schema);
        const blueprint = readJson(checkpointPath(context, 'rig_blueprint', 'blueprintPath'), rigBlueprintV3Schema);
        const alignments: ForcedAlignmentResultV3[] = [];
        for (const dialogue of context.input.dialogueTracks) {
          alignments.push(await aligner.align({ ...dialogue, fps: context.input.fps, workDir: path.join(directory, 'alignment') }));
        }
        const result = await planner.generateStructured({
          schemaName: 'moho_performance_plan_v3',
          schema: performancePlanV3Schema,
          system: 'You are a senior 2D acting animator. Produce complete, controller-valid Moho performance tracks with readable poses and continuity.',
          prompt: [
            `Create PerformancePlanV3 for ${context.input.durationFrames} frames at ${context.input.fps} fps. Brief: ${context.input.brief}`,
            `Artwork: ${JSON.stringify(artwork)}`,
            `Rig: ${JSON.stringify(blueprint)}`,
            `Forced alignments: ${JSON.stringify(alignments)}`,
            'Create separate pose, gaze, emotion, gesture, mouth, blink, secondary motion and interaction tracks for every character. Keep unknownControllers and interactionConflicts empty only when proven.',
            'Mouth cues must follow forced alignment with maximum drift of two frames. Include provenance placeholders.',
            patchesText(context)
          ].join('\n')
        });
        const performance = performancePlanV3Schema.parse({
          ...result.data,
          schemaVersion: '3.0',
          shotId: context.input.shotId,
          provenance: provenance(result)
        });
        if (performance.unknownControllers.length > 0) throw new StageExecutorError('INPUT_INVALID', `Unknown controllers: ${performance.unknownControllers.join(', ')}`);
        if (performance.interactionConflicts.length > 0) throw new StageExecutorError('INPUT_INVALID', `Interaction conflicts: ${performance.interactionConflicts.join(', ')}`);
        if (performance.continuityChecks.some(check => !check.passed)) throw new StageExecutorError('INPUT_INVALID', 'Performance plan contains continuity gaps.');
        validatePerformancePlan(performance, artwork, context.input.durationFrames, alignments);
        const performancePath = writeJson(path.join(directory, 'performance-plan-v3.json'), performance);
        const alignmentPath = writeJson(path.join(directory, 'forced-alignment-v3.json'), alignments);
        return {
          checkpoint: { performancePath, alignmentPath, lipsyncMaxDriftFrames: Math.max(0, ...alignments.map(item => item.maxQuantizationDriftFrames)) },
          artifacts: [
            artifact(performancePath, 'application/json', performance.provenance),
            artifact(alignmentPath, 'application/json', { kind: 'forced_alignment', engine: 'rhubarb' })
          ],
          modelCalls: [modelCall(result)]
        };
      }
      case 'key_pose_animatic': {
        const artwork = readJson(checkpointPath(context, 'decomposition', 'artworkPackPath'), artworkPackV3Schema);
        const blueprint = readJson(checkpointPath(context, 'rig_blueprint', 'blueprintPath'), rigBlueprintV3Schema);
        const performance = readJson(checkpointPath(context, 'performance_plan', 'performancePath'), performancePlanV3Schema);
        const plan = compileMohoProductionPlanV3({ artwork, blueprint, performance, characterName: context.input.shotId, documentPath: path.join(directory, 'animatic.moho') });
        const native = await nativeBackend.buildRoundTripAndRender({
          plan, outputDir: directory, startFrame: 1, endFrame: context.input.durationFrames,
          fps: context.input.fps, width: context.input.width, height: context.input.height
        });
        return {
          checkpoint: { animaticMp4Path: native.mp4Path, animaticMohoPath: native.roundtripMohoPath, verified: true },
          artifacts: [
            artifact(native.mp4Path, 'video/mp4', { kind: 'key_pose_animatic', ffprobe: native.probe }),
            artifact(native.roundtripMohoPath, 'application/x-moho-project', { kind: 'key_pose_animatic_project' })
          ]
        };
      }
      case 'final_animation': {
        const artwork = readJson(checkpointPath(context, 'decomposition', 'artworkPackPath'), artworkPackV3Schema);
        const blueprint = readJson(checkpointPath(context, 'rig_blueprint', 'blueprintPath'), rigBlueprintV3Schema);
        const approvedPerformance = readJson(checkpointPath(context, 'performance_plan', 'performancePath'), performancePlanV3Schema);
        const result = await planner.generateStructured({
          schemaName: 'moho_final_performance_v3',
          schema: performancePlanV3Schema,
          system: 'You are the final-pass Moho character animator. Preserve approved key poses and add production breakdowns, in-betweens, camera polish and secondary motion.',
          prompt: [
            `Expand the approved performance into final animation for ${context.input.durationFrames} frames.`,
            `Approved performance: ${JSON.stringify(approvedPerformance)}`,
            `Rig: ${JSON.stringify(blueprint)}`,
            'Do not alter approved key poses without an explicit director patch. Do not invent controller IDs. Maintain lip sync within two frames and all continuity checks passed. Include provenance placeholders.',
            patchesText(context)
          ].join('\n')
        });
        const finalPerformance = performancePlanV3Schema.parse({
          ...result.data,
          schemaVersion: '3.0', shotId: context.input.shotId, provenance: provenance(result)
        });
        const alignments = JSON.parse(fs.readFileSync(checkpointPath(context, 'performance_plan', 'alignmentPath'), 'utf8')) as ForcedAlignmentResultV3[];
        assertApprovedKeysPreserved(approvedPerformance, finalPerformance);
        validatePerformancePlan(finalPerformance, artwork, context.input.durationFrames, alignments);
        const plan = compileMohoProductionPlanV3({
          artwork, blueprint, performance: finalPerformance,
          characterName: context.input.shotId, documentPath: path.join(directory, `${safeName(context.input.shotId)}.moho`)
        });
        const performancePath = writeJson(path.join(directory, 'final-performance-v3.json'), finalPerformance);
        const commandPlanPath = writeJson(path.join(directory, 'final-command-plan.json'), plan);
        return {
          checkpoint: { finalPerformancePath: performancePath, commandPlanPath },
          artifacts: [
            artifact(performancePath, 'application/json', finalPerformance.provenance),
            artifact(commandPlanPath, 'application/json', { kind: 'final_native_command_plan' })
          ],
          modelCalls: [modelCall(result)]
        };
      }
      case 'native_render': {
        const plan = readJson(checkpointPath(context, 'final_animation', 'commandPlanPath'), mohoCommandPlanSchema) as MohoCommandPlan;
        const native = await nativeBackend.buildRoundTripAndRender({
          plan, outputDir: directory, startFrame: 1, endFrame: context.input.durationFrames,
          fps: context.input.fps, width: context.input.width, height: context.input.height
        });
        return {
          checkpoint: {
            verified: true,
            ffprobe: native.probe,
            mohoPath: native.roundtripMohoPath,
            mp4Path: native.mp4Path,
            sourceAudit: native.sourceAudit,
            roundtripAudit: native.roundtripAudit
          },
          artifacts: [
            artifact(native.roundtripMohoPath, 'application/x-moho-project', { kind: 'final_native_project', nativeAcceptance: native.acceptance }),
            artifact(native.mp4Path, 'video/mp4', { kind: 'final_native_render', ffprobe: native.probe })
          ]
        };
      }
      case 'qa': {
        const mp4Path = checkpointPath(context, 'native_render', 'mp4Path');
        const animaticPath = checkpointPath(context, 'key_pose_animatic', 'animaticMp4Path');
        const frames = await extractFrames(mp4Path, path.join(directory, 'frames'), context.input.durationFrames, context.input.fps);
        const animaticFrames = await extractFrames(animaticPath, path.join(directory, 'animatic-frames'), context.input.durationFrames, context.input.fps);
        const result = await artworkProvider.analyzeStructured({
          schemaName: 'moho_artistic_qa_v3',
          schema: artisticQaSchema,
          imagePaths: [...frames, ...animaticFrames],
          prompt: [
            'Perform strict final artistic QA for a Moho production shot.',
            `Brief: ${context.input.brief}`,
            `The first ${frames.length} images are final-render frames; the next ${animaticFrames.length} are matching approved-animatic frames.`,
            'Judge silhouette, palette, eye-line, pose readability, emotion and fidelity to the approved animatic. Any unproven criterion fails.'
          ].join('\n')
        });
        const nativeCheckpoint = context.previousCheckpoints.native_render;
        const technicalPassed = nativeCheckpoint?.verified === true
          && typeof nativeCheckpoint.mohoPath === 'string'
          && typeof nativeCheckpoint.mp4Path === 'string';
        const passed = technicalPassed && result.data.passed
          && result.data.silhouette && result.data.palette && result.data.eyeLine
          && result.data.poseReadability && result.data.emotion && result.data.matchesApprovedAnimatic
          && result.data.issues.length === 0;
        const report = { technicalPassed, artistic: result.data, passed, frames, animaticFrames, provenance: provenance(result) };
        const reportPath = writeJson(path.join(directory, 'qa-report-v3.json'), report);
        if (!passed) throw new StageExecutorError('QA_FAILED', `Final QA failed: ${result.data.issues.join('; ') || 'one or more required checks failed'}`);
        return {
          checkpoint: { passed: true, reportPath },
          artifacts: [artifact(reportPath, 'application/json', report.provenance)],
          modelCalls: [modelCall(result)]
        };
      }
      case 'delivery': {
        const sourceMoho = checkpointPath(context, 'native_render', 'mohoPath');
        const sourceMp4 = checkpointPath(context, 'native_render', 'mp4Path');
        if (context.previousCheckpoints.qa?.passed !== true) throw new StageExecutorError('QA_FAILED', 'Delivery is forbidden before passed QA.');
        const mohoPath = path.join(context.input.outputDir, `${safeName(context.input.shotId)}.moho`);
        const mp4Path = path.join(context.input.outputDir, `${safeName(context.input.shotId)}.mp4`);
        fs.copyFileSync(sourceMoho, mohoPath);
        fs.copyFileSync(sourceMp4, mp4Path);
        const manifest = {
          schemaVersion: '3.0', shotId: context.input.shotId,
          moho: { path: mohoPath, sha256: sha256File(mohoPath) },
          mp4: { path: mp4Path, sha256: sha256File(mp4Path) },
          technicalQa: checkpointPath(context, 'qa', 'reportPath')
        };
        const manifestPath = writeJson(path.join(directory, 'delivery-manifest-v3.json'), manifest);
        return {
          checkpoint: { mohoPath, mp4Path, manifestPath, verified: true },
          artifacts: [
            artifact(mohoPath, 'application/x-moho-project', { kind: 'delivery', sha256: manifest.moho.sha256 }),
            artifact(mp4Path, 'video/mp4', { kind: 'delivery', sha256: manifest.mp4.sha256 }),
            artifact(manifestPath, 'application/json', { kind: 'delivery_manifest' })
          ]
        };
      }
      default: {
        const exhaustive: never = context.stage;
        return exhaustive;
      }
    }
  };
}

export type { MohoNativeBuildResult, MohoNativeRenderResult };
