# Prompt to Harmony Scene Engine

Transforms a natural language prompt directly into a structured Harmony scene plan.

## Architecture

1. **Prompt Parsing**: Extracts intent, characters, and actions.
2. **Scene Decomposition**: Breaks down the narrative into shots and scenes.
3. **Plan Generation**: Converts abstract scene elements into `scene_plan.json`.
4. **Harmony Execution**: The Autopilot reads the plan and executes it via API or UI automation.

## Usage

Use the `harmony.prompt.to_scene` tool to convert a text description into a plan.
