import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { MohoCommandPlan } from '../../schemas/mohoCommandPlan.js';
import type { MohoProductionV3ErrorCode } from '../../schemas/mohoProductionV3.js';
import { MohoRenderManager } from '../mohoRenderManager/index.js';
import { MohoRenderMetrics, type MohoProbeRenderResult } from '../mohoRenderMetrics/index.js';
import { MohoRenderRunner, type MohoProcessResult } from '../mohoRenderRunner/index.js';
import { MohoProductionQualityAuditor } from '../mohoProductionQualityAuditor/index.js';

const execFileAsync = promisify(execFile) as (
  executable: string,
  args: string[],
  options: { timeout: number; maxBuffer: number }
) => Promise<{ stdout: string; stderr: string }>;

export interface NativeAcceptanceEvidence {
  opened: boolean;
  saved: boolean;
  reopened: boolean;
  rendered_frames: string[];
  preview_frames: string[];
  render_status: string;
  errors: string[];
  stdout: string;
  stderr: string;
  roundtrip_path: string;
}

export interface NativeProjectAudit {
  projectPath: string;
  productionReady: boolean;
  errors: string[];
  totalBones?: number;
  totalLayers?: number;
}

export type NativeExecuteFile = (
  executable: string,
  args: string[],
  options: { timeout: number; maxBuffer: number }
) => Promise<MohoProcessResult>;

export interface MohoNativeProductionBackendDependencies {
  detectMohoExecutable?: () => string | null;
  executeFile?: NativeExecuteFile;
  runNativeAcceptance?: (projectPath: string, evidenceDir: string, frames: number[]) => Promise<NativeAcceptanceEvidence>;
  probeRender?: (outputPath: string, expectedFps: number, expectedDurationSec: number) => Promise<MohoProbeRenderResult>;
  auditProject?: (projectPath: string) => NativeProjectAudit;
}

export interface MohoNativeBuildInput {
  plan: MohoCommandPlan;
  outputDir: string;
  startFrame: number;
  endFrame: number;
  fps: number;
  width: number;
  height: number;
  timeoutMs?: number;
}

export interface MohoNativeBuildResult {
  sourceMohoPath: string;
  roundtripMohoPath: string;
  luaPath: string;
  freshProcessRoundTrip: true;
  sourceAudit: NativeProjectAudit;
  roundtripAudit: NativeProjectAudit;
  acceptance: NativeAcceptanceEvidence;
}

export interface MohoNativeRenderResult extends MohoNativeBuildResult {
  mp4Path: string;
  probe: MohoProbeRenderResult;
  verified: true;
}

export class ProductionNativeError extends Error {
  public constructor(public readonly code: MohoProductionV3ErrorCode, message: string) {
    super(message);
    this.name = 'ProductionNativeError';
  }
}

function resolveNativeAcceptanceScript(): string {
  const candidates = [
    path.resolve(process.cwd(), 'pipeline/tools/moho_native_acceptance.py'),
    path.resolve(path.dirname(process.argv[1] ?? process.cwd()), '../pipeline/tools/moho_native_acceptance.py')
  ];
  const found = candidates.find(candidate => fs.existsSync(candidate));
  if (!found) throw new ProductionNativeError('UNSUPPORTED', 'Native acceptance helper is missing.');
  return found;
}

function combinedError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const processError = error as Error & { stdout?: string | Buffer; stderr?: string | Buffer };
  return [processError.message, processError.stdout, processError.stderr]
    .filter(value => value !== undefined && String(value).trim().length > 0)
    .map(String)
    .join('\n');
}

function classifyProcessFailure(error: unknown, fallback: MohoProductionV3ErrorCode): ProductionNativeError {
  const details = combinedError(error);
  const processError = error as NodeJS.ErrnoException & { killed?: boolean; signal?: string };
  if (processError.code === 'ETIMEDOUT' || processError.killed || /timed out|timeout/i.test(details)) {
    return new ProductionNativeError('MOHO_TIMEOUT', details);
  }
  if (/Pro level feature|command-line renderer.*Pro|must upgrade/i.test(details)) {
    return new ProductionNativeError('MOHO_PRO_REQUIRED', details);
  }
  return new ProductionNativeError(fallback, details);
}

