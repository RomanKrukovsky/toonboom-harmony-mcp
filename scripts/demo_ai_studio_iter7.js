#!/usr/bin/env node
/**
 * Iteration 7 Demo: Animation Critic & Variant Tournament
 *
 * Demonstrates:
 * - AnimationCritic running technical and artistic checks on variants
 * - VariantTournament running multi-round ranking
 * - Winner selection and final reports
 */

import { AnimationCritic } from '../dist/adapters/animationCritic/index.js';
import { VariantTournament } from '../dist/adapters/variantTournament/index.js';
import fs from 'fs';
import path from 'path';

const outputDir = path.join(process.cwd(), 'output', 'iteration7');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🏆 Iteration 7 Demo: Animation Critic & Variant Tournament\n');

// Step 1: Create multiple variants with different quality levels
console.log('Step 1: Creating 4 variants with different quality levels...');

const variants = [
  {
    variantId: 'v1_restrained',
    variantName: 'Restrained Drama',
    variantType: 'director',
    criticInput: {
      variantId: 'v1_restrained',
      sceneId: 'scene_01',
      keyPoses: {
        poses: [
          { poseId: 'p1', type: 'AnticipationPose', confidence: 0.85, features: { silhouetteQuality: 0.8 } },
          { poseId: 'p2', type: 'KeyPose', confidence: 0.9, features: { silhouetteQuality: 0.85 } },
          { poseId: 'p3', type: 'OvershootPose', confidence: 0.8, features: { silhouetteQuality: 0.75 } },
          { poseId: 'p4', type: 'SettlePose', confidence: 0.85, features: { silhouetteQuality: 0.8 } }
        ]
      },
      cameraLayout: {
        shots: [
          { framingRules: ['rule_of_thirds', 'headroom'], cameraMovement: 'dolly_in', eyelines: [{ fromCharacterId: 'a', toCharacterId: 'b', direction: 0 }], explanation: 'Build tension' }
        ]
      }
    }
  },
  {
    variantId: 'v2_dynamic',
    variantName: 'Dynamic Commercial',
    variantType: 'director',
    criticInput: {
      variantId: 'v2_dynamic',
      sceneId: 'scene_01',
      keyPoses: {
        poses: [
          { poseId: 'p1', type: 'KeyPose', confidence: 0.6, features: { silhouetteQuality: 0.5 } }
        ]
      },
      cameraLayout: {
        shots: [
          { framingRules: ['rule_of_thirds'], cameraMovement: 'static', eyelines: [], explanation: 'Wide shot' }
        ]
      }
    }
  },
  {
    variantId: 'v3_dramatic',
    variantName: 'Dramatic Closeup',
    variantType: 'director',
    criticInput: {
      variantId: 'v3_dramatic',
      sceneId: 'scene_01',
      // Missing key poses - will trigger critical issue
      cameraLayout: {
        shots: [
          { framingRules: ['rule_of_thirds'], cameraMovement: 'dolly_in', explanation: 'Intense closeup' }
        ]
      }
    }
  },
  {
    variantId: 'v4_comedic',
    variantName: 'Comedic Timing',
    variantType: 'performance',
    criticInput: {
      variantId: 'v4_comedic',
      sceneId: 'scene_01',
      keyPoses: {
        poses: [
          { poseId: 'p1', type: 'AnticipationPose', confidence: 0.7, features: { silhouetteQuality: 0.65 } },
          { poseId: 'p2', type: 'KeyPose', confidence: 0.75, features: { silhouetteQuality: 0.7 } }
        ]
      },
      cameraLayout: {
        shots: [
          { framingRules: ['rule_of_thirds', 'headroom'], cameraMovement: 'pan_right', eyelines: [{ fromCharacterId: 'a', toCharacterId: 'b', direction: 45 }], explanation: 'Quick pan for comedic timing' }
        ]
      }
    }
  }
];

console.log(`✓ Created ${variants.length} variants\n`);

// Step 2: Run AnimationCritic on each variant
console.log('Step 2: Running AnimationCritic on each variant...');
const critic = new AnimationCritic();
const criticReports = [];

