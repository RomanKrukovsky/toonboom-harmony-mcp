import fs from 'fs';
import path from 'path';

import type { SceneUnderstanding, DirectorVariantSet, DirectorPlan, DramaticBeat } from '../../schemas/sceneIntelligence.js';

/**
 * sceneIntelligenceReport — Iteration 1 HTML report (Master Prompt §28).
 *
 * Produces a single self-contained HTML document presenting:
 *   - scene intent + confidence
 *   - characters (with stance / role / goal)
 *   - dramatic beats timeline (with importance, intent, emotion, suggested pause)
 *   - emotion curve samples table
 *   - attention targets per beat
 *   - continuity constraints
 *   - assumptions and uncertainties (HONEST LIMITATIONS always visible)
 *   - for each director variant: shots, blocking, cameras, edit decisions, pauses
 *
 * The HTML is intentionally plain — no external CSS, no JS framework, works offline.
 */
export interface SceneIntelligenceReportInput {
  scene: SceneUnderstanding;
  variantSet: DirectorVariantSet;
}

export class SceneIntelligenceReportBuilder {
  /** Build HTML string for the report. */
  build(input: SceneIntelligenceReportInput): string {
    const { scene, variantSet } = input;
    const generatedAt = new Date().toISOString();
    return [
      '<!doctype html>',
      '<html lang="ru"><head><meta charset="utf-8">',
      `<title>${escapeHtml(scene.sceneName)} — Scene Intelligence</title>`,
      '<style>',
      'body{font-family:-apple-system,system-ui,sans-serif;background:#111;color:#eee;margin:0;padding:24px;line-height:1.45}',
      'h1{font-size:1.8em;margin-bottom:.2em;color:#fff}',
      'h2{font-size:1.3em;border-bottom:1px solid #444;padding-bottom:.2em;margin-top:2em}',
      'h3{font-size:1.05em;color:#9cc;margin-top:1.5em}',
      'table{border-collapse:collapse;width:100%;margin:.5em 0;font-size:.92em}',
      'th,td{border:1px solid #444;padding:6px 9px;text-align:left;vertical-align:top}',
      'th{background:#222;color:#9cf}',
      '.pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:.78em;background:#333;color:#fff;margin-right:4px}',
      '.conf{display:inline-block;padding:2px 6px;border-radius:3px;background:#252;font-size:.78em}',
      '.low{background:#400;color:#fbb}',
      '.med{background:#440;color:#fec}',
      '.high{background:#040;color:#bfb}',
      '.critical{background:#800;color:#fff}',
      '.beat{background:#1a1a22}',
      '.beat.important{background:#241a1a}',
      '.beat.climax{background:#2a1f1a}',
      '.beat .intent{color:#cb9}',
      '.beat .emo{color:#fca}',
      '.variant{border-left:4px solid #555;padding-left:14px;margin-top:1.5em}',
      '.v0{border-color:#9cf}.v1{border-color:#fc9}.v2{border-color:#c9f}.v3{border-color:#9fc}.v4{border-color:#f9c}',
      'small{color:#999}',
      '.warn{background:#400;color:#fbb;padding:8px 12px;border-left:4px solid #f66;margin:.5em 0}',
      'code{background:#252530;padding:1px 5px;border-radius:3px;font-family:monospace}',
      '</style></head><body>',
      head(scene, generatedAt),
      characters(scene),
      beats(scene),
      emotionCurve(scene),
      attention(scene),
      continuity(scene),
      assumptions(scene),
      uncertainties(scene),
      variants(variantSet),
      '<footer><hr><small>',
      `Generated: ${escapeHtml(generatedAt)} by SceneUnderstandingEngine v1 (rule-based). `,
      'The interpretation is an estimate and not a definitive dramatic reading. ',
      'Artist override is always allowed.',
      '</small></footer>',
      '</body></html>'
    ].join('\n');
  }

  /** Build HTML and write it to outputPath. Returns the path on success. */
  buildToFile(input: SceneIntelligenceReportInput, outputPath: string): string {
    const html = this.build(input);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html, 'utf-8');
    return outputPath;
  }
}

