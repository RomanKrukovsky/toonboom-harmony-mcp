export class RetakeEngine {
    evaluate(shotId, performance, metrics, thresholds) {
        const findings = [];
        let counter = 1;
        const addFinding = (check, severity, measured, threshold, message, autoFixable) => {
            findings.push({
                findingId: `f_${counter.toString().padStart(3, '0')}`,
                check,
                severity,
                measured,
                threshold,
                message,
                autoFixable
            });
            counter += 1;
        };
        // 1. Silhouette quality (higher is better).
        if (metrics.silhouetteQuality !== undefined) {
            if (metrics.silhouetteQuality < thresholds.silhouetteQualityMin) {
                addFinding('silhouette_quality', metrics.silhouetteQuality < thresholds.silhouetteQualityMin * 0.7 ? 'high' : 'medium', metrics.silhouetteQuality, thresholds.silhouetteQualityMin, `Silhouette quality ${metrics.silhouetteQuality.toFixed(3)} below threshold ${thresholds.silhouetteQualityMin}`, metrics.silhouetteQuality >= thresholds.silhouetteQualityMin * 0.7);
            }
        }
        // 2. Lipsync drift (lower is better).
        if (metrics.lipsyncDriftMs !== undefined) {
            if (metrics.lipsyncDriftMs > thresholds.lipsyncDriftMaxMs) {
                addFinding('lipsync_drift', metrics.lipsyncDriftMs > thresholds.lipsyncDriftMaxMs * 2 ? 'high' : 'medium', metrics.lipsyncDriftMs, thresholds.lipsyncDriftMaxMs, `Lipsync drift ${metrics.lipsyncDriftMs}ms above threshold ${thresholds.lipsyncDriftMaxMs}ms`, metrics.lipsyncDriftMs <= thresholds.lipsyncDriftMaxMs * 1.5);
            }
        }
        // 3. Continuity delta (lower is better).
        if (metrics.continuityDeltaFrames !== undefined) {
            if (metrics.continuityDeltaFrames > thresholds.continuityMaxDeltaFrames) {
                addFinding('continuity_delta', 'medium', metrics.continuityDeltaFrames, thresholds.continuityMaxDeltaFrames, `Continuity delta ${metrics.continuityDeltaFrames}f above threshold ${thresholds.continuityMaxDeltaFrames}f`, true);
            }
        }
        // 4. Line thickness delta (lower is better).
        if (metrics.lineThicknessDeltaPt !== undefined) {
            if (metrics.lineThicknessDeltaPt > thresholds.lineThicknessTolerancePt) {
                addFinding('line_thickness_delta', 'low', metrics.lineThicknessDeltaPt, thresholds.lineThicknessTolerancePt, `Line thickness delta ${metrics.lineThicknessDeltaPt}pt above tolerance ${thresholds.lineThicknessTolerancePt}pt`, true);
            }
        }
        // 5. Palette delta (lower is better).
        if (metrics.paletteDelta !== undefined) {
            if (metrics.paletteDelta > thresholds.paletteDeltaMax) {
                addFinding('palette_delta', metrics.paletteDelta > thresholds.paletteDeltaMax * 2 ? 'high' : 'medium', metrics.paletteDelta, thresholds.paletteDeltaMax, `Palette delta ${metrics.paletteDelta.toFixed(4)} above threshold ${thresholds.paletteDeltaMax}`, metrics.paletteDelta <= thresholds.paletteDeltaMax * 1.5);
            }
        }
        // 6. Pose library match (higher is better).
        if (metrics.poseLibraryMatch !== undefined) {
            if (metrics.poseLibraryMatch < thresholds.poseLibraryMatchMin) {
                addFinding('pose_library_match', 'high', metrics.poseLibraryMatch, thresholds.poseLibraryMatchMin, `Pose library match ${metrics.poseLibraryMatch.toFixed(3)} below threshold ${thresholds.poseLibraryMatchMin}`, false);
            }
        }
        // Determine overall status.
        const maxSeverityRank = (s) => ({ low: 0, medium: 1, high: 2, critical: 3 })[s];
        const autoFixableMaxRank = maxSeverityRank(thresholds.autoFixableSeverityMax);
        const blocking = findings.filter(f => maxSeverityRank(f.severity) > autoFixableMaxRank || !f.autoFixable);
        const requiresHumanApproval = blocking.length > 0 ||
            thresholds.requireHumanApprovalFor.some(kind => findings.some(f => f.check.includes(kind)));
        const humanApprovalReasons = [];
        if (blocking.length > 0) {
            humanApprovalReasons.push(`${blocking.length} finding(s) exceed autoFixableSeverityMax or are not autoFixable`);
        }
        for (const kind of thresholds.requireHumanApprovalFor) {
            if (findings.some(f => f.check.includes(kind))) {
                humanApprovalReasons.push(`check "${kind}" requires human approval per qa_thresholds`);
            }
        }
        const overallStatus = blocking.length > 0 ? 'blocked' :
            findings.length > 0 ? 'needs_retake' :
                'approved';
        return {
            schemaVersion: '1.0',
            shotId,
            performanceId: performance.performanceId,
            overallStatus,
            findings,
            requiresHumanApproval,
            humanApprovalReasons,
            checkedAt: new Date().toISOString()
        };
    }
}
