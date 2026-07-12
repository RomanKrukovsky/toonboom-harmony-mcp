import {
  cameraLayoutPlanSchema,
  shotPlanSchema,
  cameraKeyframeSchema,
  cameraTrackSchema,
  blockingPlanSchema,
  blockingPositionSchema,
  CAMERA_LAYOUT_SCHEMA_VERSION,
  type CameraLayoutPlan,
  type ShotPlan,
  type CameraTrack,
  type BlockingPlan
} from '../../schemas/cameraLayout.js';
import type { SceneUnderstanding } from '../../schemas/sceneIntelligence.js';

export interface CameraLayoutInput {
  sceneUnderstanding: SceneUnderstanding;
  sceneWidth?: number;
  sceneHeight?: number;
  fps?: number;
  style?: 'restrained' | 'dynamic' | 'dramatic' | 'comedic';
}

const SHOT_SIZE_SCALES: Record<string, number> = {
  extreme_close_up: 3.0,
  close_up: 2.0,
  medium_close_up: 1.5,
  medium_shot: 1.0,
  medium_full_shot: 0.8,
  full_shot: 0.6,
  long_shot: 0.4,
  extreme_long_shot: 0.25
};

const CHARACTER_POSITIONS: Record<string, { x: number; y: number }> = {
  left: { x: -200, y: 0 },
  center: { x: 0, y: 0 },
  right: { x: 200, y: 0 }
};

function determineShotSize(beat: any, characterCount: number): string {
  if (beat.importance > 0.85) return 'close_up';
  if (beat.importance > 0.7) return 'medium_close_up';
  if (characterCount > 2) return 'medium_shot';
  if (beat.beatKind === 'pause' || beat.beatKind === 'reaction') return 'medium_shot';
  return 'medium_shot';
}

function determineCameraMovement(beat: any, prevBeat: any | null, style: string): string {
  if (style === 'dynamic') {
    if (beat.importance > 0.8) return 'dolly_in';
    if (prevBeat && beat.importance > prevBeat.importance) return 'pan_right';
    return 'static';
  }

  if (style === 'dramatic') {
    if (beat.importance > 0.85) return 'dolly_in';
    if (beat.beatKind === 'revelation') return 'dolly_in';
    return 'static';
  }

  if (style === 'comedic') {
    if (beat.emotion === 'surprise' || beat.emotion === 'joy') return 'pan_right';
    return 'static';
  }

  if (beat.importance > 0.8) return 'dolly_in';
  if (prevBeat && beat.primaryCharacter !== prevBeat.primaryCharacter) return 'pan_right';
  return 'static';
}

function calculateCameraPosition(shotSize: string, focusX: number, focusY: number): { x: number; y: number; z: number } {
  const scale = SHOT_SIZE_SCALES[shotSize] || 1.0;
  return {
    x: focusX,
    y: focusY,
    z: 1000 / scale
  };
}

function generateFramingRules(shotSize: string, characterCount: number): string[] {
  const rules: string[] = ['rule_of_thirds', 'headroom'];

  if (characterCount === 1) {
    rules.push('leading_space');
  } else {
    rules.push('look_room');
  }

  if (shotSize === 'close_up' || shotSize === 'extreme_close_up') {
    rules.push('center_framing');
  }

  return rules;
}

function generateShotPlans(input: CameraLayoutInput): ShotPlan[] {
  const { sceneUnderstanding, style = 'restrained' } = input;
  const shots: ShotPlan[] = [];
  const beats = sceneUnderstanding.beats || [];
  const characters = sceneUnderstanding.characters || [];

  let prevBeat: any = null;
  let shotIndex = 0;

  for (const beat of beats) {
    const characterCount = characters.filter(c =>
      beat.primaryCharacter === c.characterId ||
      (beat.reactionTarget && beat.reactionTarget === c.characterId)
    ).length || 1;

    const shotSize = determineShotSize(beat, characterCount);
    const cameraMovement = determineCameraMovement(beat, prevBeat, style);

    const focusCharacter = characters.find(c => c.characterId === beat.primaryCharacter);
    const focusX = focusCharacter ? (focusCharacter.stance === 'standing' ? 0 : -100) : 0;
    const focusY = focusCharacter ? -100 : 0;

    const cameraPosition = calculateCameraPosition(shotSize, focusX, focusY);
    const cameraScale = SHOT_SIZE_SCALES[shotSize] || 1.0;

    const framingRules = generateFramingRules(shotSize, characterCount);

    const eyelines = [];
    if (beat.reactionTarget) {
      eyelines.push({
        fromCharacterId: beat.primaryCharacter,
        toCharacterId: beat.reactionTarget,
        direction: 0
      });
    }

    const shot = shotPlanSchema.parse({
      shotId: `shot_${shotIndex++}`,
      sceneId: sceneUnderstanding.sceneId,
      beatIds: [beat.beatId],
      characterIds: [beat.primaryCharacter, ...(beat.reactionTarget ? [beat.reactionTarget] : [])],
      startTime: beat.startTime,
      endTime: beat.endTime,
      duration: beat.endTime - beat.startTime,
      shotSize: shotSize as any,
      cameraPosition,
      cameraScale,
      cameraMovement: cameraMovement as any,
      framingRules: framingRules as any[],
      focusOfAttention: { x: focusX, y: focusY },
      safeMargins: { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 },
      eyelines,
      continuityNotes: [],
      transitionIn: 'cut',
      transitionOut: 'cut',
      confidence: beat.confidence || 0.7,
      explanation: `Shot for beat ${beat.beatId}: ${beat.intent} (${beat.emotion})`
    });

    shots.push(shot);
    prevBeat = beat;
  }

  return shots;
}

