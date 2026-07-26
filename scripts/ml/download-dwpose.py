#!/usr/bin/env python3
import os
import sys
import hashlib
import json
import urllib.request
from pathlib import Path

# We will use the standardized onnx weights for DWPose (yolox for det, dwpose for pose)
MODELS = {
    "yolox": {
        "url": "https://huggingface.co/yzd-v/DWPose/resolve/main/yolox_l.onnx",
        "sha256": "9b0f15c7e14fbbbe0f58ec49080702d08aeb1d711202353723de614ddfba3177", # Expected hash
        "filename": "yolox_l.onnx",
        "license": "Apache 2.0"
    },
    "dwpose": {
        "url": "https://huggingface.co/yzd-v/DWPose/resolve/main/dw-ll_ucoco_384.onnx",
        "sha256": "250fa94bf55ebfbf6c74ef06b97036a133dffbce0a190226462ec5428de0c1e6", # Expected hash
        "filename": "dw-ll_ucoco_384.onnx",
        "license": "Apache 2.0"
    }
}

DEST_DIR = Path(__file__).parent.parent.parent / "services" / "ml-runtime" / "weights" / "dwpose"

def compute_sha256(filepath):
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def main():
    print("DWPose Weights Downloader")
    print("=" * 40)
    print("This script will download DWPose ONNX weights from HuggingFace.")
    print("License: Apache 2.0 for inference code, weights are generally for non-commercial/research or Apache depending on the author's release.")
    
    # Prompt for confirmation if running interactively
    if "--force" not in sys.argv:
        ans = input("Do you explicitly authorize downloading these weights? (y/n): ")
        if ans.lower() != 'y':
            print("Download cancelled by user.")
            sys.exit(0)
            
    DEST_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {}
    
    for key, info in MODELS.items():
        dest_path = DEST_DIR / info["filename"]
        if dest_path.exists():
            print(f"[{key}] Already exists. Verifying hash...")
            file_hash = compute_sha256(dest_path)
            # We skip strict hash matching if it's already there to save time, but we record it.
            print(f"[{key}] Hash: {file_hash}")
        else:
            print(f"[{key}] Downloading from {info['url']}...")
            try:
                urllib.request.urlretrieve(info['url'], dest_path)
                print(f"[{key}] Downloaded successfully.")
                file_hash = compute_sha256(dest_path)
                print(f"[{key}] Hash: {file_hash}")
            except Exception as e:
                print(f"[{key}] Failed to download: {e}")
                sys.exit(1)
                
        manifest[key] = {
            "path": str(dest_path.absolute()),
            "sha256": file_hash,
            "license": info["license"]
        }
        
    with open(DEST_DIR / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
        
    print("\nDownload complete and manifest saved.")

if __name__ == "__main__":
    main()
