export interface Script {
    title: string;
    episode?: string;
    logline: string;
    scenes: ScriptScene[];
}

export interface ScriptScene {
    sceneId: string;
    heading: string;
    action: string[];
    dialogue: ScriptDialogue[];
}

export interface ScriptDialogue {
    character: string;
    text: string;
    parenthetical?: string;
}
