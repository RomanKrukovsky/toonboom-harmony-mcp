import { CharacterTopologyPIR } from '../pivotEstimator/index.js';
import { RigBindingPlanV1 } from '../../schemas/rigBinding.js';
import { RetargetingPlan } from '../../schemas/retargetingPlan.js';
import { RetakeManifest } from '../../schemas/retakeManifest.js';
import { RigTemplateEntry } from '../rigTemplateRegistry/index.js';
import { HarmonyCommandPlanV4 } from '../../schemas/harmonyCommandPlanV4.js';
export declare class HarmonyCommandBuilder {
    buildPlan(pir: CharacterTopologyPIR, bindingPlan: RigBindingPlanV1, templateEntry: RigTemplateEntry): HarmonyCommandPlanV4;
    buildAnimationPlan(retargetingPlan: RetargetingPlan): HarmonyCommandPlanV4;
    buildLipSyncPlan(exposures: {
        nodeId: string;
        startFrame: number;
        endFrame: number;
        drawingName: string;
    }[], sourceHash: string): HarmonyCommandPlanV4;
    buildInbetweenPlan(pir: import('../../schemas/inbetweenPir.js').InbetweenPIR, targetNodeId: string): HarmonyCommandPlanV4;
    buildRetakePatchPlan(retakeManifest: RetakeManifest): HarmonyCommandPlanV4;
}
