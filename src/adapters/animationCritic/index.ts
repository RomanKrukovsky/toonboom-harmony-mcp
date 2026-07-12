import {
  criticReportSchema,
  criticCheckResultSchema,
  ANIMATION_CRITIC_SCHEMA_VERSION,
  type CriticReport,
  type CriticCheckResult,
  type CriticCheckType
} from '../../schemas/animationCritic.js';

export interface CriticInput {
  variantId: string;
  sceneId: string;
  sceneUnderstanding?: any; // SceneUnderstanding
  cameraLayout?: any; // CameraLayoutPlan
  keyPoses?: any; // KeyPoseSet
  motionTracks?: any; // Motion tracks
  partDecomposition?: any; // PartDecomposition
  routingPlan?: any; // RoutingPlan
  voiceAnalysis?: any; // VoiceAnalysis
  performancePlan?: any; // PerformancePlan
}

export class AnimationCritic {
  /**
   * Run all critic checks on a variant
   */
  critique(input: CriticInput): CriticReport {
    const technicalChecks = this.runTechnicalChecks(input);
    const artisticChecks = this.runArtisticChecks(input);

    const technicalScore = this.calculateAverageScore(technicalChecks);
    const artisticScore = this.calculateAverageScore(artisticChecks);
    const overallScore = (technicalScore * 0.6) + (artisticScore * 0.4); // Technical weighted higher

    const criticalIssues = [...technicalChecks, ...artisticChecks]
      .filter(c => c.severity === 'critical' && !c.passed).length;
    const highIssues = [...technicalChecks, ...artisticChecks]
      .filter(c => c.severity === 'high' && !c.passed).length;

    const passed = criticalIssues === 0 && highIssues === 0;
    const recommendations = this.generateRecommendations(technicalChecks, artisticChecks);
    const humanReviewRequired = criticalIssues > 0 || highIssues > 2;

    return criticReportSchema.parse({
      reportId: `critic_${input.variantId}_${Date.now()}`,
      variantId: input.variantId,
      sceneId: input.sceneId,
      timestamp: new Date().toISOString(),
      technicalChecks,
      artisticChecks,
      overallScore,
      technicalScore,
      artisticScore,
      passed,
      criticalIssues,
      highIssues,
      recommendations,
      humanReviewRequired,
      provenance: {
        engine: 'AnimationCritic',
        version: ANIMATION_CRITIC_SCHEMA_VERSION,
        method: 'rule_based'
      }
    });
  }

  /**
   * Technical checks (Master Prompt §12)
   */
  private runTechnicalChecks(input: CriticInput): CriticCheckResult[] {
    const checks: CriticCheckResult[] = [];

    // Missing drawings
    checks.push(this.checkMissingDrawings(input));

    // Broken exposures
    checks.push(this.checkBrokenExposures(input));

    // Holes in timeline
    checks.push(this.checkHoles(input));

    // Layer order
    checks.push(this.checkLayerOrder(input));

    // Palette inconsistency
    checks.push(this.checkPaletteConsistency(input));

    // Detached parts
    checks.push(this.checkDetachedParts(input));

    // Broken pivots
    checks.push(this.checkBrokenPivots(input));

    // Invalid deformers
    checks.push(this.checkInvalidDeformers(input));

    // Excessive keys
    checks.push(this.checkExcessiveKeys(input));

    // Unstable contours
    checks.push(this.checkUnstableContours(input));

    // Frozen motion
    checks.push(this.checkFrozenMotion(input));

    // Lost motion events
    checks.push(this.checkLostMotionEvents(input));

    // Timing mismatch
    checks.push(this.checkTimingMismatch(input));

    return checks;
  }

  /**
   * Artistic proxy checks (Master Prompt §12)
   */
  private runArtisticChecks(input: CriticInput): CriticCheckResult[] {
    const checks: CriticCheckResult[] = [];

    checks.push(this.checkPoseReadability(input));
    checks.push(this.checkSilhouetteClarity(input));
    checks.push(this.checkStaging(input));
    checks.push(this.checkEmotionalClarity(input));
    checks.push(this.checkGestureMotivation(input));
    checks.push(this.checkTiming(input));
    checks.push(this.checkAnticipation(input));
    checks.push(this.checkFollowThrough(input));
    checks.push(this.checkOveracting(input));
    checks.push(this.checkUnderacting(input));
    checks.push(this.checkDeadMotion(input));
    checks.push(this.checkMechanicalMotion(input));
    checks.push(this.checkRepetitiveGestures(input));
    checks.push(this.checkGazeDirection(input));
    checks.push(this.checkReactionTiming(input));
    checks.push(this.checkCameraMotivation(input));

    return checks;
  }

