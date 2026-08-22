import { RigTemplate } from '../../schemas/rigTemplate.js';
export interface RigTemplateEntry {
    template: RigTemplate;
    contentHash: string;
}
export declare class RigTemplateRegistry {
    private templates;
    private readonly builtinPath;
    constructor(builtinPath?: string);
    initialize(): Promise<void>;
    private loadTemplate;
    getTemplate(templateId: string, version?: string): RigTemplateEntry;
    listTemplates(): RigTemplateEntry[];
}
