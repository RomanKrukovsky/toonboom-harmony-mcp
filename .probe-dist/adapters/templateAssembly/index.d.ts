export interface TemplateInfo {
    name: string;
    type: 'scene' | 'rig' | 'camera' | 'fx' | 'mouth_chart' | 'render';
    path: string;
    description: string;
}
export declare class TemplateAssemblyAdapter {
    private templatesDir;
    constructor();
    private ensureTemplatesDir;
    listTemplates(): Promise<TemplateInfo[]>;
    validateTemplate(templatePath: string): Promise<{
        valid: boolean;
        issues: string[];
    }>;
    createSceneFromTemplate(templatePath: string, targetPath: string, options?: any): Promise<{
        status: 'success';
        path: string;
    }>;
    importCharacterRig(projectPath: string, rigPath: string, characterName: string): Promise<any>;
    importCameraPreset(projectPath: string, presetName: string): Promise<any>;
    importFXPreset(projectPath: string, presetType: string, targetNode: string): Promise<any>;
    applyMouthChart(projectPath: string, mouthChartName: string, lipsyncData: any): Promise<any>;
    applyRenderPreset(projectPath: string, presetName: string): Promise<any>;
    createTemplatePack(packName: string): Promise<any>;
}
export declare const templateAssembly: TemplateAssemblyAdapter;
