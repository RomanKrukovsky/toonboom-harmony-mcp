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
        "sha256": "7860ae79de6c89a3c1eb72ae9a2756c0ccfbe04b7791bb5880afabd97855a411",  # verified 2026-07-27
        "filename": "yolox_l.onnx",
        "license": "Apache 2.0"
    },
    "dwpose": {
        "url": "https://huggingface.co/yzd-v/DWPose/resolve/main/dw-ll_ucoco_384.onnx",
        "sha256": "724f4ff2439ed61afb86fb8a1951ec39c6220682803b4a8bd4f598cd913b1843",  # verified 2026-07-27
        "filename": "dw-ll_ucoco_384.onnx",
        "license": "Apache 2.0"
    }
}

DEST_DIR = Path(__file__).parent.parent.parent / "services" / "ml-runtime" / "weights" / "dwpose"

def verify_or_fail(key, actual, expected):
    """
    Fail loudly on a hash mismatch. The previous version computed the digest, printed it,
    and never compared it to the declared value, so the declared hashes were decorative
    and a substituted weight file would have been accepted silently.
    """
    print(f"[{key}] Hash: {actual}")
    if not expected:
        print(f"[{key}] WARNING: no expected hash declared; integrity not verified.")
        return
    if actual != expected:
        print(f"[{key}] ERROR: hash mismatch.\n  expected {expected}\n  actual   {actual}")
        sys.exit(1)
    print(f"[{key}] Integrity verified.")


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
            verify_or_fail(key, file_hash, info["sha256"])
        else:
            print(f"[{key}] Downloading from {info['url']}...")
            try:
                urllib.request.urlretrieve(info['url'], dest_path)
                print(f"[{key}] Downloaded successfully.")
                file_hash = compute_sha256(dest_path)
                verify_or_fail(key, file_hash, info["sha256"])
            except Exception as e:
                print(f"[{key}] Failed to download: {e}")
                sys.exit(1)
                
        manifest[key] = {
            "path": dest_path.relative_to(DEST_DIR).as_posix(),  # portable; resolved next to the manifest
            "sha256": file_hash,
            "license": info["license"]
        }
        
    with open(DEST_DIR / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
        
    print("\nDownload complete and manifest saved.")

if __name__ == "__main__":
    main()
