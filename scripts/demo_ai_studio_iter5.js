#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { CharacterPartDecomposer } from '../dist/adapters/characterPartDecomposer/index.js';
import { RepresentationRouterV3 } from '../dist/adapters/representationRouterV3/index.js';

const outputDir = path.join(process.cwd(), 'output', 'ai_studio');
fs.mkdirSync(outputDir, { recursive: true });

console.log('=== AI Animation Studio — Iteration 5 Demo ===');
console.log('Part Decomposition & Hybrid Routing\n');

const decomposer = new CharacterPartDecomposer();
const router = new RepresentationRouterV3();

console.log('Step 1: Decomposing character "Masha" (humanoid, 48 frames @ 24fps)...');
const decomposition = decomposer.decompose({
  characterId: 'masha',
  frameCount: 48,
  fps: 24,
  bodyType: 'humanoid'
});

console.log(`  Parts: ${decomposition.parts.length}`);
console.log(`  Body type: ${decomposition.bodyType}`);
console.log(`  Identity continuity: ${decomposition.identityContinuityScore.toFixed(2)}`);
console.log(`  Problem ranges: ${decomposition.totalProblemRanges}`);
console.log(`  Occlusion edges: ${decomposition.occlusionGraph.length}`);

const motionClusters = {};
for (const part of decomposition.parts) {
  motionClusters[part.motionCluster] = (motionClusters[part.motionCluster] || 0) + 1;
}
console.log(`  Motion clusters: ${JSON.stringify(motionClusters)}`);

console.log('\nStep 2: Routing representations...');
const routingPlan = router.route({
  characterId: 'masha',
  sceneId: 'scene_demo_iter5',
  decomposition,
  studioProfile: {
    editabilityPriority: 0.6,
    frameByFrameAllowed: true
  }
});

console.log(`  Decisions: ${routingPlan.summary.totalDecisions}`);
console.log(`  Average confidence: ${routingPlan.summary.averageConfidence.toFixed(2)}`);
console.log(`  Locked parts: ${routingPlan.summary.lockedPartCount}`);
console.log(`  Representation counts: ${JSON.stringify(routingPlan.summary.representationCounts)}`);

console.log('\nStep 3: Routing with artist locks...');
const lockedPlan = router.route({
  characterId: 'masha',
  sceneId: 'scene_demo_iter5_locked',
  decomposition,
  artistLocks: {
    torso: 'bone_deformer',
    head: 'peg_transform'
  }
});

const lockedDecisions = lockedPlan.decisions.filter(d => d.factors.artistLocked);
console.log(`  Locked decisions: ${lockedDecisions.length}`);
for (const d of lockedDecisions) {
  console.log(`    ${d.partId} → ${d.representation} (locked, confidence=1.0)`);
}

console.log('\nStep 4: Generating HTML report...');
const reportHtml = buildReport(decomposition, routingPlan, lockedPlan);
const reportPath = path.join(outputDir, 'iteration5_demo_report.html');
fs.writeFileSync(reportPath, reportHtml);
console.log(`  Report: ${reportPath} (${reportHtml.length} bytes)`);

console.log('\nStep 5: Saving JSON artifacts...');
const decompositionPath = path.join(outputDir, 'iteration5_decomposition.json');
const routingPath = path.join(outputDir, 'iteration5_routing_plan.json');
fs.writeFileSync(decompositionPath, JSON.stringify(decomposition, null, 2));
fs.writeFileSync(routingPath, JSON.stringify(routingPlan, null, 2));
console.log(`  Decomposition: ${decompositionPath}`);
console.log(`  Routing plan: ${routingPath}`);

console.log('\n=== Demo Complete ===');
console.log(`Parts decomposed: ${decomposition.parts.length}`);
console.log(`Routing decisions: ${routingPlan.summary.totalDecisions}`);
console.log(`Representations used: ${Object.keys(routingPlan.summary.representationCounts).join(', ')}`);
console.log(`Honest status: CPU heuristic baseline, no ML segmenter, no Harmony applied.`);

