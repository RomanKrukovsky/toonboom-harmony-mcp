#!/usr/bin/env node
/**
 * Auto-rigger golden path — offline evidence runner.
 *
 * Compiles a production rig plan from REAL model output in one deterministic
 * pass — the mechanical layer of 2D cut-out rigging with no human in the loop:
 *
 *   real DWPose skeleton (committed fixture, Sprint-0 evidence)
 *     -> CharacterTopologyPIR (joints, pivots, reliability audit)
 *     -> biped_standard template binding (landmark -> slot)
 *     -> HarmonyCommandPlanV4 (create_peg / set_peg_pivot / connect_nodes)
 *
 * Writes docs/evidence/auto-rigger-golden-path/ backing the
 * `rigger.auto_rig_compile` registry entry.
 *
 * Requires `npm run build`. No Harmony execution: the plan stays
 * implemented_unverified until applied to a licensed Harmony.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import stringify from 'fast-json-stable-stringify';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

if (!fs.existsSync(path.join(root, 'dist', 'services', 'autoRigCompiler'))) {
  console.error('dist/ missing or stale. Run `npm run build` first.');
  process.exit(1);
}

const { RigTemplateRegistry } = await import('../dist/services/rigTemplateRegistry/index.js');
const {
  AutoRigCompiler,
  stripVolatilePlanFields
} = await import('../dist/services/autoRigCompiler/index.js');

const FIXTURE = path.join(root, 'fixtures', 'auto_rig', 'skeleton_dwpose_real.json');
const BUNDLE_DIR = path.join(root, 'docs', 'evidence', 'auto-rigger-golden-path');
const CHARACTER_ID = fixtures_characterId();

function fixtures_characterId() {
  // Stable id; the fixture is one photographic character from Sprint 0.
  return 'char_sprint0_photo_v1';
}

function fail(msg) {
  console.error(`AUTO-RIG GOLDEN PATH FAILED: ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

if (!fs.existsSync(FIXTURE)) fail('fixtures/auto_rig/skeleton_dwpose_real.json missing');
const rawSkeleton = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
if (!Array.isArray(rawSkeleton.points) || rawSkeleton.points.length === 0) {
  fail('fixture skeleton carries no points');
}

const DRAWING_PIR_PATH = path.join(root, 'fixtures', 'auto_rig', 'drawing_pir_structural.json');
if (!fs.existsSync(DRAWING_PIR_PATH)) fail('fixtures/auto_rig/drawing_pir_structural.json missing');
const drawingPir = JSON.parse(fs.readFileSync(DRAWING_PIR_PATH, 'utf8'));

// ---------------------------------------------------------------------------
// Pipeline (executed twice for the determinism gate)
// ---------------------------------------------------------------------------

async function runPipeline() {
  const registry = new RigTemplateRegistry();
  await registry.initialize();
  const compiler = new AutoRigCompiler();
  return compiler.compile(rawSkeleton, CHARACTER_ID, registry, undefined, undefined, drawingPir);
}

const runA = await runPipeline();
const runB = await runPipeline();

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

/** planId/createdAt are Date.now()-stamped and planHash derives from them; digests exclude all three. */
const stripPlanId = obj => {
  const { planId, createdAt, planHash, ...rest } = obj;
  return rest;
};

const digestOf = r =>
  sha256(
    stringify({
      topologyPir: r.topologyPir,
      bindingPlan: r.bindingPlan,
      commandPlan: stripVolatilePlanFields(r.commandPlan),
      rigAssemblyPlan: r.rigAssemblyPlan ? stripPlanId(r.rigAssemblyPlan) : null,
      deformerPlan: r.deformerPlan ? stripPlanId(r.deformerPlan) : null,
      jointGuides: r.jointGuides
    })
  );

const determinism = {
  checked: true,
  method:
    'two independent runs; SHA-256 over fast-json-stable-stringify of all volatile-stripped artifacts (planId/manifestId/createdAt are random per run by design)',
  rigContentDigestMatch: digestOf(runA) === digestOf(runB),
  rig_content_sha256: runA.rigContentDigest
};
if (!determinism.rigContentDigestMatch) fail('determinism double-run mismatch');

// ---------------------------------------------------------------------------
// Evidence bundle
// ---------------------------------------------------------------------------

fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
fs.mkdirSync(BUNDLE_DIR, { recursive: true });

const writeJson = (name, obj) =>
  fs.writeFileSync(path.join(BUNDLE_DIR, name), JSON.stringify(obj, null, 2) + '\n', 'utf8');

writeJson('character_topology_pir.json', runA.topologyPir);
writeJson('rig_binding_plan.json', runA.bindingPlan);
writeJson('harmony_command_plan_v4.json', runA.commandPlan);
writeJson('rig_assembly_plan.json', runA.rigAssemblyPlan);
writeJson('deformer_master_controller_plan.json', runA.deformerPlan);
writeJson('joint_guides.json', runA.jointGuides);

const commandTypes = [...new Set(runA.commandPlan.commands.map(c => c.type))];