function head(scene: SceneUnderstanding, ts: string): string {
  return [
    `<h1>${escapeHtml(scene.sceneName)}</h1>`,
    `<div><span class="conf high">scene intent: “${escapeHtml(scene.sceneIntent)}”</span>`,
    ` <span class="conf ${confClass(scene.sceneIntentConfidence)}">confidence ${(scene.sceneIntentConfidence * 100).toFixed(0)}%</span></div>`,
    `<div><small>Scene ID: <code>${escapeHtml(scene.sceneId)}</code> · duration ${scene.totalDurationSeconds.toFixed(2)}s · ` +
    `frames ${scene.startFrame}–${scene.endFrame} @ ${scene.fps}fps · generated ${escapeHtml(ts)}</small></div>`,
    `<p><b>Source script:</b></p><pre style="background:#1a1a22;padding:12px;border-radius:6px;white-space:pre-wrap">${escapeHtml(scene.sourceScript)}</pre>`,
    `<p><small><i>Engine: ${escapeHtml(scene.provenance.engine)}. Notes: ${escapeHtml(scene.provenance.notes)}</i></small></p>`
  ].join('\n');
}

function characters(scene: SceneUnderstanding): string {
  const rows = scene.characters.map((c) => `
    <tr>
      <td><code>${escapeHtml(c.characterId)}</code></td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.role)}</td>
      <td>${escapeHtml(c.stance)}</td>
      <td>${escapeHtml(c.goalInScene)}</td>
      <td>${escapeHtml(c.emotionalArc)}</td>
      <td>${c.hasDialogue ? '✓' : '—'}</td>
      <td>${c.speaksFirst ? '✓' : ''}</td>
      <td>${c.receivesReaction ? '✓' : ''}</td>
    </tr>`).join('');
  return [
    '<h2>Characters</h2>',
    '<table><thead><tr>',
    '<th>ID</th><th>Name</th><th>Role</th><th>Stance</th><th>Goal</th><th>Emotional arc</th><th>Dialogue?</th><th>Speaks 1st?</th><th>Receives reaction?</th>',
    '</tr></thead><tbody>', rows, '</tbody></table>'
  ].join('\n');
}

function beats(scene: SceneUnderstanding): string {
  const rows = scene.beats.map((b, i) => beatRow(b, i, scene)).join('');
  return [
    '<h2>Dramatic beats</h2>',
    '<table><thead><tr>',
    '<th>#</th><th>ID</th><th>t (s)</th><th>Dur (s)</th><th>Speaker</th><th>Kind</th><th>Intent</th><th>Emotion</th><th>Action</th><th>Reaction→</th><th>Importance</th><th>Pause before</th><th>Confidence</th>',
    '</tr></thead><tbody>', rows, '</tbody></table>'
  ].join('\n');
}

function beatRow(b: DramaticBeat, i: number, scene: SceneUnderstanding): string {
  const cls = b.importance > 0.75 ? 'climax' : b.importance > 0.55 ? 'important' : 'beat';
  const reactor = scene.characters.find((c) => c.characterId === b.reactionTarget)?.name ?? '—';
  return `
    <tr class="${cls}">
      <td>${i + 1}</td>
      <td><code>${escapeHtml(b.beatId)}</code></td>
      <td>${b.startTime.toFixed(2)}–${b.endTime.toFixed(2)}</td>
      <td>${(b.endTime - b.startTime).toFixed(2)}</td>
      <td>${escapeHtml(b.primaryCharacter)}</td>
      <td>${escapeHtml(b.beatKind)}</td>
      <td class="intent">${escapeHtml(b.intent)}</td>
      <td class="emo">${escapeHtml(b.emotion)}</td>
      <td>${escapeHtml(b.action)}</td>
      <td>${escapeHtml(reactor)}</td>
      <td>${(b.importance * 100).toFixed(0)}%</td>
      <td>${b.suggestedPauseBefore.toFixed(2)}s</td>
      <td><span class="conf ${confClass(b.confidence)}">${(b.confidence * 100).toFixed(0)}%</span></td>
    </tr>`;
}

