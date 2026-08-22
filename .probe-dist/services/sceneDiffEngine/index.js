import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
export class SceneDiffEngine {
    epsilon = 0.00001; // For floating point comparisons
    compare(v1, v2) {
        const manifest = {
            format: 'RetakeManifest',
            version: '1.0.0',
            sceneId: v1.sceneId,
            snapshotV1Id: crypto.createHash('sha256').update(stringify(v1)).digest('hex'),
            snapshotV2Id: crypto.createHash('sha256').update(stringify(v2)).digest('hex'),
            nodes: { added: [], removed: [] },
            connections: { added: [], removed: [] },
            nodeDataChanges: []
        };
        // 1. Compare Nodes
        const v1NodeIds = new Set(v1.nodes.map(n => n.id));
        const v2NodeIds = new Set(v2.nodes.map(n => n.id));
        for (const id of v2NodeIds) {
            if (!v1NodeIds.has(id))
                manifest.nodes.added.push(id);
        }
        for (const id of v1NodeIds) {
            if (!v2NodeIds.has(id))
                manifest.nodes.removed.push(id);
        }
        // 2. Compare Connections
        const v1ConnStrings = new Set(v1.connections.map(c => stringify(c)));
        const v2ConnStrings = new Set(v2.connections.map(c => stringify(c)));
        for (const c of v2.connections) {
            if (!v1ConnStrings.has(stringify(c)))
                manifest.connections.added.push(c);
        }
        for (const c of v1.connections) {
            if (!v2ConnStrings.has(stringify(c)))
                manifest.connections.removed.push(c);
        }
        // 3. Compare Node Data (Transforms and Exposures)
        const v1DataMap = new Map(v1.nodeData.map(d => [d.nodeId, d]));
        const v2DataMap = new Map(v2.nodeData.map(d => [d.nodeId, d]));
        // Check common nodes for changes + new nodes
        for (const [nodeId, v2Data] of v2DataMap.entries()) {
            const v1Data = v1DataMap.get(nodeId);
            if (!v1Data) {
                // Entirely new node data
                manifest.nodeDataChanges.push({
                    nodeId,
                    transformKeys: v2Data.transformKeys ? { added: v2Data.transformKeys, modified: [], removed: [] } : undefined,
                    exposures: v2Data.exposures ? { added: v2Data.exposures, modified: [], removed: [] } : undefined
                });
                continue;
            }
            // Delta for transformKeys
            let transformKeysDelta;
            if (v1Data.transformKeys || v2Data.transformKeys) {
                const v1Keys = v1Data.transformKeys || [];
                const v2Keys = v2Data.transformKeys || [];
                transformKeysDelta = this.compareTransformKeys(v1Keys, v2Keys);
            }
            // Delta for exposures
            let exposuresDelta;
            if (v1Data.exposures || v2Data.exposures) {
                const v1Exp = v1Data.exposures || [];
                const v2Exp = v2Data.exposures || [];
                exposuresDelta = this.compareExposures(v1Exp, v2Exp);
            }
            // Add if there are any changes
            const hasTransformChanges = transformKeysDelta && (transformKeysDelta.added.length > 0 || transformKeysDelta.modified.length > 0 || transformKeysDelta.removed.length > 0);
            const hasExposureChanges = exposuresDelta && (exposuresDelta.added.length > 0 || exposuresDelta.modified.length > 0 || exposuresDelta.removed.length > 0);
            if (hasTransformChanges || hasExposureChanges) {
                manifest.nodeDataChanges.push({
                    nodeId,
                    transformKeys: hasTransformChanges ? transformKeysDelta : undefined,
                    exposures: hasExposureChanges ? exposuresDelta : undefined
                });
            }
        }
        // Check removed node data
        for (const [nodeId, v1Data] of v1DataMap.entries()) {
            if (!v2DataMap.has(nodeId)) {
                manifest.nodeDataChanges.push({
                    nodeId,
                    transformKeys: v1Data.transformKeys ? { added: [], modified: [], removed: v1Data.transformKeys } : undefined,
                    exposures: v1Data.exposures ? { added: [], modified: [], removed: v1Data.exposures } : undefined
                });
            }
        }
        return manifest;
    }
    compareTransformKeys(v1, v2) {
        const added = [];
        const modified = [];
        const removed = [];
        const v1Map = new Map(v1.map(k => [k.frame, k]));
        const v2Map = new Map(v2.map(k => [k.frame, k]));
        for (const [frame, key2] of v2Map.entries()) {
            const key1 = v1Map.get(frame);
            if (!key1) {
                added.push(key2);
            }
            else if (!this.keysEqual(key1, key2)) {
                modified.push({ original: key1, updated: key2 });
            }
        }
        for (const [frame, key1] of v1Map.entries()) {
            if (!v2Map.has(frame)) {
                removed.push(key1);
            }
        }
        return { added, modified, removed };
    }
    compareExposures(v1, v2) {
        const added = [];
        const modified = [];
        const removed = [];
        const v1Map = new Map(v1.map(e => [e.frame, e]));
        const v2Map = new Map(v2.map(e => [e.frame, e]));
        for (const [frame, exp2] of v2Map.entries()) {
            const exp1 = v1Map.get(frame);
            if (!exp1) {
                added.push(exp2);
            }
            else if (exp1.drawing !== exp2.drawing) {
                modified.push({ original: exp1, updated: exp2 });
            }
        }
        for (const [frame, exp1] of v1Map.entries()) {
            if (!v2Map.has(frame)) {
                removed.push(exp1);
            }
        }
        return { added, modified, removed };
    }
    keysEqual(k1, k2) {
        return (Math.abs(k1.x - k2.x) < this.epsilon &&
            Math.abs(k1.y - k2.y) < this.epsilon &&
            Math.abs(k1.rotation - k2.rotation) < this.epsilon &&
            Math.abs(k1.scaleX - k2.scaleX) < this.epsilon &&
            Math.abs(k1.scaleY - k2.scaleY) < this.epsilon &&
            k1.interpolation === k2.interpolation);
    }
}