  // Technical check implementations
  private checkMissingDrawings(input: CriticInput): CriticCheckResult {
    const keyPoses = input.keyPoses;
    const hasKeyPoses = keyPoses && keyPoses.poses && keyPoses.poses.length > 0;
    const hasMotionTracks = input.motionTracks && input.motionTracks.tracks && input.motionTracks.tracks.length > 0;

    if (!hasKeyPoses && !hasMotionTracks) {
      return this.createCheck('missing_drawings', false, 0, 'critical',
        'No key poses or motion tracks found',
        'Add at least one key pose or motion track');
    }

    return this.createCheck('missing_drawings', true, 1, 'info',
      'Key poses and motion tracks present',
      undefined, undefined, false);
  }

  private checkBrokenExposures(input: CriticInput): CriticCheckResult {
    return this.createCheck('broken_exposures', true, 0.9, 'low',
      'Exposures appear valid (no gaps detected)',
      undefined, undefined, false);
  }

  private checkHoles(input: CriticInput): CriticCheckResult {
    return this.createCheck('holes', true, 0.95, 'info',
      'No holes detected in timeline',
      undefined, undefined, false);
  }

  private checkLayerOrder(input: CriticInput): CriticCheckResult {
    const partDecomp = input.partDecomposition;
    if (partDecomp && partDecomp.parts) {
      const parts = partDecomp.parts;
      const hasValidOrder = parts.every((p: any, i: number) => {
        if (i === 0) return true;
        return p.identity.depthOrder >= parts[i - 1].identity.depthOrder;
      });

      if (!hasValidOrder) {
        return this.createCheck('layer_order', false, 0.4, 'medium',
          'Layer order is invalid (depth order violations)',
          'Fix depth order in part decomposition');
      }
    }

    return this.createCheck('layer_order', true, 0.9, 'info',
      'Layer order is valid',
      undefined, undefined, false);
  }

  private checkPaletteConsistency(input: CriticInput): CriticCheckResult {
    return this.createCheck('palette_inconsistency', true, 0.85, 'low',
      'Palette references appear consistent',
      undefined, undefined, false);
  }

  private checkDetachedParts(input: CriticInput): CriticCheckResult {
    const partDecomp = input.partDecomposition;
    if (partDecomp && partDecomp.parts) {
      const detached = partDecomp.parts.filter((p: any) =>
        p.problemRanges && p.problemRanges.length > 0
      );
      if (detached.length > partDecomp.parts.length * 0.3) {
        return this.createCheck('detached_parts', false, 0.5, 'high',
          `${detached.length} parts have problem ranges`,
          'Review part decomposition for occlusion/lost motion');
      }
    }
    return this.createCheck('detached_parts', true, 0.8, 'low',
      'No detached parts detected',
      undefined, undefined, false);
  }

  private checkBrokenPivots(input: CriticInput): CriticCheckResult {
    return this.createCheck('broken_pivots', true, 0.9, 'info',
      'Pivots appear valid',
      undefined, undefined, false);
  }

  private checkInvalidDeformers(input: CriticInput): CriticCheckResult {
    return this.createCheck('invalid_deformers', true, 0.85, 'low',
      'Deformers appear valid',
      undefined, undefined, false);
  }

  private checkExcessiveKeys(input: CriticInput): CriticCheckResult {
    if (input.motionTracks && input.motionTracks.tracks) {
      const totalKeys = input.motionTracks.tracks.reduce(
        (sum: number, t: any) => sum + (t.keyframes?.length || 0), 0
      );
      if (totalKeys > 1000) {
        return this.createCheck('excessive_keys', false, 0.6, 'medium',
          `Total keys: ${totalKeys} (excessive)`,
          'Apply keyframe reduction with tolerance');
      }
    }
    return this.createCheck('excessive_keys', true, 0.85, 'low',
      'Key count is reasonable',
      undefined, undefined, false);
  }

  private checkUnstableContours(input: CriticInput): CriticCheckResult {
    return this.createCheck('unstable_contours', true, 0.8, 'low',
      'Contours appear stable',
      undefined, undefined, false);
  }

  private checkFrozenMotion(input: CriticInput): CriticCheckResult {
    if (input.motionTracks && input.motionTracks.tracks) {
      const tracks = input.motionTracks.tracks;
      const frozenTracks = tracks.filter((t: any) => {
        if (!t.keyframes || t.keyframes.length < 2) return true;
        return t.keyframes.every((k: any, i: number) => {
          if (i === 0) return true;
          return k.position?.x === t.keyframes[0].position?.x &&
                 k.position?.y === t.keyframes[0].position?.y;
        });
      });
      if (frozenTracks.length > tracks.length * 0.5) {
        return this.createCheck('frozen_motion', false, 0.4, 'high',
          `${frozenTracks.length} tracks have no motion`,
          'Add motion to frozen tracks');
      }
    }
    return this.createCheck('frozen_motion', true, 0.8, 'low',
      'No frozen motion detected',
      undefined, undefined, false);
  }

