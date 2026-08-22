import { z } from 'zod';
export declare const headAngleSchema: z.ZodEnum<["0", "45", "90", "135", "180"]>;
export declare const rig360SpecSchema: z.ZodObject<{
    specId: z.ZodString;
    characterName: z.ZodString;
    angles: z.ZodRecord<z.ZodEnum<["0", "45", "90", "135", "180"]>, z.ZodObject<{
        pirVersion: z.ZodDefault<z.ZodLiteral<"1.0.0">>;
        characterId: z.ZodString;
        drawingName: z.ZodString;
        frame: z.ZodDefault<z.ZodNumber>;
        coordinateTransform: z.ZodObject<{
            sourceWidth: z.ZodNumber;
            sourceHeight: z.ZodNumber;
            coordinateSystem: z.ZodDefault<z.ZodEnum<["normalized", "harmony_ogl"]>>;
            transformMatrix: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            scale: z.ZodDefault<z.ZodNumber>;
            axisOrientation: z.ZodDefault<z.ZodObject<{
                x: z.ZodEnum<["right"]>;
                y: z.ZodEnum<["up", "down"]>;
            }, "strip", z.ZodTypeAny, {
                x: "right";
                y: "up" | "down";
            }, {
                x: "right";
                y: "up" | "down";
            }>>;
        }, "strip", z.ZodTypeAny, {
            sourceWidth: number;
            sourceHeight: number;
            coordinateSystem: "normalized" | "harmony_ogl";
            transformMatrix: number[];
            scale: number;
            axisOrientation: {
                x: "right";
                y: "up" | "down";
            };
        }, {
            sourceWidth: number;
            sourceHeight: number;
            coordinateSystem?: "normalized" | "harmony_ogl" | undefined;
            transformMatrix?: number[] | undefined;
            scale?: number | undefined;
            axisOrientation?: {
                x: "right";
                y: "up" | "down";
            } | undefined;
        }>;
        layers: z.ZodArray<z.ZodObject<{
            layerId: z.ZodString;
            name: z.ZodString;
            semanticGroup: z.ZodString;
            artLayer: z.ZodEnum<["underlay", "line", "color", "overlay"]>;
            strokes: z.ZodArray<z.ZodObject<{
                strokeId: z.ZodString;
                resultType: z.ZodEnum<["pencil", "brush"]>;
                artLayer: z.ZodDefault<z.ZodEnum<["underlay", "line", "color", "overlay"]>>;
                semanticGroup: z.ZodDefault<z.ZodEnum<["outline", "face", "hair", "eyes", "brows", "mouth", "torso", "left_arm", "right_arm", "left_hand", "right_hand", "clothing", "accessory", "unassigned"]>>;
                sourceRegion: z.ZodOptional<z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                    width: z.ZodNumber;
                    height: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                }, {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                }>>;
                openOrClosed: z.ZodDefault<z.ZodEnum<["open", "closed"]>>;
                segments: z.ZodArray<z.ZodObject<{
                    startPoint: z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        x: number;
                        y: number;
                    }, {
                        x: number;
                        y: number;
                    }>;
                    endPoint: z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        x: number;
                        y: number;
                    }, {
                        x: number;
                        y: number;
                    }>;
                    controlPoint1: z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        x: number;
                        y: number;
                    }, {
                        x: number;
                        y: number;
                    }>;
                    controlPoint2: z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        x: number;
                        y: number;
                    }, {
                        x: number;
                        y: number;
                    }>;
                    isCorner: z.ZodDefault<z.ZodBoolean>;
                }, "strip", z.ZodTypeAny, {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner: boolean;
                }, {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner?: boolean | undefined;
                }>, "many">;
                anchors: z.ZodArray<z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>, "many">;
                controlHandles: z.ZodArray<z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>, "many">;
                cornerFlags: z.ZodArray<z.ZodBoolean, "many">;
                baseThickness: z.ZodDefault<z.ZodNumber>;
                widthProfile: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    position: z.ZodNumber;
                    thickness: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    position: number;
                    thickness: number;
                }, {
                    position: number;
                    thickness: number;
                }>, "many">>;
                lineCap: z.ZodDefault<z.ZodEnum<["butt", "round", "square"]>>;
                lineJoin: z.ZodDefault<z.ZodEnum<["miter", "round", "bevel"]>>;
                colourId: z.ZodString;
                paletteId: z.ZodDefault<z.ZodString>;
                confidence: z.ZodDefault<z.ZodNumber>;
                sourceProvider: z.ZodDefault<z.ZodString>;
                assumptions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                requiresHumanReview: z.ZodDefault<z.ZodBoolean>;
                provenance: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "strip", z.ZodTypeAny, {
                confidence: number;
                provenance: Record<string, unknown>;
                segments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner: boolean;
                }[];
                strokeId: string;
                resultType: "pencil" | "brush";
                artLayer: "underlay" | "line" | "color" | "overlay";
                semanticGroup: "outline" | "face" | "hair" | "eyes" | "brows" | "mouth" | "torso" | "left_arm" | "right_arm" | "left_hand" | "right_hand" | "clothing" | "accessory" | "unassigned";
                openOrClosed: "closed" | "open";
                anchors: {
                    x: number;
                    y: number;
                }[];
                controlHandles: {
                    x: number;
                    y: number;
                }[];
                cornerFlags: boolean[];
                baseThickness: number;
                widthProfile: {
                    position: number;
                    thickness: number;
                }[];
                lineCap: "butt" | "round" | "square";
                lineJoin: "round" | "miter" | "bevel";
                colourId: string;
                paletteId: string;
                sourceProvider: string;
                assumptions: string[];
                requiresHumanReview: boolean;
                sourceRegion?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
            }, {
                segments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner?: boolean | undefined;
                }[];
                strokeId: string;
                resultType: "pencil" | "brush";
                anchors: {
                    x: number;
                    y: number;
                }[];
                controlHandles: {
                    x: number;
                    y: number;
                }[];
                cornerFlags: boolean[];
                colourId: string;
                confidence?: number | undefined;
                provenance?: Record<string, unknown> | undefined;
                artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
                semanticGroup?: "outline" | "face" | "hair" | "eyes" | "brows" | "mouth" | "torso" | "left_arm" | "right_arm" | "left_hand" | "right_hand" | "clothing" | "accessory" | "unassigned" | undefined;
                sourceRegion?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
                openOrClosed?: "closed" | "open" | undefined;
                baseThickness?: number | undefined;
                widthProfile?: {
                    position: number;
                    thickness: number;
                }[] | undefined;
                lineCap?: "butt" | "round" | "square" | undefined;
                lineJoin?: "round" | "miter" | "bevel" | undefined;
                paletteId?: string | undefined;
                sourceProvider?: string | undefined;
                assumptions?: string[] | undefined;
                requiresHumanReview?: boolean | undefined;
            }>, "many">;
            fillRegions: z.ZodArray<z.ZodObject<{
                regionId: z.ZodString;
                colourId: z.ZodString;
                paletteId: z.ZodDefault<z.ZodString>;
                artLayer: z.ZodDefault<z.ZodEnum<["underlay", "line", "color", "overlay"]>>;
                semanticGroup: z.ZodDefault<z.ZodString>;
                boundaryStrokes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                boundarySegments: z.ZodArray<z.ZodObject<{
                    startPoint: z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        x: number;
                        y: number;
                    }, {
                        x: number;
                        y: number;
                    }>;
                    endPoint: z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        x: number;
                        y: number;
                    }, {
                        x: number;
                        y: number;
                    }>;
                    controlPoint1: z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        x: number;
                        y: number;
                    }, {
                        x: number;
                        y: number;
                    }>;
                    controlPoint2: z.ZodObject<{
                        x: z.ZodNumber;
                        y: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        x: number;
                        y: number;
                    }, {
                        x: number;
                        y: number;
                    }>;
                    isCorner: z.ZodDefault<z.ZodBoolean>;
                }, "strip", z.ZodTypeAny, {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner: boolean;
                }, {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner?: boolean | undefined;
                }>, "many">;
                allowedGaps: z.ZodDefault<z.ZodNumber>;
                confidence: z.ZodDefault<z.ZodNumber>;
                requiresHumanReview: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                confidence: number;
                artLayer: "underlay" | "line" | "color" | "overlay";
                semanticGroup: string;
                colourId: string;
                paletteId: string;
                requiresHumanReview: boolean;
                regionId: string;
                boundaryStrokes: string[];
                boundarySegments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner: boolean;
                }[];
                allowedGaps: number;
            }, {
                colourId: string;
                regionId: string;
                boundarySegments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner?: boolean | undefined;
                }[];
                confidence?: number | undefined;
                artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
                semanticGroup?: string | undefined;
                paletteId?: string | undefined;
                requiresHumanReview?: boolean | undefined;
                boundaryStrokes?: string[] | undefined;
                allowedGaps?: number | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            name: string;
            artLayer: "underlay" | "line" | "color" | "overlay";
            semanticGroup: string;
            layerId: string;
            strokes: {
                confidence: number;
                provenance: Record<string, unknown>;
                segments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner: boolean;
                }[];
                strokeId: string;
                resultType: "pencil" | "brush";
                artLayer: "underlay" | "line" | "color" | "overlay";
                semanticGroup: "outline" | "face" | "hair" | "eyes" | "brows" | "mouth" | "torso" | "left_arm" | "right_arm" | "left_hand" | "right_hand" | "clothing" | "accessory" | "unassigned";
                openOrClosed: "closed" | "open";
                anchors: {
                    x: number;
                    y: number;
                }[];
                controlHandles: {
                    x: number;
                    y: number;
                }[];
                cornerFlags: boolean[];
                baseThickness: number;
                widthProfile: {
                    position: number;
                    thickness: number;
                }[];
                lineCap: "butt" | "round" | "square";
                lineJoin: "round" | "miter" | "bevel";
                colourId: string;
                paletteId: string;
                sourceProvider: string;
                assumptions: string[];
                requiresHumanReview: boolean;
                sourceRegion?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
            }[];
            fillRegions: {
                confidence: number;
                artLayer: "underlay" | "line" | "color" | "overlay";
                semanticGroup: string;
                colourId: string;
                paletteId: string;
                requiresHumanReview: boolean;
                regionId: string;
                boundaryStrokes: string[];
                boundarySegments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner: boolean;
                }[];
                allowedGaps: number;
            }[];
        }, {
            name: string;
            artLayer: "underlay" | "line" | "color" | "overlay";
            semanticGroup: string;
            layerId: string;
            strokes: {
                segments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner?: boolean | undefined;
                }[];
                strokeId: string;
                resultType: "pencil" | "brush";
                anchors: {
                    x: number;
                    y: number;
                }[];
                controlHandles: {
                    x: number;
                    y: number;
                }[];
                cornerFlags: boolean[];
                colourId: string;
                confidence?: number | undefined;
                provenance?: Record<string, unknown> | undefined;
                artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
                semanticGroup?: "outline" | "face" | "hair" | "eyes" | "brows" | "mouth" | "torso" | "left_arm" | "right_arm" | "left_hand" | "right_hand" | "clothing" | "accessory" | "unassigned" | undefined;
                sourceRegion?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
                openOrClosed?: "closed" | "open" | undefined;
                baseThickness?: number | undefined;
                widthProfile?: {
                    position: number;
                    thickness: number;
                }[] | undefined;
                lineCap?: "butt" | "round" | "square" | undefined;
                lineJoin?: "round" | "miter" | "bevel" | undefined;
                paletteId?: string | undefined;
                sourceProvider?: string | undefined;
                assumptions?: string[] | undefined;
                requiresHumanReview?: boolean | undefined;
            }[];
            fillRegions: {
                colourId: string;
                regionId: string;
                boundarySegments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner?: boolean | undefined;
                }[];
                confidence?: number | undefined;
                artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
                semanticGroup?: string | undefined;
                paletteId?: string | undefined;
                requiresHumanReview?: boolean | undefined;
                boundaryStrokes?: string[] | undefined;
                allowedGaps?: number | undefined;
            }[];
        }>, "many">;
        unassignedStrokes: z.ZodDefault<z.ZodArray<z.ZodObject<{
            strokeId: z.ZodString;
            resultType: z.ZodEnum<["pencil", "brush"]>;
            artLayer: z.ZodDefault<z.ZodEnum<["underlay", "line", "color", "overlay"]>>;
            semanticGroup: z.ZodDefault<z.ZodEnum<["outline", "face", "hair", "eyes", "brows", "mouth", "torso", "left_arm", "right_arm", "left_hand", "right_hand", "clothing", "accessory", "unassigned"]>>;
            sourceRegion: z.ZodOptional<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
                width: z.ZodNumber;
                height: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
                width: number;
                height: number;
            }, {
                x: number;
                y: number;
                width: number;
                height: number;
            }>>;
            openOrClosed: z.ZodDefault<z.ZodEnum<["open", "closed"]>>;
            segments: z.ZodArray<z.ZodObject<{
                startPoint: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>;
                endPoint: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>;
                controlPoint1: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>;
                controlPoint2: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>;
                isCorner: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner: boolean;
            }, {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner?: boolean | undefined;
            }>, "many">;
            anchors: z.ZodArray<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
            }, {
                x: number;
                y: number;
            }>, "many">;
            controlHandles: z.ZodArray<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
            }, {
                x: number;
                y: number;
            }>, "many">;
            cornerFlags: z.ZodArray<z.ZodBoolean, "many">;
            baseThickness: z.ZodDefault<z.ZodNumber>;
            widthProfile: z.ZodDefault<z.ZodArray<z.ZodObject<{
                position: z.ZodNumber;
                thickness: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                position: number;
                thickness: number;
            }, {
                position: number;
                thickness: number;
            }>, "many">>;
            lineCap: z.ZodDefault<z.ZodEnum<["butt", "round", "square"]>>;
            lineJoin: z.ZodDefault<z.ZodEnum<["miter", "round", "bevel"]>>;
            colourId: z.ZodString;
            paletteId: z.ZodDefault<z.ZodString>;
            confidence: z.ZodDefault<z.ZodNumber>;
            sourceProvider: z.ZodDefault<z.ZodString>;
            assumptions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            requiresHumanReview: z.ZodDefault<z.ZodBoolean>;
            provenance: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            confidence: number;
            provenance: Record<string, unknown>;
            segments: {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner: boolean;
            }[];
            strokeId: string;
            resultType: "pencil" | "brush";
            artLayer: "underlay" | "line" | "color" | "overlay";
            semanticGroup: "outline" | "face" | "hair" | "eyes" | "brows" | "mouth" | "torso" | "left_arm" | "right_arm" | "left_hand" | "right_hand" | "clothing" | "accessory" | "unassigned";
            openOrClosed: "closed" | "open";
            anchors: {
                x: number;
                y: number;
            }[];
            controlHandles: {
                x: number;
                y: number;
            }[];
            cornerFlags: boolean[];
            baseThickness: number;
            widthProfile: {
                position: number;
                thickness: number;
            }[];
            lineCap: "butt" | "round" | "square";
            lineJoin: "round" | "miter" | "bevel";
            colourId: string;
            paletteId: string;
            sourceProvider: string;
            assumptions: string[];
            requiresHumanReview: boolean;
            sourceRegion?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
        }, {
            segments: {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner?: boolean | undefined;
            }[];
            strokeId: string;
            resultType: "pencil" | "brush";
            anchors: {
                x: number;
                y: number;
            }[];
            controlHandles: {
                x: number;
                y: number;
            }[];
            cornerFlags: boolean[];
            colourId: string;
            confidence?: number | undefined;
            provenance?: Record<string, unknown> | undefined;
            artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
            semanticGroup?: "outline" | "face" | "hair" | "eyes" | "brows" | "mouth" | "torso" | "left_arm" | "right_arm" | "left_hand" | "right_hand" | "clothing" | "accessory" | "unassigned" | undefined;
            sourceRegion?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
            openOrClosed?: "closed" | "open" | undefined;
            baseThickness?: number | undefined;
            widthProfile?: {
                position: number;
                thickness: number;
            }[] | undefined;
            lineCap?: "butt" | "round" | "square" | undefined;
            lineJoin?: "round" | "miter" | "bevel" | undefined;
            paletteId?: string | undefined;
            sourceProvider?: string | undefined;
            assumptions?: string[] | undefined;
            requiresHumanReview?: boolean | undefined;
        }>, "many">>;
        unassignedFills: z.ZodDefault<z.ZodArray<z.ZodObject<{
            regionId: z.ZodString;
            colourId: z.ZodString;
            paletteId: z.ZodDefault<z.ZodString>;
            artLayer: z.ZodDefault<z.ZodEnum<["underlay", "line", "color", "overlay"]>>;
            semanticGroup: z.ZodDefault<z.ZodString>;
            boundaryStrokes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            boundarySegments: z.ZodArray<z.ZodObject<{
                startPoint: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>;
                endPoint: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>;
                controlPoint1: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>;
                controlPoint2: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>;
                isCorner: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner: boolean;
            }, {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner?: boolean | undefined;
            }>, "many">;
            allowedGaps: z.ZodDefault<z.ZodNumber>;
            confidence: z.ZodDefault<z.ZodNumber>;
            requiresHumanReview: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            confidence: number;
            artLayer: "underlay" | "line" | "color" | "overlay";
            semanticGroup: string;
            colourId: string;
            paletteId: string;
            requiresHumanReview: boolean;
            regionId: string;
            boundaryStrokes: string[];
            boundarySegments: {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner: boolean;
            }[];
            allowedGaps: number;
        }, {
            colourId: string;
            regionId: string;
            boundarySegments: {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner?: boolean | undefined;
            }[];
            confidence?: number | undefined;
            artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
            semanticGroup?: string | undefined;
            paletteId?: string | undefined;
            requiresHumanReview?: boolean | undefined;
            boundaryStrokes?: string[] | undefined;
            allowedGaps?: number | undefined;
        }>, "many">>;
        palette: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            color: z.ZodObject<{
                r: z.ZodNumber;
                g: z.ZodNumber;
                b: z.ZodNumber;
                a: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                r: number;
                g: number;
                b: number;
                a: number;
            }, {
                r: number;
                g: number;
                b: number;
                a?: number | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            color: {
                r: number;
                g: number;
                b: number;
                a: number;
            };
        }, {
            id: string;
            name: string;
            color: {
                r: number;
                g: number;
                b: number;
                a?: number | undefined;
            };
        }>, "many">;
        qualityMetrics: z.ZodObject<{
            totalStrokes: z.ZodNumber;
            totalFills: z.ZodNumber;
            averageControlPointsPerStroke: z.ZodNumber;
            rmsGeometricError: z.ZodNumber;
            firstPassAcceptanceRate: z.ZodNumber;
            requiresHumanReviewCount: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            totalStrokes: number;
            totalFills: number;
            averageControlPointsPerStroke: number;
            rmsGeometricError: number;
            firstPassAcceptanceRate: number;
            requiresHumanReviewCount: number;
        }, {
            totalStrokes: number;
            totalFills: number;
            averageControlPointsPerStroke: number;
            rmsGeometricError: number;
            firstPassAcceptanceRate: number;
            requiresHumanReviewCount: number;
        }>;
        deterministicHash: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        frame: number;
        drawingName: string;
        pirVersion: "1.0.0";
        characterId: string;
        coordinateTransform: {
            sourceWidth: number;
            sourceHeight: number;
            coordinateSystem: "normalized" | "harmony_ogl";
            transformMatrix: number[];
            scale: number;
            axisOrientation: {
                x: "right";
                y: "up" | "down";
            };
        };
        layers: {
            name: string;
            artLayer: "underlay" | "line" | "color" | "overlay";
            semanticGroup: string;
            layerId: string;
            strokes: {
                confidence: number;
                provenance: Record<string, unknown>;
                segments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner: boolean;
                }[];
                strokeId: string;
                resultType: "pencil" | "brush";
                artLayer: "underlay" | "line" | "color" | "overlay";
                semanticGroup: "outline" | "face" | "hair" | "eyes" | "brows" | "mouth" | "torso" | "left_arm" | "right_arm" | "left_hand" | "right_hand" | "clothing" | "accessory" | "unassigned";
                openOrClosed: "closed" | "open";
                anchors: {
                    x: number;
                    y: number;
                }[];
                controlHandles: {
                    x: number;
                    y: number;
                }[];
                cornerFlags: boolean[];
                baseThickness: number;
                widthProfile: {
                    position: number;
                    thickness: number;
                }[];
                lineCap: "butt" | "round" | "square";
                lineJoin: "round" | "miter" | "bevel";
                colourId: string;
                paletteId: string;
                sourceProvider: string;
                assumptions: string[];
                requiresHumanReview: boolean;
                sourceRegion?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
            }[];
            fillRegions: {
                confidence: number;
                artLayer: "underlay" | "line" | "color" | "overlay";
                semanticGroup: string;
                colourId: string;
                paletteId: string;
                requiresHumanReview: boolean;
                regionId: string;
                boundaryStrokes: string[];
                boundarySegments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner: boolean;
                }[];
                allowedGaps: number;
            }[];
        }[];
        unassignedStrokes: {
            confidence: number;
            provenance: Record<string, unknown>;
            segments: {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner: boolean;
            }[];
            strokeId: string;
            resultType: "pencil" | "brush";
            artLayer: "underlay" | "line" | "color" | "overlay";
            semanticGroup: "outline" | "face" | "hair" | "eyes" | "brows" | "mouth" | "torso" | "left_arm" | "right_arm" | "left_hand" | "right_hand" | "clothing" | "accessory" | "unassigned";
            openOrClosed: "closed" | "open";
            anchors: {
                x: number;
                y: number;
            }[];
            controlHandles: {
                x: number;
                y: number;
            }[];
            cornerFlags: boolean[];
            baseThickness: number;
            widthProfile: {
                position: number;
                thickness: number;
            }[];
            lineCap: "butt" | "round" | "square";
            lineJoin: "round" | "miter" | "bevel";
            colourId: string;
            paletteId: string;
            sourceProvider: string;
            assumptions: string[];
            requiresHumanReview: boolean;
            sourceRegion?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
        }[];
        unassignedFills: {
            confidence: number;
            artLayer: "underlay" | "line" | "color" | "overlay";
            semanticGroup: string;
            colourId: string;
            paletteId: string;
            requiresHumanReview: boolean;
            regionId: string;
            boundaryStrokes: string[];
            boundarySegments: {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner: boolean;
            }[];
            allowedGaps: number;
        }[];
        palette: {
            id: string;
            name: string;
            color: {
                r: number;
                g: number;
                b: number;
                a: number;
            };
        }[];
        qualityMetrics: {
            totalStrokes: number;
            totalFills: number;
            averageControlPointsPerStroke: number;
            rmsGeometricError: number;
            firstPassAcceptanceRate: number;
            requiresHumanReviewCount: number;
        };
        deterministicHash?: string | undefined;
    }, {
        drawingName: string;
        characterId: string;
        coordinateTransform: {
            sourceWidth: number;
            sourceHeight: number;
            coordinateSystem?: "normalized" | "harmony_ogl" | undefined;
            transformMatrix?: number[] | undefined;
            scale?: number | undefined;
            axisOrientation?: {
                x: "right";
                y: "up" | "down";
            } | undefined;
        };
        layers: {
            name: string;
            artLayer: "underlay" | "line" | "color" | "overlay";
            semanticGroup: string;
            layerId: string;
            strokes: {
                segments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner?: boolean | undefined;
                }[];
                strokeId: string;
                resultType: "pencil" | "brush";
                anchors: {
                    x: number;
                    y: number;
                }[];
                controlHandles: {
                    x: number;
                    y: number;
                }[];
                cornerFlags: boolean[];
                colourId: string;
                confidence?: number | undefined;
                provenance?: Record<string, unknown> | undefined;
                artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
                semanticGroup?: "outline" | "face" | "hair" | "eyes" | "brows" | "mouth" | "torso" | "left_arm" | "right_arm" | "left_hand" | "right_hand" | "clothing" | "accessory" | "unassigned" | undefined;
                sourceRegion?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
                openOrClosed?: "closed" | "open" | undefined;
                baseThickness?: number | undefined;
                widthProfile?: {
                    position: number;
                    thickness: number;
                }[] | undefined;
                lineCap?: "butt" | "round" | "square" | undefined;
                lineJoin?: "round" | "miter" | "bevel" | undefined;
                paletteId?: string | undefined;
                sourceProvider?: string | undefined;
                assumptions?: string[] | undefined;
                requiresHumanReview?: boolean | undefined;
            }[];
            fillRegions: {
                colourId: string;
                regionId: string;
                boundarySegments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner?: boolean | undefined;
                }[];
                confidence?: number | undefined;
                artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
                semanticGroup?: string | undefined;
                paletteId?: string | undefined;
                requiresHumanReview?: boolean | undefined;
                boundaryStrokes?: string[] | undefined;
                allowedGaps?: number | undefined;
            }[];
        }[];
        palette: {
            id: string;
            name: string;
            color: {
                r: number;
                g: number;
                b: number;
                a?: number | undefined;
            };
        }[];
        qualityMetrics: {
            totalStrokes: number;
            totalFills: number;
            averageControlPointsPerStroke: number;
            rmsGeometricError: number;
            firstPassAcceptanceRate: number;
            requiresHumanReviewCount: number;
        };
        frame?: number | undefined;
        pirVersion?: "1.0.0" | undefined;
        unassignedStrokes?: {
            segments: {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner?: boolean | undefined;
            }[];
            strokeId: string;
            resultType: "pencil" | "brush";
            anchors: {
                x: number;
                y: number;
            }[];
            controlHandles: {
                x: number;
                y: number;
            }[];
            cornerFlags: boolean[];
            colourId: string;
            confidence?: number | undefined;
            provenance?: Record<string, unknown> | undefined;
            artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
            semanticGroup?: "outline" | "face" | "hair" | "eyes" | "brows" | "mouth" | "torso" | "left_arm" | "right_arm" | "left_hand" | "right_hand" | "clothing" | "accessory" | "unassigned" | undefined;
            sourceRegion?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
            openOrClosed?: "closed" | "open" | undefined;
            baseThickness?: number | undefined;
            widthProfile?: {
                position: number;
                thickness: number;
            }[] | undefined;
            lineCap?: "butt" | "round" | "square" | undefined;
            lineJoin?: "round" | "miter" | "bevel" | undefined;
            paletteId?: string | undefined;
            sourceProvider?: string | undefined;
            assumptions?: string[] | undefined;
            requiresHumanReview?: boolean | undefined;
        }[] | undefined;
        unassignedFills?: {
            colourId: string;
            regionId: string;
            boundarySegments: {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner?: boolean | undefined;
            }[];
            confidence?: number | undefined;
            artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
            semanticGroup?: string | undefined;
            paletteId?: string | undefined;
            requiresHumanReview?: boolean | undefined;
            boundaryStrokes?: string[] | undefined;
            allowedGaps?: number | undefined;
        }[] | undefined;
        deterministicHash?: string | undefined;
    }>>;
    masterController: z.ZodObject<{
        mcId: z.ZodString;
        name: z.ZodString;
        widgetType: z.ZodEnum<["Grid", "Slider"]>;
        controlledNodes: z.ZodArray<z.ZodString, "many">;
        gridWidth: z.ZodOptional<z.ZodNumber>;
        gridHeight: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        mcId: string;
        widgetType: "Grid" | "Slider";
        controlledNodes: string[];
        gridWidth?: number | undefined;
        gridHeight?: number | undefined;
    }, {
        name: string;
        mcId: string;
        widgetType: "Grid" | "Slider";
        controlledNodes: string[];
        gridWidth?: number | undefined;
        gridHeight?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    characterName: string;
    specId: string;
    angles: Partial<Record<"0" | "45" | "90" | "135" | "180", {
        frame: number;
        drawingName: string;
        pirVersion: "1.0.0";
        characterId: string;
        coordinateTransform: {
            sourceWidth: number;
            sourceHeight: number;
            coordinateSystem: "normalized" | "harmony_ogl";
            transformMatrix: number[];
            scale: number;
            axisOrientation: {
                x: "right";
                y: "up" | "down";
            };
        };
        layers: {
            name: string;
            artLayer: "underlay" | "line" | "color" | "overlay";
            semanticGroup: string;
            layerId: string;
            strokes: {
                confidence: number;
                provenance: Record<string, unknown>;
                segments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner: boolean;
                }[];
                strokeId: string;
                resultType: "pencil" | "brush";
                artLayer: "underlay" | "line" | "color" | "overlay";
                semanticGroup: "outline" | "face" | "hair" | "eyes" | "brows" | "mouth" | "torso" | "left_arm" | "right_arm" | "left_hand" | "right_hand" | "clothing" | "accessory" | "unassigned";
                openOrClosed: "closed" | "open";
                anchors: {
                    x: number;
                    y: number;
                }[];
                controlHandles: {
                    x: number;
                    y: number;
                }[];
                cornerFlags: boolean[];
                baseThickness: number;
                widthProfile: {
                    position: number;
                    thickness: number;
                }[];
                lineCap: "butt" | "round" | "square";
                lineJoin: "round" | "miter" | "bevel";
                colourId: string;
                paletteId: string;
                sourceProvider: string;
                assumptions: string[];
                requiresHumanReview: boolean;
                sourceRegion?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
            }[];
            fillRegions: {
                confidence: number;
                artLayer: "underlay" | "line" | "color" | "overlay";
                semanticGroup: string;
                colourId: string;
                paletteId: string;
                requiresHumanReview: boolean;
                regionId: string;
                boundaryStrokes: string[];
                boundarySegments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner: boolean;
                }[];
                allowedGaps: number;
            }[];
        }[];
        unassignedStrokes: {
            confidence: number;
            provenance: Record<string, unknown>;
            segments: {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner: boolean;
            }[];
            strokeId: string;
            resultType: "pencil" | "brush";
            artLayer: "underlay" | "line" | "color" | "overlay";
            semanticGroup: "outline" | "face" | "hair" | "eyes" | "brows" | "mouth" | "torso" | "left_arm" | "right_arm" | "left_hand" | "right_hand" | "clothing" | "accessory" | "unassigned";
            openOrClosed: "closed" | "open";
            anchors: {
                x: number;
                y: number;
            }[];
            controlHandles: {
                x: number;
                y: number;
            }[];
            cornerFlags: boolean[];
            baseThickness: number;
            widthProfile: {
                position: number;
                thickness: number;
            }[];
            lineCap: "butt" | "round" | "square";
            lineJoin: "round" | "miter" | "bevel";
            colourId: string;
            paletteId: string;
            sourceProvider: string;
            assumptions: string[];
            requiresHumanReview: boolean;
            sourceRegion?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
        }[];
        unassignedFills: {
            confidence: number;
            artLayer: "underlay" | "line" | "color" | "overlay";
            semanticGroup: string;
            colourId: string;
            paletteId: string;
            requiresHumanReview: boolean;
            regionId: string;
            boundaryStrokes: string[];
            boundarySegments: {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner: boolean;
            }[];
            allowedGaps: number;
        }[];
        palette: {
            id: string;
            name: string;
            color: {
                r: number;
                g: number;
                b: number;
                a: number;
            };
        }[];
        qualityMetrics: {
            totalStrokes: number;
            totalFills: number;
            averageControlPointsPerStroke: number;
            rmsGeometricError: number;
            firstPassAcceptanceRate: number;
            requiresHumanReviewCount: number;
        };
        deterministicHash?: string | undefined;
    }>>;
    masterController: {
        name: string;
        mcId: string;
        widgetType: "Grid" | "Slider";
        controlledNodes: string[];
        gridWidth?: number | undefined;
        gridHeight?: number | undefined;
    };
}, {
    characterName: string;
    specId: string;
    angles: Partial<Record<"0" | "45" | "90" | "135" | "180", {
        drawingName: string;
        characterId: string;
        coordinateTransform: {
            sourceWidth: number;
            sourceHeight: number;
            coordinateSystem?: "normalized" | "harmony_ogl" | undefined;
            transformMatrix?: number[] | undefined;
            scale?: number | undefined;
            axisOrientation?: {
                x: "right";
                y: "up" | "down";
            } | undefined;
        };
        layers: {
            name: string;
            artLayer: "underlay" | "line" | "color" | "overlay";
            semanticGroup: string;
            layerId: string;
            strokes: {
                segments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner?: boolean | undefined;
                }[];
                strokeId: string;
                resultType: "pencil" | "brush";
                anchors: {
                    x: number;
                    y: number;
                }[];
                controlHandles: {
                    x: number;
                    y: number;
                }[];
                cornerFlags: boolean[];
                colourId: string;
                confidence?: number | undefined;
                provenance?: Record<string, unknown> | undefined;
                artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
                semanticGroup?: "outline" | "face" | "hair" | "eyes" | "brows" | "mouth" | "torso" | "left_arm" | "right_arm" | "left_hand" | "right_hand" | "clothing" | "accessory" | "unassigned" | undefined;
                sourceRegion?: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                } | undefined;
                openOrClosed?: "closed" | "open" | undefined;
                baseThickness?: number | undefined;
                widthProfile?: {
                    position: number;
                    thickness: number;
                }[] | undefined;
                lineCap?: "butt" | "round" | "square" | undefined;
                lineJoin?: "round" | "miter" | "bevel" | undefined;
                paletteId?: string | undefined;
                sourceProvider?: string | undefined;
                assumptions?: string[] | undefined;
                requiresHumanReview?: boolean | undefined;
            }[];
            fillRegions: {
                colourId: string;
                regionId: string;
                boundarySegments: {
                    startPoint: {
                        x: number;
                        y: number;
                    };
                    endPoint: {
                        x: number;
                        y: number;
                    };
                    controlPoint1: {
                        x: number;
                        y: number;
                    };
                    controlPoint2: {
                        x: number;
                        y: number;
                    };
                    isCorner?: boolean | undefined;
                }[];
                confidence?: number | undefined;
                artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
                semanticGroup?: string | undefined;
                paletteId?: string | undefined;
                requiresHumanReview?: boolean | undefined;
                boundaryStrokes?: string[] | undefined;
                allowedGaps?: number | undefined;
            }[];
        }[];
        palette: {
            id: string;
            name: string;
            color: {
                r: number;
                g: number;
                b: number;
                a?: number | undefined;
            };
        }[];
        qualityMetrics: {
            totalStrokes: number;
            totalFills: number;
            averageControlPointsPerStroke: number;
            rmsGeometricError: number;
            firstPassAcceptanceRate: number;
            requiresHumanReviewCount: number;
        };
        frame?: number | undefined;
        pirVersion?: "1.0.0" | undefined;
        unassignedStrokes?: {
            segments: {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner?: boolean | undefined;
            }[];
            strokeId: string;
            resultType: "pencil" | "brush";
            anchors: {
                x: number;
                y: number;
            }[];
            controlHandles: {
                x: number;
                y: number;
            }[];
            cornerFlags: boolean[];
            colourId: string;
            confidence?: number | undefined;
            provenance?: Record<string, unknown> | undefined;
            artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
            semanticGroup?: "outline" | "face" | "hair" | "eyes" | "brows" | "mouth" | "torso" | "left_arm" | "right_arm" | "left_hand" | "right_hand" | "clothing" | "accessory" | "unassigned" | undefined;
            sourceRegion?: {
                x: number;
                y: number;
                width: number;
                height: number;
            } | undefined;
            openOrClosed?: "closed" | "open" | undefined;
            baseThickness?: number | undefined;
            widthProfile?: {
                position: number;
                thickness: number;
            }[] | undefined;
            lineCap?: "butt" | "round" | "square" | undefined;
            lineJoin?: "round" | "miter" | "bevel" | undefined;
            paletteId?: string | undefined;
            sourceProvider?: string | undefined;
            assumptions?: string[] | undefined;
            requiresHumanReview?: boolean | undefined;
        }[] | undefined;
        unassignedFills?: {
            colourId: string;
            regionId: string;
            boundarySegments: {
                startPoint: {
                    x: number;
                    y: number;
                };
                endPoint: {
                    x: number;
                    y: number;
                };
                controlPoint1: {
                    x: number;
                    y: number;
                };
                controlPoint2: {
                    x: number;
                    y: number;
                };
                isCorner?: boolean | undefined;
            }[];
            confidence?: number | undefined;
            artLayer?: "underlay" | "line" | "color" | "overlay" | undefined;
            semanticGroup?: string | undefined;
            paletteId?: string | undefined;
            requiresHumanReview?: boolean | undefined;
            boundaryStrokes?: string[] | undefined;
            allowedGaps?: number | undefined;
        }[] | undefined;
        deterministicHash?: string | undefined;
    }>>;
    masterController: {
        name: string;
        mcId: string;
        widgetType: "Grid" | "Slider";
        controlledNodes: string[];
        gridWidth?: number | undefined;
        gridHeight?: number | undefined;
    };
}>;
export type Rig360Spec = z.infer<typeof rig360SpecSchema>;
export declare const rig360AssemblyPlanSchema: z.ZodObject<{
    planId: z.ZodString;
    characterName: z.ZodString;
    targetNodes: z.ZodArray<z.ZodString, "many">;
    substitutions: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
        angle: z.ZodEnum<["0", "45", "90", "135", "180"]>;
        drawingId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        drawingId: string;
        angle: "0" | "45" | "90" | "135" | "180";
    }, {
        drawingId: string;
        angle: "0" | "45" | "90" | "135" | "180";
    }>, "many">>;
    masterControllerPlan: z.ZodObject<{
        mcId: z.ZodString;
        name: z.ZodString;
        widgetType: z.ZodEnum<["Grid", "Slider"]>;
        controlledNodes: z.ZodArray<z.ZodString, "many">;
        gridWidth: z.ZodOptional<z.ZodNumber>;
        gridHeight: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        mcId: string;
        widgetType: "Grid" | "Slider";
        controlledNodes: string[];
        gridWidth?: number | undefined;
        gridHeight?: number | undefined;
    }, {
        name: string;
        mcId: string;
        widgetType: "Grid" | "Slider";
        controlledNodes: string[];
        gridWidth?: number | undefined;
        gridHeight?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    planId: string;
    characterName: string;
    masterControllerPlan: {
        name: string;
        mcId: string;
        widgetType: "Grid" | "Slider";
        controlledNodes: string[];
        gridWidth?: number | undefined;
        gridHeight?: number | undefined;
    };
    targetNodes: string[];
    substitutions: Record<string, {
        drawingId: string;
        angle: "0" | "45" | "90" | "135" | "180";
    }[]>;
}, {
    planId: string;
    characterName: string;
    masterControllerPlan: {
        name: string;
        mcId: string;
        widgetType: "Grid" | "Slider";
        controlledNodes: string[];
        gridWidth?: number | undefined;
        gridHeight?: number | undefined;
    };
    targetNodes: string[];
    substitutions: Record<string, {
        drawingId: string;
        angle: "0" | "45" | "90" | "135" | "180";
    }[]>;
}>;
export type Rig360AssemblyPlan = z.infer<typeof rig360AssemblyPlanSchema>;
