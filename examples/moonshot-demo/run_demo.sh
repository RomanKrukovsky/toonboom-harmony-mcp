#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

node examples/moonshot-demo/run_demo.js

echo "Demo artifacts written to: examples/moonshot-demo/output"
