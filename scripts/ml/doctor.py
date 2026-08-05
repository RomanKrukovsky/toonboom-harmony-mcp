"""Report what this host can actually run, and why anything blocked is blocked.

Reports facts only. Every "available" line below was measured; nothing is inferred from the
operating system name or from a package being importable.

    python scripts/ml/doctor.py [--json]
"""

from __future__ import annotations

import argparse
import importlib
import json
import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List

import _bootstrap  # noqa: F401
from _bootstrap import CATALOG_PATH, LOCAL_STATE_PATH, PROJECT_ROOT

OPTIONAL_PACKAGES = [
    "numpy", "cv2", "onnxruntime", "torch", "mediapipe", "transformers",
    "whisperx", "sam2", "diffusers", "scipy", "soundfile",
]
EXTERNAL_BINARIES = ["ffmpeg", "ffprobe", "mfa", "rhubarb"]


def package_report() -> Dict[str, str]:
    report: Dict[str, str] = {}
    for name in OPTIONAL_PACKAGES:
        try:
            module = importlib.import_module(name)
            report[name] = str(getattr(module, "__version__", "installed"))
        except Exception:  # noqa: BLE001 - absence is the answer, not an error
            report[name] = "not_installed"
    return report


def binary_report() -> Dict[str, str]:
    return {name: (shutil.which(name) or "not_found") for name in EXTERNAL_BINARIES}


def model_report() -> List[Dict[str, Any]]:
    from runtime.model_loader import MODEL_LOADER, model_cache_root  # noqa: WPS433

    if not CATALOG_PATH.is_file():
        return []
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    rows: List[Dict[str, Any]] = []
    for model in catalog.get("models", []):
        verification = MODEL_LOADER.verify_weights(model["modelId"], model["cacheKey"], model.get("weightsFiles", []))
        rows.append({
            "modelId": model["modelId"],
            "maturity": model["maturity"],
            "licenseStatus": model["license"]["status"],
            "installed": bool(verification.resolvedPaths) and not verification.missing,
            "hashVerified": verification.verified,
            "blockingReason": verification.blockingReason,
            "cacheDir": str(model_cache_root() / model["cacheKey"]),
        })
    return rows


def provider_report() -> List[Dict[str, Any]]:
    try:
        from runtime.provider_registry import build_default_registry  # noqa: WPS433

        registry = build_default_registry()
        return [registry.readiness(pid) for pid in registry.provider_ids()]
    except Exception as exc:  # noqa: BLE001 - reported, not hidden
        return [{"providerId": "<registry>", "ready": False, "blockingReason": f"{type(exc).__name__}: {exc}"}]


def build_report() -> Dict[str, Any]:
    from runtime.hardware_probe import probe  # noqa: WPS433

    hardware = probe()
    return {
        "projectRoot": str(PROJECT_ROOT),
        "python": sys.executable,
        "hardware": hardware.to_dict(),
        "packages": package_report(),
        "binaries": binary_report(),
        "models": model_report(),
        "providers": provider_report(),
        "localStatePresent": LOCAL_STATE_PATH.is_file(),
    }


def print_human(report: Dict[str, Any]) -> None:
    hardware = report["hardware"]
    print("=== host ===")
    print(f"  python           {report['python']} ({hardware['pythonVersion']})")
    print(f"  os/arch          {hardware['os']}/{hardware['architecture']}")
    print(f"  cpu cores        {hardware['cpuCount']}")
    print(f"  ram              {hardware['ramGb']} GB")
    print(f"  free disk        {hardware['freeDiskGb']} GB")
    print(f"  apple silicon    {hardware['appleSilicon']}")
    print(f"  MPS available    {hardware['mpsAvailable']}   (measured, not inferred from the OS)")
    print(f"  CUDA available   {hardware['cudaAvailable']} devices={hardware['cudaDeviceCount']} driver={hardware['cudaDriverVersion']}")
    print(f"  VRAM             {hardware['vramGb']}")
    print(f"  ORT providers    {', '.join(hardware['onnxProviders']) or 'none'}")
    print(f"  profile          {hardware['recommendedProfile']}")
    for note in hardware["notes"]:
        print(f"  note             {note}")

    print("\n=== python packages ===")
    for name, version in report["packages"].items():
        print(f"  {name:<16} {version}")

    print("\n=== external binaries ===")
    for name, location in report["binaries"].items():
        print(f"  {name:<16} {location}")

    print("\n=== models ===")
    for row in report["models"]:
        state = "hash-verified" if row["hashVerified"] else ("installed" if row["installed"] else "absent")
        print(f"  {row['modelId']:<28} {state:<14} {row['licenseStatus']:<26} {row['blockingReason'] or ''}")

    print("\n=== providers ===")
    for row in report["providers"]:
        state = "ready" if row.get("ready") else "blocked"
        print(f"  {row.get('providerId'):<28} {state:<8} {row.get('blockingReason') or ''}")


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(prog="doctor.py")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    report = build_report()
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print_human(report)
    # Doctor is diagnostic: an unhealthy host is information, not a script failure.
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