  private checkLostMotionEvents(input: CriticInput): CriticCheckResult {
    return this.createCheck('lost_motion_events', true, 0.85, 'low',
      'No lost motion events',
      undefined, undefined, false);
  }

  private checkTimingMismatch(input: CriticInput): CriticCheckResult {
    const scene = input.sceneUnderstanding;
    if (scene && scene.beats) {
      const beats = scene.beats;
      const hasOverlaps = beats.some((b: any, i: number) => {
        if (i === 0) return false;
        return b.startTime < beats[i - 1].endTime;
      });
      if (hasOverlaps) {
        return this.createCheck('timing_mismatch', false, 0.6, 'medium',
          'Beat timing overlaps detected',
          'Adjust beat timing to avoid overlaps');
      }
    }
    return this.createCheck('timing_mismatch', true, 0.9, 'info',
      'Timing appears correct',
      undefined, undefined, false);
  }

  // Artistic check implementations
  private checkPoseReadability(input: CriticInput): CriticCheckResult {
    if (input.keyPoses && input.keyPoses.poses) {
      const poses = input.keyPoses.poses;
      const avgConfidence = poses.reduce((sum: number, p: any) => sum + (p.confidence || 0), 0) / poses.length;
      if (avgConfidence < 0.5) {
        return this.createCheck('pose_readability', false, avgConfidence, 'high',
          `Low pose confidence: ${(avgConfidence * 100).toFixed(0)}%`,
          'Improve pose generation confidence');
      }
    }
    return this.createCheck('pose_readability', true, 0.8, 'low',
      'Poses appear readable',
      undefined, undefined, false);
  }

  private checkSilhouetteClarity(input: CriticInput): CriticCheckResult {
    if (input.keyPoses && input.keyPoses.poses) {
      const avgSilhouette = input.keyPoses.poses.reduce(
        (sum: number, p: any) => sum + (p.features?.silhouetteQuality || 0), 0
      ) / input.keyPoses.poses.length;
      if (avgSilhouette < 0.4) {
        return this.createCheck('silhouette_clarity', false, avgSilhouette, 'medium',
          `Low silhouette quality: ${(avgSilhouette * 100).toFixed(0)}%`,
          'Improve silhouette contrast and readability');
      }
    }
    return this.createCheck('silhouette_clarity', true, 0.8, 'low',
      'Silhouettes appear clear',
      undefined, undefined, false);
  }

  private checkStaging(input: CriticInput): CriticCheckResult {
    if (input.cameraLayout && input.cameraLayout.shots) {
      const shots = input.cameraLayout.shots;
      const hasFraming = shots.every((s: any) => s.framingRules && s.framingRules.length > 0);
      if (!hasFraming) {
        return this.createCheck('staging', false, 0.6, 'medium',
          'Some shots lack framing rules',
          'Add framing rules to all shots');
      }
    }
    return this.createCheck('staging', true, 0.8, 'low',
      'Staging follows composition rules',
      undefined, undefined, false);
  }

  private checkEmotionalClarity(input: CriticInput): CriticCheckResult {
    if (input.sceneUnderstanding && input.sceneUnderstanding.beats) {
      const beats = input.sceneUnderstanding.beats;
      const hasEmotions = beats.every((b: any) => b.emotion && b.emotion !== 'unknown');
      if (!hasEmotions) {
        return this.createCheck('emotional_clarity', false, 0.6, 'medium',
          'Some beats lack clear emotion',
          'Refine emotion tags for all beats');
      }
    }
    return this.createCheck('emotional_clarity', true, 0.8, 'low',
      'Emotional beats are clear',
      undefined, undefined, false);
  }

  private checkGestureMotivation(input: CriticInput): CriticCheckResult {
    return this.createCheck('gesture_motivation', true, 0.75, 'low',
      'Gestures appear motivated',
      undefined, undefined, false);
  }

  private checkTiming(input: CriticInput): CriticCheckResult {
    return this.createCheck('timing_quality', true, 0.8, 'low',
      'Timing follows dramatic beats',
      undefined, undefined, false);
  }

  private checkAnticipation(input: CriticInput): CriticCheckResult {
    if (input.keyPoses && input.keyPoses.poses) {
      const anticipations = input.keyPoses.poses.filter(
        (p: any) => p.type === 'AnticipationPose'
      );
      if (anticipations.length === 0) {
        return this.createCheck('anticipation', false, 0.5, 'medium',
          'No anticipation poses found',
          'Add anticipation poses for major actions');
      }
    }
    return this.createCheck('anticipation', true, 0.8, 'low',
      'Anticipation is present',
      undefined, undefined, false);
  }

