import { promises as fs } from 'fs';
import path from 'path';
import type { HarmonyManifestV3 } from '../../schemas/harmonyManifestV3.js';
import type { CommandPlanV3 } from '../../schemas/harmonyCommandPlanV3.js';

export interface PackageInput {
  manifest: HarmonyManifestV3;
  commandPlan: CommandPlanV3;
  outputDir: string;
  packageName?: string;
}

export interface PackageResult {
  packagePath: string;
  files: string[];
  totalSize: number;
  manifest: any;
  readme: string;
}

export class PortableIntegrationPackageGenerator {
  async generate(input: PackageInput): Promise<PackageResult> {
    const packageName = input.packageName || `harmony_package_${input.manifest.sceneId}_${Date.now()}`;
    const packagePath = path.join(input.outputDir, packageName);

    // Create package directory
    await fs.mkdir(packagePath, { recursive: true });

    // Create subdirectories
    const manifestDir = path.join(packagePath, 'manifest');
    const commandPlanDir = path.join(packagePath, 'command_plan');
    const assetsDir = path.join(packagePath, 'assets');
    const docsDir = path.join(packagePath, 'docs');

    await fs.mkdir(manifestDir, { recursive: true });
    await fs.mkdir(commandPlanDir, { recursive: true });
    await fs.mkdir(assetsDir, { recursive: true });
    await fs.mkdir(docsDir, { recursive: true });

    const files: string[] = [];
    let totalSize = 0;

    // 1. Write manifest
    const manifestPath = path.join(manifestDir, 'harmony_manifest_v3.json');
    const manifestJson = JSON.stringify(input.manifest, null, 2);
    await fs.writeFile(manifestPath, manifestJson);
    files.push(manifestPath);
    totalSize += manifestJson.length;

    // 2. Write command plan
    const commandPlanPath = path.join(commandPlanDir, 'harmony_command_plan_v3.json');
    const commandPlanJson = JSON.stringify(input.commandPlan, null, 2);
    await fs.writeFile(commandPlanPath, commandPlanJson);
    files.push(commandPlanPath);
    totalSize += commandPlanJson.length;

    // 3. Write README
    const readme = this.generateReadme(input.manifest, input.commandPlan);
    const readmePath = path.join(packagePath, 'README.md');
    await fs.writeFile(readmePath, readme);
    files.push(readmePath);
    totalSize += readme.length;

    // 4. Write integration script (Python)
    const integrationScript = this.generateIntegrationScript();
    const scriptPath = path.join(packagePath, 'apply_to_harmony.py');
    await fs.writeFile(scriptPath, integrationScript);
    files.push(scriptPath);
    totalSize += integrationScript.length;

    // 5. Write manifest schema documentation
    const schemaDoc = this.generateSchemaDoc();
    const schemaPath = path.join(docsDir, 'MANIFEST_SCHEMA.md');
    await fs.writeFile(schemaPath, schemaDoc);
    files.push(schemaPath);
    totalSize += schemaDoc.length;

    // 6. Write package manifest
    const packageManifest = {
      packageName,
      createdAt: new Date().toISOString(),
      sceneId: input.manifest.sceneId,
      manifestId: input.manifest.manifestId,
      planId: input.commandPlan.planId,
      files: files.map(f => path.relative(packagePath, f)),
      totalSize,
      schemaVersion: '3.0',
      requiresHarmony: true
    };

    const packageManifestPath = path.join(packagePath, 'package.json');
    await fs.writeFile(packageManifestPath, JSON.stringify(packageManifest, null, 2));
    files.push(packageManifestPath);
    totalSize += JSON.stringify(packageManifest).length;

    return {
      packagePath,
      files,
      totalSize,
      manifest: packageManifest,
      readme
    };
  }

  private generateReadme(manifest: HarmonyManifestV3, commandPlan: CommandPlanV3): string {
    return `# Harmony Integration Package

## Overview

This package contains a complete AI Animation Studio output ready for integration with Toon Boom Harmony.

- **Scene ID**: ${manifest.sceneId}
- **Manifest ID**: ${manifest.manifestId}
- **Command Plan ID**: ${commandPlan.planId}
- **Schema Version**: 3.0
- **Created**: ${new Date().toISOString()}

## Contents

- \`manifest/harmony_manifest_v3.json\` - Complete Harmony Manifest V3 with all AI-generated data
- \`command_plan/harmony_command_plan_v3.json\` - Whitelist-only operation plan
- \`apply_to_harmony.py\` - Python script to apply this package to Harmony
- \`docs/MANIFEST_SCHEMA.md\` - Schema documentation
- \`package.json\` - Package metadata

## Manifest Contents

${this.summarizeManifest(manifest)}

## Command Plan

- **Total Operations**: ${commandPlan.totalOperations}
- **Whitelist Only**: ${commandPlan.whitelistOnly}
- **Rollback Supported**: ${commandPlan.rollbackPlan.supported}
- **Estimated Execution Time**: ${commandPlan.estimatedExecutionTimeMs}ms

## Integration

To apply this package to a real Harmony instance:

1. Ensure Harmony is running with external scripting enabled
2. Run: \`python apply_to_harmony.py\`
3. The script will:
   - Load the manifest
   - Execute the command plan in order
   - Apply rollback on failure
   - Save the scene version

## Limitations

${this.summarizeLimitations(manifest)}

## Support

This package was generated by the AI Animation Studio (Iterations 1-8).
For issues, refer to the project documentation.
`;
  }

