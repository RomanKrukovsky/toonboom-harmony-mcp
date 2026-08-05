"""Measures what this host can actually do.

Nothing here infers a capability from the operating system name. "macOS" does not imply a
working MPS build, and "Linux" does not imply CUDA. Every field is either measured or reported
as unknown, because a wrong answer routes a job onto a device where it will fail at load time.
"""

from __future__ import annotations

import os
import platform
import shutil
import sys
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class HardwareProfile:
    os: str
    architecture: str
    pythonVersion: str
    cpuCount: int
    ramGb: float
    freeDiskGb: float
    appleSilicon: bool
    mpsAvailable: bool
    cudaAvailable: bool
    cudaDeviceCount: int
    cudaDriverVersion: Optional[str]
    vramGb: Optional[float]
    onnxProviders: List[str] = field(default_factory=list)
    torchVersion: Optional[str] = None
    onnxruntimeVersion: Optional[str] = None
    # Derived from measurements, never from the OS name.
    recommendedProfile: str = "cpu_only"
    notes: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return self.__dict__.copy()


def _ram_gb() -> float:
    try:
        return round(os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 1024 ** 3, 1)
    except (ValueError, OSError, AttributeError):
        try:
            import psutil  # type: ignore

            return round(psutil.virtual_memory().total / 1024 ** 3, 1)
        except Exception:
            return 0.0


def _free_disk_gb(path: str = ".") -> float:
    try:
        return round(shutil.disk_usage(path).free / 1024 ** 3, 1)
    except OSError:
        return 0.0


def probe() -> HardwareProfile:
    notes: List[str] = []
    machine = platform.machine().lower()
    system = platform.system().lower()
    apple_silicon = system == "darwin" and machine in {"arm64", "aarch64"}

    mps_available = False
    cuda_available = False
    cuda_device_count = 0
    cuda_driver: Optional[str] = None
    vram_gb: Optional[float] = None
    torch_version: Optional[str] = None

    try:
        import torch  # type: ignore

        torch_version = torch.__version__
        # `is_available()` is the measurement. Being on Apple Silicon is not.
        mps_available = bool(getattr(torch.backends, "mps", None) and torch.backends.mps.is_available())
        cuda_available = bool(torch.cuda.is_available())
        if cuda_available:
            cuda_device_count = torch.cuda.device_count()
            try:
                props = torch.cuda.get_device_properties(0)
                vram_gb = round(props.total_memory / 1024 ** 3, 1)
            except Exception as exc:  # noqa: BLE001 - reported, not swallowed
                notes.append(f"CUDA device properties unavailable: {exc}")
            cuda_driver = getattr(torch.version, "cuda", None)
    except ImportError:
        notes.append("torch is not installed in this environment; MPS and CUDA are reported as unavailable rather than assumed")

    onnx_providers: List[str] = []
    onnxruntime_version: Optional[str] = None
    try:
        import onnxruntime as ort  # type: ignore

        onnxruntime_version = ort.__version__
        onnx_providers = list(ort.get_available_providers())
    except ImportError:
        notes.append("onnxruntime is not installed in this environment")

    profile = _classify(cuda_available, vram_gb, mps_available)

    return HardwareProfile(
        os=system,
        architecture=machine,
        pythonVersion=sys.version.split()[0],
        cpuCount=os.cpu_count() or 1,
        ramGb=_ram_gb(),
        freeDiskGb=_free_disk_gb(),
        appleSilicon=apple_silicon,
        mpsAvailable=mps_available,
        cudaAvailable=cuda_available,
        cudaDeviceCount=cuda_device_count,
        cudaDriverVersion=cuda_driver,
        vramGb=vram_gb,
        onnxProviders=onnx_providers,
        torchVersion=torch_version,
        onnxruntimeVersion=onnxruntime_version,
        recommendedProfile=profile,
        notes=notes,
    )


def _classify(cuda_available: bool, vram_gb: Optional[float], mps_available: bool) -> str:
    """Buckets the host by *measured* VRAM, not by vendor branding."""
    if cuda_available and vram_gb is not None:
        for threshold, name in ((80, "cuda_80gb"), (48, "cuda_48gb"), (24, "cuda_24gb"), (16, "cuda_16gb"), (8, "cuda_8gb")):
            if vram_gb >= threshold - 1:  # allow for reserved memory
                return name
        return "cpu_only"
    if mps_available:
        return "apple_silicon"
    if os.environ.get("ML_ALLOW_REMOTE_GPU", "false").lower() == "true":
        return "remote_gpu"
    return "cpu_only"


def devices() -> List[str]:
    p = probe()
    result = ["cpu"]
    if p.mpsAvailable:
        result.append("mps")
    if p.cudaAvailable:
        result.append("cuda")
    if os.environ.get("ML_ALLOW_REMOTE_GPU", "false").lower() == "true":
        result.append("remote")
    return result


def can_allocate(estimated_mb: float, device: str) -> bool:
    """Conservative pre-flight memory check, so an OOM is predicted rather than discovered."""
    p = probe()
    if device == "cuda":
        if p.vramGb is None:
            return False
        return estimated_mb <= p.vramGb * 1024 * 0.85
    # CPU and MPS both draw on system RAM on the hosts this runtime targets.
    return estimated_mb <= p.ramGb * 1024 * 0.7
