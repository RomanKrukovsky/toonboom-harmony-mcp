import fs from 'fs';
import path from 'path';
import { VariantTournament } from '../src/adapters/variantTournament/index.js';
import { AnimationCritic } from '../src/adapters/animationCritic/index.js';

async function main() {
  console.log('=== AI Studio: Director Variants & Tournament ===\n');

  const outputDir = path.resolve(process.cwd(), 'output/ai_studio_demo');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const critic = new AnimationCritic();
  const tournament = new VariantTournament(critic);

  const sceneId = `SCENE_DEMO_${Date.now()}`;
  console.log(`[1] Initiating Variant Tournament for Scene: ${sceneId}`);

  // Create some dummy variants
  const variants = [
    {
      variantId: 'variant_a_safe',
      variantName: 'Safe Option',
      variantType: 'director',
      criticInput: {
        variantId: 'variant_a_safe',
        sceneId: sceneId,
        readabilityScore: 0.8,
        dynamicScore: 0.5,
        technicalIssues: 0
      }
    },
    {
      variantId: 'variant_b_dynamic',
      variantName: 'Dynamic Option',
      variantType: 'director',
      criticInput: {
        variantId: 'variant_b_dynamic',
        sceneId: sceneId,
        readabilityScore: 0.95,
        dynamicScore: 0.9,
        technicalIssues: 1
      }
    },
    {
      variantId: 'variant_c_broken',
      variantName: 'Broken Option',
      variantType: 'director',
      criticInput: {
        variantId: 'variant_c_broken',
        sceneId: sceneId,
        readabilityScore: 0.4,
        dynamicScore: 0.9,
        technicalIssues: 5 // should fail technical gate
      }
    }
  ];

  console.log(`[2] Generated ${variants.length} Director Variants.`);
  
  const tournamentInput = {
    sceneId,
    budget: { maxComputeTimeMs: 5000, maxRefinementRounds: 1, maxVariants: 3 },
    variants
  };

  console.log('[3] Running Critic Tournament (Technical Gate -> Artistic Ranking -> Winner)...');
  const result = tournament.run(tournamentInput);

  console.log('\n=== TOURNAMENT RESULTS ===');
  console.log(`Winner: ${result.winner?.variantId || 'NONE'}`);
  if (result.winner) {
    console.log(`Winning Score: ${result.winner.finalScore.toFixed(2)}`);
  }
  
  console.log('\nFinalists:');
  for (const f of result.finalists) {
    console.log(`- ${f.variantId} (Rank ${f.rank}, Score ${f.finalScore.toFixed(2)})`);
  }

  const eliminated = result.variants.filter(v => v.eliminated);
  if (eliminated.length > 0) {
    console.log('\nEliminated:');
    for (const el of eliminated) {
      console.log(`- ${el.variantId} (Reason: ${el.eliminationReason})`);
    }
  }

  const outputPath = path.join(outputDir, 'tournament_result.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n[4] Full tournament artifact saved to: ${outputPath}`);
}

main().catch(err => {
  console.error('Error running AI Studio Demo:', err);
  process.exit(1);
});
