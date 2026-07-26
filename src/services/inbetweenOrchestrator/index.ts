import { InbetweenPIR, inbetweenPirSchema } from '../../schemas/inbetweenPir.js';

export class InbetweenOrchestrator {
    private readonly baseUrl: string;

    constructor(baseUrl: string = 'http://127.0.0.1:8000') {
        this.baseUrl = baseUrl;
    }

    /**
     * Generates inbetween raster frames between two keyframes.
     * Uses the ML Runtime (AnimeInbet Provider).
     */
    public async generateInbetweens(frameAPath: string, frameBPath: string, count: number = 3): Promise<InbetweenPIR> {
        try {
            const response = await fetch(`${this.baseUrl}/infer/animeinbet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    frame_a_path: frameAPath,
                    frame_b_path: frameBPath,
                    count: count
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Validate with Zod
            const parsed = inbetweenPirSchema.parse(data);
            return parsed;
        } catch (error) {
            console.error('Error generating inbetweens:', error);
            throw new Error(`Failed to generate inbetweens: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
