import { z } from 'zod';
import {
  mohoRetakePatchSchema,
  mohoRetakeManifestSchema,
  type MohoRetakePatch
} from '../schemas/mohoRetakeManifest.js';

const validateInputSchema = z.object({
  retakeManifest: z.record(z.any()).describe('Произвольный JSON-объект манифеста ретейка для провалидирования.')
});

const createPatchInputSchema = z.object({
  targetRigType: z.enum(['humanoid_2leg', 'quadruped', 'creature', 'mechanical'])
    .describe('Тип рига, к которому применяется патч.'),
  boneId: z.number().int().optional()
    .describe('Числовой ID кости (если известен). Взаимоисключает с boneName при приоритете boneId.'),
  boneName: z.string().optional()
    .describe('Имя кости (если boneId не задан).'),
  channel: z.enum(['rotation', 'translation', 'scale', 'opacity'])
    .describe('Анимационный канал, в который пишется новое значение.'),
  frame: z.number().int().min(1)
    .describe('Номер кадра (>=1), к которому привязан патч.'),
  newValue: z.number()
    .describe('Новое значение канала в кадре (degrees для rotation, px для translation, множитель для scale, 0..1 для opacity).'),
  interpolation: z.enum(['linear', 'ease_in', 'ease_out', 'ease_in_out', 'step']).optional()
    .describe('Интерполяция на патче. По умолчанию ease_in_out.'),
  note: z.string().optional()
    .describe('Свободная ремарка супервайзера/аниматора к патчу.'),
  recordedBy: z.string()
    .describe('Идентификатор актора, записавшего патч (имя пользователя или ID системы).')
});

const canAutoApplyInputSchema = z.object({
  retakeManifest: z.record(z.any())
    .describe('Манифест ретейка, прошедший или ещё не прошедший валидацию.'),
  qaThresholds: z.record(z.any())
    .describe('Словарь порогов QA: severity/escalation/autoApproval и т.п., влияющий на гейтинг авто-применения.')
});

