import {
  ANIMATE_PROTOCOL_VERSION,
  ANIMATE_BACKEND_IDENTITY,
  animateBridgeRequestSchema,
  animateBridgeResponseSchema,
  type AnimateBridgeRequest,
  type AnimateBridgeResponse
} from '../src/adapters/animate/protocol.js';

describe('Adobe Animate Bridge Protocol', () => {
  it('validates a correct request envelope', () => {
    const req: AnimateBridgeRequest = {
      requestId: 'req_12345',
      command: 'create_document',
      arguments: { width: 1920, height: 1080, fps: 24 },
      timestamp: new Date().toISOString(),
      protocolVersion: ANIMATE_PROTOCOL_VERSION,
      timeoutMs: 30000,
      documentPath: '/path/to/doc.fla'
    };

    const parsed = animateBridgeRequestSchema.safeParse(req);
    expect(parsed.success).toBe(true);
  });

  it('validates a correct success response envelope', () => {
    const resp: AnimateBridgeResponse = {
      requestId: 'req_12345',
      success: true,
      result: { name: 'Scene 1', frameCount: 24 },
      warnings: [],
      animateVersion: '24.0.3',
      documentPath: '/path/to/doc.fla',
      durationMs: 120,
      backendIdentity: ANIMATE_BACKEND_IDENTITY
    };

    const parsed = animateBridgeResponseSchema.safeParse(resp);
    expect(parsed.success).toBe(true);
  });

  it('validates an error response envelope', () => {
    const resp: AnimateBridgeResponse = {
      requestId: 'req_99999',
      success: false,
      error: {
        code: 'ANIMATE_JSFL_ERROR',
        message: 'Layer index out of bounds',
        stack: 'at execute (/path/runner.jsfl:42)'
      },
      durationMs: 45,
      backendIdentity: ANIMATE_BACKEND_IDENTITY
    };

    const parsed = animateBridgeResponseSchema.safeParse(resp);
    expect(parsed.success).toBe(true);
  });
});
