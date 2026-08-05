"""Audited model download.

Before a single byte is fetched the operator is shown: the upstream URL, the pinned revision,
the licence status, the download size, the free disk, and the expected digest. Nothing else is
downloaded — only files present in the catalog's allowlisted manifest.

Files with no trusted digest land in ``data/quarantine`` and stay there. The script computes and
prints the measured digest and stops: promoting a quarantined file to trusted requires a human
to add the value to catalog.json, which is a reviewed commit.

No install script from the upstream project is executed and no shell command is constructed
from catalog data.

    python scripts/ml/download_model.py --model-id dwpose-ll-ucoco-384 [--yes]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

import _bootstrap  # noqa: F401
from _bootstrap import CATALOG_PATH, PROJECT_ROOT

from runtime.model_loader import model_cache_root  # noqa: E402

QUARANTINE_ROOT = PROJECT_ROOT / "data" / "quarantine"
ALLOWED_SCHEMES = {"https"}
ALLOWED_HOSTS = {
    "huggingface.co",
    "cdn-lfs.huggingface.co",
    "dl.fbaipublicfiles.com",
    "openaipublic.azureedge.net",
    "download.openmmlab.com",
    "storage.googleapis.com",
    "github.com",
    "objects.githubusercontent.com",
}
CHUNK = 1024 * 1024


def load_model(model_id: str) -> Dict[str, Any]:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    for model in catalog.get("models", []):
        if model["modelId"] == model_id:
            return model
    raise SystemExit(f"model {model_id!r} is not in catalog.json; add it there first")


def check_url(url: str) -> None:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise SystemExit(f"refusing non-HTTPS URL: {url}")
    if parsed.hostname not in ALLOWED_HOSTS:
        raise SystemExit(
            f"host {parsed.hostname!r} is not in the download allowlist. Add it deliberately in "
            "scripts/ml/download_model.py after reviewing where the weights actually come from."
        )


def human(size: Optional[int]) -> str:
    if size is None:
        return "unknown"
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} TB"


def summarise(model: Dict[str, Any]) -> None:
    license_record = model["license"]
    print(f"model            {model['modelId']}  ({model['displayName']})")
    print(f"upstream         {model['upstreamRepository']}")
    print(f"pinned commit    {model['upstreamCommit'] or 'NOT PINNED'}")
    print(f"revision         {model['revision']}")
    print(f"cache key        {model['cacheKey']}")
    print(f"cache directory  {model_cache_root() / model['cacheKey']}")
    print(f"licence status   {license_record['status']}")
    print(f"  code           {license_record['codeLicense']}")
    print(f"  weights        {license_record['weightsLicense']}")
    print(f"  dataset        {license_record['datasetLicense']}")
    print(f"  commercial     {license_record['commercialUse']}")
    print(f"  notes          {license_record['legalNotes']}")
    total = sum(f["sizeBytes"] or 0 for f in model["weightsFiles"])
    print(f"download size    {human(total) if total else 'unknown'}")
    print(f"free disk        {human(shutil.disk_usage(PROJECT_ROOT).free)}")
    print("files:")
    for spec in model["weightsFiles"]:
        digest = spec["sha256"] or f"NONE ({spec['hashSource']}) -> quarantine"
        print(f"  - {spec['fileName']:<40} {human(spec['sizeBytes'])}  {digest}")
        print(f"    {spec['url']}")


def download(url: str, target: Path) -> str:
    target.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    temporary = target.with_suffix(target.suffix + ".part")
    request = urllib.request.Request(url, headers={"User-Agent": "toonboom-harmony-mcp/model-downloader"})
    with urllib.request.urlopen(request) as response, temporary.open("wb") as handle:  # noqa: S310 - scheme and host are allowlisted above
        while True:
            chunk = response.read(CHUNK)
            if not chunk:
                break
            handle.write(chunk)
            digest.update(chunk)
    temporary.replace(target)
    return digest.hexdigest()


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(prog="download_model.py")
    parser.add_argument("--model-id", required=True)
    parser.add_argument("--yes", action="store_true", help="skip the interactive confirmation")
    parser.add_argument("--dry-run", action="store_true", help="show the plan and stop")
    args = parser.parse_args(argv)

    model = load_model(args.model_id)
    summarise(model)

    if not model["weightsFiles"]:
        print("\nThis catalog entry declares no weights files. Nothing to download.")
        return 1

    for spec in model["weightsFiles"]:
        check_url(spec["url"])

    if args.dry_run:
        print("\ndry run: nothing was downloaded")
        return 0

    if model["license"]["status"] in {"blocked", "unknown"}:
        print(f"\nREFUSED: licence status is {model['license']['status']}. Resolve the licence before downloading.")
        return 2

    if not args.yes:
        answer = input("\nProceed with download? [y/N] ").strip().lower()
        if answer != "y":
            print("aborted")
            return 1

    cache_dir = model_cache_root() / model["cacheKey"]
    exit_code = 0
    for spec in model["weightsFiles"]:
        expected = spec["sha256"]
        quarantined = expected is None
        destination = (QUARANTINE_ROOT / model["modelId"] if quarantined else cache_dir) / spec["fileName"]
        print(f"\ndownloading {spec['fileName']} -> {destination}")
        measured = download(spec["url"], destination)
        print(f"  measured sha256 {measured}")

        if quarantined:
            print("  QUARANTINED: the catalog has no trusted digest for this file.")
            print("  Review the value above, add it to catalog.json as sha256 with")
            print("  hashSource=\"locally_computed_and_reviewed\", then re-run this command.")
            exit_code = 3
        elif measured != expected:
            print(f"  DIGEST MISMATCH: catalog expects {expected}")
            destination.unlink(missing_ok=True)
            print("  file deleted; nothing untrusted is left in the cache")
            exit_code = 4
        else:
            print("  digest matches the catalog")

    return exit_code


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
