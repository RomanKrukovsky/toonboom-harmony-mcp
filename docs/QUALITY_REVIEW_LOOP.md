# Quality Review Loop

An autonomous system to iteratively improve the generated scenes.

## Iteration Loop

1. **Assemble**: The scene is assembled in Harmony.
2. **Preview**: A preview MP4 or image sequence is rendered.
3. **Review**: The Visual Reviewer scores the preview based on acting, timing, and composition.
4. **Fix**: If the score is below target, a fix plan is generated and applied.
5. **Repeat**: Until the target score is met or max iterations reached.
