#!/usr/bin/env python3
import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

def get_free_disk_gb(path="/"):
    total, used, free = shutil.disk_usage(path)
    return round(free / (1024 ** 3), 2)

def get_ram_gb():
    try:
        if platform.system() == "Darwin":
            res = subprocess.check_output(["sysctl", "-n", "hw.memsize"])
            return round(int(res.strip()) / (1024 ** 3), 2)
        elif platform.system() == "Linux":
            with open("/proc/meminfo") as f:
                for line in f:
                    if "MemTotal" in line:
                        total = int(line.split()[1])
                        return round(total / (1024 ** 2), 2)
    except:
        pass
    return 8.0  # fallback

def check_command(cmd):
    return shutil.which(cmd) is not None

def run_command(args):
    try:
        res = subprocess.run(args, capture_output=True, text=True, check=True)
        return res.stdout.strip()
    except:
        return None

def main():
    os_name = platform.system().lower()
    arch = platform.machine().lower()
    
    apple_silicon = False
    if os_name == "darwin" and arch == "arm64":
        apple_silicon = True
        
    cpu_model = "Unknown"
    if os_name == "darwin":
        cpu_model = run_command(["sysctl", "-n", "machdep.cpu.brand_string"]) or "Apple Silicon"
    elif os_name == "linux":
        try:
            with open("/proc/cpuinfo") as f:
                for line in f:
                    if "model name" in line:
                        cpu_model = line.split(":", 1)[1].strip()
                        break
        except: pass

    # Check PyTorch & MPS / CUDA
    mps_available = False
    cuda_available = False
    cuda_version = None
    torch_available = False
    try:
        import torch
        torch_available = True
        mps_available = torch.backends.mps.is_available()
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            cuda_version = torch.version.cuda
    except:
        # Check system python torch just in case
        try:
            import subprocess
            torch_check = subprocess.run(
                [sys.executable, "-c", "import torch; print(torch.cuda.is_available(), torch.backends.mps.is_available())"],
                capture_output=True, text=True
            )
            if torch_check.returncode == 0:
                torch_available = True
                parts = torch_check.stdout.strip().split()
                cuda_available = parts[0] == "True"
                mps_available = parts[1] == "True"
        except: pass

    # Check ONNX Runtime
    onnx_available = False
    onnx_providers = []
    try:
        import onnxruntime as ort
        onnx_available = True
        onnx_providers = ort.get_available_providers()
    except:
        pass

    # Check versions of tools
    node_version = run_command(["node", "--version"])
    npm_version = run_command(["npm", "--version"])
    brew_version = run_command(["brew", "--version"])
    if brew_version:
        brew_version = brew_version.split("\n")[0]
    ffmpeg_version = run_command(["ffmpeg", "-version"])
    if ffmpeg_version:
        ffmpeg_version = ffmpeg_version.split("\n")[0]
    ffprobe_version = run_command(["ffprobe", "-version"])
    if ffprobe_version:
        ffprobe_version = ffprobe_version.split("\n")[0]
    git_lfs_version = run_command(["git", "lfs", "version"])
    uv_version = run_command(["uv", "--version"])
    micromamba_version = run_command(["micromamba", "--version"])
    cmake_version = run_command(["cmake", "--version"])
    if cmake_version:
        cmake_version = cmake_version.split("\n")[0]
    ninja_version = run_command(["ninja", "--version"])
    rust_version = run_command(["rustc", "--version"])

    # Determine profile
    ram_gb = get_ram_gb()
    free_disk = get_free_disk_gb()
    
    if cuda_available:
        recommended_profile = "nvidia_cuda"
    elif apple_silicon:
        recommended_profile = "apple_silicon_balanced"
    else:
        recommended_profile = "cpu_portable"

    report = {
        "os": os_name,
        "architecture": arch,
        "appleSilicon": apple_silicon,
        "cpuModel": cpu_model,
        "ramGb": ram_gb,
        "freeDiskGb": free_disk,
        "torchAvailable": torch_available,
        "mpsAvailable": mps_available,
        "cudaAvailable": cuda_available,
        "cudaVersion": cuda_version,
        "onnxAvailable": onnx_available,
        "onnxProviders": onnx_providers,
        "tools": {
            "node": node_version,
            "npm": npm_version,
            "brew": brew_version,
            "ffmpeg": ffmpeg_version,
            "ffprobe": ffprobe_version,
            "gitLfs": git_lfs_version,
            "uv": uv_version,
            "micromamba": micromamba_version,
            "cmake": cmake_version,
            "ninja": ninja_version,
            "rustc": rust_version
        },
        "recommendedProfile": recommended_profile
    }

    out_dir = Path("output/ml_setup")
    out_dir.mkdir(parents=True, exist_ok=True)

    # Write JSON
    json_path = out_dir / "system_report.json"
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Written system report to {json_path}")

    # Write HTML
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>ML Perception Stack Hardware Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #121212; color: #e0e0e0; margin: 2rem; }}
        h1 {{ color: #ffffff; border-bottom: 1px solid #333; padding-bottom: 0.5rem; }}
        h2 {{ color: #00ffcc; }}
        .profile {{ font-size: 1.25rem; font-weight: bold; color: #ff007f; background-color: #221122; display: inline-block; padding: 0.5rem 1rem; border-radius: 4px; margin-bottom: 1rem; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 1rem; }}
        th, td {{ text-align: left; padding: 0.75rem; border-bottom: 1px solid #333; }}
        th {{ background-color: #1f1f1f; color: #00ffcc; }}
        .yes {{ color: #00ff66; font-weight: bold; }}
        .no {{ color: #ff3333; }}
    </style>
</head>
<body>
    <h1>ML Perception Stack Hardware Report</h1>
    <div class="profile">Recommended Profile: {recommended_profile}</div>
    
    <h2>System Specs</h2>
    <table>
        <tr><th>Parameter</th><th>Value</th></tr>
        <tr><td>OS</td><td>{report['os']}</td></tr>
        <tr><td>Architecture</td><td>{report['architecture']}</td></tr>
        <tr><td>Apple Silicon</td><td class="{"yes" if report['appleSilicon'] else "no"}">{report['appleSilicon']}</td></tr>
        <tr><td>CPU Model</td><td>{report['cpuModel']}</td></tr>
        <tr><td>RAM (GB)</td><td>{report['ramGb']} GB</td></tr>
        <tr><td>Free Disk Space (GB)</td><td>{report['freeDiskGb']} GB</td></tr>
    </table>

    <h2>Inference & Acceleration backends</h2>
    <table>
        <tr><th>Backend</th><th>Available</th><th>Details</th></tr>
        <tr><td>Apple MPS (Metal Performance Shaders)</td><td class="{"yes" if report['mpsAvailable'] else "no"}">{report['mpsAvailable']}</td><td>PyTorch accelerated on Apple Silicon</td></tr>
        <tr><td>NVIDIA CUDA</td><td class="{"yes" if report['cudaAvailable'] else "no"}">{report['cudaAvailable']}</td><td>CUDA Version: {report['cudaVersion'] or 'N/A'}</td></tr>
        <tr><td>ONNX Runtime</td><td class="{"yes" if report['onnxAvailable'] else "no"}">{report['onnxAvailable']}</td><td>Providers: {", ".join(report['onnxProviders']) or 'None'}</td></tr>
    </table>

    <h2>System Tooling</h2>
    <table>
        <tr><th>Tool</th><th>Installed</th><th>Version</th></tr>
        <tr><td>Node.js</td><td class="{"yes" if report['tools']['node'] else "no"}">{"Yes" if report['tools']['node'] else "No"}</td><td>{report['tools']['node'] or 'N/A'}</td></tr>
        <tr><td>npm</td><td class="{"yes" if report['tools']['npm'] else "no"}">{"Yes" if report['tools']['npm'] else "No"}</td><td>{report['tools']['npm'] or 'N/A'}</td></tr>
        <tr><td>Homebrew</td><td class="{"yes" if report['tools']['brew'] else "no"}">{"Yes" if report['tools']['brew'] else "No"}</td><td>{report['tools']['brew'] or 'N/A'}</td></tr>
        <tr><td>ffmpeg</td><td class="{"yes" if report['tools']['ffmpeg'] else "no"}">{"Yes" if report['tools']['ffmpeg'] else "No"}</td><td>{report['tools']['ffmpeg'] or 'N/A'}</td></tr>
        <tr><td>ffprobe</td><td class="{"yes" if report['tools']['ffprobe'] else "no"}">{"Yes" if report['tools']['ffprobe'] else "No"}</td><td>{report['tools']['ffprobe'] or 'N/A'}</td></tr>
        <tr><td>uv</td><td class="{"yes" if report['tools']['uv'] else "no"}">{"Yes" if report['tools']['uv'] else "No"}</td><td>{report['tools']['uv'] or 'N/A'}</td></tr>
        <tr><td>micromamba</td><td class="{"yes" if report['tools']['micromamba'] else "no"}">{"Yes" if report['tools']['micromamba'] else "No"}</td><td>{report['tools']['micromamba'] or 'N/A'}</td></tr>
        <tr><td>cmake</td><td class="{"yes" if report['tools']['cmake'] else "no"}">{"Yes" if report['tools']['cmake'] else "No"}</td><td>{report['tools']['cmake'] or 'N/A'}</td></tr>
        <tr><td>ninja</td><td class="{"yes" if report['tools']['ninja'] else "no"}">{"Yes" if report['tools']['ninja'] else "No"}</td><td>{report['tools']['ninja'] or 'N/A'}</td></tr>
        <tr><td>rust</td><td class="{"yes" if report['tools']['rustc'] else "no"}">{"Yes" if report['tools']['rustc'] else "No"}</td><td>{report['tools']['rustc'] or 'N/A'}</td></tr>
    </table>
</body>
</html>
"""
    html_path = out_dir / "system_report.html"
    html_path.write_text(html_content, encoding="utf-8")
    print(f"Written system report HTML to {html_path}")

if __name__ == "__main__":
    main()
