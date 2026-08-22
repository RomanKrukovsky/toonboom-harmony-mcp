import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createStandardExecutionResult } from '../schemas/executionResult.js';
import { verifyPathAccess } from '../security.js';
import { defineTool } from './defineTool.js';

/**
 * layoutCameraTools — layout, multiplane depth and camera planning.
 *
 * These were placeholders returning three hardcoded strings for planes and
 * `safeAreasValid: true` regardless of input. The maths involved is pure
 * geometry — no Harmony, no network — and `cameraLayoutDirector` /
 * `backgroundPlanner` already implemented most of it without being wired up.
 *
 * Split of honesty:
 *   * layout/multiplane/camera-move maths and framing validation run for real;
 *   * anything that must mutate a live scene returns a validated command plan and
 *     is marked `requiresRealHarmony` rather than claiming success.
 */

// ── Shot framing ────────────────────────────────────────────────────────────────

/** Camera scale per shot size, mirroring cameraLayoutDirector. */
const SHOT_SIZE_SCALES: Record<string, number> = {
  extreme_close_up: 3.0,
  close_up: 2.0,
  medium_close_up: 1.5,
  medium_shot: 1.0,
  medium_full_shot: 0.8,
  full_shot: 0.6,
  long_shot: 0.4,
  extreme_long_shot: 0.25
};

const shotSizeSchema = z.enum([
  'extreme_close_up', 'close_up', 'medium_close_up', 'medium_shot',
  'medium_full_shot', 'full_shot', 'long_shot', 'extreme_long_shot'
]);

/** Standard broadcast safe areas as a fraction of frame size. */
const ACTION_SAFE = 0.93;
const TITLE_SAFE = 0.90;

/**
 * Multiplane depth ladder. Z is a Harmony peg depth: negative is further from
 * camera, positive is closer. Values match backgroundPlanner so a layout and a
 * background plan agree on where each layer sits.
 */
const MULTIPLANE_LAYERS = [
  { name: 'SKY', depth: -100, role: 'atmosphere' },
  { name: 'FAR_BG', depth: -50, role: 'far_background' },
  { name: 'MID_BG', depth: -20, role: 'midground' },
  { name: 'FLOOR', depth: 0, role: 'ground_plane' },
  { name: 'CHARACTERS', depth: 10, role: 'action' },
  { name: 'FOREGROUND', depth: 50, role: 'depth_cue' }
] as const;

/**
 * Parallax factor for a plane at depth z, given the camera at cameraZ.
 *
 * Harmony's multiplane parallax follows the pinhole relation: a plane's apparent
 * pan speed scales with cameraZ / (cameraZ - z). A plane at the camera's own
 * depth would divide by zero, so the denominator is clamped.
 */
function parallaxFactor(depth: number, cameraZ: number): number {
  const denominator = cameraZ - depth;
  if (Math.abs(denominator) < 1e-6) return 0;
  return cameraZ / denominator;
}

