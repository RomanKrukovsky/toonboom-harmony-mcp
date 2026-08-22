import { CharacterTopologyPIR } from '../pivotEstimator/index.js';
import { RigTemplateEntry } from '../rigTemplateRegistry/index.js';
import { RigBindingPlanV1 } from '../../schemas/rigBinding.js';
export declare class RigBindingResolver {
    resolveBinding(characterId: string, pir: CharacterTopologyPIR, pirHash: string, templateEntry: RigTemplateEntry): RigBindingPlanV1;
}