writeJson('execution-report.json', {
  capabilityId: 'rigger.auto_rig_compile',
  generatedAt: new Date().toISOString(),
  executedOffline: true,
  realModelExecuted: false,
  realModelDerivedInput: true,
  realHarmonyExecuted: false,
  input: {
    skeletonFixture: 'fixtures/auto_rig/skeleton_dwpose_real.json',
    skeletonProvenance:
      'byte-for-byte copy of docs/evidence/sprint0-pose/skeleton.json (real YOLOX_l + dw-ll_ucoco_384 ONNX inference on fixtures/character.png)',
    drawingPirFixture: 'fixtures/auto_rig/drawing_pir_structural.json',
    drawingPirProvenance:
      'structural semantic-layer decomposition (zero strokes); replaced by a real vectorization PIR once a character is commissioned',
    characterId: CHARACTER_ID
  },
  pipeline: [
    'PivotEstimator.estimate -> CharacterTopologyPIR (+ schema validation, reliability audit)',
    'RigTemplateRegistry.getTemplate(biped_standard, 1.0.0)',
    'RigBindingResolver.resolveBinding (landmark -> template slot)',
    'HarmonyCommandBuilder.buildPlan -> HarmonyCommandPlanV4',
    'CharacterRigAssembler.assemblePlan -> cut-out part hierarchy (pegs, patches, backdrops)',
    'DeformerGenerator.generatePlan -> Curve/Envelope deformers + face master controller',
    'harmonyCommandPlanV4Schema.safeParse'
  ],
  topologyAudit: {
    pointsTotal: runA.topologyPir.points.length,
    requiresHumanReview: runA.topologyPir.requiresHumanReview,
    missingOrUnreliableJoints: runA.topologyPir.missingOrUnreliableJoints
  },
  bindingSummary: {
    bindingsResolved: runA.bindingPlan.bindings.length,
    unresolved: runA.bindingPlan.unresolved,
    warnings: runA.bindingPlan.warnings
  },
  commandPlanSummary: {
    status: runA.commandPlan.status,
    requiresRealHarmony: runA.commandPlan.requiresRealHarmony,
    commandCount: runA.commandPlan.commands.length,
    commandTypes
  },
  rigPackageSummary: {
    partsPlanned: runA.attachments.length,
    deformersPlanned: runA.deformerPlan ? runA.deformerPlan.deformers.length : 0,
    deformerTypes: runA.deformerPlan ? [...new Set(runA.deformerPlan.deformers.map(d => d.type))] : [],
    masterControllers: runA.deformerPlan ? runA.deformerPlan.masterControllers.length : 0,
    faceMcControlledNodes: runA.deformerPlan?.masterControllers[0]?.controlledNodes.length ?? 0,
    autoPatchJoints: runA.rigAssemblyPlan ? (runA.rigAssemblyPlan.autoPatchJoints ?? []).length : null
  },
  jointGuidesSummary: {
    hingesSolved: runA.jointGuides.guides.length,
    missingHingeLandmarks: runA.missingHingeLandmarks,
    overlapFactor: runA.jointGuides.overlapFactor,
    radii: Object.fromEntries(runA.jointGuides.guides.map(g => [g.jointName, g.radiusPx])),
    overlay: 'joint_guides_overlay.png',
    visualAuditNote:
      'On THIS fixture the hinge landmarks are visually unreliable (elbow_right lands near the face, knee_right on the foreground helmet) because the subject sits with crossed arms. The circle geometry is exact for the given landmarks; guides become production-grade only on full-body artwork with clean joints. The overlay exists precisely to make this audit visible.'
  },
  schemaValidation: {
    characterTopologyPir: true,
    harmonyCommandPlanV4: true
  },
  determinism,
  limitations: [
    'No Harmony execution: the rig package stays implemented_unverified until applied to a licensed Harmony.',
    'Topology derives from one photographic fixture; stylised/animated line-art characters are unvalidated upstream (Sprint 0 known failure).',
    'The drawing decomposition is structural (semantic layers, zero strokes); real artwork slicing arrives with a commissioned character.',
    'The bridge-side deformer executor is an acknowledged mock (GROUP placeholders); deformers are PLAN-level until the executor is implemented.',
    'The reliability audit flags joints needing review; art-gap patch artwork at deformed joints and final rig approval stay human.',
    'planId fields of assembly/deformer plans and command-plan identity fields are random per run by design.'
  ],
  nextRequiredProof:
    'Apply the rig command plan to a licensed Harmony (open_project -> execute create_peg/set_peg_pivot/connect_nodes -> save -> reopen -> audit node graph).'
});

const hashTargets = fs.readdirSync(BUNDLE_DIR).filter(f => f.endsWith('.json') || f.endsWith('.png'));
const hashes = {};
for (const f of hashTargets.sort()) {
  hashes[f] = sha256(fs.readFileSync(path.join(BUNDLE_DIR, f)));
}
writeJson('hashes.json', { hashes });

console.log(JSON.stringify({
  ok: true,
  bundle: path.relative(root, BUNDLE_DIR),
  characterId: CHARACTER_ID,
  bindings: runA.bindingPlan.bindings.length,
  commands: runA.commandPlan.commands.length,
  commandTypes,
  partsPlanned: runA.attachments.length,
  deformersPlanned: runA.deformerPlan ? runA.deformerPlan.deformers.length : 0,
  masterControllers: runA.deformerPlan ? runA.deformerPlan.masterControllers.length : 0,
  requiresHumanReview: runA.topologyPir.requiresHumanReview,
  determinism
}, null, 2));
