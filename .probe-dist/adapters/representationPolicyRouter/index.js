export class RepresentationPolicyRouter {
    routePart(req) {
        const { partId, startFrame, endFrame, deformationScore, rotationVelocity } = req;
        let representation = 'peg_transform';
        let explanation = 'Low deformation and low velocity — rigid Peg transform is optimal';
        let confidence = 0.95;
        if (deformationScore > 0.8 || rotationVelocity > 45) {
            representation = 'frame_by_frame_vector';
            explanation = 'Extreme non-rigid deformation or high rotation velocity — native TVG vector drawings required';
            confidence = 0.9;
        }
        else if (deformationScore > 0.5) {
            if (partId.toLowerCase().includes('hair') || partId.toLowerCase().includes('cloth')) {
                representation = 'curve_deformer';
                explanation = 'Moderate non-rigid deformation on fluid part — Curve Deformer selected';
            }
            else {
                representation = 'bone_deformer';
                explanation = 'Moderate non-rigid deformation on articulated part — Bone Deformer selected';
            }
            confidence = 0.92;
        }
        return {
            partId,
            startFrame,
            endFrame,
            representation,
            explanation,
            confidence
        };
    }
    routeBatch(requests) {
        return requests.map(req => this.routePart(req));
    }
}
