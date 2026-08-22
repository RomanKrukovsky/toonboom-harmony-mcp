export interface McpPrompt {
    name: string;
    description: string;
    arguments?: {
        name: string;
        description: string;
        required?: boolean;
    }[];
    messages: (args: any) => {
        role: 'user' | 'assistant';
        content: {
            type: 'text';
            text: string;
        };
    }[];
}
export declare const prompts: McpPrompt[];