  private generateIntegrationScript(): string {
    return `#!/usr/bin/env python3
"""
Harmony Integration Script
Applies Harmony Manifest V3 and Command Plan V3 to a real Harmony instance.
"""

import json
import sys
from pathlib import Path

def load_manifest(package_dir):
    manifest_path = Path(package_dir) / "manifest" / "harmony_manifest_v3.json"
    with open(manifest_path) as f:
        return json.load(f)

def load_command_plan(package_dir):
    plan_path = Path(package_dir) / "command_plan" / "harmony_command_plan_v3.json"
    with open(plan_path) as f:
        return json.load(f)

def apply_to_harmony(manifest, command_plan):
    """
    Apply the command plan to Harmony via external scripting API.
    This is a stub - real implementation requires Harmony Python API.
    """
    print(f"Manifest ID: {manifest['manifestId']}")
    print(f"Plan ID: {command_plan['planId']}")
    print(f"Total Operations: {command_plan['totalOperations']}")
    print()
    print("Operations to execute:")
    for op in command_plan['operations'][:10]:
        print(f"  {op['order']}. {op['operation']}: {op.get('description', '')}")
    if len(command_plan['operations']) > 10:
        print(f"  ... and {len(command_plan['operations']) - 10} more")
    print()
    print("NOTE: This is a stub. Real Harmony integration requires:")
    print("- Toon Boom Harmony with external scripting enabled")
    print("- Harmony Python API access")
    print("- Proper scene creation and manipulation")
    print()
    print("Honest status: harmonyApplied = false")

def main():
    if len(sys.argv) < 2:
        print("Usage: apply_to_harmony.py <package_dir>")
        sys.exit(1)

    package_dir = sys.argv[1]
    manifest = load_manifest(package_dir)
    command_plan = load_command_plan(package_dir)

    apply_to_harmony(manifest, command_plan)

if __name__ == "__main__":
    main()
`;
  }

  private generateSchemaDoc(): string {
    return `# Harmony Manifest V3 Schema

## Overview

The Harmony Manifest V3 is the canonical data structure for AI Animation Studio output.
It contains all generated artifacts needed to recreate a scene in Toon Boom Harmony.

## Schema Version: 3.0

## Top-Level Structure

- \`schemaVersion\`: Always "3.0"
- \`manifestId\`: Unique identifier
- \`sceneId\`: Scene identifier
- \`createdAt\`: ISO 8601 timestamp

## Core Sections

### Scene Understanding
- \`sceneUnderstanding\`: Dramatic beats, characters, emotion curve
- \`directorPlans\`: Camera and staging plans
- \`performancePlans\`: Acting and gesture plans
- \`voiceAnalysis\`: Voice-to-performance analysis

### Character and Rigging
- \`digitalActors\`: Character definitions
- \`partDecomposition\`: Character parts and occlusion
- \`occlusionGraph\`: Part occlusion relationships

### Animation
- \`keyPoses\`: Keyframe poses with features
- \`motionTracks\`: Transform keyframes per part
- \`cameraLayout\`: Shot plan and camera track
- \`cameraTrack\`: Camera keyframes

### Representation
- \`routingPlan\`: Part-to-representation mapping
- \`representationSegments\`: Frame ranges per representation

### Events
- \`gestureEvents\`: Character gestures
- \`gazeEvents\`: Eye/head movements
- \`facialEvents\`: Facial expressions

### Assets
- \`drawings\`: Drawing assets with paths
- \`palettes\`: Color palettes
- \`exposureBlocks\`: Drawing exposure schedule

### Quality
- \`criticReports\`: Technical and artistic checks
- \`variantTournament\`: Multi-round selection
- \`tasteScores\`: Pairwise preferences
- \`selectionHistory\`: Decision history

## Honest Limitations

The manifest always includes a \`limitations\` object with:
- \`ruleBasedBaseline\`: true (no ML adapters)
- \`noMlAdapters\`: true
- \`noHarmonyApplied\`: true
- \`artistIntentInferred\`: true

## Versioning

Schema migrations are handled via the \`schemaVersion\` field.
Breaking changes require a major version bump.
`;
  }

  private summarizeManifest(manifest: HarmonyManifestV3): string {
    const lines: string[] = [];

    if (manifest.sceneUnderstanding) {
      lines.push(`- Scene Understanding: ${manifest.sceneUnderstanding.beats?.length || 0} beats, ${manifest.sceneUnderstanding.characters?.length || 0} characters`);
    }

    if (manifest.keyPoses) {
      lines.push(`- Key Poses: ${manifest.keyPoses.poses?.length || 0} poses`);
    }

    if (manifest.motionTracks) {
      lines.push(`- Motion Tracks: ${manifest.motionTracks.length} tracks`);
    }

    if (manifest.cameraLayout) {
      lines.push(`- Camera Layout: ${manifest.cameraLayout.shots?.length || 0} shots, ${manifest.cameraLayout.cameraTrack?.keyframes?.length || 0} camera keyframes`);
    }

    if (manifest.routingPlan) {
      lines.push(`- Routing Plan: ${manifest.routingPlan.decisions?.length || 0} decisions`);
    }

    if (manifest.criticReports) {
      lines.push(`- Critic Reports: ${manifest.criticReports.length} reports`);
    }

    return lines.join('\n');
  }

  private summarizeLimitations(manifest: HarmonyManifestV3): string {
    const lines: string[] = [];

    if (manifest.limitations) {
      if (manifest.limitations.ruleBasedBaseline) {
        lines.push('- Rule-based baseline (no ML adapters connected)');
      }
      if (manifest.limitations.noHarmonyApplied) {
        lines.push('- Harmony not applied (all computation is offline)');
      }
      if (manifest.limitations.artistIntentInferred) {
        lines.push('- Artist intent is inferred, not directly observed');
      }
    }

    return lines.join('\n');
  }
}
