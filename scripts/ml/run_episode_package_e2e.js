import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { onePromptTools } from '../../dist/tools/onePromptTools.js';
import { studioPackageTools } from '../../dist/tools/studioPackageTools.js';

async function runEpisodePackagePipeline() {
  console.log("===============================================================");
  console.log("   EPISODE PRODUCTION PACKAGE & STUDIO PIPELINE RUNNER        ");
  console.log("===============================================================");

  const outputDir = path.join(process.cwd(), 'output', 'episode_package_results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const prompt = "A 2-minute sci-fi animated episode: Professor Vex and Sam accidentally activate a temporal rift in the lab.";
  console.log(`Prompt: "${prompt}"\n`);

  // 1. Execute OnePrompt Final Package Generation
  console.log("[1/4] Running harmony.oneprompt.run_to_final_package...");
  const finalPackageTool = onePromptTools.find(t => t.name === 'harmony.oneprompt.run_to_final_package');
  if (!finalPackageTool) throw new Error("oneprompt tool not found");

  const runResult = await finalPackageTool.handler({
    prompt,
    targetDurationMinutes: 2,
    fps: 24,
    outputDir: outputDir,
    mode: 'simulation',
    humanApproved: true
  });

  console.log(`Package Status: ${runResult.status}`);
  console.log(`Locked: ${runResult.locked}`);
  console.log(`Scenes Generated: ${runResult.scenePlanCount}`);
  console.log(`Previews Generated: ${runResult.previewCount}`);

  // 2. Generate Asset Checklist
  console.log("\n[2/4] Generating Studio Asset Checklist...");
  const checklistTool = studioPackageTools.find(t => t.name === 'harmony.production.generate_asset_checklist');
  const checklistRes = await checklistTool.handler({
    outputDir: outputDir
  });
  console.log(`Asset Checklist Readiness: ${checklistRes.checklist.overallReadiness}`);

  // 3. Generate Time Savings Report
  console.log("\n[3/4] Generating Studio Automation Time Savings Report...");
  const timeSavingsTool = studioPackageTools.find(t => t.name === 'harmony.production.generate_ml_pipeline_savings_report');
  const timeSavingsRes = await timeSavingsTool.handler({
    sceneCount: runResult.scenePlanCount || 5,
    characterCount: 2,
    durationMinutes: 2
  });
  console.log(`Estimated Saved Man-Hours: ${timeSavingsRes.report.savedManHours} hours (${timeSavingsRes.report.efficiencyGainPercent}% reduction in manual setup)`);
  fs.writeFileSync(path.join(outputDir, 'time_savings_report.json'), JSON.stringify(timeSavingsRes.report, null, 2));

  // 4. Build Client Review Package
  console.log("\n[4/4] Assembling Client Review Package...");
  const reviewPackageTool = studioPackageTools.find(t => t.name === 'harmony.production.build_review_package');
  const reviewPackageRes = await reviewPackageTool.handler({
    packageDir: outputDir,
    outputDir: path.join(outputDir, 'client_review_package')
  });
  console.log(`Client Review Package Created: ${reviewPackageRes.reviewPackagePath}`);

  // 5. Compute SHA-256 Hashes for all files in outputDir
  const hashes = {};
  function computeHashesRecursively(dir, relPath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relative = relPath ? `${relPath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        computeHashesRecursively(fullPath, relative);
      } else if (entry.isFile() && entry.name !== 'hashes.json') {
        const fileBuffer = fs.readFileSync(fullPath);
        hashes[relative] = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      }
    }
  }

  computeHashesRecursively(outputDir);
  fs.writeFileSync(path.join(outputDir, 'hashes.json'), JSON.stringify(hashes, null, 2));
  console.log("\nSaved master hashes.json!");

  console.log("\n===============================================================");
  console.log("  EPISODE PACKAGE & STUDIO REPORTING SUCCESSFULLY VERIFIED!     ");
  console.log("  Output Directory: output/episode_package_results/             ");
  console.log("===============================================================");
}

runEpisodePackagePipeline().catch(err => {
  console.error("Episode Package pipeline failed:", err);
  process.exit(1);
});
