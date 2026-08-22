import { z } from 'zod';
export declare const PART_DECOMPOSITION_SCHEMA_VERSION = "1.0";
export declare const humanoidPartIdSchema: z.ZodEnum<["head", "hair", "face", "eyes", "brows", "mouth", "torso", "upper_arm_left", "upper_arm_right", "forearm_left", "forearm_right", "hand_left", "hand_right", "upper_leg_left", "upper_leg_right", "lower_leg_left", "lower_leg_right", "foot_left", "foot_right", "clothing", "accessories", "props"]>;
export declare const nonHumanoidPartIdSchema: z.ZodString;
export declare const partIdSchema: z.ZodUnion<[z.ZodEnum<["head", "hair", "face", "eyes", "brows", "mouth", "torso", "upper_arm_left", "upper_arm_right", "forearm_left", "forearm_right", "hand_left", "hand_right", "upper_leg_left", "upper_leg_right", "lower_leg_left", "lower_leg_right", "foot_left", "foot_right", "clothing", "accessories", "props"]>, z.ZodString]>;
export declare const maskRegionSchema: z.ZodObject<{
    contourPoints: z.ZodArray<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>, "many">;
    boundingBox: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        x: number;
        y: number;
        width: number;
        height: number;
    }, {
        x: number;
        y: number;
        width: number;
        height: number;
    }>;
    area: z.ZodNumber;
    confidence: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    area: number;
    confidence: number;
    contourPoints: {
        x: number;
        y: number;
    }[];
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}, {
    area: number;
    confidence: number;
    contourPoints: {
        x: number;
        y: number;
    }[];
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}>;
export declare const partIdentitySchema: z.ZodObject<{
    partId: z.ZodString;
    label: z.ZodString;
    isHumanoidPart: z.ZodBoolean;
    parentPartId: z.ZodNullable<z.ZodString>;
    depthOrder: z.ZodNumber;
    inferred: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    partId: string;
    parentPartId: string | null;
    label: string;
    inferred: boolean;
    isHumanoidPart: boolean;
    depthOrder: number;
}, {
    partId: string;
    parentPartId: string | null;
    label: string;
    isHumanoidPart: boolean;
    depthOrder: number;
    inferred?: boolean | undefined;
}>;
export declare const occlusionEdgeSchema: z.ZodObject<{
    occluderPartId: z.ZodString;
    occludedPartId: z.ZodString;
    overlapRatio: z.ZodNumber;
    frameRange: z.ZodObject<{
        start: z.ZodNumber;
        end: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        end: number;
        start: number;
    }, {
        end: number;
        start: number;
    }>;
    confidence: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    confidence: number;
    occluderPartId: string;
    occludedPartId: string;
    overlapRatio: number;
    frameRange: {
        end: number;
        start: number;
    };
}, {
    confidence: number;
    occluderPartId: string;
    occludedPartId: string;
    overlapRatio: number;
    frameRange: {
        end: number;
        start: number;
    };
}>;
export declare const partFrameStateSchema: z.ZodObject<{
    frame: z.ZodNumber;
    visibleMask: z.ZodOptional<z.ZodObject<{
        contourPoints: z.ZodArray<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>, "many">;
        boundingBox: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            x: number;
            y: number;
            width: number;
            height: number;
        }, {
            x: number;
            y: number;
            width: number;
            height: number;
        }>;
        area: z.ZodNumber;
        confidence: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        area: number;
        confidence: number;
        contourPoints: {
            x: number;
            y: number;
        }[];
        boundingBox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }, {
        area: number;
        confidence: number;
        contourPoints: {
            x: number;
            y: number;
        }[];
        boundingBox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }>>;
    amodalMask: z.ZodOptional<z.ZodObject<{
        contourPoints: z.ZodArray<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>, "many">;
        boundingBox: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            x: number;
            y: number;
            width: number;
            height: number;
        }, {
            x: number;
            y: number;
            width: number;
            height: number;
        }>;
        area: z.ZodNumber;
        confidence: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        area: number;
        confidence: number;
        contourPoints: {
            x: number;
            y: number;
        }[];
        boundingBox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }, {
        area: number;
        confidence: number;
        contourPoints: {
            x: number;
            y: number;
        }[];
        boundingBox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    }>>;
    center: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        x: number;
        y: number;
    }, {
        x: number;
        y: number;
    }>;
    motionDelta: z.ZodDefault<z.ZodObject<{
        dx: z.ZodNumber;
        dy: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        dx: number;
        dy: number;
    }, {
        dx: number;
        dy: number;
    }>>;
    occluded: z.ZodDefault<z.ZodBoolean>;
    confidence: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    frame: number;
    confidence: number;
    center: {
        x: number;
        y: number;
    };
    motionDelta: {
        dx: number;
        dy: number;
    };
    occluded: boolean;
    visibleMask?: {
        area: number;
        confidence: number;
        contourPoints: {
            x: number;
            y: number;
        }[];
        boundingBox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    } | undefined;
    amodalMask?: {
        area: number;
        confidence: number;
        contourPoints: {
            x: number;
            y: number;
        }[];
        boundingBox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    } | undefined;
}, {
    frame: number;
    confidence: number;
    center: {
        x: number;
        y: number;
    };
    visibleMask?: {
        area: number;
        confidence: number;
        contourPoints: {
            x: number;
            y: number;
        }[];
        boundingBox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    } | undefined;
    amodalMask?: {
        area: number;
        confidence: number;
        contourPoints: {
            x: number;
            y: number;
        }[];
        boundingBox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    } | undefined;
    motionDelta?: {
        dx: number;
        dy: number;
    } | undefined;
    occluded?: boolean | undefined;
}>;
export declare const partTrackSchema: z.ZodObject<{
    partId: z.ZodString;
    identity: z.ZodObject<{
        partId: z.ZodString;
        label: z.ZodString;
        isHumanoidPart: z.ZodBoolean;
        parentPartId: z.ZodNullable<z.ZodString>;
        depthOrder: z.ZodNumber;
        inferred: z.ZodDefault<z.ZodBoolean>;
    }, "strict", z.ZodTypeAny, {
        partId: string;
        parentPartId: string | null;
        label: string;
        inferred: boolean;
        isHumanoidPart: boolean;
        depthOrder: number;
    }, {
        partId: string;
        parentPartId: string | null;
        label: string;
        isHumanoidPart: boolean;
        depthOrder: number;
        inferred?: boolean | undefined;
    }>;
    frameStates: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        visibleMask: z.ZodOptional<z.ZodObject<{
            contourPoints: z.ZodArray<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                x: number;
                y: number;
            }, {
                x: number;
                y: number;
            }>, "many">;
            boundingBox: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
                width: z.ZodNumber;
                height: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                x: number;
                y: number;
                width: number;
                height: number;
            }, {
                x: number;
                y: number;
                width: number;
                height: number;
            }>;
            area: z.ZodNumber;
            confidence: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            area: number;
            confidence: number;
            contourPoints: {
                x: number;
                y: number;
            }[];
            boundingBox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        }, {
            area: number;
            confidence: number;
            contourPoints: {
                x: number;
                y: number;
            }[];
            boundingBox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        }>>;
        amodalMask: z.ZodOptional<z.ZodObject<{
            contourPoints: z.ZodArray<z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                x: number;
                y: number;
            }, {
                x: number;
                y: number;
            }>, "many">;
            boundingBox: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
                width: z.ZodNumber;
                height: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                x: number;
                y: number;
                width: number;
                height: number;
            }, {
                x: number;
                y: number;
                width: number;
                height: number;
            }>;
            area: z.ZodNumber;
            confidence: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            area: number;
            confidence: number;
            contourPoints: {
                x: number;
                y: number;
            }[];
            boundingBox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        }, {
            area: number;
            confidence: number;
            contourPoints: {
                x: number;
                y: number;
            }[];
            boundingBox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        }>>;
        center: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>;
        motionDelta: z.ZodDefault<z.ZodObject<{
            dx: z.ZodNumber;
            dy: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            dx: number;
            dy: number;
        }, {
            dx: number;
            dy: number;
        }>>;
        occluded: z.ZodDefault<z.ZodBoolean>;
        confidence: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        frame: number;
        confidence: number;
        center: {
            x: number;
            y: number;
        };
        motionDelta: {
            dx: number;
            dy: number;
        };
        occluded: boolean;
        visibleMask?: {
            area: number;
            confidence: number;
            contourPoints: {
                x: number;
                y: number;
            }[];
            boundingBox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        } | undefined;
        amodalMask?: {
            area: number;
            confidence: number;
            contourPoints: {
                x: number;
                y: number;
            }[];
            boundingBox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        } | undefined;
    }, {
        frame: number;
        confidence: number;
        center: {
            x: number;
            y: number;
        };
        visibleMask?: {
            area: number;
            confidence: number;
            contourPoints: {
                x: number;
                y: number;
            }[];
            boundingBox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        } | undefined;
        amodalMask?: {
            area: number;
            confidence: number;
            contourPoints: {
                x: number;
                y: number;
            }[];
            boundingBox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        } | undefined;
        motionDelta?: {
            dx: number;
            dy: number;
        } | undefined;
        occluded?: boolean | undefined;
    }>, "many">;
    motionCluster: z.ZodDefault<z.ZodEnum<["rigid", "articulated", "deformable", "static", "unknown"]>>;
    articulationHints: z.ZodDefault<z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        hint: z.ZodString;
        confidence: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        frame: number;
        confidence: number;
        hint: string;
    }, {
        frame: number;
        confidence: number;
        hint: string;
    }>, "many">>;
    problemRanges: z.ZodDefault<z.ZodArray<z.ZodObject<{
        startFrame: z.ZodNumber;
        endFrame: z.ZodNumber;
        reason: z.ZodString;
        severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
    }, "strict", z.ZodTypeAny, {
        severity: "low" | "medium" | "high" | "critical";
        startFrame: number;
        endFrame: number;
        reason: string;
    }, {
        severity: "low" | "medium" | "high" | "critical";
        startFrame: number;
        endFrame: number;
        reason: string;
    }>, "many">>;
}, "strict", z.ZodTypeAny, {
    partId: string;
    identity: {
        partId: string;
        parentPartId: string | null;
        label: string;
        inferred: boolean;
        isHumanoidPart: boolean;
        depthOrder: number;
    };
    frameStates: {
        frame: number;
        confidence: number;
        center: {
            x: number;
            y: number;
        };
        motionDelta: {
            dx: number;
            dy: number;
        };
        occluded: boolean;
        visibleMask?: {
            area: number;
            confidence: number;
            contourPoints: {
                x: number;
                y: number;
            }[];
            boundingBox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        } | undefined;
        amodalMask?: {
            area: number;
            confidence: number;
            contourPoints: {
                x: number;
                y: number;
            }[];
            boundingBox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        } | undefined;
    }[];
    motionCluster: "unknown" | "static" | "rigid" | "articulated" | "deformable";
    articulationHints: {
        frame: number;
        confidence: number;
        hint: string;
    }[];
    problemRanges: {
        severity: "low" | "medium" | "high" | "critical";
        startFrame: number;
        endFrame: number;
        reason: string;
    }[];
}, {
    partId: string;
    identity: {
        partId: string;
        parentPartId: string | null;
        label: string;
        isHumanoidPart: boolean;
        depthOrder: number;
        inferred?: boolean | undefined;
    };
    frameStates: {
        frame: number;
        confidence: number;
        center: {
            x: number;
            y: number;
        };
        visibleMask?: {
            area: number;
            confidence: number;
            contourPoints: {
                x: number;
                y: number;
            }[];
            boundingBox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        } | undefined;
        amodalMask?: {
            area: number;
            confidence: number;
            contourPoints: {
                x: number;
                y: number;
            }[];
            boundingBox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        } | undefined;
        motionDelta?: {
            dx: number;
            dy: number;
        } | undefined;
        occluded?: boolean | undefined;
    }[];
    motionCluster?: "unknown" | "static" | "rigid" | "articulated" | "deformable" | undefined;
    articulationHints?: {
        frame: number;
        confidence: number;
        hint: string;
    }[] | undefined;
    problemRanges?: {
        severity: "low" | "medium" | "high" | "critical";
        startFrame: number;
        endFrame: number;
        reason: string;
    }[] | undefined;
}>;
export declare const partDecompositionSchema: z.ZodObject<{
    schemaVersion: z.ZodDefault<z.ZodString>;
    characterId: z.ZodString;
    bodyType: z.ZodDefault<z.ZodEnum<["humanoid", "quadruped", "creature", "object", "unknown"]>>;
    parts: z.ZodArray<z.ZodObject<{
        partId: z.ZodString;
        identity: z.ZodObject<{
            partId: z.ZodString;
            label: z.ZodString;
            isHumanoidPart: z.ZodBoolean;
            parentPartId: z.ZodNullable<z.ZodString>;
            depthOrder: z.ZodNumber;
            inferred: z.ZodDefault<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            partId: string;
            parentPartId: string | null;
            label: string;
            inferred: boolean;
            isHumanoidPart: boolean;
            depthOrder: number;
        }, {
            partId: string;
            parentPartId: string | null;
            label: string;
            isHumanoidPart: boolean;
            depthOrder: number;
            inferred?: boolean | undefined;
        }>;
        frameStates: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            visibleMask: z.ZodOptional<z.ZodObject<{
                contourPoints: z.ZodArray<z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strict", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>, "many">;
                boundingBox: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                    width: z.ZodNumber;
                    height: z.ZodNumber;
                }, "strict", z.ZodTypeAny, {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                }, {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                }>;
                area: z.ZodNumber;
                confidence: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            }, {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            }>>;
            amodalMask: z.ZodOptional<z.ZodObject<{
                contourPoints: z.ZodArray<z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                }, "strict", z.ZodTypeAny, {
                    x: number;
                    y: number;
                }, {
                    x: number;
                    y: number;
                }>, "many">;
                boundingBox: z.ZodObject<{
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                    width: z.ZodNumber;
                    height: z.ZodNumber;
                }, "strict", z.ZodTypeAny, {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                }, {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                }>;
                area: z.ZodNumber;
                confidence: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            }, {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            }>>;
            center: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                x: number;
                y: number;
            }, {
                x: number;
                y: number;
            }>;
            motionDelta: z.ZodDefault<z.ZodObject<{
                dx: z.ZodNumber;
                dy: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                dx: number;
                dy: number;
            }, {
                dx: number;
                dy: number;
            }>>;
            occluded: z.ZodDefault<z.ZodBoolean>;
            confidence: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            frame: number;
            confidence: number;
            center: {
                x: number;
                y: number;
            };
            motionDelta: {
                dx: number;
                dy: number;
            };
            occluded: boolean;
            visibleMask?: {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            } | undefined;
            amodalMask?: {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            } | undefined;
        }, {
            frame: number;
            confidence: number;
            center: {
                x: number;
                y: number;
            };
            visibleMask?: {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            } | undefined;
            amodalMask?: {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            } | undefined;
            motionDelta?: {
                dx: number;
                dy: number;
            } | undefined;
            occluded?: boolean | undefined;
        }>, "many">;
        motionCluster: z.ZodDefault<z.ZodEnum<["rigid", "articulated", "deformable", "static", "unknown"]>>;
        articulationHints: z.ZodDefault<z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            hint: z.ZodString;
            confidence: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            frame: number;
            confidence: number;
            hint: string;
        }, {
            frame: number;
            confidence: number;
            hint: string;
        }>, "many">>;
        problemRanges: z.ZodDefault<z.ZodArray<z.ZodObject<{
            startFrame: z.ZodNumber;
            endFrame: z.ZodNumber;
            reason: z.ZodString;
            severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
        }, "strict", z.ZodTypeAny, {
            severity: "low" | "medium" | "high" | "critical";
            startFrame: number;
            endFrame: number;
            reason: string;
        }, {
            severity: "low" | "medium" | "high" | "critical";
            startFrame: number;
            endFrame: number;
            reason: string;
        }>, "many">>;
    }, "strict", z.ZodTypeAny, {
        partId: string;
        identity: {
            partId: string;
            parentPartId: string | null;
            label: string;
            inferred: boolean;
            isHumanoidPart: boolean;
            depthOrder: number;
        };
        frameStates: {
            frame: number;
            confidence: number;
            center: {
                x: number;
                y: number;
            };
            motionDelta: {
                dx: number;
                dy: number;
            };
            occluded: boolean;
            visibleMask?: {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            } | undefined;
            amodalMask?: {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            } | undefined;
        }[];
        motionCluster: "unknown" | "static" | "rigid" | "articulated" | "deformable";
        articulationHints: {
            frame: number;
            confidence: number;
            hint: string;
        }[];
        problemRanges: {
            severity: "low" | "medium" | "high" | "critical";
            startFrame: number;
            endFrame: number;
            reason: string;
        }[];
    }, {
        partId: string;
        identity: {
            partId: string;
            parentPartId: string | null;
            label: string;
            isHumanoidPart: boolean;
            depthOrder: number;
            inferred?: boolean | undefined;
        };
        frameStates: {
            frame: number;
            confidence: number;
            center: {
                x: number;
                y: number;
            };
            visibleMask?: {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            } | undefined;
            amodalMask?: {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            } | undefined;
            motionDelta?: {
                dx: number;
                dy: number;
            } | undefined;
            occluded?: boolean | undefined;
        }[];
        motionCluster?: "unknown" | "static" | "rigid" | "articulated" | "deformable" | undefined;
        articulationHints?: {
            frame: number;
            confidence: number;
            hint: string;
        }[] | undefined;
        problemRanges?: {
            severity: "low" | "medium" | "high" | "critical";
            startFrame: number;
            endFrame: number;
            reason: string;
        }[] | undefined;
    }>, "many">;
    occlusionGraph: z.ZodArray<z.ZodObject<{
        occluderPartId: z.ZodString;
        occludedPartId: z.ZodString;
        overlapRatio: z.ZodNumber;
        frameRange: z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            end: number;
            start: number;
        }, {
            end: number;
            start: number;
        }>;
        confidence: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        confidence: number;
        occluderPartId: string;
        occludedPartId: string;
        overlapRatio: number;
        frameRange: {
            end: number;
            start: number;
        };
    }, {
        confidence: number;
        occluderPartId: string;
        occludedPartId: string;
        overlapRatio: number;
        frameRange: {
            end: number;
            start: number;
        };
    }>, "many">;
    identityContinuityScore: z.ZodNumber;
    totalProblemRanges: z.ZodNumber;
    provenance: z.ZodObject<{
        engine: z.ZodString;
        createdAt: z.ZodString;
        method: z.ZodEnum<["cpu_heuristic", "ml_segmenter", "hybrid"]>;
    }, "strict", z.ZodTypeAny, {
        method: "hybrid" | "cpu_heuristic" | "ml_segmenter";
        createdAt: string;
        engine: string;
    }, {
        method: "hybrid" | "cpu_heuristic" | "ml_segmenter";
        createdAt: string;
        engine: string;
    }>;
}, "strict", z.ZodTypeAny, {
    provenance: {
        method: "hybrid" | "cpu_heuristic" | "ml_segmenter";
        createdAt: string;
        engine: string;
    };
    schemaVersion: string;
    characterId: string;
    parts: {
        partId: string;
        identity: {
            partId: string;
            parentPartId: string | null;
            label: string;
            inferred: boolean;
            isHumanoidPart: boolean;
            depthOrder: number;
        };
        frameStates: {
            frame: number;
            confidence: number;
            center: {
                x: number;
                y: number;
            };
            motionDelta: {
                dx: number;
                dy: number;
            };
            occluded: boolean;
            visibleMask?: {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            } | undefined;
            amodalMask?: {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            } | undefined;
        }[];
        motionCluster: "unknown" | "static" | "rigid" | "articulated" | "deformable";
        articulationHints: {
            frame: number;
            confidence: number;
            hint: string;
        }[];
        problemRanges: {
            severity: "low" | "medium" | "high" | "critical";
            startFrame: number;
            endFrame: number;
            reason: string;
        }[];
    }[];
    bodyType: "object" | "unknown" | "humanoid" | "quadruped" | "creature";
    occlusionGraph: {
        confidence: number;
        occluderPartId: string;
        occludedPartId: string;
        overlapRatio: number;
        frameRange: {
            end: number;
            start: number;
        };
    }[];
    identityContinuityScore: number;
    totalProblemRanges: number;
}, {
    provenance: {
        method: "hybrid" | "cpu_heuristic" | "ml_segmenter";
        createdAt: string;
        engine: string;
    };
    characterId: string;
    parts: {
        partId: string;
        identity: {
            partId: string;
            parentPartId: string | null;
            label: string;
            isHumanoidPart: boolean;
            depthOrder: number;
            inferred?: boolean | undefined;
        };
        frameStates: {
            frame: number;
            confidence: number;
            center: {
                x: number;
                y: number;
            };
            visibleMask?: {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            } | undefined;
            amodalMask?: {
                area: number;
                confidence: number;
                contourPoints: {
                    x: number;
                    y: number;
                }[];
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
            } | undefined;
            motionDelta?: {
                dx: number;
                dy: number;
            } | undefined;
            occluded?: boolean | undefined;
        }[];
        motionCluster?: "unknown" | "static" | "rigid" | "articulated" | "deformable" | undefined;
        articulationHints?: {
            frame: number;
            confidence: number;
            hint: string;
        }[] | undefined;
        problemRanges?: {
            severity: "low" | "medium" | "high" | "critical";
            startFrame: number;
            endFrame: number;
            reason: string;
        }[] | undefined;
    }[];
    occlusionGraph: {
        confidence: number;
        occluderPartId: string;
        occludedPartId: string;
        overlapRatio: number;
        frameRange: {
            end: number;
            start: number;
        };
    }[];
    identityContinuityScore: number;
    totalProblemRanges: number;
    schemaVersion?: string | undefined;
    bodyType?: "object" | "unknown" | "humanoid" | "quadruped" | "creature" | undefined;
}>;
export type PartDecomposition = z.infer<typeof partDecompositionSchema>;
export type PartTrack = z.infer<typeof partTrackSchema>;
export type PartFrameState = z.infer<typeof partFrameStateSchema>;
export type OcclusionEdge = z.infer<typeof occlusionEdgeSchema>;
export type MaskRegion = z.infer<typeof maskRegionSchema>;
