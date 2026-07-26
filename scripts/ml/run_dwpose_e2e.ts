import fs from 'fs';
import path from 'path';
import { PivotEstimator } from '../../src/services/pivotEstimator/index.js';

async function runDWPose() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error("Please provide an image path");
    process.exit(1);
  }

  console.log(`Running DWPose pipeline on: ${imagePath}`);
  
  const outputDir = path.join(process.cwd(), 'output', 'dwpose_results');
  
  const payload = {
    jobId: "dwpose_test_1",
    provider: "dwpose_provider",
    modelId: "dwpose",
    inputArtifacts: [],
    parameters: {
      imagePath: path.resolve(imagePath),
      outputDir: outputDir
    }
  };

  try {
    const response = await fetch('http://127.0.0.1:8000/jobs/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("FastAPI Response:", data);
    
    if (data.status === 'success') {
      // DWPose provider successfully generated skeleton.json.
      // Let's run PivotEstimator and Zod validation.
      const skeletonPath = path.join(outputDir, 'skeleton.json');
      const rawSkeleton = JSON.parse(fs.readFileSync(skeletonPath, 'utf8'));
      
      const pir = PivotEstimator.estimate(rawSkeleton, "test_character");
      
      const pirPath = path.join(outputDir, 'character_topology_pir.json');
      fs.writeFileSync(pirPath, JSON.stringify(pir, null, 2));
      
      console.log(`\nPhase 2 Proof completed successfully!`);
      console.log(`Artifacts saved in: ${outputDir}`);
      console.log(`- character_topology_pir.json created`);
      console.log(`Requires human review: ${pir.requiresHumanReview}`);
      console.log(`Missing/unreliable: ${pir.missingOrUnreliableJoints.join(', ')}`);
    } else {
      console.error("Pipeline failed:", data.errors);
    }
  } catch (err) {
    console.error("Error connecting to ML Runtime:", err);
  }
}

runDWPose();
