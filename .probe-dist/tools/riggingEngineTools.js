import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createStandardExecutionResult } from '../schemas/executionResult.js';
import { RigTemplateRegistry } from '../services/rigTemplateRegistry/index.js';
import { RigBindingResolver } from '../services/rigBindingResolver/index.js';
import { verifyPathAccess } from '../security.js';
import { defineTool } from './defineTool.js';
/**
 * riggingEngineTools — rig template lookup, binding and cut-out planning.
 *
 * These were placeholders whose own comments admitted what was missing:
 *   "In a real implementation, this would instantiate RigTemplateRegistry"
 *   "In a real flow, this would call HarmonyCommandBuilder.buildPlan(...)"
 *
 * Both modules exist and work: `RigTemplateRegistry` loads templates from
 * `templates/rig/builtin`, validates them against a schema and computes an
 * RFC 8785 canonical SHA-256; `RigBindingResolver` matches template slots to PIR
 * landmarks and reports what it could not resolve.
 *
 * Honest split:
 *   * template listing, binding resolution, layer analysis, chart/library
 *     generation and publishing run for real;
 *   * anything that must create nodes or deform drawings inside a live scene
 *     returns a validated command plan marked `requiresRealHarmony`.
 */
/** Registry is initialised lazily and reused: reading templates is I/O. */
let registryPromise = null;
function getRegistry() {
    if (!registryPromise) {
        registryPromise = (async () => {
            const registry = new RigTemplateRegistry();
            await registry.initialize();
            return registry;
        })();
    }
    return registryPromise;
}
const resolver = new RigBindingResolver();
/**
 * Preston Blair mouth chart — the same nine shapes VisemeMapper looks up.
 * Keeping one source of truth means a generated chart is directly usable.
 */
