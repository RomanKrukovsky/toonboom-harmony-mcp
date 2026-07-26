import { SceneDiffEngine } from '../src/services/sceneDiffEngine/index.js';
import { SceneSnapshotPIR } from '../src/schemas/sceneSnapshotPir.js';

describe('Phase 7: Scene Diff Engine', () => {
    let engine: SceneDiffEngine;

    beforeEach(() => {
        engine = new SceneDiffEngine();
    });

    it('should detect added and removed nodes', () => {
        const v1: SceneSnapshotPIR = {
            format: 'SceneSnapshotPIR',
            version: '1.0.0',
            sceneId: 'test_scene',
            timestamp: new Date().toISOString(),
            nodes: [{ id: 'node_a', type: 'READ', name: 'A' }],
            connections: [],
            nodeData: []
        };

        const v2: SceneSnapshotPIR = {
            format: 'SceneSnapshotPIR',
            version: '1.0.0',
            sceneId: 'test_scene',
            timestamp: new Date().toISOString(),
            nodes: [{ id: 'node_b', type: 'READ', name: 'B' }],
            connections: [],
            nodeData: []
        };

        const manifest = engine.compare(v1, v2);

        expect(manifest.nodes.added).toContain('node_b');
        expect(manifest.nodes.removed).toContain('node_a');
    });

    it('should detect modified transforms handling epsilon', () => {
        const v1: SceneSnapshotPIR = {
            format: 'SceneSnapshotPIR',
            version: '1.0.0',
            sceneId: 'test_scene',
            timestamp: new Date().toISOString(),
            nodes: [{ id: 'node_a', type: 'READ', name: 'A' }],
            connections: [],
            nodeData: [{
                nodeId: 'node_a',
                transformKeys: [
                    { frame: 1, x: 0, y: 0, rotation: 10.5, scaleX: 1, scaleY: 1, interpolation: 'LINEAR' }
                ]
            }]
        };

        const v2: SceneSnapshotPIR = {
            format: 'SceneSnapshotPIR',
            version: '1.0.0',
            sceneId: 'test_scene',
            timestamp: new Date().toISOString(),
            nodes: [{ id: 'node_a', type: 'READ', name: 'A' }],
            connections: [],
            nodeData: [{
                nodeId: 'node_a',
                transformKeys: [
                    // Same visually, epsilon difference
                    { frame: 1, x: 0, y: 0, rotation: 10.500001, scaleX: 1, scaleY: 1, interpolation: 'LINEAR' },
                    // New key
                    { frame: 2, x: 5, y: 0, rotation: 12.0, scaleX: 1, scaleY: 1, interpolation: 'LINEAR' }
                ]
            }]
        };

        const manifest = engine.compare(v1, v2);
        
        expect(manifest.nodeDataChanges).toHaveLength(1);
        const dataChange = manifest.nodeDataChanges[0];
        
        expect(dataChange.nodeId).toBe('node_a');
        expect(dataChange.transformKeys?.modified).toHaveLength(0); // Epsilon check passes
        expect(dataChange.transformKeys?.added).toHaveLength(1); // Frame 2 is new
        expect(dataChange.transformKeys?.added[0].frame).toBe(2);
    });

    it('should detect exposure changes', () => {
        const v1: SceneSnapshotPIR = {
            format: 'SceneSnapshotPIR',
            version: '1.0.0',
            sceneId: 'test_scene',
            timestamp: new Date().toISOString(),
            nodes: [{ id: 'node_a', type: 'READ', name: 'A' }],
            connections: [],
            nodeData: [{
                nodeId: 'node_a',
                exposures: [
                    { frame: 1, drawing: 'A' }
                ]
            }]
        };

        const v2: SceneSnapshotPIR = {
            format: 'SceneSnapshotPIR',
            version: '1.0.0',
            sceneId: 'test_scene',
            timestamp: new Date().toISOString(),
            nodes: [{ id: 'node_a', type: 'READ', name: 'A' }],
            connections: [],
            nodeData: [{
                nodeId: 'node_a',
                exposures: [
                    { frame: 1, drawing: 'B' }, // Modified
                    { frame: 2, drawing: 'B' }  // Added
                ]
            }]
        };

        const manifest = engine.compare(v1, v2);

        expect(manifest.nodeDataChanges).toHaveLength(1);
        const dataChange = manifest.nodeDataChanges[0];

        expect(dataChange.exposures?.added).toHaveLength(1);
        expect(dataChange.exposures?.modified).toHaveLength(1);
        expect(dataChange.exposures?.removed).toHaveLength(0);

        expect(dataChange.exposures?.modified[0].updated.drawing).toBe('B');
    });
});
