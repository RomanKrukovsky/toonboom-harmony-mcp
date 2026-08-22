import { z } from 'zod';
/**
 * Tool definition helpers.
 *
 * Historically every tool was written as:
 *
 *   { name, description, inputSchema: z.object({ ... }), handler: async (args: any) => ... }
 *
 * The `any` threw away the type information the Zod schema right next to it
 * already carried, so a typo in `args.someField` compiled fine and only broke
 * at runtime. `defineTool` keeps the exact same object shape but infers the
 * handler parameter from `inputSchema`, so `args` is fully typed for free.
 *
 * Usage:
 *
 *   defineTool({
 *     name: 'harmony.scene.open',
 *     description: '...',
 *     inputSchema: z.object({ projectPath: z.string(), dryRun: z.boolean().optional() }),
 *     handler: async (args) => {
 *       args.projectPath;  // string
 *       args.missing;      // compile error
 *     }
 *   })
 *
 * The dispatcher in src/index.ts validates arguments with `inputSchema.safeParse`
 * before calling `handler`, so the inferred type is what the handler actually
 * receives at runtime — the inference is sound, not a cast.
 */
/** A tool whose handler argument is inferred from its Zod input schema. */
export interface TypedTool<S extends z.ZodTypeAny = z.ZodTypeAny> {
    name: string;
    description: string;
    inputSchema: S;
    handler: (args: z.infer<S>) => Promise<any> | any;
}
/**
 * Identity function that pins `args` to `z.infer<inputSchema>`.
 *
 * Returns the definition unchanged, so it is a drop-in replacement for a bare
 * object literal and existing registration code (`...someTools`) keeps working.
 */
export declare function defineTool<S extends z.ZodTypeAny>(tool: {
    name: string;
    description: string;
    inputSchema: S;
    handler: (args: z.infer<S>) => Promise<any> | any;
}): TypedTool<S>;
/**
 * Wraps an array of tool definitions, inferring each handler's argument type
 * individually. Use this to convert a whole `export const xTools = [...]` block
 * without touching each entry:
 *
 *   export const sceneTools = defineTools([ { ... }, { ... } ]);
 */
export declare function defineTools<T extends readonly TypedTool<any>[]>(tools: T): T;
