export interface ShotList {
    episode: string;
    shots: Shot[];
}

export interface Shot {
    shotId: string;
    durationFrames: number;
    description: string;
    characters: string[];
    background: string;
    camera: string;
    dialogue: string[];
    action: string;
    fx: string[];
}
