import { InbetweenOrchestrator } from '../src/services/inbetweenOrchestrator/index.js';
import { HarmonyCommandBuilder } from '../src/services/harmonyCommandBuilder/index.js';
import { harmonyCommandPlanV4Schema } from '../src/schemas/harmonyCommandPlanV4.js';
import { inbetweenPirSchema } from '../src/schemas/inbetweenPir.js';

describe('Phase 6: AnimeInbet Pipeline', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should call ml-runtime, parse InbetweenPIR, and generate command plan', async () => {
    
    // Mock the Python ML Runtime response
    const mockResponse = {
      format: "InbetweenPIR",
      version: "1.0.0",
      sourceKeyframes: [
        { frame: 0, path: "frameA.png" },
        { frame: 4, path: "frameB.png" }
      ],
      inbetweens: [
        { frameNumber: 1, rasterImagePath: "/tmp/mock_1.png", confidence: 0.95 },
        { frameNumber: 2, rasterImagePath: "/tmp/mock_2.png", confidence: 0.95 },
        { frameNumber: 3, rasterImagePath: "/tmp/mock_3.png", confidence: 0.95 }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    // 1. Call Orchestrator
    const orchestrator = new InbetweenOrchestrator('http://localhost:8000');
    const pir = await orchestrator.generateInbetweens('frameA.png', 'frameB.png', 3);

    // Verify fetch was called correctly
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/infer/animeinbet', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        frame_a_path: 'frameA.png',
        frame_b_path: 'frameB.png',
        count: 3
      })
    }));

    // 2. Validate PIR Parsing
    expect(pir.inbetweens).toHaveLength(3);
    expect(pir.inbetweens[0].rasterImagePath).toBe('/tmp/mock_1.png');

    // 3. Build Command Plan
    const builder = new HarmonyCommandBuilder();
    const plan = builder.buildInbetweenPlan(pir, 'NODE_CHARACTER_ARM');

    // 4. Validate output against V4 schema
    const validation = harmonyCommandPlanV4Schema.safeParse(plan);
    expect(validation.success).toBe(true);
    
    if (validation.success) {
      const drawingCommands = validation.data.commands.filter(c => c.type === 'create_drawing');
      expect(drawingCommands).toHaveLength(3);
      expect(drawingCommands[0].params.raster_path).toBe('/tmp/mock_1.png');
      expect(drawingCommands[0].params.node_id).toBe('NODE_CHARACTER_ARM');
    }
  });
});