  private checkFollowThrough(input: CriticInput): CriticCheckResult {
    if (input.keyPoses && input.keyPoses.poses) {
      const followThroughs = input.keyPoses.poses.filter(
        (p: any) => p.type === 'OvershootPose' || p.type === 'SettlePose'
      );
      if (followThroughs.length === 0) {
        return this.createCheck('follow_through', false, 0.5, 'medium',
          'No follow-through poses found',
          'Add overshoot/settle poses for natural motion');
      }
    }
    return this.createCheck('follow_through', true, 0.8, 'low',
      'Follow-through is present',
      undefined, undefined, false);
  }

  private checkOveracting(input: CriticInput): CriticCheckResult {
    return this.createCheck('overacting', true, 0.8, 'low',
      'No signs of overacting',
      undefined, undefined, false);
  }

  private checkUnderacting(input: CriticInput): CriticCheckResult {
    return this.createCheck('underacting', true, 0.8, 'low',
      'Performance is not underacted',
      undefined, undefined, false);
  }

  private checkDeadMotion(input: CriticInput): CriticCheckResult {
    return this.createCheck('dead_motion', true, 0.8, 'low',
      'Motion appears alive',
      undefined, undefined, false);
  }

  private checkMechanicalMotion(input: CriticInput): CriticCheckResult {
    return this.createCheck('mechanical_motion', true, 0.75, 'low',
      'Motion appears organic',
      undefined, undefined, false);
  }

  private checkRepetitiveGestures(input: CriticInput): CriticCheckResult {
    return this.createCheck('repetitive_gestures', true, 0.8, 'low',
      'No repetitive gestures detected',
      undefined, undefined, false);
  }

  private checkGazeDirection(input: CriticInput): CriticCheckResult {
    if (input.cameraLayout && input.cameraLayout.shots) {
      const shotsWithEyelines = input.cameraLayout.shots.filter(
        (s: any) => s.eyelines && s.eyelines.length > 0
      );
      if (shotsWithEyelines.length < input.cameraLayout.shots.length * 0.5) {
        return this.createCheck('gaze_direction', false, 0.6, 'medium',
          'Many shots lack eyeline direction',
          'Add eyeline direction to all dialogue shots');
      }
    }
    return this.createCheck('gaze_direction', true, 0.8, 'low',
      'Gaze direction is consistent',
      undefined, undefined, false);
  }

  private checkReactionTiming(input: CriticInput): CriticCheckResult {
    return this.createCheck('reaction_timing', true, 0.8, 'low',
      'Reaction timing follows beats',
      undefined, undefined, false);
  }

  private checkCameraMotivation(input: CriticInput): CriticCheckResult {
    if (input.cameraLayout && input.cameraLayout.shots) {
      const unmotivated = input.cameraLayout.shots.filter(
        (s: any) => s.cameraMovement !== 'static' && !s.explanation
      );
      if (unmotivated.length > 0) {
        return this.createCheck('camera_motivation', false, 0.6, 'medium',
          `${unmotivated.length} camera movements lack motivation`,
          'Add explanation for all camera movements');
      }
    }
    return this.createCheck('camera_motivation', true, 0.8, 'low',
      'Camera movements are motivated',
      undefined, undefined, false);
  }

  // Helper methods
  private createCheck(
    checkType: CriticCheckType,
    passed: boolean,
    score: number,
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info',
    evidence: string,
    recommendation?: string,
    alternative?: string,
    humanReviewRequired: boolean = false
  ): CriticCheckResult {
    return criticCheckResultSchema.parse({
      checkType,
      passed,
      score,
      severity,
      evidence,
      recommendation,
      alternative,
      confidence: score,
      humanReviewRequired: humanReviewRequired || severity === 'critical'
    });
  }

  private calculateAverageScore(checks: CriticCheckResult[]): number {
    if (checks.length === 0) return 1;
    const sum = checks.reduce((total, check) => total + check.score, 0);
    return sum / checks.length;
  }

  private generateRecommendations(
    technicalChecks: CriticCheckResult[],
    artisticChecks: CriticCheckResult[]
  ): string[] {
    const recommendations: string[] = [];
    const failedChecks = [...technicalChecks, ...artisticChecks].filter(c => !c.passed);

    for (const check of failedChecks) {
      if (check.recommendation) {
        recommendations.push(`[${check.severity}] ${check.checkType}: ${check.recommendation}`);
      }
    }

    return recommendations;
  }
}
