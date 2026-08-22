/**
 * Вспомогательная функция для экранирования строковых параметров для генерации скриптов Qt Script
 */
export declare function escapeString(str: string): string;
export declare class QtScriptBuilder {
    /**
     * Оборачивает блок скрипта в конструкцию try-catch для возврата ответа в формате JSON
     */
    private static wrapScript;
    static buildListUsers(): string;
    static buildCreateUser(name: string, role: string, password?: string): string;
    static buildListEnvironments(): string;
    static buildCreateEnvironment(name: string, path: string, server: string, user: string): string;
    static buildListJobs(envName: string): string;
    static buildCreateJob(envName: string, jobName: string): string;
    static buildListScenes(envName: string, jobName: string): string;
    static buildCreateScene(envName: string, jobName: string, sceneName: string): string;
    static buildRenameScene(envName: string, jobName: string, oldName: string, newName: string): string;
    static buildListVersions(envName: string, jobName: string, sceneName: string): string;
    static buildListLockedScenes(): string;
    static buildImportScenePackage(envName: string, jobName: string, packagePath: string): string;
    static buildExportScenePackage(envName: string, jobName: string, sceneName: string, versionNum: number, packagePath: string): string;
    static buildCreateDeformerChain(targetNodePath: string, deformerType: 'bone' | 'curve' | 'envelope', chainName: string): string;
    static buildMasterControllerScript(characterName: string, controllerType: 'grid' | 'slider', specJson: string): string;
}
export declare class QtScriptTransaction {
    private statements;
    addStatement(jsCode: string): void;
    compile(): string;
}
