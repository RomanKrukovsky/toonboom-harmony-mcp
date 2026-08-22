export class KeyPoseRankingEngine {
    rankPoses(keyPoseSet) {
        const poses = keyPoseSet.poses || [];
        const results = poses.map(pose => {
            const silhouette = pose.features?.silhouetteQuality ?? 0.7;
            const confidence = pose.confidence ?? 0.8;
            let lineOfActionScore = 0.75;
            const poseType = pose.type;
            if (poseType === 'AnticipationPose' || poseType === 'OvershootPose') {
                lineOfActionScore = 0.9;
            }
            else if (poseType === 'ContactPose' || poseType === 'ExtremePose') {
                lineOfActionScore = 0.85;
            }
            const totalScore = parseFloat((silhouette * 0.4 + lineOfActionScore * 0.4 + confidence * 0.2).toFixed(3));
            const readabilityStatus = totalScore >= 0.8 ? 'high' : totalScore >= 0.6 ? 'medium' : 'low';
            const recommendations = [];
            if (silhouette < 0.6) {
                recommendations.push('Increase limb silhouette separation to prevent body overlap');
            }
            if (lineOfActionScore < 0.8) {
                recommendations.push('Push curvature on line of action for dynamic gesture');
            }
            return {
                poseId: pose.poseId,
                rank: 0,
                score: totalScore,
                silhouetteQualityScore: silhouette,
                lineOfActionScore,
                readabilityStatus,
                recommendations
            };
        });
        // Sort descending by score and assign ranks
        results.sort((a, b) => b.score - a.score);
        results.forEach((r, idx) => {
            r.rank = idx + 1;
        });
        return results;
    }
}
