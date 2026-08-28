export type CameraShotType = 'close_up' | 'medium_shot' | 'wide_shot' | 'extreme_wide';

export type CameraMoveStyle = 'static' | 'dramatic_push_in' | 'whip_pan' | 'tracking_follow' | 'handheld_drift';

export interface CameraMoveRequest {
  shotType: CameraShotType;
  moveStyle: CameraMoveStyle;
  startFrame: number;
  endFrame: number;
  targetCharacterPos?: [number, number];
  panDirection?: 'left' | 'right';
  zoomFactor?: number;
}

export interface ParallaxLayerConfig {
  layerName: string;
  depthZ: number; // Positive = closer to camera (moves faster), Negative = distant (moves slower)
  parallaxMultiplier: number;
}

export interface CameraKeyframe {
  frame: number;
  posX: number;
  posY: number;
  zoom: number;
  panAngleDeg: number;
  rollAngleDeg: number;
}

export interface ChoreographedCameraResult {
  moveStyle: CameraMoveStyle;
  totalDurationFrames: number;
  cameraTrack: CameraKeyframe[];
  parallaxLayers: ParallaxLayerConfig[];
  mohoCameraChannelJson: Record<string, unknown>;
}

/**
 * MohoCameraChoreographer — Generates cinematic 2.5D multiplane camera motions
 * with smooth easing, whip pan blur compensation, and realistic parallax depth.
 */
export class MohoCameraChoreographer {
  public static choreographCamera(request: CameraMoveRequest): ChoreographedCameraResult {
    const startF = request.startFrame;
    const endF = request.endFrame;
    const totalFrames = Math.max(endF - startF, 24);
    const targetX = request.targetCharacterPos?.[0] ?? 0;
    const targetY = request.targetCharacterPos?.[1] ?? 0;

    const cameraTrack: CameraKeyframe[] = [];
    const baseZoom = request.shotType === 'close_up' ? 2.2 : request.shotType === 'medium_shot' ? 1.4 : 1.0;

    switch (request.moveStyle) {
      case 'dramatic_push_in': {
        const zoomDelta = (request.zoomFactor ?? 1.45) - 1.0;
        for (let f = startF; f <= endF; f += 6) {
          const t = (f - startF) / totalFrames;
          // Cubic ease-in-out curve
          const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          cameraTrack.push({
            frame: f,
            posX: Math.round(targetX * easeT * 100) / 100,
            posY: Math.round((targetY + 40 * easeT) * 100) / 100,
            zoom: Math.round((baseZoom + zoomDelta * easeT) * 1000) / 1000,
            panAngleDeg: 0,
            rollAngleDeg: 0
          });
        }
        break;
      }
      case 'whip_pan': {
        const panDir = request.panDirection === 'left' ? -1 : 1;
        const panDist = 450 * panDir;
        cameraTrack.push({ frame: startF, posX: 0, posY: targetY, zoom: baseZoom, panAngleDeg: 0, rollAngleDeg: 0 });
        // Fast 4-frame whip
        const whipStart = startF + Math.floor(totalFrames * 0.4);
        cameraTrack.push({ frame: whipStart, posX: 0, posY: targetY, zoom: baseZoom, panAngleDeg: 0, rollAngleDeg: 0 });
        cameraTrack.push({
          frame: whipStart + 4,
          posX: panDist,
          posY: targetY,
          zoom: baseZoom * 0.95,
          panAngleDeg: panDir * 8,
          rollAngleDeg: panDir * 2
        });
        cameraTrack.push({ frame: endF, posX: panDist, posY: targetY, zoom: baseZoom, panAngleDeg: 0, rollAngleDeg: 0 });
        break;
      }
      case 'tracking_follow': {
        for (let f = startF; f <= endF; f += 6) {
          const t = (f - startF) / totalFrames;
          const charProgX = targetX + t * 240; // Character moving horizontally
          cameraTrack.push({
            frame: f,
            posX: Math.round(charProgX * 100) / 100,
            posY: targetY,
            zoom: baseZoom,
            panAngleDeg: 0,
            rollAngleDeg: 0
          });
        }
        break;
      }
      case 'handheld_drift': {
        for (let f = startF; f <= endF; f += 8) {
          const t = (f - startF) / 24.0;
          const driftX = Math.sin(t * 2.1) * 6 + Math.cos(t * 4.3) * 3;
          const driftY = Math.cos(t * 1.8) * 4 + Math.sin(t * 3.7) * 2;
          const driftRoll = Math.sin(t * 1.2) * 0.4;
          cameraTrack.push({
            frame: f,
            posX: Math.round((targetX + driftX) * 100) / 100,
            posY: Math.round((targetY + driftY) * 100) / 100,
            zoom: baseZoom,
            panAngleDeg: 0,
            rollAngleDeg: Math.round(driftRoll * 100) / 100
          });
        }
        break;
      }
      default: {
        cameraTrack.push({ frame: startF, posX: targetX, posY: targetY, zoom: baseZoom, panAngleDeg: 0, rollAngleDeg: 0 });
        cameraTrack.push({ frame: endF, posX: targetX, posY: targetY, zoom: baseZoom, panAngleDeg: 0, rollAngleDeg: 0 });
      }
    }

    const parallaxLayers: ParallaxLayerConfig[] = [
      { layerName: 'FG_ForegroundDecor', depthZ: 60, parallaxMultiplier: 1.45 },
      { layerName: 'MG_Characters', depthZ: 0, parallaxMultiplier: 1.0 },
      { layerName: 'BG_MidgroundBuildings', depthZ: -80, parallaxMultiplier: 0.55 },
      { layerName: 'BG_DistantMountains', depthZ: -160, parallaxMultiplier: 0.20 },
      { layerName: 'BG_Sky', depthZ: -300, parallaxMultiplier: 0.02 }
    ];

    const mohoCameraChannelJson = {
      camera_track: {
        type: 'CameraTrack',
        keyframes: cameraTrack.map(k => ({
          frame: k.frame,
          pos: [k.posX, k.posY],
          zoom: k.zoom,
          roll: (k.rollAngleDeg * Math.PI) / 180
        }))
      }
    };

    return {
      moveStyle: request.moveStyle,
      totalDurationFrames: totalFrames,
      cameraTrack,
      parallaxLayers,
      mohoCameraChannelJson
    };
  }
}
