import fs from 'fs';
import path from 'path';
import { voiceAnalysisSchema, type VoiceAnalysis } from '../../schemas/voicePerformance.js';

export interface VoiceInput {
  audioPath?: string;
  transcript: string;
  durationSeconds?: number;
  language?: string;
  speaker?: string;
  emotionHints?: string[];
}

interface WavData { sampleRate: number; samples: Float64Array; duration: number; }

export class VoicePerformanceAnalyzer {
  analyze(input: VoiceInput): VoiceAnalysis {
    const wav = input.audioPath ? readPcmWav(input.audioPath) : null;
    const duration = wav?.duration ?? input.durationSeconds ?? estimateDuration(input.transcript);
    const tokens = tokenize(input.transcript);
    const loudness = wav ? energyEnvelope(wav.samples, wav.sampleRate) : textEnvelope(tokens, duration);
    const pitchContour = wav ? pitchEnvelope(wav.samples, wav.sampleRate) : [];
    const active = activityRanges(loudness, duration);
    const words = alignWords(tokens, duration, active);
    const pauses = findPauses(words, duration, input.transcript, active);
    const stresses = words.map((w, i) => ({ wordIndex: i, time: (w.startTime + w.endTime) / 2, strength: stressStrength(w.text, i, words.length) }));
    const phonemes = words.flatMap((w) => phonemize(w));
    const emotionalPeaks = findPeaks(loudness, pitchContour, words);
    const speaker = input.speaker ?? 'speaker_1';
    const result: VoiceAnalysis = {
      schemaVersion: '1.0', audioPath: input.audioPath ? path.resolve(input.audioPath) : null,
      audioAvailable: Boolean(wav), durationSeconds: round(duration), sampleRate: wav?.sampleRate ?? null,
      transcript: input.transcript, words, phonemes, stresses, pauses, loudness, pitchContour,
      speechRateWpm: round(tokens.length / duration * 60),
      breathPoints: pauses.filter((p) => p.duration >= 0.18).map((p) => round(p.startTime + p.duration / 2)),
      emotionalPeaks,
      turnTaking: [{ speaker, startTime: words[0]?.startTime ?? 0, endTime: words.at(-1)?.endTime ?? duration }],
      interruptions: [],
      reactionWindows: pauses.filter((p) => p.duration >= 0.25).map((p) => ({ startTime: p.startTime, endTime: p.endTime, trigger: 'pause_after_phrase' })),
      assumptions: [
        wav ? 'Слова распределены по участкам с речевой энергией; это CPU baseline, не точный forced aligner.' : 'Аудио не дано: тайминг слов рассчитан по длине текста.',
        'Эмоциональные пики — подсказки по энергии, высоте и пунктуации, а не достоверное распознавание эмоции.'
      ],
      provenance: { engine: 'cpu VoicePerformanceAnalyzer v1', alignment: wav ? 'energy_guided' : input.durationSeconds ? 'duration_proportional' : 'transcript_only', emotionIsProxy: true, createdAt: new Date().toISOString() }
    };
    return voiceAnalysisSchema.parse(result);
  }
}

function readPcmWav(file: string): WavData {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Поддерживается только WAV PCM/float.');
  let off = 12, fmt: { format: number; channels: number; rate: number; bits: number } | null = null, data: Buffer | null = null;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4), size = b.readUInt32LE(off + 4), start = off + 8;
    if (id === 'fmt ') fmt = { format: b.readUInt16LE(start), channels: b.readUInt16LE(start + 2), rate: b.readUInt32LE(start + 4), bits: b.readUInt16LE(start + 14) };
    if (id === 'data') data = b.subarray(start, start + size);
    off = start + size + (size % 2);
  }
  if (!fmt || !data || ![1, 3].includes(fmt.format)) throw new Error('WAV не содержит поддерживаемый PCM/float data chunk.');
  const bytes = fmt.bits / 8, frames = Math.floor(data.length / (bytes * fmt.channels)), samples = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < fmt.channels; c++) {
      const p = (i * fmt.channels + c) * bytes;
      if (fmt.format === 3 && fmt.bits === 32) sum += data.readFloatLE(p);
      else if (fmt.format === 3 && fmt.bits === 64) sum += data.readDoubleLE(p);
      else if (fmt.format === 1 && fmt.bits === 8) sum += (data.readUInt8(p) - 128) / 128;
      else if (fmt.format === 1 && fmt.bits === 16) sum += data.readInt16LE(p) / 32768;
      else if (fmt.format === 1 && fmt.bits === 24) sum += data.readIntLE(p, 3) / 8388608;
      else if (fmt.format === 1 && fmt.bits === 32) sum += data.readInt32LE(p) / 2147483648;
      else throw new Error(`Неподдерживаемая глубина WAV: format=${fmt.format}, bits=${fmt.bits}.`);
    }
    samples[i] = sum / fmt.channels;
  }
  return { sampleRate: fmt.rate, samples, duration: frames / fmt.rate };
}

