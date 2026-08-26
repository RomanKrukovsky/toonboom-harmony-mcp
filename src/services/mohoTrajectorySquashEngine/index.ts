export interface TrajectoryKeyframe {
  frame: number;
  posX: number;
  posY: number;
}

export interface DynamicSquashKeyframe {
  frame: number;
  squashAngleDeg: number;
  scaleX: number;
  scaleY: number;
}

export interface TrajectorySquashResult {
  objectName: string;
  totalKeyframes: number;
  keyframes: DynamicSquashKeyframe[];
}

/**
 * MohoTrajectorySquashEngine — Calculates dynamic trajectory-aligned squash and stretch
 * with volume preservation based on Ball.moho (12 bones).
 */
export class MohoTrajectorySquashEngine {
  public static calculateTrajectorySquash(
    objectName: string,
    trajectory: TrajectoryKeyframe[],
    squashIntensity = 0.5
  ): TrajectorySquashResult {
    const keyframes: DynamicSquashKeyframe[] = [];

    for (let i = 0; i < trajectory.length; i++) {
      const curr = trajectory[i];
      let vx = 0;
      let vy = 0;

      if (i > 0) {
        vx = curr.posX - trajectory[i - 1].posX;
        vy = curr.posY - trajectory[i - 1].posY;
      } else if (trajectory.length > 1) {
        vx = trajectory[1].posX - curr.posX;
        vy = trajectory[1].posY - curr.posY;
      }

      const speed = Math.sqrt(vx * vx + vy * vy);
      const angleRad = Math.atan2(vy, vx);
      const angleDeg = +((angleRad * 180) / Math.PI).toFixed(2);

      // Volume conservation: Stretch along velocity axis, squash across perpendicular
      const stretchFactor = 1.0 + Math.min(speed * 0.02 * squashIntensity, 0.6);
      const squashFactor = +(1.0 / stretchFactor).toFixed(3);

      keyframes.push({
        frame: curr.frame,
        squashAngleDeg: angleDeg,
        scaleX: +stretchFactor.toFixed(3),
        scaleY: squashFactor
      });
    }

    return {
      objectName,
      totalKeyframes: keyframes.length,
      keyframes
    };
  }
}