function generateCameraTrack(shots: ShotPlan[], sceneId: string, fps: number): CameraTrack {
  const keyframes = [];
  let frame = 1;

  for (const shot of shots) {
    const startFrame = frame;
    const durationFrames = Math.round(shot.duration * fps);
    const endFrame = startFrame + durationFrames;

    keyframes.push(cameraKeyframeSchema.parse({
      frame: startFrame,
      position: shot.cameraPosition,
      scale: shot.cameraScale,
      interpolation: 'ease_in_out'
    }));

    if (shot.cameraMovement !== 'static' && durationFrames > 10) {
      const midFrame = startFrame + Math.floor(durationFrames / 2);
      const movementOffset = shot.cameraMovement === 'dolly_in' ? 0.9 :
                             shot.cameraMovement === 'dolly_out' ? 1.1 : 1.0;

      keyframes.push(cameraKeyframeSchema.parse({
        frame: midFrame,
        position: {
          x: shot.cameraPosition.x,
          y: shot.cameraPosition.y,
          z: shot.cameraPosition.z * movementOffset
        },
        scale: shot.cameraScale,
        interpolation: 'linear'
      }));
    }

    frame = endFrame;
  }

  const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);

  return cameraTrackSchema.parse({
    trackId: `camera_track_${sceneId}`,
    sceneId,
    keyframes,
    totalDuration,
    movementType: shots.length > 0 ? shots[0].cameraMovement : 'static'
  });
}

function generateBlockingPlans(shots: ShotPlan[], characters: any[]): BlockingPlan[] {
  return shots.map((shot, idx) => {
    const positions = [];

    for (let i = 0; i < shot.characterIds.length; i++) {
      const charId = shot.characterIds[i];
      const preset = i === 0 ? 'center' : i === 1 ? 'left' : 'right';
      const pos = CHARACTER_POSITIONS[preset] || CHARACTER_POSITIONS.center;

      positions.push(blockingPositionSchema.parse({
        characterId: charId,
        position: { x: pos.x, y: pos.y },
        scale: 1,
        facing: 0,
        preset: preset as any
      }));
    }

    return blockingPlanSchema.parse({
      planId: `blocking_${shot.shotId}`,
      sceneId: shot.sceneId,
      shotId: shot.shotId,
      positions,
      continuityConstraints: []
    });
  });
}

export class CameraLayoutDirector {
  generate(input: CameraLayoutInput): CameraLayoutPlan {
    const { sceneUnderstanding, fps = 24 } = input;

    const shots = generateShotPlans(input);
    const cameraTrack = generateCameraTrack(shots, sceneUnderstanding.sceneId, fps);
    const blockingPlans = generateBlockingPlans(shots, sceneUnderstanding.characters || []);

    const movementCounts: Record<string, number> = {};
    const sizeCounts: Record<string, number> = {};

    for (const shot of shots) {
      movementCounts[shot.cameraMovement] = (movementCounts[shot.cameraMovement] || 0) + 1;
      sizeCounts[shot.shotSize] = (sizeCounts[shot.shotSize] || 0) + 1;
    }

    const avgDuration = shots.length > 0
      ? shots.reduce((sum, s) => sum + s.duration, 0) / shots.length
      : 0;

    return cameraLayoutPlanSchema.parse({
      schemaVersion: CAMERA_LAYOUT_SCHEMA_VERSION,
      sceneId: sceneUnderstanding.sceneId,
      shots,
      cameraTrack,
      blockingPlans,
      summary: {
        totalShots: shots.length,
        averageShotDuration: avgDuration,
        cameraMovements: movementCounts as any,
        shotSizes: sizeCounts as any,
        totalKeyframes: cameraTrack.keyframes.length
      },
      provenance: {
        engine: 'CameraLayoutDirector v1',
        createdAt: new Date().toISOString(),
        method: 'rule_based'
      }
    });
  }
}
