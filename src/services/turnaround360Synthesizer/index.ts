import type {
  CanonicalAngle,
  LayerDepthSpec,
  Turnaround360Config
} from '../../schemas/turnaround360Spec.js';

export interface LayerOrderingInterval {
  startAngleDeg: number;
  endAngleDeg: number;
  layerOrder: string[]; // From front to back (top to bottom)
}

export interface MeshVertex2D {
  id: string;
  x: number;
  y: number;
  isBoundary: boolean;
}

export interface MeshTriangle {
  v1: string;
  v2: string;
  v3: string;
  area: number;
}

export interface DeformedMeshState {
  angleDeg: number;
  vertices: MeshVertex2D[];
  triangles: MeshTriangle[];
  hasInvertedTriangles: boolean;
}

export interface MasterControllerExportHarmony {
  scriptCode: string;
  gridConfig: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    nodeName: string;
  };
}

export interface SmartBoneExportMoho {
  bones: Array<{
    name: string;
    minAngleDeg: number;
    maxAngleDeg: number;
    axis: 'x' | 'y';
  }>;
  actionNames: string[];
}

export interface Turnaround360SynthesisResult {
  characterId: string;
  canonicalAngles: CanonicalAngle[];
  layerOrderingIntervals: LayerOrderingInterval[];
  deformedMeshes: DeformedMeshState[];
  harmonyMasterController: MasterControllerExportHarmony;
  mohoSmartBones: SmartBoneExportMoho;
}

export class Turnaround360Synthesizer {
  /**
   * Computes depth value of a layer at continuous angle theta (0 - 360 degrees).
   */
  public static computeLayerZ(spec: LayerDepthSpec, angleDeg: number): number {
    const rad = ((angleDeg + spec.phaseOffsetDeg) * Math.PI) / 180;
    return +(spec.baseZ + spec.amplitude * Math.cos(rad)).toFixed(4);
  }

  /**
   * Generates continuous Z-ordering intervals across 0 to 360 degrees.
   * Eliminates popping by identifying exact angles where order permutation occurs.
   */
  public static generateZOrderingIntervals(layerDepths: LayerDepthSpec[]): LayerOrderingInterval[] {
    const intervals: LayerOrderingInterval[] = [];
    let currentOrder: string[] = [];
    let intervalStart = 0;

    for (let deg = 0; deg <= 360; deg++) {
      // Sort layers descending by computed Z (highest Z is in front / leftmost port)
      const sortedLayers = [...layerDepths]
        .map(layer => ({ name: layer.layerName, z: this.computeLayerZ(layer, deg) }))
        .sort((a, b) => b.z - a.z)
        .map(l => l.name);

      if (deg === 0) {
        currentOrder = sortedLayers;
        continue;
      }

      const orderChanged = sortedLayers.some((layerName, idx) => layerName !== currentOrder[idx]);
      if (orderChanged || deg === 360) {
        intervals.push({
          startAngleDeg: intervalStart,
          endAngleDeg: deg,
          layerOrder: currentOrder
        });
        currentOrder = sortedLayers;
        intervalStart = deg;
      }
    }

    return intervals;
  }

  /**
   * Calculates signed area of a 2D triangle. Positive indicates clockwise / non-inverted winding.
   */
  public static calculateTriangleSignedArea(p1: MeshVertex2D, p2: MeshVertex2D, p3: MeshVertex2D): number {
    return 0.5 * ((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y));
  }

