import { z } from "zod";
import { ReconstructionClient } from "../adapters/reconstructionClient.js";
import {
  RigProfileSchema,
  JointMappingSchema,
  RetargetingManifestSchema,
} from "../schemas/retargeting.js";
import { verifyPathAccess, HarmonyError } from "../security.js";
import fs from "fs";
import path from "path";

const client = new ReconstructionClient();

export const retargetingTools = [
  {
    name: "harmony.rig.generate_retargeting_config",
    description: "Создать шаблон профиля рига и маппинга скелета для ретаргетинга.",
    inputSchema: z.object({
      characterName: z.string(),
    }),
    handler: async (args: { characterName: string }) => {
      // Возвращаем стандартный шаблон для ретаргетинга
      const defaultRigProfile = {
        name: args.characterName,
        joints: [
          { name: "Root", parent: null, pegNodePath: "Top/Vex/Root_Peg", pivotX: 0.0, pivotY: 0.0, length: 1.0 },
          { name: "Shoulder_L", parent: "Root", pegNodePath: "Top/Vex/Shoulder_L_Peg", pivotX: 0.0, pivotY: 0.0, length: 1.0 },
          { name: "Elbow_L", parent: "Shoulder_L", pegNodePath: "Top/Vex/Elbow_L_Peg", pivotX: 1.0, pivotY: 0.0, length: 1.0 },
          { name: "Wrist_L", parent: "Elbow_L", pegNodePath: "Top/Vex/Wrist_L_Peg", pivotX: 2.0, pivotY: 0.0, length: 0.2 },
          { name: "Shoulder_R", parent: "Root", pegNodePath: "Top/Vex/Shoulder_R_Peg", pivotX: 0.0, pivotY: 0.0, length: 1.0 },
          { name: "Elbow_R", parent: "Shoulder_R", pegNodePath: "Top/Vex/Elbow_R_Peg", pivotX: -1.0, pivotY: 0.0, length: 1.0 },
          { name: "Wrist_R", parent: "Elbow_R", pegNodePath: "Top/Vex/Wrist_R_Peg", pivotX: -2.0, pivotY: 0.0, length: 0.2 },
        ],
        restPose: { Root: 0.0, Shoulder_L: 0.0, Elbow_L: 0.0, Shoulder_R: 0.0, Elbow_R: 0.0 },
      };

      const defaultMappings = [
        { pegNodePath: "Top/Vex/Root_Peg", sourceJoints: ["MID_HIP"], transformType: "translation" },
        { pegNodePath: "Top/Vex/Shoulder_L_Peg", sourceJoints: ["LEFT_SHOULDER", "LEFT_ELBOW"], transformType: "rotation" },
        { pegNodePath: "Top/Vex/Elbow_L_Peg", sourceJoints: ["LEFT_ELBOW", "LEFT_WRIST"], transformType: "rotation" },
        { pegNodePath: "Top/Vex/Shoulder_R_Peg", sourceJoints: ["RIGHT_SHOULDER", "RIGHT_ELBOW"], transformType: "rotation" },
        { pegNodePath: "Top/Vex/Elbow_R_Peg", sourceJoints: ["RIGHT_ELBOW", "RIGHT_WRIST"], transformType: "rotation" },
      ];

      return {
        status: "success",
        rigProfile: defaultRigProfile,
        mappings: defaultMappings,
      };
    },
  },

  {
    name: "harmony.rig.apply_retargeting",
    description: "Перенести движения (landmarks) на кости рига, сгенерировать RetargetingManifest и HarmonyCommandPlan.",
    inputSchema: z.object({
      landmarks: z.record(z.record(z.array(z.number()))), // frame -> landmark -> [x, y, z, vis]
      rigProfile: RigProfileSchema,
      mappings: z.array(JointMappingSchema),
      startFrame: z.number().optional(),
      endFrame: z.number().optional(),
      fps: z.number().optional().default(24.0),
      tolerance: z.number().optional().default(1.0),
      mirror: z.boolean().optional().default(false),
      bgLandmarks: z.array(z.string()).optional(),
      footLocking: z.boolean().optional().default(true),
      alpha: z.number().optional().default(0.4),
      beta: z.number().optional().default(0.3),
      outputPath: z.string().optional(),
    }),
    handler: async (args: any) => {
      // 1. Вызываем FastAPI эндпоинт анализа
      const manifest = await client.retargetAnalyze({
        landmarks: args.landmarks,
        rigProfile: args.rigProfile,
        mappings: args.mappings,
        startFrame: args.startFrame,
        endFrame: args.endFrame,
        fps: args.fps,
        tolerance: args.tolerance,
        mirror: args.mirror,
        bgLandmarks: args.bgLandmarks,
        footLocking: args.footLocking,
        alpha: args.alpha,
        beta: args.beta,
      });

      // Валидируем манифест
      const parsedManifest = RetargetingManifestSchema.safeParse(manifest);
      if (!parsedManifest.success) {
        throw new HarmonyError(
          "INVALID_RECONSTRUCTION_MANIFEST",
          "Манифест ретаргетинга не прошёл Zod-валидацию.",
          parsedManifest.error.flatten()
        );
      }

      // 2. Получаем HarmonyCommandPlan
      const commandPlan = await client.retargetApply({ manifest });

      // 3. Записываем на диск если передан outputPath
      if (args.outputPath) {
        const outDir = verifyPathAccess(path.dirname(args.outputPath));
        fs.mkdirSync(outDir, { recursive: true });
        
        const manifestFile = path.join(outDir, "retarget_manifest.json");
        const planFile = path.join(outDir, "harmony_command_plan_retarget.json");
        
        fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), "utf8");
        fs.writeFileSync(planFile, JSON.stringify(commandPlan, null, 2), "utf8");
      }

      return {
        status: "success",
        manifest: parsedManifest.data,
        commandPlan: commandPlan,
        verification: "implemented_unverified",
        note: "Ретаргетинг успешно выполнен автономно. План команд готов к импорту.",
      };
    },
  },

  {
    name: "harmony.rig.get_retargeting_preview",
    description: "Сгенерировать SVG-кадры визуального превью скелета рига поверх точек источника.",
    inputSchema: z.object({
      manifest: RetargetingManifestSchema,
      landmarks: z.record(z.record(z.array(z.number()))),
      outputDir: z.string(),
    }),
    handler: async (args: { manifest: any; landmarks: any; outputDir: string }) => {
      const outputDir = verifyPathAccess(args.outputDir);
      fs.mkdirSync(outputDir, { recursive: true });

      const result = await client.retargetPreview({
        manifest: args.manifest,
        landmarks: args.landmarks,
        outputDir: outputDir,
      });

      return {
        status: "success",
        previewFiles: result.previewFiles,
        note: "SVG-превью успешно сгенерировано для всех кадров.",
      };
    },
  },
];
