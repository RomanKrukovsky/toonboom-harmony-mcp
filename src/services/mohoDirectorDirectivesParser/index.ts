export type ComedicGagType =
  | 'awkward_silence'
  | 'double_take'
  | 'cartoon_take'
  | 'suspicious_squint'
  | 'nervous_twitch'
  | 'sweat_drop_reaction'
  | 'spit_take';

export interface ParsedDirective {
  rawText: string;
  gagType: ComedicGagType;
  durationFrames: number;
  pauseFramesBeforeSpeech: number;
  description: string;
}

export interface DirectiveAnimationKeyframe {
  targetBoneOrLayer: string;
  frame: number;
  property: 'angle' | 'pos' | 'scale' | 'switch';
  value?: string | number;
  posX?: number;
  posY?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface ParsedDialogueLineResult {
  speaker: string;
  spokenText: string;
  directives: ParsedDirective[];
  totalExtraFrames: number;
  generatedKeyframes: DirectiveAnimationKeyframe[];
}

/**
 * MohoDirectorDirectivesParser — Parses director stage notes and comedic acting tags
 * from script lines and synthesizes high-precision comedy/drama keyframe beats.
 */
export class MohoDirectorDirectivesParser {
  public static parseScriptLine(line: string, speaker = 'Character', baseStartFrame = 1): ParsedDialogueLineResult {
    const directiveRegex = /\(([^)]+)\)/g;
    const directives: ParsedDirective[] = [];
    let match: RegExpExecArray | null;

    let cleanText = line;
    while ((match = directiveRegex.exec(line)) !== null) {
      const fullTag = match[1];
      const subTags = fullTag.split(/[,;]/).map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
      for (const tagContent of subTags) {
        const parsed = this.interpretDirective(tagContent);
        if (parsed) {
          directives.push(parsed);
        }
      }
    }

    cleanText = line.replace(directiveRegex, '').replace(/\s+/g, ' ').trim();

    // Synthesize Keyframes for all directives
    let currFrame = baseStartFrame;
    const generatedKeyframes: DirectiveAnimationKeyframe[] = [];

    for (const dir of directives) {
      const keys = this.generateGagKeyframes(dir.gagType, currFrame, dir.durationFrames);
      generatedKeyframes.push(...keys);
      currFrame += dir.durationFrames;
    }

    const totalExtra = directives.reduce((sum, d) => sum + d.durationFrames, 0);

    return {
      speaker,
      spokenText: cleanText,
      directives,
      totalExtraFrames: totalExtra,
      generatedKeyframes
    };
  }

  private static interpretDirective(tag: string): ParsedDirective | null {
    if (tag.includes('пауз') || tag.includes('pause') || tag.includes('тишин') || tag.includes('молчани') || tag.includes('silence')) {
      const secMatch = tag.match(/(\d+)\s*(сек|sec|s)/);
      const seconds = secMatch ? parseInt(secMatch[1], 10) : 2;
      const frames = seconds * 24;
      return {
        rawText: tag,
        gagType: 'awkward_silence',
        durationFrames: frames,
        pauseFramesBeforeSpeech: frames,
        description: `${seconds}s awkward silence freeze with nervous eye dart`
      };
    }

    if (tag.includes('подскок') || tag.includes('take') || tag.includes('испуг') || tag.includes('вздрагива')) {
      return {
        rawText: tag,
        gagType: 'cartoon_take',
        durationFrames: 24,
        pauseFramesBeforeSpeech: 24,
        description: 'Cartoon take: anticipation crouch, vertical launch with smear, airborne hang'
      };
    }

    if (tag.includes('двойной тейк') || tag.includes('double take')) {
      return {
        rawText: tag,
        gagType: 'double_take',
        durationFrames: 28,
        pauseFramesBeforeSpeech: 28,
        description: 'Double take: look away, realize, explosive snap back'
      };
    }

    if (tag.includes('прищур') || tag.includes('подозрител') || tag.includes('squint')) {
      return {
        rawText: tag,
        gagType: 'suspicious_squint',
        durationFrames: 36,
        pauseFramesBeforeSpeech: 18,
        description: 'Unilateral suspicious slow squint'
      };
    }

    if (tag.includes('дерга') || tag.includes('twitch') || tag.includes('нервн')) {
      return {
        rawText: tag,
        gagType: 'nervous_twitch',
        durationFrames: 20,
        pauseFramesBeforeSpeech: 10,
        description: 'High-frequency 2-frame eyelid and pupil tremor'
      };
    }

    return null;
  }