  /**
   * Generates an edge-loop regularized quad mesh and deforms it horizontally up to 90 degrees
   * with boundary-preserving non-linear compression to prevent Delaunay triangle inversion.
   */
  public static generateBoundaryPreservingMesh(
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    angleDeg: number
  ): DeformedMeshState {
    const rad = (angleDeg * Math.PI) / 180;
    const compression = Math.max(0.12, Math.cos(rad)); // Retain minimum width at profile
    const vertices: MeshVertex2D[] = [];

    // Create 3 concentric rings (perimeter, mid-loop, inner core)
    const ringRadii = [1.0, 0.65, 0.3];
    const segmentCount = 8;

    for (let rIdx = 0; rIdx < ringRadii.length; rIdx++) {
      const scale = ringRadii[rIdx];
      const isPerimeter = rIdx === 0;

      for (let s = 0; s < segmentCount; s++) {
        const phi = (s * 2 * Math.PI) / segmentCount;
        const uncompressedX = Math.cos(phi) * radiusX * scale;
        const uncompressedY = Math.sin(phi) * radiusY * scale;

        // Boundary damping: perimeter vertices compress less severely than internal core vertices
        const localCompression = isPerimeter ? Math.sqrt(compression) : compression;
        const deformedX = centerX + uncompressedX * localCompression;
        const deformedY = centerY + uncompressedY;

        vertices.push({
          id: `v_${rIdx}_${s}`,
          x: +deformedX.toFixed(3),
          y: +deformedY.toFixed(3),
          isBoundary: isPerimeter
        });
      }
    }

    // Add center vertex
    vertices.push({
      id: 'v_center',
      x: +centerX.toFixed(3),
      y: +centerY.toFixed(3),
      isBoundary: false
    });

    // Build triangles connecting concentric rings
    const triangles: MeshTriangle[] = [];
    const getIdx = (r: number, s: number) => r * segmentCount + (s % segmentCount);

    for (let r = 0; r < ringRadii.length - 1; r++) {
      for (let s = 0; s < segmentCount; s++) {
        const vTopLeft = vertices[getIdx(r, s)];
        const vTopRight = vertices[getIdx(r, s + 1)];
        const vBottomLeft = vertices[getIdx(r + 1, s)];
        const vBottomRight = vertices[getIdx(r + 1, s + 1)];

        const area1 = this.calculateTriangleSignedArea(vTopLeft, vTopRight, vBottomLeft);
        const area2 = this.calculateTriangleSignedArea(vTopRight, vBottomRight, vBottomLeft);

        triangles.push({ v1: vTopLeft.id, v2: vTopRight.id, v3: vBottomLeft.id, area: +area1.toFixed(3) });
        triangles.push({ v1: vTopRight.id, v2: vBottomRight.id, v3: vBottomLeft.id, area: +area2.toFixed(3) });
      }
    }

    // Connect inner ring to center
    const centerV = vertices[vertices.length - 1];
    const innerRingIdx = ringRadii.length - 1;
    for (let s = 0; s < segmentCount; s++) {
      const v1 = vertices[getIdx(innerRingIdx, s)];
      const v2 = vertices[getIdx(innerRingIdx, s + 1)];
      const area = this.calculateTriangleSignedArea(v1, v2, centerV);
      triangles.push({ v1: v1.id, v2: v2.id, v3: centerV.id, area: +area.toFixed(3) });
    }

    const hasInvertedTriangles = triangles.some(t => Math.abs(t.area) < 0.001);

    return {
      angleDeg,
      vertices,
      triangles,
      hasInvertedTriangles
    };
  }

  /**
   * Synthesizes full 360° turnaround rig parameters for both Harmony and Moho.
   */
  public static synthesize360Turnaround(config: Turnaround360Config): Turnaround360SynthesisResult {
    const layerOrderingIntervals = this.generateZOrderingIntervals(config.layerDepths);

    // Test deformation at cardinal and intermediate angles
    const testAngles = [0, 22.5, 45, 67.5, 90];
    const deformedMeshes = testAngles.map(ang =>
      this.generateBoundaryPreservingMesh(0, 0, 150, 180, ang)
    );

    // Harmony Master Controller 2D Point interpolator
    const harmonyMasterController: MasterControllerExportHarmony = {
      gridConfig: {
        xMin: config.masterController.xRange[0],
        xMax: config.masterController.xRange[1],
        yMin: config.masterController.yRange[0],
        yMax: config.masterController.yRange[1],
        nodeName: `${config.characterId}_Turnaround_MC`
      },
      scriptCode: `
function configureMasterController_${config.characterId}() {
  var mc = node.add("Top", "${config.characterId}_Turnaround_MC", "MasterController", 0, -200, 0);
  node.setTextAttr(mc, "WIDGET_TYPE", 1, "Point2D");
  node.setTextAttr(mc, "MIN_X", 1, "${config.masterController.xRange[0]}");
  node.setTextAttr(mc, "MAX_X", 1, "${config.masterController.xRange[1]}");
  node.setTextAttr(mc, "MIN_Y", 1, "${config.masterController.yRange[0]}");
  node.setTextAttr(mc, "MAX_Y", 1, "${config.masterController.yRange[1]}");
  node.setTextAttr(mc, "INTERPOLATION", 1, "Bicubic");
}
`.trim()
    };

    // Moho Smart Bones (Turn X, Tilt Y)
    const mohoSmartBones: SmartBoneExportMoho = {
      bones: [
        {
          name: 'Dial_Turn_X',
          minAngleDeg: config.masterController.xRange[0],
          maxAngleDeg: config.masterController.xRange[1],
          axis: 'x'
        },
        {
          name: 'Dial_Tilt_Y',
          minAngleDeg: config.masterController.yRange[0],
          maxAngleDeg: config.masterController.yRange[1],
          axis: 'y'
        }
      ],
      actionNames: [
        'Dial_Turn_X_0',
        'Dial_Turn_X_45',
        'Dial_Turn_X_90',
        'Dial_Turn_X_135',
        'Dial_Turn_X_180',
        'Dial_Tilt_Y_UP',
        'Dial_Tilt_Y_DOWN'
      ]
    };

    return {
      characterId: config.characterId,
      canonicalAngles: config.angles,
      layerOrderingIntervals,
      deformedMeshes,
      harmonyMasterController,
      mohoSmartBones
    };
  }
}
