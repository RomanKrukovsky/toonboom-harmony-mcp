import { SCENE_PLAN_VERSION } from '../schemas/scenePlan.js';
/**
 * PromptParser — разбирает free-form промпт сцены → структурированные данные.
 *
 * ВАЖНО: MCP-сервер не имеет прямого доступа к LLM.
 * Этот модуль выполняет ЭВРИСТИЧЕСКИЙ разбор (regex + keywords) для
 * создания базовой структуры. Вызывающий агент (Claude/Gemini) получает
 * промпт-шаблоны через resources/prompts и выполняет умный разбор сам.
 *
 * Для production-качества агент должен:
 *   1. Вызвать harmony.studio.from_prompt
 *   2. Получить prompt_template из результата
 *   3. Выполнить собственный LLM-вызов со structured output
 *   4. Вернуть результат в harmony.studio.run_full_pipeline
 */
export class PromptParser {
    /**
     * Главный метод: промпт → ParsedScene (эвристика + defaults).
     * Возвращает базовую структуру, которую агент может уточнить.
     */
    static parse(opts) {
        const { prompt, production = 'Untitled', episode = 'E01', fps = 24, durationSeconds = 8, resolution = { width: 1920, height: 1080 }, language = 'auto' } = opts;
        const durationFrames = Math.round(durationSeconds * fps);
        const sceneName = opts.sceneName || this.extractSceneName(prompt, episode);
        const characters = this.extractCharacters(prompt);
        const setting = this.extractSetting(prompt);
        const mood = this.extractMood(prompt);
        const timeOfDay = this.extractTimeOfDay(prompt);
        const dialogues = this.extractDialogues(prompt, characters);
        const cameraPlan = this.buildCameraPlan(prompt, durationFrames, fps);
        const lipsyncPlan = dialogues.length > 0
            ? this.buildLipsyncPlan(dialogues, durationFrames, fps, characters)
            : undefined;
        const blockingPlan = this.buildBlockingPlan(characters, durationFrames, fps);
        const assetRequirements = this.buildAssetRequirements(sceneName, characters, setting, dialogues);
        // Генерируем scene_plan.json совместимый с существующей схемой
        const scenePlan = this.buildScenePlan({
            production, episode, sceneName, fps, durationFrames, resolution,
            characters, setting, cameraPlan, lipsyncPlan
        });
        const warnings = [];
        if (characters.length === 0)
            warnings.push('Персонажи не обнаружены в промпте — добавлены заглушки');
        if (dialogues.length === 0 && /говор|сказ|крич|шепч|диалог|говит/i.test(prompt)) {
            warnings.push('Похоже, в сцене есть диалог, но текст не распознан — добавьте диалоги в формате: "ИМЯ: текст"');
        }
        return {
            sourcePrompt: prompt,
            language,
            production,
            episode,
            sceneName,
            durationSeconds,
            fps,
            resolution,
            setting,
            mood,
            timeOfDay,
            characters,
            cameraPlan,
            lipsyncPlan,
            blockingPlan,
            assetRequirements,
            scenePlan,
            confidence: this.estimateConfidence(prompt, characters, dialogues),
            warnings: warnings.length > 0 ? warnings : undefined,
            generatedAt: new Date().toISOString()
        };
    }
    // ─── Экстракция персонажей ───────────────────
    static extractCharacters(prompt) {
        const characters = [];
        const found = new Set();
        // Паттерн: заглавное слово как имя персонажа (например "Кот", "Мария", "Bob")
        const namePattern = /\b([А-ЯA-Z][а-яёa-z]{2,20})\b/g;
        const matches = [...prompt.matchAll(namePattern)];
        const stopWords = new Set(['Он', 'Она', 'Они', 'Это', 'Вот', 'Там', 'Тут', 'The', 'She', 'He', 'They', 'This']);
        for (const m of matches) {
            const name = m[1];
            if (!stopWords.has(name) && !found.has(name.toLowerCase())) {
                found.add(name.toLowerCase());
                characters.push(this.buildCharacterSpec(name, prompt));
            }
        }
        // Если персонажей не нашли — добавляем одного дефолтного
        if (characters.length === 0) {
            characters.push(this.buildCharacterSpec('Character_1', prompt));
        }
        // Максимум 4 персонажа из промпта
        return characters.slice(0, 4);
    }
    static buildCharacterSpec(name, prompt) {
        const safeName = name.replace(/[^a-zA-ZА-ЯЁа-яё0-9_]/g, '_');
        return {
            name: safeName,
            description: `Персонаж из сцены: ${name}`,
            style: 'cutout',
            bodyParts: [
                { name: 'head', drawingLayers: [`${safeName}_head`, `${safeName}_eyes`, `${safeName}_mouth`], hasSubs: true },
                { name: 'torso', drawingLayers: [`${safeName}_torso`], hasSubs: false },
                { name: 'left_arm', drawingLayers: [`${safeName}_left_upper_arm`, `${safeName}_left_forearm`, `${safeName}_left_hand`], hasSubs: false },
                { name: 'right_arm', drawingLayers: [`${safeName}_right_upper_arm`, `${safeName}_right_forearm`, `${safeName}_right_hand`], hasSubs: false },
                { name: 'left_leg', drawingLayers: [`${safeName}_left_thigh`, `${safeName}_left_shin`, `${safeName}_left_foot`], hasSubs: false },
                { name: 'right_leg', drawingLayers: [`${safeName}_right_thigh`, `${safeName}_right_shin`, `${safeName}_right_foot`], hasSubs: false }
            ],
            views360: [
                { angle: 'front', label: 'Спереди', priority: 'required' },
                { angle: 'front_3q_left', label: '3/4 левый', priority: 'required' },
                { angle: 'side_left', label: 'Профиль левый', priority: 'required' },
                { angle: 'back', label: 'Сзади', priority: 'optional' },
                { angle: 'side_right', label: 'Профиль правый', priority: 'optional' }
            ],
            actions: [{ name: 'idle', description: 'Стоит на месте' }],
            needsNewRig: true
        };
    }
    // ─── Экстракция окружения ────────────────────
    static extractSetting(prompt) {
        // Ключевые слова локаций
        const locationKeywords = {
            'roof': ['крыш', 'крышу', 'крыше', 'roof', 'rooftop'],
            'forest': ['лес', 'лесу', 'forest', 'woods', 'деревь'],
            'city': ['город', 'улиц', 'city', 'street', 'мегаполис'],
            'room': ['комнат', 'дом', 'квартир', 'room', 'house', 'indoor'],
            'beach': ['пляж', 'море', 'океан', 'beach', 'sea', 'ocean'],
            'sky': ['небо', 'облак', 'sky', 'cloud', 'воздух'],
            'studio': ['студи', 'studio', 'сцен'],
            'school': ['школ', 'класс', 'school', 'classroom'],
            'park': ['парк', 'сад', 'park', 'garden']
        };
        const lower = prompt.toLowerCase();
        for (const [location, keywords] of Object.entries(locationKeywords)) {
            if (keywords.some(k => lower.includes(k))) {
                return location;
            }
        }
        return 'generic_background';
    }
    static extractMood(prompt) {
        const lower = prompt.toLowerCase();
        if (/грусть|грустн|печаль|тоск|sad|melanchol/i.test(lower))
            return 'melancholic';
        if (/радост|весел|счастли|happy|joyful|funny/i.test(lower))
            return 'joyful';
        if (/страх|ужас|пугает|horror|scary|fear/i.test(lower))
            return 'tense';
        if (/приключен|adventure|action|бег|пого/i.test(lower))
            return 'adventurous';
        if (/покой|тихо|спокойн|calm|peaceful|закат|sunset/i.test(lower))
            return 'peaceful';
        if (/смешн|юмор|комед|funny|comedy|гротеск/i.test(lower))
            return 'comedic';
        return 'neutral';
    }
    static extractTimeOfDay(prompt) {
        const lower = prompt.toLowerCase();
        if (/закат|sunset|вечер|evening/i.test(lower))
            return 'sunset';
        if (/ночь|ночью|night|темно/i.test(lower))
            return 'night';
        if (/рассвет|dawn|утро|morning/i.test(lower))
            return 'dawn';
        if (/день|дневн|day|afternoon|солнц/i.test(lower))
            return 'day';
        if (/комнат|дом|помещ|indoor|inside/i.test(lower))
            return 'indoor';
        return 'unspecified';
    }
    // ─── Диалоги ─────────────────────────────────
    static extractDialogues(prompt, characters) {
        const dialogues = [];
        // Паттерн: "ИМЯ: текст" или "ИМЯ — текст"
        const pattern = /^([А-ЯA-Z][а-яёa-z]+)[:\s—–-]+(.+)$/gm;
        const matches = [...prompt.matchAll(pattern)];
        const charNames = new Set(characters.map(c => c.name.toLowerCase()));
        for (const m of matches) {
            const speaker = m[1];
            if (charNames.has(speaker.toLowerCase()) || charNames.size === 0) {
                dialogues.push({ character: speaker, text: m[2].trim() });
            }
        }
        // Поиск текста в кавычках как монолога первого персонажа
        if (dialogues.length === 0) {
            const quotedPattern = /[«""]([^»""]{5,120})[»""]/g;
            const qMatches = [...prompt.matchAll(quotedPattern)];
            const firstChar = characters[0]?.name || 'Character_1';
            for (const qm of qMatches) {
                dialogues.push({ character: firstChar, text: qm[1].trim() });
            }
        }
        return dialogues;
    }
    // ─── Построение планов ───────────────────────
    static buildCameraPlan(prompt, totalFrames, fps) {
        const lower = prompt.toLowerCase();
        const shots = [];
        // Определяем движение камеры из промпта
        if (/наезд|zoom in|приближ/i.test(lower)) {
            shots.push({ shotId: 'shot_1', type: 'zoom_in', startFrame: 1, endFrame: Math.round(totalFrames * 0.4), easing: 'ease_in_out' });
            shots.push({ shotId: 'shot_2', type: 'static', startFrame: Math.round(totalFrames * 0.4), endFrame: totalFrames, easing: 'ease_in_out' });
        }
        else if (/панорам|pan|проезд/i.test(lower)) {
            shots.push({ shotId: 'shot_1', type: 'pan', startFrame: 1, endFrame: totalFrames, easing: 'ease_in_out' });
        }
        else if (/дрожан|трясет|shake/i.test(lower)) {
            shots.push({ shotId: 'shot_1', type: 'static', startFrame: 1, endFrame: Math.round(totalFrames * 0.6), easing: 'ease_in_out' });
            shots.push({ shotId: 'shot_2', type: 'shake', startFrame: Math.round(totalFrames * 0.6), endFrame: totalFrames, easing: 'linear' });
        }
        else {
            shots.push({ shotId: 'shot_1', type: 'static', startFrame: 1, endFrame: totalFrames, easing: 'ease_in_out' });
        }
        return { totalFrames, fps, shots };
    }
    static buildLipsyncPlan(dialogues, totalFrames, fps, characters) {
        const framesPerDialogue = Math.floor(totalFrames / dialogues.length);
        const dialogueLines = dialogues.map((d, i) => ({
            character: d.character,
            text: d.text,
            startFrame: i * framesPerDialogue + 1,
            endFrame: Math.min((i + 1) * framesPerDialogue, totalFrames),
            phonemes: this.generatePlaceholderPhonemes(d.text, i * framesPerDialogue + 1, d.character)
        }));
        return {
            totalFrames,
            fps,
            engine: 'placeholder',
            dialogues: dialogueLines,
            mouthLayerPattern: '{character}/mouth'
        };
    }
    static generatePlaceholderPhonemes(text, startFrame, character) {
        // Эвристика: ~3 кадра на слог, паузы = X
        const words = text.split(/\s+/);
        const shapes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'X'];
        const phonemes = [];
        let frame = startFrame;
        phonemes.push({ frame, shape: 'X', character });
        for (const word of words) {
            const syllables = Math.max(1, Math.round(word.length / 3));
            for (let s = 0; s < syllables; s++) {
                phonemes.push({ frame, shape: shapes[Math.floor(Math.random() * 7)], character });
                frame += 3;
            }
            phonemes.push({ frame, shape: 'X', character });
            frame += 2;
        }
        return phonemes;
    }
    static buildBlockingPlan(characters, totalFrames, fps) {
        const keyframes = [];
        for (const char of characters) {
            // Входная поза на кадр 1
            keyframes.push({ frame: 1, character: char.name, bodyPart: 'all', pose: 'idle_start', interpolation: 'hold' });
            // Середина сцены
            keyframes.push({ frame: Math.round(totalFrames / 2), character: char.name, bodyPart: 'all', pose: 'mid_action', interpolation: 'ease' });
            // Финальная поза
            keyframes.push({ frame: totalFrames - 1, character: char.name, bodyPart: 'all', pose: 'idle_end', interpolation: 'ease' });
        }
        return {
            totalFrames,
            fps,
            keyframes,
            thumbnailPoses: [
                { frame: 1, description: 'Начальная поза' },
                { frame: Math.round(totalFrames / 2), description: 'Кульминация' },
                { frame: totalFrames - 1, description: 'Финальная поза' }
            ]
        };
    }
    static buildAssetRequirements(sceneName, characters, setting, dialogues) {
        const assets = [];
        let id = 1;
        // Риги персонажей
        for (const char of characters) {
            assets.push({
                id: `asset_${id++}`,
                type: 'character_rig',
                name: `${char.name}_rig`,
                status: 'needs_creation',
                description: `Cutout-риг персонажа ${char.name}`,
                priority: 'critical'
            });
        }
        // Фон
        assets.push({
            id: `asset_${id++}`,
            type: 'background',
            name: `bg_${setting}`,
            status: 'needs_creation',
            description: `Фон: ${setting}`,
            priority: 'critical'
        });
        // Аудио для диалогов
        for (const d of dialogues) {
            assets.push({
                id: `asset_${id++}`,
                type: 'audio',
                name: `audio_${d.character.toLowerCase()}_line`,
                status: 'needs_creation',
                description: `Аудио для диалога: "${d.text.substring(0, 40)}..."`,
                priority: 'important'
            });
        }
        return {
            sceneName,
            assets,
            totalCount: assets.length,
            readyCount: 0,
            generatedAt: new Date().toISOString()
        };
    }
    // ─── scene_plan.json ─────────────────────────
    static buildScenePlan(opts) {
        const { production, episode, sceneName, fps, durationFrames, resolution, characters, setting, cameraPlan, lipsyncPlan } = opts;
        return {
            schemaVersion: SCENE_PLAN_VERSION,
            production,
            episode,
            sceneName,
            fps,
            durationFrames,
            resolution,
            background: {
                file: `assets/backgrounds/bg_${setting}.harmony`,
                layerName: `BG_${setting.toUpperCase()}`,
                position: { x: 0, y: 0, z: -100 },
                scale: 1.0
            },
            characters: characters.map((char, idx) => ({
                name: char.name,
                rig: `assets/characters/${char.name}/${char.name}.tpl`,
                positionPreset: idx === 0 ? 'center' : idx === 1 ? 'left' : 'right',
                startFrame: 1,
                endFrame: durationFrames,
                actions: (lipsyncPlan?.dialogues || [])
                    .filter(d => d.character === char.name)
                    .map(d => ({
                    type: 'lipsync',
                    name: `speak_${d.startFrame}`,
                    frames: [d.startFrame, d.endFrame],
                    audio: d.audioFile || `assets/audio/${char.name}_dialogue.wav`,
                    mouthChart: `assets/lipsync/${char.name}_phonemes.json`
                }))
            })),
            camera: {
                preset: cameraPlan.shots[0]?.type === 'static' ? 'static' : 'animated',
                startFrame: 1,
                endFrame: durationFrames
            },
            effects: [],
            render: {
                preview: true,
                format: 'png',
                quality: 'preview'
            }
        };
    }
    // ─── Имя сцены ───────────────────────────────
    static extractSceneName(prompt, episode) {
        // Берём первые значимые слова промпта
        const words = prompt
            .replace(/[^a-zA-ZА-ЯЁа-яё0-9\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2)
            .slice(0, 3)
            .join('_');
        return `${episode}_${words || 'scene'}_001`;
    }
    // ─── Уверенность разбора ─────────────────────
    static estimateConfidence(prompt, characters, dialogues) {
        let score = 0.3; // base
        if (prompt.length > 50)
            score += 0.1;
        if (prompt.length > 150)
            score += 0.1;
        if (characters.length > 0 && characters[0].name !== 'Character_1')
            score += 0.2;
        if (dialogues.length > 0)
            score += 0.15;
        if (/крыш|лес|город|пляж|комнат|roof|forest|city|beach|room/i.test(prompt))
            score += 0.1;
        if (/закат|ночь|утро|день|sunset|night|morning/i.test(prompt))
            score += 0.05;
        return Math.min(1, Math.round(score * 100) / 100);
    }
    /**
     * Генерирует системный промпт для LLM-агента,
     * чтобы тот улучшил эвристический разбор до production-качества.
     */
    static generateAgentPrompt(parsedScene) {
        return `# Задача: Улучшить разбор сцены Toon Boom Harmony

Ты — AI production assistant для анимационной студии. 
Тебе предоставлен эвристический разбор промпта сцены.
Улучши его, исправь ошибки и заполни пробелы.

## Оригинальный промпт сцены:
\`\`\`
${parsedScene.sourcePrompt}
\`\`\`

## Текущий разбор (уверенность: ${parsedScene.confidence}):
- Персонажи: ${parsedScene.characters.map(c => c.name).join(', ')}
- Локация: ${parsedScene.setting}
- Настроение: ${parsedScene.mood || 'не определено'}
- Время суток: ${parsedScene.timeOfDay}
- Диалоги найдены: ${parsedScene.lipsyncPlan?.dialogues.length || 0}

## Предупреждения:
${(parsedScene.warnings || ['Нет предупреждений']).map(w => `- ${w}`).join('\n')}

## Что нужно:
1. Исправь имена персонажей (они должны быть правильными именами, не стоп-словами)
2. Уточни действия каждого персонажа (что делает, где стоит, как двигается)
3. Выдели все диалоги в формате [{ character, text, startFrame, endFrame }]
4. Предложи camera shots (static/pan/zoom)
5. Предложи mood и стиль анимации
6. Отметь какие ассеты уже могут существовать

Верни исправленную структуру ParsedScene в JSON.`;
    }
}
