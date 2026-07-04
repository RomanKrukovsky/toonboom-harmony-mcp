import fs from 'fs';
import path from 'path';
import { config } from '../../config.js';
import { HarmonyPython } from '../harmonyPython.js';
import { RenderOutputValidator } from '../renderValidator/index.js';

export interface RealSceneExecutionResult {
  ok: boolean;
  mode: 'real' | 'hybrid' | 'simulation';
  isRealHarmonyExecution: boolean;
  sceneName: string;
  createdFiles: string[];
  performedSteps: string[];
  skippedSteps: string[];
  warnings: string[];
  requiresHuman: boolean;
  assetsImported: string[];
  nodesCreated: string[];
  connectionsCreated: string[];
  keyframesCreated: any[];
  preview: {
    rendered: boolean;
    path: string;
    fileExists: boolean;
    fileSizeBytes: number;
    simulatedPreviewCreated?: boolean;
    isValidVideoFile?: boolean;
    truth?: string;
    reason?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export class RealSceneExecutor {
  // 1x1 transparent PNG hex
  private static MINIMAL_PNG_HEX = '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082';

  private ensurePlaceholderAssets(outputDir: string): { characterPath: string; backgroundPath: string } {
    const assetsDir = path.join(outputDir, 'episode_package', 'assets', 'placeholders');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

    const characterPath = path.join(assetsDir, 'character_placeholder.png');
    const backgroundPath = path.join(assetsDir, 'background_placeholder.png');

    const pngBuffer = Buffer.from(RealSceneExecutor.MINIMAL_PNG_HEX, 'hex');

    if (!fs.existsSync(characterPath)) {
      fs.writeFileSync(characterPath, pngBuffer);
    }
    if (!fs.existsSync(backgroundPath)) {
      fs.writeFileSync(backgroundPath, pngBuffer);
    }

    return { characterPath, backgroundPath };
  }

  async executeScenePlan(
    scenePlan: any,
    options: { mode?: 'real' | 'hybrid' | 'simulation'; projectPath?: string; outputDir?: string } = {}
  ): Promise<RealSceneExecutionResult> {
    const mode = options.mode ?? config.engineMode;
    const sceneName = scenePlan.sceneName || scenePlan.sceneId || 'SC_001';
    const duration = scenePlan.durationFrames || 144;
    const fps = scenePlan.fps || 24;

    const outputDir = options.outputDir || path.join(process.cwd(), 'output');
    const pkgDir = path.join(outputDir, 'episode_package');
    
    // Ensure placeholders exist
    const placeholders = this.ensurePlaceholderAssets(outputDir);

    // 1. Check if asset file is missing
    let bgFile = scenePlan.background?.file || 'background_placeholder.png';
    let resolvedBgPath = path.isAbsolute(bgFile) ? bgFile : path.join(outputDir, bgFile);
    const isPlaceholder = bgFile === 'background_placeholder.png' || bgFile.includes('placeholders');

    if (!isPlaceholder && !fs.existsSync(resolvedBgPath)) {
      const fallbackPath = 'episode_package/assets/placeholders/background_placeholder.png';
      const res: RealSceneExecutionResult = {
        ok: false,
        mode: mode as any,
        isRealHarmonyExecution: false,
        sceneName,
        createdFiles: [],
        performedSteps: [],
        skippedSteps: [
          'open_project',
          'create_composite_display_write_chain',
          'import_background_image',
          'import_character_placeholder',
          'set_node_position',
          'set_node_scale',
          'create_camera_move',
          'save_scene',
          'render_preview'
        ],
        warnings: [`Background asset is missing: "${bgFile}".`],
        requiresHuman: true,
        assetsImported: [],
        nodesCreated: [],
        connectionsCreated: [],
        keyframesCreated: [],
        preview: {
          rendered: false,
          path: '',
          fileExists: false,
          fileSizeBytes: 0,
          reason: 'Asset missing'
        },
        error: {
          code: 'ASSET_MISSING',
          message: `Asset missing: "${bgFile}". Suggested fallback: "${fallbackPath}"`
        }
      };

      // Write execution report even if it failed due to missing asset
      const reportsDir = path.join(pkgDir, 'review_reports');
      if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
      fs.writeFileSync(
        path.join(reportsDir, `${sceneName}_execution_report.json`),
        JSON.stringify(res, null, 2),
        'utf8'
      );

      return res;
    }

    // Check Harmony availability
    const isHarmonyAvailable = !!config.harmonyBin;

    if (mode === 'simulation' || !isHarmonyAvailable) {
      // Simulation Path
      const assetsImported: string[] = [];
      const nodesCreated = ['Composite', 'Display', 'Write', 'BG_Placeholder', 'Char_Placeholder', 'Char_Peg', 'Camera'];
      const connectionsCreated = [
        'BG_Placeholder -> Composite',
        'Char_Peg -> Char_Placeholder',
        'Char_Placeholder -> Composite',
        'Composite -> Display',
        'Composite -> Write'
      ];
      const keyframesCreated = [
        { node: 'Camera', frame: 1, attr: 'position.z', value: 12 },
        { node: 'Camera', frame: duration, attr: 'position.z', value: 10 }
      ];

      assetsImported.push(path.basename(bgFile));
      assetsImported.push('character_placeholder.png (simulated)');

      const previewPath = path.join(pkgDir, 'previews', `${sceneName}_preview.mp4`);
      
      if (!fs.existsSync(path.dirname(previewPath))) {
        fs.mkdirSync(path.dirname(previewPath), { recursive: true });
      }
      fs.writeFileSync(previewPath, 'SIMULATED_VIDEO_STREAM_PLACEHOLDER');

      const res: RealSceneExecutionResult = {
        ok: mode === 'simulation',
        mode: 'simulation',
        isRealHarmonyExecution: false,
        sceneName,
        createdFiles: [previewPath],
        performedSteps: [
          'open_project',
          'create_composite_display_write_chain',
          'import_background_image',
          'import_character_placeholder',
          'set_node_position',
          'set_node_scale',
          'create_camera_move',
          'save_scene',
          'render_preview'
        ],
        skippedSteps: [],
        warnings: ['Running in simulation fallback mode.'],
        requiresHuman: false,
        assetsImported,
        nodesCreated,
        connectionsCreated,
        keyframesCreated,
        preview: {
          rendered: false, // simulation preview is not considered real rendered preview
          path: previewPath,
          fileExists: true,
          fileSizeBytes: 33,
          simulatedPreviewCreated: true,
          isValidVideoFile: false,
          truth: 'This is not a real rendered video. It is a simulation placeholder.'
        }
      };

      if (mode !== 'simulation') {
        res.error = {
          code: 'HARMONY_NOT_AVAILABLE',
          message: 'Real Toon Boom Harmony execution requires configured Harmony installation'
        };
      }

      // Write execution report
      const reportsDir = path.join(pkgDir, 'review_reports');
      if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
      fs.writeFileSync(
        path.join(reportsDir, `${sceneName}_execution_report.json`),
        JSON.stringify(res, null, 2),
        'utf8'
      );

      return res;
    }

    // Real or Hybrid execution path
    const performedSteps: string[] = [];
    const skippedSteps: string[] = [];
    const warnings: string[] = [];
    const createdFiles: string[] = [];
    
    const assetsImported: string[] = [];
    const nodesCreated: string[] = [];
    const connectionsCreated: string[] = [];
    const keyframesCreated: any[] = [];

    const projectPath = options.projectPath || path.join(outputDir, 'harmony_project', `${sceneName}.xstage`);
    let projectCreated = false;

    try {
      // 1. Create/Open Harmony scene
      await HarmonyPython.runCommand('open_project', { projectPath });
      performedSteps.push('open_project');
      
      // Verification that the actual directory/file exists
      if (fs.existsSync(projectPath)) {
        projectCreated = true;
      }

      // 2. Setup Composite-Display-Write chain
      await HarmonyPython.runCommand('create_composite_display_write_chain', { parentGroup: 'Top' });
      performedSteps.push('create_composite_display_write_chain');
      nodesCreated.push('Composite', 'Display', 'Write');
      connectionsCreated.push('Composite -> Display', 'Composite -> Write');

      // 3. Set Resolution/FPS/Duration
      try {
        await HarmonyPython.runCommand('set_project_metadata', {
          numFrames: duration,
          frameRate: fps
        });
        performedSteps.push('set_resolution_fps_duration');
      } catch (e: any) {
        skippedSteps.push('set_resolution_fps_duration');
        warnings.push(`Could not set project metadata: ${e.message}`);
      }

      // 4. Import background image
      try {
        await HarmonyPython.runCommand('import_image_as_drawing', {
          imagePath: resolvedBgPath,
          nodeName: 'BG_Drawing',
          parentGroup: 'Top'
        });
        await HarmonyPython.runCommand('connect_to_composite', {
          srcNodePath: 'Top/BG_Drawing',
          compositeNodePath: 'Top/Composite'
        });
        performedSteps.push('import_background');
        assetsImported.push(path.basename(bgFile));
        nodesCreated.push('BG_Drawing');
        connectionsCreated.push('BG_Drawing -> Composite');
      } catch (e: any) {
        skippedSteps.push('import_background');
        warnings.push(`Could not import background: ${e.message}`);
      }

      // 5. Import character
      let charName = (scenePlan.characters && scenePlan.characters[0]?.name) || 'Character';
      let resolvedCharPath = placeholders.characterPath;

      try {
        await HarmonyPython.runCommand('import_image_as_drawing', {
          imagePath: resolvedCharPath,
          nodeName: `${charName}_Drawing`,
          parentGroup: 'Top'
        });
        
        await HarmonyPython.runCommand('create_node', {
          parentGroup: 'Top',
          nodeType: 'Peg',
          nodeName: `${charName}_Peg`
        });

        await HarmonyPython.runCommand('connect_nodes', {
          srcNodePath: `Top/${charName}_Peg`,
          destNodePath: `Top/${charName}_Drawing`,
          srcPort: 0,
          destPort: 0
        });

        await HarmonyPython.runCommand('connect_to_composite', {
          srcNodePath: `Top/${charName}_Drawing`,
          compositeNodePath: 'Top/Composite'
        });

        performedSteps.push('import_character_placeholder');
        assetsImported.push('character_placeholder.png');
        nodesCreated.push(`${charName}_Drawing`, `${charName}_Peg`);
        connectionsCreated.push(`${charName}_Peg -> ${charName}_Drawing`, `${charName}_Drawing -> Composite`);
      } catch (e: any) {
        skippedSteps.push('import_character_placeholder');
        warnings.push(`Could not import character placeholder: ${e.message}`);
      }

      // 6. Apply character positioning & scale presets
      const charPreset = (scenePlan.characters && scenePlan.characters[0]?.positionPreset) || 'center';
      const charScale = (scenePlan.characters && scenePlan.characters[0]?.scale) || 1.0;
      
      let posX = 0.0, posY = 0.0, posZ = 0.0;
      let targetScale = charScale;

      if (charPreset === 'left') posX = -4.0;
      else if (charPreset === 'right') posX = 4.0;
      else if (charPreset === 'foreground_left') { posX = -5.0; posY = -1.0; targetScale = charScale * 1.5; }
      else if (charPreset === 'foreground_right') { posX = 5.0; posY = -1.0; targetScale = charScale * 1.5; }
      else if (charPreset === 'background_center') { posX = 0.0; posY = 2.0; targetScale = charScale * 0.5; }

      try {
        await HarmonyPython.runCommand('set_node_position', { nodePath: `Top/${charName}_Peg`, x: posX, y: posY, z: posZ });
        await HarmonyPython.runCommand('set_node_scale', { nodePath: `Top/${charName}_Peg`, scale: targetScale });
        performedSteps.push('set_node_position', 'set_node_scale');
      } catch (e: any) {
        skippedSteps.push('set_node_position', 'set_node_scale');
        warnings.push(`Could not position/scale character peg: ${e.message}`);
      }

      // 7. Create camera & Camera keyframes
      let camMove = scenePlan.camera?.preset || 'static';
      try {
        await HarmonyPython.runCommand('create_node', {
          parentGroup: 'Top',
          nodeType: 'Camera',
          nodeName: 'Camera'
        });
        nodesCreated.push('Camera');

        if (camMove === 'slow_push_in') {
          await HarmonyPython.runCommand('set_node_attr', { nodePath: 'Top/Camera', attributeName: 'position.z', value: 12, frame: 1 });
          await HarmonyPython.runCommand('set_node_attr', { nodePath: 'Top/Camera', attributeName: 'position.z', value: 10, frame: duration });
          keyframesCreated.push(
            { node: 'Camera', frame: 1, attr: 'position.z', value: 12 },
            { node: 'Camera', frame: duration, attr: 'position.z', value: 10 }
          );
        } else if (camMove === 'slow_pull_out') {
          await HarmonyPython.runCommand('set_node_attr', { nodePath: 'Top/Camera', attributeName: 'position.z', value: 10, frame: 1 });
          await HarmonyPython.runCommand('set_node_attr', { nodePath: 'Top/Camera', attributeName: 'position.z', value: 12, frame: duration });
          keyframesCreated.push(
            { node: 'Camera', frame: 1, attr: 'position.z', value: 10 },
            { node: 'Camera', frame: duration, attr: 'position.z', value: 12 }
          );
        }
        performedSteps.push('create_camera_move');
      } catch (e: any) {
        skippedSteps.push('create_camera_move');
        warnings.push(`Could not setup camera move: ${e.message}`);
      }

      // 8. Save scene
      await HarmonyPython.runCommand('save_project', { projectPath });
      performedSteps.push('save_scene');

      // 9. Render preview
      let previewRendered = false;
      const previewsDir = path.join(pkgDir, 'previews');
      if (!fs.existsSync(previewsDir)) fs.mkdirSync(previewsDir, { recursive: true });
      const previewPath = path.join(previewsDir, `${sceneName}_preview.mp4`);

      try {
        await HarmonyPython.runCommand('render_preview', { projectPath, frame: 1, outputPath: previewPath });
        
        const validator = new RenderOutputValidator();
        const validation = validator.validate(previewPath, 'harmony_cli');
        
        if (validation.fileExists && validation.fileSizeBytes > 0 && validation.isLikelyValidVideo === true) {
          previewRendered = true;
          performedSteps.push('render_preview');
          createdFiles.push(previewPath);
        } else {
          warnings.push(`Render preview check failed: ${validation.reason || 'Not a valid video'}`);
        }
      } catch (e: any) {
        skippedSteps.push('render_preview');
        warnings.push(`Could not render preview: ${e.message}`);
      }

      const res: RealSceneExecutionResult = {
        ok: performedSteps.length > 0 && projectCreated,
        mode: mode as any,
        isRealHarmonyExecution: true,
        sceneName,
        createdFiles,
        performedSteps,
        skippedSteps,
        warnings,
        requiresHuman: false,
        assetsImported,
        nodesCreated,
        connectionsCreated,
        keyframesCreated,
        preview: {
          rendered: previewRendered,
          path: previewPath,
          fileExists: fs.existsSync(previewPath),
          fileSizeBytes: fs.existsSync(previewPath) ? fs.statSync(previewPath).size : 0,
          ...(!previewRendered ? { reason: 'Harmony CLI render unavailable or failed' } : {})
        }
      };

      // Write execution report
      const reportsDir = path.join(pkgDir, 'review_reports');
      if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
      fs.writeFileSync(
        path.join(reportsDir, `${sceneName}_execution_report.json`),
        JSON.stringify(res, null, 2),
        'utf8'
      );

      return res;

    } catch (e: any) {
      const res: RealSceneExecutionResult = {
        ok: false,
        mode: mode as any,
        isRealHarmonyExecution: true,
        sceneName,
        createdFiles,
        performedSteps,
        skippedSteps,
        warnings: [...warnings, `Execution failed: ${e.message}`],
        requiresHuman: false,
        assetsImported,
        nodesCreated,
        connectionsCreated,
        keyframesCreated,
        preview: {
          rendered: false,
          path: path.join(pkgDir, 'previews', `${sceneName}_preview.mp4`),
          fileExists: false,
          fileSizeBytes: 0,
          reason: e.message
        },
        error: {
          code: 'HARMONY_EXECUTION_FAILED',
          message: e.message
        }
      };

      // Write failed execution report
      const reportsDir = path.join(pkgDir, 'review_reports');
      if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
      fs.writeFileSync(
        path.join(reportsDir, `${sceneName}_execution_report.json`),
        JSON.stringify(res, null, 2),
        'utf8'
      );

      return res;
    }
  }
}
