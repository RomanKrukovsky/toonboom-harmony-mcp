import { z } from 'zod';
export declare const PointSchema: z.ZodObject<{
    name: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    normalizedX: z.ZodNumber;
    normalizedY: z.ZodNumber;
    confidence: z.ZodNumber;
    visible: z.ZodBoolean;
    sourceModel: z.ZodString;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    confidence: number;
    name: string;
    visible: boolean;
    normalizedX: number;
    normalizedY: number;
    sourceModel: string;
}, {
    x: number;
    y: number;
    confidence: number;
    name: string;
    visible: boolean;
    normalizedX: number;
    normalizedY: number;
    sourceModel: string;
}>;
export declare const CharacterTopologyPIRSchema: z.ZodObject<{
    version: z.ZodString;
    characterId: z.ZodString;
    points: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
        normalizedX: z.ZodNumber;
        normalizedY: z.ZodNumber;
        confidence: z.ZodNumber;
        visible: z.ZodBoolean;
        sourceModel: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        confidence: number;
        name: string;
        visible: boolean;
        normalizedX: number;
        normalizedY: number;
        sourceModel: string;
    }, {
        x: number;
        y: number;
        confidence: number;
        name: string;
        visible: boolean;
        normalizedX: number;
        normalizedY: number;
        sourceModel: string;
    }>, "many">;
    requiresHumanReview: z.ZodBoolean;
    missingOrUnreliableJoints: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    points: {
        x: number;
        y: number;
        confidence: number;
        name: string;
        visible: boolean;
        normalizedX: number;
        normalizedY: number;
        sourceModel: string;
    }[];
    version: string;
    requiresHumanReview: boolean;
    characterId: string;
    missingOrUnreliableJoints: string[];
}, {
    points: {
        x: number;
        y: number;
        confidence: number;
        name: string;
        visible: boolean;
        normalizedX: number;
        normalizedY: number;
        sourceModel: string;
    }[];
    version: string;
    requiresHumanReview: boolean;
    characterId: string;
    missingOrUnreliableJoints: string[];
}>;
export type Point = z.infer<typeof PointSchema>;
export type CharacterTopologyPIR = z.infer<typeof CharacterTopologyPIRSchema>;
export declare class PivotEstimator {
    static estimate(rawSkeleton: any, characterId: string): CharacterTopologyPIR;
}
