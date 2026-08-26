export interface RasterLayerInput {
  name: string;
  imageFilePath: string;
  originX: number;
  originY: number;
  widthPx: number;
  heightPx: number;
  parentBoneName?: string;
  generateSmartMesh?: boolean;
}

export interface IngestedRasterPuppetResult {
  puppetName: string;
  imageLayersCount: number;
  meshWarpLayersCount: number;
  layerList: Array<Record<string, unknown>>;
}

/**
 * MohoPsdImageLayerIngest — Ingests raster cutout artwork (PSD/PNG layers)
 * and automatically generates Smart Mesh warp deformers based on referee.moho and flet_devoka.moho.
 */
export class MohoPsdImageLayerIngest {
  public static ingestPuppet(
    puppetName: string,
    layers: RasterLayerInput[]
  ): IngestedRasterPuppetResult {
    const layerList: Array<Record<string, unknown>> = [];
    let meshCount = 0;

    for (let idx = 0; idx < layers.length; idx++) {
      const layer = layers[idx];

      // 1. If mesh warp is requested, create paired Smart Mesh VectorLayer
      let meshLayerIndex = -1;
      if (layer.generateSmartMesh) {
        meshLayerIndex = idx;
        meshCount++;
        layerList.push({
          name: `${layer.name}_Mesh`,
          type: 'VectorLayer',
          is_smart_mesh: true,
          shy: true,
          parent_bone_name: layer.parentBoneName
        });
      }

      // 2. Image Layer definition
      layerList.push({
        name: layer.name,
        type: 'ImageLayer',
        image_path: layer.imageFilePath,
        origin: [layer.originX, layer.originY],
        dimensions: [layer.widthPx, layer.heightPx],
        mesh_warp_layer: meshLayerIndex,
        parent_bone_name: layer.parentBoneName
      });
    }

    return {
      puppetName,
      imageLayersCount: layers.length,
      meshWarpLayersCount: meshCount,
      layerList
    };
  }
}
