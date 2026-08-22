export interface XmlAuditResult {
    passed: boolean;
    issues: string[];
    totalNodesCount: number;
    totalLinksCount: number;
}
export declare class FastXmlAuditor {
    /**
     * Проводит экспресс-аудит XML-структуры файла .xstage
     * @param filePath Абсолютный путь к файлу .xstage
     */
    static auditXstageFile(filePath: string): XmlAuditResult;
    /**
     * Генерация Mermaid-диаграммы графа нод из файла .xstage
     * @param filePath Абсолютный путь к файлу .xstage
     */
    static generateMermaidGraph(filePath: string): string;
}
