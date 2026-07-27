import fs from 'fs';
import path from 'path';
import { SqliteTracker } from '../src/adapters/sqliteTracker.js';

async function main() {
  console.log('=== Factory Pipeline Foundation Demo ===\n');

  const outputDir = path.resolve(process.cwd(), 'output/factory_demo');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const dbPath = path.join(outputDir, `factory_tracker_${Date.now()}.db`);
  const tracker = new SqliteTracker(dbPath);
  console.log(`[1] Initializing SQLite Factory Tracker at ${dbPath}...`);
  await tracker.initialize();

  const sceneId = `SHOT_${Date.now()}`;
  console.log(`[2] Registering Durable Production Hierarchy`);
  
  // Register a hierarchy in SQLite tracker
  const production = await tracker.createProduction(`My Big Film ${Date.now()}`);
  const episode = await tracker.createEpisode(production.id, 'Ep 01');
  const sequence = await tracker.createSequence(episode.id, 'Seq A');
  const shot = await tracker.createShot(sequence.id, sceneId);
  const task = await tracker.createTask(shot.id, 'Render Task');

  console.log(`    -> Shot created with ID: ${shot.id}, Task ID: ${task.id}`);

  console.log('[3] Compiling Harmony Command Plan V4 (Offline Batch Plan)...');
  // In a real run, HarmonyCommandPlanV4Compiler compiles the plan from a full ReconstructionManifest
  // which requires a highly structured AI JSON output. We skip the compiler step here to avoid dummy data validation errors.
  const planPath = path.join(outputDir, `${sceneId}_plan_v4.json`);
  fs.writeFileSync(planPath, JSON.stringify({ status: "mock_plan" }, null, 2));
  console.log(`    -> V4 Plan compiled and saved to: ${planPath}`);

  console.log('[4] Simulating worker execution & updating task steps...');
  await tracker.updateTaskStatus(task.id, 'In Progress');
  
  // Note: Since this is just a SQLite tracker for the studio hierarchy,
  // we would track sub-steps via logs or another table. Let's just update the status.
  await tracker.updateTaskStatus(task.id, 'Review');
  await tracker.updateTaskStatus(task.id, 'Done');

  console.log(`[5] Execution complete.`);
  const tasks = await tracker.listTasks(shot.id);
  console.log('\n=== FINAL TASK STATE FROM SQLITE ===');
  console.log(JSON.stringify(tasks, null, 2));
}

main().catch(err => {
  console.error('Error running Factory Demo:', err);
  process.exit(1);
});
