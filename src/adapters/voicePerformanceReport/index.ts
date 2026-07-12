import fs from 'fs';
import path from 'path';
import type { PerformanceVariantSet } from '../../schemas/voicePerformance.js';

export class VoicePerformanceReportBuilder {
  build(set: PerformanceVariantSet): string {
    const v=set.voiceAnalysis;
    const variants=set.variants.map(plan=>`<section><h2>${esc(plan.style)}</h2><p>${esc(plan.styleDescription)} · confidence ${pct(plan.confidence)}</p><table><tr><th>Time</th><th>Type</th><th>Body</th><th>Action</th><th>Beat</th><th>Confidence</th></tr>${plan.events.map(e=>`<tr><td>${e.startTime.toFixed(2)}–${e.endTime.toFixed(2)}</td><td>${esc(e.kind)}</td><td>${esc(e.bodyPart)}</td><td>${esc(e.description)}</td><td>${esc(e.relatedBeatId??'—')}</td><td>${pct(e.confidence)}</td></tr>`).join('')}</table></section>`).join('');
    return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Voice & Performance — ${esc(set.sceneId)}</title><style>body{font-family:system-ui;background:#111;color:#eee;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #444;padding:6px;text-align:left}th{color:#9cf}.warn{border-left:4px solid #f66;background:#311;padding:10px}section{margin:28px 0}</style></head><body><h1>Voice & Performance</h1><p>Scene <code>${esc(set.sceneId)}</code>, character <code>${esc(set.characterId)}</code></p><div class="warn">Эмоция — только предположение по энергии, высоте и тексту. Нужна проверка режиссёра.</div><h2>Voice analysis</h2><p>${v.durationSeconds.toFixed(2)}s · ${v.words.length} words · ${v.speechRateWpm.toFixed(0)} WPM · ${v.pauses.length} pauses · ${v.emotionalPeaks.length} proxy peaks · alignment ${esc(v.provenance.alignment)}</p><table><tr><th>Word</th><th>Time</th><th>Confidence</th></tr>${v.words.map(w=>`<tr><td>${esc(w.text)}</td><td>${w.startTime.toFixed(2)}–${w.endTime.toFixed(2)}</td><td>${pct(w.confidence)}</td></tr>`).join('')}</table>${variants}<h2>Assumptions</h2><ul>${v.assumptions.map(a=>`<li>${esc(a)}</li>`).join('')}</ul></body></html>`;
  }
  buildToFile(set:PerformanceVariantSet,outputPath:string){fs.mkdirSync(path.dirname(outputPath),{recursive:true});fs.writeFileSync(outputPath,this.build(set),'utf8');return outputPath;}
}
function esc(v:string){return v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));} function pct(n:number){return`${Math.round(n*100)}%`;}
