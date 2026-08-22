/**
 * ScriptPlanner — produces a lightweight script structure sufficient
 * for the ActingPlanner and Lipsync. NOT final literary script.
 */
export class ScriptPlanner {
    generateScript(episodePlan, analysis) {
        return {
            episodeTitle: episodePlan.episodeTitle,
            logLine: episodePlan.scriptLogLine,
            totalScenes: episodePlan.scenes.length,
            scenes: episodePlan.scenes.map(scene => ({
                sceneId: scene.sceneId,
                sceneName: scene.sceneName,
                location: scene.location,
                mood: scene.mood,
                beats: this.generateSceneBeats(scene),
                dialogue: this.generateDialogue(scene, analysis)
            })),
            origin: 'planned'
        };
    }
    generateSceneBeats(scene) {
        return [
            { beat: 'establish', frames: [0, scene.durationFrames * 0.2] },
            { beat: 'setup', frames: [scene.durationFrames * 0.2, scene.durationFrames * 0.5] },
            { beat: 'turn', frames: [scene.durationFrames * 0.5, scene.durationFrames * 0.85] },
            { beat: 'punchline', frames: [scene.durationFrames * 0.85, scene.durationFrames] }
        ];
    }
    generateDialogue(scene, analysis) {
        const characters = scene.characters || [];
        const lines = [];
        const beatCount = 4;
        const beatNames = ['establish', 'setup', 'turn', 'punchline'];
        const charProfiles = this.buildCharacterProfiles(characters, analysis);
        for (let b = 0; b < beatCount; b++) {
            const speakerIdx = b % characters.length;
            const speaker = characters[speakerIdx] || 'Hero';
            const profile = charProfiles[speaker] || { role: 'hero', personality: '' };
            const target = characters[(b + 1) % characters.length] || speaker;
            const text = this.lineForBeat(speaker, profile, target, scene, beatNames[b], b);
            lines.push({
                speaker,
                beat: beatNames[b],
                text,
                emotion: this.emotionForBeat(b, scene.mood),
                voiceLevel: this.voiceForBeat(b, scene.mood)
            });
        }
        return lines;
    }
    buildCharacterProfiles(characters, analysis) {
        const profiles = {};
        for (const name of characters) {
            const candidate = analysis.candidateCharacters?.find((c) => c.name === name);
            profiles[name] = {
                role: candidate?.role || 'character',
                personality: candidate?.oneLine || ''
            };
        }
        return profiles;
    }
    lineForBeat(speaker, profile, target, scene, beat, beatIdx) {
        const lowerRole = profile.role.toLowerCase();
        const location = scene.location || 'here';
        const isProfessor = /профессор|professor|уч[ёе]ный|scientist/.test(lowerRole);
        const isStudent = /студент|student|ассист|assistant/.test(lowerRole);
        const isRobot = /робот|robot|unit|android/.test(lowerRole);
        // Establish beat
        if (beatIdx === 0) {
            if (isProfessor)
                return `${target}, observe — we are about to redefine the laws of ${location}!`;
            if (isStudent)
                return `Professor, are you sure this is safe? The readings are... spiking.`;
            if (isRobot)
                return `Safety protocols engaged. Probability of success: non-zero.`;
            return `Here we are. ${location}. Something feels off.`;
        }
        // Setup beat
        if (beatIdx === 1) {
            if (isProfessor)
                return `Nonsense! Science rewards the bold. Flip the switch!`;
            if (isStudent)
                return `But the manual says never flip that switch before calibration...`;
            if (isRobot)
                return `Manual citation verified. Ignoring manual per user's dramatic directive.`;
            return `Wait, what does this button do?`;
        }
        // Turn beat
        if (beatIdx === 2) {
            if (isProfessor)
                return `Oh. That... is not supposed to glow that color.`;
            if (isStudent)
                return `I TOLD YOU! EVACUATE THE LAB!`;
            if (isRobot)
                return `Alert: unexpected chromatic anomaly detected.`;
            return `Okay, that looks bad. Really bad.`;
        }
        // Punchline beat
        if (isProfessor)
            return `No no no — quick, someone write this down! Nobel Prize or total disaster, either way!`;
        if (isStudent)
            return `I am updating my resume. In real time.`;
        if (isRobot)
            return `Humor subroutine activated. Ha. Ha.`;
        return `Well, that happened.`;
    }
    emotionForBeat(beat, mood) {
        const base = ['neutral', 'curious', 'alarmed', 'shock'];
        if (mood === 'establish')
            return base[0];
        if (mood === 'climax')
            return base[3];
        return base[beat % base.length];
    }
    voiceForBeat(beat, mood) {
        if (mood === 'climax' && beat === 3)
            return 'shout';
        if (beat === 0)
            return 'normal';
        return beat >= 2 ? 'loud' : 'normal';
    }
}
