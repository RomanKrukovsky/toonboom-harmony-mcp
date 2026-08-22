export interface RigNode {
    id: string;
    name: string;
    type: 'PEG' | 'READ' | 'COMPOSITE' | 'CUTTER' | 'KINEMATIC_OUTPUT';
    parent?: string;
    pivot?: {
        x: number;
        y: number;
        z: number;
    };
    drawingSubstitutions?: string[];
}
export interface HumanoidStandardRigTemplate {
    topology: 'humanoid_standard';
    nodes: RigNode[];
    autopatchJoints: Array<{
        jointName: string;
        cutterNode: string;
        matteLayer: string;
        targetLayer: string;
    }>;
    deformerChains: Array<{
        nodeId: string;
        deformerType: 'curve' | 'bone';
        count: number;
    }>;
}
export declare function buildHumanoidStandardRigTemplate(characterName: string): HumanoidStandardRigTemplate;