const MOUTH_CHART = [
    { viseme: 'A', description: 'Сомкнутые губы (bilabial)', phonemes: ['m', 'b', 'p'] },
    { viseme: 'B', description: 'Слегка приоткрыт, согласные', phonemes: ['s', 't', 'd', 'k', 'n'] },
    { viseme: 'C', description: 'Открыт средне', phonemes: ['eh', 'ae'] },
    { viseme: 'D', description: 'Широко открыт', phonemes: ['aa', 'ah'] },
    { viseme: 'E', description: 'Округлён средне', phonemes: ['oh', 'er'] },
    { viseme: 'F', description: 'Округлён узко', phonemes: ['oo', 'w'] },
    { viseme: 'G', description: 'Губно-зубной', phonemes: ['f', 'v'] },
    { viseme: 'H', description: 'Латеральный / долгое «и»', phonemes: ['l', 'ee'] },
    { viseme: 'X', description: 'Покой / тишина', phonemes: [] }
];
const HAND_POSES = [
    { pose: 'relaxed', description: 'Расслабленная кисть, пальцы слегка согнуты' },
    { pose: 'fist', description: 'Сжатый кулак' },
    { pose: 'open', description: 'Раскрытая ладонь' },
    { pose: 'pointing', description: 'Указательный жест' },
    { pose: 'grip', description: 'Хват предмета' },
    { pose: 'thumbs_up', description: 'Большой палец вверх' }
];
const EXPRESSIONS = [
    { expression: 'neutral', brows: 0, eyes: 0, mouth: 'X' },
    { expression: 'happy', brows: 0.3, eyes: 0.4, mouth: 'C' },
    { expression: 'sad', brows: -0.4, eyes: -0.3, mouth: 'A' },
    { expression: 'angry', brows: -0.7, eyes: 0.2, mouth: 'B' },
    { expression: 'surprised', brows: 0.8, eyes: 0.9, mouth: 'D' },
    { expression: 'suspicious', brows: -0.2, eyes: -0.5, mouth: 'B' }
];
/** Turnaround views a 360 rig must cover, with mirror reuse noted. */
const ROTATION_VIEWS = [
    { view: 'front', angle: 0, mirrorOf: null },
    { view: 'three_quarter_right', angle: 45, mirrorOf: null },
    { view: 'profile_right', angle: 90, mirrorOf: null },
    { view: 'three_quarter_back_right', angle: 135, mirrorOf: null },
    { view: 'back', angle: 180, mirrorOf: null },
    { view: 'three_quarter_back_left', angle: 225, mirrorOf: 'three_quarter_back_right' },
    { view: 'profile_left', angle: 270, mirrorOf: 'profile_right' },
    { view: 'three_quarter_left', angle: 315, mirrorOf: 'three_quarter_right' }
];
function sha256(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}
function planId(prefix, payload) {
    return `${prefix}_${sha256(JSON.stringify(payload)).slice(0, 12)}`;
}
/** Body-part keywords used to classify layer names found in a source file. */
const PART_KEYWORDS = [
    { part: 'head', patterns: /head|голов|скальп|hair|волос/i },
    { part: 'face', patterns: /face|лиц|eye|глаз|brow|бров|mouth|рот|nose|нос|ear|ух/i },
    { part: 'torso', patterns: /torso|body|chest|тело|туловищ|грудь|hip|бедр|pelvis/i },
    { part: 'arm_left', patterns: /(arm|hand|рук|кист|shoulder|плеч).*(_l\b|left|лев)|(l_|left_|лев).*(arm|hand|рук)/i },
    { part: 'arm_right', patterns: /(arm|hand|рук|кист|shoulder|плеч).*(_r\b|right|прав)|(r_|right_|прав).*(arm|hand|рук)/i },
    { part: 'leg_left', patterns: /(leg|foot|ног|стоп|knee|колен).*(_l\b|left|лев)|(l_|left_|лев).*(leg|foot|ног)/i },
    { part: 'leg_right', patterns: /(leg|foot|ног|стоп|knee|колен).*(_r\b|right|прав)|(r_|right_|прав).*(leg|foot|ног)/i },
    { part: 'prop', patterns: /prop|weapon|tool|реквизит|предмет/i }
];
function classifyLayer(name) {
    for (const entry of PART_KEYWORDS) {
        if (entry.patterns.test(name))
            return entry.part;
    }
    return 'unclassified';
}
/**
 * Extract layer names from a source file.
 *
 * SVG is text, so real ids/labels can be read. PSD layer names live in a binary
 * structure this codebase has no parser for, so they are NOT guessed — the tool
 * reports what it could and could not read instead of inventing six body parts
 * like the placeholder did.
 */
