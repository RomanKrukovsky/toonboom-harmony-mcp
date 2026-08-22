import { SceneSnapshotPIR } from '../../schemas/sceneSnapshotPir.js';
import { RetakeManifest } from '../../schemas/retakeManifest.js';
export declare class SceneDiffEngine {
    private readonly epsilon;
    compare(v1: SceneSnapshotPIR, v2: SceneSnapshotPIR): RetakeManifest;
    private compareTransformKeys;
    private compareExposures;
    private keysEqual;
}
