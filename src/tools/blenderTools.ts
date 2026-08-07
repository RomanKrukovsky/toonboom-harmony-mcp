/**
 * blenderTools.ts — MCP-тулы вокруг доказанного Blender-конвейера.
 *
 * ПОЧЕМУ ЭТИ ТУЛЫ ОСМЫСЛЕННЫ, А 528 ОСТАЛЬНЫХ ПОКА НЕТ. Ценность
 * MCP-тула равна ценности того, к чему он подключён. Тулы Harmony
 * обёрнуты вокруг приложения, которое на этой машине не запускается
 * (нет лицензии FlexNet). Эти обёрнуты вокруг Blender 5.1.1, где
 * конвейер доказан пятью пробами до пикселей.
 *
 * ЧТО ТУЛ ДОБАВЛЯЕТ К `python3 smoke_full_shot.py`:
 *   - схему: пивот-строкой вместо числа ловится ДО запуска Blender,
 *     а не через минуту рендера;
 *   - проверку набора рисунков ОТДЕЛЬНО от сборки, чтобы художник узнал
 *     про отсутствие альфы до того, как ждал рендер;
 *   - различение бед: нет Blender / плохой набор / упал рендер — это три
 *     разных действия для человека, а не одно слово «ошибка»;
 *   - вызов из любого клиента, а не из одной папки в терминале.
 *
 * ЧЕГО ТУТ НЕТ: семантики ремесла. Изинги, риг, липсинк, проверки
 * рисунков живут в питоне под 343 тестами. Вторая копия правил стала бы
 * второй правдой.
 */

import { z } from 'zod';
import {
  blenderStatus,
  clientDir,
  pipelineStatus,
  pyStr,
  runPython,
} from '../adapters/blenderPipeline.js';
import { defineTool } from './defineTool.js';

/** Общая преамбула: конвейер лежит рядом, импортируем как есть. */
const PRELUDE = 'import json, sys\n';

function fail(code: string, message: string, remedy?: string) {
  return { ok: false, error: { code, message, remedy } };
}

/** Проверка окружения перед любой реальной работой. */
function envOrError() {
  const b = blenderStatus();
  if (!b.present) {
    return fail('NO_BLENDER', b.detail,
      'Install Blender or point BLENDER_BIN at the executable.');
  }
  const p = pipelineStatus();
  if (!p.present) {
    return fail('NO_PIPELINE',
      `pipeline files missing in ${p.dir}: ${p.missing.join(', ')}`,
      'Set HARMONY_CLIENT_DIR to the harmony/client directory.');
  }
  return null;
}

