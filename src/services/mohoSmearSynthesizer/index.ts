import { type MohoVectorShape } from '../mohoVectorSimplifier/index.js';
import { MohoNativeBridge } from '../mohoNativeBridge/index.js';

export type SmearType = 'arc' | 'stretch' | 'multi' | 'whiplash';

export interface SmearDetectionResult {
  frame: number;
  smearType: SmearType;
  velocityMagnitude: number;
  motionAngleDeg: number;
  recommendedDurationFrames: number;
}

export interface SmearSwitchPack {
  switchLayerName: string;
  states: {
    Normal: MohoVectorShape;
    Smear_Arc: MohoVectorShape;
    Smear_Stretch: MohoVectorShape;
    Smear_Multi: MohoVectorShape;
    Smear_Whiplash: MohoVectorShape;
  };
}

export class MohoSmearSynthesizer {
  /**
   * Detects frames that need smear breakdowns based on trajectory velocity and angular curvature.
   */
  public static detectSmears(
    keyframes: Array<{ frame: number; posX: number; posY: number }>,
    velocityThreshold = 30.0,
    angularThresholdDeg = 45.0
  ): SmearDetectionResult[] {
    const detections: SmearDetectionResult[] = [];
    if (keyframes.length < 2) return detections;

    for (let i = 1; i < keyframes.length; i++) {
      const prev = keyframes[i - 1];
      const curr = keyframes[i];
      const dt = Math.max(Math.abs(curr.frame - prev.frame), 1);
      const dx = curr.posX - prev.posX;
      const dy = curr.posY - prev.posY;
      const vel = Math.hypot(dx, dy) / dt;
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

      if (vel >= velocityThreshold) {
        let isArc = false;
        if (i + 1 < keyframes.length) {
          const next = keyframes[i + 1];
          const ndx = next.posX - curr.posX;
          const ndy = next.posY - curr.posY;
          const nextAngle = (Math.atan2(ndy, ndx) * 180) / Math.PI;
          const diff = Math.abs(nextAngle - angleDeg);
          if (diff >= angularThresholdDeg && diff <= 180.0) {
            isArc = true;
          }
        }

        const smearType: SmearType = isArc
          ? 'arc'
          : vel > velocityThreshold * 2.0
          ? 'multi'
          : 'stretch';

        detections.push({
          frame: curr.frame,
          smearType,
          velocityMagnitude: Math.round(vel * 100) / 100,
          motionAngleDeg: Math.round(angleDeg),
          recommendedDurationFrames: vel > velocityThreshold * 2.5 ? 2 : 1
        });
      }
    }

    return detections;
  }

  /**
   * Generates a Motion Arc (Crescent Blade) Smear Vector Shape.
   */
  public static generateArcSmear(options: {
    name: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    arcCurvature?: number;
    baseThickness?: number;
    trailTaper?: number;
    fillRgba?: number[];
    strokeWidth?: number;
  }): MohoVectorShape {
    const {
      name,
      startX,
      startY,
      endX,
      endY,
      arcCurvature = 0.35,
      baseThickness = 24.0,
      trailTaper = 0.3,
      fillRgba = [240, 215, 195, 255],
      strokeWidth = 2.0
    } = options;

    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.max(Math.hypot(dx, dy), 0.01);
    const nx = -dy / dist;
    const ny = dx / dist;

    const midX = (startX + endX) * 0.5 + nx * arcCurvature * dist;
    const midY = (startY + endY) * 0.5 + ny * arcCurvature * dist;

    const tStart = baseThickness * trailTaper;
    const tMid = baseThickness * 1.35;
    const tEnd = baseThickness;

    const points = [
      {
        x: Math.round((startX - nx * tStart * 0.5) * 100) / 100,
        y: Math.round((startY - ny * tStart * 0.5) * 100) / 100,
        handleIn: undefined,
        handleOut: { dx: dx * 0.25, dy: dy * 0.25 },
        curvature: 0.35
      },
      {
        x: Math.round((midX + nx * tMid * 0.5) * 100) / 100,
        y: Math.round((midY + ny * tMid * 0.5) * 100) / 100,
        handleIn: { dx: -dx * 0.2, dy: -dy * 0.2 },
        handleOut: { dx: dx * 0.2, dy: dy * 0.2 },
        curvature: 0.4
      },
      {
        x: Math.round((endX + nx * tEnd * 0.5) * 100) / 100,
        y: Math.round((endY + ny * tEnd * 0.5) * 100) / 100,
        handleIn: { dx: -dx * 0.25, dy: -dy * 0.25 },
        handleOut: undefined,
        curvature: 0.35
      },
      {
        x: Math.round((endX - nx * tEnd * 0.5) * 100) / 100,
        y: Math.round((endY - ny * tEnd * 0.5) * 100) / 100,
        handleIn: undefined,
        handleOut: { dx: -dx * 0.25, dy: -dy * 0.25 },
        curvature: 0.35
      },
      {
        x: Math.round((midX - nx * tMid * 0.3) * 100) / 100,
        y: Math.round((midY - ny * tMid * 0.3) * 100) / 100,
        handleIn: { dx: dx * 0.2, dy: dy * 0.2 },
        handleOut: { dx: -dx * 0.2, dy: -dy * 0.2 },
        curvature: 0.4
      },
      {
        x: Math.round((startX + nx * tStart * 0.5) * 100) / 100,
        y: Math.round((startY + ny * tStart * 0.5) * 100) / 100,
        handleIn: { dx: dx * 0.25, dy: dy * 0.25 },
        handleOut: undefined,
        curvature: 0.35
      }
    ];

    return {
      name,
      points,
      fillColor: {
        r: fillRgba[0] ?? 240,
        g: fillRgba[1] ?? 215,
        b: fillRgba[2] ?? 195,
        a: fillRgba[3] ?? 255
      },
      strokeColor: { r: 26, g: 26, b: 26, a: 255 },
      strokeWidth,
      isClosed: true
    };
  }

  /**
   * Generates a complete Smear Switch Pack (Normal + 4 smear breakdown variants).
   */
  public static buildSmearSwitchPack(
    limbName: string,
    baseNormalShape: MohoVectorShape,
    fillRgba: number[] = [240, 215, 195, 255]
  ): SmearSwitchPack {
    const arc = this.generateArcSmear({
      name: `${limbName}_Smear_Arc`,
      startX: -40,
      startY: -60,
      endX: 60,
      endY: 60,
      fillRgba
    });

    const stretch = MohoNativeBridge.generateCapsuleShape({
      name: `${limbName}_Smear_Stretch`,
      centerX: 0,
      centerY: 0,
      radiusX: 25,
      radiusY: 75,
      fillRgba: [fillRgba[0] ?? 240, fillRgba[1] ?? 215, fillRgba[2] ?? 195, fillRgba[3] ?? 255],
      strokeWidth: 2.0,
      jointCapPadding: false
    });

    const multi = {
      ...baseNormalShape,
      name: `${limbName}_Smear_Multi`
    };

    const whiplash = this.generateArcSmear({
      name: `${limbName}_Smear_Whiplash`,
      startX: 0,
      startY: -70,
      endX: 0,
      endY: 70,
      arcCurvature: 0.45,
      fillRgba
    });

    return {
      switchLayerName: `${limbName}_Smear_Switch`,
      states: {
        Normal: baseNormalShape,
        Smear_Arc: arc,
        Smear_Stretch: stretch,
        Smear_Multi: multi,
        Smear_Whiplash: whiplash
      }
    };
  }
}