function buildReport(decomp, plan, lockedPlan) {
  const partRows = decomp.parts.map(p => `
    <tr>
      <td>${p.partId}</td>
      <td>${p.identity.label}</td>
      <td>${p.identity.parentPartId || '—'}</td>
      <td>${p.motionCluster}</td>
      <td>${p.frameStates.length}</td>
      <td>${p.problemRanges.length}</td>
      <td>${p.identity.inferred ? '⚠️ inferred' : '✅ observed'}</td>
    </tr>`).join('');

  const decisionRows = plan.decisions.map(d => `
    <tr>
      <td>${d.partId}</td>
      <td><strong>${d.representation}</strong></td>
      <td>${(d.confidence * 100).toFixed(0)}%</td>
      <td>${d.explanation.substring(0, 80)}...</td>
      <td>${d.factors.artistLocked ? '🔒' : '—'}</td>
    </tr>`).join('');

  const repCounts = Object.entries(plan.summary.representationCounts)
    .map(([k, v]) => `<li><strong>${k}</strong>: ${v}</li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AI Animation Studio — Iteration 5 Demo</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 1100px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
  h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 0.5rem; }
  h2 { color: #2980b9; margin-top: 2rem; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.85rem; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
  th { background: #3498db; color: white; }
  tr:nth-child(even) { background: #f8f9fa; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
  .stat-card { background: #ecf0f1; padding: 1rem; border-radius: 8px; text-align: center; }
  .stat-value { font-size: 2rem; font-weight: bold; color: #2c3e50; }
  .stat-label { font-size: 0.85rem; color: #7f8c8d; }
  .honest { background: #fff3cd; border: 1px solid #ffc107; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
  ul { line-height: 1.8; }
</style>
</head>
<body>
<h1>AI Animation Studio — Iteration 5: Part Decomposition & Hybrid Routing</h1>

<h2>Character: Masha (Humanoid, 48 frames)</h2>

<div class="stats">
  <div class="stat-card"><div class="stat-value">${decomp.parts.length}</div><div class="stat-label">Parts Decomposed</div></div>
  <div class="stat-card"><div class="stat-value">${decomp.identityContinuityScore.toFixed(2)}</div><div class="stat-label">Identity Continuity</div></div>
  <div class="stat-card"><div class="stat-value">${decomp.totalProblemRanges}</div><div class="stat-label">Problem Ranges</div></div>
  <div class="stat-card"><div class="stat-value">${plan.summary.totalDecisions}</div><div class="stat-label">Routing Decisions</div></div>
  <div class="stat-card"><div class="stat-value">${(plan.summary.averageConfidence * 100).toFixed(0)}%</div><div class="stat-label">Avg Confidence</div></div>
  <div class="stat-card"><div class="stat-value">${lockedPlan.summary.lockedPartCount}</div><div class="stat-label">Artist Locked</div></div>
</div>

<h2>Part Decomposition</h2>
<table>
<tr><th>Part ID</th><th>Label</th><th>Parent</th><th>Motion Cluster</th><th>Frames</th><th>Problems</th><th>Status</th></tr>
${partRows}
</table>

<h2>Representation Routing Plan</h2>
<ul>${repCounts}</ul>
<table>
<tr><th>Part</th><th>Representation</th><th>Confidence</th><th>Explanation</th><th>Locked</th></tr>
${decisionRows}
</table>

<div class="honest">
<strong>⚠️ Honest Limitations:</strong>
<ul>
  <li>CPU heuristic baseline — no ML segmenter connected</li>
  <li>Part positions are estimated from humanoid template, not observed from video</li>
  <li>No Harmony applied — all computation is offline</li>
  <li>Occlusion graph is computed from depth ordering, not actual pixel overlap</li>
  <li>Representation routing is rule-based, not trained on studio preferences</li>
</ul>
</div>

<p><em>Generated: ${new Date().toISOString()}</em></p>
</body>
</html>`;
}
