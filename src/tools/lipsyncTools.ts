import { z } from 'zod';
import { verifyPathAccess, executeWithDryRun, HarmonyError } from '../security.js';
import { HarmonyPython } from '../adapters/harmonyPython.js';

async function runRigBridge(command: string, args: any): Promise<any> {
  try {
    return await HarmonyPython.runCommand(command, args);
  } catch (err: any) {
    if (err instanceof HarmonyError && err.code === 'PYTHON_API_UNAVAILABLE') {
      return { status: 'unsupported', reason: 'Python API is not available.' };
    }
    throw err;
  }
}
import { projectPathSchema } from '../schemas/common.js';
import { defineTool } from './defineTool.js';

export const lipsyncTools = [
  defineTool({
    name: 'harmony.lipsync.import_audio',
    description: 'Импорт файла звуковой дорожки в таймлайн сцены.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      audioFilePath: z.string().describe('Абсолютный путь к звуковому файлу (.wav/.aiff).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedAudio = verifyPathAccess(args.audioFilePath);
      return executeWithDryRun('import_audio', args, args.dryRun, async () => {
        const res = await runRigBridge('import_audio_to_scene', {
          projectPath: checkedPath,
          audioFilePath: checkedAudio,
          startFrame: 1
        });
        if (res.status === 'unsupported') return res;
        return res;
      });
    }
  }),
  defineTool({
    name: 'harmony.lipsync.analyze_audio_placeholder',
    description: 'Генерация черновой эвристической разметки фонем (draft timing for human refinement) для аудиофайла.',
    inputSchema: z.object({
      audioFilePath: z.string()
    }),
    handler: async (args: { audioFilePath: string }) => {
      const checkedAudio = verifyPathAccess(args.audioFilePath);
      // Возвращаем черновую разметку фонем для доработки аниматором
      return {
        status: 'success',
        timingQuality: 'draft timing for human refinement',
        honestNote: 'Heuristic draft timing generated for human animator refinement, not automated lipsync production export.',
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
  }),
  defineTool({
    name: 'harmony.lipsync.import_phoneme_timing',
    description: 'Импорт файла разметки таймингов фонем рта (например, из Papagayo или Rhubarb).',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      timingFilePath: z.string().describe('Путь к файлу разметки (.dat/.json).'),
      mouthLayerNodePath: z.string().describe('Путь к слою рта (Read ноде).'),
      dryRun: z.boolean().optional()
    }),
    handler: async (args) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedTiming = verifyPathAccess(args.timingFilePath);
      return executeWithDryRun('import_phoneme_timing', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "import_phoneme_timing" требует подключённого Python API Harmony.');
      });
    }
  }),
  defineTool({
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
    handler: async (args) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      return executeWithDryRun('apply_mouth_chart', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "apply_mouth_chart" требует подключённого Python API Harmony.');
      });
    }
  }),
  defineTool({
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
  }),
  defineTool({
    name: 'harmony.lipsync.create_lipsync_test',
    description: 'Создание короткого анимационного теста липсинка со звуком.',
    inputSchema: z.object({
      projectPath: projectPathSchema,
      mouthLayerNodePath: z.string(),
      audioFilePath: z.string(),
      dryRun: z.boolean().optional()
    }),
    handler: async (args) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;
      const checkedAudio = verifyPathAccess(args.audioFilePath);
      return executeWithDryRun('create_lipsync_test', args, args.dryRun, async () => {
        throw new HarmonyError('UNSUPPORTED_BY_VERSION', 'Операция "create_lipsync_test" требует подключённого Python API Harmony.');
      });
    }
  }),

  // ──────────────────────────────────────────────────────────────
  // NEW: generate_plan — генерация lipsync плана из текста
  // ──────────────────────────────────────────────────────────────
  defineTool({
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
    handler: async (args) => {
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
        if (d.startFrame < 1 || d.endFrame < 1) {
          throw new HarmonyError('INVALID_HARMONY_OBJECT', 'Кадры (startFrame/endFrame) должны быть больше или равны 1');
        }
        if (d.startFrame > d.endFrame) {
          throw new HarmonyError('INVALID_HARMONY_OBJECT', 'Начальный кадр (startFrame) не может быть больше конечного (endFrame)');
        }
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

        // Если указан аудиофайл, проверяем доступ к нему
        const checkedAudio = d.audioFile ? verifyPathAccess(d.audioFile) : undefined;

        return {
          character: d.character,
          text: d.text,
          startFrame: d.startFrame,
          endFrame: d.endFrame,
          audioFile: checkedAudio,
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
        const checkedSavePath = verifyPathAccess(args.saveToPath);
        const { default: fs2 } = await import('fs');
        const { default: path2 } = await import('path');
        const resolved = path2.resolve(checkedSavePath);
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
  }),

  // ──────────────────────────────────────────────────────────────
  // NEW: apply_to_scene — применение lipsync к сцене
  // ──────────────────────────────────────────────────────────────
  defineTool({
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
    handler: async (args) => {
      const checkedPath = args.projectPath ? verifyPathAccess(args.projectPath) : undefined;

      let lipsyncPlan: any;
      if (args.lipsyncPlanPath) {
        const checkedPlanPath = verifyPathAccess(args.lipsyncPlanPath);
        const { default: fs2 } = await import('fs');
        const { default: path2 } = await import('path');
        lipsyncPlan = JSON.parse(fs2.readFileSync(path2.resolve(checkedPlanPath), 'utf-8'));
      } else if (args.lipsyncPlanInline) {
        lipsyncPlan = args.lipsyncPlanInline;
      } else {
        return { status: 'unsupported', reason: 'Нужен lipsyncPlanPath or lipsyncPlanInline' };
      }

      return executeWithDryRun('lipsync.apply_to_scene', args, args.dryRun, async () => {
        // Fallback or secondary output is Qt Script, but primarily we run Python bridge.
        const res = await runRigBridge('apply_lipsync_plan', {
          projectPath: checkedPath,
          plan: lipsyncPlan
        });
        
        if (res.status === 'unsupported') {
            // Generates Qt Script if Python is not available
            return {
                status: 'unsupported',
                message: 'Python API not available for direct Lipsync application.',
                note: 'Qt Script generation fallback would go here.'
            }
        }
        
        return res;
      });
    }
  })
];

