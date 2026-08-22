import { Rig360Spec, Rig360AssemblyPlan } from '../schemas/rig360PIR.js';
export declare class Rig360Assembler {
    /**
     * Combines multiple CharacterDrawingPIR angles into a single Head Turn Plan with Substitutions.
     */
    static assemblePlan(spec: Rig360Spec): Rig360AssemblyPlan;
}
