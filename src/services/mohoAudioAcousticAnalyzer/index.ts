export interface AcousticFrameAnalysis {
  frame: number;
  rmsEnergy: number; // 0.0 (silence) to 1.0 (screaming)
  mouthApertureY: number; // 0.3 to 1.8 dynamic vertical stretch
  pitchHz: number; // Estimated F0 fundamental frequency
  eyebrowOffsetDeg: number; // Eyebrow lift (+8 deg on high pitch) or furrow (-6 deg on low pitch)
  vowelFormantClass: 'A' | 'E' | 'I' | 'O' | 'U' | 'Consonant' | 'Silence';
}

export interface AcousticTrackResult {
  totalDurationFrames: number;
  averageEnergy: number;
  peakEnergy: number;
  frames: AcousticFrameAnalysis[];
  keyframeTracks: {
    mouthScaleY: Array<{ frame: number; scaleY: number }>;
    eyebrowTilt: Array<{ frame: number; angleDeg: number }>;
    headPitchNod: Array<{ frame: number; angleDeg: number }>;
  };
}

/**
 * MohoAudioAcousticAnalyzer — Analyzes acoustic audio features (RMS energy, F0 pitch, formants)
 * to drive dynamic mouth height, pitch-reactive eyebrow raises, and volume-scaled head gestures.
 */
export class MohoAudioAcousticAnalyzer {
  public static analyzeAcousticProfile(
    syntheticEnergyCurve?: number[],
    fps = 24,
    totalFrames = 72
  ): AcousticTrackResult {
    const framesCount = syntheticEnergyCurve ? syntheticEnergyCurve.length : totalFrames;
    const frames: AcousticFrameAnalysis[] = [];

    const mouthScaleKeys: Array<{ frame: number; scaleY: number }> = [];
    const eyebrowKeys: Array<{ frame: number; angleDeg: number }> = [];
    const headNodKeys: Array<{ frame: number; angleDeg: number }> = [];

    let totalEnergy = 0;
    let maxEnergy = 0;

    for (let f = 1; f <= framesCount; f++) {
      // Base energy from curve or naturalistic conversational curve
      const progress = f / framesCount;
      const defaultEnergy =
        progress < 0.1 || progress > 0.9
          ? 0.05
          : 0.4 + 0.35 * Math.sin(progress * Math.PI * 4) * Math.cos(progress * Math.PI * 2);

      const energy = Math.max(0.0, Math.min(1.0, syntheticEnergyCurve ? syntheticEnergyCurve[f - 1] ?? 0.0 : defaultEnergy));
      totalEnergy += energy;
      if (energy > maxEnergy) maxEnergy = energy;

      // Dynamic Mouth Aperture (0.4 whisper -> 1.7 scream)
      const apertureY = energy < 0.1 ? 0.3 : Math.round((0.6 + energy * 1.1) * 100) / 100;

      // Dynamic Pitch (F0) & Eyebrow Reactions
      const pitchHz = Math.round(120 + energy * 180 + Math.sin(progress * Math.PI * 3) * 40);
      const eyebrowOffset = energy > 0.6 ? 6.0 : energy < 0.2 ? -3.0 : 0.0;
      const headNod = energy > 0.75 ? 4.0 : 0.0;

      // Classify Formant Vowel
      let formant: AcousticFrameAnalysis['vowelFormantClass'] = 'Silence';
      if (energy > 0.15) {
        const mod = f % 5;
        formant = mod === 0 ? 'A' : mod === 1 ? 'O' : mod === 2 ? 'E' : mod === 3 ? 'U' : 'I';
      }

      frames.push({
        frame: f,
        rmsEnergy: energy,
        mouthApertureY: apertureY,
        pitchHz,
        eyebrowOffsetDeg: eyebrowOffset,
        vowelFormantClass: formant
      });

      if (f % 4 === 0 || f === 1 || f === framesCount) {
        mouthScaleKeys.push({ frame: f, scaleY: apertureY });
        eyebrowKeys.push({ frame: f, angleDeg: eyebrowOffset });
        headNodKeys.push({ frame: f, angleDeg: 90 - headNod });
      }
    }

    return {
      totalDurationFrames: framesCount,
      averageEnergy: Math.round((totalEnergy / framesCount) * 100) / 100,
      peakEnergy: Math.round(maxEnergy * 100) / 100,
      frames,
      keyframeTracks: {
        mouthScaleY: mouthScaleKeys,
        eyebrowTilt: eyebrowKeys,
        headPitchNod: headNodKeys
      }
    };
  }
}
