#!/bin/bash
# Helper script to launch Control Center Telnet script server on port 1234.

PORT=1234
echo "Configuring remote script port to ${PORT}..."
export TOONBOOM_REMOTE_SCRIPT=${PORT}

echo "Launching Harmony Control Center Script Server..."
# Adjust Controlcenter binary command if it is not in your global system PATH
Controlcenter -script -tcpPort ${PORT}
