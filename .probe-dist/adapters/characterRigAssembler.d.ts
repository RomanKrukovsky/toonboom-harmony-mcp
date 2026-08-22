import { CharacterDrawingPIR } from '../schemas/vectorizationPIR.js';
import { CharacterRigAssemblyPlan } from '../schemas/characterRigPIR.js';
export declare class CharacterRigAssembler {
    static assemblePlan(pir: CharacterDrawingPIR, characterName?: string): CharacterRigAssemblyPlan;
}
