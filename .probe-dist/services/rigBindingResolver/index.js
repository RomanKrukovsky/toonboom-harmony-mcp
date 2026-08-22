export class RigBindingResolver {
    resolveBinding(characterId, pir, pirHash, templateEntry) {
        const bindings = [];
        const unresolved = [];
        const warnings = [];
        const { template } = templateEntry;
        // Check required landmarks
        for (const req of template.required_landmarks) {
            const landmark = pir.points.find(p => p.name === req);
            if (landmark) {
                bindings.push({
                    template_slot: req,
                    pir_landmark: req,
                    confidence: landmark.confidence,
                    resolution: 'DIRECT'
                });
            }
            else {
                unresolved.push(req);
                warnings.push(`Required landmark missing: ${req}`);
            }
        }
        // Check optional landmarks
        if (template.optional_landmarks) {
            for (const opt of template.optional_landmarks) {
                const landmark = pir.points.find(p => p.name === opt);
                if (landmark) {
                    bindings.push({
                        template_slot: opt,
                        pir_landmark: opt,
                        confidence: landmark.confidence,
                        resolution: 'DIRECT'
                    });
                }
            }
        }
        if (unresolved.length > 0) {
            throw new Error(`Cannot resolve RigBindingPlan, missing required landmarks: ${unresolved.join(', ')}`);
        }
        return {
            schema: 'toon-boom-mcp/rig-binding-plan-v1',
            character_id: characterId,
            template: {
                template_id: template.template_id,
                version: template.version,
                content_hash: templateEntry.contentHash
            },
            source: {
                pir_id: pir.characterId,
                pir_hash: pirHash
            },
            bindings,
            unresolved,
            warnings
        };
    }
}
