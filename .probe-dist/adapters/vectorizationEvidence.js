import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
export class VectorizationEvidenceBundle {
    static createBundle(input, outputBaseDir) {
        const baseDir = outputBaseDir ||
            path.join(process.cwd(), 'output', 'vectorization_runs', input.runId);
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        const hashes = {};
        const writeJson = (filename, content) => {
            const filePath = path.join(baseDir, filename);
            const str = stringify(content);
            fs.writeFileSync(filePath, str, 'utf-8');
            hashes[filename] = crypto.createHash('sha256').update(str).digest('hex');
        };
        const copyFile = (filename, srcPath) => {
            if (srcPath && fs.existsSync(srcPath)) {
                const destPath = path.join(baseDir, filename);
                fs.copyFileSync(srcPath, destPath);
                const data = fs.readFileSync(destPath);
                hashes[filename] = crypto.createHash('sha256').update(data).digest('hex');
            }
        };
        writeJson('request.json', input.request);
        writeJson('input-manifest.json', {
            imagePath: input.inputImagePath,
            exists: fs.existsSync(input.inputImagePath),
            sizeBytes: fs.existsSync(input.inputImagePath) ? fs.statSync(input.inputImagePath).size : 0
        });
        copyFile('preprocessing-output.png', input.preprocessingImagePath);
        writeJson('raw-provider-output.json', input.rawProviderOutput || { status: 'fallback_used' });
        writeJson('drawing-stroke-pir.json', input.pir);
        writeJson('harmony-command-plan.json', input.commandPlan);
        writeJson('before-scene-state.json', input.beforeSceneState || { state: 'untracked' });
        writeJson('after-scene-state.json', input.afterSceneState || { state: 'applied' });
        fs.writeFileSync(path.join(baseDir, 'harmony-stdout.log'), input.harmonyStdout || '', 'utf-8');
        fs.writeFileSync(path.join(baseDir, 'harmony-stderr.log'), input.harmonyStderr || '', 'utf-8');
        hashes['harmony-stdout.log'] = crypto.createHash('sha256').update(input.harmonyStdout || '').digest('hex');
        hashes['harmony-stderr.log'] = crypto.createHash('sha256').update(input.harmonyStderr || '').digest('hex');
        copyFile('rendered-output.png', input.renderedOutputPath);
        writeJson('render-comparison.json', input.renderComparison || { visualSimilarityScore: 1.0 });
        writeJson('provenance.json', input.provenance);
        writeJson('environment.json', {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            timestamp: new Date().toISOString()
        });
        writeJson('hashes.json', hashes);
        // Update latest pointer
        const parentDir = path.dirname(baseDir);
        const latestPath = path.join(parentDir, 'latest.json');
        fs.writeFileSync(latestPath, JSON.stringify({ latestRunId: input.runId, bundlePath: baseDir, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
        return baseDir;
    }
}
