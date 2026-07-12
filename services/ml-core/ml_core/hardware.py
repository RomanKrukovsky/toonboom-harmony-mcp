import json
import platform
from pathlib import Path
from pydantic import BaseModel
from .config import ROOT_DIR

class MLHardwareProfile(BaseModel):
    os: str
    architecture: str
    appleSilicon: bool
    mpsAvailable: bool
    cudaAvailable: bool
    onnxProviders: list[str]
    ramGb: float
    freeDiskGb: float
    recommendedProfile: str

def get_system_profile() -> MLHardwareProfile:
    report_path = ROOT_DIR / "output" / "ml_setup" / "system_report.json"
    if report_path.is_file():
        try:
            data = json.loads(report_path.read_text(encoding="utf-8"))
            return MLHardwareProfile(**data)
        except Exception:
            pass
            
    # Simple runtime fallback
    os_name = platform.system().lower()
    arch = platform.machine().lower()
    apple_silicon = os_name == "darwin" and arch == "arm64"
    
    # Try importing torch to check MPS/CUDA
    mps = False
    cuda = False
    try:
        import torch
        mps = torch.backends.mps.is_available()
        cuda = torch.cuda.is_available()
    except Exception:
        pass

    rec = "cpu_portable"
    if cuda:
        rec = "nvidia_cuda"
    elif apple_silicon:
        rec = "apple_silicon_balanced"

    return MLHardwareProfile(
        os=os_name,
        architecture=arch,
        appleSilicon=apple_silicon,
        mpsAvailable=mps,
        cudaAvailable=cuda,
        onnxProviders=["CPUExecutionProvider"],
        ramGb=8.0,
        freeDiskGb=20.0,
        recommendedProfile=rec
    )
