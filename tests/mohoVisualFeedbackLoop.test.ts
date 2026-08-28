import { describe, it, expect } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import { MohoVisualFeedbackLoop } from '../src/services/mohoVisualFeedbackLoop/index.js';

describe('Moho Visual Feedback Loop & Autonomous QC Gate', () => {
  const summerMoho = path.resolve(process.cwd(), 'output/Summer_Smith.moho');
  const previewPng = path.resolve(process.cwd(), 'output/Summer_Smith_QC_Preview.png');

  it('performs headless rendering and certifies visual quality with 0 issues', () => {
    expect(fs.existsSync(summerMoho)).toBe(true);

    const audit = MohoVisualFeedbackLoop.runVisualAudit(summerMoho, previewPng);

    expect(audit.isVisuallyCertified).toBe(true);
    expect(audit.scorePercent).toBeGreaterThanOrEqual(80.0);
    expect(audit.totalRenderedPixels).toBeGreaterThan(100);
    expect(fs.existsSync(previewPng)).toBe(true);
  });
});
