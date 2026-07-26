export interface RigNode {
  id: string;
  name: string;
  type: 'PEG' | 'READ' | 'COMPOSITE' | 'CUTTER' | 'KINEMATIC_OUTPUT';
  parent?: string;
  pivot?: { x: number; y: number; z: number };
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

export function buildHumanoidStandardRigTemplate(characterName: string): HumanoidStandardRigTemplate {
  const prefix = characterName.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const nodes: RigNode[] = [
    { id: `${prefix}_Master_P`, name: 'Master-P', type: 'PEG', pivot: { x: 0, y: 0, z: 0 } },
    { id: `${prefix}_Torso_P`, name: 'Torso-P', type: 'PEG', parent: `${prefix}_Master_P`, pivot: { x: 0, y: 0, z: 0 } },
    { id: `${prefix}_Torso`, name: 'Torso', type: 'READ', parent: `${prefix}_Torso_P` },
    
    // Head & Neck
    { id: `${prefix}_Head_P`, name: 'Head-P', type: 'PEG', parent: `${prefix}_Torso_P`, pivot: { x: 0, y: 3.5, z: 0 } },
    { id: `${prefix}_Head`, name: 'Head', type: 'READ', parent: `${prefix}_Head_P`, drawingSubstitutions: ['front', 'three_quarter', 'profile'] },
    
    // Arm Right
    { id: `${prefix}_Arm_R_P`, name: 'Arm_R-P', type: 'PEG', parent: `${prefix}_Torso_P`, pivot: { x: -1.5, y: 3.0, z: 0 } },
    { id: `${prefix}_Arm_R`, name: 'Arm_R', type: 'READ', parent: `${prefix}_Arm_R_P` },
    { id: `${prefix}_Hand_R_P`, name: 'Hand_R-P', type: 'PEG', parent: `${prefix}_Arm_R_P`, pivot: { x: -2.8, y: 1.2, z: 0 } },
    { id: `${prefix}_Hand_R`, name: 'Hand_R', type: 'READ', parent: `${prefix}_Hand_R_P`, drawingSubstitutions: ['open', 'fist', 'point'] },
    
    // Arm Left
    { id: `${prefix}_Arm_L_P`, name: 'Arm_L-P', type: 'PEG', parent: `${prefix}_Torso_P`, pivot: { x: 1.5, y: 3.0, z: 0 } },
    { id: `${prefix}_Arm_L`, name: 'Arm_L', type: 'READ', parent: `${prefix}_Arm_L_P` },
    { id: `${prefix}_Hand_L_P`, name: 'Hand_L-P', type: 'PEG', parent: `${prefix}_Arm_L_P`, pivot: { x: 2.8, y: 1.2, z: 0 } },
    { id: `${prefix}_Hand_L`, name: 'Hand_L', type: 'READ', parent: `${prefix}_Hand_L_P`, drawingSubstitutions: ['open', 'fist', 'point'] },

    // Leg Right
    { id: `${prefix}_Leg_R_P`, name: 'Leg_R-P', type: 'PEG', parent: `${prefix}_Torso_P`, pivot: { x: -0.8, y: -0.5, z: 0 } },
    { id: `${prefix}_Leg_R`, name: 'Leg_R', type: 'READ', parent: `${prefix}_Leg_R_P` },
    { id: `${prefix}_Foot_R_P`, name: 'Foot_R-P', type: 'PEG', parent: `${prefix}_Leg_R_P`, pivot: { x: -0.9, y: -3.5, z: 0 } },
    { id: `${prefix}_Foot_R`, name: 'Foot_R', type: 'READ', parent: `${prefix}_Foot_R_P` },

    // Leg Left
    { id: `${prefix}_Leg_L_P`, name: 'Leg_L-P', type: 'PEG', parent: `${prefix}_Torso_P`, pivot: { x: 0.8, y: -0.5, z: 0 } },
    { id: `${prefix}_Leg_L`, name: 'Leg_L', type: 'READ', parent: `${prefix}_Leg_L_P` },
    { id: `${prefix}_Foot_L_P`, name: 'Foot_L-P', type: 'PEG', parent: `${prefix}_Leg_L_P`, pivot: { x: 0.9, y: -3.5, z: 0 } },
    { id: `${prefix}_Foot_L`, name: 'Foot_L', type: 'READ', parent: `${prefix}_Foot_L_P` }
  ];

  return {
    topology: 'humanoid_standard',
    nodes,
    autopatchJoints: [
      { jointName: 'shoulder_r', cutterNode: `${prefix}_Cutter_Arm_R`, matteLayer: `${prefix}_Torso`, targetLayer: `${prefix}_Arm_R` },
      { jointName: 'shoulder_l', cutterNode: `${prefix}_Cutter_Arm_L`, matteLayer: `${prefix}_Torso`, targetLayer: `${prefix}_Arm_L` },
      { jointName: 'hip_r', cutterNode: `${prefix}_Cutter_Leg_R`, matteLayer: `${prefix}_Torso`, targetLayer: `${prefix}_Leg_R` },
      { jointName: 'hip_l', cutterNode: `${prefix}_Cutter_Leg_L`, matteLayer: `${prefix}_Torso`, targetLayer: `${prefix}_Leg_L` }
    ],
    deformerChains: [
      { nodeId: `${prefix}_Arm_R`, deformerType: 'curve', count: 3 },
      { nodeId: `${prefix}_Arm_L`, deformerType: 'curve', count: 3 },
      { nodeId: `${prefix}_Leg_R`, deformerType: 'bone', count: 2 },
      { nodeId: `${prefix}_Leg_L`, deformerType: 'bone', count: 2 }
    ]
  };
}
