import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import {
  MohoActionRecorder,
  type MohoActionRecorderConfig,
  type MohoCaptureSession,
  type MohoRecorderInstruction,
  type MohoRecorderPatchEntry,
  type MohoRawEvent,
  type MohoRigType,
  type MohoInstructionType,
  MOHO_ACTION_RECORDER_VERSION
} from '../services/mohoActionRecorder/index.js';
import { type MohoRetakeManifest } from '../schemas/mohoRetakeManifest.js';
import { HarmonyError } from '../security.js';

const rigTypeSchema = z
  .enum(['humanoid_2leg', 'quadruped', 'creature', 'mechanical'])
  .describe('Тип рига Moho (enum, согласован со схемой MohoRetakeManifest).');

const startSessionInputSchema = z.object({
  shotId: z.string().min(1).describe('Идентификатор шота, для которого открывается сессия записи.'),
  rigType: rigTypeSchema.describe('Тип рига Moho, к которому относится сессия.'),
  evidenceDir: z.string().describe('Корневой каталог, в котором создаётся подкаталог <sessionId> с артефактами.'),
  sessionId: z.string().optional().describe('Явный идентификатор сессии (UUID). Если не задан, генерируется автоматически.'),
  operatorId: z.string().optional().describe('Опциональный идентификатор оператора/аниматора, выполняющего запись.'),
  dryRun: z.boolean().optional().describe('Если true — сессия закрывается со статусом dry_run и frame-state помечается как noop.')
}).strict();

const recordInstructionInputSchema = z.object({
  sessionId: z.string().min(1).describe('Идентификатор открытой сессии записи.'),
  evidenceDir: z.string().describe('Корневой каталог артефактов (для восстановления сессии).'),
  type: z
    .enum([
      'capture_frame',
      'capture_perframe',
      'pause',
      'resume',
      'snapshot_before',
      'snapshot_after',
      'apply_retake',
      'abort'
    ])
    .describe('Тип инструкции аниматора/супервайзера.'),
  frame: z.number().int().describe('Номер кадра, к которому привязана инструкция.'),
  note: z.string().describe('Текст инструкции в свободной форме.')
}).strict();

const captureFrameStateInputSchema = z.object({
  sessionId: z.string().min(1).describe('Идентификатор открытой сессии записи.'),
  evidenceDir: z.string().describe('Корневой каталог артефактов.'),
  frame: z.number().int().describe('Номер кадра, состояние которого нужно зафиксировать.')
}).strict();

const addRetakePatchInputSchema = z.object({
  sessionId: z.string().min(1).describe('Идентификатор открытой сессии записи.'),
  evidenceDir: z.string().describe('Корневой каталог артефактов.'),
  retakeManifest: z.record(z.any()).describe('Moho Retake Manifest (произвольный JSON-объект манифеста ретейка).'),
  notes: z.string().describe('Свободные заметки супервайзера/аниматора, описывающие контекст патча.')
}).strict();

const sessionIdInputSchema = z.object({
  sessionId: z.string().min(1).describe('Идентификатор открытой сессии записи.'),
  evidenceDir: z.string().describe('Корневой каталог артефактов.')
}).strict();

type StartSessionArgs = z.infer<typeof startSessionInputSchema>;
type RecordInstructionArgs = z.infer<typeof recordInstructionInputSchema>;
type CaptureFrameStateArgs = z.infer<typeof captureFrameStateInputSchema>;
type AddRetakePatchArgs = z.infer<typeof addRetakePatchInputSchema>;
type SessionIdArgs = z.infer<typeof sessionIdInputSchema>;

function safeId(value: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new HarmonyError('INVALID_INPUT', `Invalid sessionId: ${value}`);
  }
  return value;
}

function sessionFilePath(evidenceDir: string, sessionId: string): string {
  return path.join(path.resolve(evidenceDir), safeId(sessionId), 'session.json');
}

function loadSessionConfig(evidenceDir: string, sessionId: string): MohoActionRecorderConfig {
  const filePath = sessionFilePath(evidenceDir, sessionId);
  if (!fs.existsSync(filePath)) {
    throw new HarmonyError('CAPTURE_SESSION_NOT_FOUND', `Session ${sessionId} not found at ${filePath}`);
  }
  const session = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as MohoCaptureSession;
  const parent = path.dirname(path.dirname(filePath));
  return {
    evidenceDir: parent,
    sessionId: session.sessionId,
    shotId: session.shotId,
    rigType: session.rigType,
    beforeSnapshotId: session.beforeSnapshotId,
    operatorId: session.operatorId,
    dryRun: session.status === 'dry_run'
  };
}

function reconstructRecorder(evidenceDir: string, sessionId: string): MohoActionRecorder {
  return MohoActionRecorder.loadFromDisk(evidenceDir, sessionId);
}

function envelope<T>(code: string, err: unknown): { status: 'error'; code: string; message: string } {
  return {
    status: 'error',
    code: (err as any)?.code ?? code,
    message: (err as any)?.message ?? String(err)
  };
}

