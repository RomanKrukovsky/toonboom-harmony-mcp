import { DeformerAssemblyPlan } from '../schemas/deformerPIR.js';
import { CharacterRigAssemblyPlan } from '../schemas/characterRigPIR.js';
export declare class DeformerGenerator {
    /**
     * Generates a Deformer and Master Controller Plan based on the Rig Assembly Plan.
     * - Torso, Head, Face, Hair -> Envelope Deformer
     * - Arms, Legs -> Curve Deformer (3 points)
     */
    static generatePlan(rigPlan: CharacterRigAssemblyPlan): DeformerAssemblyPlan;
}
