import { z } from 'zod';
export declare const harmonyNativePhase2Tools: ({
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        manifest: z.ZodEffects<z.ZodObject<{
            schemaVersion: z.ZodDefault<z.ZodString>;
            manifestId: z.ZodString;
            createdAt: z.ZodString;
            mode: z.ZodEnum<["frame_by_frame_vector"]>;
            source: z.ZodObject<{
                videoPath: z.ZodString;
                sha256: z.ZodString;
                width: z.ZodNumber;
                height: z.ZodNumber;
                fps: z.ZodNumber;
                timeBase: z.ZodString;
                durationSeconds: z.ZodNumber;
                frameCount: z.ZodNumber;
                variableFrameRate: z.ZodBoolean;
                rotation: z.ZodNumber;
                colorSpace: z.ZodString;
                hasAlpha: z.ZodBoolean;
            }, "strict", z.ZodTypeAny, {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            }, {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            }>;
            scene: z.ZodObject<{
                name: z.ZodString;
                width: z.ZodNumber;
                height: z.ZodNumber;
                fps: z.ZodNumber;
                startFrame: z.ZodLiteral<1>;
                endFrame: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            }, {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            }>;
            palettes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                colors: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                    rgba: z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>;
                    originalRgba: z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>;
                    replacementError: z.ZodNumber;
                    confidence: z.ZodDefault<z.ZodNumber>;
                    artistModified: z.ZodDefault<z.ZodBoolean>;
                    artistLocked: z.ZodDefault<z.ZodBoolean>;
                }, "strict", z.ZodTypeAny, {
                    id: string;
                    confidence: number;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    artistModified: boolean;
                    artistLocked: boolean;
                }, {
                    id: string;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    confidence?: number | undefined;
                    artistModified?: boolean | undefined;
                    artistLocked?: boolean | undefined;
                }>, "many">;
            }, "strict", z.ZodTypeAny, {
                id: string;
                name: string;
                colors: {
                    id: string;
                    confidence: number;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    artistModified: boolean;
                    artistLocked: boolean;
                }[];
            }, {
                id: string;
                name: string;
                colors: {
                    id: string;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    confidence?: number | undefined;
                    artistModified?: boolean | undefined;
                    artistLocked?: boolean | undefined;
                }[];
            }>, "many">;
            elements: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                nodeName: z.ZodString;
                drawingIds: z.ZodArray<z.ZodString, "many">;
                locked: z.ZodBoolean;
                artistModified: z.ZodDefault<z.ZodBoolean>;
                artistLocked: z.ZodDefault<z.ZodBoolean>;
            }, "strict", z.ZodTypeAny, {
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
            }, {
                id: string;
                name: string;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }>, "many">;
            drawings: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                sourceFrame: z.ZodNumber;
                normalizedImagePath: z.ZodString;
                shapes: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    colorId: z.ZodString;
                    closed: z.ZodLiteral<true>;
                    points: z.ZodArray<z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                    }, "strict", z.ZodTypeAny, {
                        x: number;
                        y: number;
                    }, {
                        x: number;
                        y: number;
                    }>, "many">;
                    area: z.ZodNumber;
                    source: z.ZodObject<{
                        frame: z.ZodNumber;
                        method: z.ZodEnum<["contour_trace", "harmony_vectorize"]>;
                    }, "strict", z.ZodTypeAny, {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    }, {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    }>;
                    confidence: z.ZodDefault<z.ZodNumber>;
                    uncertaintyCategories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                }, "strict", z.ZodTypeAny, {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence: number;
                    uncertaintyCategories: string[];
                }, {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence?: number | undefined;
                    uncertaintyCategories?: string[] | undefined;
                }>, "many">;
                pointCount: z.ZodNumber;
                locked: z.ZodDefault<z.ZodBoolean>;
                artistModified: z.ZodDefault<z.ZodBoolean>;
                artistLocked: z.ZodDefault<z.ZodBoolean>;
                confidence: z.ZodDefault<z.ZodNumber>;
                uncertaintyCategories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                provenance: z.ZodDefault<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                id: string;
                confidence: number;
                uncertaintyCategories: string[];
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence: number;
                    uncertaintyCategories: string[];
                }[];
                pointCount: number;
                locked: boolean;
                provenance: string;
            }, {
                id: string;
                name: string;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence?: number | undefined;
                    uncertaintyCategories?: string[] | undefined;
                }[];
                pointCount: number;
                confidence?: number | undefined;
                uncertaintyCategories?: string[] | undefined;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
                locked?: boolean | undefined;
                provenance?: string | undefined;
            }>, "many">;
            exposures: z.ZodArray<z.ZodObject<{
                frame: z.ZodNumber;
                duration: z.ZodNumber;
                drawingId: z.ZodString;
                confidence: z.ZodDefault<z.ZodNumber>;
            }, "strict", z.ZodTypeAny, {
                frame: number;
                confidence: number;
                duration: number;
                drawingId: string;
            }, {
                frame: number;
                duration: number;
                drawingId: string;
                confidence?: number | undefined;
            }>, "many">;
            nodes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodEnum<["READ", "COMPOSITE", "DISPLAY"]>;
                autoCreated: z.ZodBoolean;
                locked: z.ZodBoolean;
                artistModified: z.ZodDefault<z.ZodBoolean>;
                artistLocked: z.ZodDefault<z.ZodBoolean>;
            }, "strict", z.ZodTypeAny, {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                autoCreated: boolean;
            }, {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                locked: boolean;
                autoCreated: boolean;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }>, "many">;
            connections: z.ZodArray<z.ZodObject<{
                from: z.ZodString;
                to: z.ZodString;
                fromPort: z.ZodNumber;
                toPort: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }, {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }>, "many">;
            diagnostics: z.ZodObject<{
                uniqueDrawingCount: z.ZodNumber;
                duplicateFrameCount: z.ZodNumber;
                paletteColorCount: z.ZodNumber;
                totalPointCount: z.ZodNumber;
                warnings: z.ZodArray<z.ZodString, "many">;
                stageDurationsMs: z.ZodRecord<z.ZodString, z.ZodNumber>;
                capability: z.ZodObject<{
                    vectorBackend: z.ZodEnum<["python_dom_shapes", "harmony_vectorize"]>;
                    lineArt: z.ZodBoolean;
                    colourArt: z.ZodBoolean;
                    nativeTvgRequired: z.ZodLiteral<true>;
                }, "strict", z.ZodTypeAny, {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                }, {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                }>;
                problemFrames: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    frame: z.ZodNumber;
                    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
                    category: z.ZodString;
                    sourcePreviewPath: z.ZodString;
                    vectorPreviewPath: z.ZodString;
                    differencePreviewPath: z.ZodString;
                    affectedDrawingId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                    metrics: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
                    recommendedAction: z.ZodString;
                }, "strict", z.ZodTypeAny, {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    metrics: Record<string, number>;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                }, {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                    metrics?: Record<string, number> | undefined;
                }>, "many">>;
                representationSegments: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    startFrame: z.ZodNumber;
                    endFrame: z.ZodNumber;
                    routingChoice: z.ZodEnum<["frame_by_frame_vector", "peg_transform", "deformer", "substitution"]>;
                    averageConfidence: z.ZodNumber;
                    drawingIds: z.ZodArray<z.ZodString, "many">;
                    problemFrames: z.ZodArray<z.ZodNumber, "many">;
                    explanation: z.ZodString;
                }, "strict", z.ZodTypeAny, {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }, {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }>, "many">>;
            }, "strict", z.ZodTypeAny, {
                problemFrames: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    metrics: Record<string, number>;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                }[];
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                representationSegments: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[];
            }, {
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                problemFrames?: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                    metrics?: Record<string, number> | undefined;
                }[] | undefined;
                representationSegments?: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[] | undefined;
            }>;
            provenance: z.ZodNullable<z.ZodOptional<z.ZodObject<{
                tool: z.ZodDefault<z.ZodString>;
                version: z.ZodDefault<z.ZodString>;
                arguments: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
                timestamp: z.ZodString;
            }, "strict", z.ZodTypeAny, {
                tool: string;
                version: string;
                arguments: Record<string, any>;
                timestamp: string;
            }, {
                timestamp: string;
                tool?: string | undefined;
                version?: string | undefined;
                arguments?: Record<string, any> | undefined;
            }>>>;
            selectedHypothesis: z.ZodNullable<z.ZodOptional<z.ZodObject<{
                selectedHypothesisId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                selectedRanges: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    startFrame: z.ZodNumber;
                    endFrame: z.ZodNumber;
                    hypothesisId: z.ZodString;
                }, "strict", z.ZodTypeAny, {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }, {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }>, "many">>;
                selectionHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    selectedHypothesisId: z.ZodString;
                    selectedRanges: z.ZodArray<z.ZodObject<{
                        startFrame: z.ZodNumber;
                        endFrame: z.ZodNumber;
                        hypothesisId: z.ZodString;
                    }, "strict", z.ZodTypeAny, {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }, {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }>, "many">;
                    selectionReason: z.ZodString;
                    selectedBy: z.ZodString;
                    selectedAt: z.ZodString;
                }, "strict", z.ZodTypeAny, {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }, {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }>, "many">>;
                selectionReason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                selectedBy: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                selectedAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            }, "strict", z.ZodTypeAny, {
                selectedRanges: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[];
                selectionHistory: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[];
                selectedHypothesisId?: string | null | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
            }, {
                selectedHypothesisId?: string | null | undefined;
                selectedRanges?: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[] | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
                selectionHistory?: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[] | undefined;
            }>>>;
            transformTracks: z.ZodDefault<z.ZodArray<z.ZodObject<{
                trackId: z.ZodString;
                targetElementId: z.ZodString;
                targetDrawingId: z.ZodString;
                pivot: z.ZodDefault<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
                segments: z.ZodArray<z.ZodObject<{
                    startFrame: z.ZodNumber;
                    endFrame: z.ZodNumber;
                    keyframes: z.ZodArray<z.ZodObject<{
                        frame: z.ZodNumber;
                        positionX: z.ZodNumber;
                        positionY: z.ZodNumber;
                        rotation: z.ZodNumber;
                        scaleX: z.ZodNumber;
                        scaleY: z.ZodNumber;
                        skew: z.ZodNumber;
                        pivotX: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
                        pivotY: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
                    }, "strict", z.ZodTypeAny, {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }, {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }>, "many">;
                    interpolation: z.ZodDefault<z.ZodString>;
                    confidence: z.ZodDefault<z.ZodNumber>;
                    residualError: z.ZodDefault<z.ZodNumber>;
                    fallbackReason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                }, "strict", z.ZodTypeAny, {
                    confidence: number;
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    interpolation: string;
                    residualError: number;
                    fallbackReason?: string | null | undefined;
                }, {
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    confidence?: number | undefined;
                    interpolation?: string | undefined;
                    residualError?: number | undefined;
                    fallbackReason?: string | null | undefined;
                }>, "many">;
                provenance: z.ZodDefault<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                provenance: string;
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                pivot: [number, number];
                segments: {
                    confidence: number;
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    interpolation: string;
                    residualError: number;
                    fallbackReason?: string | null | undefined;
                }[];
            }, {
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                segments: {
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    confidence?: number | undefined;
                    interpolation?: string | undefined;
                    residualError?: number | undefined;
                    fallbackReason?: string | null | undefined;
                }[];
                provenance?: string | undefined;
                pivot?: [number, number] | undefined;
            }>, "many">>;
        }, "strict", z.ZodTypeAny, {
            source: {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            };
            schemaVersion: string;
            manifestId: string;
            createdAt: string;
            mode: "frame_by_frame_vector";
            scene: {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            };
            palettes: {
                id: string;
                name: string;
                colors: {
                    id: string;
                    confidence: number;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    artistModified: boolean;
                    artistLocked: boolean;
                }[];
            }[];
            elements: {
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
            }[];
            drawings: {
                id: string;
                confidence: number;
                uncertaintyCategories: string[];
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence: number;
                    uncertaintyCategories: string[];
                }[];
                pointCount: number;
                locked: boolean;
                provenance: string;
            }[];
            exposures: {
                frame: number;
                confidence: number;
                duration: number;
                drawingId: string;
            }[];
            nodes: {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                autoCreated: boolean;
            }[];
            connections: {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }[];
            diagnostics: {
                problemFrames: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    metrics: Record<string, number>;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                }[];
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                representationSegments: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[];
            };
            transformTracks: {
                provenance: string;
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                pivot: [number, number];
                segments: {
                    confidence: number;
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    interpolation: string;
                    residualError: number;
                    fallbackReason?: string | null | undefined;
                }[];
            }[];
            provenance?: {
                tool: string;
                version: string;
                arguments: Record<string, any>;
                timestamp: string;
            } | null | undefined;
            selectedHypothesis?: {
                selectedRanges: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[];
                selectionHistory: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[];
                selectedHypothesisId?: string | null | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
            } | null | undefined;
        }, {
            source: {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            };
            manifestId: string;
            createdAt: string;
            mode: "frame_by_frame_vector";
            scene: {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            };
            palettes: {
                id: string;
                name: string;
                colors: {
                    id: string;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    confidence?: number | undefined;
                    artistModified?: boolean | undefined;
                    artistLocked?: boolean | undefined;
                }[];
            }[];
            elements: {
                id: string;
                name: string;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }[];
            drawings: {
                id: string;
                name: string;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence?: number | undefined;
                    uncertaintyCategories?: string[] | undefined;
                }[];
                pointCount: number;
                confidence?: number | undefined;
                uncertaintyCategories?: string[] | undefined;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
                locked?: boolean | undefined;
                provenance?: string | undefined;
            }[];
            exposures: {
                frame: number;
                duration: number;
                drawingId: string;
                confidence?: number | undefined;
            }[];
            nodes: {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                locked: boolean;
                autoCreated: boolean;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }[];
            connections: {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }[];
            diagnostics: {
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                problemFrames?: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                    metrics?: Record<string, number> | undefined;
                }[] | undefined;
                representationSegments?: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[] | undefined;
            };
            provenance?: {
                timestamp: string;
                tool?: string | undefined;
                version?: string | undefined;
                arguments?: Record<string, any> | undefined;
            } | null | undefined;
            schemaVersion?: string | undefined;
            selectedHypothesis?: {
                selectedHypothesisId?: string | null | undefined;
                selectedRanges?: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[] | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
                selectionHistory?: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[] | undefined;
            } | null | undefined;
            transformTracks?: {
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                segments: {
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    confidence?: number | undefined;
                    interpolation?: string | undefined;
                    residualError?: number | undefined;
                    fallbackReason?: string | null | undefined;
                }[];
                provenance?: string | undefined;
                pivot?: [number, number] | undefined;
            }[] | undefined;
        }>, {
            source: {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            };
            schemaVersion: string;
            manifestId: string;
            createdAt: string;
            mode: "frame_by_frame_vector";
            scene: {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            };
            palettes: {
                id: string;
                name: string;
                colors: {
                    id: string;
                    confidence: number;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    artistModified: boolean;
                    artistLocked: boolean;
                }[];
            }[];
            elements: {
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
            }[];
            drawings: {
                id: string;
                confidence: number;
                uncertaintyCategories: string[];
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence: number;
                    uncertaintyCategories: string[];
                }[];
                pointCount: number;
                locked: boolean;
                provenance: string;
            }[];
            exposures: {
                frame: number;
                confidence: number;
                duration: number;
                drawingId: string;
            }[];
            nodes: {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                autoCreated: boolean;
            }[];
            connections: {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }[];
            diagnostics: {
                problemFrames: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    metrics: Record<string, number>;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                }[];
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                representationSegments: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[];
            };
            transformTracks: {
                provenance: string;
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                pivot: [number, number];
                segments: {
                    confidence: number;
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    interpolation: string;
                    residualError: number;
                    fallbackReason?: string | null | undefined;
                }[];
            }[];
            provenance?: {
                tool: string;
                version: string;
                arguments: Record<string, any>;
                timestamp: string;
            } | null | undefined;
            selectedHypothesis?: {
                selectedRanges: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[];
                selectionHistory: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[];
                selectedHypothesisId?: string | null | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
            } | null | undefined;
        }, {
            source: {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            };
            manifestId: string;
            createdAt: string;
            mode: "frame_by_frame_vector";
            scene: {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            };
            palettes: {
                id: string;
                name: string;
                colors: {
                    id: string;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    confidence?: number | undefined;
                    artistModified?: boolean | undefined;
                    artistLocked?: boolean | undefined;
                }[];
            }[];
            elements: {
                id: string;
                name: string;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }[];
            drawings: {
                id: string;
                name: string;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence?: number | undefined;
                    uncertaintyCategories?: string[] | undefined;
                }[];
                pointCount: number;
                confidence?: number | undefined;
                uncertaintyCategories?: string[] | undefined;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
                locked?: boolean | undefined;
                provenance?: string | undefined;
            }[];
            exposures: {
                frame: number;
                duration: number;
                drawingId: string;
                confidence?: number | undefined;
            }[];
            nodes: {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                locked: boolean;
                autoCreated: boolean;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }[];
            connections: {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }[];
            diagnostics: {
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                problemFrames?: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                    metrics?: Record<string, number> | undefined;
                }[] | undefined;
                representationSegments?: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[] | undefined;
            };
            provenance?: {
                timestamp: string;
                tool?: string | undefined;
                version?: string | undefined;
                arguments?: Record<string, any> | undefined;
            } | null | undefined;
            schemaVersion?: string | undefined;
            selectedHypothesis?: {
                selectedHypothesisId?: string | null | undefined;
                selectedRanges?: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[] | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
                selectionHistory?: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[] | undefined;
            } | null | undefined;
            transformTracks?: {
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                segments: {
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    confidence?: number | undefined;
                    interpolation?: string | undefined;
                    residualError?: number | undefined;
                    fallbackReason?: string | null | undefined;
                }[];
                provenance?: string | undefined;
                pivot?: [number, number] | undefined;
            }[] | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        manifest: {
            source: {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            };
            schemaVersion: string;
            manifestId: string;
            createdAt: string;
            mode: "frame_by_frame_vector";
            scene: {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            };
            palettes: {
                id: string;
                name: string;
                colors: {
                    id: string;
                    confidence: number;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    artistModified: boolean;
                    artistLocked: boolean;
                }[];
            }[];
            elements: {
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
            }[];
            drawings: {
                id: string;
                confidence: number;
                uncertaintyCategories: string[];
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence: number;
                    uncertaintyCategories: string[];
                }[];
                pointCount: number;
                locked: boolean;
                provenance: string;
            }[];
            exposures: {
                frame: number;
                confidence: number;
                duration: number;
                drawingId: string;
            }[];
            nodes: {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                autoCreated: boolean;
            }[];
            connections: {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }[];
            diagnostics: {
                problemFrames: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    metrics: Record<string, number>;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                }[];
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                representationSegments: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[];
            };
            transformTracks: {
                provenance: string;
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                pivot: [number, number];
                segments: {
                    confidence: number;
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    interpolation: string;
                    residualError: number;
                    fallbackReason?: string | null | undefined;
                }[];
            }[];
            provenance?: {
                tool: string;
                version: string;
                arguments: Record<string, any>;
                timestamp: string;
            } | null | undefined;
            selectedHypothesis?: {
                selectedRanges: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[];
                selectionHistory: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[];
                selectedHypothesisId?: string | null | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
            } | null | undefined;
        };
    }, {
        manifest: {
            source: {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            };
            manifestId: string;
            createdAt: string;
            mode: "frame_by_frame_vector";
            scene: {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            };
            palettes: {
                id: string;
                name: string;
                colors: {
                    id: string;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    confidence?: number | undefined;
                    artistModified?: boolean | undefined;
                    artistLocked?: boolean | undefined;
                }[];
            }[];
            elements: {
                id: string;
                name: string;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }[];
            drawings: {
                id: string;
                name: string;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence?: number | undefined;
                    uncertaintyCategories?: string[] | undefined;
                }[];
                pointCount: number;
                confidence?: number | undefined;
                uncertaintyCategories?: string[] | undefined;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
                locked?: boolean | undefined;
                provenance?: string | undefined;
            }[];
            exposures: {
                frame: number;
                duration: number;
                drawingId: string;
                confidence?: number | undefined;
            }[];
            nodes: {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                locked: boolean;
                autoCreated: boolean;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }[];
            connections: {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }[];
            diagnostics: {
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                problemFrames?: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                    metrics?: Record<string, number> | undefined;
                }[] | undefined;
                representationSegments?: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[] | undefined;
            };
            provenance?: {
                timestamp: string;
                tool?: string | undefined;
                version?: string | undefined;
                arguments?: Record<string, any> | undefined;
            } | null | undefined;
            schemaVersion?: string | undefined;
            selectedHypothesis?: {
                selectedHypothesisId?: string | null | undefined;
                selectedRanges?: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[] | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
                selectionHistory?: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[] | undefined;
            } | null | undefined;
            transformTracks?: {
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                segments: {
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    confidence?: number | undefined;
                    interpolation?: string | undefined;
                    residualError?: number | undefined;
                    fallbackReason?: string | null | undefined;
                }[];
                provenance?: string | undefined;
                pivot?: [number, number] | undefined;
            }[] | undefined;
        };
    }>;
    handler: (a: any) => Promise<{
        status: string;
        executed: boolean;
        verified: boolean;
        artifactCreated: boolean;
        requiresRealHarmony: boolean;
        plan: {
            status: "implemented_unverified";
            provenance: {
                source: string;
                compiler: "HarmonyCommandPlanV4Compiler v1";
            };
            schemaVersion: "4.0";
            manifestId: string;
            createdAt: string;
            planId: string;
            commands: {
                params: Record<string, any>;
                type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
                verification: {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                };
                commandId: string;
                preconditions: string[];
                destructiveLevel: "none" | "reversible" | "destructive";
                idempotencyKey: string;
                rollback: {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                };
                expectedArtifact: {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                };
            }[];
            requiresRealHarmony: true;
            sourceManifestSha256: string;
            acceptanceGates: string[];
        };
    }>;
} | {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        plan: z.ZodObject<{
            schemaVersion: z.ZodLiteral<"4.0">;
            planId: z.ZodString;
            manifestId: z.ZodString;
            createdAt: z.ZodString;
            status: z.ZodLiteral<"implemented_unverified">;
            requiresRealHarmony: z.ZodLiteral<true>;
            sourceManifestSha256: z.ZodString;
            commands: z.ZodArray<z.ZodObject<{
                commandId: z.ZodString;
                type: z.ZodEnum<["snapshot_project", "create_palette", "add_palette_swatch", "create_drawing_element", "create_drawing", "write_path", "set_exposure", "create_node", "connect_nodes", "create_peg", "attach_drawing_to_peg", "set_peg_pivot", "set_transform_keyframe", "set_transform_interpolation", "save_project", "close_project", "reopen_project", "inspect_native_entities", "render_preview", "compare_render", "rollback_snapshot", "verify_rollback"]>;
                params: z.ZodRecord<z.ZodString, z.ZodAny>;
                preconditions: z.ZodArray<z.ZodString, "many">;
                destructiveLevel: z.ZodEnum<["none", "reversible", "destructive"]>;
                idempotencyKey: z.ZodString;
                rollback: z.ZodObject<{
                    strategy: z.ZodEnum<["none", "delete_created", "restore_snapshot", "reopen_snapshot"]>;
                    snapshotRequired: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                }, {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                }>;
                expectedArtifact: z.ZodObject<{
                    kind: z.ZodString;
                    path: z.ZodNullable<z.ZodString>;
                    nonempty: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                }, {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                }>;
                verification: z.ZodObject<{
                    method: z.ZodString;
                    required: z.ZodBoolean;
                    acceptance: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                }, {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                }>;
            }, "strict", z.ZodTypeAny, {
                params: Record<string, any>;
                type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
                verification: {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                };
                commandId: string;
                preconditions: string[];
                destructiveLevel: "none" | "reversible" | "destructive";
                idempotencyKey: string;
                rollback: {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                };
                expectedArtifact: {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                };
            }, {
                params: Record<string, any>;
                type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
                verification: {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                };
                commandId: string;
                preconditions: string[];
                destructiveLevel: "none" | "reversible" | "destructive";
                idempotencyKey: string;
                rollback: {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                };
                expectedArtifact: {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                };
            }>, "many">;
            acceptanceGates: z.ZodArray<z.ZodString, "many">;
            provenance: z.ZodObject<{
                compiler: z.ZodLiteral<"HarmonyCommandPlanV4Compiler v1">;
                source: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                source: string;
                compiler: "HarmonyCommandPlanV4Compiler v1";
            }, {
                source: string;
                compiler: "HarmonyCommandPlanV4Compiler v1";
            }>;
        }, "strict", z.ZodTypeAny, {
            status: "implemented_unverified";
            provenance: {
                source: string;
                compiler: "HarmonyCommandPlanV4Compiler v1";
            };
            schemaVersion: "4.0";
            manifestId: string;
            createdAt: string;
            planId: string;
            commands: {
                params: Record<string, any>;
                type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
                verification: {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                };
                commandId: string;
                preconditions: string[];
                destructiveLevel: "none" | "reversible" | "destructive";
                idempotencyKey: string;
                rollback: {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                };
                expectedArtifact: {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                };
            }[];
            requiresRealHarmony: true;
            sourceManifestSha256: string;
            acceptanceGates: string[];
        }, {
            status: "implemented_unverified";
            provenance: {
                source: string;
                compiler: "HarmonyCommandPlanV4Compiler v1";
            };
            schemaVersion: "4.0";
            manifestId: string;
            createdAt: string;
            planId: string;
            commands: {
                params: Record<string, any>;
                type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
                verification: {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                };
                commandId: string;
                preconditions: string[];
                destructiveLevel: "none" | "reversible" | "destructive";
                idempotencyKey: string;
                rollback: {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                };
                expectedArtifact: {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                };
            }[];
            requiresRealHarmony: true;
            sourceManifestSha256: string;
            acceptanceGates: string[];
        }>;
    }, "strip", z.ZodTypeAny, {
        plan: {
            status: "implemented_unverified";
            provenance: {
                source: string;
                compiler: "HarmonyCommandPlanV4Compiler v1";
            };
            schemaVersion: "4.0";
            manifestId: string;
            createdAt: string;
            planId: string;
            commands: {
                params: Record<string, any>;
                type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
                verification: {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                };
                commandId: string;
                preconditions: string[];
                destructiveLevel: "none" | "reversible" | "destructive";
                idempotencyKey: string;
                rollback: {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                };
                expectedArtifact: {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                };
            }[];
            requiresRealHarmony: true;
            sourceManifestSha256: string;
            acceptanceGates: string[];
        };
    }, {
        plan: {
            status: "implemented_unverified";
            provenance: {
                source: string;
                compiler: "HarmonyCommandPlanV4Compiler v1";
            };
            schemaVersion: "4.0";
            manifestId: string;
            createdAt: string;
            planId: string;
            commands: {
                params: Record<string, any>;
                type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
                verification: {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                };
                commandId: string;
                preconditions: string[];
                destructiveLevel: "none" | "reversible" | "destructive";
                idempotencyKey: string;
                rollback: {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                };
                expectedArtifact: {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                };
            }[];
            requiresRealHarmony: true;
            sourceManifestSha256: string;
            acceptanceGates: string[];
        };
    }>;
    handler: (a: any) => Promise<{
        status: string;
        executed: boolean;
        verified: boolean;
        artifactCreated: boolean;
        requiresRealHarmony: boolean;
        errors: string[];
        checks: {
            commandCount: number;
            uniqueIdempotencyKeys: number;
            acceptanceGateCount: number;
            offlineContractValid: boolean;
        };
        warnings: string[];
    }>;
} | {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        plan: z.ZodObject<{
            schemaVersion: z.ZodLiteral<"4.0">;
            planId: z.ZodString;
            manifestId: z.ZodString;
            createdAt: z.ZodString;
            status: z.ZodLiteral<"implemented_unverified">;
            requiresRealHarmony: z.ZodLiteral<true>;
            sourceManifestSha256: z.ZodString;
            commands: z.ZodArray<z.ZodObject<{
                commandId: z.ZodString;
                type: z.ZodEnum<["snapshot_project", "create_palette", "add_palette_swatch", "create_drawing_element", "create_drawing", "write_path", "set_exposure", "create_node", "connect_nodes", "create_peg", "attach_drawing_to_peg", "set_peg_pivot", "set_transform_keyframe", "set_transform_interpolation", "save_project", "close_project", "reopen_project", "inspect_native_entities", "render_preview", "compare_render", "rollback_snapshot", "verify_rollback"]>;
                params: z.ZodRecord<z.ZodString, z.ZodAny>;
                preconditions: z.ZodArray<z.ZodString, "many">;
                destructiveLevel: z.ZodEnum<["none", "reversible", "destructive"]>;
                idempotencyKey: z.ZodString;
                rollback: z.ZodObject<{
                    strategy: z.ZodEnum<["none", "delete_created", "restore_snapshot", "reopen_snapshot"]>;
                    snapshotRequired: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                }, {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                }>;
                expectedArtifact: z.ZodObject<{
                    kind: z.ZodString;
                    path: z.ZodNullable<z.ZodString>;
                    nonempty: z.ZodBoolean;
                }, "strip", z.ZodTypeAny, {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                }, {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                }>;
                verification: z.ZodObject<{
                    method: z.ZodString;
                    required: z.ZodBoolean;
                    acceptance: z.ZodArray<z.ZodString, "many">;
                }, "strip", z.ZodTypeAny, {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                }, {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                }>;
            }, "strict", z.ZodTypeAny, {
                params: Record<string, any>;
                type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
                verification: {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                };
                commandId: string;
                preconditions: string[];
                destructiveLevel: "none" | "reversible" | "destructive";
                idempotencyKey: string;
                rollback: {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                };
                expectedArtifact: {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                };
            }, {
                params: Record<string, any>;
                type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
                verification: {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                };
                commandId: string;
                preconditions: string[];
                destructiveLevel: "none" | "reversible" | "destructive";
                idempotencyKey: string;
                rollback: {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                };
                expectedArtifact: {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                };
            }>, "many">;
            acceptanceGates: z.ZodArray<z.ZodString, "many">;
            provenance: z.ZodObject<{
                compiler: z.ZodLiteral<"HarmonyCommandPlanV4Compiler v1">;
                source: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                source: string;
                compiler: "HarmonyCommandPlanV4Compiler v1";
            }, {
                source: string;
                compiler: "HarmonyCommandPlanV4Compiler v1";
            }>;
        }, "strict", z.ZodTypeAny, {
            status: "implemented_unverified";
            provenance: {
                source: string;
                compiler: "HarmonyCommandPlanV4Compiler v1";
            };
            schemaVersion: "4.0";
            manifestId: string;
            createdAt: string;
            planId: string;
            commands: {
                params: Record<string, any>;
                type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
                verification: {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                };
                commandId: string;
                preconditions: string[];
                destructiveLevel: "none" | "reversible" | "destructive";
                idempotencyKey: string;
                rollback: {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                };
                expectedArtifact: {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                };
            }[];
            requiresRealHarmony: true;
            sourceManifestSha256: string;
            acceptanceGates: string[];
        }, {
            status: "implemented_unverified";
            provenance: {
                source: string;
                compiler: "HarmonyCommandPlanV4Compiler v1";
            };
            schemaVersion: "4.0";
            manifestId: string;
            createdAt: string;
            planId: string;
            commands: {
                params: Record<string, any>;
                type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
                verification: {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                };
                commandId: string;
                preconditions: string[];
                destructiveLevel: "none" | "reversible" | "destructive";
                idempotencyKey: string;
                rollback: {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                };
                expectedArtifact: {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                };
            }[];
            requiresRealHarmony: true;
            sourceManifestSha256: string;
            acceptanceGates: string[];
        }>;
        manifest: z.ZodEffects<z.ZodObject<{
            schemaVersion: z.ZodDefault<z.ZodString>;
            manifestId: z.ZodString;
            createdAt: z.ZodString;
            mode: z.ZodEnum<["frame_by_frame_vector"]>;
            source: z.ZodObject<{
                videoPath: z.ZodString;
                sha256: z.ZodString;
                width: z.ZodNumber;
                height: z.ZodNumber;
                fps: z.ZodNumber;
                timeBase: z.ZodString;
                durationSeconds: z.ZodNumber;
                frameCount: z.ZodNumber;
                variableFrameRate: z.ZodBoolean;
                rotation: z.ZodNumber;
                colorSpace: z.ZodString;
                hasAlpha: z.ZodBoolean;
            }, "strict", z.ZodTypeAny, {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            }, {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            }>;
            scene: z.ZodObject<{
                name: z.ZodString;
                width: z.ZodNumber;
                height: z.ZodNumber;
                fps: z.ZodNumber;
                startFrame: z.ZodLiteral<1>;
                endFrame: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            }, {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            }>;
            palettes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                colors: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                    rgba: z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>;
                    originalRgba: z.ZodTuple<[z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber], null>;
                    replacementError: z.ZodNumber;
                    confidence: z.ZodDefault<z.ZodNumber>;
                    artistModified: z.ZodDefault<z.ZodBoolean>;
                    artistLocked: z.ZodDefault<z.ZodBoolean>;
                }, "strict", z.ZodTypeAny, {
                    id: string;
                    confidence: number;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    artistModified: boolean;
                    artistLocked: boolean;
                }, {
                    id: string;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    confidence?: number | undefined;
                    artistModified?: boolean | undefined;
                    artistLocked?: boolean | undefined;
                }>, "many">;
            }, "strict", z.ZodTypeAny, {
                id: string;
                name: string;
                colors: {
                    id: string;
                    confidence: number;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    artistModified: boolean;
                    artistLocked: boolean;
                }[];
            }, {
                id: string;
                name: string;
                colors: {
                    id: string;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    confidence?: number | undefined;
                    artistModified?: boolean | undefined;
                    artistLocked?: boolean | undefined;
                }[];
            }>, "many">;
            elements: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                nodeName: z.ZodString;
                drawingIds: z.ZodArray<z.ZodString, "many">;
                locked: z.ZodBoolean;
                artistModified: z.ZodDefault<z.ZodBoolean>;
                artistLocked: z.ZodDefault<z.ZodBoolean>;
            }, "strict", z.ZodTypeAny, {
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
            }, {
                id: string;
                name: string;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }>, "many">;
            drawings: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                sourceFrame: z.ZodNumber;
                normalizedImagePath: z.ZodString;
                shapes: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    colorId: z.ZodString;
                    closed: z.ZodLiteral<true>;
                    points: z.ZodArray<z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                    }, "strict", z.ZodTypeAny, {
                        x: number;
                        y: number;
                    }, {
                        x: number;
                        y: number;
                    }>, "many">;
                    area: z.ZodNumber;
                    source: z.ZodObject<{
                        frame: z.ZodNumber;
                        method: z.ZodEnum<["contour_trace", "harmony_vectorize"]>;
                    }, "strict", z.ZodTypeAny, {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    }, {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    }>;
                    confidence: z.ZodDefault<z.ZodNumber>;
                    uncertaintyCategories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                }, "strict", z.ZodTypeAny, {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence: number;
                    uncertaintyCategories: string[];
                }, {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence?: number | undefined;
                    uncertaintyCategories?: string[] | undefined;
                }>, "many">;
                pointCount: z.ZodNumber;
                locked: z.ZodDefault<z.ZodBoolean>;
                artistModified: z.ZodDefault<z.ZodBoolean>;
                artistLocked: z.ZodDefault<z.ZodBoolean>;
                confidence: z.ZodDefault<z.ZodNumber>;
                uncertaintyCategories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                provenance: z.ZodDefault<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                id: string;
                confidence: number;
                uncertaintyCategories: string[];
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence: number;
                    uncertaintyCategories: string[];
                }[];
                pointCount: number;
                locked: boolean;
                provenance: string;
            }, {
                id: string;
                name: string;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence?: number | undefined;
                    uncertaintyCategories?: string[] | undefined;
                }[];
                pointCount: number;
                confidence?: number | undefined;
                uncertaintyCategories?: string[] | undefined;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
                locked?: boolean | undefined;
                provenance?: string | undefined;
            }>, "many">;
            exposures: z.ZodArray<z.ZodObject<{
                frame: z.ZodNumber;
                duration: z.ZodNumber;
                drawingId: z.ZodString;
                confidence: z.ZodDefault<z.ZodNumber>;
            }, "strict", z.ZodTypeAny, {
                frame: number;
                confidence: number;
                duration: number;
                drawingId: string;
            }, {
                frame: number;
                duration: number;
                drawingId: string;
                confidence?: number | undefined;
            }>, "many">;
            nodes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodEnum<["READ", "COMPOSITE", "DISPLAY"]>;
                autoCreated: z.ZodBoolean;
                locked: z.ZodBoolean;
                artistModified: z.ZodDefault<z.ZodBoolean>;
                artistLocked: z.ZodDefault<z.ZodBoolean>;
            }, "strict", z.ZodTypeAny, {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                autoCreated: boolean;
            }, {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                locked: boolean;
                autoCreated: boolean;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }>, "many">;
            connections: z.ZodArray<z.ZodObject<{
                from: z.ZodString;
                to: z.ZodString;
                fromPort: z.ZodNumber;
                toPort: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }, {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }>, "many">;
            diagnostics: z.ZodObject<{
                uniqueDrawingCount: z.ZodNumber;
                duplicateFrameCount: z.ZodNumber;
                paletteColorCount: z.ZodNumber;
                totalPointCount: z.ZodNumber;
                warnings: z.ZodArray<z.ZodString, "many">;
                stageDurationsMs: z.ZodRecord<z.ZodString, z.ZodNumber>;
                capability: z.ZodObject<{
                    vectorBackend: z.ZodEnum<["python_dom_shapes", "harmony_vectorize"]>;
                    lineArt: z.ZodBoolean;
                    colourArt: z.ZodBoolean;
                    nativeTvgRequired: z.ZodLiteral<true>;
                }, "strict", z.ZodTypeAny, {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                }, {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                }>;
                problemFrames: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    frame: z.ZodNumber;
                    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
                    category: z.ZodString;
                    sourcePreviewPath: z.ZodString;
                    vectorPreviewPath: z.ZodString;
                    differencePreviewPath: z.ZodString;
                    affectedDrawingId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                    metrics: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
                    recommendedAction: z.ZodString;
                }, "strict", z.ZodTypeAny, {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    metrics: Record<string, number>;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                }, {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                    metrics?: Record<string, number> | undefined;
                }>, "many">>;
                representationSegments: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    startFrame: z.ZodNumber;
                    endFrame: z.ZodNumber;
                    routingChoice: z.ZodEnum<["frame_by_frame_vector", "peg_transform", "deformer", "substitution"]>;
                    averageConfidence: z.ZodNumber;
                    drawingIds: z.ZodArray<z.ZodString, "many">;
                    problemFrames: z.ZodArray<z.ZodNumber, "many">;
                    explanation: z.ZodString;
                }, "strict", z.ZodTypeAny, {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }, {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }>, "many">>;
            }, "strict", z.ZodTypeAny, {
                problemFrames: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    metrics: Record<string, number>;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                }[];
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                representationSegments: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[];
            }, {
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                problemFrames?: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                    metrics?: Record<string, number> | undefined;
                }[] | undefined;
                representationSegments?: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[] | undefined;
            }>;
            provenance: z.ZodNullable<z.ZodOptional<z.ZodObject<{
                tool: z.ZodDefault<z.ZodString>;
                version: z.ZodDefault<z.ZodString>;
                arguments: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
                timestamp: z.ZodString;
            }, "strict", z.ZodTypeAny, {
                tool: string;
                version: string;
                arguments: Record<string, any>;
                timestamp: string;
            }, {
                timestamp: string;
                tool?: string | undefined;
                version?: string | undefined;
                arguments?: Record<string, any> | undefined;
            }>>>;
            selectedHypothesis: z.ZodNullable<z.ZodOptional<z.ZodObject<{
                selectedHypothesisId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                selectedRanges: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    startFrame: z.ZodNumber;
                    endFrame: z.ZodNumber;
                    hypothesisId: z.ZodString;
                }, "strict", z.ZodTypeAny, {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }, {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }>, "many">>;
                selectionHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    selectedHypothesisId: z.ZodString;
                    selectedRanges: z.ZodArray<z.ZodObject<{
                        startFrame: z.ZodNumber;
                        endFrame: z.ZodNumber;
                        hypothesisId: z.ZodString;
                    }, "strict", z.ZodTypeAny, {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }, {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }>, "many">;
                    selectionReason: z.ZodString;
                    selectedBy: z.ZodString;
                    selectedAt: z.ZodString;
                }, "strict", z.ZodTypeAny, {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }, {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }>, "many">>;
                selectionReason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                selectedBy: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                selectedAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            }, "strict", z.ZodTypeAny, {
                selectedRanges: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[];
                selectionHistory: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[];
                selectedHypothesisId?: string | null | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
            }, {
                selectedHypothesisId?: string | null | undefined;
                selectedRanges?: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[] | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
                selectionHistory?: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[] | undefined;
            }>>>;
            transformTracks: z.ZodDefault<z.ZodArray<z.ZodObject<{
                trackId: z.ZodString;
                targetElementId: z.ZodString;
                targetDrawingId: z.ZodString;
                pivot: z.ZodDefault<z.ZodTuple<[z.ZodNumber, z.ZodNumber], null>>;
                segments: z.ZodArray<z.ZodObject<{
                    startFrame: z.ZodNumber;
                    endFrame: z.ZodNumber;
                    keyframes: z.ZodArray<z.ZodObject<{
                        frame: z.ZodNumber;
                        positionX: z.ZodNumber;
                        positionY: z.ZodNumber;
                        rotation: z.ZodNumber;
                        scaleX: z.ZodNumber;
                        scaleY: z.ZodNumber;
                        skew: z.ZodNumber;
                        pivotX: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
                        pivotY: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
                    }, "strict", z.ZodTypeAny, {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }, {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }>, "many">;
                    interpolation: z.ZodDefault<z.ZodString>;
                    confidence: z.ZodDefault<z.ZodNumber>;
                    residualError: z.ZodDefault<z.ZodNumber>;
                    fallbackReason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
                }, "strict", z.ZodTypeAny, {
                    confidence: number;
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    interpolation: string;
                    residualError: number;
                    fallbackReason?: string | null | undefined;
                }, {
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    confidence?: number | undefined;
                    interpolation?: string | undefined;
                    residualError?: number | undefined;
                    fallbackReason?: string | null | undefined;
                }>, "many">;
                provenance: z.ZodDefault<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                provenance: string;
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                pivot: [number, number];
                segments: {
                    confidence: number;
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    interpolation: string;
                    residualError: number;
                    fallbackReason?: string | null | undefined;
                }[];
            }, {
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                segments: {
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    confidence?: number | undefined;
                    interpolation?: string | undefined;
                    residualError?: number | undefined;
                    fallbackReason?: string | null | undefined;
                }[];
                provenance?: string | undefined;
                pivot?: [number, number] | undefined;
            }>, "many">>;
        }, "strict", z.ZodTypeAny, {
            source: {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            };
            schemaVersion: string;
            manifestId: string;
            createdAt: string;
            mode: "frame_by_frame_vector";
            scene: {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            };
            palettes: {
                id: string;
                name: string;
                colors: {
                    id: string;
                    confidence: number;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    artistModified: boolean;
                    artistLocked: boolean;
                }[];
            }[];
            elements: {
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
            }[];
            drawings: {
                id: string;
                confidence: number;
                uncertaintyCategories: string[];
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence: number;
                    uncertaintyCategories: string[];
                }[];
                pointCount: number;
                locked: boolean;
                provenance: string;
            }[];
            exposures: {
                frame: number;
                confidence: number;
                duration: number;
                drawingId: string;
            }[];
            nodes: {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                autoCreated: boolean;
            }[];
            connections: {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }[];
            diagnostics: {
                problemFrames: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    metrics: Record<string, number>;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                }[];
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                representationSegments: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[];
            };
            transformTracks: {
                provenance: string;
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                pivot: [number, number];
                segments: {
                    confidence: number;
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    interpolation: string;
                    residualError: number;
                    fallbackReason?: string | null | undefined;
                }[];
            }[];
            provenance?: {
                tool: string;
                version: string;
                arguments: Record<string, any>;
                timestamp: string;
            } | null | undefined;
            selectedHypothesis?: {
                selectedRanges: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[];
                selectionHistory: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[];
                selectedHypothesisId?: string | null | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
            } | null | undefined;
        }, {
            source: {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            };
            manifestId: string;
            createdAt: string;
            mode: "frame_by_frame_vector";
            scene: {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            };
            palettes: {
                id: string;
                name: string;
                colors: {
                    id: string;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    confidence?: number | undefined;
                    artistModified?: boolean | undefined;
                    artistLocked?: boolean | undefined;
                }[];
            }[];
            elements: {
                id: string;
                name: string;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }[];
            drawings: {
                id: string;
                name: string;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence?: number | undefined;
                    uncertaintyCategories?: string[] | undefined;
                }[];
                pointCount: number;
                confidence?: number | undefined;
                uncertaintyCategories?: string[] | undefined;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
                locked?: boolean | undefined;
                provenance?: string | undefined;
            }[];
            exposures: {
                frame: number;
                duration: number;
                drawingId: string;
                confidence?: number | undefined;
            }[];
            nodes: {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                locked: boolean;
                autoCreated: boolean;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }[];
            connections: {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }[];
            diagnostics: {
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                problemFrames?: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                    metrics?: Record<string, number> | undefined;
                }[] | undefined;
                representationSegments?: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[] | undefined;
            };
            provenance?: {
                timestamp: string;
                tool?: string | undefined;
                version?: string | undefined;
                arguments?: Record<string, any> | undefined;
            } | null | undefined;
            schemaVersion?: string | undefined;
            selectedHypothesis?: {
                selectedHypothesisId?: string | null | undefined;
                selectedRanges?: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[] | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
                selectionHistory?: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[] | undefined;
            } | null | undefined;
            transformTracks?: {
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                segments: {
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    confidence?: number | undefined;
                    interpolation?: string | undefined;
                    residualError?: number | undefined;
                    fallbackReason?: string | null | undefined;
                }[];
                provenance?: string | undefined;
                pivot?: [number, number] | undefined;
            }[] | undefined;
        }>, {
            source: {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            };
            schemaVersion: string;
            manifestId: string;
            createdAt: string;
            mode: "frame_by_frame_vector";
            scene: {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            };
            palettes: {
                id: string;
                name: string;
                colors: {
                    id: string;
                    confidence: number;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    artistModified: boolean;
                    artistLocked: boolean;
                }[];
            }[];
            elements: {
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
            }[];
            drawings: {
                id: string;
                confidence: number;
                uncertaintyCategories: string[];
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence: number;
                    uncertaintyCategories: string[];
                }[];
                pointCount: number;
                locked: boolean;
                provenance: string;
            }[];
            exposures: {
                frame: number;
                confidence: number;
                duration: number;
                drawingId: string;
            }[];
            nodes: {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                autoCreated: boolean;
            }[];
            connections: {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }[];
            diagnostics: {
                problemFrames: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    metrics: Record<string, number>;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                }[];
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                representationSegments: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[];
            };
            transformTracks: {
                provenance: string;
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                pivot: [number, number];
                segments: {
                    confidence: number;
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    interpolation: string;
                    residualError: number;
                    fallbackReason?: string | null | undefined;
                }[];
            }[];
            provenance?: {
                tool: string;
                version: string;
                arguments: Record<string, any>;
                timestamp: string;
            } | null | undefined;
            selectedHypothesis?: {
                selectedRanges: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[];
                selectionHistory: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[];
                selectedHypothesisId?: string | null | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
            } | null | undefined;
        }, {
            source: {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            };
            manifestId: string;
            createdAt: string;
            mode: "frame_by_frame_vector";
            scene: {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            };
            palettes: {
                id: string;
                name: string;
                colors: {
                    id: string;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    confidence?: number | undefined;
                    artistModified?: boolean | undefined;
                    artistLocked?: boolean | undefined;
                }[];
            }[];
            elements: {
                id: string;
                name: string;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }[];
            drawings: {
                id: string;
                name: string;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence?: number | undefined;
                    uncertaintyCategories?: string[] | undefined;
                }[];
                pointCount: number;
                confidence?: number | undefined;
                uncertaintyCategories?: string[] | undefined;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
                locked?: boolean | undefined;
                provenance?: string | undefined;
            }[];
            exposures: {
                frame: number;
                duration: number;
                drawingId: string;
                confidence?: number | undefined;
            }[];
            nodes: {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                locked: boolean;
                autoCreated: boolean;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }[];
            connections: {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }[];
            diagnostics: {
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                problemFrames?: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                    metrics?: Record<string, number> | undefined;
                }[] | undefined;
                representationSegments?: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[] | undefined;
            };
            provenance?: {
                timestamp: string;
                tool?: string | undefined;
                version?: string | undefined;
                arguments?: Record<string, any> | undefined;
            } | null | undefined;
            schemaVersion?: string | undefined;
            selectedHypothesis?: {
                selectedHypothesisId?: string | null | undefined;
                selectedRanges?: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[] | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
                selectionHistory?: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[] | undefined;
            } | null | undefined;
            transformTracks?: {
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                segments: {
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    confidence?: number | undefined;
                    interpolation?: string | undefined;
                    residualError?: number | undefined;
                    fallbackReason?: string | null | undefined;
                }[];
                provenance?: string | undefined;
                pivot?: [number, number] | undefined;
            }[] | undefined;
        }>;
        outputDir: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        outputDir: string;
        plan: {
            status: "implemented_unverified";
            provenance: {
                source: string;
                compiler: "HarmonyCommandPlanV4Compiler v1";
            };
            schemaVersion: "4.0";
            manifestId: string;
            createdAt: string;
            planId: string;
            commands: {
                params: Record<string, any>;
                type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
                verification: {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                };
                commandId: string;
                preconditions: string[];
                destructiveLevel: "none" | "reversible" | "destructive";
                idempotencyKey: string;
                rollback: {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                };
                expectedArtifact: {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                };
            }[];
            requiresRealHarmony: true;
            sourceManifestSha256: string;
            acceptanceGates: string[];
        };
        manifest: {
            source: {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            };
            schemaVersion: string;
            manifestId: string;
            createdAt: string;
            mode: "frame_by_frame_vector";
            scene: {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            };
            palettes: {
                id: string;
                name: string;
                colors: {
                    id: string;
                    confidence: number;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    artistModified: boolean;
                    artistLocked: boolean;
                }[];
            }[];
            elements: {
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
            }[];
            drawings: {
                id: string;
                confidence: number;
                uncertaintyCategories: string[];
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence: number;
                    uncertaintyCategories: string[];
                }[];
                pointCount: number;
                locked: boolean;
                provenance: string;
            }[];
            exposures: {
                frame: number;
                confidence: number;
                duration: number;
                drawingId: string;
            }[];
            nodes: {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                artistModified: boolean;
                artistLocked: boolean;
                locked: boolean;
                autoCreated: boolean;
            }[];
            connections: {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }[];
            diagnostics: {
                problemFrames: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    metrics: Record<string, number>;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                }[];
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                representationSegments: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[];
            };
            transformTracks: {
                provenance: string;
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                pivot: [number, number];
                segments: {
                    confidence: number;
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    interpolation: string;
                    residualError: number;
                    fallbackReason?: string | null | undefined;
                }[];
            }[];
            provenance?: {
                tool: string;
                version: string;
                arguments: Record<string, any>;
                timestamp: string;
            } | null | undefined;
            selectedHypothesis?: {
                selectedRanges: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[];
                selectionHistory: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[];
                selectedHypothesisId?: string | null | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
            } | null | undefined;
        };
    }, {
        outputDir: string;
        plan: {
            status: "implemented_unverified";
            provenance: {
                source: string;
                compiler: "HarmonyCommandPlanV4Compiler v1";
            };
            schemaVersion: "4.0";
            manifestId: string;
            createdAt: string;
            planId: string;
            commands: {
                params: Record<string, any>;
                type: "create_palette" | "add_palette_swatch" | "create_drawing_element" | "create_drawing" | "write_path" | "set_exposure" | "create_node" | "connect_nodes" | "save_project" | "create_peg" | "attach_drawing_to_peg" | "set_peg_pivot" | "set_transform_keyframe" | "set_transform_interpolation" | "render_preview" | "snapshot_project" | "close_project" | "reopen_project" | "inspect_native_entities" | "compare_render" | "rollback_snapshot" | "verify_rollback";
                verification: {
                    method: string;
                    required: boolean;
                    acceptance: string[];
                };
                commandId: string;
                preconditions: string[];
                destructiveLevel: "none" | "reversible" | "destructive";
                idempotencyKey: string;
                rollback: {
                    strategy: "none" | "delete_created" | "restore_snapshot" | "reopen_snapshot";
                    snapshotRequired: boolean;
                };
                expectedArtifact: {
                    path: string | null;
                    kind: string;
                    nonempty: boolean;
                };
            }[];
            requiresRealHarmony: true;
            sourceManifestSha256: string;
            acceptanceGates: string[];
        };
        manifest: {
            source: {
                rotation: number;
                videoPath: string;
                sha256: string;
                width: number;
                height: number;
                fps: number;
                timeBase: string;
                durationSeconds: number;
                frameCount: number;
                variableFrameRate: boolean;
                colorSpace: string;
                hasAlpha: boolean;
            };
            manifestId: string;
            createdAt: string;
            mode: "frame_by_frame_vector";
            scene: {
                name: string;
                startFrame: 1;
                endFrame: number;
                width: number;
                height: number;
                fps: number;
            };
            palettes: {
                id: string;
                name: string;
                colors: {
                    id: string;
                    name: string;
                    rgba: [number, number, number, number];
                    originalRgba: [number, number, number, number];
                    replacementError: number;
                    confidence?: number | undefined;
                    artistModified?: boolean | undefined;
                    artistLocked?: boolean | undefined;
                }[];
            }[];
            elements: {
                id: string;
                name: string;
                locked: boolean;
                drawingIds: string[];
                nodeName: string;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }[];
            drawings: {
                id: string;
                name: string;
                sourceFrame: number;
                normalizedImagePath: string;
                shapes: {
                    id: string;
                    colorId: string;
                    closed: true;
                    points: {
                        x: number;
                        y: number;
                    }[];
                    area: number;
                    source: {
                        frame: number;
                        method: "contour_trace" | "harmony_vectorize";
                    };
                    confidence?: number | undefined;
                    uncertaintyCategories?: string[] | undefined;
                }[];
                pointCount: number;
                confidence?: number | undefined;
                uncertaintyCategories?: string[] | undefined;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
                locked?: boolean | undefined;
                provenance?: string | undefined;
            }[];
            exposures: {
                frame: number;
                duration: number;
                drawingId: string;
                confidence?: number | undefined;
            }[];
            nodes: {
                type: "READ" | "COMPOSITE" | "DISPLAY";
                id: string;
                name: string;
                locked: boolean;
                autoCreated: boolean;
                artistModified?: boolean | undefined;
                artistLocked?: boolean | undefined;
            }[];
            connections: {
                from: string;
                to: string;
                fromPort: number;
                toPort: number;
            }[];
            diagnostics: {
                uniqueDrawingCount: number;
                duplicateFrameCount: number;
                paletteColorCount: number;
                totalPointCount: number;
                warnings: string[];
                stageDurationsMs: Record<string, number>;
                capability: {
                    vectorBackend: "harmony_vectorize" | "python_dom_shapes";
                    lineArt: boolean;
                    colourArt: boolean;
                    nativeTvgRequired: true;
                };
                problemFrames?: {
                    frame: number;
                    severity: "low" | "medium" | "high" | "critical";
                    category: string;
                    sourcePreviewPath: string;
                    vectorPreviewPath: string;
                    differencePreviewPath: string;
                    recommendedAction: string;
                    affectedDrawingId?: string | null | undefined;
                    metrics?: Record<string, number> | undefined;
                }[] | undefined;
                representationSegments?: {
                    startFrame: number;
                    endFrame: number;
                    routingChoice: "frame_by_frame_vector" | "peg_transform" | "deformer" | "substitution";
                    averageConfidence: number;
                    drawingIds: string[];
                    problemFrames: number[];
                    explanation: string;
                }[] | undefined;
            };
            provenance?: {
                timestamp: string;
                tool?: string | undefined;
                version?: string | undefined;
                arguments?: Record<string, any> | undefined;
            } | null | undefined;
            schemaVersion?: string | undefined;
            selectedHypothesis?: {
                selectedHypothesisId?: string | null | undefined;
                selectedRanges?: {
                    startFrame: number;
                    endFrame: number;
                    hypothesisId: string;
                }[] | undefined;
                selectionReason?: string | null | undefined;
                selectedBy?: string | null | undefined;
                selectedAt?: string | null | undefined;
                selectionHistory?: {
                    selectedHypothesisId: string;
                    selectedRanges: {
                        startFrame: number;
                        endFrame: number;
                        hypothesisId: string;
                    }[];
                    selectionReason: string;
                    selectedBy: string;
                    selectedAt: string;
                }[] | undefined;
            } | null | undefined;
            transformTracks?: {
                trackId: string;
                targetElementId: string;
                targetDrawingId: string;
                segments: {
                    startFrame: number;
                    endFrame: number;
                    keyframes: {
                        frame: number;
                        positionX: number;
                        positionY: number;
                        rotation: number;
                        scaleX: number;
                        scaleY: number;
                        skew: number;
                        pivotX?: number | null | undefined;
                        pivotY?: number | null | undefined;
                    }[];
                    confidence?: number | undefined;
                    interpolation?: string | undefined;
                    residualError?: number | undefined;
                    fallbackReason?: string | null | undefined;
                }[];
                provenance?: string | undefined;
                pivot?: [number, number] | undefined;
            }[] | undefined;
        };
    }>;
    handler: (a: any) => Promise<{
        status: string;
        executed: boolean;
        verified: boolean;
        artifactCreated: boolean;
        bundlePath: string;
        files: {
            name: string;
            sha256: string;
            size: number;
        }[];
        warnings: string[];
    }>;
})[];
