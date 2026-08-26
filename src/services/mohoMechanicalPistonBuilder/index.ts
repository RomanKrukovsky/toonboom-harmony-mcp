export interface PistonPairConfig {
  pistonName: string;
  baseJointPos: [number, number];
  rodJointPos: [number, number];
  cylinderLengthPx: number;
  rodLengthPx: number;
}

export interface CompiledPistonResult {
  pistonName: string;
  bones: Array<Record<string, unknown>>;
  constraints: Array<{
    sourceBone: string;
    targetBone: string;
    type: 'look_at' | 'point_to_point';
  }>;
}

/**
 * MohoMechanicalPistonBuilder — Builds hard-surface robotic hydraulic pistons
 * and linear actuators based on Robo.moho (40 bones).
 */
export class MohoMechanicalPistonBuilder {
  public static buildPistonPair(params: PistonPairConfig): CompiledPistonResult {
    const name = params.pistonName;

    // 1. Upper Cylinder Bone (Rotates towards Rod Base)
    const cylinderBone: Record<string, unknown> = {
      name: `${name}_Cylinder`,
      pos: params.baseJointPos,
      length: params.cylinderLengthPx,
      angle: 0,
      strength: 0,
      target_bone_name: `${name}_Rod_Target`,
      tag_color: 1 // Red = Mechanical
    };

    // 2. Lower Rod Bone (Rotates towards Cylinder Base)
    const rodBone: Record<string, unknown> = {
      name: `${name}_Rod`,
      pos: params.rodJointPos,
      length: params.rodLengthPx,
      angle: 0,
      strength: 0,
      target_bone_name: `${name}_Cylinder_Target`,
      tag_color: 1
    };

    // 3. Pin targets for mutual Look-At
    const cylinderTarget: Record<string, unknown> = {
      name: `${name}_Cylinder_Target`,
      pos: params.baseJointPos,
      length: 0,
      is_pin_bone: true,
      shy: true
    };

    const rodTarget: Record<string, unknown> = {
      name: `${name}_Rod_Target`,
      pos: params.rodJointPos,
      length: 0,
      is_pin_bone: true,
      shy: true
    };

    return {
      pistonName: name,
      bones: [cylinderBone, rodBone, cylinderTarget, rodTarget],
      constraints: [
        { sourceBone: `${name}_Cylinder`, targetBone: `${name}_Rod_Target`, type: 'look_at' },
        { sourceBone: `${name}_Rod`, targetBone: `${name}_Cylinder_Target`, type: 'look_at' }
      ]
    };
  }
}