function emotionCurve(scene: SceneUnderstanding): string {
  if (!scene.emotionCurve.length) return '';
  const rows = scene.emotionCurve.map((e) => `
    <tr>
      <td>${e.time.toFixed(2)}s</td>
      <td>${escapeHtml(e.characterId)}</td>
      <td>${escapeHtml(e.label)}</td>
      <td>${e.valence.toFixed(2)}</td>
      <td>${e.arousal.toFixed(2)}</td>
      <td><span class="conf ${confClass(e.confidence)}">${(e.confidence * 100).toFixed(0)}%</span></td>
    </tr>`).join('');
  return `
    <h2>Emotion curve</h2>
    <table><thead><tr><th>Time</th><th>Character</th><th>Label</th><th>Valence</th><th>Arousal</th><th>Confidence</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function attention(scene: SceneUnderstanding): string {
  if (!scene.attentionTargets.length) return '';
  const rows = scene.attentionTargets.map((a) => `
    <tr>
      <td>${a.startFrame}–${a.endFrame}</td>
      <td>${escapeHtml(a.focusCharacterId)}</td>
      <td>${escapeHtml(a.focusType)}</td>
      <td>${escapeHtml(a.reason)}</td>
      <td><span class="conf ${confClass(a.confidence)}">${(a.confidence * 100).toFixed(0)}%</span></td>
    </tr>`).join('');
  return `
    <h2>Attention targets</h2>
    <table><thead><tr><th>Frames</th><th>Focus</th><th>Type</th><th>Reason</th><th>Confidence</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function continuity(scene: SceneUnderstanding): string {
  if (!scene.continuity.length) return '';
  const rows = scene.continuity.map((c) => `
    <tr>
      <td><code>${escapeHtml(c.id)}</code></td>
      <td>${escapeHtml(c.kind)}</td>
      <td>${escapeHtml(c.description)}</td>
      <td>${c.locked ? '🔒 locked' : ''}</td>
    </tr>`).join('');
  return `
    <h2>Continuity constraints</h2>
    <table><thead><tr><th>ID</th><th>Kind</th><th>Description</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function assumptions(scene: SceneUnderstanding): string {
  const content = (() => {
    if (!scene.assumptions.length) {
      return `<p><small>No assumptions logged.</small></p>`;
    }
    const rows = scene.assumptions.map((a) => `
      <tr>
        <td><code>${escapeHtml(a.id)}</code></td>
        <td>${escapeHtml(a.description)}</td>
        <td><span class="conf ${confClass(a.confidence)}">${(a.confidence * 100).toFixed(0)}%</span></td>
        <td>${a.falsifiable ? '✓' : ''}</td>
      </tr>`).join('');
    return `
      <table><thead><tr><th>ID</th><th>Description</th><th>Confidence</th><th>Falsifiable</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  })();

  return `
    <div class="assumptions">
      <h2>Assumptions (honest limitations — every inference is logged)</h2>
      ${content}
    </div>`;
}

