/**
 * Tool registry integrity gate.
 *
 * The MCP dispatcher resolves a call with `this.tools.find(t => t.name === name)`,
 * so two tools sharing a name means the second one is silently unreachable —
 * a shadowing bug that no other test would surface. An audit previously found
 * 556 handlers behind only 543 unique names (13 shadowed tools).
 *
 * This gate enforces three invariants on the source of truth in src/tools/:
 *   1. every tool name is unique across all tool modules;
 *   2. every exported *Tools array is actually registered in src/index.ts;
 *   3. no tool array is spread into the registry twice.
 *
 * Scope note: this gate covers the HARMONY registry only. Moho tools are not
 * spread into an array here — they are built at runtime by buildMohoTools()
 * from src/moho/tools.ts, and their own equivalents live in
 * tests/moho/toolNames.test.ts and tests/moho/hostIsolation.test.ts.
 */

import fs from 'fs';
import path from 'path';

const REPO_ROOT = process.cwd();
const TOOLS_DIR = path.join(REPO_ROOT, 'src', 'tools');
const INDEX_FILE = path.join(REPO_ROOT, 'src', 'index.ts');

function readToolFiles(): { file: string; source: string }[] {
  return fs
    .readdirSync(TOOLS_DIR)
    .filter(f => f.endsWith('.ts'))
    // defineTool.ts is infrastructure, not a tool module. Its doc comments contain
    // illustrative `export const xTools = ...` snippets that are not real exports.
    .filter(f => f !== 'defineTool.ts')
    .map(file => ({ file, source: fs.readFileSync(path.join(TOOLS_DIR, file), 'utf8') }));
}

/** Names of tools, keyed by name -> files declaring it. Matches `name: 'harmony.*'`. */
function collectToolNames(): Map<string, string[]> {
  const byName = new Map<string, string[]>();
  for (const { file, source } of readToolFiles()) {
    for (const match of source.matchAll(/name:\s*'(harmony\.[^']+)'/g)) {
      const name = match[1];
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name)!.push(file);
    }
  }
  return byName;
}

/**
 * Groups spread into the Harmony registry array in src/index.ts.
 *
 * The array is matched by SHAPE, not by name: a previous version pinned the
 * literal `const allTools = [`, and renaming that variable to `harmonyTools`
 * during the Moho integration made this gate throw instead of checking
 * anything. Matching `const <name>Tools = [ ...spreads ]` keeps the gate
 * working across such renames while still failing loudly if the registry
 * disappears entirely.
 */
function collectRegisteredGroups(): string[] {
  const source = fs.readFileSync(INDEX_FILE, 'utf8');

  // Candidate arrays whose body consists of `...someTools` spreads.
  const candidates = [...source.matchAll(/const (\w*[Tt]ools) = \[([\s\S]*?)\];/g)].filter(m =>
    /\.\.\.\w+Tools\b/.test(m[2])
  );

  if (candidates.length === 0) {
    throw new Error(
      'could not locate the Harmony tool registration array in src/index.ts ' +
        '(expected a `const <name>Tools = [ ...xTools, ... ];` block)'
    );
  }
  // More than one such array would mean two registries and an ambiguous gate.
  if (candidates.length > 1) {
    throw new Error(
      `expected exactly one tool registration array in src/index.ts, found: ${candidates
        .map(m => m[1])
        .join(', ')}`
    );
  }

  return [...candidates[0][2].matchAll(/\.\.\.(\w+)/g)].map(m => m[1]);
}

function collectExportedGroups(): string[] {
  const exported: string[] = [];
  for (const { source } of readToolFiles()) {
    for (const match of source.matchAll(/export const (\w+Tools)\b/g)) {
      exported.push(match[1]);
    }
  }
  return exported;
}

describe('tool registry integrity', () => {
  it('declares every tool name exactly once', () => {
    const shadowed = [...collectToolNames().entries()].filter(([, files]) => files.length > 1);
    if (shadowed.length > 0) {
      const rendered = shadowed
        .map(([name, files]) => `  ${name} declared in: ${files.join(', ')}`)
        .join('\n');
      throw new Error(
        `duplicate tool names would be shadowed by the dispatcher's find():\n${rendered}`
      );
    }
    expect(shadowed).toEqual([]);
  });

  it('registers every exported tool array in src/index.ts', () => {
    const registered = collectRegisteredGroups();
    const missing = collectExportedGroups().filter(name => !registered.includes(name));
    expect(missing).toEqual([]);
  });

  it('never spreads the same tool array twice', () => {
    const registered = collectRegisteredGroups();
    const duplicates = registered.filter((name, i) => registered.indexOf(name) !== i);
    expect(duplicates).toEqual([]);
  });

  it('registers a non-trivial number of tools', () => {
    // Guards against a refactor that silently empties the registry.
    expect(collectToolNames().size).toBeGreaterThan(400);
    expect(collectRegisteredGroups().length).toBeGreaterThan(50);
  });
});