export const mohoRetakeManifestTools = [
  {
    name: 'moho.retake_manifest.validate',
    description:
      'Провалидировать Moho Retake Manifest против строгой Zod-схемы (версия 1.0). ' +
      'Проверяется структура, обязательные поля, типы, диапазоны (frame >= 1), enum-значения ' +
      'для rigType/channel/interpolation, формат recordedAt (ISO datetime) и запрет комбинации ' +
      'autoApplicable=true + severity=high. Возвращает { status: "valid" } при успехе и ' +
      '{ status: "invalid", errors: [...] } при наличии нарушений.',
    inputSchema: validateInputSchema,
    handler: async (args: { retakeManifest: object }): Promise<
      { status: 'valid' } | { status: 'invalid'; errors: string[] }
    > => {
      try {
        const result = mohoRetakeManifestSchema.safeParse(args.retakeManifest);
        if (result.success) {
          return { status: 'valid' };
        }
        const errors = result.error.issues.map(
          (i) => `${(i.path as (string | number)[]).join('.') || '?'}: ${i.message}`
        );
        return { status: 'invalid', errors };
      } catch (err: any) {
        return {
          status: 'invalid',
          errors: [err?.message ?? String(err)]
        };
      }
    }
  },
  {
    name: 'moho.retake_manifest.create_patch',
    description:
      'Собрать и провалидировать единичный MohoRetakePatch по тем же правилам, что используются ' +
      'в манифесте (targetRigType, channel, frame>=1, interpolation, формат recordedAt). ' +
      'Сгенерировать стабильный patchId (UUID v4), проставить recordedAt = текущий ISO-datetime, ' +
      'вернуть готовый патч для последующей вставки в MohoRetakeManifest.patches. ' +
      'При нарушении схемы — возвращается error-envelope с перечнем проблем.',
    inputSchema: createPatchInputSchema,
    handler: async (args: z.infer<typeof createPatchInputSchema>): Promise<
      | { status: 'success'; patch: MohoRetakePatch }
      | { status: 'error'; code: string; message: string; errors: string[] }
    > => {
      try {
        const candidate: MohoRetakePatch = {
          patchId: crypto.randomUUID(),
          targetRigType: args.targetRigType,
          boneId: args.boneId,
          boneName: args.boneName,
          channel: args.channel,
          frame: args.frame,
          newValue: args.newValue,
          interpolation: args.interpolation ?? 'ease_in_out',
          note: args.note,
          recordedBy: args.recordedBy,
          recordedAt: new Date().toISOString()
        };
        const parsed = mohoRetakePatchSchema.safeParse(candidate);
        if (!parsed.success) {
          const errors = parsed.error.issues.map(
            (i) => `${(i.path as (string | number)[]).join('.') || '?'}: ${i.message}`
          );
          return {
            status: 'error',
            code: 'MOHO_RETAKE_PATCH_INVALID',
            message: 'Параметры не прошли Zod-валидацию mohoRetakePatchSchema',
            errors
          };
        }
        return { status: 'success', patch: parsed.data };
      } catch (err: any) {
        return {
          status: 'error',
          code: 'MOHO_RETAKE_PATCH_CREATE_FAILED',
          message: err?.message ?? String(err),
          errors: []
        };
      }
    }
  },
  {
    name: 'moho.retake_manifest.can_auto_apply',
    description:
      'Определить, допустимо ли авто-применить Moho Retake Manifest без участия супервайзера. ' +
      'Манифест предварительно валидируется. Правила гейтинга: ' +
      '(1) severity=high + autoApplicable=true → false (явный запрет схемы); ' +
      '(2) severity=medium + autoApplicable=true → false, требуется human approval; ' +
      '(3) severity=low + autoApplicable=true → допускается, при условии что qaThresholds разрешают ' +
      'autoApproval для соответствующего severity; иначе — false с указанием причины. ' +
      'Возвращает canAutoApply и массив причин (reasons) для аудита.',
    inputSchema: canAutoApplyInputSchema,
    handler: async (args: { retakeManifest: object; qaThresholds: object }): Promise<
      | { status: 'success'; canAutoApply: boolean; reasons: string[] }
      | { status: 'error'; code: string; message: string; reasons: string[] }
    > => {
      try {
        const reasons: string[] = [];
        const validated = mohoRetakeManifestSchema.safeParse(args.retakeManifest);
        if (!validated.success) {
          return {
            status: 'error',
            code: 'MOHO_RETAKE_MANIFEST_INVALID',
            message: 'Манифест не прошёл валидацию и не может быть оценён на авто-применение',
            reasons: validated.error.issues.map(
              (i) => `${(i.path as (string | number)[]).join('.') || '?'}: ${i.message}`
            )
          };
        }
        const manifest = validated.data;
        const thresholds = (args.qaThresholds ?? {}) as {
          autoApprovalBySeverity?: Partial<Record<'low' | 'medium' | 'high', boolean>>;
        };
        const sev = manifest.severity;
        if (manifest.autoApplicable) {
          if (sev === 'high') {
            reasons.push('autoApplicable=true + severity=high запрещено схемой манифеста');
            return { status: 'success', canAutoApply: false, reasons };
          }
          if (sev === 'medium') {
            reasons.push('severity=medium требует human approval (requiresHumanApproval gate)');
            return { status: 'success', canAutoApply: false, reasons };
          }
        }
        const thresholdAllowed = thresholds.autoApprovalBySeverity?.[sev];
        if (thresholdAllowed === false) {
          reasons.push(`qaThresholds запрещает autoApproval для severity=${sev}`);
          return { status: 'success', canAutoApply: false, reasons };
        }
        if (!manifest.autoApplicable) {
          reasons.push('манифест не помечен autoApplicable=true');
        }
        const canAutoApply = manifest.autoApplicable === true;
        if (canAutoApply) {
          reasons.push(`severity=${sev} и qaThresholds разрешают авто-применение`);
        }
        return { status: 'success', canAutoApply, reasons };
      } catch (err: any) {
        return {
          status: 'error',
          code: 'MOHO_RETAKE_CAN_AUTO_APPLY_FAILED',
          message: err?.message ?? String(err),
          reasons: []
        };
      }
    }
  }
];
