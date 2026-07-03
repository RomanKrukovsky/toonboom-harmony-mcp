import type { EpisodePlan, Shot } from '../../schemas/episodePlan.js';

const FRAMINGS = ['wide','medium','close','OTS','POV'];
const CAMERA_MOVES = ['static','pan_left','pan_right','zoom_in','zoom_out','dolly','tilt_up','shake'];

export class ShotPlanner {
  generateShots(episodePlan: EpisodePlan): Shot[] {
    const shots: Shot[] = [];
    let shotSeq = 1;
    for (const scene of episodePlan.scenes) {
      const perScene = Math.max(2, scene.shotCount);
      const framesPerShot = Math.floor(scene.durationFrames / perScene);
      for (let s = 0; s < perScene; s++) {
        shots.push({
          shotId: `SH_${String(shotSeq++).padStart(4, '0')}`,
          sceneId: scene.sceneId,
          shotType: s === 0 ? 'establishing' : s === perScene - 1 ? 'reaction' : 'coverage',
          framing: FRAMINGS[s % FRAMINGS.length],
          durationFrames: framesPerShot,
          startFrame: (scene.startFrame ?? 0) + s * framesPerShot,
          endFrame: (scene.startFrame ?? 0) + (s + 1) * framesPerShot,
          cameraMove: CAMERA_MOVES[s % CAMERA_MOVES.length],
          charactersInFrame: scene.characters,
          dialogue: s % 2 === 0
            ? `[scene ${scene.sceneId} shot ${s + 1} dialogue]`
            : undefined,
          description: `Beat ${s + 1}/${perScene} — ${scene.mood}`
        });
      }
    }
    return shots;
  }
}