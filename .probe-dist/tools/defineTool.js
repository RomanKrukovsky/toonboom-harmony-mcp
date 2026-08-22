/**
 * Identity function that pins `args` to `z.infer<inputSchema>`.
 *
 * Returns the definition unchanged, so it is a drop-in replacement for a bare
 * object literal and existing registration code (`...someTools`) keeps working.
 */
export function defineTool(tool) {
    return tool;
}
/**
 * Wraps an array of tool definitions, inferring each handler's argument type
 * individually. Use this to convert a whole `export const xTools = [...]` block
 * without touching each entry:
 *
 *   export const sceneTools = defineTools([ { ... }, { ... } ]);
 */
export function defineTools(tools) {
    return tools;
}
