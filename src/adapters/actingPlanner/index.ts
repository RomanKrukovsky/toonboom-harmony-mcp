import type { EpisodePlan, Shot } from '../../schemas/episodePlan.js';
import type { actingPlanSchema } from '../../schemas/actingPlan.js';

/**
 * ActingPlanner — generates rough acting beats per character per scene.
 * Not final animation. Outputs acting_plan.json for manual or Harmony
 * application (ACTOR §8).
 */
export class ActingPlanner {
  generateActingPlans(script: any, characterSpecs: any[], episodePlan: EpisodePlan): any[] {
    const plans: any[] = [];
    for (const scene of episodePlan.scenes) {
      for (const c of scene.characters || []) {
        plans.push(this.buildActingPlan(c, scene, script));
      }
    }
    return plans;
  }

  analyzeDialogue(dialogue: string): { pace: 'slow'|'normal'|'fast'; volume: 'whisper'|'normal'|'loud'|'shout'; emotionHint: string } {
    const lower = dialogue.toLowerCase();
    const pace = /\.{3}|慢/.test(lower) ? 'slow' : (/!{2,}|\?$/.test(lower) ? 'fast' : 'normal');
    const volume = lower.includes('!') && lower.includes('!!') ? 'shout' : lower.includes('!') ? 'loud' : 'normal';
    const emotionHint = lower.includes('нерв') || lower.includes('nerv') || lower.includes('panic') ? 'panic'
      : lower.includes('зол') || lower.includes('angry') ? 'angry'
      : 'neutral';
    return { pace, volume, emotionHint };
  }

  generateEmotionalBeats(scene: any, character: string): any[] {
    const total = scene?.durationFrames ?? 72;
    const mood = (scene?.mood || 'neutral').toLowerCase();
    const chunk = Math.max(1, Math.floor(total / 4));
    
    let baseEmotion = 'neutral';
    let peakEmotion = 'curious';
    let climaxEmotion = 'alarm';
    let endEmotion = mood === 'climax' ? 'shock' : 'resolve';

    if (mood.includes('action') || mood.includes('chase')) {
      baseEmotion = 'alert'; peakEmotion = 'focused'; climaxEmotion = 'intense'; endEmotion = 'exhausted';
    } else if (mood.includes('panic') || mood.includes('fear')) {
      baseEmotion = 'uneasy'; peakEmotion = 'nervous'; climaxEmotion = 'terrified'; endEmotion = 'trembling';
    } else if (mood.includes('comedy') || mood.includes('humor')) {
      baseEmotion = 'cheerful'; peakEmotion = 'amused'; climaxEmotion = 'surprised'; endEmotion = 'laughing';
    }

    return [
      { frames: [0, chunk], emotion: baseEmotion, pose: `${baseEmotion}_stance`, microActions: this.generateMicroActions({ ...scene, mood: baseEmotion }), dialogue: '' },
      { frames: [chunk, chunk * 2], emotion: peakEmotion, pose: `lean_${peakEmotion}`, microActions: this.generateMicroActions({ ...scene, mood: peakEmotion }) },
      { frames: [chunk * 2, chunk * 3], emotion: climaxEmotion, pose: `express_${climaxEmotion}`, microActions: this.generateMicroActions({ ...scene, mood: climaxEmotion }), dialogue: '' },
      { frames: [chunk * 3, total], emotion: endEmotion, pose: scene.mood === 'climax' ? 'recoil' : 'confident', microActions: this.generateMicroActions({ ...scene, mood: endEmotion }) }
    ];
  }

  generatePoseBeats(scene: any): any[] {
    return this.generateEmotionalBeats(scene, '').map(b => ({
      frames: b.frames,
      pose: b.pose,
      intensity: b.emotion === 'neutral' ? 'subtle' : 'moderate'
    }));
  }

  generateMicroActions(scene: any): string[] {
    const mood = (scene?.mood || 'neutral').toLowerCase();
    if (mood.includes('panic') || mood.includes('fear') || mood.includes('uneasy') || mood.includes('terrified')) {
      return ['rapid eye shift', 'lip quiver', 'quick breath', 'shoulder tense'];
    }
    if (mood.includes('action') || mood.includes('focused') || mood.includes('intense')) {
      return ['clenched jaw', 'fist tightening', 'sharp head turn', 'brows furrowed'];
    }
    if (mood.includes('comedy') || mood.includes('cheerful') || mood.includes('amused')) {
      return ['wide smirk', 'double blink', 'head tilt', 'snicker gesture'];
    }
    if (mood.includes('sad') || mood.includes('grief')) {
      return ['gaze downward', 'slow blink', 'sigh', 'slumped posture'];
    }
    return ['subtle head tilt', 'eyebrow raise', 'single blink', 'soft exhale'];
  }

  generateGesturePlan(scene: any): any[] {
    const total = scene.durationFrames;
    return [
      { frames: [Math.floor(total*0.1), Math.floor(total*0.2)], gesture: 'open_palm', intensity: 'subtle' },
      { frames: [Math.floor(total*0.35), Math.floor(total*0.45)], gesture: 'point', intensity: 'moderate' },
      { frames: [Math.floor(total*0.6), Math.floor(total*0.75)], gesture: 'nervous_fidget', intensity: 'strong' },
      { frames: [Math.floor(total*0.85), total], gesture: 'shrug', intensity: 'moderate' }
    ];
  }

  generateBlinkPlan(scene: any): any[] {
    const blinks = [];
    for (let f = 12; f < scene.durationFrames; f += 30 + Math.floor(Math.random() * 20)) {
      blinks.push({ frame: f, type: 'single' as const });
    }
    return blinks;
  }

  generateHeadMotionPlan(scene: any): any[] {
    const total = scene.durationFrames;
    return [
      { frames: [0, Math.floor(total*0.15)], motion: 'turn_to_partner', direction: 'left' },
      { frames: [Math.floor(total*0.25), Math.floor(total*0.4)], motion: 'nod', direction: 'down' },
      { frames: [Math.floor(total*0.5), Math.floor(total*0.7)], motion: 'shake', direction: 'right' },
      { frames: [Math.floor(total*0.8), total], motion: 'recoils', direction: 'up' }
    ];
  }

  generateBodyLanguagePlan(scene: any): any[] {
    const total = scene.durationFrames;
    return [
      { frames: [0, Math.floor(total*0.2)], description: 'weight center, relaxed', weight: 'center' },
      { frames: [Math.floor(total*0.2), Math.floor(total*0.5)], description: 'weight shifts forward', weight: 'left' },
      { frames: [Math.floor(total*0.5), Math.floor(total*0.8)], description: 'recoils, weight back', weight: 'right' },
      { frames: [Math.floor(total*0.8), total], description: 'settles center', weight: 'center' }
    ];
  }

  buildActingPlan(character: string, scene: any, script: any): any {
    const emotionalArc = this.generateEmotionalBeats(scene, character);
    return {
      character,
      sceneId: scene.sceneId,
      emotionalArc,
      gesturePlan: this.generateGesturePlan(scene),
      blinkPlan: this.generateBlinkPlan(scene),
      headMotionPlan: this.generateHeadMotionPlan(scene),
      bodyLanguagePlan: this.generateBodyLanguagePlan(scene),
      readabilityScore: this.estimateReadability(emotionalArc),
      appliedToHarmony: false,
      origin: 'planned'
    };
  }

  estimateReadability(emotionalArc: any[]): number {
    const base = 70;
    const bonus = Math.min(25, emotionalArc.length * 3);
    return Math.min(100, base + bonus);
  }
}