import { type DigitalActor, type DigitalActorValidation } from '../../schemas/digitalActor.js';
export declare class DigitalActorRegistry {
    readonly rootDir: string;
    constructor(rootDir?: string);
    /**
     * Validates a Digital Actor against structural rules, schema and integrity constraints.
     */
    validate(actor: unknown): DigitalActorValidation;
    /**
     * Persists the Digital Actor to output directory.
     */
    register(actor: DigitalActor): {
        filePath: string;
        sha256: string;
    };
    /**
     * Retrieves an actor by ID.
     */
    getActor(actorId: string): DigitalActor;
    /**
     * Imports a Digital Actor from a reconstruction manifest JSON.
     */
    importFromReconstructionManifest(manifestPath: string, name: string): DigitalActor;
    /**
     * Imports a Digital Actor from other formats.
     */
    importFromFile(sourceType: 'psd' | 'svg' | 'png_dir' | 'harmony_template' | 'harmony_scene', sourcePath: string, name: string): DigitalActor;
}
