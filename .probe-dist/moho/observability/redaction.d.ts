/**
 * Redaction rules for structured logging.
 *
 * Goal: never emit secrets, project content, audio, images, tokens,
 * unredacted absolute paths, full prompt text, or PII.
 *
 * Allowlist-and-pattern based; tested via security tests in __tests__.
 *
 * Design rules that must not be broken:
 * - Every token pattern is global (`g`). A non-global pattern only replaces the
 *   first occurrence, which silently leaks every subsequent secret on the line.
 * - Never call `.test()` on a global regex before `.replace()`: `.test()` advances
 *   `lastIndex` and makes the following match start mid-string. Call `.replace()`
 *   unconditionally instead — it resets `lastIndex` itself.
 * - Unknown object shapes are walked, not passed through. A redaction layer must
 *   fail closed: anything not understood is either walked or replaced by a marker.
 */
export interface RedactionConfig {
    redactAbsoluteHome: boolean;
    redactLongStrings: boolean;
    longStringThreshold: number;
    redactEnvOverrides: string[];
}
export declare function configureRedaction(overrides: Partial<RedactionConfig>): void;
export declare function resetRedaction(): void;
/**
 * Redact fields whose name matches SECRET_KEY_REGEX or whose value looks like a token.
 *
 * Fails closed: arrays are walked element-wise (they used to be returned verbatim,
 * which leaked an entire array of secrets), and unknown object shapes are walked
 * rather than passed through.
 */
export declare function redactObject<T>(input: T, depth?: number, seen?: WeakSet<object>): T;
export declare function redactString(s: string): string;
/** Returns true if a string is an absolute filesystem path that needs to be redacted. */
export declare function looksLikeAbsolutePath(s: string): boolean;
/** Compose home-relative path when possible. */
export declare function safeRelativePath(p: string): string;