function tokenize(text: string): string[] { return text.match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)?[!?.,…]?/gu) ?? []; }
function estimateDuration(text: string): number { return Math.max(1, tokenize(text).length / 2.4); }
function round(n: number): number { return Math.round(n * 1000) / 1000; }
function energyEnvelope(s: Float64Array, rate: number) {
  const hop = Math.max(1, Math.round(rate * 0.05)), out = [];
  for (let i = 0; i < s.length; i += hop) { let q = 0; const end = Math.min(s.length, i + hop); for (let j = i; j < end; j++) q += s[j] * s[j]; out.push({ time: round(i / rate), rms: round(Math.min(1, Math.sqrt(q / Math.max(1, end - i)))) }); }
  return out;
}
function textEnvelope(words: string[], duration: number) { return words.map((w, i) => ({ time: round((i + .5) / Math.max(1, words.length) * duration), rms: round(/[!?]/.test(w) ? .7 : .35) })); }
function pitchEnvelope(s: Float64Array, rate: number) {
  const win = Math.round(rate * .04), hop = Math.round(rate * .1), out = [];
  for (let start = 0; start + win < s.length; start += hop) {
    let bestLag = 0, best = 0, energy = 0; for (let i = 0; i < win; i++) energy += s[start + i] ** 2;
    if (energy / win < 1e-5) continue;
    for (let lag = Math.floor(rate / 400); lag <= Math.floor(rate / 70); lag++) { let corr = 0; for (let i = 0; i < win - lag; i++) corr += s[start + i] * s[start + i + lag]; if (corr > best) { best = corr; bestLag = lag; } }
    if (bestLag) out.push({ time: round(start / rate), hz: round(rate / bestLag), confidence: round(Math.min(.85, best / energy)) });
  } return out;
}
function activityRanges(env: { time: number; rms: number }[], duration: number) {
  if (!env.length) return [{ start: 0, end: duration }]; const peak = Math.max(...env.map(e => e.rms), .001), threshold = Math.max(.006, peak * .12), ranges: { start: number; end: number }[] = []; let start: number | null = null;
  for (const e of env) { if (e.rms >= threshold && start === null) start = e.time; if (e.rms < threshold && start !== null) { if (e.time - start > .08) ranges.push({ start, end: e.time }); start = null; } } if (start !== null) ranges.push({ start, end: duration }); return ranges.length ? ranges : [{ start: 0, end: duration }];
}
function alignWords(tokens: string[], duration: number, ranges: { start: number; end: number }[]) {
  const spans: { start: number; end: number }[] = []; for (const r of ranges) { for (let t = r.start; t < r.end; t += .06) spans.push({ start: t, end: Math.min(r.end, t + .06) }); }
  const weights = tokens.map(t => Math.max(1, t.replace(/\W/gu, '').length)), total = weights.reduce((a, b) => a + b, 0); let cursor = 0;
  return tokens.map((text, i) => { const n = Math.max(1, Math.round(weights[i] / total * spans.length)); const selected = spans.slice(cursor, cursor + n); cursor += n; const fallbackStart = i / Math.max(1, tokens.length) * duration, fallbackEnd = (i + 1) / Math.max(1, tokens.length) * duration; return { text, startTime: round(selected[0]?.start ?? fallbackStart), endTime: round(selected.at(-1)?.end ?? fallbackEnd), confidence: ranges.length > 1 ? .62 : .48 }; });
}
function findPauses(words: { startTime: number; endTime: number; text: string }[], duration: number, transcript: string, active: { start: number; end: number }[]) {
  const out: { startTime: number; endTime: number; duration: number; kind: 'breath'|'hesitation'|'turn_gap'|'silence' }[] = []; for (let i = 0; i < words.length - 1; i++) { const d = words[i + 1].startTime - words[i].endTime; if (d >= .12) out.push({ startTime: words[i].endTime, endTime: words[i + 1].startTime, duration: round(d), kind: /[…]$/.test(words[i].text) ? 'hesitation' : 'breath' }); }
  for (let i = 0; i < active.length - 1; i++) { const d = active[i + 1].start - active[i].end; if (d >= .15 && !out.some(p => Math.abs(p.startTime - active[i].end) < .1)) out.push({ startTime: round(active[i].end), endTime: round(active[i + 1].start), duration: round(d), kind: 'silence' }); }
  if (!out.length && /[…]|\.\.\./.test(transcript)) { const t = duration * .4; out.push({ startTime: round(t), endTime: round(t + Math.min(.3, duration * .1)), duration: round(Math.min(.3, duration * .1)), kind: 'hesitation' }); } return out.sort((a,b) => a.startTime-b.startTime);
}
function stressStrength(word: string, index: number, count: number) { return round(Math.min(1, .35 + Math.min(10, word.length) / 25 + (/[!?]/.test(word) ? .3 : 0) + (index === count - 1 ? .1 : 0))); }
function phonemize(w: { text: string; startTime: number; endTime: number; confidence: number }) { const letters = w.text.toLowerCase().match(/[aeiouyаеёиоуыэюя]+|[bcdfghjklmnpqrstvwxzбвгджзйклмнпрстфхцчшщ]+/gu) ?? [w.text]; const d = (w.endTime - w.startTime) / letters.length; return letters.map((p, i) => ({ text: p, word: w.text, startTime: round(w.startTime + i*d), endTime: round(w.startTime + (i+1)*d), confidence: round(w.confidence * .7) })); }
function findPeaks(env: {time:number;rms:number}[], pitch: {time:number;hz:number;confidence:number}[], words: {text:string;startTime:number;endTime:number}[]) { const peaks: VoiceAnalysis['emotionalPeaks'] = []; const maxE = env.reduce((a,b)=>b.rms>a.rms?b:a,{time:0,rms:0}); if(maxE.rms>.15) peaks.push({time:maxE.time,strength:round(maxE.rms),label:'energy_peak',confidence:.65,alternatives:['recording gain peak','emphasis']}); const punct=words.filter(w=>/[!?]/.test(w.text)); for(const w of punct) peaks.push({time:round((w.startTime+w.endTime)/2),strength:.7,label:'text_emphasis',confidence:.58,alternatives:['question contour','sentence ending']}); if(pitch.length){const p=pitch.reduce((a,b)=>b.hz>a.hz?b:a); peaks.push({time:p.time,strength:round(Math.min(1,p.hz/350)),label:'pitch_peak',confidence:round(p.confidence*.75),alternatives:['speaker pitch range','prosodic accent']});} return peaks.slice(0,8); }