export const mohoActionRecorderTools = [
  {
    name: 'moho.recorder.start_session',
    description:
      'Открыть новую сессию Moho Action Recorder (' + MOHO_ACTION_RECORDER_VERSION + ') для указанного ' +
      'шоты и типа рига. Создаёт каталог артефактов <evidenceDir>/<sessionId>/, генерирует sessionId, ' +
      'инициализирует session.json со статусом recording и пустые events.jsonl/patches.json. ' +
      'Только файловая система — никаких побочных эффектов на сцену Moho. dryRun=true помечает сессию ' +
      'как тренировочную (после stop() она получает статус dry_run).',
    inputSchema: startSessionInputSchema,
    handler: async (args: StartSessionArgs): Promise<
      | { status: 'success'; session: MohoCaptureSession }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const cfg: MohoActionRecorderConfig = {
          shotId: args.shotId,
          rigType: args.rigType as MohoRigType,
          evidenceDir: path.resolve(args.evidenceDir),
          sessionId: args.sessionId,
          operatorId: args.operatorId,
          dryRun: args.dryRun ?? false
        };
        const recorder = new MohoActionRecorder(cfg);
        const session = recorder.start();
        return { status: 'success', session };
      } catch (err: unknown) {
        return envelope('MOHO_RECORDER_START_FAILED', err);
      }
    }
  },

  {
    name: 'moho.recorder.record_instruction',
    description:
      'Записать инструкцию аниматора/супервайзера в открытую сессию. Инструкция — это типизированная ' +
      'заметка, привязанная к конкретному кадру, и единственный источник художественного интента в ' +
      'итоговом датасете. Сессия должна быть в статусе recording; иначе возвращается ошибка. ' +
      'Типы инструкции (snapshot_before/snapshot_after) фиксируются в session.beforeSnapshotId / ' +
      'session.afterSnapshotId.',
    inputSchema: recordInstructionInputSchema,
    handler: async (args: RecordInstructionArgs): Promise<
      | { status: 'success'; instruction: MohoRecorderInstruction }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const recorder = reconstructRecorder(args.evidenceDir, args.sessionId);
        const instruction = recorder.recordInstruction({
          type: args.type as MohoInstructionType,
          frame: args.frame,
          note: args.note
        });
        return { status: 'success', instruction };
      } catch (err: unknown) {
        return envelope('MOHO_RECORDER_RECORD_INSTRUCTION_FAILED', err);
      }
    }
  },

  {
    name: 'moho.recorder.capture_frame_state',
    description:
      'Зафиксировать состояние кадра в открытой сессии через IPC-бридж (по умолчанию noop). ' +
      'Под капотом автоматически создаёт инструкцию типа capture_frame и эмитит raw-event с ' +
      'kind=frame_state, который дописывается в events.jsonl. Сессия должна быть в статусе recording.',
    inputSchema: captureFrameStateInputSchema,
    handler: async (args: CaptureFrameStateArgs): Promise<
      | { status: 'success'; event: MohoRawEvent }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const recorder = reconstructRecorder(args.evidenceDir, args.sessionId);
        const event = recorder.captureFrameState(args.frame);
        return { status: 'success', event };
      } catch (err: unknown) {
        return envelope('MOHO_RECORDER_CAPTURE_FRAME_FAILED', err);
      }
    }
  },

  {
    name: 'moho.recorder.add_retake_patch',
    description:
      'Прикрепить Moho Retake Manifest к открытой сессии вместе со свободным комментарием. ' +
      'Возвращает запись (patchId, retakeManifest, notes, recordedAt), которая попадает в ' +
      'patches.json сессии и автоматически порождает инструкцию типа apply_retake. Сессия должна ' +
      'быть в статусе recording или stopped.',
    inputSchema: addRetakePatchInputSchema,
    handler: async (args: AddRetakePatchArgs): Promise<
      | { status: 'success'; entry: MohoRecorderPatchEntry }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const recorder = reconstructRecorder(args.evidenceDir, args.sessionId);
        const entry = recorder.addRetakePatch(args.retakeManifest as unknown as MohoRetakeManifest, args.notes);
        return { status: 'success', entry };
      } catch (err: unknown) {
        return envelope('MOHO_RECORDER_ADD_RETAKE_FAILED', err);
      }
    }
  },

  {
    name: 'moho.recorder.commit_session',
    description:
      'Перевести сессию из stopped/dry_run в финальный статус committed. После commit дальнейшие ' +
      'записи (recordInstruction / captureFrameState / addRetakePatch / stop / commit / abort) ' +
      'заблокированы — сессия становится неизменяемым артефактом. Не может быть вызван для сессий ' +
      'со статусом recording или aborted (сначала вызовите stop).',
    inputSchema: sessionIdInputSchema,
    handler: async (args: SessionIdArgs): Promise<
      | { status: 'success'; session: MohoCaptureSession }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const recorder = reconstructRecorder(args.evidenceDir, args.sessionId);
        const session = recorder.commit();
        return { status: 'success', session };
      } catch (err: unknown) {
        return envelope('MOHO_RECORDER_COMMIT_FAILED', err);
      }
    }
  },

  {
    name: 'moho.recorder.abort_session',
    description:
      'Прервать сессию записи со статусом aborted. Рекомендуется вызывать при отмене съёмки/теста, ' +
      'чтобы явно зафиксировать факт прерывания и заблокировать дальнейшие записи.',
    inputSchema: sessionIdInputSchema,
    handler: async (args: SessionIdArgs): Promise<
      | { status: 'success'; session: MohoCaptureSession }
      | { status: 'error'; code: string; message: string }
    > => {
      try {
        const recorder = reconstructRecorder(args.evidenceDir, args.sessionId);
        const session = recorder.abort();
        return { status: 'success', session };
      } catch (err: unknown) {
        return envelope('MOHO_RECORDER_ABORT_FAILED', err);
      }
    }
  }
];