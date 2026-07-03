# Harmony Helper Panel & Server

This optional helper component allows the Harmony MCP Server to communicate directly with an active, open session of Toon Boom Harmony via WebSockets.

## How it works
1. **harmony_helper_server.py**: Runs a local WebSocket server (by default on `localhost:8765`). It receives automation commands from the MCP server and forwards them to the Harmony helper panel.
2. **harmony_helper_panel.py**: A PySide6-based panel script that you run *inside* Toon Boom Harmony (via the Scripting toolbar or the Python Console). It connects to the local WebSocket server and executes incoming commands on Harmony's main thread.

## Running the helper
1. Enable the helper in your `.env` configuration file:
   ```env
   HARMONY_HELPER_ENABLED=true
   HARMONY_HELPER_PORT=8765
   ```
2. Start the WebSocket helper server:
   ```bash
   python scripts/harmony-helper/harmony_helper_server.py
   ```
3. Load and run `harmony_helper_panel.py` inside Harmony's Python console:
   ```python
   # In Harmony Python Console
   exec(open("/path/to/scripts/harmony-helper/harmony_helper_panel.py").read())
   ```
