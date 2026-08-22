/**
 * Rig360Synthesizer — produces a full rig plan from a character spec.
 *
 * Per ACTOR §7: cannot build a real 360 rig without drawn layered
 * assets. Always produces:
 *  - rig360_spec.json (full plan)
 *  - placeholder rig structure
 *  - test turn animation
 *  - marked missing assets
 *
 * Never falsely claims "full rig generated". The status field is
 * `partial_success` with `realRigCreated=false, placeholderRigCreated=true`.
 */
export class Rig360Synthesizer {
    generateSpec(character) {
        const requiredAssets = this.buildRequiredAssets(character);
        const stillMissing = requiredAssets.filter(a => a.status === 'missing');
        const missingAssets = this.humanizeMissingAssets(stillMissing);
        const missingAssetKeys = stillMissing.map(asset => `${asset.view}_${asset.layer}`).sort();
        const masterControllers = this.buildMasterControllers(character);
        const deformers = this.buildDeformers(character);
        const faceControls = this.buildFaceControls(character);
        const bodyTurn = this.buildBodyTurn(character);
        return {
            characterName: character.name,
            requiredAssets,
            masterControllers,
            deformers,
            faceControls,
            bodyTurn,
            placeholderRigCreated: true,
            realRigCreated: false,
            missingAssets,
            missingAssetKeys,
            providedAssets: [],
            nextBestAction: missingAssets.length > 0
                ? 'Generate or provide layered turnaround assets (front head drawing, side head drawing, mouth chart, hand poses)'
                : 'Assets available — build full rig in Harmony',
            origin: 'placeholder'
        };
    }
    generateTurnaroundPlan(character) {
        return {
            views: [...character.requiredViews],
            layerPlan: character.layerPlan,
            notes: 'Turnaround requires 8 views with consistent layer topology. All layers must align across views.'
        };
    }
    generateLayeredAssetPlan(character) {
        const layers = [];
        for (const layer of character.layerPlan.head) {
            layers.push({ group: 'head', layer, views: [...character.requiredViews] });
        }
        for (const layer of character.layerPlan.body) {
            layers.push({ group: 'body', layer, views: [...character.requiredViews] });
        }
        return { layers };
    }
    generateMasterControllerPlan(character) {
        return this.buildMasterControllers(character);
    }
    generateDeformerPlan(character) {
        return this.buildDeformers(character);
    }
    generateFaceControlPlan(character) {
        return this.buildFaceControls(character);
    }
    generateBodyTurnPlan(character) {
        return this.buildBodyTurn(character);
    }
    buildPlaceholderRig(character) {
        return {
            templatePath: `placeholder_rig_${character.name.replace(/\s+/g, '_').toLowerCase()}.xstage`,
            nodeCount: this.buildMasterControllers(character).length + this.buildDeformers(character).length + this.buildFaceControls(character).length,
            missingAssets: this.generateSpec(character).missingAssets
        };
    }
    validateFullRig(spec) {
        const issues = [];
        if (!spec.realRigCreated && spec.placeholderRigCreated) {
            issues.push('Rig is placeholder-only — real drawn assets required');
        }
        if (spec.missingAssets.length > 0) {
            issues.push(`Missing ${spec.missingAssets.length} assets: ${spec.missingAssets.slice(0, 5).join(', ')}...`);
        }
        if (spec.masterControllers.length === 0) {
            issues.push('No master controllers defined');
        }
        if (spec.bodyTurn.length === 0) {
            issues.push('No body turn plan defined');
        }
        return { valid: issues.length === 0, issues };
    }
    generateTestTurnAnimation(spec) {
        const frames = [];
        const angles = [];
        for (let i = 0; i <= 24; i += 2) {
            frames.push(i);
            angles.push((i / 24) * 360);
        }
        return { frames, angles, type: '360_turn_test' };
    }
    /**
     * Attempt to build a real 360 rig from supplied asset paths.
     * If assets are missing, falls back to placeholder with an honest report.
     */
    buildFromAssets(character, assetPaths) {
        const requiredAssets = this.buildRequiredAssets(character);
        const missing = [];
        const providedAssets = [];
        for (const asset of requiredAssets) {
            const key = `${asset.view}_${asset.layer}`;
            if (assetPaths[key]) {
                asset.status = 'provided';
                providedAssets.push(key);
            }
            else {
                asset.status = 'missing';
                missing.push(asset);
            }
        }
        const missingAssets = this.humanizeMissingAssets(missing);
        // The exact keys buildFromAssets() looks up, so the caller can satisfy them.
        const missingAssetKeys = missing.map(asset => `${asset.view}_${asset.layer}`).sort();
        const realRigCreated = missingAssetKeys.length === 0;
        return {
            characterName: character.name,
            requiredAssets,
            masterControllers: this.buildMasterControllers(character),
            deformers: this.buildDeformers(character),
            faceControls: this.buildFaceControls(character),
            bodyTurn: this.buildBodyTurn(character),
            placeholderRigCreated: !realRigCreated,
            realRigCreated,
            missingAssets,
            missingAssetKeys,
            providedAssets,
            nextBestAction: realRigCreated
                ? 'All required assets provided — import into Harmony and build the full 360 rig'
                : `Provide ${missingAssetKeys.length} assets. Supply them via assetPaths keyed by `
                    + `missingAssetKeys (e.g. "${missingAssetKeys[0] ?? 'front_skull'}"), not by the prose names.`,
            origin: realRigCreated ? 'assembled' : 'placeholder'
        };
    }
    humanizeMissingAssets(assets) {
        const groups = new Set();
        for (const a of assets) {
            if (a.layer.startsWith('mouth_')) {
                groups.add(`${a.view} mouth chart`);
            }
            else if (a.layer.startsWith('expr_')) {
                groups.add(`${a.view} expression sheet`);
            }
            else if (a.layer.startsWith('hand_')) {
                groups.add(`${a.view} hand poses`);
            }
            else {
                groups.add(`${a.view} ${a.layer} drawing`);
            }
        }
        return Array.from(groups).sort();
    }
    buildRequiredAssets(character) {
        const assets = [];
        // Layered body/head geometry is needed for every turnaround view.
        for (const view of character.requiredViews) {
            for (const layer of [...character.layerPlan.head, ...character.layerPlan.body]) {
                assets.push({ view, layer, status: 'missing' });
            }
        }
        // Mouth shapes, expressions and hand poses are only required for the
        // canonical front view in the placeholder plan. Derived views can reuse
        // or adapt them, which keeps the asset brief honest and manageable.
        const canonicalView = character.requiredViews.includes('front')
            ? 'front'
            : character.requiredViews[0] || 'front';
        for (const mouth of character.requiredMouthShapes || []) {
            assets.push({ view: canonicalView, layer: `mouth_${mouth}`, status: 'missing' });
        }
        for (const expr of character.requiredExpressions || []) {
            assets.push({ view: canonicalView, layer: `expr_${expr}`, status: 'missing' });
        }
        for (const hand of character.requiredHandPoses || []) {
            assets.push({ view: canonicalView, layer: `hand_${hand}`, status: 'missing' });
        }
        return assets;
    }
    buildMasterControllers(character) {
        return [
            {
                name: 'MC_Body_Turn',
                controls: [
                    { node: 'body', attributeName: 'rotation.angle', min: 0, max: 360, defaultValue: 0 },
                    { node: 'body', attributeName: 'offset.x', min: -100, max: 100, defaultValue: 0 }
                ]
            },
            {
                name: 'MC_Head_Turn',
                controls: [
                    { node: 'head', attributeName: 'rotation.angle', min: 0, max: 360, defaultValue: 0 },
                    { node: 'head', attributeName: 'offset.x', min: -50, max: 50, defaultValue: 0 }
                ]
            },
            {
                name: 'MC_Eyes',
                controls: [
                    { node: 'left_eye', attributeName: 'offset.x', min: -10, max: 10, defaultValue: 0 },
                    { node: 'right_eye', attributeName: 'offset.x', min: -10, max: 10, defaultValue: 0 },
                    { node: 'left_eye', attributeName: 'scale', min: 0.5, max: 1.5, defaultValue: 1 },
                    { node: 'right_eye', attributeName: 'scale', min: 0.5, max: 1.5, defaultValue: 1 }
                ]
            }
        ];
    }
    buildDeformers(character) {
        return [
            { targetLayer: 'body', deformerType: 'curve', axis: 'y' },
            { targetLayer: 'left_arm', deformerType: 'curve', axis: 'free' },
            { targetLayer: 'right_arm', deformerType: 'curve', axis: 'free' },
            { targetLayer: 'head', deformerType: 'envelope', axis: 'free' },
            { targetLayer: 'hair', deformerType: 'perspective', axis: 'free' }
        ];
    }
    buildFaceControls(character) {
        return [
            {
                groupName: 'mouth',
                controllers: [
                    {
                        name: 'MC_Mouth_Open',
                        controls: [{ node: 'mouth', attributeName: 'offset.y', min: 0, max: 20, defaultValue: 0 }]
                    },
                    {
                        name: 'MC_Mouth_Shape',
                        controls: [{ node: 'mouth', attributeName: 'phoneme', min: 0, max: 9, defaultValue: 0 }]
                    }
                ]
            },
            {
                groupName: 'eyes',
                controllers: [
                    {
                        name: 'MC_Blink',
                        controls: [{ node: 'left_eye', attributeName: 'scaleY', min: 0, max: 1, defaultValue: 1 }]
                    }
                ]
            },
            {
                groupName: 'brows',
                controllers: [
                    {
                        name: 'MC_Brow_Raise',
                        controls: [{ node: 'left_brow', attributeName: 'offset.y', min: 0, max: 15, defaultValue: 0 }]
                    }
                ]
            }
        ];
    }
    buildBodyTurn(character) {
        return [
            {
                axis: 'y',
                keyFrames: [
                    { frame: 0, angle: 0, description: 'front' },
                    { frame: 6, angle: 45, description: 'front_3q_left' },
                    { frame: 12, angle: 90, description: 'side_left' },
                    { frame: 18, angle: 135, description: 'back_3q_left' },
                    { frame: 24, angle: 180, description: 'back' },
                    { frame: 30, angle: 225, description: 'back_3q_right' },
                    { frame: 36, angle: 270, description: 'side_right' },
                    { frame: 42, angle: 315, description: 'front_3q_right' },
                    { frame: 48, angle: 360, description: 'front (loop)' }
                ],
                interpolation: 'bezier'
            }
        ];
    }
}
