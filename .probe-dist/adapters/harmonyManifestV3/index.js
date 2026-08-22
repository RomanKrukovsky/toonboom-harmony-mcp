import { harmonyManifestV3Schema } from '../../schemas/harmonyManifestV3.js';
export class HarmonyManifestV3Compiler {
    compile(input) {
        const manifestId = `manifest_${input.sceneId}_${Date.now()}`;
        const iterations = input.iterations || [1, 2, 3, 4, 5, 6, 7];
        // Build representation segments from routing plan
        const representationSegments = this.buildRepresentationSegments(input.routingPlan);
        // Build motion tracks from key poses and motion synthesizer
        const motionTracks = input.motionTracks || [];
        return harmonyManifestV3Schema.parse({
            schemaVersion: '3.0',
            manifestId,
            sceneId: input.sceneId,
            createdAt: new Date().toISOString(),
            // Core scene understanding
            sceneUnderstanding: input.sceneUnderstanding,
            directorPlans: input.directorPlans,
            performancePlans: input.performancePlans,
            voiceAnalysis: input.voiceAnalysis,
            // Character and rigging
            digitalActors: input.digitalActors,
            partDecomposition: input.partDecomposition,
            occlusionGraph: input.occlusionGraph,
            // Animation
            ...(input.keyPoses && input.keyPoses.poses ? { keyPoses: input.keyPoses } : {}),
            motionTracks,
            cameraLayout: input.cameraLayout,
            cameraTrack: input.cameraLayout?.cameraTrack,
            // Representation
            routingPlan: input.routingPlan,
            representationSegments,
            // Events
            gestureEvents: input.gestureEvents,
            gazeEvents: input.gazeEvents,
            facialEvents: input.facialEvents,
            // Assets
            drawings: input.drawings,
            palettes: input.palettes,
            exposureBlocks: input.exposureBlocks,
            // Quality and selection
            criticReports: input.criticReports,
            variantTournament: input.variantTournament,
            tasteScores: input.tasteScores,
            selectionHistory: input.selectionHistory,
            artistCorrections: input.artistCorrections,
            trainingSignals: input.trainingSignals,
            // Metadata
            provenance: {
                pipeline: 'AI Animation Studio',
                iterations,
                engine: 'HarmonyManifestV3Compiler v1',
                timestamp: new Date().toISOString()
            },
            // Honest limitations
            limitations: {
                ruleBasedBaseline: true,
                noMlAdapters: true,
                noHarmonyApplied: true,
                artistIntentInferred: true
            }
        });
    }
    buildRepresentationSegments(routingPlan) {
        if (!routingPlan || !routingPlan.segments)
            return [];
        const segments = [];
        for (const segment of routingPlan.segments) {
            for (const seg of segment.segments) {
                segments.push({
                    partId: segment.partId,
                    startFrame: seg.startFrame,
                    endFrame: seg.endFrame,
                    representation: seg.representation,
                    explanation: seg.explanation,
                    confidence: seg.confidence
                });
            }
        }
        return segments;
    }
}