/** Ease-in-out cubic. Linear camera moves read as mechanical. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface MoveKeyframe {
  frame: number;
  x: number;
  y: number;
  z: number;
  easedProgress: number;
}

/** Interpolate a camera move into per-frame keyframes. */
function interpolateMove(
  startFrame: number,
  endFrame: number,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  easing: 'linear' | 'ease_in_out'
): MoveKeyframe[] {
  const frames: MoveKeyframe[] = [];
  const span = Math.max(1, endFrame - startFrame);
  for (let frame = startFrame; frame <= endFrame; frame++) {
    const raw = (frame - startFrame) / span;
    const t = easing === 'linear' ? raw : easeInOutCubic(raw);
    frames.push({
      frame,
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      z: from.z + (to.z - from.z) * t,
      easedProgress: t
    });
  }
  return frames;
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/** Deterministic plan id, so identical input yields an identical plan. */
function planId(prefix: string, payload: unknown): string {
  return `${prefix}_${sha256(JSON.stringify(payload)).slice(0, 12)}`;
}

export const layoutCameraTools = [
  defineTool({
    name: 'harmony.layout.generate',
    description: 'Сгенерировать Layout сцены: слои глубины, параллакс и Z-раскладку (реальная геометрия).',
    inputSchema: z.object({
      sceneId: z.string(),
      resolution: z.object({ width: z.number().positive(), height: z.number().positive() })
        .optional().default({ width: 1920, height: 1080 }),
      cameraZ: z.number().optional().default(1000).describe('Глубина камеры для расчёта параллакса.'),
      characterCount: z.number().int().nonnegative().optional().default(1)
    }),
    handler: async (args) => {
      // Defaults resolved locally: Zod fills them via parse(), but a handler must
      // not crash when invoked directly (tests, cross-tool delegation).
      const resolution = args.resolution ?? { width: 1920, height: 1080 };
      const cameraZ = args.cameraZ ?? 1000;
      const { width, height } = resolution;

      const planes = MULTIPLANE_LAYERS.map(layer => {
        const parallax = parallaxFactor(layer.depth, cameraZ);
        return {
          name: layer.name,
          role: layer.role,
          depth: layer.depth,
          // A far plane must be drawn oversized to cover frame after parallax
          // scaling, otherwise it slides out of shot during a pan.
          parallaxFactor: Number(parallax.toFixed(4)),
          requiredWidth: Math.ceil(width * Math.max(1, parallax)),
          requiredHeight: Math.ceil(height * Math.max(1, parallax)),
          pegName: `${args.sceneId}_${layer.name}_P`
        };
      });

      const details = {
        sceneId: args.sceneId,
        resolution,
        cameraZ,
        planes,
        // Sorted far → near: this is also the back-to-front composite order.
        compositeOrder: planes.map(p => p.name),
        safeAreas: {
          actionSafe: { width: Math.round(width * ACTION_SAFE), height: Math.round(height * ACTION_SAFE) },
          titleSafe: { width: Math.round(width * TITLE_SAFE), height: Math.round(height * TITLE_SAFE) }
        },
        characterCount: args.characterCount ?? 1
      };

      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          details
        }),
        verification: 'verified_real',
        note: 'Раскладка вычислена реально. Создание нод в сцене требует Harmony.'
      };
    }
  }),

  defineTool({
    name: 'harmony.layout.place_characters',
    description: 'Расставить персонажей с учётом перспективы: масштаб и Z по глубине (реальный расчёт).',
    inputSchema: z.object({
      sceneId: z.string(),
      characters: z.array(z.object({
        name: z.string(),
        position: z.enum(['left', 'center_left', 'center', 'center_right', 'right']).optional().default('center'),
        depth: z.number().optional().default(10).describe('Z-глубина персонажа.')
      })).min(1),
      resolution: z.object({ width: z.number().positive(), height: z.number().positive() })
        .optional().default({ width: 1920, height: 1080 }),
      cameraZ: z.number().optional().default(1000)
    }),
    handler: async (args) => {
      const resolution = args.resolution ?? { width: 1920, height: 1080 };
      const cameraZ = args.cameraZ ?? 1000;
      const { width } = resolution;
      // Fractions of frame width; center is 0.
      const lateral: Record<string, number> = {
        left: -0.32, center_left: -0.16, center: 0, center_right: 0.16, right: 0.32
      };

      const placements = args.characters.map(character => {
        const depth = character.depth ?? 10;
        const parallax = parallaxFactor(depth, cameraZ);
        // Perspective scale IS the parallax factor: both follow
        // cameraZ / (cameraZ - depth). A subject closer to the camera has a larger
        // factor, so it both moves faster during a pan and appears bigger.
        // (Inverting this made near characters render smaller than far ones.)
        const perspectiveScale = parallax;
        const position = character.position ?? 'center';
        return {
          name: character.name,
          position,
          depth,
          x: Math.round(width * lateral[position]),
          y: 0,
          z: depth,
          perspectiveScale: Number(perspectiveScale.toFixed(4)),
          pegName: `${character.name}_Master_P`
        };
      });

      // Two characters at the same depth and lateral slot will overlap.
      const collisions: Array<{ a: string; b: string; detail: string }> = [];
      for (let i = 0; i < placements.length; i++) {
        for (let j = i + 1; j < placements.length; j++) {
          const a = placements[i], b = placements[j];
          if (Math.abs(a.x - b.x) < width * 0.08 && Math.abs(a.depth - b.depth) < 1) {
            collisions.push({
              a: a.name, b: b.name,
              detail: 'Одинаковая глубина и почти одинаковая позиция по X — персонажи перекроются.'
            });
          }
        }
      }

      return {
        ...createStandardExecutionResult({
          status: collisions.length === 0 ? 'success' : 'partial_success',
          simulated: false,
          isRealHarmonyExecution: false,
          warnings: collisions.map(c => `${c.a} / ${c.b}: ${c.detail}`),
          details: { sceneId: args.sceneId, placements, collisions }
        }),
        verification: 'verified_real',
        note: 'Позиции и масштабы вычислены реально. Применение к сцене требует Harmony.'
      };
    }
  }),

  defineTool({
    name: 'harmony.layout.build_multiplane',
    description: 'Построить Multiplane: Z-уровни, параллакс и порядок композита (реальная математика).',
    inputSchema: z.object({
      sceneId: z.string(),
      cameraZ: z.number().optional().default(1000),
      panDistance: z.number().optional().default(0)
        .describe('Планируемый сдвиг камеры по X — для расчёта смещения каждого плана.')
    }),
    handler: async (args) => {
      const cameraZ = args.cameraZ ?? 1000;
      const panDistance = args.panDistance ?? 0;
      const levels = MULTIPLANE_LAYERS.map(layer => {
        const parallax = parallaxFactor(layer.depth, cameraZ);
        return {
          name: layer.name,
          depth: layer.depth,
          parallaxFactor: Number(parallax.toFixed(4)),
          // How far this plane travels when the camera pans panDistance.
          apparentShift: Number((panDistance * parallax).toFixed(2)),
          pegName: `${args.sceneId}_${layer.name}_P`
        };
      });

      // Far planes must move less than near planes, or depth reads inverted.
      const ordered = [...levels].sort((a, b) => a.depth - b.depth);
      const monotonic = ordered.every((level, index) =>
        index === 0 || Math.abs(level.apparentShift) >= Math.abs(ordered[index - 1].apparentShift) - 1e-6
      );

      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          details: {
            sceneId: args.sceneId,
            cameraZ,
            multiplaneZLevels: levels.map(l => l.depth),
            levels,
            compositeOrder: ordered.map(l => l.name),
            parallaxMonotonic: monotonic
          }
        }),
        verification: 'verified_real',
        note: 'Z-раскладка и параллакс рассчитаны реально. Создание Multiplane-нод требует Harmony.'
      };
    }
  }),

  defineTool({
    name: 'harmony.camera.plan',
    description: 'Спланировать движение камеры: размер кадра, Z, кейфреймы (реальный расчёт).',
    inputSchema: z.object({
      shotId: z.string(),
      shotSize: shotSizeSchema.optional().default('medium_shot'),
      movement: z.enum(['static', 'push_in', 'pull_out', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down'])
        .optional().default('static'),
      durationFrames: z.number().int().positive().optional().default(48),
      fps: z.number().positive().optional().default(24),
      easing: z.enum(['linear', 'ease_in_out']).optional().default('ease_in_out')
    }),
    handler: async (args) => {
      const shotSize = args.shotSize ?? 'medium_shot';
      const movement = args.movement ?? 'static';
      const durationFrames = args.durationFrames ?? 48;
      const fps = args.fps ?? 24;
      const easing = args.easing ?? 'ease_in_out';
      const scale = SHOT_SIZE_SCALES[shotSize];
      // Harmony camera Z from framing scale: a tighter shot sits closer in.
      const baseZ = 1000 / scale;

      const deltas: Record<string, { x: number; y: number; z: number }> = {
        static: { x: 0, y: 0, z: 0 },
        push_in: { x: 0, y: 0, z: -baseZ * 0.18 },
        pull_out: { x: 0, y: 0, z: baseZ * 0.18 },
        pan_left: { x: -240, y: 0, z: 0 },
        pan_right: { x: 240, y: 0, z: 0 },
        tilt_up: { x: 0, y: 140, z: 0 },
        tilt_down: { x: 0, y: -140, z: 0 }
      };
      const delta = deltas[movement];

      const from = { x: 0, y: 0, z: baseZ };
      const to = { x: delta.x, y: delta.y, z: baseZ + delta.z };
      const keyframes = interpolateMove(1, durationFrames, from, to, easing);

      const details = {
        shotId: args.shotId,
        shotSize,
        cameraScale: scale,
        movement,
        durationFrames,
        durationSeconds: Number((durationFrames / fps).toFixed(3)),
        from,
        to,
        easing,
        // Only the endpoints are needed in Harmony; the full curve is provided
        // for inspection and validation.
        harmonyKeyframes: [keyframes[0], keyframes[keyframes.length - 1]],
        keyframeCount: keyframes.length,
        keyframes
      };

      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          details: { ...details, planId: planId('cam', details) }
        }),
        verification: 'verified_real',
        note: 'Траектория вычислена реально. Применение кейфреймов требует Harmony.'
      };
    }
  }),

  defineTool({
    name: 'harmony.camera.apply',
    description: 'Применить кейфреймы камеры в Harmony (строит и валидирует план команд).',
    inputSchema: z.object({
      sceneId: z.string(),
      keyframes: z.array(z.object({
        frame: z.number().int().positive(),
        x: z.number(),
        y: z.number(),
        z: z.number()
      })).min(1)
    }),
    handler: async (args) => {
      // Validate the plan for real before declaring anything about Harmony.
      const sorted = [...args.keyframes].sort((a, b) => a.frame - b.frame);
      const duplicateFrames = sorted
        .filter((kf, i) => i > 0 && kf.frame === sorted[i - 1].frame)
        .map(kf => kf.frame);

      const commands = sorted.flatMap(kf => ([
        { command: 'set_transform_keyframe', nodePath: `${args.sceneId}/Camera_P`, frame: kf.frame, attribute: 'position.x', value: kf.x },
        { command: 'set_transform_keyframe', nodePath: `${args.sceneId}/Camera_P`, frame: kf.frame, attribute: 'position.y', value: kf.y },
        { command: 'set_transform_keyframe', nodePath: `${args.sceneId}/Camera_P`, frame: kf.frame, attribute: 'position.z', value: kf.z }
      ]));

      if (duplicateFrames.length > 0) {
        return createStandardExecutionResult({
          status: 'blocked',
          simulated: false,
          isRealHarmonyExecution: false,
          errors: [`Дублирующиеся кадры в кейфреймах: ${[...new Set(duplicateFrames)].join(', ')}`],
          details: { sceneId: args.sceneId }
        });
      }

      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          requiresRealHarmony: true,
          details: {
            sceneId: args.sceneId,
            keyframeCount: sorted.length,
            frameRange: { start: sorted[0].frame, end: sorted[sorted.length - 1].frame },
            commandCount: commands.length,
            commands,
            planId: planId('camapply', commands)
          }
        }),
        verification: 'implemented_unverified',
        note: 'План команд построен и провалидирован. Выполнение требует лицензированной Harmony.'
      };
    }
  }),

  defineTool({
    name: 'harmony.camera.generate_push_in',
    description: 'Создать наезд камеры: реальная интерполяция Z с easing.',
    inputSchema: z.object({
      nodePath: z.string(),
      startZ: z.number().optional().default(12),
      endZ: z.number().optional().default(10),
      durationFrames: z.number().int().positive().optional().default(48),
      easing: z.enum(['linear', 'ease_in_out']).optional().default('ease_in_out')
    }),
    handler: async (args) => {
      const startZ = args.startZ ?? 12;
      const endZ = args.endZ ?? 10;
      const durationFrames = args.durationFrames ?? 48;
      const easing = args.easing ?? 'ease_in_out';

      const keyframes = interpolateMove(
        1, durationFrames,
        { x: 0, y: 0, z: startZ },
        { x: 0, y: 0, z: endZ },
        easing
      ).map(kf => ({ frame: kf.frame, z: Number(kf.z.toFixed(4)) }));

      const direction = endZ < startZ ? 'push_in' : endZ > startZ ? 'pull_out' : 'static';

      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          warnings: direction === 'static' ? ['startZ равен endZ — движения не будет.'] : [],
          details: {
            nodePath: args.nodePath,
            startZ,
            endZ,
            direction,
            zTravel: Number(Math.abs(endZ - startZ).toFixed(4)),
            easing,
            keyframeCount: keyframes.length,
            keyframes
          }
        }),
        verification: 'verified_real',
        note: 'Кривая наезда рассчитана реально. Применение требует Harmony.'
      };
    }
  }),

  defineTool({
    name: 'harmony.camera.generate_pan',
    description: 'Создать панорамирование: реальная интерполяция X/Y с easing.',
    inputSchema: z.object({
      nodePath: z.string(),
      startX: z.number(),
      endX: z.number(),
      startY: z.number().optional().default(0),
      endY: z.number().optional().default(0),
      durationFrames: z.number().int().positive().optional().default(48),
      easing: z.enum(['linear', 'ease_in_out']).optional().default('ease_in_out'),
      fps: z.number().positive().optional().default(24)
    }),
    handler: async (args) => {
      const startY = args.startY ?? 0;
      const endY = args.endY ?? 0;
      const durationFrames = args.durationFrames ?? 48;
      const easing = args.easing ?? 'ease_in_out';
      const fps = args.fps ?? 24;

      const keyframes = interpolateMove(
        1, durationFrames,
        { x: args.startX, y: startY, z: 0 },
        { x: args.endX, y: endY, z: 0 },
        easing
      ).map(kf => ({ frame: kf.frame, x: Number(kf.x.toFixed(4)), y: Number(kf.y.toFixed(4)) }));

      const distance = Math.hypot(args.endX - args.startX, endY - startY);
      const seconds = durationFrames / fps;
      const pixelsPerFrame = distance / durationFrames;

      // Fast pans strobe on 2D artwork; 40 px/frame is a practical ceiling.
      const warnings: string[] = [];
      if (pixelsPerFrame > 40) {
        warnings.push(`Скорость панорамы ${pixelsPerFrame.toFixed(1)} px/кадр — возможен стробинг. Увеличьте длительность.`);
      }
      if (distance === 0) warnings.push('Начальная и конечная точки совпадают — движения не будет.');

      return {
        ...createStandardExecutionResult({
          status: 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          warnings,
          details: {
            nodePath: args.nodePath,
            from: { x: args.startX, y: startY },
            to: { x: args.endX, y: endY },
            distance: Number(distance.toFixed(2)),
            durationSeconds: Number(seconds.toFixed(3)),
            pixelsPerFrame: Number(pixelsPerFrame.toFixed(2)),
            easing,
            keyframeCount: keyframes.length,
            keyframes
          }
        }),
        verification: 'verified_real',
        note: 'Кривая панорамы рассчитана реально. Применение требует Harmony.'
      };
    }
  }),

  defineTool({
    name: 'harmony.camera.validate',
    description: 'Проверить safe areas, headroom и look room по реальной геометрии кадра.',
    inputSchema: z.object({
      shotId: z.string(),
      resolution: z.object({ width: z.number().positive(), height: z.number().positive() })
        .optional().default({ width: 1920, height: 1080 }),
      shotSize: shotSizeSchema.optional().default('medium_shot'),
      subjects: z.array(z.object({
        name: z.string(),
        // Frame-relative bounding box, 0..1 from top-left.
        x: z.number(), y: z.number(), width: z.number(), height: z.number(),
        facing: z.enum(['left', 'right', 'front']).optional().default('front')
      })).optional().default([])
    }),
    handler: async (args) => {
      const resolution = args.resolution ?? { width: 1920, height: 1080 };
      const shotSize = args.shotSize ?? 'medium_shot';
      const subjects = args.subjects ?? [];
      const issues: Array<{ subject: string; rule: string; detail: string; severity: 'error' | 'warning' }> = [];
      const actionMargin = (1 - ACTION_SAFE) / 2;
      const titleMargin = (1 - TITLE_SAFE) / 2;

      for (const subject of subjects) {
        const right = subject.x + subject.width;
        const bottom = subject.y + subject.height;

        if (subject.x < actionMargin || right > 1 - actionMargin
            || subject.y < actionMargin || bottom > 1 - actionMargin) {
          issues.push({
            subject: subject.name, rule: 'action_safe',
            detail: 'Субъект выходит за action-safe область (93%).',
            severity: 'error'
          });
        } else if (subject.x < titleMargin || right > 1 - titleMargin
                   || subject.y < titleMargin || bottom > 1 - titleMargin) {
          issues.push({
            subject: subject.name, rule: 'title_safe',
            detail: 'Субъект выходит за title-safe область (90%).',
            severity: 'warning'
          });
        }

        // Headroom only meaningful on tighter framings.
        const tight = ['extreme_close_up', 'close_up', 'medium_close_up', 'medium_shot'].includes(shotSize);
        if (tight) {
          if (subject.y < 0.02) {
            issues.push({
              subject: subject.name, rule: 'headroom',
              detail: 'Слишком мало места над головой — кадр обрезает макушку.',
              severity: 'error'
            });
          } else if (subject.y > 0.25) {
            issues.push({
              subject: subject.name, rule: 'headroom',
              detail: `Избыточный headroom (${(subject.y * 100).toFixed(0)}% кадра сверху).`,
              severity: 'warning'
            });
          }
        }

        // Look room: a subject facing left needs space on the left.
        const facing = subject.facing ?? 'front';
        if (facing !== 'front') {
          const centreX = subject.x + subject.width / 2;
          const roomAhead = facing === 'left' ? centreX : 1 - centreX;
          if (roomAhead < 0.35) {
            issues.push({
              subject: subject.name, rule: 'look_room',
              detail: `Мало места по направлению взгляда (${(roomAhead * 100).toFixed(0)}%). Нужно ≥35%.`,
              severity: 'warning'
            });
          }
        }
      }

      const errors = issues.filter(i => i.severity === 'error');
      return {
        ...createStandardExecutionResult({
          status: errors.length === 0 ? 'success' : 'partial_success',
          simulated: false,
          isRealHarmonyExecution: false,
          errors: errors.map(e => `${e.subject}/${e.rule}: ${e.detail}`),
          warnings: issues.filter(i => i.severity === 'warning').map(w => `${w.subject}/${w.rule}: ${w.detail}`),
          details: {
            shotId: args.shotId,
            shotSize,
            resolution,
            subjectCount: subjects.length,
            // Honest: with no subjects supplied nothing was actually checked.
            safeAreasValid: subjects.length > 0 ? errors.length === 0 : null,
            evaluated: subjects.length > 0,
            safeAreas: {
              actionSafe: { fraction: ACTION_SAFE, marginFraction: actionMargin },
              titleSafe: { fraction: TITLE_SAFE, marginFraction: titleMargin }
            },
            issues
          }
        }),
        verification: 'verified_real',
        note: subjects.length === 0
          ? 'Субъекты не переданы — проверять было нечего (safeAreasValid=null).'
          : 'Проверка выполнена по реальной геометрии кадра.'
      };
    }
  }),

  defineTool({
    name: 'harmony.background.generate',
    description: 'Сгенерировать фон локации (требует image-бэкенда).',
    inputSchema: z.object({
      locationId: z.string(),
      prompt: z.string().describe('Описание стиля/содержания фона.'),
      outputPath: z.string().optional()
    }),
    handler: async (args) => {
      // Image synthesis needs a real backend; see backends/imageBackend.ts.
      const { generateBackground } = await import('../adapters/backends/imageBackend.js');
      const result = await generateBackground(args.locationId, args.prompt, args.outputPath);
      return {
        ...createStandardExecutionResult({
          status: result.origin === 'real' ? 'success' : 'simulation_success',
          simulated: result.origin !== 'real',
          placeholder: result.origin !== 'real',
          isRealHarmonyExecution: false,
          artifacts: result.outputPath ? [result.outputPath] : [],
          details: { locationId: args.locationId, bgPath: result.outputPath, origin: result.origin }
        }),
        verification: result.origin === 'real' ? 'verified_real' : 'mock_only'
      };
    }
  }),

  defineTool({
    name: 'harmony.background.import',
    description: 'Импортировать фон: реальная проверка файла, размеров и SHA-256.',
    inputSchema: z.object({
      filePath: z.string(),
      locationId: z.string().optional()
    }),
    handler: async (args) => {
      const resolved = verifyPathAccess(args.filePath);
      if (!fs.existsSync(resolved)) {
        return createStandardExecutionResult({
          status: 'blocked',
          simulated: false,
          isRealHarmonyExecution: false,
          errors: [`[FILE_NOT_FOUND] Файл фона не найден: ${resolved}`],
          details: { filePath: resolved }
        });
      }

      const stats = fs.statSync(resolved);
      const bytes = fs.readFileSync(resolved);
      const digest = crypto.createHash('sha256').update(bytes).digest('hex');

      // Magic-byte sniffing: extension alone does not prove format.
      let format = 'unknown';
      if (bytes.length > 8 && bytes[0] === 0x89 && bytes.toString('ascii', 1, 4) === 'PNG') format = 'png';
      else if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) format = 'jpeg';
      else if (bytes.length > 4 && bytes.toString('ascii', 0, 4) === '<svg') format = 'svg';
      else if (bytes.toString('ascii', 0, 5).includes('<?xml') && bytes.toString('ascii', 0, 300).includes('<svg')) format = 'svg';

      const warnings: string[] = [];
      if (format === 'unknown') {
        warnings.push('Формат не распознан по magic bytes — файл может быть повреждён или не изображение.');
      }
      if (stats.size === 0) warnings.push('Файл пустой.');

      return {
        ...createStandardExecutionResult({
          status: format === 'unknown' || stats.size === 0 ? 'partial_success' : 'success',
          simulated: false,
          isRealHarmonyExecution: false,
          warnings,
          artifacts: [resolved],
          details: {
            importedBgPath: resolved,
            locationId: args.locationId ?? path.basename(resolved, path.extname(resolved)),
            sizeBytes: stats.size,
            sha256: digest,
            detectedFormat: format
          }
        }),
        verification: 'verified_real',
        note: 'Файл проверен реально. Помещение в сцену требует Harmony.'
      };
    }
  }),

  defineTool({
    name: 'harmony.background.publish_location',
    description: 'Опубликовать локацию в библиотеку фонов: реальная запись и хеш.',
    inputSchema: z.object({
      locationId: z.string(),
      sourcePaths: z.array(z.string()).min(1).describe('Файлы слоёв фона.'),
      libraryDir: z.string().optional().describe('Каталог библиотеки. По умолчанию output/background_library.')
    }),
    handler: async (args) => {
      const libraryDir = verifyPathAccess(
        args.libraryDir ?? path.join(process.cwd(), 'output', 'background_library')
      );
      const locationDir = path.join(libraryDir, args.locationId);
      fs.mkdirSync(locationDir, { recursive: true });

      const layers: Array<{ source: string; published: string; sizeBytes: number; sha256: string }> = [];
      const missing: string[] = [];

      for (const sourcePath of args.sourcePaths) {
        const resolved = verifyPathAccess(sourcePath);
        if (!fs.existsSync(resolved)) {
          missing.push(resolved);
          continue;
        }
        const bytes = fs.readFileSync(resolved);
        const target = path.join(locationDir, path.basename(resolved));
        fs.writeFileSync(target, bytes);
        layers.push({
          source: resolved,
          published: target,
          sizeBytes: bytes.length,
          sha256: crypto.createHash('sha256').update(bytes).digest('hex')
        });
      }

      if (layers.length === 0) {
        return createStandardExecutionResult({
          status: 'blocked',
          simulated: false,
          isRealHarmonyExecution: false,
          errors: [`Ни один файл не найден: ${missing.join(', ')}`],
          details: { locationId: args.locationId }
        });
      }

      // Content-addressed manifest so a republish is detectable.
      const manifest = {
        schemaVersion: '1.0',
        locationId: args.locationId,
        publishedAt: new Date().toISOString(),
        layerCount: layers.length,
        layers,
        locationDigest: crypto.createHash('sha256')
          .update(layers.map(l => l.sha256).sort().join(''))
          .digest('hex')
      };
      const manifestPath = path.join(locationDir, 'location_manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

      return {
        ...createStandardExecutionResult({
          status: missing.length === 0 ? 'success' : 'partial_success',
          simulated: false,
          isRealHarmonyExecution: false,
          warnings: missing.map(m => `Файл не найден и не опубликован: ${m}`),
          artifacts: [manifestPath, ...layers.map(l => l.published)],
          details: { ...manifest, manifestPath, published: true, missing }
        }),
        verification: 'verified_real'
      };
    }
  })
];
