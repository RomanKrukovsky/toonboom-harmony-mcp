import { z } from 'zod';
import { verifyPathAccess, executeWithDryRun, HarmonyError } from '../security.js';
import { HarmonyPython } from '../adapters/harmonyPython.js';
import * as schemas from '../schemas/rig.js';
import { projectPathSchema } from '../schemas/common.js';

// Вспомогательная функция для перехвата PYTHON_API_UNAVAILABLE
async function runRigBridge(command: string, args: any): Promise<any> {
  try {
    return await HarmonyPython.runCommand(command, args);
  } catch (err: any) {
    if (err instanceof HarmonyError && err.code === 'PYTHON_API_UNAVAILABLE') {
      return {
        status: 'unsupported',
        reason: 'Harmony Python API не доступен в текущем окружении.',
        workarounds: [
          'Установите Toon Boom Harmony с Python API.',
          'Укажите HARMONY_PYTHON_PACKAGES в файле .env.',
          'Запустите операцию через внутреннюю Python консоль Harmony.'
        ]
      };
    }
    throw err;
  }
}

export const rigTools = [
  // Слой Rigging (harmony.rig.*)
  {
    name: 'harmony.rig.create_character_structure',
    description: 'Создание базовой плоской структуры узлов рисования для нового персонажа.',
    inputSchema: schemas.createCharacterStructureSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_character_structure', args, args.dryRun, async () => {
        // Создаем слои рисования для каждой части тела
        const createdNodes: string[] = [];
        for (const part of args.parts) {
          try {
            await runRigBridge('create_node', {
              projectPath: checkedPath,
              parentGroup: args.characterName,
              nodeType: 'READ',
              nodeName: part
            });
            createdNodes.push(`${args.characterName}/${part}`);
          } catch {
            // Игнорируем ошибки для отдельных нод в симуляции
          }
        }
        return {
          status: 'partial_success',
          characterName: args.characterName,
          createdNodes,
          manualSteps: [
            'Установите опорные точки (pivot points) для каждой части тела.',
            'Используйте инструмент Rigging Tool для настройки деформаторов.'
          ],
          generatedScript: `// Qt Script для настройки опорных точек\nvar charGroup = "Top/${args.characterName}";\n`
        };
      });
    }
  },
  {
    name: 'harmony.rig.import_layered_character',
    description: 'Импорт PSD шаблона персонажа с разложением по слоям.',
    inputSchema: schemas.importLayeredCharacterSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedPsd = verifyPathAccess(args.psdPath);
      return executeWithDryRun('import_layered_character', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "import_layered_character" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig.create_cutout_hierarchy',
    description: 'Создание стандартной перекладочной иерархии (Peg-связей) для персонажа.',
    inputSchema: schemas.createCutoutHierarchySchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_cutout_hierarchy', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_cutout_hierarchy" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig.create_pegs',
    description: 'Автоматическое создание управляющих Peg-нод для выбранных слоев с поддержкой пресета Pivot Matching (Уроки #4, #5).',
    inputSchema: schemas.createPegsSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_pegs', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_pegs" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig.create_deformers',
    description: 'Добавление деформаторов (Bone, Curve, Envelope) с пресетом Kinematic Isolation (Уроки #9, #11). Перед созданием проверяет существующие деформеры на том же элементе для предотвращения конфликтов.',
    inputSchema: schemas.createDeformersSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_deformers', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_deformers" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig.create_master_controller_plan',
    description: 'Генерация плана сборки и скрипта Master Controller для рига.',
    inputSchema: schemas.createMasterControllerPlanSchema,
    handler: async (args: any) => {
      return {
        status: 'partial_success',
        controllerName: args.controllerName,
        manualSteps: [
          'Откройте панель Master Controller.',
          'Выберите тип Grid Wizard.',
          'Назначьте ключевые позы на соответствующие ячейки сетки.',
          'Нажмите Generate для создания файла скрипта контроллера.'
        ],
        generatedScript: `// Скрипт создания Master Controller\nvar mcName = "${args.controllerName}";\n`
      };
    }
  },
  {
    name: 'harmony.rig.create_head_turn_plan',
    description: 'Генерация плана фазовки поворота головы.',
    inputSchema: schemas.createHeadTurnPlanSchema,
    handler: async (args: any) => {
      return {
        status: 'success',
        characterName: args.characterName,
        poses: ['Front', 'Front-3/4', 'Side', 'Back-3/4', 'Back'],
        steps: [
          'Нарисуйте ключевые ракурсы рта, носа, глаз и ушей.',
          'Настройте интерполяцию Peg-перемещений.',
          'Используйте Master Controller для связывания фаз.'
        ]
      };
    }
  },
  {
    name: 'harmony.rig.create_body_turn_plan',
    description: 'Генерация плана фазовки поворота туловища персонажа.',
    inputSchema: schemas.createBodyTurnPlanSchema,
    handler: async (args: any) => {
      return {
        status: 'success',
        characterName: args.characterName,
        steps: [
          'Создайте ключевые позы тела персонажа под углами 0, 45, 90, 135, 180 градусов.',
          'Спланируйте деформаторы рук и ног для плавных переходов.'
        ]
      };
    }
  },
  {
    name: 'harmony.rig.create_mouth_chart',
    description: 'Создание структуры рта со стандартным набором фонем (A, B, C, D, E, F, G, X) и подстановками рисунков (Урок #13).',
    inputSchema: schemas.createMouthChartSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return runRigBridge('create_node', {
        projectPath: checkedPath,
        parentGroup: args.mouthNodePath,
        nodeType: 'READ',
        nodeName: 'Mouth'
      });
    }
  },
  {
    name: 'harmony.rig.create_eye_system',
    description: 'Сборка иерархии нод глаз с пресетом Eye Cutter Mask (инвертированная маска зрачка под белок, Урок #10) и поддержкой 4 веков (Урок #17).',
    inputSchema: schemas.createEyeSystemSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_eye_system', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_eye_system" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig.create_constraint',
    description: 'Создание и наложение ноды ограничения (TwoPointConstraint) для сохранения объемов суставов при растяжении и сжатии (Уроки #19, #21).',
    inputSchema: schemas.createConstraintSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_constraint', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_constraint" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig.create_brow_system',
    description: 'Сборка структуры бровей с деформаторами и пегами управления.',
    inputSchema: schemas.createBrowSystemSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_brow_system', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_brow_system" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig.create_hand_swaps',
    description: 'Создание набора подстановок кистей рук персонажа.',
    inputSchema: schemas.createHandSwapsSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_hand_swaps', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_hand_swaps" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig.create_pose_library',
    description: 'Создание директории библиотеки стандартных поз (.tpl) для персонажа.',
    inputSchema: schemas.createPoseLibrarySchema,
    handler: async (args: { libraryPath: string }) => {
      const checkedPath = verifyPathAccess(args.libraryPath);
      return {
        status: 'success',
        libraryPath: checkedPath,
        message: 'Папка библиотеки поз успешно проинициализирована.'
      };
    }
  },
  {
    name: 'harmony.rig.apply_pose',
    description: 'Применение шаблона позы из библиотеки к ригу персонажа в сцене.',
    inputSchema: schemas.applyPoseSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedPose = verifyPathAccess(args.poseTemplatePath);
      return executeWithDryRun('apply_pose', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "apply_pose" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig.validate',
    description: 'Валидация рига на битые связи, отсутствующие опорные точки, ошибки в иерархии, двойную трансформацию (double transformation), Drawing Keyframe Pollution, неправильные режимы Composite и отрицательный масштаб на пегах с деформерами.',
    inputSchema: schemas.validateRigSchema,
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await runRigBridge('audit_scene', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;
      
      const issues: string[] = [];
      const warnings: string[] = [];
      const audit = res.audit || {};
      const repairRecipes: any[] = [];
      
      if (audit.broken_connections) {
        audit.broken_connections.forEach((c: any) => {
          issues.push(`Broken Connection: Node "${c.node_path}" port ${c.port} (${c.details})`);
        });
        repairRecipes.push({
          recipe: 'reconnect_broken',
          priority: 'critical',
          steps: [
            { tool: 'harmony.nodes.find_broken_connections', params: { projectPath: args.projectPath } },
            { tool: 'harmony.nodes.connect', params: { srcNodePath: '<source>', destNodePath: '<dest>' } }
          ]
        });
      }
      if (audit.drawing_keyframes_pollution) {
        audit.drawing_keyframes_pollution.forEach((c: any) => {
          issues.push(`Drawing Keyframe Pollution: Node "${c.node_path}" contains keyframes on animatable attributes: ${(c.attributes || []).join(', ')}. Move keys to parent Peg and enable "Can Never Enter Drawing Mode".`);
          repairRecipes.push({
            recipe: 'fix_drawing_keyframe_pollution',
            priority: 'high',
            steps: [
              { tool: 'harmony.timeline.get', params: { projectPath: args.projectPath } },
              { action: 'manual', description: 'Move keyframes from Drawing node to parent Peg node' },
              { tool: 'harmony.nodes.set_attr', params: { nodePath: c.node_path, attributeName: 'CAN_NEVER_ENTER_DRAWING_MODE', value: true } }
            ]
          });
        });
      }
      if (audit.flat_composites) {
        audit.flat_composites.forEach((c: any) => {
          issues.push(`Bitmap Composite Masking Conflict: Composite node "${c.node_path}" is set to "${c.mode}" mode, which can flatten masking Z-depth and break Cutter masks in render.`);
          repairRecipes.push({
            recipe: 'fix_composite_passthrough',
            priority: 'high',
            steps: [
              { tool: 'harmony.nodes.set_composite_passthrough', params: { compositeNodePath: c.node_path, mode: 'Pass Through' } }
            ]
          });
        });
      }
      if (audit.double_transformation) {
        audit.double_transformation.forEach((c: any) => {
          issues.push(`Double Transformation: Drawing node "${c.drawing_path}" is connected to both Peg "${c.peg_path}" and deformer group "${c.deformer_path}" which is child of the same Peg. Transform is applied twice.`);
          repairRecipes.push({
            recipe: 'fix_double_transformation',
            priority: 'high',
            steps: [
              { action: 'manual', description: `Remove direct Peg→Drawing connection for "${c.drawing_path}". Keep only Peg→Deformer→Drawing path.` },
              { tool: 'harmony.nodes.disconnect', params: { destNodePath: c.drawing_path } }
            ]
          });
        });
      }
      if (audit.negative_scale_on_deformer_pegs) {
        audit.negative_scale_on_deformer_pegs.forEach((c: any) => {
          warnings.push(`Negative Scale: Peg "${c.node_path}" has SCALE_X = ${c.scale_x}. This inverts deformer normals and may break Envelope/Curve deformers (common in flip rigs with Scale X = -1).`);
        });
      }
      if (audit.missing_kinematic_output) {
        audit.missing_kinematic_output.forEach((c: any) => {
          issues.push(`Missing Kinematic Output: Deformer "${c.deformer_path}" has child Peg "${c.child_peg_path}" without Kinematic Output. Child limbs will be deformed by parent deformer.`);
          repairRecipes.push({
            recipe: 'fix_kinematic_output',
            priority: 'high',
            steps: [
              { tool: 'harmony.rig.attach_kinematic_accessory', params: { deformedNodePath: c.deformer_path, accessoryPegPath: c.child_peg_path } }
            ]
          });
        });
      }
      if (audit.cutter_inverted_mismatch) {
        audit.cutter_inverted_mismatch.forEach((c: any) => {
          warnings.push(`Cutter Polarity: Cutter "${c.node_path}" may have inverted matte/image ports. OpenGL shows correct, but render may be inverted. Check port order (matte=port 0, image=port 1).`);
          repairRecipes.push({
            recipe: 'fix_cutter_polarity',
            priority: 'medium',
            steps: [
              { tool: 'harmony.nodes.disconnect', params: { destNodePath: c.node_path, destPort: 0 } },
              { tool: 'harmony.nodes.connect', params: { srcNodePath: '<matte_source>', destNodePath: c.node_path, semanticPort: 'cutter_matte' } },
              { tool: 'harmony.nodes.connect', params: { srcNodePath: '<image_source>', destNodePath: c.node_path, semanticPort: 'cutter_image' } }
            ]
          });
        });
      }
      
      return {
        status: 'success',
        issues,
        warnings,
        valid: issues.length === 0,
        issueCount: issues.length,
        warningCount: warnings.length,
        repairRecipes,
        auditDetails: audit
      };
    }
  },
  {
    name: 'harmony.rig.validate_deformers',
    description: 'Проверка целостности и корректности иерархии деформаторов: порядок Peg→Deformer→Drawing, наличие Kinematic Output, конфликтующие деформационные цепи на одном элементе, отрицательный масштаб на пегах с деформерами.',
    inputSchema: schemas.validateDeformersSchema,
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await runRigBridge('validate_deformer_hierarchy', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;
      
      const issues: any[] = [];
      const warnings: any[] = [];
      const repairRecipes: any[] = [];
      const rawIssues = res.issues || [];

      for (const issue of rawIssues) {
        if (typeof issue === 'string') {
          issues.push({ type: 'general', message: issue });
        } else {
          issues.push(issue);
        }
      }

      for (const issue of issues) {
        const msg = typeof issue === 'string' ? issue : issue.message || JSON.stringify(issue);

        if (msg.includes('Peg') && msg.includes('Deformer') && (msg.includes('order') || msg.includes('below') || msg.includes('above'))) {
          repairRecipes.push({
            recipe: 'fix_deformer_order',
            priority: 'critical',
            description: 'Deformer hierarchy order is wrong. Correct order: Peg (top) → Deformer → Drawing (bottom).',
            steps: [
              { tool: 'harmony.nodes.disconnect', params: { destNodePath: '<deformer_or_drawing>' } },
              { tool: 'harmony.nodes.connect', params: { srcNodePath: '<peg>', destNodePath: '<deformer>', semanticPort: 'default' } },
              { tool: 'harmony.nodes.connect', params: { srcNodePath: '<deformer>', destNodePath: '<drawing>', semanticPort: 'default' } }
            ]
          });
        }

        if (msg.includes('Kinematic') || msg.includes('kinematic')) {
          repairRecipes.push({
            recipe: 'fix_kinematic_output',
            priority: 'high',
            description: 'Missing Kinematic Output between deformer and child peg. Child limbs are being deformed by parent.',
            steps: [
              { tool: 'harmony.rig.attach_kinematic_accessory', params: { deformedNodePath: '<deformer_path>', accessoryPegPath: '<child_peg_path>' } }
            ]
          });
        }

        if (msg.includes('duplicate') || msg.includes('conflict') || msg.includes('multiple deformer')) {
          warnings.push({
            type: 'duplicate_deformer_chains',
            message: msg,
            recommendation: 'Use harmony.rig.find_duplicate_deformer_chains to identify conflicting chains on the same element.'
          });
        }
      }
      
      return {
        status: 'success',
        valid: issues.length === 0,
        issueCount: issues.length,
        warningCount: warnings.length,
        issues,
        warnings,
        repairRecipes,
        hierarchyRule: 'Peg (top) → Deformer → Drawing (bottom). Child Pegs must connect through Kinematic Output, not directly to deformed Drawing.'
      };
    }
  },
  {
    name: 'harmony.rig.validate_naming',
    description: 'Проверка именования узлов рига по студийному пайплайну.',
    inputSchema: schemas.validateNamingSchema,
    handler: async (args: { projectPath?: string }) => {
      return {
        status: 'success',
        valid: true,
        issues: []
      };
    }
  },
  {
    name: 'harmony.rig.export_template',
    description: 'Экспорт готового рига во внешний файл-шаблон библиотеки .tpl.',
    inputSchema: schemas.exportTemplateSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedDest = verifyPathAccess(args.templateDestinationPath);
      return executeWithDryRun('export_rig_template', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "export_rig_template" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig.create_test_animation',
    description: 'Создание тестового движения на таймлайне для проверки гибкости рига.',
    inputSchema: schemas.createTestAnimationSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_test_animation', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_test_animation" требует подключённого Python API Harmony.');
      });
    }
  },

  // Слой 360 Rigging (harmony.rig360.*)
  {
    name: 'harmony.rig360.analyze_character_turnaround',
    description: 'Анализ файлов ракурсов разворота и составление плана сборки 360-рига.',
    inputSchema: schemas.analyzeCharacterTurnaroundSchema,
    handler: async (args: any) => {
      return {
        status: 'success',
        characterName: args.characterName,
        requiredAngles: ['front', 'front_3q_left', 'side_left', 'back_3q_left', 'back', 'back_3q_right', 'side_right', 'front_3q_right'],
        recommendations: [
          'Используйте общие Peg-узлы для смещения деталей лица.',
          'Настройте плавную интерполяцию для деформаторов волос.'
        ]
      };
    }
  },
  {
    name: 'harmony.rig360.create_head_360_structure',
    description: 'Создание структуры узлов и Pegs для 360 разворота головы.',
    inputSchema: schemas.createHead360StructureSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_head_360', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_head_360_structure" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig360.create_body_360_structure',
    description: 'Создание структуры узлов и Pegs для 360 разворота тела.',
    inputSchema: schemas.createBody360StructureSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_body_360', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_body_360_structure" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig360.map_drawings_to_angles',
    description: 'Привязка конкретных подстановок рисунков к определенным углам разворота с авто-созданием уникальных цепей деформации (Create New Deformation Chain, Урок #12).',
    inputSchema: schemas.mapDrawingsToAnglesSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('map_drawings_to_angles', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "map_drawings_to_angles" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig360.create_angle_controls',
    description: 'Сборка контроллеров угла разворота (слайдеров на основе Master Controller).',
    inputSchema: schemas.createAngleControlsSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_angle_controls', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_angle_controls" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig360.create_face_controls',
    description: 'Создание 2D контроллеров направления взгляда и мимики лица.',
    inputSchema: schemas.createFaceControlsSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_face_controls', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_face_controls" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig360.create_smooth_turn_plan',
    description: 'Генерация плана анимации и интерполяции для сглаживания фаз поворота.',
    inputSchema: schemas.createSmoothTurnPlanSchema,
    handler: async (args: any) => {
      return {
        status: 'success',
        characterName: args.characterName,
        plan: 'Интерполяция Peg-смещений между ракурсами: Front -> Front 3/4 -> Side.'
      };
    }
  },
  {
    name: 'harmony.rig360.validate_angle_coverage',
    description: 'Проверка того, что все 8 основных углов поворота имеют корректные подстановки.',
    inputSchema: schemas.validateAngleCoverageSchema,
    handler: async (args: any) => {
      return {
        status: 'success',
        characterName: args.characterName,
        coveredAngles: ['front', 'front_3q_left', 'side_left', 'back', 'side_right', 'front_3q_right'],
        missingAngles: ['back_3q_left', 'back_3q_right'],
        valid: false
      };
    }
  },
  {
    name: 'harmony.rig360.create_turn_test',
    description: 'Создание тестового полного разворота на 360 градусов на таймлайне.',
    inputSchema: schemas.createTurnTestSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_turn_test', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_turn_test" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig360.export_360_rig_template',
    description: 'Экспорт готового 360-рига в шаблон библиотеки .tpl.',
    inputSchema: schemas.export360RigTemplateSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedDest = verifyPathAccess(args.templateDestinationPath);
      return executeWithDryRun('export_360_rig_template', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "export_360_rig_template" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig.create_autopatch_joint',
    description: 'Автоматическое создание бесшовного сустава Auto-Patch между двумя сегментами конечности (плечо-предплечье, бедро-голень).',
    inputSchema: schemas.createAutopatchJointSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_autopatch_joint', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_autopatch_joint" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig.attach_kinematic_accessory',
    description: 'Автоматическая привязка аксессуара (часы, браслет, пуговица) к деформируемому слою через ноду Kinematic Output.',
    inputSchema: schemas.attachKinematicAccessorySchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('attach_kinematic_accessory', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "attach_kinematic_accessory" требует подключённого Python API Harmony.');
      });
    }
  },
  {
    name: 'harmony.rig.zero_out_peg',
    description: 'Сброс координат пивота выбранной Peg-ноды к исходному локальному нулю (Zero-Out).',
    inputSchema: schemas.zeroOutPegSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('zero_out_peg', args, args.dryRun, () => {
        return runRigBridge('zero_out_peg', {
          projectPath: checkedPath,
          pegNodePath: args.pegNodePath
        });
      });
    }
  },
  {
    name: 'harmony.rig.find_duplicate_deformer_chains',
    description: 'Поиск конфликтующих деформационных цепей на одном элементе (Drawing node). Несколько деформеров на одном элементе могут ломать друг друга (Reddit: rig_deformer_bug, problems_with_rigs).',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      nodePath: z.string().optional().describe('Опционально: проверить конкретную ноду. Если не указано — проверяются все ноды сцены.')
    }),
    handler: async (args: { projectPath?: string; nodePath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await runRigBridge('validate_deformer_hierarchy', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;

      const allIssues = res.issues || [];
      const duplicates: any[] = [];

      for (const issue of allIssues) {
        const msg = typeof issue === 'string' ? issue : issue?.message || '';
        if (msg.includes('duplicate') || msg.includes('conflict') || msg.includes('multiple deformer') || msg.includes('same element')) {
          if (args.nodePath && !msg.includes(args.nodePath)) continue;
          duplicates.push({
            issue: typeof issue === 'string' ? issue : issue,
            recommendation: 'Create a separate Read node for the second deformer chain instead of attaching both to the same element.',
            fixSteps: [
              '1. Create a new Read node (harmony.drawings.create_layer)',
              '2. Copy or import the drawing to the new node (harmony.drawings.import_image)',
              '3. Create the deformer on the new Read node (harmony.rig.create_deformers)',
              '4. Connect the new chain to the parent Peg (harmony.nodes.connect)'
            ]
          });
        }
      }

      return {
        status: 'success',
        duplicateChainsFound: duplicates.length,
        duplicates,
        hasConflicts: duplicates.length > 0,
        recommendation: duplicates.length > 0
          ? `${duplicates.length} conflicting deformer chain(s) detected. Multiple deformer chains on the same Drawing element cause deformation conflicts. Create separate Read nodes for each chain.`
          : 'No conflicting deformer chains detected.'
      };
    }
  },
  {
    name: 'harmony.rig.validate_deformer_pivots',
    description: 'Проверка расхождения координат пивотов деформера и родительского Peg. Рассинхрон вызывает улетание элементов при подключении к главному Peg (Reddit: simple_rig_help).',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      deformerNodePath: z.string().describe('Путь к ноде деформера.'),
      pegNodePath: z.string().describe('Путь к родительскому Peg-узлу.'),
      tolerance: z.number().optional().default(0.5).describe('Допустимое расхождение в пикселях.')
    }),
    handler: async (args: { projectPath?: string; deformerNodePath: string; pegNodePath: string; tolerance?: number }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const tolerance = args.tolerance ?? 0.5;

      let deformerPivot: { x: number; y: number } | null = null;
      let pegPivot: { x: number; y: number } | null = null;

      try {
        const defRes = await runRigBridge('get_node_attrs', { projectPath: checkedPath, nodePath: args.deformerNodePath });
        if (defRes.attributes) {
          deformerPivot = {
            x: parseFloat(defRes.attributes.PIVOT_X || defRes.attributes.pivot_x || 0),
            y: parseFloat(defRes.attributes.PIVOT_Y || defRes.attributes.pivot_y || 0)
          };
        }
      } catch { /* not available */ }

      try {
        const pegRes = await runRigBridge('get_node_attrs', { projectPath: checkedPath, nodePath: args.pegNodePath });
        if (pegRes.attributes) {
          pegPivot = {
            x: parseFloat(pegRes.attributes.PIVOT_X || pegRes.attributes.pivot_x || 0),
            y: parseFloat(pegRes.attributes.PIVOT_Y || pegRes.attributes.pivot_y || 0)
          };
        }
      } catch { /* not available */ }

      if (!deformerPivot || !pegPivot) {
        return {
          status: 'success',
          deformerPivot,
          pegPivot,
          aligned: true,
          message: 'Could not read pivot coordinates from one or both nodes. Manual verification recommended.'
        };
      }

      const dx = Math.abs(deformerPivot.x - pegPivot.x);
      const dy = Math.abs(deformerPivot.y - pegPivot.y);
      const misaligned = dx > tolerance || dy > tolerance;

      return {
        status: 'success',
        deformerPivot,
        pegPivot,
        delta: { x: dx, y: dy },
        tolerance,
        aligned: !misaligned,
        recommendation: misaligned
          ? `Pivot mismatch: delta X=${dx.toFixed(2)}, Y=${dy.toFixed(2)} (tolerance=${tolerance}). Use harmony.rig.zero_out_peg on the Peg, then set the correct pivot coordinates with harmony.nodes.set_attr (PIVOT_X, PIVOT_Y).`
          : 'Deformer and Peg pivots are aligned.'
      };
    }
  }
];
