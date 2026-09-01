import fs from 'fs';
import path from 'path';
import process from 'process';
import { pathToFileURL } from 'url';

const argumentsList = process.argv.slice(2);
let profile = 'full';
if (argumentsList[0] === '--profile') {
  profile = argumentsList[1] ?? '';
  argumentsList.splice(0, 2);
}

if (!['full', 'production95'].includes(profile)) {
  process.stderr.write(`Unknown certification profile: ${profile}\n`);
  process.exit(2);
}

const manifestArgument = argumentsList[0];
if (!manifestArgument) {
  process.stderr.write('Usage: npm run moho:v3:certify -- [--profile full|production95] /absolute/path/to/benchmark.json\n');
  process.exit(2);
}

const manifestPath = path.resolve(manifestArgument);
const rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const benchmarkCases = Array.isArray(rawManifest) ? rawManifest : rawManifest.cases;
if (!Array.isArray(benchmarkCases)) {
  process.stderr.write('Benchmark manifest must be an array or an object with a cases array.\n');
  process.exit(2);
}

const modulePath = path.resolve('dist/services/mohoProductionV3Certification/index.js');
const {
  certifyMohoProductionV3At95Percent,
  certifyMohoProductionV3Benchmark
} = await import(pathToFileURL(modulePath).href);
const report = profile === 'production95'
  ? certifyMohoProductionV3At95Percent(benchmarkCases)
  : certifyMohoProductionV3Benchmark(benchmarkCases);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exit(report.certified ? 0 : 1);
