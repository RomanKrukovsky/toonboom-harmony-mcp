import { AnimateJsflGenerator } from '../src/adapters/animate/jsflGenerator.js';

describe('AnimateJsflGenerator', () => {
  it('converts paths to file URIs correctly', () => {
    const testPath = '/Users/artist/project/scene.fla';
    const uri = AnimateJsflGenerator.pathToURI(testPath);
    expect(uri).toBe('file:///Users/artist/project/scene.fla');

    const backPath = AnimateJsflGenerator.uriToPath(uri);
    expect(backPath).toBe(testPath);
  });

  it('escapes strings safely for JSFL', () => {
    const raw = 'Hello "World" \n \\ and symbols';
    const escaped = AnimateJsflGenerator.escapeString(raw);
    expect(escaped.startsWith('"')).toBe(true);
    expect(escaped.endsWith('"')).toBe(true);
    expect(escaped).toContain('\\"World\\"');
  });

  it('builds a runner script containing the command body and error handling', () => {
    const script = AnimateJsflGenerator.buildRunnerScript({
      command: 'create_document',
      args: { width: 1920, height: 1080 },
      requestId: 'req_test_001',
      responseFilePath: '/tmp/resp_test_001.json'
    });

    expect(script).toContain('requestId = "req_test_001"');
    expect(script).toContain('createDocument');
    expect(script).toContain('FLfile.write');
    expect(script).toContain('ANIMATE_JSFL_ERROR');
  });

  it('generates valid command bodies for all core commands', () => {
    const commands = [
      'system_status',
      'get_version',
      'ping',
      'create_document',
      'open_document',
      'create_layer',
      'create_symbol',
      'create_shape',
      'create_text',
      'create_tween',
      'import_audio',
      'export_image',
      'export_video'
    ];

    for (const cmd of commands) {
      const body = AnimateJsflGenerator.getCommandBody(cmd);
      expect(body).toBeDefined();
      expect(body.length).toBeGreaterThan(10);
      expect(body).not.toContain('Unknown JSFL command');
    }
  });
});