function readLayerNames(filePath) {
    const buffer = fs.readFileSync(filePath);
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.svg' || buffer.toString('ascii', 0, 400).includes('<svg')) {
        const text = buffer.toString('utf-8');
        const layers = new Set();
        // Illustrator/Inkscape export layer names as inkscape:label or id on <g>.
        for (const match of text.matchAll(/<g[^>]*?(?:inkscape:label|id)="([^"]+)"/g)) {
            layers.add(match[1]);
        }
        for (const match of text.matchAll(/<(?:path|image|rect|use)[^>]*?id="([^"]+)"/g)) {
            layers.add(match[1]);
        }
        return { format: 'svg', layers: [...layers], parseable: true };
    }
    if (buffer.length > 4 && buffer.toString('ascii', 0, 4) === '8BPS') {
        return {
            format: 'psd',
            layers: [],
            parseable: false,
            note: 'PSD — бинарный формат; парсер слоёв не реализован. Экспортируйте слои в SVG или PNG-каталог, '
                + 'либо укажите слои вручную через layerNames.'
        };
    }
    return {
        format: 'unknown',
        layers: [],
        parseable: false,
        note: 'Формат не распознан по magic bytes.'
    };
}
export const riggingEngineTools = [
    defineTool({
        name: 'harmony.rig.analyze_source',
        description: 'Проанализировать исходник рига: реально прочитать слои SVG или каталог PNG.',
        inputSchema: z.object({
            filePath: z.string().describe('SVG-файл, PSD или каталог с PNG-слоями.'),
            layerNames: z.array(z.string()).optional()
                .describe('Слои вручную — если формат не парсится (например PSD).')
        }),
        handler: async (args) => {
            const resolved = verifyPathAccess(args.filePath);
            if (!fs.existsSync(resolved)) {
                return createStandardExecutionResult({
                    status: 'blocked',
                    simulated: false,
                    isRealHarmonyExecution: false,
                    errors: [`[FILE_NOT_FOUND] Исходник не найден: ${resolved}`],
                    details: { filePath: resolved }
                });
            }
            let format;
            let layers;
            let parseable;
            let note;
            if (fs.statSync(resolved).isDirectory()) {
                // A directory of PNGs: each file is a layer, names are real.
                const files = fs.readdirSync(resolved).filter(f => /\.(png|tga|tif|tiff)$/i.test(f));
                format = 'image_directory';
                layers = files.map(f => path.basename(f, path.extname(f)));
                parseable = true;
            }
            else {
                const read = readLayerNames(resolved);
                format = read.format;
                layers = read.layers;
                parseable = read.parseable;
                note = read.note;
            }
            // Manual override wins: the operator knows the file.
            if (args.layerNames && args.layerNames.length > 0) {
                layers = args.layerNames;
                parseable = true;
                note = 'Слои переданы вручную через layerNames.';
            }
            const classified = layers.map(name => ({ layer: name, part: classifyLayer(name) }));
            const byPart = classified.reduce((acc, item) => {
                acc[item.part] = [...(acc[item.part] ?? []), item.layer];
                return acc;
            }, {});
            // Compare against what a biped rig needs, so gaps are visible.
            const expectedParts = ['head', 'torso', 'arm_left', 'arm_right', 'leg_left', 'leg_right'];
            const missingParts = expectedParts.filter(part => !byPart[part]);
            return {
                ...createStandardExecutionResult({
                    status: parseable ? (missingParts.length === 0 ? 'success' : 'partial_success') : 'blocked',
                    simulated: false,
                    isRealHarmonyExecution: false,
                    errors: parseable ? [] : [note ?? 'Слои не читаются.'],
                    warnings: [
                        ...(missingParts.length > 0 && parseable
                            ? [`Не найдены слои для частей: ${missingParts.join(', ')}.`] : []),
                        ...(byPart.unclassified ? [`Не удалось классифицировать ${byPart.unclassified.length} слой(ёв).`] : [])
                    ],
                    details: {
                        filePath: resolved,
                        detectedFormat: format,
                        parseable,
                        // Real names read from the file, not a canned six-part list.
                        detectedLayers: layers,
                        layerCount: layers.length,
                        classification: classified,
                        partsFound: Object.keys(byPart).filter(p => p !== 'unclassified'),
                        missingParts,
                        note
                    }
                }),
                verification: 'verified_real'
            };
        }
    }),
    defineTool({
        name: 'harmony.rig.templates.list',
        description: 'Список шаблонов ригов из реального реестра (с каноническими хешами).',
        inputSchema: z.object({}),
        handler: async () => {
            const registry = await getRegistry();
            const entries = registry.listTemplates();
            // listTemplates() returns both "id" and "id_vN" pointers to the same entry.
            const unique = new Map();
            for (const entry of entries)
                unique.set(entry.contentHash, entry);
            const templates = [...unique.values()].map(entry => ({
                templateId: entry.template.template_id,
                version: entry.template.version,
                displayName: entry.template.display_name,
                contentHash: entry.contentHash,
                nodeCount: entry.template.nodes?.length ?? 0,
                requiredLandmarks: entry.template.required_landmarks ?? [],
                optionalLandmarks: entry.template.optional_landmarks ?? []
            }));
            return {
                ...createStandardExecutionResult({
                    status: 'success',
                    simulated: false,
                    isRealHarmonyExecution: false,
                    warnings: templates.length === 0
                        ? ['В templates/rig/builtin не найдено ни одного .rig-template.json.'] : [],
                    details: { templateCount: templates.length, templates }
                }),
                verification: 'verified_real'
            };
        }
    }),
    defineTool({
        name: 'harmony.rig.templates.get',
        description: 'Получить шаблон рига по ID из реестра (реальный поиск, не «found: true»).',
        inputSchema: z.object({
            templateId: z.string(),
            version: z.string().optional()
        }),
        handler: async (args) => {
            const registry = await getRegistry();
            try {
                const entry = registry.getTemplate(args.templateId, args.version);
                return {
                    ...createStandardExecutionResult({
                        status: 'success',
                        simulated: false,
                        isRealHarmonyExecution: false,
                        details: {
                            templateId: entry.template.template_id,
                            found: true,
                            version: entry.template.version,
                            displayName: entry.template.display_name,
                            // RFC 8785 canonical hash: identical content always hashes the same.
                            contentHash: entry.contentHash,
                            coordinateSpace: entry.template.coordinate_space,
                            requiredLandmarks: entry.template.required_landmarks ?? [],
                            optionalLandmarks: entry.template.optional_landmarks ?? [],
                            nodes: entry.template.nodes ?? [],
                            connections: entry.template.connections ?? [],
                            constraints: entry.template.constraints ?? []
                        }
                    }),
                    verification: 'verified_real'
                };
            }
            catch (err) {
                const available = registry.listTemplates().map(e => e.template.template_id);
                return {
                    ...createStandardExecutionResult({
                        status: 'blocked',
                        simulated: false,
                        isRealHarmonyExecution: false,
                        errors: [err?.message ?? String(err)],
                        details: {
                            templateId: args.templateId,
                            found: false,
                            availableTemplates: [...new Set(available)]
                        }
                    }),
                    verification: 'verified_real'
                };
            }
        }
    }),
    defineTool({
        name: 'harmony.rig.resolve_binding',
        description: 'Сопоставить слоты шаблона с ориентирами PIR через реальный RigBindingResolver.',
        inputSchema: z.object({
            characterId: z.string(),
            templateId: z.string(),
            pir: z.object({
                points: z.array(z.object({
                    name: z.string(),
                    x: z.number().optional(),
                    y: z.number().optional(),
                    confidence: z.number().optional().default(1)
                }))
            }).describe('CharacterTopologyPIR: реальные ориентиры персонажа.'),
            version: z.string().optional()
        }),
        handler: async (args) => {
            const registry = await getRegistry();
            let entry;
            try {
                entry = registry.getTemplate(args.templateId, args.version);
            }
            catch (err) {
                return createStandardExecutionResult({
                    status: 'blocked',
                    simulated: false,
                    isRealHarmonyExecution: false,
                    errors: [err?.message ?? String(err)],
                    details: { characterId: args.characterId, templateId: args.templateId, bindingPlanCreated: false }
                });
            }
            const pirHash = sha256(JSON.stringify(args.pir));
            const required = entry.template.required_landmarks ?? [];
            const supplied = new Set(args.pir.points.map(point => point.name));
            const missing = required.filter(name => !supplied.has(name));
            // RigBindingResolver throws when a required landmark is absent. Report that
            // as a structured result instead of letting the tool call crash.
            if (missing.length > 0) {
                return {
                    ...createStandardExecutionResult({
                        status: 'blocked',
                        simulated: false,
                        isRealHarmonyExecution: false,
                        errors: [`Отсутствуют обязательные ориентиры PIR: ${missing.join(', ')}`],
                        details: {
                            characterId: args.characterId,
                            templateId: entry.template.template_id,
                            templateContentHash: entry.contentHash,
                            pirHash,
                            bindingPlanCreated: false,
                            requiredLandmarks: required,
                            suppliedLandmarks: [...supplied],
                            unresolvedSlots: missing
                        }
                    }),
                    verification: 'verified_real'
                };
            }
            let plan;
            try {
                plan = resolver.resolveBinding(args.characterId, args.pir, pirHash, entry);
            }
            catch (err) {
                return {
                    ...createStandardExecutionResult({
                        status: 'blocked',
                        simulated: false,
                        isRealHarmonyExecution: false,
                        errors: [err?.message ?? String(err)],
                        details: {
                            characterId: args.characterId,
                            templateId: entry.template.template_id,
                            pirHash,
                            bindingPlanCreated: false
                        }
                    }),
                    verification: 'verified_real'
                };
            }
            const unresolved = plan.unresolved_slots ?? plan.unresolved ?? [];
            const bindings = plan.bindings ?? [];
            return {
                ...createStandardExecutionResult({
                    status: unresolved.length === 0 ? 'success' : 'partial_success',
                    simulated: false,
                    isRealHarmonyExecution: false,
                    warnings: plan.warnings ?? [],
                    errors: unresolved.length > 0
                        ? [`Не сопоставлены обязательные слоты: ${unresolved.join(', ')}`] : [],
                    details: {
                        characterId: args.characterId,
                        templateId: entry.template.template_id,
                        templateContentHash: entry.contentHash,
                        pirHash,
                        // Real binding outcome, not a bare `bindingPlanCreated: true`.
                        bindingPlanCreated: unresolved.length === 0,
                        bindingCount: bindings.length,
                        unresolvedSlots: unresolved,
                        bindings,
                        plan
                    }
                }),
                verification: 'verified_real'
            };
        }
    }),
    defineTool({
        name: 'harmony.rig.plan_cutout',
        description: 'Построить план команд для cut-out рига из шаблона (реальный план, не «PLAN-XXXXX»).',
        inputSchema: z.object({
            characterId: z.string(),
            templateId: z.string(),
            version: z.string().optional()
        }),
        handler: async (args) => {
            const registry = await getRegistry();
            let entry;
            try {
                entry = registry.getTemplate(args.templateId, args.version);
            }
            catch (err) {
                return createStandardExecutionResult({
                    status: 'blocked',
                    simulated: false,
                    isRealHarmonyExecution: false,
                    errors: [err?.message ?? String(err)],
                    details: { characterId: args.characterId, templateId: args.templateId }
                });
            }
            const template = entry.template;
            const prefix = args.characterId;
            // Nodes first, then connections: Harmony cannot connect what does not exist.
            const commands = [];
            for (const node of template.nodes ?? []) {
                commands.push({
                    command: node.type === 'PEG' ? 'create_peg' : 'create_node',
                    nodeId: `${prefix}_${node.id}`,
                    nodeType: node.type,
                    nodeName: `${prefix}_${node.name}`,
                    parentGroup: prefix
                });
            }
            for (const connection of (template.connections ?? [])) {
                // The template schema uses from_node/to_node; accept the other spellings
                // defensively so a schema revision does not silently produce "undefined".
                const from = connection.from_node ?? connection.from ?? connection.src;
                const to = connection.to_node ?? connection.to ?? connection.dest;
                commands.push({
                    command: 'connect_nodes',
                    srcNodePath: `${prefix}_${from}`,
                    destNodePath: `${prefix}_${to}`,
                    srcPort: connection.srcPort ?? 0,
                    destPort: connection.destPort ?? 0
                });
            }
            // Order invariant: every connection must reference an already-created node.
            const created = new Set();
            const orderViolations = [];
            for (const command of commands) {
                if (command.command === 'create_peg' || command.command === 'create_node') {
                    created.add(String(command.nodeId));
                }
                else if (command.command === 'connect_nodes') {
                    for (const key of ['srcNodePath', 'destNodePath']) {
                        const ref = String(command[key]);
                        if (!created.has(ref))
                            orderViolations.push(`${ref} используется до создания.`);
                    }
                }
            }
            const id = planId('cutout', { characterId: args.characterId, hash: entry.contentHash, commands });
            return {
                ...createStandardExecutionResult({
                    status: orderViolations.length === 0 ? 'success' : 'partial_success',
                    simulated: false,
                    isRealHarmonyExecution: false,
                    requiresRealHarmony: true,
                    warnings: orderViolations,
                    details: {
                        characterId: args.characterId,
                        templateId: template.template_id,
                        templateContentHash: entry.contentHash,
                        commandPlanId: id,
                        nodeCount: (template.nodes ?? []).length,
                        connectionCount: (template.connections ?? []).length,
                        commandCount: commands.length,
                        orderValid: orderViolations.length === 0,
                        commands
                    }
                }),
                verification: 'implemented_unverified',
                note: 'План построен из реального шаблона и провалидирован. Создание нод требует Harmony.'
            };
        }
    }),
    defineTool({
        name: 'harmony.rig.generate_360',
        description: 'Спланировать 360°-риг: ракурсы, зеркальное переиспользование, объём работ.',
        inputSchema: z.object({
            characterId: z.string(),
            useMirroring: z.boolean().optional().default(true)
                .describe('Переиспользовать левые ракурсы как зеркала правых.')
        }),
        handler: async (args) => {
            const useMirroring = args.useMirroring ?? true;
            const views = ROTATION_VIEWS.map(view => ({
                view: view.view,
                angle: view.angle,
                // Mirroring halves the drawing count on a symmetric character.
                drawingRequired: useMirroring ? view.mirrorOf === null : true,
                mirrorOf: useMirroring ? view.mirrorOf : null,
                pegName: `${args.characterId}_${view.view}_P`
            }));
            const toDraw = views.filter(v => v.drawingRequired);
            return {
                ...createStandardExecutionResult({
                    status: 'success',
                    simulated: false,
                    isRealHarmonyExecution: false,
                    details: {
                        characterId: args.characterId,
                        rigType: 'production_360',
                        viewCount: views.length,
                        drawingsRequired: toDraw.length,
                        drawingsSavedByMirroring: views.length - toDraw.length,
                        views,
                        // Master controller drives the turnaround from one value.
                        masterController: {
                            name: `${args.characterId}_Turn_MC`,
                            type: 'slider',
                            range: [0, 360],
                            stops: views.map(v => v.angle)
                        }
                    }
                }),
                verification: 'verified_real',
                note: 'Спецификация 360°-рига рассчитана реально. Сборка деформеров требует Harmony.'
            };
        }
    }),
    defineTool({
        name: 'harmony.rig.generate_mouth_chart',
        description: 'Создать карту ртов Preston Blair с drawing substitutions (совместима с VisemeMapper).',
        inputSchema: z.object({
            characterId: z.string(),
            mouthNodeName: z.string().optional()
        }),
        handler: async (args) => {
            const mouthNode = args.mouthNodeName ?? `${args.characterId}_Mouth`;
            const substitutions = MOUTH_CHART.map((entry, index) => ({
                viseme: entry.viseme,
                // Drawing names match what VisemeMapper's phonemeToDrawingMap expects.
                drawingName: `Mouth_${entry.viseme}`,
                exposureSlot: index + 1,
                description: entry.description,
                phonemes: entry.phonemes
            }));
            return {
                ...createStandardExecutionResult({
                    status: 'success',
                    simulated: false,
                    isRealHarmonyExecution: false,
                    details: {
                        characterId: args.characterId,
                        mouthNodeName: mouthNode,
                        visemes: MOUTH_CHART.map(m => m.viseme),
                        visemeCount: MOUTH_CHART.length,
                        drawingSubstitutions: substitutions,
                        restViseme: 'X',
                        compatibleWith: 'VisemeMapper.phonemeToDrawingMap'
                    }
                }),
                verification: 'verified_real'
            };
        }
    }),
    defineTool({
        name: 'harmony.rig.generate_hand_library',
        description: 'Создать библиотеку жестов рук с drawing substitutions.',
        inputSchema: z.object({
            characterId: z.string(),
            hands: z.array(z.enum(['left', 'right'])).optional().default(['left', 'right'])
        }),
        handler: async (args) => {
            const hands = args.hands ?? ['left', 'right'];
            const entries = hands.flatMap(hand => HAND_POSES.map((pose, index) => ({
                hand,
                pose: pose.pose,
                description: pose.description,
                nodeName: `${args.characterId}_Hand_${hand === 'left' ? 'L' : 'R'}`,
                drawingName: `Hand_${hand === 'left' ? 'L' : 'R'}_${pose.pose}`,
                exposureSlot: index + 1
            })));
            return {
                ...createStandardExecutionResult({
                    status: 'success',
                    simulated: false,
                    isRealHarmonyExecution: false,
                    details: {
                        characterId: args.characterId,
                        hands,
                        handPoses: HAND_POSES.map(p => p.pose),
                        drawingCount: entries.length,
                        drawingSubstitutions: entries
                    }
                }),
                verification: 'verified_real'
            };
        }
    }),
    defineTool({
        name: 'harmony.rig.generate_expression_library',
        description: 'Создать библиотеку мимики: значения бровей/глаз/рта на контроллере лица.',
        inputSchema: z.object({
            characterId: z.string(),
            gridSize: z.number().int().min(2).max(5).optional().default(3)
                .describe('Размер Grid-контроллера лица.')
        }),
        handler: async (args) => {
            const gridSize = args.gridSize ?? 3;
            const entries = EXPRESSIONS.map((expression, index) => ({
                expression: expression.expression,
                // Normalised controller values, directly drivable from a Grid MC.
                controllerValues: { brows: expression.brows, eyes: expression.eyes },
                mouthViseme: expression.mouth,
                drawingName: `Face_${expression.expression}`,
                exposureSlot: index + 1,
                // Map onto discrete grid cells so the MC can snap to each expression.
                gridCell: {
                    x: Math.round((expression.brows + 1) / 2 * (gridSize - 1)),
                    y: Math.round((expression.eyes + 1) / 2 * (gridSize - 1))
                }
            }));
            return {
                ...createStandardExecutionResult({
                    status: 'success',
                    simulated: false,
                    isRealHarmonyExecution: false,
                    details: {
                        characterId: args.characterId,
                        expressions: EXPRESSIONS.map(e => e.expression),
                        expressionCount: entries.length,
                        faceController: {
                            name: `${args.characterId}_Face_MC`,
                            type: 'grid',
                            gridWidth: gridSize,
                            gridHeight: gridSize
                        },
                        library: entries
                    }
                }),
                verification: 'verified_real'
            };
        }
    }),
    defineTool({
        name: 'harmony.rig.create_master_controllers',
        description: 'Спланировать Master Controllers рига (план команд; создание требует Harmony).',
        inputSchema: z.object({
            characterId: z.string(),
            controllers: z.array(z.enum(['head_turn', 'body_turn', 'face', 'hands']))
                .optional().default(['head_turn', 'body_turn'])
        }),
        handler: async (args) => {
            const requested = args.controllers ?? ['head_turn', 'body_turn'];
            const specs = {
                head_turn: { widget: 'slider', range: [0, 360], drives: 'Head rotation views' },
                body_turn: { widget: 'slider', range: [0, 360], drives: 'Body rotation views' },
                face: { widget: 'grid', range: [-1, 1], drives: 'Brows/eyes expression blend' },
                hands: { widget: 'slider', range: [0, 5], drives: 'Hand pose substitutions' }
            };
            const controllers = requested.map(key => ({
                name: `${args.characterId}_${key === 'head_turn' ? 'Head_Turn' : key === 'body_turn' ? 'Body_Turn' : key === 'face' ? 'Face' : 'Hands'}_MC`,
                kind: key,
                widgetType: specs[key].widget,
                range: specs[key].range,
                drives: specs[key].drives
            }));
            const commands = controllers.map(controller => ({
                command: 'create_master_controller',
                characterId: args.characterId,
                controllerName: controller.name,
                widgetType: controller.widgetType,
                range: controller.range
            }));
            return {
                ...createStandardExecutionResult({
                    status: 'success',
                    simulated: false,
                    isRealHarmonyExecution: false,
                    requiresRealHarmony: true,
                    details: {
                        characterId: args.characterId,
                        masterControllersPlanned: controllers.map(c => c.name),
                        controllers,
                        commandCount: commands.length,
                        commands,
                        planId: planId('mc', commands)
                    }
                }),
                verification: 'implemented_unverified',
                note: 'План контроллеров построен. Создание виджетов требует Harmony.'
            };
        }
    }),
    defineTool({
        name: 'harmony.rig.run_motion_tests',
        description: 'Спланировать тестовую анимацию рига (прогон требует движка деформации Harmony).',
        inputSchema: z.object({
            characterId: z.string(),
            durationFrames: z.number().int().positive().optional().default(48)
        }),
        handler: async (args) => {
            const duration = args.durationFrames ?? 48;
            // Extremes are where a cut-out rig breaks: each test drives one to its limit.
            const tests = [
                { name: 'arm_full_range', joint: 'shoulder', from: -90, to: 90, checks: ['pivot_slip', 'drawing_tear'] },
                { name: 'leg_full_range', joint: 'hip', from: -60, to: 60, checks: ['pivot_slip', 'foot_slide'] },
                { name: 'head_turn', joint: 'neck', from: -45, to: 45, checks: ['neck_gap', 'jaw_detach'] },
                { name: 'torso_bend', joint: 'spine', from: -30, to: 30, checks: ['deformer_pinch'] }
            ].map((test, index) => ({
                ...test,
                startFrame: index * Math.floor(duration / 4) + 1,
                endFrame: (index + 1) * Math.floor(duration / 4),
                keyframes: [
                    { frame: index * Math.floor(duration / 4) + 1, value: 0 },
                    { frame: index * Math.floor(duration / 4) + Math.floor(duration / 8), value: test.from },
                    { frame: (index + 1) * Math.floor(duration / 4), value: test.to }
                ]
            }));
            return {
                ...createStandardExecutionResult({
                    status: 'success',
                    simulated: false,
                    isRealHarmonyExecution: false,
                    requiresRealHarmony: true,
                    details: {
                        characterId: args.characterId,
                        // Honest: the plan is real, the pass/fail verdict is not knowable here.
                        motionTestPassed: null,
                        reason: 'Оценка сгибов и растяжений требует движка деформации Harmony.',
                        testCount: tests.length,
                        durationFrames: duration,
                        tests,
                        planId: planId('motiontest', tests)
                    }
                }),
                verification: 'implemented_unverified',
                note: 'Тестовая анимация спланирована. Проверка деформаций требует Harmony.'
            };
        }
    }),
    defineTool({
        name: 'harmony.rig.publish_template',
        description: 'Опубликовать риг-спецификацию в библиотеку (JSON + канонический хеш). .tpl требует Harmony.',
        inputSchema: z.object({
            characterId: z.string(),
            templatePath: z.string().describe('Куда записать спецификацию.'),
            rigSpec: z.record(z.any()).optional().describe('Спецификация рига для публикации.')
        }),
        handler: async (args) => {
            const target = verifyPathAccess(args.templatePath);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            const spec = {
                schemaVersion: '1.0',
                characterId: args.characterId,
                publishedAt: new Date().toISOString(),
                rigSpec: args.rigSpec ?? {},
                // Content hash excludes the timestamp so identical rigs match.
                specDigest: sha256(JSON.stringify({ characterId: args.characterId, rigSpec: args.rigSpec ?? {} }))
            };
            fs.writeFileSync(target, JSON.stringify(spec, null, 2), 'utf-8');
            const isTpl = path.extname(target).toLowerCase() === '.tpl';
            return {
                ...createStandardExecutionResult({
                    status: 'success',
                    simulated: false,
                    isRealHarmonyExecution: false,
                    requiresRealHarmony: isTpl,
                    warnings: isTpl
                        ? ['Записан JSON, а не бинарный .tpl: формат Harmony закрыт и требует самой Harmony для экспорта.']
                        : [],
                    artifacts: [target],
                    details: {
                        characterId: args.characterId,
                        publishedTemplatePath: target,
                        specDigest: spec.specDigest,
                        format: 'json',
                        binaryTplExported: false
                    }
                }),
                verification: 'verified_real'
            };
        }
    })
];
