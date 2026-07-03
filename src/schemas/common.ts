import { z } from 'zod';

export const projectPathSchema = z.string().optional().describe('Абсолютный путь к файлу проекта .xstage.');

export const confirmationSchema = z.object({
  confirm: z.boolean().optional().describe('Подтверждение выполнения опасного действия.'),
  confirmationText: z.string().optional().describe('Текст подтверждения для верификации.')
});

export const dryRunSchema = z.boolean().optional().describe('Запуск в режиме симуляции (dry-run).');
