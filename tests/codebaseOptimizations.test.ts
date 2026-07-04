import fs from 'fs';
import path from 'path';
import { FastXmlAuditor } from '../src/adapters/scenePlan/xmlAuditor.js';
import { QtScriptTransaction } from '../src/adapters/qtScriptBuilder.js';
import { tracker } from '../src/adapters/sqliteTracker.js';
import { WebhookNotifier } from '../src/adapters/webhookNotifier.js';
import { plannerTools } from '../src/tools/plannerTools.js';
import { templateAssembly } from '../src/adapters/templateAssembly/index.js';

describe('Harmony MCP Codebase Optimizations', () => {
  
  describe('FastXmlAuditor', () => {
    const tempXstage = path.resolve('temp_test_scene.xstage');

    afterEach(() => {
      if (fs.existsSync(tempXstage)) {
        fs.unlinkSync(tempXstage);
      }
    });

    test('should flag missing project file', () => {
      const result = FastXmlAuditor.auditXstageFile('non_existent.xstage');
      expect(result.passed).toBe(false);
      expect(result.issues[0]).toContain('не найден');
    });

    test('should identify disconnected composites', () => {
      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <elements>
    <element id="1" name="Drawing" type="READ"/>
  </elements>
  <nodes>
    <module type="READ" name="Drawing"/>
    <module type="COMPOSITE" name="Composite"/>
    <module type="DISPLAY" name="Display"/>
  </nodes>
  <links>
    <!-- No connections -->
  </links>
</project>`;
      
      fs.writeFileSync(tempXstage, mockXml);
      const result = FastXmlAuditor.auditXstageFile(tempXstage);
      expect(result.passed).toBe(false);
      expect(result.issues.some(i => i.includes('не имеет входящих соединений'))).toBe(true);
    });

    test('should pass a valid structure', () => {
      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <elements>
    <element id="1" name="Drawing" type="READ"/>
  </elements>
  <nodes>
    <module type="READ" name="Drawing"/>
    <module type="COMPOSITE" name="Composite"/>
  </nodes>
  <links>
    <link from="Drawing" to="Composite"/>
  </links>
</project>`;
      
      fs.writeFileSync(tempXstage, mockXml);
      const result = FastXmlAuditor.auditXstageFile(tempXstage);
      expect(result.issues.filter(i => i.includes('Композит') || i.includes('изолирован')).length).toBe(0);
    });

    test('should generate a valid Mermaid graph', () => {
      const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <nodes>
    <module type="READ" name="Drawing node"/>
    <module type="COMPOSITE" name="Composite"/>
  </nodes>
  <links>
    <link from="Drawing node" to="Composite"/>
  </links>
</project>`;
      
      fs.writeFileSync(tempXstage, mockXml);
      const graph = FastXmlAuditor.generateMermaidGraph(tempXstage);
      expect(graph).toContain('graph TD');
      expect(graph).toContain('Drawing_node["Drawing node (READ)"]');
      expect(graph).toContain('Composite["Composite (COMPOSITE)"]');
      expect(graph).toContain('Drawing_node --> Composite');
    });
  });

  describe('QtScriptTransaction', () => {
    test('should compile multiple statement lines', () => {
      const tx = new QtScriptTransaction();
      tx.addStatement('var userList = ControlCentre.users();');
      tx.addStatement('var success = ControlCentre.addUser("test", "Operator");');
      
      const compiled = tx.compile();
      expect(compiled).toContain('function executeTransaction() {');
      expect(compiled).toContain('var userList = ControlCentre.users();');
      expect(compiled).toContain('var success = ControlCentre.addUser("test", "Operator");');
      expect(compiled).toContain('ControlCentre.printToConsole("[LOG]" + log);');
    });
  });

  describe('SqliteTracker Caching', () => {
    beforeAll(async () => {
      await tracker.initialize();
    });

    afterAll(() => {
      tracker.close();
    });

    test('should cache and retrieve file existence check', async () => {
      const testFilePath = path.resolve('cached_test_file.txt');
      fs.writeFileSync(testFilePath, 'dummy content');

      try {
        // Clear potential old cache
        await tracker.clearCachedFileStats(testFilePath);

        // Check if cache returns null initially
        const cachedBefore = await tracker.getCachedFileStats(testFilePath);
        expect(cachedBefore).toBeNull();

        // Trigger cachedExists (this should populate the database cache)
        const exists = await tracker.cachedExists(testFilePath);
        expect(exists).toBe(true);

        // Retrieve cache from DB and check values
        const cachedAfter = await tracker.getCachedFileStats(testFilePath);
        expect(cachedAfter).not.toBeNull();
        expect(cachedAfter?.size).toBe(13); // 'dummy content' length
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
        await tracker.clearCachedFileStats(testFilePath);
      }
    });
  });

  describe('WebhookNotifier', () => {
    test('should do nothing and resolve when HARMONY_WEBHOOK_URL is not set', async () => {
      const originalUrl = process.env.HARMONY_WEBHOOK_URL;
      delete process.env.HARMONY_WEBHOOK_URL;

      try {
        await expect(WebhookNotifier.sendNotification('Test Event', 'Test detail')).resolves.not.toThrow();
      } finally {
        process.env.HARMONY_WEBHOOK_URL = originalUrl;
      }
    });

    test('should trigger fetch when HARMONY_WEBHOOK_URL is set', async () => {
      const originalUrl = process.env.HARMONY_WEBHOOK_URL;
      process.env.HARMONY_WEBHOOK_URL = 'http://localhost:9999/test-webhook';
      
      const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => 
        Promise.resolve(new Response(null, { status: 200 }))
      );

      try {
        await WebhookNotifier.sendNotification('Test Event', 'Test details', 'info');
        expect(fetchMock).toHaveBeenCalled();
        const calledUrl = fetchMock.mock.calls[0][0];
        expect(calledUrl).toBe('http://localhost:9999/test-webhook');
      } finally {
        fetchMock.mockRestore();
        process.env.HARMONY_WEBHOOK_URL = originalUrl;
      }
    });
  });

  describe('harmony.planner.export_review_package', () => {
    const tempXstage = path.resolve('temp_review_scene.xstage');
    const tempOutputDir = path.resolve('temp_output_review');

    beforeAll(() => {
      fs.writeFileSync(tempXstage, '<?xml version="1.0" encoding="UTF-8"?><project><nodes></nodes><links></links></project>');
    });

    afterAll(() => {
      if (fs.existsSync(tempXstage)) fs.unlinkSync(tempXstage);
      if (fs.existsSync(tempOutputDir)) {
        fs.rmSync(tempOutputDir, { recursive: true, force: true });
      }
    });

    test('should construct review package with manifest file', async () => {
      const tool = plannerTools.find(t => t.name === 'harmony.planner.export_review_package');
      expect(tool).toBeDefined();

      const result = await tool!.handler({
        projectPath: tempXstage,
        outputDir: tempOutputDir,
        packageName: 'client_v01'
      }) as any;

      expect(result.status).toBe('success');
      expect(result.targetDirectory).toContain('client_v01');
      expect(fs.existsSync(path.join(tempOutputDir, 'client_v01', 'review_manifest.json'))).toBe(true);
      
      const manifest = JSON.parse(fs.readFileSync(path.join(tempOutputDir, 'client_v01', 'review_manifest.json'), 'utf-8'));
      expect(manifest.sceneName).toBe('toon-boom-harmony-mcp');
    });
  });

  describe('templateAssembly.validateTemplate', () => {
    const tempTplDir = path.resolve('temp_test_rig.tpl');
    const xstageInTpl = path.join(tempTplDir, 'temp_test_rig.xstage');

    afterEach(() => {
      if (fs.existsSync(tempTplDir)) {
        fs.rmSync(tempTplDir, { recursive: true, force: true });
      }
    });

    test('should pass validation for virtual templates', async () => {
      const result = await templateAssembly.validateTemplate('default_scene_template');
      expect(result.valid).toBe(true);
    });

    test('should fail if template folder does not exist', async () => {
      const result = await templateAssembly.validateTemplate('non_existent.tpl');
      expect(result.valid).toBe(false);
      expect(result.issues[0]).toContain('отсутствует');
    });

    test('should fail if template folder has no launch xstage file', async () => {
      fs.mkdirSync(tempTplDir, { recursive: true });
      
      const result = await templateAssembly.validateTemplate(tempTplDir);
      expect(result.valid).toBe(false);
      expect(result.issues[0]).toContain('отсутствует запускающий файл');
    });

    test('should pass if template has valid xstage file structure', async () => {
      fs.mkdirSync(tempTplDir, { recursive: true });
      fs.writeFileSync(xstageInTpl, '<?xml version="1.0" encoding="UTF-8"?><project><nodes></nodes><links></links></project>');
      
      const result = await templateAssembly.validateTemplate(tempTplDir);
      expect(result.valid).toBe(true);
    });
  });
});
