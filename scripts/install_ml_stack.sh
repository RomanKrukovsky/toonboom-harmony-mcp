#!/bin/bash
set -euo pipefail

# Scripts directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== ML Perception Stack Installation Script ==="
cd "${ROOT_DIR}"

PROFILE="auto"
DOWNLOAD_MODELS=true
RUN_SMOKE_TESTS=true
PYTHON_EXE="python3.12"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --profile)
      PROFILE="$2"
      shift 2
      ;;
    --no-download-models)
      DOWNLOAD_MODELS=false
      shift
      ;;
    --no-smoke-tests)
      RUN_SMOKE_TESTS=false
      shift
      ;;
    --python)
      PYTHON_EXE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# 1. Run system detection if not done
if [ ! -f "output/ml_setup/system_report.json" ]; then
  echo "Running hardware detection..."
  KMP_DUPLICATE_LIB_OK=TRUE python3 scripts/ml_detect_system.py
fi

# 2. Determine profile
if [ "${PROFILE}" = "auto" ]; then
  # Read recommended profile from json using python
  PROFILE=$(python3 -c "import json; print(json.load(open('output/ml_setup/system_report.json'))['recommendedProfile'])")
  echo "Automatically selected profile: ${PROFILE}"
else
  echo "Using manually selected profile: ${PROFILE}"
fi

# Map profile to requirements file
REQ_FILE=""
if [ "${PROFILE}" = "nvidia_cuda" ]; then
  REQ_FILE="services/ml-core/requirements/cuda.txt"
elif [ "${PROFILE}" = "apple_silicon_balanced" ]; then
  REQ_FILE="services/ml-core/requirements/apple-silicon.txt"
else
  PROFILE="cpu_portable"
  REQ_FILE="services/ml-core/requirements/cpu.txt"
fi

# 3. Create virtual environment
VENV_DIR=".venv-ml-core"
echo "Creating virtual environment in ${VENV_DIR} using ${PYTHON_EXE}..."
if [ ! -d "${VENV_DIR}" ]; then
  uv venv "${VENV_DIR}" --python "${PYTHON_EXE}"
else
  echo "Virtual environment already exists."
fi

# 4. Install requirements
echo "Installing dependencies from ${REQ_FILE}..."
uv pip install -r "${REQ_FILE}" --python "${VENV_DIR}/bin/python"

# 5. Install ml-core package in editable mode
echo "Installing ml-core package in editable mode..."
uv pip install -e services/ml-core --no-deps --python "${VENV_DIR}/bin/python"

# 6. Verify stack
echo "Verifying installation..."
"${VENV_DIR}/bin/python" -c "
import ml_core
print('ml_core imported successfully.')
" || { echo "Failed to import ml_core package"; exit 1; }

echo "ML Stack installation completed successfully under profile: ${PROFILE}"
