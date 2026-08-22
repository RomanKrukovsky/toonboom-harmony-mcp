export interface CliRenderOptions {
    projectPath: string;
    startFrame?: number;
    endFrame?: number;
    resolutionWidth?: number;
    resolutionHeight?: number;
}
export declare class HarmonyCli {
    static render(options: CliRenderOptions): Promise<string>;
    static vectorize(projectPath: string, drawingPaths: string[]): Promise<string>;
}