function assertNonemptyFile(filePath: string, code: MohoProductionV3ErrorCode, label: string): void {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile() || fs.statSync(filePath).size === 0) {
    throw new ProductionNativeError(code, `${label} is missing or empty: ${filePath}`);
  }
}

export class MohoNativeProductionBackend {
  private readonly detectMohoExecutable: () => string | null;
  private readonly executeFile: NativeExecuteFile;
  private readonly runNativeAcceptance: NonNullable<MohoNativeProductionBackendDependencies['runNativeAcceptance']>;
  private readonly probeRender: NonNullable<MohoNativeProductionBackendDependencies['probeRender']>;
  private readonly auditProject: NonNullable<MohoNativeProductionBackendDependencies['auditProject']>;

  public constructor(dependencies: MohoNativeProductionBackendDependencies = {}) {
    this.detectMohoExecutable = dependencies.detectMohoExecutable ?? MohoRenderManager.detectMohoExecutable;
    this.executeFile = dependencies.executeFile ?? (async (executable, args, options) => {
      const result = await execFileAsync(executable, args, options);
      return { stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
    });
    this.runNativeAcceptance = dependencies.runNativeAcceptance ?? this.defaultNativeAcceptance;
    this.probeRender = dependencies.probeRender ?? MohoRenderMetrics.probeRender;
    this.auditProject = dependencies.auditProject ?? (projectPath => {
      const report = MohoProductionQualityAuditor.auditAndFixMohoFile(projectPath, false);
      return {
        projectPath,
        productionReady: report.isProductionReady,
        errors: report.issues.filter(issue => issue.severity === 'error').map(issue => `${issue.ruleId}: ${issue.description}`),
        totalBones: report.totalBones,
        totalLayers: report.totalLayers
      };
    });
  }

  private readonly defaultNativeAcceptance = async (
    projectPath: string,
    evidenceDir: string,
    frames: number[]
  ): Promise<NativeAcceptanceEvidence> => {
    const python = process.env.MOHO_PYTHON_BIN ?? process.env.PYTHON_BIN ?? 'python3';
    try {
      const result = await execFileAsync(python, [
        resolveNativeAcceptanceScript(),
        '--project', projectPath,
        '--evidence-dir', evidenceDir,
        '--frames', ...frames.map(String)
      ], { timeout: 180_000, maxBuffer: 32 * 1024 * 1024 });
      const parsed = JSON.parse(result.stdout) as NativeAcceptanceEvidence & { fatal_error?: string; message?: string };
      if (parsed.fatal_error === 'MOHO_NOT_FOUND') throw new ProductionNativeError('MOHO_NOT_FOUND', parsed.message ?? 'Moho not found.');
      if (parsed.fatal_error) throw new ProductionNativeError('RIG_NATIVE_FAILED', parsed.message ?? parsed.fatal_error);
      return parsed;
    } catch (error) {
      if (error instanceof ProductionNativeError) throw error;
      const details = combinedError(error);
      const jsonLine = details.split(/\r?\n/).find(line => line.trim().startsWith('{'));
      if (jsonLine) {
        try {
          const parsed = JSON.parse(jsonLine) as { fatal_error?: string; message?: string };
          if (parsed.fatal_error === 'MOHO_NOT_FOUND') {
            throw new ProductionNativeError('MOHO_NOT_FOUND', parsed.message ?? details);
          }
        } catch (parseError) {
          if (parseError instanceof ProductionNativeError) throw parseError;
        }
      }
      throw classifyProcessFailure(error, 'RIG_NATIVE_FAILED');
    }
  };

  private async assertCommandLineRenderLicense(executable: string, outputDir: string): Promise<void> {
    const missingProject = path.join(outputDir, '.moho-v3-license-probe-does-not-exist.moho');
    const probeOutput = path.join(outputDir, '.moho-v3-license-probe.png');
    try {
      const result = await this.executeFile(executable, [
        '-r', missingProject,
        '-start', '1',
        '-end', '1',
        '-f', 'PNG',
        '-o', probeOutput
      ], { timeout: 15_000, maxBuffer: 1024 * 1024 });
      const details = `${result.stdout}\n${result.stderr}`;
      if (/Pro level feature|command-line renderer.*Pro|must upgrade/i.test(details)) {
        throw new ProductionNativeError('MOHO_PRO_REQUIRED', details.trim());
      }
    } catch (error) {
      if (error instanceof ProductionNativeError) throw error;
      const details = combinedError(error);
      if (/Pro level feature|command-line renderer.*Pro|must upgrade/i.test(details)) {
        throw new ProductionNativeError('MOHO_PRO_REQUIRED', details);
      }
      // A Pro installation is expected to reject the deliberately missing
      // project. Only an explicit license message blocks the real build.
    }
  }

  public async buildAndRoundTrip(input: MohoNativeBuildInput): Promise<MohoNativeBuildResult> {
    const executable = this.detectMohoExecutable();
    if (!executable) throw new ProductionNativeError('MOHO_NOT_FOUND', 'Moho Pro executable was not detected.');
    if (input.endFrame < input.startFrame) throw new ProductionNativeError('INPUT_INVALID', 'endFrame must be greater than or equal to startFrame.');
    fs.mkdirSync(input.outputDir, { recursive: true });
    await this.assertCommandLineRenderLicense(executable, input.outputDir);
    const sourceMohoPath = path.resolve(input.outputDir, `${input.plan.planId}.moho`);
    const buildPlan: MohoCommandPlan = {
      ...input.plan,
      documentPath: sourceMohoPath,
      operations: input.plan.operations.map(operation => operation.type === 'save_document'
        ? { ...operation, params: { ...operation.params, documentPath: sourceMohoPath } }
        : operation)
    };
    const { luaPath } = MohoRenderRunner.emitAndSaveLua(buildPlan, input.outputDir);
    const timeout = input.timeoutMs ?? 600_000;
    let buildProcess: MohoProcessResult;
    try {
      buildProcess = await this.executeFile(executable, [luaPath], { timeout, maxBuffer: 32 * 1024 * 1024 });
    } catch (error) {
      throw classifyProcessFailure(error, 'LUA_FAILED');
    }
    const buildEvidence = `${buildProcess.stdout}\n${buildProcess.stderr}`;
    const failedLines = buildEvidence.split(/\r?\n/).filter(line => line.includes('[FAIL]') || /\[SUMMARY\].*failed=[1-9]\d*/i.test(line));
    if (failedLines.length > 0) throw new ProductionNativeError('LUA_FAILED', failedLines.join(' | '));
    assertNonemptyFile(sourceMohoPath, 'LUA_FAILED', 'Built .moho document');

    const sourceAudit = this.auditProject(sourceMohoPath);
    if (!sourceAudit.productionReady || sourceAudit.errors.length > 0) {
      throw new ProductionNativeError('RIG_NATIVE_FAILED', `Source project audit failed: ${sourceAudit.errors.join('; ')}`);
    }

    const evidenceDir = path.join(input.outputDir, 'native_acceptance');
    const diagnosticFrames = Array.from(new Set([input.startFrame, Math.floor((input.startFrame + input.endFrame) / 2), input.endFrame]));
    const acceptance = await this.runNativeAcceptance(sourceMohoPath, evidenceDir, diagnosticFrames);
    if (acceptance.render_status === 'requires_moho_pro') {
      throw new ProductionNativeError('MOHO_PRO_REQUIRED', acceptance.errors.join('; ') || 'Native renderer requires Moho Pro.');
    }
    if (!acceptance.opened || !acceptance.saved || !acceptance.reopened || acceptance.errors.length > 0) {
      const details = `${acceptance.errors.join('; ')}\n${acceptance.stderr}`;
      if (/timed out|timeout/i.test(details)) throw new ProductionNativeError('MOHO_TIMEOUT', details);
      throw new ProductionNativeError('RIG_NATIVE_FAILED', details || 'Fresh-process open/save/reopen failed.');
    }
    assertNonemptyFile(acceptance.roundtrip_path, 'RIG_NATIVE_FAILED', 'Round-trip .moho document');
    const roundtripAudit = this.auditProject(acceptance.roundtrip_path);
    if (!roundtripAudit.productionReady || roundtripAudit.errors.length > 0) {
      throw new ProductionNativeError('RIG_NATIVE_FAILED', `Round-trip project audit failed: ${roundtripAudit.errors.join('; ')}`);
    }
    const expectedBones = input.plan.operations.filter(operation => operation.type === 'add_bone').length;
    const expectedCreatedLayers = input.plan.operations.filter(operation => [
      'import_image_layer',
      'create_switch_layer',
      'create_vector_layer',
      'create_mesh_layer',
      'create_projected_shadow'
    ].includes(operation.type)).length + 1;
    if (sourceAudit.totalBones !== undefined && sourceAudit.totalBones < expectedBones) {
      throw new ProductionNativeError('RIG_NATIVE_FAILED', `Native blueprint comparison failed: ${sourceAudit.totalBones} bones saved, expected at least ${expectedBones}.`);
    }
    if (roundtripAudit.totalBones !== undefined && roundtripAudit.totalBones !== sourceAudit.totalBones) {
      throw new ProductionNativeError('RIG_NATIVE_FAILED', `Bone structure changed after reopen: ${String(sourceAudit.totalBones)} -> ${roundtripAudit.totalBones}.`);
    }
    if (sourceAudit.totalLayers !== undefined && sourceAudit.totalLayers < expectedCreatedLayers) {
      throw new ProductionNativeError('RIG_NATIVE_FAILED', `Native blueprint comparison failed: ${sourceAudit.totalLayers} layers saved, expected at least ${expectedCreatedLayers}.`);
    }
    if (roundtripAudit.totalLayers !== undefined && roundtripAudit.totalLayers !== sourceAudit.totalLayers) {
      throw new ProductionNativeError('RIG_NATIVE_FAILED', `Layer structure changed after reopen: ${String(sourceAudit.totalLayers)} -> ${roundtripAudit.totalLayers}.`);
    }

    return {
      sourceMohoPath,
      roundtripMohoPath: acceptance.roundtrip_path,
      luaPath,
      freshProcessRoundTrip: true,
      sourceAudit,
      roundtripAudit,
      acceptance
    };
  }

  public async buildRoundTripAndRender(input: MohoNativeBuildInput): Promise<MohoNativeRenderResult> {
    const built = await this.buildAndRoundTrip(input);
    const executable = this.detectMohoExecutable();
    if (!executable) throw new ProductionNativeError('MOHO_NOT_FOUND', 'Moho Pro executable disappeared before render.');
    const mp4Path = path.resolve(input.outputDir, `render_${input.plan.planId}.mp4`);
    try {
      await this.executeFile(executable, [
        '-r', built.roundtripMohoPath,
        '-start', String(input.startFrame),
        '-end', String(input.endFrame),
        '-f', 'MP4',
        '-o', mp4Path,
        '-w', String(input.width),
        '-h', String(input.height),
        '-aa'
      ], { timeout: input.timeoutMs ?? 600_000, maxBuffer: 32 * 1024 * 1024 });
    } catch (error) {
      throw classifyProcessFailure(error, 'RENDER_FAILED');
    }
    assertNonemptyFile(mp4Path, 'RENDER_FAILED', 'Rendered MP4');
    const expectedDuration = (input.endFrame - input.startFrame + 1) / input.fps;
    let probe: MohoProbeRenderResult;
    try {
      probe = await this.probeRender(mp4Path, input.fps, expectedDuration);
    } catch (error) {
      throw new ProductionNativeError('RENDER_FAILED', combinedError(error));
    }
    const resolutionMatches = probe.resolution.width === input.width && probe.resolution.height === input.height;
    const codecMatches = probe.codec.toLowerCase() === 'h264';
    if (!probe.matches.fps || !probe.matches.duration || !resolutionMatches || !codecMatches) {
      const issues = [
        ...probe.issues,
        ...(resolutionMatches ? [] : [`resolution mismatch: ${probe.resolution.width}x${probe.resolution.height}, expected ${input.width}x${input.height}`]),
        ...(codecMatches ? [] : [`codec mismatch: ${probe.codec}, expected h264`])
      ];
      throw new ProductionNativeError('RENDER_FAILED', issues.join('; '));
    }
    return { ...built, mp4Path, probe, verified: true };
  }
}
