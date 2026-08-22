import { PerformancePIR } from '../../schemas/performancePir.js';
import { RigBindingPlanV1 } from '../../schemas/rigBinding.js';
import { RetargetingPlan } from '../../schemas/retargetingPlan.js';
export declare class RetargetingResolver {
    resolve(performancePir: PerformancePIR, bindingPlan: RigBindingPlanV1): RetargetingPlan;
}
