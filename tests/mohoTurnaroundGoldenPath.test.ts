import fs from 'fs';
import path from 'path';
import { describe, it, expect } from '@jest/globals';

describe('Moho Turnaround Golden Path Evidence', () => {
  const bundleDir = path.join(process.cwd(), 'docs', 'evidence', 'moho-turnaround-golden-path');

  it('contains summary.json with complete metadata', () => {
    const summaryPath = path.join(bundleDir, 'summary.json');
    expect(fs.existsSync(summaryPath)).toBe(true);

    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    expect(summary.characterName).toBe('Hero_Turnaround');
    expect(summary.turnaroundAnglesCount).toBe(8);
    expect(summary.smartDialsCount).toBeGreaterThanOrEqual(2);
    expect(summary.vitruvianGroupsCount).toBe(4);
    expect(summary.compiledBonesCount).toBeGreaterThanOrEqual(20);
    expect(summary.contentSha256).toBeDefined();
  });

  it('contains valid binary .moho archive with PK signature', () => {
    const mohoPath = path.join(bundleDir, 'char_hero_turnaround_v1.moho');
    expect(fs.existsSync(mohoPath)).toBe(true);

    const buf = fs.readFileSync(mohoPath);
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
    expect(buf[2]).toBe(0x03);
    expect(buf[3]).toBe(0x04);
  });

  it('contains valid project_document.json with 1045 schema and flexi-binding', () => {
    const docPath = path.join(bundleDir, 'project_document.json');
    expect(fs.existsSync(docPath)).toBe(true);

    const doc = JSON.parse(fs.readFileSync(docPath, 'utf8'));
    expect(doc.version).toBe(1045);
    expect(doc.mime_type).toBe('application/x-vnd.lm_mohodoc');

    const rootLayer = doc.layers[0];
    expect(rootLayer.type).toBe('BoneLayer');
    expect(rootLayer.skeleton.bones.length).toBeGreaterThanOrEqual(20);

    // Verify binding_mode = 1 (Standard across 20 benchmark rigs)
    expect(rootLayer.skeleton.bones[0].binding_mode).toBe(1);
  });
});
