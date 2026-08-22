import { InbetweenPIR } from '../../schemas/inbetweenPir.js';
export declare class InbetweenOrchestrator {
    private readonly baseUrl;
    constructor(baseUrl?: string);
    /**
     * Generates inbetween raster frames between two keyframes.
     * Uses the ML Runtime (AnimeInbet Provider).
     */
    generateInbetweens(frameAPath: string, frameBPath: string, count?: number): Promise<InbetweenPIR>;
}
