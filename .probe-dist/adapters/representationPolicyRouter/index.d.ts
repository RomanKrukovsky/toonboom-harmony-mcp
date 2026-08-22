export interface RepresentationRouteRequest {
    partId: string;
    startFrame: number;
    endFrame: number;
    deformationScore: number;
    rotationVelocity: number;
}
export interface RepresentationRouteResult {
    partId: string;
    startFrame: number;
    endFrame: number;
    representation: 'peg_transform' | 'curve_deformer' | 'envelope_deformer' | 'bone_deformer' | 'drawing_substitution' | 'frame_by_frame_vector';
    explanation: string;
    confidence: number;
}
export declare class RepresentationPolicyRouter {
    routePart(req: RepresentationRouteRequest): RepresentationRouteResult;
    routeBatch(requests: RepresentationRouteRequest[]): RepresentationRouteResult[];
}
