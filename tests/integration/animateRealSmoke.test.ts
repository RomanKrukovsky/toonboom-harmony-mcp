/**
 * Real Adobe Animate smoke test suite.
 *
 * This test executes only when:
 *   ANIMATE_REAL_TESTS=1
 *
 * Behaviour when explicitly requested:
 *   - Animate reachable   -> executes document creation, drawing, symbol conversion,
 *                            timeline keyframing, classic tween, inspection, and export.
 *                            Writes evidence to docs/evidence/animate-real-smoke/real-smoke-report.json.
 *   - Animate unreachable -> writes verbatim blocking reason to
 *                            docs/evidence/animate-real-smoke/blocked.json and FAILS.
 *                            A blocked run must never be reported as passing.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from '@jest/globals';
import { animateConfig } from '../../src/config.js';
import { AnimateDetector } from '../../src/adapters/animate/detector.js';
import { AnimateBridge } from '../../src/adapters/animate/bridge.js';
import { animateTools } from '../../src/tools/animateTools.js';

const REQUESTED = process.env.ANIMATE_REAL_TESTS === '1';
const EVIDENCE_DIR = path.resolve(process.cwd(), 'docs/evidence/animate-real-smoke');

function writeEvidence(fileName: string, payload: unknown): string {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const target = path.join(EVIDENCE_DIR, fileName);
  fs.writeFileSync(target, JSON.stringify(payload, null, 2), 'utf-8');
  return target;
}

describe('Adobe Animate — Real smoke test suite', () => {
  if (!REQUESTED) {
    it.skip('not requested (set ANIMATE_REAL_TESTS=1 to run against installed Adobe Animate)', () => {
      /* intentionally skipped: absence of a real run is reported as skipped, never as verified */
    });
    return;
  }

  it('executes full animation lifecycle on real Adobe Animate or records blocking evidence', async () => {
    const system = AnimateDetector.getSystemProfile();

    if (!system.installation.installed) {
      const blockedPayload = {
        timestamp: new Date().toISOString(),
        status: 'BLOCKED',
        reason: 'Adobe Animate installation was not detected on this host machine.',
        system
      };
      writeEvidence('blocked.json', blockedPayload);
      throw new Error(`Adobe Animate real smoke test BLOCKED: Installation not detected.`);
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'animate-real-smoke-'));
    const docPath = path.join(tmpDir, 'smoke_scene.fla');
    const previewPngPath = path.join(tmpDir, 'smoke_preview.png');

    // Configure bridge for real execution
    const prevMode = animateConfig.bridgeMode;
    const prevDestructive = animateConfig.allowDestructive;
    animateConfig.bridgeMode = 'auto';
    animateConfig.allowDestructive = true;
    animateConfig.requestTimeoutMs = 60_000;

    const callTool = async (name: string, args: any = {}) => {
      const tool = animateTools.find(t => t.name === name);
      if (!tool) throw new Error(`Tool not found: ${name}`);
      return (tool.handler as (a: any) => Promise<any>)(args);
    };

    const executionLog: Array<{ step: string; timestamp: string; success: boolean; data?: unknown }> = [];

    try {
      // 1. System status
      const statusRes = await callTool('animate_system_status');
      expect(statusRes).toBeDefined();
      executionLog.push({ step: 'animate_system_status', timestamp: new Date().toISOString(), success: true, data: statusRes });

      // 2. Create document (1920x1080 @ 24fps)
      const createRes = await callTool('animate_create_document', {
        width: 1920,
        height: 1080,
        frameRate: 24,
        docType: 'timeline'
      });
      expect(createRes).toBeDefined();
      expect(createRes.width).toBe(1920);
      expect(createRes.height).toBe(1080);
      executionLog.push({ step: 'animate_create_document', timestamp: new Date().toISOString(), success: true, data: createRes });

      // 3. Create layer
      const layerRes = await callTool('animate_create_layer', {
        name: 'HeroAnimation',
        layerType: 'normal'
      });
      expect(layerRes).toBeDefined();
      executionLog.push({ step: 'animate_create_layer', timestamp: new Date().toISOString(), success: true, data: layerRes });

      // 4. Create vector shape
      const shapeRes = await callTool('animate_create_shape', {
        shapeType: 'oval',
        x: 200,
        y: 200,
        width: 250,
        height: 250,
        fillColor: '#FF4444'
      });
      expect(shapeRes).toBeDefined();
      executionLog.push({ step: 'animate_create_shape', timestamp: new Date().toISOString(), success: true, data: shapeRes });

      // 5. Convert selection to Symbol (select drawn shape first)
      await callTool('animate_select_all');
      const symRes = await callTool('animate_convert_selection_to_symbol', {
        name: 'HeroSymbol',
        type: 'graphic'
      });
      expect(symRes).toBeDefined();
      executionLog.push({ step: 'animate_convert_selection_to_symbol', timestamp: new Date().toISOString(), success: true, data: symRes });

      // 6. Insert frames, keyframe and Tween
      const frameRes = await callTool('animate_insert_frames', { numFrames: 24 });
      expect(frameRes).toBeDefined();

      const kfRes = await callTool('animate_insert_keyframe', { frameIndex: 24 });
      expect(kfRes).toBeDefined();

      const tweenRes = await callTool('animate_create_tween', {
        tweenType: 'classic',
        startFrame: 0,
        endFrame: 24
      });
      expect(tweenRes).toBeDefined();
      executionLog.push({ step: 'timeline_and_tween', timestamp: new Date().toISOString(), success: true });

      // 7. Save document as FLA
      const saveRes = await callTool('animate_save_as_document', { filePath: docPath });
      expect(saveRes).toBeDefined();
      executionLog.push({ step: 'animate_save_as_document', timestamp: new Date().toISOString(), success: true, data: saveRes });

      // 8. Inspect document
      const inspectRes = await callTool('animate_inspect_document', {});
      expect(inspectRes).toBeDefined();
      expect(inspectRes.width).toBe(1920);
      expect(inspectRes.height).toBe(1080);
      executionLog.push({ step: 'animate_inspect_document', timestamp: new Date().toISOString(), success: true, data: inspectRes });

      // 9. Export image
      const exportRes = await callTool('animate_export_image', {
        outputPath: previewPngPath,
        currentFrameOnly: true
      });
      expect(exportRes).toBeDefined();
      expect(fs.existsSync(previewPngPath)).toBe(true);
      executionLog.push({
        step: 'animate_export_image',
        timestamp: new Date().toISOString(),
        success: true,
        data: {
          path: previewPngPath,
          sizeBytes: fs.statSync(previewPngPath).size
        }
      });

      // 10. Close document
      const closeRes = await callTool('animate_close_document', { promptToSave: false });
      expect(closeRes).toBeDefined();
      executionLog.push({ step: 'animate_close_document', timestamp: new Date().toISOString(), success: true });

      // Write verified real smoke report
      const reportPayload = {
        timestamp: new Date().toISOString(),
        status: 'VERIFIED',
        engine: 'adobe_animate',
        version: system.installation.version,
        appPath: system.installation.appPath,
        platform: process.platform,
        stepsExecuted: executionLog.length,
        log: executionLog
      };
      writeEvidence('real-smoke-report.json', reportPayload);

    } finally {
      // Restore settings and clean up
      animateConfig.bridgeMode = prevMode;
      animateConfig.allowDestructive = prevDestructive;
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup failure
      }
    }
  }, 120_000);
});
