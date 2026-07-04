# Toon Boom Harmony Environment Diagnostics & Real Validation

This guide outlines how to configure, validate, and execute real scene building and rendering workflows inside Toon Boom Harmony using the Toon Boom Harmony MCP server.

---

## 1. Configuration Setup (`.env`)

To interface with a real local installation of Toon Boom Harmony, create/update a `.env` file at the root of the project with the following parameters:

```env
# Path to the Harmony Premium executable binary
HARMONY_BIN="/Applications/Toon Boom Harmony 22 Premium/tba/macosx/bin/HarmonyPremium"

# Path to Harmony Python API packages (usually inside Toon Boom app bundle under resources)
HARMONY_PYTHON_PACKAGES="/Applications/Toon Boom Harmony 22 Premium/tba/macosx/resources/python"

# Persistent mode for python bridge daemon
HARMONY_PERSISTENT_MODE="true"

# Path to python executable (must be Python 3.9+ with support for ToonBoom module)
PYTHON_BIN="python3"
```

---

## 2. Running Diagnostics

Use the MCP tool `harmony.diagnostics.real_harmony_environment` to perform a comprehensive check of your setup:

### MCP Invocation
```json
{
  "name": "harmony.diagnostics.real_harmony_environment",
  "arguments": {}
}
```

### Response Format
```json
{
  "harmonyBin": {
    "configured": true,
    "exists": true,
    "executable": true,
    "path": "/Applications/Toon Boom Harmony 22 Premium/tba/macosx/bin/HarmonyPremium"
  },
  "pythonApi": {
    "packagesPathExists": true,
    "canImportToonBoomHarmony": true
  },
  "render": {
    "cliAvailable": true,
    "canRender": true,
    "output": "Harmony Premium version 22.0.0..."
  },
  "overall": "ready",
  "blockingIssues": [],
  "warnings": []
}
```

* **`overall` status definitions**:
  * `ready`: All paths configured, binary exists/executable, python ToonBoom modules successfully loaded.
  * `partially_ready`: Binary exists but Python module import failed. Real project creation will fail, but CLI rendering could work.
  * `not_ready`: Binary not found or not executable.

---

## 3. Executing the Real Smoke Test

Use the MCP tool `harmony.scene.real_smoke_test` to perform an end-to-end visible scene assembly and render:

### MCP Invocation
```json
{
  "name": "harmony.scene.real_smoke_test",
  "arguments": {
    "outputDir": "/Users/romanmolodyko/Documents/toon-boom-harmony-mcp/output/real_smoke_test"
  }
}
```

* **Temporary project created at**: `output/real_smoke_test/harmony_project/SC_001.xstage`
* **Real Preview rendered at**: `output/real_smoke_test/episode_package/previews/SC_001_preview.mp4`
* **Smoke Test Report saved at**: `output/real_smoke_test/episode_package/review_reports/real_smoke_test_report.json`

---

## 4. How to Verify rendering is REAL

Our engine incorporates a strict validation protocol to distinguish between simulation and true rendering:
1. **Report Validation**: Check `real_smoke_test_report.json` for:
   * `"isRealHarmonyExecution": true`
   * `"realProjectCreated": true`
   * `"realRenderValidated": true`
2. **File Check**: Open `episode_package/previews/SC_001_preview.mp4`.
   * Real rendering produces a valid binary H.264 video.
   * Simulation outputs a text file containing `SIMULATED_VIDEO_STREAM_PLACEHOLDER` with `realRenderValidated: false`.

---

## 5. Common Troubleshooting & Fixes

### Error: `HARMONY_NOT_AVAILABLE`
* **Cause**: Toon Boom Harmony binary not found or permissions issue.
* **Fix**: Verify your `HARMONY_BIN` path in `.env` exists. Check executable permissions: `chmod +x "/path/to/HarmonyPremium"`.

### Error: `PYTHON_API_UNAVAILABLE` (Failed to import ToonBoom.harmony)
* **Cause**: Python binary cannot locate Toon Boom packages or architecture mismatch (e.g. Apple Silicon running intel binary).
* **Fix**: Check `HARMONY_PYTHON_PACKAGES` path. Ensure you run standard Python interpreter packaged or supported by Toon Boom.
