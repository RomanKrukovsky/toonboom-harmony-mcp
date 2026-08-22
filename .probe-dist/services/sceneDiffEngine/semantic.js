/**
 * Semantic Scene Diff Engine.
 *
 * Compares two *normalized* HarmonySceneState objects — never raw `.xstage` text — and
 * produces a deterministic HarmonyScenePatch made of atomic, meaningful operations.
 *
 * Honesty rules baked into this engine:
 *  - It reports what changed numerically. It never claims why, and never claims an artistic
 *    goal. Intent lives only in the human instruction.
 *  - Diff-derived operations are `harmony_manual`. They are upgraded to `mcp_tool` only when
 *    an MCP call explicitly claimed that exact target/property/frame.
 *  - Merged readings (a keyframe move, an exposure shift) are `inferred` with a confidence
 *    below 1 and always keep the underlying before/after evidence.
 *
 * This file sits beside the existing snapshot-level `SceneDiffEngine` and does not replace it.
 */
import { HARMONY_ACTION_SCHEMA_VERSION, canonicalSort, computeOperationId, computePatchHash, harmonyScenePatchSchema } from '../../schemas/harmonyActionDataset.js';
import { HarmonyError } from '../../security.js';
const DEFAULT_EPSILON = 1e-5;
const MAX_EXPOSURE_SHIFT = 240;
function op(draft) {
    return { ...draft, opId: computeOperationId(draft) };
}
function connectionKey(c) {
    return `${c.fromNode}|${c.fromPort}|${c.toNode}|${c.toPort}`;
}
function nearlyEqual(a, b, epsilon) {
    return Math.abs(a - b) < epsilon;
}
function valuesEqual(a, b, epsilon) {
    if (typeof a === 'number' && typeof b === 'number')
        return nearlyEqual(a, b, epsilon);
    return a === b;
}
const TRANSFORM_HEADS = ['OFFSET', 'POSITION', 'ROTATION', 'SCALE', 'SKEW', 'PIVOT', 'ANGLE'];
const PEG_NODE_TYPES = new Set(['PEG', 'PEGNODE', 'TRANSFORMATION', 'TRANSFORMATION-SWITCH', 'TRANSFORM']);
function isTransformAttribute(attribute) {
    const head = (attribute.split('.')[0] ?? '').toUpperCase();
    return TRANSFORM_HEADS.some(prefix => head.startsWith(prefix));
}
export class SemanticSceneDiffEngine {
    /**
     * Diff two scene states. Identical states yield a patch with zero operations.
     *
     * @throws when the two states describe different scenes — diffing across scenes would
     *         produce a meaningless "everything changed" patch.
     */
    diff(before, after, options = {}) {
        if (before.scenePathHash !== after.scenePathHash) {
            throw new HarmonyError('INVALID_INPUT', 'Refusing to diff two different scenes: scenePathHash differs between before and after.', { before: before.scenePathHash, after: after.scenePathHash });
        }
        const epsilon = options.epsilon ?? DEFAULT_EPSILON;
        const warnings = [];
        const operations = [];
        operations.push(...this.diffNodes(before.nodes, after.nodes));
        operations.push(...this.diffConnections(before.connections, after.connections));
        operations.push(...this.diffAttributes(before, after, epsilon));
        operations.push(...this.diffKeyframes(before.keyframes, after.keyframes, epsilon, options.detectKeyframeMoves !== false));
        operations.push(...this.diffExposures(before.exposures, after.exposures, options.detectExposureShifts !== false));
        operations.push(...this.diffCamera(before, after, epsilon));
        operations.push(...this.diffSceneSettings(before, after));
        const attributed = this.applyMcpClaims(operations, options.mcpClaims ?? []);
        const ordered = canonicalSort.operations(attributed);
        if (before.captureMode !== 'full' || after.captureMode !== 'full') {
            warnings.push(`patch computed from non-full capture (before=${before.captureMode}, after=${after.captureMode}); absent entities are not proof of deletion`);
        }
        for (const category of after.notCaptured) {
            warnings.push(`category not captured in v1, changes there are invisible to this patch: ${category}`);
        }
        const summary = this.summarize(ordered);
        const fullyReversible = ordered.every(o => o.reversible);
        const requiresHumanReview = !fullyReversible ||
            ordered.some(o => o.type === 'unknown_structural_change') ||
            before.errors.length > 0 ||
            after.errors.length > 0;
        const base = {
            schemaVersion: HARMONY_ACTION_SCHEMA_VERSION,
            kind: 'HarmonyScenePatch',
            sessionId: after.sessionId,
            sceneId: after.sceneId,
            scenePathHash: after.scenePathHash,
            harmonyVersion: after.harmonyVersion,
            platform: after.platform,
            generatedAt: options.generatedAt ?? new Date().toISOString(),
            beforeStateHash: before.deterministicHash,
            afterStateHash: after.deterministicHash,
            operations: ordered,
            summary,
            fullyReversible,
            notCaptured: after.notCaptured,
            warnings,
            errors: [...before.errors, ...after.errors],
            requiresHumanReview
        };
        const patch = { ...base, deterministicHash: computePatchHash(base) };
        const parsed = harmonyScenePatchSchema.safeParse(patch);
        if (!parsed.success) {
            throw new HarmonyError('INVALID_INPUT', `Generated scene patch failed schema validation: ${parsed.error.message}`);
        }
        return parsed.data;
    }
    /**
     * Build the inverse of a patch as data. Operations that cannot be inverted without
     * guessing are dropped and reported; the result then requires human review.
     */
    invert(patch, generatedAt) {
        const inverse = [];
        const warnings = [...patch.warnings];
        for (const operation of patch.operations) {
            const inverted = this.invertOperation(operation);
            if (inverted) {
                inverse.push(inverted);
            }
            else {
                warnings.push(`operation ${operation.type} (${operation.opId}) is not invertible without assumptions`);
            }
        }
        const ordered = canonicalSort.operations(inverse);
        const base = {
            ...patch,
            generatedAt: generatedAt ?? new Date().toISOString(),
            beforeStateHash: patch.afterStateHash,
            afterStateHash: patch.beforeStateHash,
            operations: ordered,
            summary: this.summarize(ordered),
            fullyReversible: ordered.length === patch.operations.length,
            warnings,
            requiresHumanReview: patch.requiresHumanReview || ordered.length !== patch.operations.length
        };
        const { deterministicHash: _ignored, ...withoutHash } = base;
        return { ...withoutHash, deterministicHash: computePatchHash(withoutHash) };
    }
    // -------------------------------------------------------------------------
    // Node graph
    // -------------------------------------------------------------------------
    diffNodes(before, after) {
        const beforeMap = new Map(before.map(n => [n.path, n]));
        const afterMap = new Map(after.map(n => [n.path, n]));
        const ops = [];
        for (const [path, node] of afterMap) {
            if (!beforeMap.has(path)) {
                ops.push(op({
                    type: 'add_node',
                    origin: 'harmony_manual',
                    target: { kind: 'node', nodePath: path },
                    before: null,
                    after: { type: node.type, name: node.name, parentPath: node.parentPath },
                    confidence: 1,
                    evidenceRefs: [`state:nodes[${path}]`],
                    reversible: true
                }));
            }
        }
        for (const [path, node] of beforeMap) {
            if (!afterMap.has(path)) {
                ops.push(op({
                    type: 'remove_node',
                    origin: 'harmony_manual',
                    target: { kind: 'node', nodePath: path },
                    before: { type: node.type, name: node.name, parentPath: node.parentPath },
                    after: null,
                    confidence: 1,
                    evidenceRefs: [`state:nodes[${path}]`],
                    reversible: true
                }));
            }
        }
        // Node View coordinates and enabled flags are plain node properties.
        for (const [path, afterNode] of afterMap) {
            const beforeNode = beforeMap.get(path);
            if (!beforeNode)
                continue;
            for (const property of ['positionX', 'positionY', 'enabled']) {
                if (beforeNode[property] !== afterNode[property]) {
                    ops.push(op({
                        type: 'change_node_attribute',
                        origin: 'harmony_manual',
                        target: { kind: 'node', nodePath: path },
                        property,
                        before: beforeNode[property],
                        after: afterNode[property],
                        confidence: 1,
                        evidenceRefs: [`state:nodes[${path}].${property}`],
                        reversible: true
                    }));
                }
            }
        }
        return ops;
    }
    diffConnections(before, after) {
        const beforeMap = new Map(before.map(c => [connectionKey(c), c]));
        const afterMap = new Map(after.map(c => [connectionKey(c), c]));
        const ops = [];
        for (const [key, connection] of afterMap) {
            if (!beforeMap.has(key)) {
                ops.push(op({
                    type: 'connect_nodes',
                    origin: 'harmony_manual',
                    target: { kind: 'connection', connection },
                    before: null,
                    after: connection,
                    confidence: 1,
                    evidenceRefs: [`state:connections[${key}]`],
                    reversible: true
                }));
            }
        }
        for (const [key, connection] of beforeMap) {
            if (!afterMap.has(key)) {
                ops.push(op({
                    type: 'disconnect_nodes',
                    origin: 'harmony_manual',
                    target: { kind: 'connection', connection },
                    before: connection,
                    after: null,
                    confidence: 1,
                    evidenceRefs: [`state:connections[${key}]`],
                    reversible: true
                }));
            }
        }
        return ops;
    }
    // -------------------------------------------------------------------------
    // Attributes
    // -------------------------------------------------------------------------
    diffAttributes(before, after, epsilon) {
        const cameraPaths = new Set(after.nodes.filter(n => n.type.toUpperCase() === 'CAMERA').map(n => n.path));
        const nodeTypes = new Map(after.nodes.map(n => [n.path, n.type.toUpperCase()]));
        for (const node of before.nodes) {
            if (!nodeTypes.has(node.path))
                nodeTypes.set(node.path, node.type.toUpperCase());
        }
        const key = (a) => `${a.nodePath}|${a.attribute}`;
        const beforeMap = new Map(before.nodeAttributes.map(a => [key(a), a]));
        const afterMap = new Map(after.nodeAttributes.map(a => [key(a), a]));
        const removedNodes = new Set(before.nodes.filter(n => !after.nodes.some(m => m.path === n.path)).map(n => n.path));
        const addedNodes = new Set(after.nodes.filter(n => !before.nodes.some(m => m.path === n.path)).map(n => n.path));
        const ops = [];
        const classify = (nodePath, attribute) => {
            if (cameraPaths.has(nodePath))
                return 'change_camera_property';
            const type = nodeTypes.get(nodePath) ?? '';
            if (PEG_NODE_TYPES.has(type) && isTransformAttribute(attribute))
                return 'change_peg_transform';
            return 'change_node_attribute';
        };
        for (const [k, afterAttr] of afterMap) {
            const beforeAttr = beforeMap.get(k);
            // An attribute that appears only because its node was just added is already covered
            // by add_node; reporting it again would double-count the same change.
            if (!beforeAttr && addedNodes.has(afterAttr.nodePath))
                continue;
            if (!beforeAttr || !valuesEqual(beforeAttr.value, afterAttr.value, epsilon)) {
                ops.push(op({
                    type: classify(afterAttr.nodePath, afterAttr.attribute),
                    origin: 'harmony_manual',
                    target: { kind: 'node', nodePath: afterAttr.nodePath },
                    property: afterAttr.attribute,
                    before: beforeAttr ? beforeAttr.value : null,
                    after: afterAttr.value,
                    confidence: 1,
                    evidenceRefs: [`state:nodeAttributes[${k}]`],
                    reversible: true
                }));
                continue;
            }
            if (beforeAttr.animated !== afterAttr.animated || beforeAttr.columnName !== afterAttr.columnName) {
                ops.push(op({
                    type: 'change_node_attribute',
                    origin: 'harmony_manual',
                    target: { kind: 'node', nodePath: afterAttr.nodePath },
                    property: `${afterAttr.attribute}#binding`,
                    before: { animated: beforeAttr.animated, columnName: beforeAttr.columnName ?? null },
                    after: { animated: afterAttr.animated, columnName: afterAttr.columnName ?? null },
                    confidence: 1,
                    evidenceRefs: [`state:nodeAttributes[${k}].binding`],
                    reversible: true
                }));
            }
        }
        for (const [k, beforeAttr] of beforeMap) {
            if (afterMap.has(k))
                continue;
            if (removedNodes.has(beforeAttr.nodePath))
                continue;
            ops.push(op({
                type: classify(beforeAttr.nodePath, beforeAttr.attribute),
                origin: 'harmony_manual',
                target: { kind: 'node', nodePath: beforeAttr.nodePath },
                property: beforeAttr.attribute,
                before: beforeAttr.value,
                after: null,
                confidence: 1,
                evidenceRefs: [`state:nodeAttributes[${k}]`],
                reversible: true
            }));
        }
        return ops;
    }
    // -------------------------------------------------------------------------
    // Keyframes and curves
    // -------------------------------------------------------------------------
    diffKeyframes(before, after, epsilon, detectMoves) {
        const columns = new Set([...before.map(k => k.columnName), ...after.map(k => k.columnName)]);
        const ops = [];
        for (const columnName of [...columns].sort()) {
            const beforeKeys = new Map(before.filter(k => k.columnName === columnName).map(k => [k.frame, k]));
            const afterKeys = new Map(after.filter(k => k.columnName === columnName).map(k => [k.frame, k]));
            const added = [];
            const removed = [];
            for (const [frame, afterKey] of afterKeys) {
                const beforeKey = beforeKeys.get(frame);
                if (!beforeKey) {
                    added.push(afterKey);
                    continue;
                }
                if (!nearlyEqual(beforeKey.value, afterKey.value, epsilon)) {
                    ops.push(op({
                        type: 'change_keyframe_value',
                        origin: 'harmony_manual',
                        target: { kind: 'column', columnName },
                        property: 'value',
                        frame,
                        before: beforeKey.value,
                        after: afterKey.value,
                        confidence: 1,
                        evidenceRefs: [`state:keyframes[${columnName}@${frame}].value`],
                        reversible: true
                    }));
                }
                if (beforeKey.interpolation !== afterKey.interpolation ||
                    beforeKey.easeIn !== afterKey.easeIn ||
                    beforeKey.easeOut !== afterKey.easeOut ||
                    beforeKey.constSeg !== afterKey.constSeg) {
                    ops.push(op({
                        type: 'change_curve_segment',
                        origin: 'harmony_manual',
                        target: { kind: 'column', columnName },
                        property: 'interpolation',
                        frame,
                        before: {
                            interpolation: beforeKey.interpolation,
                            easeIn: beforeKey.easeIn ?? null,
                            easeOut: beforeKey.easeOut ?? null,
                            constSeg: beforeKey.constSeg ?? null
                        },
                        after: {
                            interpolation: afterKey.interpolation,
                            easeIn: afterKey.easeIn ?? null,
                            easeOut: afterKey.easeOut ?? null,
                            constSeg: afterKey.constSeg ?? null
                        },
                        confidence: 1,
                        evidenceRefs: [`state:keyframes[${columnName}@${frame}].interpolation`],
                        reversible: true
                    }));
                }
            }
            for (const [frame, beforeKey] of beforeKeys) {
                if (!afterKeys.has(frame))
                    removed.push(beforeKey);
            }
            ops.push(...this.reconcileKeyframeAddRemove(columnName, added, removed, epsilon, detectMoves));
        }
        return ops;
    }
    /**
     * A keyframe that disappears at one frame and reappears at another with the same value is
     * most plausibly a move. That reading is only applied when the value is unambiguous —
     * exactly one removed and one added keyframe share it — and it is always marked `inferred`.
     */
    reconcileKeyframeAddRemove(columnName, added, removed, epsilon, detectMoves) {
        const ops = [];
        const consumedAdded = new Set();
        const consumedRemoved = new Set();
        if (detectMoves) {
            for (const removedKey of removed) {
                const matchesInRemoved = removed.filter(k => nearlyEqual(k.value, removedKey.value, epsilon));
                const matchesInAdded = added.filter(k => nearlyEqual(k.value, removedKey.value, epsilon));
                if (matchesInRemoved.length !== 1 || matchesInAdded.length !== 1)
                    continue;
                const addedKey = matchesInAdded[0];
                if (consumedAdded.has(addedKey.frame) || consumedRemoved.has(removedKey.frame))
                    continue;
                consumedAdded.add(addedKey.frame);
                consumedRemoved.add(removedKey.frame);
                ops.push(op({
                    type: 'move_keyframe',
                    origin: 'inferred',
                    target: { kind: 'column', columnName },
                    property: 'frame',
                    frameRange: [Math.min(removedKey.frame, addedKey.frame), Math.max(removedKey.frame, addedKey.frame)],
                    before: { frame: removedKey.frame, value: removedKey.value },
                    after: { frame: addedKey.frame, value: addedKey.value },
                    confidence: 0.8,
                    evidenceRefs: [
                        `state:keyframes[${columnName}@${removedKey.frame}]`,
                        `state:keyframes[${columnName}@${addedKey.frame}]`
                    ],
                    reversible: true,
                    note: 'Merged from one removed and one added keyframe of equal value; the exact Harmony command is unknown.'
                }));
            }
        }
        for (const key of added) {
            if (consumedAdded.has(key.frame))
                continue;
            ops.push(op({
                type: 'add_keyframe',
                origin: 'harmony_manual',
                target: { kind: 'column', columnName },
                frame: key.frame,
                before: null,
                after: { value: key.value, interpolation: key.interpolation },
                confidence: 1,
                evidenceRefs: [`state:keyframes[${columnName}@${key.frame}]`],
                reversible: true
            }));
        }
        for (const key of removed) {
            if (consumedRemoved.has(key.frame))
                continue;
            ops.push(op({
                type: 'remove_keyframe',
                origin: 'harmony_manual',
                target: { kind: 'column', columnName },
                frame: key.frame,
                before: { value: key.value, interpolation: key.interpolation },
                after: null,
                confidence: 1,
                evidenceRefs: [`state:keyframes[${columnName}@${key.frame}]`],
                reversible: true
            }));
        }
        return ops;
    }
    // -------------------------------------------------------------------------
    // Exposures
    // -------------------------------------------------------------------------
    diffExposures(before, after, detectShifts) {
        const nodePaths = new Set([...before.map(e => e.nodePath), ...after.map(e => e.nodePath)]);
        const ops = [];
        for (const nodePath of [...nodePaths].sort()) {
            const beforeMap = new Map(before.filter(e => e.nodePath === nodePath).map(e => [e.frame, e.drawing]));
            const afterMap = new Map(after.filter(e => e.nodePath === nodePath).map(e => [e.frame, e.drawing]));
            const frames = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].sort((a, b) => a - b);
            const changed = frames.filter(f => (beforeMap.get(f) ?? '') !== (afterMap.get(f) ?? ''));
            if (changed.length === 0)
                continue;
            const shift = detectShifts ? this.detectExposureShift(beforeMap, afterMap, changed) : undefined;
            if (shift) {
                ops.push(op({
                    type: 'shift_exposure',
                    origin: 'inferred',
                    target: { kind: 'node', nodePath },
                    property: 'exposure',
                    frameRange: [changed[0], changed[changed.length - 1]],
                    before: { delta: 0 },
                    after: { delta: shift },
                    confidence: 0.7,
                    evidenceRefs: changed.map(f => `state:exposures[${nodePath}@${f}]`),
                    reversible: true,
                    note: `Every changed frame in the range is reproduced by offsetting the previous exposure by ${shift}; the exact Harmony command is unknown.`
                }));
                continue;
            }
            for (const frame of changed) {
                ops.push(op({
                    type: 'set_drawing_substitution',
                    origin: 'harmony_manual',
                    target: { kind: 'node', nodePath },
                    property: 'drawing',
                    frame,
                    before: beforeMap.get(frame) ?? null,
                    after: afterMap.get(frame) ?? null,
                    confidence: 1,
                    evidenceRefs: [`state:exposures[${nodePath}@${frame}]`],
                    reversible: true
                }));
            }
        }
        return ops;
    }
    /**
     * Returns the constant frame offset that explains every changed frame, or undefined.
     * A single changed frame is never treated as a shift — that is just a substitution.
     */
    detectExposureShift(beforeMap, afterMap, changed) {
        if (changed.length < 2)
            return undefined;
        const first = changed[0];
        const last = changed[changed.length - 1];
        const span = Math.min(MAX_EXPOSURE_SHIFT, Math.max(1, last - first + 1));
        for (let magnitude = 1; magnitude <= span; magnitude++) {
            for (const delta of [magnitude, -magnitude]) {
                let matches = true;
                for (let frame = first; frame <= last; frame++) {
                    const expected = beforeMap.get(frame - delta) ?? '';
                    if ((afterMap.get(frame) ?? '') !== expected) {
                        matches = false;
                        break;
                    }
                }
                if (matches)
                    return delta;
            }
        }
        return undefined;
    }
    // -------------------------------------------------------------------------
    // Camera and scene settings
    // -------------------------------------------------------------------------
    diffCamera(before, after, epsilon) {
        const beforeCamera = before.camera;
        const afterCamera = after.camera;
        if (!beforeCamera && !afterCamera)
            return [];
        const ops = [];
        const nodePath = afterCamera?.nodePath ?? beforeCamera?.nodePath ?? 'unknown-camera';
        if (beforeCamera && afterCamera && beforeCamera.nodePath !== afterCamera.nodePath) {
            ops.push(op({
                type: 'change_camera_property',
                origin: 'harmony_manual',
                target: { kind: 'node', nodePath },
                property: 'activeCamera',
                before: beforeCamera.nodePath,
                after: afterCamera.nodePath,
                confidence: 1,
                evidenceRefs: ['state:camera.nodePath'],
                reversible: true
            }));
        }
        const beforeProps = beforeCamera?.properties ?? {};
        const afterProps = afterCamera?.properties ?? {};
        for (const property of [...new Set([...Object.keys(beforeProps), ...Object.keys(afterProps)])].sort()) {
            const beforeValue = beforeProps[property];
            const afterValue = afterProps[property];
            if (valuesEqual(beforeValue, afterValue, epsilon))
                continue;
            ops.push(op({
                type: 'change_camera_property',
                origin: 'harmony_manual',
                target: { kind: 'node', nodePath },
                property,
                before: beforeValue ?? null,
                after: afterValue ?? null,
                confidence: 1,
                evidenceRefs: [`state:camera.properties.${property}`],
                reversible: true
            }));
        }
        return ops;
    }
    diffSceneSettings(before, after) {
        const ops = [];
        const keys = Object.keys(after.sceneSettings);
        for (const key of keys) {
            const beforeValue = before.sceneSettings[key];
            const afterValue = after.sceneSettings[key];
            if (beforeValue === afterValue)
                continue;
            // The current frame is a viewing position, not an edit; recording it as a structural
            // change would fill every dataset entry with scrubbing noise.
            if (key === 'currentFrame')
                continue;
            ops.push(op({
                type: 'unknown_structural_change',
                origin: 'harmony_manual',
                target: { kind: 'scene' },
                property: `sceneSettings.${key}`,
                before: beforeValue,
                after: afterValue,
                confidence: 1,
                evidenceRefs: [`state:sceneSettings.${key}`],
                reversible: false,
                note: 'Scene-level setting changed; v1 does not model the Harmony command that produced it.'
            }));
        }
        return ops;
    }
    // -------------------------------------------------------------------------
    // Provenance
    // -------------------------------------------------------------------------
    /**
     * Upgrade `harmony_manual` operations to `mcp_tool` only where a tool call claimed exactly
     * that target — and, when the tool stated them, that property and frame. Everything else
     * stays manual, so a reconstructed edit is never presented as an exact known command.
     */
    applyMcpClaims(operations, claims) {
        if (claims.length === 0)
            return operations;
        return operations.map(operation => {
            if (operation.origin !== 'harmony_manual')
                return operation;
            const targetName = operation.target.nodePath ??
                operation.target.columnName ??
                (operation.target.connection ? operation.target.connection.toNode : undefined);
            if (!targetName)
                return operation;
            const claim = claims.find(c => {
                if (!c.targets.includes(targetName))
                    return false;
                if (c.properties && c.properties.length > 0) {
                    if (!operation.property || !c.properties.includes(operation.property))
                        return false;
                }
                if (c.frames && c.frames.length > 0) {
                    if (operation.frame === undefined || !c.frames.includes(operation.frame))
                        return false;
                }
                return true;
            });
            if (!claim)
                return operation;
            return {
                ...operation,
                origin: 'mcp_tool',
                confidence: 1,
                evidenceRefs: [...operation.evidenceRefs, `tool:${claim.correlationId}`],
                note: `Attributed to MCP tool ${claim.toolName}.`
            };
        });
    }
    invertOperation(operation) {
        const base = {
            origin: operation.origin,
            target: operation.target,
            property: operation.property,
            frame: operation.frame,
            frameRange: operation.frameRange,
            confidence: operation.confidence,
            evidenceRefs: operation.evidenceRefs,
            reversible: true,
            note: `Inverse of ${operation.opId}.`
        };
        switch (operation.type) {
            case 'add_node':
                return op({ ...base, type: 'remove_node', before: operation.after, after: null });
            case 'remove_node':
                return op({ ...base, type: 'add_node', before: null, after: operation.before });
            case 'connect_nodes':
                return op({ ...base, type: 'disconnect_nodes', before: operation.after, after: null });
            case 'disconnect_nodes':
                return op({ ...base, type: 'connect_nodes', before: null, after: operation.before });
            case 'add_keyframe':
                return op({ ...base, type: 'remove_keyframe', before: operation.after, after: null });
            case 'remove_keyframe':
                return op({ ...base, type: 'add_keyframe', before: null, after: operation.before });
            case 'shift_exposure': {
                const delta = operation.after?.delta;
                if (typeof delta !== 'number')
                    return undefined;
                return op({ ...base, type: 'shift_exposure', before: { delta: 0 }, after: { delta: -delta } });
            }
            case 'change_node_attribute':
            case 'change_keyframe_value':
            case 'change_curve_segment':
            case 'change_peg_transform':
            case 'set_drawing_substitution':
            case 'change_camera_property':
            case 'move_keyframe':
                return op({ ...base, type: operation.type, before: operation.after, after: operation.before });
            case 'unknown_structural_change':
            default:
                return undefined;
        }
    }
    summarize(operations) {
        const nodesChanged = new Set();
        const columnsChanged = new Set();
        const framesTouched = new Set();
        const operationCounts = {};
        for (const operation of operations) {
            operationCounts[operation.type] = (operationCounts[operation.type] ?? 0) + 1;
            if (operation.target.nodePath)
                nodesChanged.add(operation.target.nodePath);
            if (operation.target.columnName)
                columnsChanged.add(operation.target.columnName);
            if (operation.target.connection) {
                nodesChanged.add(operation.target.connection.fromNode);
                nodesChanged.add(operation.target.connection.toNode);
            }
            if (operation.frame !== undefined)
                framesTouched.add(operation.frame);
            if (operation.frameRange) {
                framesTouched.add(operation.frameRange[0]);
                framesTouched.add(operation.frameRange[1]);
            }
        }
        return {
            nodesChanged: [...nodesChanged].sort(),
            columnsChanged: [...columnsChanged].sort(),
            framesTouched: [...framesTouched].sort((a, b) => a - b),
            operationCounts
        };
    }
}
