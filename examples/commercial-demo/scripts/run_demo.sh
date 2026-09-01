#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
BUNDLE_DIR="$(pwd)"

echo "==> Moho commercial-demo bundle"
echo "    Bundle: ${BUNDLE_DIR}"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "${NODE_MAJOR}" -lt 20 ]; then
  echo "ERROR: Node 20+ is required (found $(node -v 2>/dev/null || echo 'no node'))." >&2
  exit 1
fi
echo "==> Node $(node -v) OK"

REPO_ROOT="$(cd ../../ && pwd)"
echo "==> Repo root: ${REPO_ROOT}"

if [ ! -f "${REPO_ROOT}/package.json" ]; then
  echo "ERROR: cannot find package.json above the bundle. Run this script from examples/commercial-demo/scripts/." >&2
  exit 1
fi

cd "${REPO_ROOT}"

if [ ! -d "node_modules" ]; then
  echo "==> Installing dependencies (npm ci)..."
  npm ci
fi

echo "==> Building MCP server..."
npm run build

echo "==> Running moho_factory test suite..."
npm run test:moho_factory

cat <<EOF

Demo ready. Connect opencode to this directory and ask for moho.factory.run_show_bible

  Bundle:  ${BUNDLE_DIR}
  Plan:    ${BUNDLE_DIR}/scene_plan.json
  Bible:   ${BUNDLE_DIR}/show_bible/moho_show_bible.json
  Output:  ${BUNDLE_DIR}/demo_output/

EOF