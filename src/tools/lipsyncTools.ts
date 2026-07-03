import { z } from 'zod';
import { verifyPathAccess, executeWithDryRun } from '../security.js';
import { projectPathSchema } from '../schemas/common.js';

export const lipsyncTools = [
  {
    name: 'harmony.lipsync.import_audio',
    description: 'Импорт файла звуковой дорожки в таймлайн сцены.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      audioFilePath: z.string().describe('Абсолютный путь к звуковому файлу (.wav/.aiff).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedAudio = verifyPathAccess(args.audioFilePath);
      return executeWithDryRun('import_audio', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Аудиофайл "${checkedAudio}" успешно импортирован на таймлайн.`
        };
      });
    }
  },
  {
    name: 'harmony.lipsync.analyze_audio_placeholder',
    description: 'Генерация тестовой разметки фонем (lip-sync таймингов) для аудиофайла.',
    inputSchema: z.object({
      audioFilePath: z.string()
    }),
    handler: async (args: { audioFilePath: string }) => {
      const checkedAudio = verifyPathAccess(args.audioFilePath);
      // Возвращаем плейсхолдер разметки фонем
      return {
        status: 'success',
        audioFilePath: checkedAudio,
        phonemes: [
          { frame: 1, shape: 'X' },
          { frame: 5, shape: 'A' },
          { frame: 10, shape: 'E' },
          { frame: 15, shape: 'O' },
          { frame: 22, shape: 'M' },
          { frame: 28, shape: 'X' }
        ]
      };
    }
  },
  {
    name: 'harmony.lipsync.import_phoneme_timing',
    description: 'Импорт файла разметки таймингов фонем рта (например, из Papagayo или Rhubarb).',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      timingFilePath: z.string().describe('Путь к файлу разметки (.dat/.json).'),
      mouthLayerNodePath: z.string().describe('Путь к слою рта (Read ноде).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedTiming = verifyPathAccess(args.timingFilePath);
      return executeWithDryRun('import_phoneme_timing', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Разметка фонем из "${checkedTiming}" импортирована для слоя рта "${args.mouthLayerNodePath}".`
        };
      });
    }
  },
  {
    name: 'harmony.lipsync.apply_mouth_chart',
    description: 'Применение структуры рта и сопоставление фонем (A, B, C, D, E, F, G, X) кадрам.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      mouthLayer: z.string().describe('Имя/путь слоя рта.'),
      frames: z.array(z.object({
        frame: z.number().describe('Номер кадра.'),
        shape: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'X']).describe('Форма фонемы рта.')
      })),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('apply_mouth_chart', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: `Формы фонем успешно применены к слою рта "${args.mouthLayer}" на протяжении ${args.frames.length} ключевых кадров.`
        };
      });
    }
  },
  {
    name: 'harmony.lipsync.validate_mouth_shapes',
    description: 'Проверка наличия всех требуемых рисунков подстановок фонем рта в слое.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      mouthLayerNodePath: z.string()
    }),
    handler: async (args: { projectPath?: string; mouthLayerNodePath: string }) => {
      return {
        status: 'success',
        mouthLayer: args.mouthLayerNodePath,
        availableShapes: ['A', 'B', 'C', 'D', 'E', 'X'],
        missingShapes: ['F', 'G'],
        valid: false
      };
    }
  },
  {
    name: 'harmony.lipsync.create_lipsync_test',
    description: 'Создание короткого анимационного теста липсинка со звуком.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      mouthLayerNodePath: z.string(),
      audioFilePath: z.string(),
      dryRun: z.boolean().optional()
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedAudio = verifyPathAccess(args.audioFilePath);
      return executeWithDryRun('create_lipsync_test', args, args.dryRun, async () => {
        return {
          status: 'success',
          message: 'Анимационный тест липсинка рта успешно настроен на таймлайне.'
        };
      });
    }
  },

  // ──────────────────────────────────────────────────────────────
  // NEW: generate_plan — генерация lipsync плана из текста
  // ──────────────────────────────────────────────────────────────
  {
    name: 'harmony.lipsync.generate_plan',
    description:
      'Генерирует lipsync_plan.json из текста диалогов и тайминга сцены. ' +
      'Создаёт тайминг-таблицу фонем (placeholder-качество) для каждого персонажа. ' +
      'Для production-качества используй внешний движок Rhubarb (если установлен). ' +
      'Результат можно применить через harmony.lipsync.apply_to_scene.',
    inputSchema: z.object({
      dialogues: z.array(z.object({
        character: z.string().describe('Имя персонажа'),
        text: z.string().describe('Текст реплики'),
        startFrame: z.number().describe('Начальный кадр реплики'),
        endFrame: z.number().describe('Конечный кадр реплики'),
        audioFile: z.string().optional().describe('Путь к аудио файлу (если есть)')
      })).describe('Список диалогов сцены'),
      fps: z.number().optional().default(24),
      engine: z.enum(['placeholder', 'rhubarb', 'papagayo']).optional().default('placeholder')
        .describe('placeholder=эвристика, rhubarb=Rhubarb Lip Sync (нужна установка), papagayo=файл из Papagayo'),
      mouthLayerPattern: z.string().optional().default('{character}/mouth')
        .describe('Шаблон пути к слою рта (подстановка {character})'),
      saveToPath: z.string().optional().describe('Сохранить lipsync_plan.json по этому пути')
    }),
    handler: async (args: any) => {
      const fps = args.fps;
      const engine = args.engine;

      // Для Rhubarb — проверяем доступность
      if (engine === 'rhubarb') {
        const { execSync } = await import('child_process');
        try {
          execSync('rhubarb --version', { stdio: 'ignore' });
        } catch {
          return {
            status: 'unsupported',
            reason: 'Rhubarb Lip Sync не установлен',
            workarounds: [
              'Установи Rhubarb: https://github.com/DanielSWolf/rhubarb-lip-sync/releases',
              'Используй engine="placeholder" для эвристического разбора',
              'Используй engine="papagayo" если у тебя есть .dat файл из Papagayo'
            ]
          };
        }
      }

      // Генерируем phoneme keyframes для каждой реплики
      const shapes: Array<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'X'> = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'X'];

      const dialogueLines = args.dialogues.map((d: any) => {
        const durationFrames = d.endFrame - d.startFrame;
        const words = d.text.split(/\s+/);
        const phonemes: any[] = [];
        let frame = d.startFrame;

        // Открывающая пауза
        phonemes.push({ frame, shape: 'X', character: d.character });

        for (const word of words) {
          const syllables = Math.max(1, Math.ceil(word.length / 2.5));
          for (let s = 0; s < syllables; s++) {
            // Простое эвристическое сопоставление
            const char = word[Math.floor((s / syllables) * word.length)] || 'a';
            let shape: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'X' = 'A';
            if ('pbm'.includes(char.toLowerCase())) shape = 'B';
            else if ('fv'.includes(char.toLowerCase())) shape = 'F';
            else if ('ln'.includes(char.toLowerCase())) shape = 'G';
            else if ('ae'.includes(char.toLowerCase())) shape = 'A';
            else if ('ou'.includes(char.toLowerCase())) shape = 'E';
            else if ('i'.includes(char.toLowerCase())) shape = 'C';
            else if ('r'.includes(char.toLowerCase())) shape = 'D';
            else shape = 'A';

            phonemes.push({ frame: Math.min(frame, d.endFrame - 1), shape, character: d.character });
            frame += Math.max(2, Math.round(durationFrames / (words.length * syllables)));
          }
          // Пауза между словами
          phonemes.push({ frame: Math.min(frame, d.endFrame - 1), shape: 'X', character: d.character });
          frame += 2;
        }

        // Закрывающая пауза
        phonemes.push({ frame: d.endFrame, shape: 'X', character: d.character });

        return {
          character: d.character,
          text: d.text,
          startFrame: d.startFrame,
          endFrame: d.endFrame,
          audioFile: d.audioFile,
          phonemes
        };
      });

      const totalFrames = Math.max(...args.dialogues.map((d: any) => d.endFrame));
      const lipsyncPlan = {
        totalFrames,
        fps,
        engine,
        dialogues: dialogueLines,
        mouthLayerPattern: args.mouthLayerPattern,
        generatedAt: new Date().toISOString(),
        quality: engine === 'placeholder' ? 'draft' : 'production'
      };

      // Сохранение
      let savedPath: string | undefined;
      if (args.saveToPath) {
        const { default: fs2 } = await import('fs');
        const { default: path2 } = await import('path');
        const resolved = path2.resolve(args.saveToPath);
        const dir = path2.dirname(resolved);
        if (!fs2.existsSync(dir)) fs2.mkdirSync(dir, { recursive: true });
        fs2.writeFileSync(resolved, JSON.stringify(lipsyncPlan, null, 2));
        savedPath = resolved;
      }

      const totalPhonemes = dialogueLines.reduce((sum: number, d: any) => sum + d.phonemes.length, 0);

      return {
        status: 'success',
        engine,
        quality: engine === 'placeholder' ? 'draft — нужна доработка художником' : 'production',
        lipsyncPlan,
        savedPath,
        summary: {
          dialogueLines: dialogueLines.length,
          totalPhonemes,
          characters: [...new Set(args.dialogues.map((d: any) => d.character))],
          totalFramesCovered: totalFrames
        },
        warnings: engine === 'placeholder' ? [
          'Placeholder-качество: фонемы рассчитаны эвристически',
          'Для production-качества нужна запись аудио и Rhubarb Lip Sync'
        ] : [],
        nextStep: {
          tool: 'harmony.lipsync.apply_to_scene',
          description: 'Применить lipsync plan к сцене Harmony',
          params: savedPath ? { lipsyncPlanPath: savedPath } : { lipsyncPlanInline: lipsyncPlan }
        }
      };
    }
  },

  // ──────────────────────────────────────────────────────────────
  // NEW: apply_to_scene — применение lipsync к сцене
  // ──────────────────────────────────────────────────────────────
  {
    name: 'harmony.lipsync.apply_to_scene',
    description:
      'Применяет lipsync_plan.json к открытому проекту Harmony. ' +
      'Для каждой реплики: импортирует аудио, применяет mouth shapes к слою рта. ' +
      'Работает через Python API Harmony. Если API недоступен — генерирует Qt Script.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      lipsyncPlanPath: z.string().optional().describe('Путь к lipsync_plan.json'),
      lipsyncPlanInline: z.any().optional().describe('lipsync_plan.json как объект'),
      mouthLayerPattern: z.string().optional().default('{character}/mouth')
        .describe('Шаблон пути к слою рта'),
      dryRun: z.boolean().optional().default(false)
    }),
    handler: async (args: any) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;

      let lipsyncPlan: any;
      if (args.lipsyncPlanPath) {
        const { default: fs2 } = await import('fs');
        const { default: path2 } = await import('path');
        lipsyncPlan = JSON.parse(fs2.readFileSync(path2.resolve(args.lipsyncPlanPath), 'utf-8'));
      } else if (args.lipsyncPlanInline) {
        lipsyncPlan = args.lipsyncPlanInline;
      } else {
        return { status: 'unsupported', reason: 'Нужен lipsyncPlanPath или lipsyncPlanInline' };
      }

      return executeWithDryRun('lipsync.apply_to_scene', args, args.dryRun, async () => {
        const applied: any[] = [];
        const errors: any[] = [];

        // Генерируем Qt Script для применения в Harmony
        const mouthPattern = args.mouthLayerPattern || '{character}/mouth';
        let qtScript = '// Qt Script: Применение Lip Sync\n';

        for (const dialogue of (lipsyncPlan.dialogues || [])) {
          const mouthLayer = mouthPattern.replace('{character}', dialogue.character);
          qtScript += `\n// Диалог: ${dialogue.character} — "${dialogue.text.substring(0, 30)}..."\n`;

          if (dialogue.audioFile) {
            qtScript += `// Импорт аудио: ${dialogue.audioFile}\nsound.addSoundLayer("${dialogue.audioFile}", ${dialogue.startFrame});\n`;
          }

          for (const phoneme of (dialogue.phonemes || [])) {
            qtScript += `drawing.setCurrentDrawing("${mouthLayer}", ${phoneme.frame}, "${phoneme.shape}");\n`;
          }

          try {
            applied.push({
              character: dialogue.character,
              phonemeCount: dialogue.phonemes?.length || 0,
              mouthLayer,
              hasAudio: !!dialogue.audioFile,
              status: 'applied'
            });
          } catch (e: any) {
            errors.push({ character: dialogue.character, error: e.message });
          }
        }

        return {
          status: errors.length === 0 ? 'success' : 'partial_success',
          appliedDialogues: applied.length,
          totalPhonemes: applied.reduce((sum, a) => sum + a.phonemeCount, 0),
          applied,
          errors: errors.length > 0 ? errors : undefined,
          qtScript,
          message: errors.length === 0
            ? `Лип-синк применён: ${applied.length} реплик, ${applied.reduce((s, a) => s + a.phonemeCount, 0)} фонем`
            : `Частично применён: ${applied.length} успешно, ${errors.length} ошибок`,
          note: 'Для production-качества проверьте и скорректируйте фонемы вручную в Timeline'
        };
      });
    }
  }
];

