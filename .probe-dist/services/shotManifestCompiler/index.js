import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { crossReferenceShotManifest } from '../../schemas/shotManifest.js';
export class ShotManifestCompiler {
    compile(manifest, refs, options = {}) {
        const violations = crossReferenceShotManifest(manifest, refs);
        const warnings = [];
        if (violations.length > 0) {
            return {
                performance: this.emptyPerformance(manifest),
                violations,
                warnings
            };
        }
        const tracksByNode = new Map();
        const ensureTrack = (nodeId) => {
            let t = tracksByNode.get(nodeId);
            if (!t) {
                t = { nodeId, keys: [] };
                tracksByNode.set(nodeId, t);
            }
            return t;
        };
        for (const beat of manifest.beats) {
            this.applyBeat(beat, manifest, options, ensureTrack, warnings);
        }
        const performanceId = this.derivePerformanceId(manifest);
        const performance = {
            schema: 'toon-boom-mcp/performance-pir-v1',
            performanceId,
            characterId: manifest.beats[0]?.characterId ?? 'unknown',
            durationFrames: manifest.timing.totalFrames,
            fps: manifest.timing.fps,
            tracks: Array.from(tracksByNode.values()).map(t => ({
                nodeId: t.nodeId,
                keys: t.keys.sort((a, b) => a.frame - b.frame)
            })),
            holds: [],
            shotManifestRef: manifest.shotId,
            staging: {
                shotSize: manifest.staging.shotSize,
                cameraMove: manifest.staging.cameraMove,
                backgroundRef: manifest.staging.backgroundRef
            },
            timing: {
                totalFrames: manifest.timing.totalFrames,
                minBeatFrames: manifest.timing.minBeatFrames,
                maxBeatFrames: manifest.timing.maxBeatFrames,
                anticipationFrames: manifest.timing.anticipationFrames,
                followThroughFrames: manifest.timing.followThroughFrames
            },
            beatFrameMap: manifest.beats.map(b => ({
                beatId: b.beatId,
                startFrame: b.startFrame,
                endFrame: b.endFrame
            }))
        };
        return { performance, violations, warnings };
    }
    applyBeat(beat, manifest, options, ensureTrack, warnings) {
        const controllerMap = options.controllerMaps?.[beat.characterId] ?? [];
        if (controllerMap.length === 0) {
            warnings.push(`beat "${beat.beatId}": no controller map for character "${beat.characterId}" — emitting HOLD`);
            return;
        }
        // Place a HOLD-style key at the beat start frame on every known controller.
        // The actual motion values come from the gesture/pose library, which is
        // resolved later by RetargetingResolver against the RigBindingPlan. Here
        // we only declare WHERE keys live (on beat boundaries), not WHAT they do.
        for (const ctrl of controllerMap) {
            const track = ensureTrack(ctrl.nodePath);
            track.keys.push({ frame: beat.startFrame, interpolation: 'LINEAR' });
            if (beat.endFrame > beat.startFrame) {
                track.keys.push({ frame: beat.endFrame, interpolation: 'LINEAR' });
            }
        }
        if (beat.gestureId) {
            warnings.push(`beat "${beat.beatId}": gestureId "${beat.gestureId}" declared but gesture track resolution is deferred to RetargetingResolver`);
        }
        if (beat.poseLibraryRef) {
            warnings.push(`beat "${beat.beatId}": poseLibraryRef "${beat.poseLibraryRef}" declared but pose binding is deferred to RetargetingResolver`);
        }
    }
    emptyPerformance(manifest) {
        return {
            schema: 'toon-boom-mcp/performance-pir-v1',
            performanceId: this.derivePerformanceId(manifest),
            characterId: manifest.beats[0]?.characterId ?? 'unknown',
            durationFrames: manifest.timing.totalFrames,
            fps: manifest.timing.fps,
            tracks: [],
            holds: [],
            shotManifestRef: manifest.shotId
        };
    }
    derivePerformanceId(manifest) {
        const stable = stringify({
            shotId: manifest.shotId,
            showBibleRef: manifest.showBibleRef,
            staging: manifest.staging,
            timing: manifest.timing,
            beats: manifest.beats
        });
        const hash = crypto.createHash('sha256').update(stable ?? '').digest('hex');
        return `PERF-${hash.slice(0, 16)}`;
    }
}
