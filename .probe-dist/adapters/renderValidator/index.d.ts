export interface RenderValidationResult {
    fileExists: boolean;
    fileSizeBytes: number;
    extension: string;
    isLikelyValidVideo: boolean | 'unknown';
    isLikelyValidImage: boolean | 'unknown';
    renderedBy: 'harmony_cli' | 'simulation' | 'unknown';
    createdAt: string;
    reason?: string;
}
export declare class RenderOutputValidator {
    validate(filePath: string, expectedRenderer?: 'harmony_cli' | 'simulation' | 'unknown'): RenderValidationResult;
}
