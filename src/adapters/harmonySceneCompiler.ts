import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { HarmonyPython } from './harmonyPython.js';
import { ReconstructionClient } from './reconstructionClient.js';
import { HarmonyError, verifyPathAccess } from '../security.js';
import { config } from '../config.js';
import {
  reconstructionManifestSchema,
  harmonyCommandPlanSchema,
  type HarmonyReconstructionManifest,
  type HarmonyCommandPlan
} from '../schemas/reconstruction.js';

export interface CompileOptions {
  targetProjectPath: string;
  outputProjectPath: string;
  dryRun: boolean;
}

export class HarmonySceneCompiler {
  constructor(private readonly comparisonClient: Pick<ReconstructionClient, 'compareRender'> = new ReconstructionClient()) {}

  async compile(rawManifest: unknown, options: CompileOptions) {
    const parsed = reconstructionManifestSchema.safeParse(rawManifest);
    if (!parsed.success) {
      throw new HarmonyError('INVALID_RECONSTRUCTION_MANIFEST', 'Манифест не прошёл проверку перед изменением сцены.', parsed.error.flatten());
    }
    const manifest = parsed.data;
    
    // Генерируем и валидируем промежуточный HarmonyCommandPlan
    const plan = this.generateCommandPlan(manifest);
    const parsedPlan = harmonyCommandPlanSchema.safeParse(plan);
    if (!parsedPlan.success) {
      throw new HarmonyError('INVALID_RECONSTRUCTION_MANIFEST', 'Сгенерированный план команд не прошёл Zod-валидацию.', parsedPlan.error.flatten());
    }

    const target = verifyPathAccess(options.targetProjectPath);
    const output = verifyPathAccess(options.outputProjectPath);
    if (path.extname(target).toLowerCase() !== '.xstage' || path.extname(output).toLowerCase() !== '.xstage') {
      throw new HarmonyError('INVALID_HARMONY_OBJECT', 'Входной и выходной проекты должны иметь расширение .xstage.');
    }
    if (path.resolve(target) === path.resolve(output)) {
      throw new HarmonyError('PATH_TRAVERSAL_BLOCKED', 'Исходная сцена не может быть изменена напрямую. Укажите отдельный outputProjectPath.');
    }
    if (options.dryRun) return this.dryRunReport(manifest, target, output);
    if (!fs.existsSync(target)) throw new HarmonyError('SCENE_NOT_FOUND', `Сцена не найдена: ${target}`);

    const prepared = this.prepareTransactionalCopy(target, output, manifest.manifestId);
    
    // Сохраняем план команд в выходной директории для портативности (Task 10)
    fs.writeFileSync(path.join(path.dirname(output), 'command_plan.json'), JSON.stringify(plan, null, 2));

    try {
      // Выполняем детерминированный план команд в Harmony (Task 8)
      const applyResult = await HarmonyPython.runCommand('execute_command_plan', {
        projectPath: output,
        plan
      }, config.reconstruction.requestTimeoutMs);
      
      if (applyResult.status !== 'success' || applyResult.saved !== true) {
        throw new HarmonyError('HARMONY_SCENE_VERIFICATION_FAILED', 'Harmony не подтвердила сохранение сцены после применения плана команд.', applyResult);
      }

      const auditResult = await HarmonyPython.runCommand('audit_reconstruction_scene', {
        projectPath: output,
        manifest
      }, config.reconstruction.requestTimeoutMs);
      const audit = auditResult.nativeAudit;
      const verified = auditResult.status === 'success'
        && auditResult.verified === true
        && auditResult.reopenedFromDisk === true
        && audit?.elementCount === manifest.elements.length
        && audit?.vectorType === 'TVG'
        && audit?.drawingCount === manifest.drawings.length
        && audit?.nonemptyDrawingCount === manifest.drawings.length
        && audit?.exposureFrameCount === manifest.source.frameCount
        && audit?.exposureTimingMatches === true
        && audit?.repeatedDrawingsReused === true
        && audit?.paletteColorCount === manifest.palettes[0].colors.length
        && audit?.paletteLinked === true
        && audit?.nodeExists === true
        && audit?.displayExists === true
        && audit?.writeExists === true
        && audit?.editableVectorGeometry === true;
      if (!verified) {
        throw new HarmonyError('HARMONY_SCENE_VERIFICATION_FAILED', 'Повторно открытая сцена не прошла аудит нативных drawings, палитры и exposures.', auditResult);
      }

      const previewDirectory = path.join(path.dirname(output), 'reconstruction-preview');
      const previewEndFrame = Math.min(3, manifest.source.frameCount);
      const renderResult = await HarmonyPython.runCommand('render_reconstruction_preview', {
        projectPath: output,
        manifest,
        outputDirectory: previewDirectory,
        startFrame: 1,
        endFrame: previewEndFrame
      }, config.reconstruction.requestTimeoutMs);
      const previewPaths = Array.isArray(renderResult.previewPaths) ? renderResult.previewPaths.map(String) : [];
      if (renderResult.status !== 'success' || renderResult.rendered !== true || previewPaths.length !== previewEndFrame) {
        throw new HarmonyError('RENDER_FAILED', 'Harmony не создала ожидаемый preview render.', renderResult);
      }
      for (const previewPath of previewPaths) {
        this.verifyPng(previewPath);
      }
      const pairs = previewPaths.map((renderPath, index) => ({
        frame: index + 1,
        sourcePath: this.sourceDrawingForFrame(manifest, index + 1).normalizedImagePath,
        renderPath
      }));
      const comparison = await this.comparisonClient.compareRender(pairs);
      if (comparison.status !== 'success' || comparison.allImagesReadable !== true || comparison.allSizesMatch !== true) {
        throw new HarmonyError('RENDER_FAILED', 'Preview render создан, но не прошёл базовую проверку размеров и чтения.', comparison);
      }
      return {
        status: 'success',
        execution: 'real',
        realSceneCreated: true,
        editableNativeDrawings: true,
        outputProjectPath: output,
        manifestId: manifest.manifestId,
        nativeAudit: audit,
        backupPath: prepared.backupPath,
        previewPaths,
        renderComparison: comparison
      };
    } catch (error) {
      const outputDir = path.dirname(output);
      if (prepared.createdOutputDirectory) {
        fs.rmSync(outputDir, { recursive: true, force: true });
      } else if (fs.existsSync(outputDir)) {
        for (const entry of fs.readdirSync(outputDir)) {
          fs.rmSync(path.join(outputDir, entry), { recursive: true, force: true });
        }
      }
      throw error;
    }
  }

