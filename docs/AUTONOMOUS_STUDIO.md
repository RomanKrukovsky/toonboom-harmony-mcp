# Autonomous Animation Production Engine for Toon Boom Harmony

## Overview
The Autonomous Animation Production Engine turns natural language creative prompts into fully editable 2D animation projects in Toon Boom Harmony, rendered previews, and complete studio review packages.

It orchestrates scriptwriting, storyboarding, character design, rigging, keyframe animation, camera work, audio/lipsync, compositing, rendering, quality control, and automated fix loops.

## Central MCP Entry Point
Use the primary MCP tool to trigger complete production:
```json
{
  "name": "harmony.studio.run_production",
  "arguments": {
    "prompt": "Создай 45-секундную оригинальную комедийную сцену. Два персонажа находятся в небольшой космической мастерской...",
    "projectName": "space_workshop_ep01",
    "engineMode": "simulation",
    "durationSeconds": 45,
    "qualityPreset": "broadcast"
  }
}
```

## Resumability & Idempotency
Interrupted production runs can be safely resumed without re-building completed stages:
```json
{
  "name": "harmony.studio.resume_production",
  "arguments": {
    "packageDir": "./output/space_workshop_ep01"
  }
}
```

## Standard Execution Response Contract
Every tool execution returns a standardized status shape:
- `mode`: `'simulation' | 'dry_run' | 'real' | 'hybrid' | 'moonshot'`
- `status`: `'success' | 'partial_success' | 'simulation_success' | 'unsupported' | 'blocked' | 'failed' | 'requires_human'`
- `isRealHarmonyExecution`: `boolean`
- `simulated`: `boolean`
- `placeholder`: `boolean`
- `requiresHumanReview`: `boolean`
- `requiresRealHarmony`: `boolean`
- `warnings`: `string[]`
- `errors`: `string[]`
- `artifacts`: `string[]`
- `executionReportPath`: `string`
- `correlationId`: `string`
- `startedAt`: `string`
- `completedAt`: `string`
