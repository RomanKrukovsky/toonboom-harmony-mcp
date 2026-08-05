# Per-stack requirement pins

These stacks are **not** merged into one file, because they genuinely conflict: SAM 2 and
ToonCrafter want different torch builds, WhisperX pins its own transformers range, and MMPose
brings an mmcv build matrix that nothing else tolerates. A single `requirements.txt` would force
one of them to lose.

## What a `.lock` file here is, precisely

Each file pins **exact versions of direct dependencies** and, for Git sources, an **exact commit
SHA**. They are hand-curated pins, not the output of `pip-compile --generate-hashes`: this
repository has no CI resolver, and generating a fully hash-locked transitive tree requires
network resolution per platform. The header of each file repeats this so nobody mistakes the
guarantee on offer.

To harden a stack into a true hash-locked file once you have network access:

```
pip install pip-tools
pip-compile --generate-hashes --output-file requirements-pose.lock requirements-pose.in
```

## Rules that apply to every file here

* No unpinned Git dependency. `@main` is forbidden; every VCS requirement carries `@<sha>`.
* No `--trust-remote-code`. Hugging Face loads always pass `trust_remote_code=False`.
* Prefer `safetensors` over pickle. Where only a `.pth`/`.pt` exists, the checkpoint is loaded
  in an isolated worker and only after its digest matches the catalog.
* Installation target is a per-stack virtualenv, never the system Python.