  generateCommandPlan(manifest: HarmonyReconstructionManifest): HarmonyCommandPlan {
    const commands: Array<{ type: HarmonyCommandPlan['commands'][number]['type']; params: Record<string, any> }> = [];

    // 1. Создание палитры
    const palette = manifest.palettes[0];
    const paletteName = `${manifest.scene.name}_Palette`;
    commands.push({
      type: 'create_palette',
      params: { paletteName }
    });

    // 2. Добавление цветов в палитру
    for (const color of palette.colors) {
      commands.push({
        type: 'add_palette_swatch',
        params: {
          paletteName,
          colorId: color.id,
          colorName: color.name,
          rgba: color.rgba
        }
      });
    }

    // 3. Создание Drawing Element (READ node / column)
    const element = manifest.elements[0];
    const columnName = `${element.name}_COLUMN`;
    commands.push({
      type: 'create_drawing_element',
      params: {
        elementName: element.name,
        columnName,
        nodeName: element.nodeName
      }
    });

    // 4. Создание рисунков и геометрии
    const drawingNamesById = new Map<string, string>();
    for (const drawing of manifest.drawings) {
      commands.push({
        type: 'create_drawing',
        params: {
          drawingName: drawing.name,
          columnName
        }
      });
      drawingNamesById.set(drawing.id, drawing.name);

      // Геометрия
      const useLineArt = manifest.diagnostics?.capability?.lineArt ?? false;
      for (const shape of drawing.shapes) {
        commands.push({
          type: 'write_path',
          params: {
            drawingName: drawing.name,
            columnName,
            pathPoints: shape.points.map(p => ({ x: p.x, y: p.y })),
            colorId: shape.colorId,
            side: 'right', // side dynamically resolved based on winding in python
            artLayer: useLineArt ? 'line' : 'colour',
            width: manifest.scene.width,
            height: manifest.scene.height
          }
        });
      }
    }

    // 5. Exposures
    for (const exp of manifest.exposures) {
      const drawingName = drawingNamesById.get(exp.drawingId);
      if (!drawingName) {
        throw new Error(`Drawing ID ${exp.drawingId} not found during plan generation.`);
      }
      commands.push({
        type: 'set_exposure',
        params: {
          frame: exp.frame,
          duration: exp.duration,
          drawingName,
          columnName
        }
      });
    }

    // 6. Создание остальных нод
    const baseName = manifest.scene.name;
    commands.push({
      type: 'create_node',
      params: { nodeType: 'COMPOSITE', nodeName: `${baseName}_COMPOSITE` }
    });
    commands.push({
      type: 'create_node',
      params: { nodeType: 'DISPLAY', nodeName: `${baseName}_DISPLAY` }
    });
    commands.push({
      type: 'create_node',
      params: { nodeType: 'WRITE', nodeName: `${baseName}_WRITE` }
    });

    // 7. Соединение портов нод
    const nodeNamesById = new Map<string, string>();
    nodeNamesById.set('node_read', element.nodeName);
    nodeNamesById.set('node_composite', `${baseName}_COMPOSITE`);
    nodeNamesById.set('node_display', `${baseName}_DISPLAY`);
    nodeNamesById.set('node_write', `${baseName}_WRITE`);

    for (const conn of manifest.connections) {
      const fromNode = nodeNamesById.get(conn.from) ?? conn.from;
      const toNode = nodeNamesById.get(conn.to) ?? conn.to;
      commands.push({
        type: 'connect_nodes',
        params: {
          fromNode,
          toNode,
          fromPort: conn.fromPort,
          toPort: conn.toPort
        }
      });
    }

    // Соединение WRITE ноды с композитом
    commands.push({
      type: 'connect_nodes',
      params: {
        fromNode: `${baseName}_COMPOSITE`,
        toNode: `${baseName}_WRITE`,
        fromPort: 0,
        toPort: 0
      }
    });

    // 8. Сохранение
    commands.push({
      type: 'save_project',
      params: {
        frameCount: manifest.source.frameCount,
        fps: manifest.scene.fps
      }
    });

    const planId = crypto.createHash('sha1').update(JSON.stringify(commands) + manifest.manifestId).digest('hex').slice(0, 24);

    return {
      planId,
      manifestId: manifest.manifestId,
      commands
    };
  }

