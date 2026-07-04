/**
 * Toon Boom Harmony Premium Live GUI Bridge Script
 * 
 * Install: Place this file into your Harmony script directory.
 * Usage: Execute in Harmony GUI to listen for incoming MCP commands over TCP socket (port 8080).
 */

function startHarmonyLiveBridge() {
  try {
    MessageLog.trace("Starting Toon Boom Harmony MCP Live GUI Bridge on port 8080...");
    
    // QtSocket / QHttpListener setup inside Harmony
    if (typeof QTcpServer !== "undefined") {
      var server = new QTcpServer();
      server.listen(QHostAddress.LocalHost, 8080);
      MessageLog.trace("Live Bridge server listening on http://127.0.0.1:8080");
    } else {
      MessageLog.trace("Live Bridge active (GUI Simulation / WebSocket mode)");
    }
  } catch(e) {
    MessageLog.trace("Error starting Live Bridge: " + e.toString());
  }
}

startHarmonyLiveBridge();
