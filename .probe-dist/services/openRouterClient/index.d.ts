import { z } from 'zod';
export declare const openRouterRequestSchema: z.ZodObject<{
    prompt: z.ZodString;
    systemPrompt: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    temperature: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maxTokens: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    temperature: number;
    maxTokens: number;
    model?: string | undefined;
    systemPrompt?: string | undefined;
}, {
    prompt: string;
    model?: string | undefined;
    systemPrompt?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
}>;
export declare const openRouterResponseSchema: z.ZodObject<{
    id: z.ZodString;
    model: z.ZodString;
    content: z.ZodString;
    llmCallSucceeded: z.ZodDefault<z.ZodBoolean>;
    degradedReason: z.ZodOptional<z.ZodEnum<["missing_api_key", "http_error", "network_error"]>>;
    usage: z.ZodOptional<z.ZodObject<{
        promptTokens: z.ZodDefault<z.ZodNumber>;
        completionTokens: z.ZodDefault<z.ZodNumber>;
        totalTokens: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    }, {
        promptTokens?: number | undefined;
        completionTokens?: number | undefined;
        totalTokens?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    model: string;
    content: string;
    llmCallSucceeded: boolean;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    } | undefined;
    degradedReason?: "missing_api_key" | "http_error" | "network_error" | undefined;
}, {
    id: string;
    model: string;
    content: string;
    usage?: {
        promptTokens?: number | undefined;
        completionTokens?: number | undefined;
        totalTokens?: number | undefined;
    } | undefined;
    llmCallSucceeded?: boolean | undefined;
    degradedReason?: "missing_api_key" | "http_error" | "network_error" | undefined;
}>;
export type OpenRouterRequest = z.input<typeof openRouterRequestSchema>;
export type OpenRouterResponse = z.infer<typeof openRouterResponseSchema>;
export declare class OpenRouterClient {
    private readonly apiKey;
    private readonly defaultModel;
    private readonly baseUrl;
    constructor(apiKey?: string, defaultModel?: string);
    /**
     * Sends a completion request to OpenRouter API (defaults to nvidia/nemotron-3-super:free).
     */
    complete(request: OpenRouterRequest): Promise<OpenRouterResponse>;
}
