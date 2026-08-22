import { z } from 'zod';
export declare const nodeDeltaSchema: z.ZodObject<{
    added: z.ZodArray<z.ZodString, "many">;
    removed: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    added: string[];
    removed: string[];
}, {
    added: string[];
    removed: string[];
}>;
export declare const connectionDeltaSchema: z.ZodObject<{
    added: z.ZodArray<z.ZodObject<{
        from_node: z.ZodString;
        from_port: z.ZodNumber;
        to_node: z.ZodString;
        to_port: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        from_node: string;
        from_port: number;
        to_node: string;
        to_port: number;
    }, {
        from_node: string;
        from_port: number;
        to_node: string;
        to_port: number;
    }>, "many">;
    removed: z.ZodArray<z.ZodObject<{
        from_node: z.ZodString;
        from_port: z.ZodNumber;
        to_node: z.ZodString;
        to_port: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        from_node: string;
        from_port: number;
        to_node: string;
        to_port: number;
    }, {
        from_node: string;
        from_port: number;
        to_node: string;
        to_port: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    added: {
        from_node: string;
        from_port: number;
        to_node: string;
        to_port: number;
    }[];
    removed: {
        from_node: string;
        from_port: number;
        to_node: string;
        to_port: number;
    }[];
}, {
    added: {
        from_node: string;
        from_port: number;
        to_node: string;
        to_port: number;
    }[];
    removed: {
        from_node: string;
        from_port: number;
        to_node: string;
        to_port: number;
    }[];
}>;
export declare const nodeDataDeltaSchema: z.ZodObject<{
    nodeId: z.ZodString;
    transformKeys: z.ZodOptional<z.ZodObject<{
        added: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            x: z.ZodNumber;
            y: z.ZodNumber;
            rotation: z.ZodNumber;
            scaleX: z.ZodNumber;
            scaleY: z.ZodNumber;
            interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
        }, {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }>, "many">;
        modified: z.ZodArray<z.ZodObject<{
            original: z.ZodObject<{
                frame: z.ZodNumber;
                x: z.ZodNumber;
                y: z.ZodNumber;
                rotation: z.ZodNumber;
                scaleX: z.ZodNumber;
                scaleY: z.ZodNumber;
                interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }, {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }>;
            updated: z.ZodObject<{
                frame: z.ZodNumber;
                x: z.ZodNumber;
                y: z.ZodNumber;
                rotation: z.ZodNumber;
                scaleX: z.ZodNumber;
                scaleY: z.ZodNumber;
                interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }, {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            original: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            };
            updated: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            };
        }, {
            original: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            };
            updated: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            };
        }>, "many">;
        removed: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            x: z.ZodNumber;
            y: z.ZodNumber;
            rotation: z.ZodNumber;
            scaleX: z.ZodNumber;
            scaleY: z.ZodNumber;
            interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
        }, {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        added: {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
        }[];
        removed: {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
        }[];
        modified: {
            original: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            };
            updated: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            };
        }[];
    }, {
        added: {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }[];
        removed: {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }[];
        modified: {
            original: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            };
            updated: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            };
        }[];
    }>>;
    exposures: z.ZodOptional<z.ZodObject<{
        added: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            drawing: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            frame: number;
            drawing: string;
        }, {
            frame: number;
            drawing: string;
        }>, "many">;
        modified: z.ZodArray<z.ZodObject<{
            original: z.ZodObject<{
                frame: z.ZodNumber;
                drawing: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                frame: number;
                drawing: string;
            }, {
                frame: number;
                drawing: string;
            }>;
            updated: z.ZodObject<{
                frame: z.ZodNumber;
                drawing: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                frame: number;
                drawing: string;
            }, {
                frame: number;
                drawing: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            original: {
                frame: number;
                drawing: string;
            };
            updated: {
                frame: number;
                drawing: string;
            };
        }, {
            original: {
                frame: number;
                drawing: string;
            };
            updated: {
                frame: number;
                drawing: string;
            };
        }>, "many">;
        removed: z.ZodArray<z.ZodObject<{
            frame: z.ZodNumber;
            drawing: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            frame: number;
            drawing: string;
        }, {
            frame: number;
            drawing: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        added: {
            frame: number;
            drawing: string;
        }[];
        removed: {
            frame: number;
            drawing: string;
        }[];
        modified: {
            original: {
                frame: number;
                drawing: string;
            };
            updated: {
                frame: number;
                drawing: string;
            };
        }[];
    }, {
        added: {
            frame: number;
            drawing: string;
        }[];
        removed: {
            frame: number;
            drawing: string;
        }[];
        modified: {
            original: {
                frame: number;
                drawing: string;
            };
            updated: {
                frame: number;
                drawing: string;
            };
        }[];
    }>>;
}, "strip", z.ZodTypeAny, {
    nodeId: string;
    exposures?: {
        added: {
            frame: number;
            drawing: string;
        }[];
        removed: {
            frame: number;
            drawing: string;
        }[];
        modified: {
            original: {
                frame: number;
                drawing: string;
            };
            updated: {
                frame: number;
                drawing: string;
            };
        }[];
    } | undefined;
    transformKeys?: {
        added: {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
        }[];
        removed: {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
        }[];
        modified: {
            original: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            };
            updated: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            };
        }[];
    } | undefined;
}, {
    nodeId: string;
    exposures?: {
        added: {
            frame: number;
            drawing: string;
        }[];
        removed: {
            frame: number;
            drawing: string;
        }[];
        modified: {
            original: {
                frame: number;
                drawing: string;
            };
            updated: {
                frame: number;
                drawing: string;
            };
        }[];
    } | undefined;
    transformKeys?: {
        added: {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }[];
        removed: {
            x: number;
            y: number;
            frame: number;
            rotation: number;
            scaleX: number;
            scaleY: number;
            interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
        }[];
        modified: {
            original: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            };
            updated: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            };
        }[];
    } | undefined;
}>;
export declare const retakeManifestSchema: z.ZodObject<{
    format: z.ZodLiteral<"RetakeManifest">;
    version: z.ZodLiteral<"1.0.0">;
    sceneId: z.ZodString;
    snapshotV1Id: z.ZodString;
    snapshotV2Id: z.ZodString;
    nodes: z.ZodObject<{
        added: z.ZodArray<z.ZodString, "many">;
        removed: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        added: string[];
        removed: string[];
    }, {
        added: string[];
        removed: string[];
    }>;
    connections: z.ZodObject<{
        added: z.ZodArray<z.ZodObject<{
            from_node: z.ZodString;
            from_port: z.ZodNumber;
            to_node: z.ZodString;
            to_port: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }, {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }>, "many">;
        removed: z.ZodArray<z.ZodObject<{
            from_node: z.ZodString;
            from_port: z.ZodNumber;
            to_node: z.ZodString;
            to_port: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }, {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        added: {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }[];
        removed: {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }[];
    }, {
        added: {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }[];
        removed: {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }[];
    }>;
    nodeDataChanges: z.ZodArray<z.ZodObject<{
        nodeId: z.ZodString;
        transformKeys: z.ZodOptional<z.ZodObject<{
            added: z.ZodArray<z.ZodObject<{
                frame: z.ZodNumber;
                x: z.ZodNumber;
                y: z.ZodNumber;
                rotation: z.ZodNumber;
                scaleX: z.ZodNumber;
                scaleY: z.ZodNumber;
                interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }, {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }>, "many">;
            modified: z.ZodArray<z.ZodObject<{
                original: z.ZodObject<{
                    frame: z.ZodNumber;
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                    rotation: z.ZodNumber;
                    scaleX: z.ZodNumber;
                    scaleY: z.ZodNumber;
                    interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
                }, {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
                }>;
                updated: z.ZodObject<{
                    frame: z.ZodNumber;
                    x: z.ZodNumber;
                    y: z.ZodNumber;
                    rotation: z.ZodNumber;
                    scaleX: z.ZodNumber;
                    scaleY: z.ZodNumber;
                    interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
                }, "strip", z.ZodTypeAny, {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
                }, {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
                }>;
            }, "strip", z.ZodTypeAny, {
                original: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
                };
                updated: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
                };
            }, {
                original: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
                };
                updated: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
                };
            }>, "many">;
            removed: z.ZodArray<z.ZodObject<{
                frame: z.ZodNumber;
                x: z.ZodNumber;
                y: z.ZodNumber;
                rotation: z.ZodNumber;
                scaleX: z.ZodNumber;
                scaleY: z.ZodNumber;
                interpolation: z.ZodDefault<z.ZodEnum<["LINEAR", "CONSTANT", "BEZIER"]>>;
            }, "strip", z.ZodTypeAny, {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }, {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            added: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }[];
            removed: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }[];
            modified: {
                original: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
                };
                updated: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
                };
            }[];
        }, {
            added: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }[];
            removed: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }[];
            modified: {
                original: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
                };
                updated: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
                };
            }[];
        }>>;
        exposures: z.ZodOptional<z.ZodObject<{
            added: z.ZodArray<z.ZodObject<{
                frame: z.ZodNumber;
                drawing: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                frame: number;
                drawing: string;
            }, {
                frame: number;
                drawing: string;
            }>, "many">;
            modified: z.ZodArray<z.ZodObject<{
                original: z.ZodObject<{
                    frame: z.ZodNumber;
                    drawing: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    frame: number;
                    drawing: string;
                }, {
                    frame: number;
                    drawing: string;
                }>;
                updated: z.ZodObject<{
                    frame: z.ZodNumber;
                    drawing: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    frame: number;
                    drawing: string;
                }, {
                    frame: number;
                    drawing: string;
                }>;
            }, "strip", z.ZodTypeAny, {
                original: {
                    frame: number;
                    drawing: string;
                };
                updated: {
                    frame: number;
                    drawing: string;
                };
            }, {
                original: {
                    frame: number;
                    drawing: string;
                };
                updated: {
                    frame: number;
                    drawing: string;
                };
            }>, "many">;
            removed: z.ZodArray<z.ZodObject<{
                frame: z.ZodNumber;
                drawing: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                frame: number;
                drawing: string;
            }, {
                frame: number;
                drawing: string;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            added: {
                frame: number;
                drawing: string;
            }[];
            removed: {
                frame: number;
                drawing: string;
            }[];
            modified: {
                original: {
                    frame: number;
                    drawing: string;
                };
                updated: {
                    frame: number;
                    drawing: string;
                };
            }[];
        }, {
            added: {
                frame: number;
                drawing: string;
            }[];
            removed: {
                frame: number;
                drawing: string;
            }[];
            modified: {
                original: {
                    frame: number;
                    drawing: string;
                };
                updated: {
                    frame: number;
                    drawing: string;
                };
            }[];
        }>>;
    }, "strip", z.ZodTypeAny, {
        nodeId: string;
        exposures?: {
            added: {
                frame: number;
                drawing: string;
            }[];
            removed: {
                frame: number;
                drawing: string;
            }[];
            modified: {
                original: {
                    frame: number;
                    drawing: string;
                };
                updated: {
                    frame: number;
                    drawing: string;
                };
            }[];
        } | undefined;
        transformKeys?: {
            added: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }[];
            removed: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }[];
            modified: {
                original: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
                };
                updated: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
                };
            }[];
        } | undefined;
    }, {
        nodeId: string;
        exposures?: {
            added: {
                frame: number;
                drawing: string;
            }[];
            removed: {
                frame: number;
                drawing: string;
            }[];
            modified: {
                original: {
                    frame: number;
                    drawing: string;
                };
                updated: {
                    frame: number;
                    drawing: string;
                };
            }[];
        } | undefined;
        transformKeys?: {
            added: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }[];
            removed: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }[];
            modified: {
                original: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
                };
                updated: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
                };
            }[];
        } | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    version: "1.0.0";
    nodes: {
        added: string[];
        removed: string[];
    };
    connections: {
        added: {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }[];
        removed: {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }[];
    };
    format: "RetakeManifest";
    sceneId: string;
    snapshotV1Id: string;
    snapshotV2Id: string;
    nodeDataChanges: {
        nodeId: string;
        exposures?: {
            added: {
                frame: number;
                drawing: string;
            }[];
            removed: {
                frame: number;
                drawing: string;
            }[];
            modified: {
                original: {
                    frame: number;
                    drawing: string;
                };
                updated: {
                    frame: number;
                    drawing: string;
                };
            }[];
        } | undefined;
        transformKeys?: {
            added: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }[];
            removed: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
            }[];
            modified: {
                original: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
                };
                updated: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation: "LINEAR" | "CONSTANT" | "BEZIER";
                };
            }[];
        } | undefined;
    }[];
}, {
    version: "1.0.0";
    nodes: {
        added: string[];
        removed: string[];
    };
    connections: {
        added: {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }[];
        removed: {
            from_node: string;
            from_port: number;
            to_node: string;
            to_port: number;
        }[];
    };
    format: "RetakeManifest";
    sceneId: string;
    snapshotV1Id: string;
    snapshotV2Id: string;
    nodeDataChanges: {
        nodeId: string;
        exposures?: {
            added: {
                frame: number;
                drawing: string;
            }[];
            removed: {
                frame: number;
                drawing: string;
            }[];
            modified: {
                original: {
                    frame: number;
                    drawing: string;
                };
                updated: {
                    frame: number;
                    drawing: string;
                };
            }[];
        } | undefined;
        transformKeys?: {
            added: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }[];
            removed: {
                x: number;
                y: number;
                frame: number;
                rotation: number;
                scaleX: number;
                scaleY: number;
                interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
            }[];
            modified: {
                original: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
                };
                updated: {
                    x: number;
                    y: number;
                    frame: number;
                    rotation: number;
                    scaleX: number;
                    scaleY: number;
                    interpolation?: "LINEAR" | "CONSTANT" | "BEZIER" | undefined;
                };
            }[];
        } | undefined;
    }[];
}>;
export type RetakeManifest = z.infer<typeof retakeManifestSchema>;
export type NodeDataDelta = z.infer<typeof nodeDataDeltaSchema>;
