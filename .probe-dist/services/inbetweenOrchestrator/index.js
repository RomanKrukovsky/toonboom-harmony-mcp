import { inbetweenPirSchema } from '../../schemas/inbetweenPir.js';
export class InbetweenOrchestrator {
    baseUrl;
    constructor(baseUrl = 'http://127.0.0.1:8000') {
        this.baseUrl = baseUrl;
    }
    /**
     * Generates inbetween raster frames between two keyframes.
     * Uses the ML Runtime (AnimeInbet Provider).
     */
    async generateInbetweens(frameAPath, frameBPath, count = 3) {
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
        }
        catch (error) {
            console.error('Error generating inbetweens:', error);
            throw new Error(`Failed to generate inbetweens: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