for (const variant of variants) {
  const report = critic.critique(variant.criticInput);
  criticReports.push({ variant: variant.variantName, report });
  console.log(`  ${variant.variantName}:`);
  console.log(`    Overall: ${(report.overallScore * 100).toFixed(0)}% | Technical: ${(report.technicalScore * 100).toFixed(0)}% | Artistic: ${(report.artisticScore * 100).toFixed(0)}%`);
  console.log(`    Passed: ${report.passed} | Critical: ${report.criticalIssues} | High: ${report.highIssues} | Human Review: ${report.humanReviewRequired}`);
}

console.log();

// Step 3: Run VariantTournament
console.log('Step 3: Running VariantTournament (multi-round)...');
const tournament = new VariantTournament();

const tournamentResult = tournament.run({
  sceneId: 'scene_01',
  variants,
  budget: {
    maxVariants: 4,
    maxComputeTimeMs: 120000,
    maxRefinementRounds: 1
  }
});

console.log(`✓ Tournament completed in ${tournamentResult.totalComputeTimeMs}ms`);
console.log(`  Rounds: ${tournamentResult.rounds.length}`);
for (const round of tournamentResult.rounds) {
  console.log(`    Round ${round.roundNumber}: ${round.roundType} - ${round.survivors.length} survivors, ${round.eliminated.length} eliminated`);
}

console.log();
console.log('  Final Rankings:');
const rankedVariants = [...tournamentResult.variants].sort((a, b) => (a.rank || 999) - (b.rank || 999));
for (const variant of rankedVariants) {
  const status = variant.selected ? '🏆 WINNER' : variant.eliminated ? '❌ Eliminated' : '✓ Finalist';
  console.log(`    #${variant.rank || '?'} ${variant.variantName} (${variant.variantType}) - Score: ${(variant.finalScore * 100).toFixed(0)}% ${status}`);
  if (variant.eliminationReason) {
    console.log(`       Reason: ${variant.eliminationReason}`);
  }
}

console.log();

// Step 4: Save reports
console.log('Step 4: Saving reports...');

// Save tournament result
const tournamentPath = path.join(outputDir, 'tournament_result.json');
fs.writeFileSync(tournamentPath, JSON.stringify(tournamentResult, null, 2));
console.log(`✓ Tournament result: ${tournamentPath}`);

