import { MohoSmearSynthesizer } from '../../src/services/mohoSmearSynthesizer/index.js';
import { MohoNativeBridge } from '../../src/services/mohoNativeBridge/index.js';

describe('MohoSmearSynthesizer & Native Smear Core (Rust + TS)', () => {
  it('should detect velocity and motion arcs for smear breakdown triggers', () => {
    const trajectory = [
      { frame: 1, posX: 100, posY: 100 },
      { frame: 2, posX: 110, posY: 105 },
      { frame: 3, posX: 250, posY: 180 }, // Delta > 150px
      { frame: 4, posX: 260, posY: 185 }
    ];

    const detections = MohoSmearSynthesizer.detectSmears(trajectory, 30.0);
    expect(detections.length).toBeGreaterThanOrEqual(1);
    expect(detections[0].frame).toBe(3);
    expect(['arc', 'stretch', 'multi']).toContain(detections[0].smearType);
    expect(detections[0].velocityMagnitude).toBeGreaterThan(50);
  });

  it('should generate valid Motion Arc Smear vector shapes', () => {
    const arc = MohoSmearSynthesizer.generateArcSmear({
      name: 'Arm_Smear_Arc',
      startX: -50,
      startY: -80,
      endX: 80,
      endY: 80,
      arcCurvature: 0.4,
      baseThickness: 28.0,
      fillRgba: [230, 200, 180, 255]
    });

    expect(arc.name).toBe('Arm_Smear_Arc');
    expect(arc.points.length).toBe(6);
    expect(arc.isClosed).toBe(true);
    expect(arc.fillColor.r).toBe(230);
  });

  it('should build complete 5-state Smear Switch Pack for a character limb', () => {
    const baseShape = MohoNativeBridge.generateCapsuleShape({
      name: 'Arm_Normal',
      centerX: 0,
      centerY: 0,
      radiusX: 20,
      radiusY: 60,
      fillRgba: [240, 215, 195, 255],
      strokeWidth: 2.0,
      jointCapPadding: false
    });

    const pack = MohoSmearSynthesizer.buildSmearSwitchPack('Arm_L', baseShape);
    expect(pack.switchLayerName).toBe('Arm_L_Smear_Switch');
    expect(pack.states.Normal).toBeDefined();
    expect(pack.states.Smear_Arc).toBeDefined();
    expect(pack.states.Smear_Stretch).toBeDefined();
    expect(pack.states.Smear_Multi).toBeDefined();
    expect(pack.states.Smear_Whiplash).toBeDefined();
    expect(pack.states.Smear_Arc.points.length).toBe(6);
  });
});
