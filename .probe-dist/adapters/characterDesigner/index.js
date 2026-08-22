import { DEFAULT_360_VIEWS, DEFAULT_MOUTH_SHAPES } from '../../schemas/characterSpec.js';
/**
 * CharacterDesigner — produces a full CharacterSpec per character.
 *
 * Image backend presence is checked honestly: if no backend →
 * assetBackend=missing and full design prompts are generated as the
 * asset brief for external generation (ACTOR §6/§14).
 */
export class CharacterDesigner {
    generateSpecs(candidates, bible) {
        return candidates.map(c => {
            const recurring = bible.recurringCharacters?.find((r) => r.name === c.name);
            return this.buildSpec(c, recurring);
        });
    }
    buildSpec(c, recurring) {
        const visualStyle = recurring?.visualStyle || 'premium 2D animated, expressive';
        const personality = recurring?.personality || c.oneLine || '';
        const bodyType = this.guessBodyType(c.role);
        const designPrompts = {
            turnaround: `Full 3/4, side, back turnaround turnaround of ${c.name}. ${visualStyle}. ${personality}. 8 views: ${DEFAULT_360_VIEWS.join(', ')}.`,
            expressionSheet: `Expression sheet for ${c.name}: neutral, happy, angry, fear, surprised, smirk, panic, thinking. ${visualStyle}.`,
            mouthChart: `Mouth chart (phonemes) for ${c.name}: ${DEFAULT_MOUTH_SHAPES.join(', ')}. Lipsync ready. ${visualStyle}.`,
            handPoses: `Hand poses for ${c.name}: open, fist, point, hold_object, gesture_up, gesture_down. ${visualStyle}.`,
            fullBodyPose: `Full body neutral pose, ${c.name}, ${bodyType}. ${visualStyle}. Rest pose for rigging.`
        };
        return {
            name: c.name,
            role: c.role,
            personality,
            visualStyle,
            bodyType,
            requiredViews: [...DEFAULT_360_VIEWS],
            requiredExpressions: ['neutral', 'happy', 'angry', 'fear', 'surprised', 'smirk', 'panic', 'thinking'],
            requiredMouthShapes: [...DEFAULT_MOUTH_SHAPES],
            requiredHandPoses: ['open', 'fist', 'point', 'hold_object', 'gesture_up', 'gesture_down'],
            layerPlan: {
                head: ['skull', 'eyes', 'brows', 'nose', 'mouth', 'ears', 'hair'],
                body: ['torso', 'neck', 'left_arm', 'right_arm', 'left_hand', 'right_hand', 'legs']
            },
            designPrompts,
            origin: 'planned',
            assetBackend: 'missing'
        };
    }
    buildSpecFromArgs(args) {
        return this.buildSpec({ name: args.name, role: args.role, oneLine: args.personality }, {
            name: args.name,
            role: args.role,
            personality: args.personality,
            visualStyle: args.visualStyle || 'premium 2D animated, expressive',
            appearsInEpisodes: []
        });
    }
    generateTurnaroundPlan(characterSpec) {
        return {
            views: [...characterSpec.requiredViews],
            layerPlan: characterSpec.layerPlan,
            notes: 'Turnaround requires 8 views with consistent layer topology. All layers must align across views.'
        };
    }
    generateLayeredAssetPlan(characterSpec) {
        const layers = [];
        for (const layer of characterSpec.layerPlan.head) {
            layers.push({ group: 'head', layer, views: [...characterSpec.requiredViews] });
        }
        for (const layer of characterSpec.layerPlan.body) {
            layers.push({ group: 'body', layer, views: [...characterSpec.requiredViews] });
        }
        return { layers };
    }
    guessBodyType(role) {
        const r = role.toLowerCase();
        if (/робот|robot|unit/.test(r))
            return 'angular, metal, segmented';
        if (/профессор|professor|настав/.test(r))
            return 'thin, angular, energetic';
        if (/студент|student|assistant/.test(r))
            return 'compact, tense, expressive shoulders';
        return 'balanced, proportional';
    }
}