// Save critic reports
for (const { variant, report } of criticReports) {
  const reportPath = path.join(outputDir, `critic_${variant.replace(/\s+/g, '_').toLowerCase()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`✓ Critic report: ${reportPath}`);
}

// Generate HTML summary
const html = generateHTMLSummary(tournamentResult, criticReports);
const htmlPath = path.join(outputDir, 'tournament_summary.html');
fs.writeFileSync(htmlPath, html);
console.log(`✓ HTML summary: ${htmlPath}`);

console.log('\n═══════════════════════════════════════════════════');
console.log('Iteration 7 Demo Complete!');
console.log('═══════════════════════════════════════════════════');
console.log(`\nWinner: ${tournamentResult.winner?.variantName || 'None'}`);
console.log(`Winner Score: ${((tournamentResult.winner?.finalScore || 0) * 100).toFixed(0)}%`);
console.log(`Total Variants: ${tournamentResult.variants.length}`);
console.log(`Rounds: ${tournamentResult.rounds.length}`);
console.log(`Compute Time: ${tournamentResult.totalComputeTimeMs}ms`);
console.log('\n✨ Next: Iteration 8 - Harmony Native Build\n');

function generateHTMLSummary(tournament, criticReports) {
  const winner = tournament.winner;
  const rankedVariants = [...tournament.variants].sort((a, b) => (a.rank || 999) - (b.rank || 999));

  const roundsHtml = tournament.rounds.map((round) => `
    <div class="round-card">
      <h3>Round ${round.roundNumber}: ${round.roundType.replace('_', ' ').toUpperCase()}</h3>
      <p><strong>Survivors:</strong> ${round.survivors.length} | <strong>Eliminated:</strong> ${round.eliminated.length}</p>
      ${round.roundResults ? `<p><strong>Results:</strong> ${JSON.stringify(round.roundResults)}</p>` : ''}
    </div>
  `).join('');

  const variantsHtml = rankedVariants.map((variant) => {
    const report = criticReports.find(cr => cr.variant === variant.variantName)?.report;
    const statusClass = variant.selected ? 'winner' : variant.eliminated ? 'eliminated' : 'finalist';
    const statusText = variant.selected ? '🏆 WINNER' : variant.eliminated ? '❌ Eliminated' : '✓ Finalist';

    return `
      <div class="variant-card ${statusClass}">
        <h3>#${variant.rank || '?'} ${variant.variantName}</h3>
        <p><strong>Type:</strong> ${variant.variantType} | <strong>Status:</strong> ${statusText}</p>
        <p><strong>Final Score:</strong> ${(variant.finalScore * 100).toFixed(0)}%</p>
        <p><strong>Round Reached:</strong> ${variant.roundReached}</p>
        ${variant.eliminationReason ? `<p><strong>Elimination Reason:</strong> ${variant.eliminationReason}</p>` : ''}
        ${report ? `
          <details>
            <summary>Critic Report</summary>
            <p>Overall: ${(report.overallScore * 100).toFixed(0)}% | Technical: ${(report.technicalScore * 100).toFixed(0)}% | Artistic: ${(report.artisticScore * 100).toFixed(0)}%</p>
            <p>Critical: ${report.criticalIssues} | High: ${report.highIssues} | Human Review: ${report.humanReviewRequired ? 'Yes' : 'No'}</p>
            <h4>Technical Checks: ${report.technicalChecks.length}</h4>
            <ul>
              ${report.technicalChecks.filter((c) => !c.passed).map((c) => `<li><strong>${c.checkType}</strong> (${c.severity}): ${c.evidence}</li>`).join('')}
            </ul>
            <h4>Artistic Checks: ${report.artisticChecks.length}</h4>
            <ul>
              ${report.artisticChecks.filter((c) => !c.passed).map((c) => `<li><strong>${c.checkType}</strong> (${c.severity}): ${c.evidence}</li>`).join('')}
            </ul>
          </details>
        ` : ''}
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Variant Tournament Summary - Iteration 7</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 { color: #2c3e50; margin-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
    h3 { color: #2980b9; margin-bottom: 10px; }
    .summary { background: #ecf0f1; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .summary-item {
      background: white;
      padding: 15px;
      border-radius: 4px;
      text-align: center;
    }
    .summary-item .label { font-size: 0.9em; color: #7f8c8d; margin-bottom: 5px; }
    .summary-item .value { font-size: 1.8em; font-weight: bold; color: #2c3e50; }
    .round-card {
      background: #f9f9f9;
      border-left: 4px solid #3498db;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 4px;
    }
    .variant-card {
      background: #f9f9f9;
      border-left: 4px solid #95a5a6;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 4px;
    }
    .variant-card.winner { border-left-color: #f39c12; background: #fef5e7; }
    .variant-card.eliminated { border-left-color: #e74c3c; background: #fadbd8; opacity: 0.7; }
    .variant-card.finalist { border-left-color: #3498db; }
    details { margin-top: 10px; }
    summary { cursor: pointer; font-weight: 600; padding: 5px 0; }
    ul { margin-left: 20px; margin-top: 5px; }
    li { margin-bottom: 3px; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏆 Variant Tournament Summary</h1>
    <p><strong>Scene:</strong> ${tournament.sceneId}</p>
    <p><strong>Tournament ID:</strong> ${tournament.tournamentId}</p>
    <p><strong>Generated:</strong> ${new Date().toISOString()}</p>

    <div class="summary">
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">Winner</div>
          <div class="value">${winner?.variantName || 'None'}</div>
        </div>
        <div class="summary-item">
          <div class="label">Winner Score</div>
          <div class="value">${((winner?.finalScore || 0) * 100).toFixed(0)}%</div>
        </div>
        <div class="summary-item">
          <div class="label">Total Variants</div>
          <div class="value">${tournament.variants.length}</div>
        </div>
        <div class="summary-item">
          <div class="label">Rounds</div>
          <div class="value">${tournament.rounds.length}</div>
        </div>
        <div class="summary-item">
          <div class="label">Compute Time</div>
          <div class="value">${tournament.totalComputeTimeMs}ms</div>
        </div>
      </div>
    </div>

    <h2>Tournament Rounds</h2>
    ${roundsHtml}

    <h2>Final Rankings</h2>
    ${variantsHtml}
  </div>
</body>
</html>`;
}