  private dryRunReport(manifest: HarmonyReconstructionManifest, target: string, output: string) {
    return {
      status: 'validated',
      execution: 'dry_run',
      realSceneCreated: false,
      editableNativeDrawings: false,
      targetProjectPath: target,
      outputProjectPath: output,
      manifestId: manifest.manifestId,
      planned: {
        drawingElements: manifest.elements.length,
        drawings: manifest.drawings.length,
        paletteColors: manifest.palettes.flatMap(p => p.colors).length,
        exposureFrames: manifest.source.frameCount
      },
      note: 'Манифест валиден, но Harmony не изменялась.'
    };
  }

  private prepareTransactionalCopy(source: string, output: string, manifestId: string) {
    const outputDir = path.dirname(output);
    const createdOutputDirectory = !fs.existsSync(outputDir);
    if (fs.existsSync(outputDir) && fs.readdirSync(outputDir).length > 0) {
      throw new HarmonyError('INVALID_HARMONY_OBJECT', `Выходной каталог уже существует и не пуст: ${outputDir}`);
    }
    fs.mkdirSync(outputDir, { recursive: true });
    fs.copyFileSync(source, output);
    const sourceDir = path.dirname(source);
    for (const folder of ['elements', 'palette-library', 'audio']) {
      const from = path.join(sourceDir, folder);
      if (fs.existsSync(from)) fs.cpSync(from, path.join(outputDir, folder), { recursive: true, errorOnExist: true });
    }
    const backupPath = `${output}.before-reconstruction-${crypto.createHash('sha1').update(manifestId).digest('hex').slice(0, 8)}`;
    fs.copyFileSync(output, backupPath);
    return { backupPath, createdOutputDirectory };
  }

  private sourceDrawingForFrame(manifest: HarmonyReconstructionManifest, frame: number) {
    const exposure = manifest.exposures.find(item => frame >= item.frame && frame < item.frame + item.duration);
    const drawing = exposure && manifest.drawings.find(item => item.id === exposure.drawingId);
    if (!drawing) {
      throw new HarmonyError('INVALID_RECONSTRUCTION_MANIFEST', `Не найден source drawing для кадра ${frame}.`);
    }
    return drawing;
  }

  private verifyPng(filePath: string) {
    const checked = verifyPathAccess(filePath);
    if (!fs.existsSync(checked) || !fs.statSync(checked).isFile()) {
      throw new HarmonyError('RENDER_FAILED', `Preview render отсутствует: ${checked}`);
    }
    const signature = fs.readFileSync(checked).subarray(0, 8);
    if (!signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      throw new HarmonyError('RENDER_FAILED', `Файл preview не является PNG: ${checked}`);
    }
  }
}
