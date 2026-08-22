export interface HotkeyMapping {
    keys: string[];
    description: string;
}
export declare class HotkeysAdapter {
    private static mappings;
    static getHotkey(action: string, platformOverride?: string): string[];
    static getHotkeyDescription(action: string, platformOverride?: string): string;
    static listAll(platformOverride?: string): Record<string, {
        keys: string[];
        description: string;
    }>;
}
