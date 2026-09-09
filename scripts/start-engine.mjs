import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';

// Set the process boundary before importing modules that construct stores/configuration.
const engine = process.argv[2];
if (engine !== 'moho' && engine !== 'harmony' && engine !== 'animate') {
  throw new Error('Usage: node scripts/start-engine.mjs <moho|harmony|animate>');
}
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prefix = engine.toUpperCase();
const envFile = path.resolve(process.env[`${prefix}_MCP_ENV_FILE`] || path.join(repositoryRoot, `.env.${engine}`));
dotenv.config({ path: envFile });
process.env.MCP_ENV_FILE = envFile;
process.env.MCP_ENGINE = engine;
process.env.MCP_TOOL_PROFILE = process.env[`${prefix}_MCP_PROFILE`] || 'production';
const dataRoot = path.resolve(process.env[`${prefix}_MCP_DATA_ROOT`] || path.join(repositoryRoot, 'output', `${engine}-mcp`));
process.env.MCP_FACTORY_ROOT = path.join(dataRoot, 'factory');
process.env.MCP_OUTPUT_ROOT = path.join(dataRoot, 'results');
if (engine === 'harmony') {
  process.env.HARMONY_CAPTURE_ARTIFACT_ROOT = path.join(dataRoot, 'captures');
  process.env.RECONSTRUCTION_CACHE_ROOT = path.join(dataRoot, 'cache');
}
process.env.MCP_REPOSITORY_ROOT = repositoryRoot;
// Existing shared components still consume Harmony-named variables. Map them only
// inside this child process; never inherit another engine's state or credentials.
process.env.HARMONY_ALLOWED_ROOTS = process.env[`${prefix}_ALLOWED_ROOTS`] || [repositoryRoot, dataRoot].join(',');
process.env.HARMONY_LOG_DIR = path.join(dataRoot, 'logs');
if (engine === 'moho') {
  process.env.HARMONY_FACTORY_TOKENS = process.env.MOHO_FACTORY_TOKENS || '';
  process.env.HARMONY_ENGINE_MODE = 'real';
  process.env.RECONSTRUCTION_CACHE_ROOT = path.join(dataRoot, 'cache');
}
if (engine === 'animate') {
  process.env.ANIMATE_BRIDGE_DIR = path.join(dataRoot, 'bridge');
}
process.chdir(repositoryRoot);
await import(pathToFileURL(path.join(repositoryRoot, 'dist', 'servers', `${engine}.js`)).href);
