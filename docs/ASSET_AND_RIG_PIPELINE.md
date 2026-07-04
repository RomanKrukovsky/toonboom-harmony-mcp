# Asset and Rig Pipeline

## Asset Generation

The asset planner evaluates the required characters, backgrounds, and props from the script.
If assets are missing, it:
1. Generates placeholder templates.
2. Creates prompts for external image generation tools to design the layered assets.

## Rig Synthesizer

The Rig Synthesizer takes layered assets (or placeholders) and maps them to a Harmony node structure.
- **360 Rig Planner**: Maps out head and body angles for smooth turns.
- **Master Controllers**: Generates plans for facial expressions and angle controls.
