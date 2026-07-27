/**
 * Keeps the human-readable status table honest.
 *
 * docs/verified_tool_matrix.json is the machine-readable source of truth. This test fails if
 * the markdown drops a tool, invents one, or claims a different status than the JSON — the
 * failure mode that lets a report drift ahead of reality.
 */

import fs from 'fs';
import path from 'path';
import { harmonyActionRecorderTools } from '../src/tools/harmonyActionRecorderTools.js';

const MATRIX_JSON = path.resolve(process.cwd(), 'docs/verified_tool_matrix.json');
const MATRIX_MD = path.resolve(process.cwd(), 'docs/VERIFIED_TOOL_MATRIX.md');

interface MatrixTool {
  name: string;
  implementationFile: string;
  backendFile: string;
  schemaValidation: string;
  unitTest: string;
  contractTest: string;
  offlineIntegration: string;
  realHarmony: string;
  evidencePath: string | null;
  blockingReason: string;
  testFiles: string[];
}

const matrix = JSON.parse(fs.readFileSync(MATRIX_JSON, 'utf-8')) as {
  tools: MatrixTool[];
  components: Array<{ name: string; implementationFile: string; status: string }>;
};
const markdown = fs.readFileSync(MATRIX_MD, 'utf-8');

describe('VERIFIED_TOOL_MATRIX consistency', () => {
  it('covers every registered recorder tool', () => {
    expect(matrix.tools.map(t => t.name).sort()).toEqual(harmonyActionRecorderTools.map(t => t.name).sort());
  });

  it('points at implementation and test files that exist', () => {
    for (const tool of matrix.tools) {
      expect(fs.existsSync(path.resolve(process.cwd(), tool.implementationFile))).toBe(true);
      expect(fs.existsSync(path.resolve(process.cwd(), tool.backendFile))).toBe(true);
      expect(tool.testFiles.length).toBeGreaterThan(0);
      for (const testFile of tool.testFiles) {
        expect(fs.existsSync(path.resolve(process.cwd(), testFile))).toBe(true);
      }
    }
  });

  it('points at component implementation files that exist', () => {
    for (const component of matrix.components) {
      expect(fs.existsSync(path.resolve(process.cwd(), component.implementationFile))).toBe(true);
    }
  });

  it('states a blocking reason wherever it claims blocked, with evidence on disk', () => {
    for (const tool of matrix.tools) {
      if (tool.realHarmony !== 'blocked') continue;
      expect(tool.blockingReason.length).toBeGreaterThan(20);
      expect(tool.evidencePath).toBeTruthy();
      expect(fs.existsSync(path.resolve(process.cwd(), tool.evidencePath!))).toBe(true);
    }
  });

  it('never claims real_harmony_verified without evidence on disk', () => {
    for (const tool of matrix.tools) {
      if (tool.realHarmony !== 'real_harmony_verified') continue;
      expect(tool.evidencePath).toBeTruthy();
      expect(fs.existsSync(path.resolve(process.cwd(), tool.evidencePath!))).toBe(true);
    }
    for (const component of matrix.components) {
      if (component.status !== 'real_harmony_verified') continue;
      throw new Error(`Component "${component.name}" claims real_harmony_verified without an evidence field.`);
    }
  });

  it('markdown lists every tool with the same real-Harmony status as the JSON', () => {
    for (const tool of matrix.tools) {
      const row = markdown.split('\n').find(line => line.includes(`\`${tool.name}\``) && line.includes('| zod |'));
      expect(row).toBeDefined();
      expect(row).toContain(`\`${tool.realHarmony}\``);
    }
  });

  it('markdown lists every component with the same status as the JSON', () => {
    for (const component of matrix.components) {
      const row = markdown.split('\n').find(line => line.includes(`\`${component.implementationFile}\``));
      expect(row).toBeDefined();
      expect(row).toContain(`\`${component.status}\``);
    }
  });
});
