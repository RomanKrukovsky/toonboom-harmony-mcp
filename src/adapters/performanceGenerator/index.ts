import { createHash } from 'crypto';
import type { SceneUnderstanding, DramaticBeat } from '../../schemas/sceneIntelligence.js';
import { performancePlanSchema, performanceVariantSetSchema, type VoiceAnalysis, type PerformanceEvent, type PerformancePlan, type PerformanceStyle, type PerformanceVariantSet } from '../../schemas/voicePerformance.js';

export const ALL_PERFORMANCE_STYLES: PerformanceStyle[] = ['restrained', 'energetic', 'sarcastic', 'anxious', 'aggressive', 'comedic', 'custom'];

const profiles: Record<PerformanceStyle, { scale: number; gestures: number; blink: number; delay: number; description: string }> = {
  restrained: { scale: .48, gestures: .45, blink: .8, delay: .05, description: 'Сдержанная игра: меньше жестов, больше взгляда и пауз.' },
  energetic: { scale: .9, gestures: 1, blink: 1, delay: 0, description: 'Энергичная игра: частые акценты корпуса и рук.' },
  sarcastic: { scale: .62, gestures: .55, blink: .7, delay: .12, description: 'Сарказм: запоздалые реакции, асимметричная мимика и подчеркнутые holds.' },
  anxious: { scale: .72, gestures: .8, blink: 1.6, delay: 0, description: 'Тревога: частые моргания, сбитое дыхание, мелкие переносы веса.' },
  aggressive: { scale: .95, gestures: .85, blink: .45, delay: -.03, description: 'Напор: ранний head lead, прямой взгляд и сильные акценты.' },
  comedic: { scale: .82, gestures: .75, blink: .9, delay: .2, description: 'Комедия: читаемые паузы, double take и overshoot.' },
  custom: { scale: .65, gestures: .65, blink: 1, delay: 0, description: 'Нейтральная база для ручной настройки.' }
};

export class PerformanceGenerator {
  static defaultStyles(): PerformanceStyle[] { return ['restrained', 'energetic', 'sarcastic']; }

  generate(scene: SceneUnderstanding, voice: VoiceAnalysis, characterId: string, style: PerformanceStyle): PerformancePlan {
    const character = scene.characters.find(c => c.characterId === characterId);
    if (!character) throw new Error(`Персонаж "${characterId}" не найден в сцене.`);
    const p = profiles[style], events: PerformanceEvent[] = [], own = scene.beats.filter(b => b.primaryCharacter === characterId), reactions = scene.reactionBeats.filter(r => r.reactor === characterId);
    let n = 1;
    const add = (e: Omit<PerformanceEvent, 'eventId'>) => events.push({ eventId: `evt_${String(n++).padStart(3, '0')}`, ...e });
    add(event('pose', 0, Math.min(scene.totalDurationSeconds, .45), p.scale*.55, null, 'body', own[0]?.beatId ?? null, 'establish character stance', .72, 'scene_beat', ['hold neutral', 'shift weight']));
    for (const beat of own) this.addBeatEvents(add, beat, voice, characterId, p, style);
    for (const r of reactions) {
      const trigger = scene.beats.find(b => b.beatId === r.triggerBeatId); if (!trigger) continue;
      const t = clamp(trigger.endTime + p.delay, 0, scene.totalDurationSeconds - .08);
      add(event('reaction', t, Math.min(scene.totalDurationSeconds, t + (style === 'comedic' ? .48 : .25)), p.scale * trigger.importance, trigger.primaryCharacter, 'face_and_torso', trigger.beatId, style === 'comedic' ? 'double take after line' : 'silent reaction to partner', r.confidence, 'scene_beat', ['hold gaze', 'look away']));
    }
    for (const pause of voice.pauses) add(event('breath', pause.startTime, Math.min(pause.endTime, pause.startTime + .35), Math.min(.75, .3 + pause.duration), null, 'chest_shoulders', nearestBeat(scene.beats, pause.startTime)?.beatId ?? null, pause.kind === 'hesitation' ? 'shallow hesitation breath' : 'breath on voice pause', .67, 'voice_energy', ['silent hold', 'small swallow']));
    const blinkStep = Math.max(1.2, 3.2 / p.blink); for (let t=.8; t < scene.totalDurationSeconds; t += blinkStep) add(event('blink', t, Math.min(scene.totalDurationSeconds, t+.12), style === 'anxious' ? .75 : .45, null, 'eyes', nearestBeat(scene.beats,t)?.beatId ?? null, style === 'anxious' ? 'rapid tension blink' : 'natural blink', .61, 'style_rule', ['delay blink', 'double blink']));
    if (style === 'comedic') { const climax = [...scene.beats].sort((a,b)=>b.importance-a.importance)[0]; const t=clamp(climax.endTime,0,scene.totalDurationSeconds-.15); add(event('hold',t,Math.min(scene.totalDurationSeconds,t+.4),.8,null,'full_body',climax.beatId,'comedic hold after strongest beat',.65,'style_rule',['short hold','immediate reaction'])); }
    events.sort((a,b)=>a.startTime-b.startTime || a.eventId.localeCompare(b.eventId));
    const plan: PerformancePlan = { schemaVersion:'1.0', planId:`perf_${hash(`${scene.sceneId}:${characterId}:${style}`)}`, sceneId:scene.sceneId, characterId, style, styleDescription:p.description, events, eventCount:events.length, confidence:round(events.reduce((s,e)=>s+e.confidence,0)/events.length), assumptions:['План — редактируемая постановочная гипотеза, не готовая анимация.','Эмоция из голоса не считается фактом; варианты оставлены в каждом событии.'], provenance:{engine:'rule_based PerformanceGenerator v1',createdAt:new Date().toISOString()} };
    return performancePlanSchema.parse(plan);
  }

