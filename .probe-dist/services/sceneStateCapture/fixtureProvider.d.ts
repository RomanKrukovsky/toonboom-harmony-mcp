/**
 * Offline scene state provider backed by JSON fixtures.
 *
 * Its `source` is always `fixture`, so nothing it produces can be mistaken for a real
 * Harmony read anywhere downstream. Used by the offline vertical slice and the test suite.
 */
import { RawSceneState, SceneStateProvider, ProviderAvailability } from './index.js';
export interface FixtureProviderOptions {
    /** Ordered fixture files. Each `captureFull` call advances to the next one, then repeats the last. */
    statePaths: string[];
}
export declare class FixtureSceneStateProvider implements SceneStateProvider {
    private readonly options;
    readonly source: "fixture";
    private cursor;
    constructor(options: FixtureProviderOptions);
    describe(): Promise<ProviderAvailability>;
    captureFull(): Promise<RawSceneState>;
    /** Fixtures cannot scope a read; the recorder falls back to a full read. */
    captureEntities(): Promise<RawSceneState | undefined>;
    private load;
}
