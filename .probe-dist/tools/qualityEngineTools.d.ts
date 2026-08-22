import { z } from 'zod';
export declare const qualityEngineTools: (import("./defineTool.js").TypedTool<z.ZodObject<{
    scene: z.ZodObject<{
        sceneId: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        characters: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        durationFrames: z.ZodOptional<z.ZodNumber>;
        mood: z.ZodOptional<z.ZodString>;
        cameraNotes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sceneId: string;
        location?: string | undefined;
        durationFrames?: number | undefined;
        characters?: string[] | undefined;
        mood?: string | undefined;
        cameraNotes?: string | undefined;
    }, {
        sceneId: string;
        location?: string | undefined;
        durationFrames?: number | undefined;
        characters?: string[] | undefined;
        mood?: string | undefined;
        cameraNotes?: string | undefined;
    }>;
    knownIssues: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        category: z.ZodDefault<z.ZodOptional<z.ZodEnum<["missing_asset", "broken_node", "timing", "composition", "continuity", "lip_sync", "palette", "other"]>>>;
        severity: z.ZodDefault<z.ZodOptional<z.ZodEnum<["critical", "major", "minor"]>>>;
        target: z.ZodOptional<z.ZodString>;
        detail: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        severity: "critical" | "major" | "minor";
        category: "palette" | "continuity" | "timing" | "missing_asset" | "other" | "broken_node" | "composition" | "lip_sync";
        detail: string;
        id?: string | undefined;
        target?: string | undefined;
    }, {
        detail: string;
        id?: string | undefined;
        severity?: "critical" | "major" | "minor" | undefined;
        category?: "palette" | "continuity" | "timing" | "missing_asset" | "other" | "broken_node" | "composition" | "lip_sync" | undefined;
        target?: string | undefined;
    }>, "many">>>;
}, "strip", z.ZodTypeAny, {
    scene: {
        sceneId: string;
        location?: string | undefined;
        durationFrames?: number | undefined;
        characters?: string[] | undefined;
        mood?: string | undefined;
        cameraNotes?: string | undefined;
    };
    knownIssues: {
        severity: "critical" | "major" | "minor";
        category: "palette" | "continuity" | "timing" | "missing_asset" | "other" | "broken_node" | "composition" | "lip_sync";
        detail: string;
        id?: string | undefined;
        target?: string | undefined;
    }[];
}, {
    scene: {
        sceneId: string;
        location?: string | undefined;
        durationFrames?: number | undefined;
        characters?: string[] | undefined;
        mood?: string | undefined;
        cameraNotes?: string | undefined;
    };
    knownIssues?: {
        detail: string;
        id?: string | undefined;
        severity?: "critical" | "major" | "minor" | undefined;
        category?: "palette" | "continuity" | "timing" | "missing_asset" | "other" | "broken_node" | "composition" | "lip_sync" | undefined;
        target?: string | undefined;
    }[] | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    scenes: z.ZodArray<z.ZodObject<{
        sceneId: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        characters: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        durationFrames: z.ZodOptional<z.ZodNumber>;
        mood: z.ZodOptional<z.ZodString>;
        cameraNotes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        sceneId: string;
        location?: string | undefined;
        durationFrames?: number | undefined;
        characters?: string[] | undefined;
        mood?: string | undefined;
        cameraNotes?: string | undefined;
    }, {
        sceneId: string;
        location?: string | undefined;
        durationFrames?: number | undefined;
        characters?: string[] | undefined;
        mood?: string | undefined;
        cameraNotes?: string | undefined;
    }>, "many">;
    passThreshold: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    scenes: {
        sceneId: string;
        location?: string | undefined;
        durationFrames?: number | undefined;
        characters?: string[] | undefined;
        mood?: string | undefined;
        cameraNotes?: string | undefined;
    }[];
    passThreshold: number;
}, {
    scenes: {
        sceneId: string;
        location?: string | undefined;
        durationFrames?: number | undefined;
        characters?: string[] | undefined;
        mood?: string | undefined;
        cameraNotes?: string | undefined;
    }[];
    passThreshold?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    renderPath: z.ZodString;
    referencePath: z.ZodString;
    frame: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    frame: number;
    renderPath: string;
    referencePath: string;
}, {
    renderPath: string;
    referencePath: string;
    frame?: number | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    issues: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        category: z.ZodDefault<z.ZodOptional<z.ZodEnum<["missing_asset", "broken_node", "timing", "composition", "continuity", "lip_sync", "palette", "other"]>>>;
        severity: z.ZodDefault<z.ZodOptional<z.ZodEnum<["critical", "major", "minor"]>>>;
        target: z.ZodOptional<z.ZodString>;
        detail: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        severity: "critical" | "major" | "minor";
        category: "palette" | "continuity" | "timing" | "missing_asset" | "other" | "broken_node" | "composition" | "lip_sync";
        detail: string;
        id?: string | undefined;
        target?: string | undefined;
    }, {
        detail: string;
        id?: string | undefined;
        severity?: "critical" | "major" | "minor" | undefined;
        category?: "palette" | "continuity" | "timing" | "missing_asset" | "other" | "broken_node" | "composition" | "lip_sync" | undefined;
        target?: string | undefined;
    }>, "many">;
    sceneId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    issues: {
        severity: "critical" | "major" | "minor";
        category: "palette" | "continuity" | "timing" | "missing_asset" | "other" | "broken_node" | "composition" | "lip_sync";
        detail: string;
        id?: string | undefined;
        target?: string | undefined;
    }[];
    sceneId?: string | undefined;
}, {
    issues: {
        detail: string;
        id?: string | undefined;
        severity?: "critical" | "major" | "minor" | undefined;
        category?: "palette" | "continuity" | "timing" | "missing_asset" | "other" | "broken_node" | "composition" | "lip_sync" | undefined;
        target?: string | undefined;
    }[];
    sceneId?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
    issues: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        category: z.ZodDefault<z.ZodOptional<z.ZodEnum<["missing_asset", "broken_node", "timing", "composition", "continuity", "lip_sync", "palette", "other"]>>>;
        severity: z.ZodDefault<z.ZodOptional<z.ZodEnum<["critical", "major", "minor"]>>>;
        target: z.ZodOptional<z.ZodString>;
        detail: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        severity: "critical" | "major" | "minor";
        category: "palette" | "continuity" | "timing" | "missing_asset" | "other" | "broken_node" | "composition" | "lip_sync";
        detail: string;
        id?: string | undefined;
        target?: string | undefined;
    }, {
        detail: string;
        id?: string | undefined;
        severity?: "critical" | "major" | "minor" | undefined;
        category?: "palette" | "continuity" | "timing" | "missing_asset" | "other" | "broken_node" | "composition" | "lip_sync" | undefined;
        target?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    issues: {
        severity: "critical" | "major" | "minor";
        category: "palette" | "continuity" | "timing" | "missing_asset" | "other" | "broken_node" | "composition" | "lip_sync";
        detail: string;
        id?: string | undefined;
        target?: string | undefined;
    }[];
    sceneId: string;
}, {
    issues: {
        detail: string;
        id?: string | undefined;
        severity?: "critical" | "major" | "minor" | undefined;
        category?: "palette" | "continuity" | "timing" | "missing_asset" | "other" | "broken_node" | "composition" | "lip_sync" | undefined;
        target?: string | undefined;
    }[];
    sceneId: string;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
    reason: z.ZodString;
    priority: z.ZodDefault<z.ZodOptional<z.ZodEnum<["low", "normal", "high", "blocking"]>>>;
    reviewQueueDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    priority: "low" | "high" | "blocking" | "normal";
    sceneId: string;
    reviewQueueDir?: string | undefined;
}, {
    reason: string;
    sceneId: string;
    priority?: "low" | "high" | "blocking" | "normal" | undefined;
    reviewQueueDir?: string | undefined;
}>> | import("./defineTool.js").TypedTool<z.ZodObject<{
    sceneId: z.ZodString;
    approver: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    score: z.ZodOptional<z.ZodNumber>;
    approvalsDir: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    sceneId: string;
    approver: string;
    score?: number | undefined;
    approvalsDir?: string | undefined;
}, {
    sceneId: string;
    score?: number | undefined;
    approver?: string | undefined;
    approvalsDir?: string | undefined;
}>>)[];
