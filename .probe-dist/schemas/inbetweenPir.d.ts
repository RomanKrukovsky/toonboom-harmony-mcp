import { z } from 'zod';
export declare const inbetweenFrameSchema: z.ZodObject<{
    frameNumber: z.ZodNumber;
    rasterImagePath: z.ZodString;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    frameNumber: number;
    rasterImagePath: string;
}, {
    confidence: number;
    frameNumber: number;
    rasterImagePath: string;
}>;
export declare const inbetweenPirSchema: z.ZodObject<{
    format: z.ZodLiteral<"InbetweenPIR">;
    version: z.ZodLiteral<"1.0.0">;
    sourceKeyframes: z.ZodTuple<[z.ZodObject<{
        frame: z.ZodNumber;
        path: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
        frame: number;
    }, {
        path: string;
        frame: number;
    }>, z.ZodObject<{
        frame: z.ZodNumber;
        path: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
        frame: number;
    }, {
        path: string;
        frame: number;
    }>], null>;
    inbetweens: z.ZodArray<z.ZodObject<{
        frameNumber: z.ZodNumber;
        rasterImagePath: z.ZodString;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        frameNumber: number;
        rasterImagePath: string;
    }, {
        confidence: number;
        frameNumber: number;
        rasterImagePath: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    version: "1.0.0";
    format: "InbetweenPIR";
    sourceKeyframes: [{
        path: string;
        frame: number;
    }, {
        path: string;
        frame: number;
    }];
    inbetweens: {
        confidence: number;
        frameNumber: number;
        rasterImagePath: string;
    }[];
}, {
    version: "1.0.0";
    format: "InbetweenPIR";
    sourceKeyframes: [{
        path: string;
        frame: number;
    }, {
        path: string;
        frame: number;
    }];
    inbetweens: {
        confidence: number;
        frameNumber: number;
        rasterImagePath: string;
    }[];
}>;
export type InbetweenFrame = z.infer<typeof inbetweenFrameSchema>;
export type InbetweenPIR = z.infer<typeof inbetweenPirSchema>;