function uncertainties(scene: SceneUnderstanding): string {
  const content = (() => {
    if (!scene.uncertainties.length) {
      return `<p><small>No uncertainties logged.</small></p>`;
    }
    const rows = scene.uncertainties.map((u, i) => `
      <tr class="${u.level === 'critical' ? 'critical' : u.level === 'high' ? 'high' : 'med'}">
        <td>${i + 1}</td>
        <td>${escapeHtml(u.level)}</td>
        <td>${escapeHtml(u.reason)}</td>
        <td>${u.needsHumanReview ? '⚠' : ''}</td>
      </tr>`).join('');
    return `
      <table><thead><tr><th>#</th><th>Level</th><th>Reason</th><th>Human review?</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  })();

  return `
    <div class="uncertainties">
      <h2>Uncertainties</h2>
      ${content}
    </div>`;
}

function variants(variantSet: DirectorVariantSet): string {
  const blocks = variantSet.variants.map((p, i) => variantBlock(p, i)).join('\n');
  return [
    '<h2>Director variants</h2>',
    `<p><small>${variantSet.strategyCount} strategies · ${variantSet.notes}</small></p>`,
    blocks
  ].join('\n');
}

function variantBlock(plan: DirectorPlan, index: number): string {
  const cls = `variant v${index % 5}`;
  const shotsRows = plan.shots.map((s) => `
    <tr>
      <td><code>${escapeHtml(s.shotId)}</code></td>
      <td>${escapeHtml(s.beatId ?? '—')}</td>
      <td>${escapeHtml(s.framing)}</td>
      <td>${escapeHtml(s.cameraMove)}</td>
      <td>${s.startFrame}–${s.endFrame} (${s.durationFrames}f)</td>
      <td>${escapeHtml(s.primaryFocusCharacterId)}</td>
      <td>${escapeHtml(s.staging)}</td>
      <td>${s.dialogue ? '✓' : ''}</td>
      <td>${escapeHtml(s.eyeline ?? '—')}</td>
      <td>${escapeHtml(s.description)}</td>
    </tr>`).join('');
  const blockingRows = plan.blocking.map((b) => `
    <tr>
      <td>${escapeHtml(b.characterId)}</td><td>${escapeHtml(b.startPosition)}</td><td>${escapeHtml(b.endPosition)}</td>
      <td>${escapeHtml(b.movement)}</td><td>${escapeHtml(b.notes)}</td>
    </tr>`).join('');
  const editRows = plan.editDecisions.map((e) => `
    <tr>
      <td>${e.cutFrame}</td><td><code>${escapeHtml(e.fromShotId)}</code>→<code>${escapeHtml(e.toShotId)}</code></td>
      <td>${escapeHtml(e.cutType)}</td><td>${escapeHtml(e.rationale)}</td>
    </tr>`).join('');
  const pauseRows = plan.pauses.map((p) => `
    <tr><td>${escapeHtml(p.beatId)}</td><td>${p.durationFrames}f</td><td>${escapeHtml(p.rationale)}</td></tr>`).join('');
  return `
    <div class="${cls}">
      <h3>${escapeHtml(plan.strategy)} — ${escapeHtml(plan.planId)}</h3>
      <p>${escapeHtml(plan.strategyDescription)}</p>
      <p><small>${plan.shotCount} shots · ${plan.reactionShotCount} reaction shots · ${plan.totalDurationFrames}f total ·
      confidence ${(plan.confidence * 100).toFixed(0)}% · emphasis on: ${plan.dramaticEmphasisBeatIds.length ? plan.dramaticEmphasisBeatIds.map(escapeHtml).join(', ') : '—'}</small></p>
      <h4>Shots</h4>
      <table><thead><tr>
      <th>Shot</th><th>Beat</th><th>Framing</th><th>Camera</th><th>Frames</th><th>Focus</th><th>Staging</th><th>Dialogue</th><th>Eyeline</th><th>Description</th>
      </tr></thead><tbody>${shotsRows}</tbody></table>
      ${plan.blocking.length ? `<h4>Blocking</h4><table><thead><tr><th>Character</th><th>Start</th><th>End</th><th>Movement</th><th>Notes</th></tr></thead><tbody>${blockingRows}</tbody></table>` : ''}
      ${plan.editDecisions.length ? `<h4>Edit decisions</h4><table><thead><tr><th>Frame</th><th>Cut</th><th>Type</th><th>Rationale</th></tr></thead><tbody>${editRows}</tbody></table>` : ''}
      ${plan.pauses.length ? `<h4>Pauses</h4><table><thead><tr><th>Beat</th><th>Duration</th><th>Rationale</th></tr></thead><tbody>${pauseRows}</tbody></table>` : ''}
    </div>`;
}

function confClass(c: number): string {
  if (c >= 0.75) return 'high';
  if (c >= 0.45) return 'med';
  return 'low';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}