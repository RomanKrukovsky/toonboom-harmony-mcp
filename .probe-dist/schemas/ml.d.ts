import { z } from 'zod';
export declare const mlSystemProfileSchema: z.ZodObject<{
    os: z.ZodString;
    architecture: z.ZodString;
    appleSilicon: z.ZodBoolean;
    mpsAvailable: z.ZodBoolean;
    cudaAvailable: z.ZodBoolean;
    onnxProviders: z.ZodArray<z.ZodString, "many">;
    ramGb: z.ZodNumber;
    freeDiskGb: z.ZodNumber;
    recommendedProfile: z.ZodString;
}, "strict", z.ZodTypeAny, {
    os: string;
    architecture: string;
    appleSilicon: boolean;
    mpsAvailable: boolean;
    cudaAvailable: boolean;
    onnxProviders: string[];
    ramGb: number;
    freeDiskGb: number;
    recommendedProfile: string;
}, {
    os: string;
    architecture: string;
    appleSilicon: boolean;
    mpsAvailable: boolean;
    cudaAvailable: boolean;
    onnxProviders: string[];
    ramGb: number;
    freeDiskGb: number;
    recommendedProfile: string;
}>;
export declare const mlJobResponseSchema: z.ZodObject<{
    jobId: z.ZodString;
    status: z.ZodEnum<["queued", "preparing", "downloading", "loading_model", "processing", "writing_artifacts", "completed", "failed", "cancelled"]>;
    stage: z.ZodString;
    progress: z.ZodNumber;
    artifacts: z.ZodArray<z.ZodString, "many">;
    error: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        code: string;
    }, {
        message: string;
        code: string;
    }>>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    logs: z.ZodArray<z.ZodString, "many">;
}, "strict", z.ZodTypeAny, {
    status: "failed" | "queued" | "completed" | "cancelled" | "preparing" | "downloading" | "loading_model" | "processing" | "writing_artifacts";
    createdAt: string;
    logs: string[];
    jobId: string;
    artifacts: string[];
    stage: string;
    progress: number;
    updatedAt: string;
    error?: {
        message: string;
        code: string;
    } | null | undefined;
}, {
    status: "failed" | "queued" | "completed" | "cancelled" | "preparing" | "downloading" | "loading_model" | "processing" | "writing_artifacts";
    createdAt: string;
    logs: string[];
    jobId: string;
    artifacts: string[];
    stage: string;
    progress: number;
    updatedAt: string;
    error?: {
        message: string;
        code: string;
    } | null | undefined;
}>;
export declare const point3DSchema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    z: z.ZodDefault<z.ZodNumber>;
    visibility: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    x: number;
    y: number;
    z: number;
    visibility: number;
}, {
    x: number;
    y: number;
    z?: number | undefined;
    visibility?: number | undefined;
}>;
export declare const poseFrameSchema: z.ZodObject<{
    frame: z.ZodNumber;
    landmarks: z.ZodRecord<z.ZodString, z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodDefault<z.ZodNumber>;
        visibility: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        x: number;
        y: number;
        z: number;
        visibility: number;
    }, {
        x: number;
        y: number;
        z?: number | undefined;
        visibility?: number | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    frame: number;
    landmarks: Record<string, {
        x: number;
        y: number;
        z: number;
        visibility: number;
    }>;
}, {
    frame: number;
    landmarks: Record<string, {
        x: number;
        y: number;
        z?: number | undefined;
        visibility?: number | undefined;
    }>;
}>;
export declare const poseSequenceSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    modelId: z.ZodString;
    frameCount: z.ZodNumber;
    fps: z.ZodNumber;
    poses: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        landmarks: z.ZodRecord<z.ZodString, z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodDefault<z.ZodNumber>;
            visibility: z.ZodDefault<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            x: number;
            y: number;
            z: number;
            visibility: number;
        }, {
            x: number;
            y: number;
            z?: number | undefined;
            visibility?: number | undefined;
        }>>;
    }, "strict", z.ZodTypeAny, {
        frame: number;
        landmarks: Record<string, {
            x: number;
            y: number;
            z: number;
            visibility: number;
        }>;
    }, {
        frame: number;
        landmarks: Record<string, {
            x: number;
            y: number;
            z?: number | undefined;
            visibility?: number | undefined;
        }>;
    }>, "many">;
    provenance: z.ZodObject<{
        tool: z.ZodString;
        version: z.ZodString;
        backend: z.ZodString;
        device: z.ZodString;
        precision: z.ZodString;
        timestamp: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        tool: string;
        version: string;
        timestamp: string;
        backend: string;
        device: string;
        precision: string;
    }, {
        tool: string;
        version: string;
        timestamp: string;
        backend: string;
        device: string;
        precision: string;
    }>;
}, "strict", z.ZodTypeAny, {
    provenance: {
        tool: string;
        version: string;
        timestamp: string;
        backend: string;
        device: string;
        precision: string;
    };
    schemaVersion: "1.0";
    fps: number;
    frameCount: number;
    poses: {
        frame: number;
        landmarks: Record<string, {
            x: number;
            y: number;
            z: number;
            visibility: number;
        }>;
    }[];
    modelId: string;
}, {
    provenance: {
        tool: string;
        version: string;
        timestamp: string;
        backend: string;
        device: string;
        precision: string;
    };
    schemaVersion: "1.0";
    fps: number;
    frameCount: number;
    poses: {
        frame: number;
        landmarks: Record<string, {
            x: number;
            y: number;
            z?: number | undefined;
            visibility?: number | undefined;
        }>;
    }[];
    modelId: string;
}>;
export declare const boundingBoxSchema: z.ZodObject<{
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
export declare const segmentationObjectSchema: z.ZodObject<{
    objectId: z.ZodString;
    label: z.ZodString;
    bbox: z.ZodObject<{
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
    maskPath: z.ZodString;
    confidence: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    confidence: number;
    label: string;
    objectId: string;
    bbox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    maskPath: string;
}, {
    confidence: number;
    label: string;
    objectId: string;
    bbox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    maskPath: string;
}>;
export declare const segmentationFrameSchema: z.ZodObject<{
    frame: z.ZodNumber;
    objects: z.ZodArray<z.ZodObject<{
        objectId: z.ZodString;
        label: z.ZodString;
        bbox: z.ZodObject<{
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
        maskPath: z.ZodString;
        confidence: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        confidence: number;
        label: string;
        objectId: string;
        bbox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        maskPath: string;
    }, {
        confidence: number;
        label: string;
        objectId: string;
        bbox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        maskPath: string;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    frame: number;
    objects: {
        confidence: number;
        label: string;
        objectId: string;
        bbox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        maskPath: string;
    }[];
}, {
    frame: number;
    objects: {
        confidence: number;
        label: string;
        objectId: string;
        bbox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        maskPath: string;
    }[];
}>;
export declare const segmentationManifestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    modelId: z.ZodString;
    frameCount: z.ZodNumber;
    fps: z.ZodNumber;
    frames: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        objects: z.ZodArray<z.ZodObject<{
            objectId: z.ZodString;
            label: z.ZodString;
            bbox: z.ZodObject<{
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
            maskPath: z.ZodString;
            confidence: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            confidence: number;
            label: string;
            objectId: string;
            bbox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
            maskPath: string;
        }, {
            confidence: number;
            label: string;
            objectId: string;
            bbox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
            maskPath: string;
        }>, "many">;
    }, "strict", z.ZodTypeAny, {
        frame: number;
        objects: {
            confidence: number;
            label: string;
            objectId: string;
            bbox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
            maskPath: string;
        }[];
    }, {
        frame: number;
        objects: {
            confidence: number;
            label: string;
            objectId: string;
            bbox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
            maskPath: string;
        }[];
    }>, "many">;
    provenance: z.ZodAny;
}, "strict", z.ZodTypeAny, {
    schemaVersion: "1.0";
    fps: number;
    frameCount: number;
    frames: {
        frame: number;
        objects: {
            confidence: number;
            label: string;
            objectId: string;
            bbox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
            maskPath: string;
        }[];
    }[];
    modelId: string;
    provenance?: any;
}, {
    schemaVersion: "1.0";
    fps: number;
    frameCount: number;
    frames: {
        frame: number;
        objects: {
            confidence: number;
            label: string;
            objectId: string;
            bbox: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
            maskPath: string;
        }[];
    }[];
    modelId: string;
    provenance?: any;
}>;
export declare const trackedPointSchema: z.ZodObject<{
    pointId: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
    visible: z.ZodBoolean;
    confidence: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    x: number;
    y: number;
    confidence: number;
    pointId: string;
    visible: boolean;
}, {
    x: number;
    y: number;
    confidence: number;
    pointId: string;
    visible: boolean;
}>;
export declare const pointTrackingFrameSchema: z.ZodObject<{
    frame: z.ZodNumber;
    points: z.ZodArray<z.ZodObject<{
        pointId: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
        visible: z.ZodBoolean;
        confidence: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        x: number;
        y: number;
        confidence: number;
        pointId: string;
        visible: boolean;
    }, {
        x: number;
        y: number;
        confidence: number;
        pointId: string;
        visible: boolean;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    points: {
        x: number;
        y: number;
        confidence: number;
        pointId: string;
        visible: boolean;
    }[];
    frame: number;
}, {
    points: {
        x: number;
        y: number;
        confidence: number;
        pointId: string;
        visible: boolean;
    }[];
    frame: number;
}>;
export declare const pointTrackingManifestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    modelId: z.ZodString;
    points: z.ZodArray<z.ZodObject<{
        frame: z.ZodNumber;
        points: z.ZodArray<z.ZodObject<{
            pointId: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            visible: z.ZodBoolean;
            confidence: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            x: number;
            y: number;
            confidence: number;
            pointId: string;
            visible: boolean;
        }, {
            x: number;
            y: number;
            confidence: number;
            pointId: string;
            visible: boolean;
        }>, "many">;
    }, "strict", z.ZodTypeAny, {
        points: {
            x: number;
            y: number;
            confidence: number;
            pointId: string;
            visible: boolean;
        }[];
        frame: number;
    }, {
        points: {
            x: number;
            y: number;
            confidence: number;
            pointId: string;
            visible: boolean;
        }[];
        frame: number;
    }>, "many">;
    provenance: z.ZodAny;
}, "strict", z.ZodTypeAny, {
    points: {
        points: {
            x: number;
            y: number;
            confidence: number;
            pointId: string;
            visible: boolean;
        }[];
        frame: number;
    }[];
    schemaVersion: "1.0";
    modelId: string;
    provenance?: any;
}, {
    points: {
        points: {
            x: number;
            y: number;
            confidence: number;
            pointId: string;
            visible: boolean;
        }[];
        frame: number;
    }[];
    schemaVersion: "1.0";
    modelId: string;
    provenance?: any;
}>;
export declare const speechWordSchema: z.ZodObject<{
    text: z.ZodString;
    start: z.ZodNumber;
    end: z.ZodNumber;
    confidence: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    end: number;
    confidence: number;
    text: string;
    start: number;
}, {
    end: number;
    confidence: number;
    text: string;
    start: number;
}>;
export declare const speechPhonemeSchema: z.ZodObject<{
    text: z.ZodString;
    start: z.ZodNumber;
    end: z.ZodNumber;
    confidence: z.ZodNumber;
    word: z.ZodString;
}, "strict", z.ZodTypeAny, {
    end: number;
    confidence: number;
    text: string;
    start: number;
    word: string;
}, {
    end: number;
    confidence: number;
    text: string;
    start: number;
    word: string;
}>;
export declare const speechAnalysisManifestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    modelId: z.ZodString;
    durationSeconds: z.ZodNumber;
    transcript: z.ZodString;
    words: z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        start: z.ZodNumber;
        end: z.ZodNumber;
        confidence: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        end: number;
        confidence: number;
        text: string;
        start: number;
    }, {
        end: number;
        confidence: number;
        text: string;
        start: number;
    }>, "many">;
    phonemes: z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        start: z.ZodNumber;
        end: z.ZodNumber;
        confidence: z.ZodNumber;
        word: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        end: number;
        confidence: number;
        text: string;
        start: number;
        word: string;
    }, {
        end: number;
        confidence: number;
        text: string;
        start: number;
        word: string;
    }>, "many">;
    energySamples: z.ZodArray<z.ZodNumber, "many">;
    peakRms: z.ZodNumber;
    activeRatio: z.ZodNumber;
    provenance: z.ZodAny;
}, "strict", z.ZodTypeAny, {
    schemaVersion: "1.0";
    durationSeconds: number;
    phonemes: {
        end: number;
        confidence: number;
        text: string;
        start: number;
        word: string;
    }[];
    transcript: string;
    words: {
        end: number;
        confidence: number;
        text: string;
        start: number;
    }[];
    modelId: string;
    energySamples: number[];
    peakRms: number;
    activeRatio: number;
    provenance?: any;
}, {
    schemaVersion: "1.0";
    durationSeconds: number;
    phonemes: {
        end: number;
        confidence: number;
        text: string;
        start: number;
        word: string;
    }[];
    transcript: string;
    words: {
        end: number;
        confidence: number;
        text: string;
        start: number;
    }[];
    modelId: string;
    energySamples: number[];
    peakRms: number;
    activeRatio: number;
    provenance?: any;
}>;
export declare const videoPerceptionManifestSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    videoPath: z.ZodString;
    audioPath: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    width: z.ZodNumber;
    height: z.ZodNumber;
    fps: z.ZodNumber;
    frameCount: z.ZodNumber;
    durationSeconds: z.ZodNumber;
    pose: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<"1.0">;
        modelId: z.ZodString;
        frameCount: z.ZodNumber;
        fps: z.ZodNumber;
        poses: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            landmarks: z.ZodRecord<z.ZodString, z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
                z: z.ZodDefault<z.ZodNumber>;
                visibility: z.ZodDefault<z.ZodNumber>;
            }, "strict", z.ZodTypeAny, {
                x: number;
                y: number;
                z: number;
                visibility: number;
            }, {
                x: number;
                y: number;
                z?: number | undefined;
                visibility?: number | undefined;
            }>>;
        }, "strict", z.ZodTypeAny, {
            frame: number;
            landmarks: Record<string, {
                x: number;
                y: number;
                z: number;
                visibility: number;
            }>;
        }, {
            frame: number;
            landmarks: Record<string, {
                x: number;
                y: number;
                z?: number | undefined;
                visibility?: number | undefined;
            }>;
        }>, "many">;
        provenance: z.ZodObject<{
            tool: z.ZodString;
            version: z.ZodString;
            backend: z.ZodString;
            device: z.ZodString;
            precision: z.ZodString;
            timestamp: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            tool: string;
            version: string;
            timestamp: string;
            backend: string;
            device: string;
            precision: string;
        }, {
            tool: string;
            version: string;
            timestamp: string;
            backend: string;
            device: string;
            precision: string;
        }>;
    }, "strict", z.ZodTypeAny, {
        provenance: {
            tool: string;
            version: string;
            timestamp: string;
            backend: string;
            device: string;
            precision: string;
        };
        schemaVersion: "1.0";
        fps: number;
        frameCount: number;
        poses: {
            frame: number;
            landmarks: Record<string, {
                x: number;
                y: number;
                z: number;
                visibility: number;
            }>;
        }[];
        modelId: string;
    }, {
        provenance: {
            tool: string;
            version: string;
            timestamp: string;
            backend: string;
            device: string;
            precision: string;
        };
        schemaVersion: "1.0";
        fps: number;
        frameCount: number;
        poses: {
            frame: number;
            landmarks: Record<string, {
                x: number;
                y: number;
                z?: number | undefined;
                visibility?: number | undefined;
            }>;
        }[];
        modelId: string;
    }>>>;
    segmentation: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<"1.0">;
        modelId: z.ZodString;
        frameCount: z.ZodNumber;
        fps: z.ZodNumber;
        frames: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            objects: z.ZodArray<z.ZodObject<{
                objectId: z.ZodString;
                label: z.ZodString;
                bbox: z.ZodObject<{
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
                maskPath: z.ZodString;
                confidence: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                confidence: number;
                label: string;
                objectId: string;
                bbox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
                maskPath: string;
            }, {
                confidence: number;
                label: string;
                objectId: string;
                bbox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
                maskPath: string;
            }>, "many">;
        }, "strict", z.ZodTypeAny, {
            frame: number;
            objects: {
                confidence: number;
                label: string;
                objectId: string;
                bbox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
                maskPath: string;
            }[];
        }, {
            frame: number;
            objects: {
                confidence: number;
                label: string;
                objectId: string;
                bbox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
                maskPath: string;
            }[];
        }>, "many">;
        provenance: z.ZodAny;
    }, "strict", z.ZodTypeAny, {
        schemaVersion: "1.0";
        fps: number;
        frameCount: number;
        frames: {
            frame: number;
            objects: {
                confidence: number;
                label: string;
                objectId: string;
                bbox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
                maskPath: string;
            }[];
        }[];
        modelId: string;
        provenance?: any;
    }, {
        schemaVersion: "1.0";
        fps: number;
        frameCount: number;
        frames: {
            frame: number;
            objects: {
                confidence: number;
                label: string;
                objectId: string;
                bbox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
                maskPath: string;
            }[];
        }[];
        modelId: string;
        provenance?: any;
    }>>>;
    pointTracking: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<"1.0">;
        modelId: z.ZodString;
        points: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            points: z.ZodArray<z.ZodObject<{
                pointId: z.ZodString;
                x: z.ZodNumber;
                y: z.ZodNumber;
                visible: z.ZodBoolean;
                confidence: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                x: number;
                y: number;
                confidence: number;
                pointId: string;
                visible: boolean;
            }, {
                x: number;
                y: number;
                confidence: number;
                pointId: string;
                visible: boolean;
            }>, "many">;
        }, "strict", z.ZodTypeAny, {
            points: {
                x: number;
                y: number;
                confidence: number;
                pointId: string;
                visible: boolean;
            }[];
            frame: number;
        }, {
            points: {
                x: number;
                y: number;
                confidence: number;
                pointId: string;
                visible: boolean;
            }[];
            frame: number;
        }>, "many">;
        provenance: z.ZodAny;
    }, "strict", z.ZodTypeAny, {
        points: {
            points: {
                x: number;
                y: number;
                confidence: number;
                pointId: string;
                visible: boolean;
            }[];
            frame: number;
        }[];
        schemaVersion: "1.0";
        modelId: string;
        provenance?: any;
    }, {
        points: {
            points: {
                x: number;
                y: number;
                confidence: number;
                pointId: string;
                visible: boolean;
            }[];
            frame: number;
        }[];
        schemaVersion: "1.0";
        modelId: string;
        provenance?: any;
    }>>>;
    speech: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        schemaVersion: z.ZodLiteral<"1.0">;
        modelId: z.ZodString;
        durationSeconds: z.ZodNumber;
        transcript: z.ZodString;
        words: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            start: z.ZodNumber;
            end: z.ZodNumber;
            confidence: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            end: number;
            confidence: number;
            text: string;
            start: number;
        }, {
            end: number;
            confidence: number;
            text: string;
            start: number;
        }>, "many">;
        phonemes: z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            start: z.ZodNumber;
            end: z.ZodNumber;
            confidence: z.ZodNumber;
            word: z.ZodString;
        }, "strict", z.ZodTypeAny, {
            end: number;
            confidence: number;
            text: string;
            start: number;
            word: string;
        }, {
            end: number;
            confidence: number;
            text: string;
            start: number;
            word: string;
        }>, "many">;
        energySamples: z.ZodArray<z.ZodNumber, "many">;
        peakRms: z.ZodNumber;
        activeRatio: z.ZodNumber;
        provenance: z.ZodAny;
    }, "strict", z.ZodTypeAny, {
        schemaVersion: "1.0";
        durationSeconds: number;
        phonemes: {
            end: number;
            confidence: number;
            text: string;
            start: number;
            word: string;
        }[];
        transcript: string;
        words: {
            end: number;
            confidence: number;
            text: string;
            start: number;
        }[];
        modelId: string;
        energySamples: number[];
        peakRms: number;
        activeRatio: number;
        provenance?: any;
    }, {
        schemaVersion: "1.0";
        durationSeconds: number;
        phonemes: {
            end: number;
            confidence: number;
            text: string;
            start: number;
            word: string;
        }[];
        transcript: string;
        words: {
            end: number;
            confidence: number;
            text: string;
            start: number;
        }[];
        modelId: string;
        energySamples: number[];
        peakRms: number;
        activeRatio: number;
        provenance?: any;
    }>>>;
    warnings: z.ZodArray<z.ZodString, "many">;
    provenance: z.ZodAny;
}, "strict", z.ZodTypeAny, {
    schemaVersion: "1.0";
    videoPath: string;
    width: number;
    height: number;
    fps: number;
    durationSeconds: number;
    frameCount: number;
    warnings: string[];
    provenance?: any;
    audioPath?: string | null | undefined;
    pose?: {
        provenance: {
            tool: string;
            version: string;
            timestamp: string;
            backend: string;
            device: string;
            precision: string;
        };
        schemaVersion: "1.0";
        fps: number;
        frameCount: number;
        poses: {
            frame: number;
            landmarks: Record<string, {
                x: number;
                y: number;
                z: number;
                visibility: number;
            }>;
        }[];
        modelId: string;
    } | null | undefined;
    segmentation?: {
        schemaVersion: "1.0";
        fps: number;
        frameCount: number;
        frames: {
            frame: number;
            objects: {
                confidence: number;
                label: string;
                objectId: string;
                bbox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
                maskPath: string;
            }[];
        }[];
        modelId: string;
        provenance?: any;
    } | null | undefined;
    pointTracking?: {
        points: {
            points: {
                x: number;
                y: number;
                confidence: number;
                pointId: string;
                visible: boolean;
            }[];
            frame: number;
        }[];
        schemaVersion: "1.0";
        modelId: string;
        provenance?: any;
    } | null | undefined;
    speech?: {
        schemaVersion: "1.0";
        durationSeconds: number;
        phonemes: {
            end: number;
            confidence: number;
            text: string;
            start: number;
            word: string;
        }[];
        transcript: string;
        words: {
            end: number;
            confidence: number;
            text: string;
            start: number;
        }[];
        modelId: string;
        energySamples: number[];
        peakRms: number;
        activeRatio: number;
        provenance?: any;
    } | null | undefined;
}, {
    schemaVersion: "1.0";
    videoPath: string;
    width: number;
    height: number;
    fps: number;
    durationSeconds: number;
    frameCount: number;
    warnings: string[];
    provenance?: any;
    audioPath?: string | null | undefined;
    pose?: {
        provenance: {
            tool: string;
            version: string;
            timestamp: string;
            backend: string;
            device: string;
            precision: string;
        };
        schemaVersion: "1.0";
        fps: number;
        frameCount: number;
        poses: {
            frame: number;
            landmarks: Record<string, {
                x: number;
                y: number;
                z?: number | undefined;
                visibility?: number | undefined;
            }>;
        }[];
        modelId: string;
    } | null | undefined;
    segmentation?: {
        schemaVersion: "1.0";
        fps: number;
        frameCount: number;
        frames: {
            frame: number;
            objects: {
                confidence: number;
                label: string;
                objectId: string;
                bbox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
                maskPath: string;
            }[];
        }[];
        modelId: string;
        provenance?: any;
    } | null | undefined;
    pointTracking?: {
        points: {
            points: {
                x: number;
                y: number;
                confidence: number;
                pointId: string;
                visible: boolean;
            }[];
            frame: number;
        }[];
        schemaVersion: "1.0";
        modelId: string;
        provenance?: any;
    } | null | undefined;
    speech?: {
        schemaVersion: "1.0";
        durationSeconds: number;
        phonemes: {
            end: number;
            confidence: number;
            text: string;
            start: number;
            word: string;
        }[];
        transcript: string;
        words: {
            end: number;
            confidence: number;
            text: string;
            start: number;
        }[];
        modelId: string;
        energySamples: number[];
        peakRms: number;
        activeRatio: number;
        provenance?: any;
    } | null | undefined;
}>;
export type MLSystemProfile = z.infer<typeof mlSystemProfileSchema>;
export type MLJobResponse = z.infer<typeof mlJobResponseSchema>;
export type VideoPerceptionManifest = z.infer<typeof videoPerceptionManifestSchema>;
export type PoseSequence = z.infer<typeof poseSequenceSchema>;
export type SegmentationManifest = z.infer<typeof segmentationManifestSchema>;
export type PointTrackingManifest = z.infer<typeof pointTrackingManifestSchema>;
export type SpeechAnalysisManifest = z.infer<typeof speechAnalysisManifestSchema>;
