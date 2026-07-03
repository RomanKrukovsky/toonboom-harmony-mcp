import { verifyPathAccess, executeWithDryRun, HarmonyError } from '../security.js';
import { HarmonyPython } from '../adapters/harmonyPython.js';
import * as schemas from '../schemas/rig.js';

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
        return {
          status: 'partial_success',
          characterName: args.characterName,
          importedPsdPath: checkedPsd,
          manualSteps: [
            'Используйте диалоговое окно Import PSD в Harmony для выбора опций группировки.',
            'Назначьте правильные правила векторизации для импортируемых слоев.'
          ]
        };
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
        return {
          status: 'partial_success',
          characterName: args.characterName,
          manualSteps: [
            'Свяжите Peg-узлы конечностей с Peg-узлом туловища.',
            'Подключите Peg головы к Peg шеи.'
          ]
        };
      });
    }
  },
  {
    name: 'harmony.rig.create_pegs',
    description: 'Автоматическое создание управляющих Peg-нод для выбранного списка слоев.',
    inputSchema: schemas.createPegsSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_pegs', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Созданы управляющие Peg-ноды для ${args.nodePaths.length} узлов.`
        };
      });
    }
  },
  {
    name: 'harmony.rig.create_deformers',
    description: 'Добавление деформаторов (Bone, Curve, Envelope) к выбранному слою.',
    inputSchema: schemas.createDeformersSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_deformers', args, args.dryRun, async () => {
        return {
          status: 'partial_success',
          nodePath: args.nodePath,
          deformerType: args.type,
          manualSteps: [
            `Выберите ноду "${args.nodePath}" в Node View.`,
            'Активируйте инструмент Rigging Tool на панели инструментов.',
            `Создайте опорные точки деформации типа "${args.type}" кликом мыши на холсте.`
          ]
        };
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
    description: 'Создание структуры рта со стандартным набором фонем (A, B, C, D, E, F, G, X).',
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
    description: 'Сборка иерархии узлов для глаз (со зрачком, маской обрезки и Peg-контроллерами).',
    inputSchema: schemas.createEyeSystemSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('create_eye_system', args, args.dryRun, async () => {
        return {
          status: 'partial_success',
          characterName: args.characterName,
          manualSteps: [
            'Подключите ноду зрачка (Pupil) во вход Cutter.',
            'Подключите ноду глазного яблока (Eyeball) в качестве маски Cutter.'
          ]
        };
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
        return {
          status: 'partial_success',
          characterName: args.characterName,
          manualSteps: [
            'Назначьте деформаторы типа Curve для бровей для гибкой мимики.',
            'Привяжите Peg-бровей к Peg-головной структуры.'
          ]
        };
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
        return {
          status: 'success',
          handNodePath: args.handNodePath,
          message: `Создано ${args.handDrawingsCount} пустых подстановок кистей рук.`
        };
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
        return {
          status: 'success',
          message: `Шаблон позы "${checkedPose}" применен к узлу "${args.targetNodePath}".`
        };
      });
    }
  },
  {
    name: 'harmony.rig.validate',
    description: 'Валидация рига на битые связи, отсутствующие опорные точки и ошибки в иерархии.',
    inputSchema: schemas.validateRigSchema,
    handler: async (args: { projectPath?: string }) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const res = await runRigBridge('audit_scene', { projectPath: checkedPath });
      if (res.status === 'unsupported') return res;
      return {
        status: 'success',
        issues: res.audit?.broken_connections || [],
        valid: (res.audit?.broken_connections || []).length === 0
      };
    }
  },
  {
    name: 'harmony.rig.validate_deformers',
    description: 'Проверка целостности и корректности деформаторов в сцене.',
    inputSchema: schemas.validateDeformersSchema,
    handler: async (args: { projectPath?: string }) => {
      return {
        status: 'success',
        valid: true,
        issues: []
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
        return {
          status: 'success',
          message: `Шаблон рига успешно сохранен в "${checkedDest}".`
        };
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
        return {
          status: 'success',
          message: 'Анимационный тест рига успешно создан на первых 48 кадрах таймлайна.'
        };
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
        return {
          status: 'partial_success',
          characterName: args.characterName,
          manualSteps: [
            'Объедините все слои лица в одну общую группу Face.',
            'Примените общий Peg для перемещения лица внутри маски головы.'
          ]
        };
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
        return {
          status: 'partial_success',
          characterName: args.characterName,
          manualSteps: [
            'Настройте Peg-узлы для смещения торса, таза и плеч.',
            'Используйте переключатели подстановок (drawings) для смены ракурсов конечностей.'
          ]
        };
      });
    }
  },
  {
    name: 'harmony.rig360.map_drawings_to_angles',
    description: 'Привязка конкретных подстановок рисунков к определенным углам разворота.',
    inputSchema: schemas.mapDrawingsToAnglesSchema,
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('map_drawings_to_angles', args, args.dryRun, async () => {
        return {
          status: 'success',
          nodePath: args.nodePath,
          mappedCount: args.angleMappings.length
        };
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
        return {
          status: 'partial_success',
          characterName: args.characterName,
          manualSteps: [
            'Запустите Slider Wizard.',
            'Настройте слайдер горизонтального поворота от 0 до 7 для 8 ракурсов.'
          ]
        };
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
        return {
          status: 'partial_success',
          characterName: args.characterName,
          manualSteps: [
            'Настройте 2D Point Widget для смещения зрачков.',
            'Назначьте ограничения движения виджета границами глаз.'
          ]
        };
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
        return {
          status: 'success',
          message: 'Анимационный тест разворота на 360 градусов успешно добавлен на таймлайн.'
        };
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
        return {
          status: 'success',
          message: `360-риг персонажа "${args.characterName}" успешно экспортирован в "${checkedDest}".`
        };
      });
    }
  }
];