  private static generateGagKeyframes(
    gagType: ComedicGagType,
    startFrame: number,
    duration: number
  ): DirectiveAnimationKeyframe[] {
    const keys: DirectiveAnimationKeyframe[] = [];

    switch (gagType) {
      case 'awkward_silence': {
        // Freeze movement, dart eyes to camera, then single twitch on frame 40
        keys.push({ targetBoneOrLayer: 'Eyes Switch', frame: startFrame, property: 'switch', value: 'Wide' });
        keys.push({ targetBoneOrLayer: 'Face_XY_Joystick', frame: startFrame + 12, property: 'pos', posX: 8, posY: 0 }); // Look at camera
        // Eyelid nervous twitch at frame start+36
        keys.push({ targetBoneOrLayer: 'Eyes Switch', frame: startFrame + 36, property: 'switch', value: 'Squint' });
        keys.push({ targetBoneOrLayer: 'Eyes Switch', frame: startFrame + 39, property: 'switch', value: 'Wide' });
        keys.push({ targetBoneOrLayer: 'Eyes Switch', frame: startFrame + 42, property: 'switch', value: 'Squint' });
        keys.push({ targetBoneOrLayer: 'Eyes Switch', frame: startFrame + 45, property: 'switch', value: 'Open' });
        break;
      }

      case 'cartoon_take': {
        // Frame 1-2: Anticipation deep crouch (Squash)
        keys.push({ targetBoneOrLayer: 'Pelvis', frame: startFrame + 2, property: 'pos', posY: 20 });
        keys.push({ targetBoneOrLayer: 'Chest', frame: startFrame + 2, property: 'scale', scaleX: 1.35, scaleY: 0.65 });
        // Frame 4: Launch up (Stretch + Smear)
        keys.push({ targetBoneOrLayer: 'Pelvis', frame: startFrame + 5, property: 'pos', posY: 110 });
        keys.push({ targetBoneOrLayer: 'Chest', frame: startFrame + 5, property: 'scale', scaleX: 0.60, scaleY: 1.50 });
        keys.push({ targetBoneOrLayer: 'Eyes Switch', frame: startFrame + 5, property: 'switch', value: 'Wide' });
        // Frame 10-14: Airborne apex hang
        keys.push({ targetBoneOrLayer: 'Pelvis', frame: startFrame + 12, property: 'pos', posY: 115 });
        keys.push({ targetBoneOrLayer: 'Chest', frame: startFrame + 12, property: 'scale', scaleX: 1.0, scaleY: 1.0 });
        // Frame 18: Landing cushion
        keys.push({ targetBoneOrLayer: 'Pelvis', frame: startFrame + 18, property: 'pos', posY: 45 });
        keys.push({ targetBoneOrLayer: 'Chest', frame: startFrame + 18, property: 'scale', scaleX: 1.20, scaleY: 0.85 });
        // Frame 24: Recovery
        keys.push({ targetBoneOrLayer: 'Pelvis', frame: startFrame + 24, property: 'pos', posY: 55 });
        keys.push({ targetBoneOrLayer: 'Chest', frame: startFrame + 24, property: 'scale', scaleX: 1.0, scaleY: 1.0 });
        break;
      }

      case 'double_take': {
        // Look away (Frame 0-6), snap back fast with smear (Frame 8-10), eyes pop wide (Frame 12-24)
        keys.push({ targetBoneOrLayer: 'Head', frame: startFrame + 4, property: 'angle', value: 115 });
        keys.push({ targetBoneOrLayer: 'Head', frame: startFrame + 8, property: 'angle', value: 65 }); // Explosive snap back
        keys.push({ targetBoneOrLayer: 'Eyes Switch', frame: startFrame + 8, property: 'switch', value: 'Wide' });
        keys.push({ targetBoneOrLayer: 'Head', frame: startFrame + 14, property: 'angle', value: 90 }); // Settle
        break;
      }

      case 'suspicious_squint': {
        // Slow unilateral squint over 24 frames
        keys.push({ targetBoneOrLayer: 'Eyes Switch', frame: startFrame + 18, property: 'switch', value: 'Squint' });
        keys.push({ targetBoneOrLayer: 'Face_XY_Joystick', frame: startFrame + 18, property: 'pos', posX: -6, posY: -2 });
        break;
      }

      case 'nervous_twitch': {
        // Rapid 2-frame jitter
        for (let i = 0; i < duration; i += 4) {
          keys.push({ targetBoneOrLayer: 'Eyes Switch', frame: startFrame + i, property: 'switch', value: 'Squint' });
          keys.push({ targetBoneOrLayer: 'Eyes Switch', frame: startFrame + i + 2, property: 'switch', value: 'Open' });
        }
        break;
      }
    }

    return keys;
  }
}
