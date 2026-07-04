export interface AnimationPlan {
    sceneId: string;
    characters: AnimationCharacterAction[];
}

export interface AnimationCharacterAction {
    character: string;
    actions: AnimationAction[];
}

export interface AnimationAction {
    type: string;
    startFrame: number;
    endFrame: number;
    description: string;
}