export const blenderTools = [
  defineTool({
    name: 'harmony.blender.status',
    description:
      'Готовность Blender-конвейера: есть ли Blender, на месте ли питоновские модули, ' +
      'какая версия. Безопасно, ничего не меняет. Вызывать первым — остальные тулы ' +
      'этой группы зависят от результата.',
    inputSchema: z.object({}),
    handler: async () => {
      const b = blenderStatus();
      const p = pipelineStatus();
      let version: string | undefined;
      if (b.present) {
        const r = await runPython(
          PRELUDE +
          'from blender_host import blender_available\n' +
          'ok, msg = blender_available()\n' +
          'print(json.dumps({"ok": ok, "msg": msg}))\n', 120_000);
        version = r.json?.msg;
      }
      return {
        blender: { ...b, version },
        pipeline: p,
        ready: b.present && p.present,
        note: b.present && p.present
          ? 'Blender pipeline is usable. This is the only host in this project ' +
            'proven end to end — Harmony needs a licence it does not have here.'
          : 'Pipeline not ready; see fields above.',
      };
    },
  }),

  defineTool({
    name: 'harmony.blender.check_artwork',
    description:
      'Проверить набор рисунков художника (PNG с альфой + parts.json) ДО рендера. ' +
      'Ищет то, что в рендере не даёт сообщения об ошибке, а даёт странность: ' +
      'нет альфы, экспортирован не тот слой, пивот в пикселях вместо долей, ' +
      'цикл в иерархии, ничья по глубине. Ничего не меняет.',
    inputSchema: z.object({
      partsJson: z.string().min(1)
        .describe('путь к parts.json набора рисунков'),
    }),
    handler: async (a) => {
      const e = envOrError();
      if (e) return e;
      const r = await runPython(
        PRELUDE +
        'from artwork import ArtSet, validate, summary\n' +
        `art = ArtSet.load(${pyStr(a.partsJson)})\n` +
        'print(json.dumps(summary(validate(art)), ensure_ascii=False))\n',
        180_000);
      if (!r.ok || !r.json) {
        return fail('CHECK_FAILED', r.stderr.slice(-800) || r.stdout.slice(-400),
          'Check that parts.json exists and its images are readable.');
      }
      return { ok: true, ...r.json };
    },
  }),

  defineTool({
    name: 'harmony.blender.build_shot',
    description:
      'Собрать шот: рисунки художника + тайминг + необязательный липсинк и звук -> ' +
      'PNG-секвенция и (по желанию) MP4. Это тот самый конвейер, что доказан на живом ' +
      'Blender. Рисует художник; здесь только сборка и тайминг.',
    inputSchema: z.object({
      partsJson: z.string().min(1),
      outDir: z.string().min(1),
      frames: z.number().int().min(1).max(100_000),
      fps: z.number().int().min(1).max(120).optional(),
      resolution: z.tuple([z.number().int().min(64), z.number().int().min(64)])
        .optional(),
      /**
       * Каналы анимации: {"arm.rot": [[кадр, значение], ...]}.
       * Имя — "часть.свойство", свойства: rot, x, y, sx, sy.
       */
      channels: z.record(z.array(z.tuple([z.number(), z.number()]))).optional(),
      /** Липсинк: фонемы в секундах + карта фонема->вариант рта. */
      lipsync: z.object({
        phonemes: z.array(z.object({
          sound: z.string(), start: z.number().min(0), end: z.number().min(0),
        })).min(1),
        mouthMap: z.record(z.string()),
        group: z.string().optional(),
        defaultVariant: z.string().optional(),
      }).optional(),
      audio: z.string().optional().describe('WAV/AIFF дорожка в сцену и в MP4'),
      allowSilentLipsync: z.boolean().optional()
        .describe('разрешить липсинк без звука (осознанно: картинка сейчас, звук потом)'),
      cameraOrthoScale: z.number().positive().optional(),
      cameraLoc: z.tuple([z.number(), z.number()]).optional(),
      bgColor: z.tuple([z.number(), z.number(), z.number()]).optional(),
      render: z.boolean().optional(),
      encodeMp4: z.boolean().optional(),
      dryRun: z.boolean().optional(),
    }),
    handler: async (a) => {
      const e = envOrError();
      if (e) return e;
      const fps = a.fps ?? 24;
      const res = a.resolution ?? [1280, 720];

      // Липсинк без звуковой дорожки — почти всегда забытый аргумент, а не
      // замысел. Проверить попадание рта в звук без звука нельзя, и ролик
      // уйдёт немым; молча принять такой вызов значит отдать человеку
      // заведомо неполный результат. Разрешаем явным флагом, чтобы
      // остался путь «сначала картинка, звук потом».
      if (a.lipsync && !a.audio && !a.allowSilentLipsync) {
        return fail('LIPSYNC_WITHOUT_AUDIO',
          'lipsync was requested but no audio track was given — the mouth would ' +
          'move against silence and the MP4 would have no sound',
          'Pass audio:"/path/voice.wav", or set allowSilentLipsync:true if you ' +
          'deliberately want the picture first and sound later.');
      }

      if (a.dryRun) {
        // Показать намерение до того, как занимать машину на минуты.
        return {
          ok: true, dryRun: true,
          intent: {
            partsJson: a.partsJson, outDir: a.outDir,
            frames: a.frames, fps, resolution: res,
            channels: Object.keys(a.channels ?? {}),
            lipsync: a.lipsync ? `${a.lipsync.phonemes.length} phonemes` : null,
            audio: a.audio ?? null,
            willRender: a.render !== false,
            willEncode: !!a.encodeMp4,
          },
          note: 'Nothing was built. Call again with dryRun:false to run.',
        };
      }

      const cfg = {
        partsJson: a.partsJson, outDir: a.outDir, frames: a.frames, fps,
        resolution: res, channels: a.channels ?? {},
        lipsync: a.lipsync ?? null, audio: a.audio ?? null,
        cameraOrthoScale: a.cameraOrthoScale ?? 2.0,
        cameraLoc: a.cameraLoc ?? [0.0, 0.3],
        bgColor: a.bgColor ?? [0.07, 0.08, 0.10],
        render: a.render !== false, encodeMp4: !!a.encodeMp4,
      };

      const code = PRELUDE + `
from pathlib import Path
from artwork import ArtSet, image_part_specs, summary, validate
from audio import (AudioTrack, align_phonemes_to_frames, check_sync,
                   lipsync_channel, mux)
from blender_host import BSceneSpec, build_scene, channels_from_engine
from columns import Key
from drawings import Phoneme
from swaps import swap_groups_spec

cfg = json.loads(${pyStr(JSON.stringify(cfg))})
art = ArtSet.load(cfg["partsJson"])

# Набор проверяется ДО сборки: рендерить негодный набор — это минуты
# машинного времени в обмен на ту же ошибку.
check = summary(validate(art))
if not check["usable"]:
    print(json.dumps({"stage": "artwork", "ok": False, "check": check},
                     ensure_ascii=False))
    sys.exit(3)

channels = {}
for name, pairs in (cfg.get("channels") or {}).items():
    channels[name] = [Key(frame=float(f), value=float(v)) for f, v in pairs]

swaps, lip_note = [], None
ls = cfg.get("lipsync")
if ls:
    phon = [Phoneme(p["sound"], float(p["start"]), float(p["end"]))
            for p in ls["phonemes"]]
    rep = align_phonemes_to_frames(phon, fps=cfg["fps"])
    track = lipsync_channel(rep, ls["mouthMap"],
                            default=ls.get("defaultVariant") or "flat")
    group = ls.get("group") or "mouth"
    swaps = swap_groups_spec(art, {group: track}, frame_end=cfg["frames"])
    lip_note = rep.summary()

tracks, sync = [], None
if cfg.get("audio"):
    t = AudioTrack(cfg["audio"], 1, 1.0, "voice")
    t.validate()
    tracks.append(t.as_dict())
    # Длины сцены и звука обязаны совпадать. Иначе mux (намеренно без
    # -shortest) отдаёт ролик по ДЛИННОЙ дорожке: либо немой хвост, либо
    # обрезанная реплика. Тул уже знал это число и молчал о нём.
    try:
        sync = check_sync(cfg["frames"], cfg["fps"], cfg["audio"])
    except Exception as exc:
        sync = {"in_sync": None, "verdict": "could not probe audio: %s" % exc}

spec = BSceneSpec(
    name="shot", fps=cfg["fps"], frame_start=1, frame_end=cfg["frames"],
    resolution=tuple(cfg["resolution"]), parts=[],
    image_parts=image_part_specs(art), swap_groups=swaps,
    channels=channels_from_engine(channels),
    bg_color=tuple(cfg["bgColor"]),
    camera_ortho_scale=cfg["cameraOrthoScale"],
    camera_loc=tuple(cfg["cameraLoc"]),
    audio_tracks=tracks)

out = Path(cfg["outDir"])
rep = build_scene(spec, out, render=cfg["render"], frames=(1, cfg["frames"]))

mp4 = None
if cfg["encodeMp4"] and rep["frames_rendered"] > 0:
    target = out / "shot.mp4"
    if cfg.get("audio"):
        mux(out / "f%04d.png", cfg["audio"], target, cfg["fps"])
    else:
        import subprocess
        subprocess.run(["ffmpeg", "-y", "-framerate", str(cfg["fps"]),
                        "-i", str(out / "f%04d.png"), "-c:v", "libx264",
                        "-pix_fmt", "yuv420p", "-crf", "18", str(target)],
                       check=True, capture_output=True)
    mp4 = str(target)

print(json.dumps({
    "stage": "build", "ok": rep["returncode"] == 0,
    "returncode": rep["returncode"], "blend": rep["blend"],
    "framesRendered": rep["frames_rendered"], "mp4": mp4,
    "artworkCheck": {"errors": check["errors"], "warnings": check["warnings"]},
    "lipsync": lip_note, "sync": sync,
    "logTail": rep["log_tail"][-500:], "stderrTail": rep["stderr_tail"][-300:],
}, ensure_ascii=False))
`;
      const r = await runPython(code, 1_800_000);
      if (r.json?.stage === 'artwork') {
        return fail('BAD_ARTWORK',
          `the artwork set has ${r.json.check.errors} blocking problem(s)`,
          'Fix the findings below, then rebuild — rendering a broken set wastes minutes ' +
          'for the same error.') as any;
      }
      if (!r.ok || !r.json) {
        return fail('BUILD_FAILED',
          r.stderr.slice(-1000) || r.stdout.slice(-500),
          'See stderr above. A Python traceback here means the spec was rejected ' +
          'before Blender started.');
      }
      return { ok: r.json.ok, ...r.json };
    },
  }),

  defineTool({
    name: 'harmony.blender.selftest',
    description:
      'Прогнать пробы конвейера на живом Blender: движение, тайминг из движка, звук, ' +
      'рисунки, полный шот. Это единственная в проекте проверка, которая доходит до ' +
      'настоящих пикселей в настоящем приложении.',
    inputSchema: z.object({
      only: z.array(z.enum(['motion', 'timing', 'audio', 'artwork', 'full']))
        .optional(),
    }),
    handler: async (a) => {
      const e = envOrError();
      if (e) return e;
      const map: Record<string, string> = {
        motion: 'smoke_blender',
        timing: 'smoke_engine_to_blender',
        audio: 'smoke_audio_blender',
        artwork: 'smoke_artwork_blender',
        full: 'smoke_full_shot',
      };
      const want = a.only ?? Object.keys(map);
      const results: any[] = [];
      for (const key of want) {
        const mod = map[key];
        const r = await runPython(
          `import runpy, sys\nsys.argv = ["${mod}"]\n` +
          `runpy.run_module("${mod}", run_name="__main__")\n`, 900_000);
        const verdict = /(^|\n)PASS/.test(r.stdout) ? 'PASS'
          : /(^|\n)SKIP/.test(r.stdout) ? 'SKIP' : 'FAIL';
        results.push({
          probe: key, module: mod, verdict,
          // Последние строки: там и вердикт, и числа, по которым он вынесен.
          tail: r.stdout.trim().split('\n').slice(-4).join('\n'),
        });
      }
      const failed = results.filter((x) => x.verdict === 'FAIL');
      return {
        ok: failed.length === 0,
        dir: clientDir(),
        passed: results.filter((x) => x.verdict === 'PASS').length,
        failed: failed.length,
        results,
      };
    },
  }),
];