  generateVariants(scene: SceneUnderstanding, voice: VoiceAnalysis, characterId: string, count=3, styles?: PerformanceStyle[]): PerformanceVariantSet {
    const selected=(styles?.length?styles:PerformanceGenerator.defaultStyles()).slice(0,count); let i=0; while(selected.length<count) selected.push(ALL_PERFORMANCE_STYLES[i++%ALL_PERFORMANCE_STYLES.length]);
    return performanceVariantSetSchema.parse({schemaVersion:'1.0',sceneId:scene.sceneId,characterId,variants:selected.map(s=>this.generate(scene,voice,characterId,s)),voiceAnalysis:voice,sourceScene:scene,notes:'Rule-based variants differ by readable acting policy; they are candidates for human review.'});
  }

  mix(base: PerformancePlan, gestureTiming: PerformancePlan, finalPose: PerformancePlan): PerformancePlan {
    if (new Set([base.sceneId,gestureTiming.sceneId,finalPose.sceneId]).size!==1 || new Set([base.characterId,gestureTiming.characterId,finalPose.characterId]).size!==1) throw new Error('Смешивать можно только планы одной сцены и одного персонажа.');
    const gestureEvents=gestureTiming.events.filter(e=>e.kind==='gesture'); const baseEvents=base.events.filter(e=>e.kind!=='gesture' && e.kind!=='pose'); const poses=finalPose.events.filter(e=>e.kind==='pose'); const events=[...baseEvents,...gestureEvents,...poses].sort((a,b)=>a.startTime-b.startTime).map((e,i)=>({...e,eventId:`evt_${String(i+1).padStart(3,'0')}`}));
    return performancePlanSchema.parse({...base,planId:`perf_${hash(`${base.planId}:${gestureTiming.planId}:${finalPose.planId}`)}`,style:'custom',styleDescription:`Acting ${base.style}; gestures ${gestureTiming.style}; poses ${finalPose.style}.`,events,eventCount:events.length,confidence:round((base.confidence+gestureTiming.confidence+finalPose.confidence)/3),provenance:{engine:'rule_based PerformanceGenerator v1',createdAt:new Date().toISOString()}});
  }

  private addBeatEvents(add:(e:Omit<PerformanceEvent,'eventId'>)=>void, beat:DramaticBeat, voice:VoiceAnalysis, characterId:string, p:{scale:number;gestures:number;blink:number;delay:number}, style:PerformanceStyle) {
    const peak=voice.emotionalPeaks.find(x=>x.time>=beat.startTime&&x.time<=beat.endTime), intensity=clamp((.35+beat.importance*.55+(peak?.strength??0)*.2)*p.scale,0,1), t=clamp(beat.startTime+p.delay,0,Math.max(0,beat.endTime-.08));
    add(event('gaze',t,Math.min(beat.endTime,t+.25),intensity,beat.reactionTarget ?? null,'eyes',beat.beatId,beat.reactionTarget?'look to scene partner':'look toward attention target',.7,'scene_beat',['brief look away','hold previous eyeline']));
    add(event('facial_expression',t,beat.endTime,intensity,null,'face',beat.beatId,`${beat.emotion} expression proxy`,Math.min(.68,beat.confidence),'text_rule',['neutral','reduced expression']));
    add(event('head_accent',Math.min(beat.endTime-.05,t+.06),Math.min(beat.endTime,t+.22),intensity,null,'head',beat.beatId,style==='aggressive'?'early head lead':'head accent on phrase',peak?.confidence??.55,peak?'voice_energy':'scene_beat',['no accent','brow accent']));
    if (beat.importance*p.gestures>.42) add(event('gesture',Math.min(beat.endTime-.08,t+.12),beat.endTime,Math.min(1,intensity*p.gestures),beat.reactionTarget ?? null,'hands_arms',beat.beatId,gestureFor(beat,style),.58,peak?'voice_energy':'style_rule',['open palm','keep hands still']));
    if (beat.importance>.65) add(event('weight_shift',t,beat.endTime,Math.min(1,intensity*.8),beat.reactionTarget ?? null,'hips_feet',beat.beatId,style==='aggressive'?'weight forward':'subtle weight transfer',.56,'scene_beat',['stay centered','retreat slightly']));
  }
}

function event(kind:PerformanceEvent['kind'],startTime:number,endTime:number,intensity:number,target:string|null,bodyPart:string,relatedBeatId:string|null,description:string,confidence:number,provenance:PerformanceEvent['provenance'],alternatives:string[]):Omit<PerformanceEvent,'eventId'>{return{kind,startTime:round(startTime),endTime:round(Math.max(startTime+.04,endTime)),intensity:round(clamp(intensity,0,1)),target,bodyPart,relatedBeatId,description,confidence:round(clamp(confidence,0,1)),provenance,alternatives};}
function gestureFor(b:DramaticBeat,s:PerformanceStyle){if(s==='sarcastic')return'one-sided open palm with delayed settle';if(s==='anxious')return'small self-touch or finger fidget';if(s==='aggressive')return'contained forward point';if(s==='comedic')return'exaggerated presentational gesture';if(b.intent==='accuse'||b.intent==='challenge')return'controlled indicating gesture';return'open palm supporting phrase';}
function nearestBeat(beats:DramaticBeat[],t:number){return beats.reduce<DramaticBeat|undefined>((a,b)=>!a||Math.abs(b.startTime-t)<Math.abs(a.startTime-t)?b:a,undefined);}
function hash(s:string){return createHash('sha1').update(s).digest('hex').slice(0,12);}
function clamp(n:number,a:number,b:number){return Math.max(a,Math.min(b,n));} function round(n:number){return Math.round(n*1000)/1000;}
