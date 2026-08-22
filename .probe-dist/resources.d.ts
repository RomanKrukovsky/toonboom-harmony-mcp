export interface McpResource {
    uri: string;
    name: string;
    description: string;
    mimeType: string;
    read: () => Promise<string>;
}
export declare const resources: McpResource[];
