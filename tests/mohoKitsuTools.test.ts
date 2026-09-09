import { describe, expect, it } from '@jest/globals';
import { mohoKitsuIngestTool, mohoKitsuWritebackTool } from '../src/tools/mohoKitsuTools.js';

describe('mohoKitsuTools', () => {
  describe('moho.planner.kitsu_ingest', () => {
    it('has valid tool metadata and schema', () => {
      expect(mohoKitsuIngestTool.name).toBe('moho.planner.kitsu_ingest');
      const schema = mohoKitsuIngestTool.inputSchema;
      const parsed = schema.safeParse({
        baseUrl: 'https://kitsu.studio.example',
        production: 'Test_Production',
        episode: 'EP01'
      });
      expect(parsed.success).toBe(true);
    });

    it('handles unreachable host without throwing unhandled error and strips bearer token', async () => {
      const result = await mohoKitsuIngestTool.handler({
        baseUrl: 'http://127.0.0.1:59999',
        token: 'secret_jwt_token',
        production: 'NonExistent',
        episode: 'EP01'
      });
      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.status).toBe('error');
      expect(content.code).toBe('KITSU_INGEST_FAILED');
      expect(result.content[0].text).not.toContain('secret_jwt_token');
    });
  });

  describe('moho.planner.kitsu_writeback', () => {
    it('rejects unconfirmed writeback requests', async () => {
      const result = await mohoKitsuWritebackTool.handler({
        baseUrl: 'https://kitsu.studio.example',
        shotTaskId: 'task_123',
        status: 'done',
        confirm: false,
        confirmationText: 'invalid'
      });
      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.status).toBe('unsupported');
      expect(content.reason).toBe('DESTRUCTIVE_ACTION_REQUIRES_CONFIRMATION');
    });

    it('rejects mismatched confirmationText even if confirm is true', async () => {
      const result = await mohoKitsuWritebackTool.handler({
        baseUrl: 'https://kitsu.studio.example',
        shotTaskId: 'task_123',
        status: 'done',
        confirm: true,
        confirmationText: 'wrong text'
      });
      expect(result.isError).toBe(true);
      const content = JSON.parse(result.content[0].text);
      expect(content.reason).toBe('DESTRUCTIVE_ACTION_REQUIRES_CONFIRMATION');
    });
  });
});
