import { z } from 'zod';
export declare const projectPathSchema: z.ZodOptional<z.ZodString>;
export declare const confirmationSchema: z.ZodObject<{
    confirm: z.ZodOptional<z.ZodBoolean>;
    confirmationText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    confirm?: boolean | undefined;
    confirmationText?: string | undefined;
}, {
    confirm?: boolean | undefined;
    confirmationText?: string | undefined;
}>;
export declare const dryRunSchema: z.ZodOptional<z.ZodBoolean>;
