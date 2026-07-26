#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$DIR/../.."
RUNTIME_DIR="$PROJECT_ROOT/services/ml-runtime"

echo "Starting ML Runtime Worker..."
cd "$RUNTIME_DIR"

if [ ! -d ".venv-ml" ]; then
    echo "Creating virtual environment .venv-ml..."
    python3 -m venv .venv-ml
fi

source .venv-ml/bin/activate
pip install -q pydantic pyyaml fastapi uvicorn python-multipart

echo "Starting ML Runtime Server..."
.venv-ml/bin/python -m uvicorn app:app --port 8000 --reload
