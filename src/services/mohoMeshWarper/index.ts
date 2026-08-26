/**
 * MohoMeshWarper — generates 2D Delaunay triangulation meshes for Smart Warp
 * deformation of character art (crotch joints, torso twist, clothing/raster layers).
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Triangle {
  p1: number;
  p2: number;
  p3: number;
}

export interface SmartMeshResult {
  meshLayerName: string;
  targetLayerName: string;
  points: Point2D[];
  triangles: Triangle[];
  pointCount: number;
  triangleCount: number;
}

export class MohoMeshWarper {
  /**
   * Generates a 2D bounding grid / Delaunay triangulation mesh for a region.
   */
  public static generateMesh(
    meshLayerName: string,
    targetLayerName: string,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    subdivisionsX = 4,
    subdivisionsY = 4
  ): SmartMeshResult {
    const points: Point2D[] = [];
    const stepX = (bounds.maxX - bounds.minX) / subdivisionsX;
    const stepY = (bounds.maxY - bounds.minY) / subdivisionsY;

    // 1. Generate regular grid of points
    for (let j = 0; j <= subdivisionsY; j++) {
      for (let i = 0; i <= subdivisionsX; i++) {
        points.push({
          x: +(bounds.minX + i * stepX).toFixed(2),
          y: +(bounds.minY + j * stepY).toFixed(2)
        });
      }
    }

    // 2. Triangulate quad cells into triangle pairs
    const triangles: Triangle[] = [];
    const cols = subdivisionsX + 1;

    for (let j = 0; j < subdivisionsY; j++) {
      for (let i = 0; i < subdivisionsX; i++) {
        const topLeft = j * cols + i;
        const topRight = topLeft + 1;
        const bottomLeft = (j + 1) * cols + i;
        const bottomRight = bottomLeft + 1;

        // Two triangles per quad cell
        triangles.push({ p1: topLeft, p2: topRight, p3: bottomLeft });
        triangles.push({ p1: topRight, p2: bottomRight, p3: bottomLeft });
      }
    }

    return {
      meshLayerName,
      targetLayerName,
      points,
      triangles,
      pointCount: points.length,
      triangleCount: triangles.length
    };
  }

  /**
   * Specialized crotch mesh (pelvis diamond) to eliminate thigh holes during leg lifts.
   */
  public static generateCrotchMesh(pelvisCenter: Point2D, widthPx = 80, heightPx = 50): SmartMeshResult {
    return this.generateMesh(
      'Crotch_SmartMesh',
      'Pelvis',
      {
        minX: pelvisCenter.x - widthPx / 2,
        maxX: pelvisCenter.x + widthPx / 2,
        minY: pelvisCenter.y - heightPx / 2,
        maxY: pelvisCenter.y + heightPx / 2
      },
      3,
      3
    );
  }
}
