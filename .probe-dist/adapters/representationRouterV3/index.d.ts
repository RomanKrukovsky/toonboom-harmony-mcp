import { type RoutingPlan, type RepresentationType } from '../../schemas/representationRouter.js';
import type { PartDecomposition } from '../../schemas/partDecomposition.js';
export interface RoutingInput {
    characterId: string;
    sceneId: string;
    decomposition: PartDecomposition;
    studioProfile?: {
        preferredRepresentation?: RepresentationType;
        maxDeformersPerPart?: number;
        editabilityPriority?: number;
        frameByFrameAllowed?: boolean;
    };
    artistLocks?: Record<string, RepresentationType>;
}
export declare class RepresentationRouterV3 {
    route(input: RoutingInput): RoutingPlan;
}
