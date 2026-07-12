import { WebccAdapter } from '../src/adapters/webccAdapter.js';
import { HarmonyError } from '../src/security.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

describe('WebCC Contract Tests', () => {
  let server: ReturnType<typeof createServer>;
  let serverUrl: string;
  let serverPort: number;

  beforeAll(async () => {
    // Create a mock WebCC server
    server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || '', `http://localhost:${serverPort}`);
      const path = url.pathname;
      
      // Mock endpoints
      if (path === '/api/projects' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          projects: [{ id: 'proj1', name: 'Test Project' }]
        }));
      } else if (path === '/api/projects/proj1/scenes' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          scenes: [{ id: 'scene1', name: 'Test Scene' }]
        }));
      } else if (path === '/api/scenes/scene1/render' && req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const params = JSON.parse(body);
        
        if (!params.format) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'format required' }));
          return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jobId: 'render_123',
          status: 'queued',
          outputPath: `/renders/scene1.${params.format}`
        }));
      } else if (path === '/api/jobs/render_123' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jobId: 'render_123',
          status: 'completed',
          progress: 100,
          outputPath: '/renders/scene1.mp4'
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    // Start server on random port
    serverPort = 18765; // Fixed port for testing
    serverUrl = `http://localhost:${serverPort}`;
    
    await new Promise<void>((resolve, reject) => {
      server.listen(serverPort, () => resolve());
      server.on('error', reject);
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  beforeEach(() => {
    // Reset environment
    delete process.env.HARMONY_WEBCC_URL;
  });

  describe('WebccAdapter Availability', () => {
    it('should report unavailable when URL not configured', () => {
      const result = WebccAdapter.isAvailable();
      expect(result).toBe(false);
    });

    it('should report available when URL configured', () => {
      process.env.HARMONY_WEBCC_URL = serverUrl;
      const result = WebccAdapter.isAvailable();
      expect(result).toBe(true);
    });
  });

  describe('performAction with Valid Config', () => {
    beforeEach(() => {
      process.env.HARMONY_WEBCC_URL = serverUrl;
    });

    it('should list projects', async () => {
      const result = await WebccAdapter.performAction('list_projects', {});
      expect(result.status).toBe('success');
      expect(result.data).toHaveProperty('projects');
    });

    it('should list scenes for a project', async () => {
      const result = await WebccAdapter.performAction('list_scenes', { projectId: 'proj1' });
      expect(result.status).toBe('success');
      expect(result.data).toHaveProperty('scenes');
    });

    it('should start render job', async () => {
      const result = await WebccAdapter.performAction('render_scene', { 
        sceneId: 'scene1', 
        format: 'mp4' 
      });
      expect(result.status).toBe('success');
      expect(result.data).toHaveProperty('jobId');
    });

    it('should get job status', async () => {
      const result = await WebccAdapter.performAction('get_job_status', { jobId: 'render_123' });
      expect(result.status).toBe('success');
      expect(result.data).toHaveProperty('status');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.HARMONY_WEBCC_URL = serverUrl;
    });

    it('should return error for unknown action', async () => {
      const result = await WebccAdapter.performAction('unknown_action', {});
      expect(result.status).toBe('error');
      expect(result.code).toBe('WEBCC_UNAVAILABLE');
    });

    it('should handle server errors gracefully', async () => {
      // Stop server temporarily
      await new Promise<void>((resolve) => server.close(() => resolve()));
      
      const result = await WebccAdapter.performAction('list_projects', {});
      expect(result.status).toBe('error');
      expect(result.code).toBe('WEBCC_UNAVAILABLE');
      
      // Restart server
      await new Promise<void>((resolve) => server.listen(serverPort, () => resolve()));
    });

    it('should validate required parameters', async () => {
      const result = await WebccAdapter.performAction('render_scene', { sceneId: 'scene1' }); // missing format
      expect(result.status).toBe('error');
    });
  });

  describe('Contract Validation', () => {
    it('should return consistent response structure', async () => {
      process.env.HARMONY_WEBCC_URL = serverUrl;
      
      const actions = [
        { action: 'list_projects', params: {} },
        { action: 'list_scenes', params: { projectId: 'proj1' } },
      ];

      for (const { action, params } of actions) {
        const result = await WebccAdapter.performAction(action, params);
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('message');
        expect(['success', 'error', 'unsupported']).toContain(result.status);
        if (result.data) {
          expect(typeof result.data).toBe('object');
        }
      }
    });
  });
});