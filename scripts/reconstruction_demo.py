#!/usr/bin/env python3
"""Generate a tiny MP4 and run the real CPU reconstruction pipeline."""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
from pathlib import Path

import cv2
import numpy as np

from reconstruction_core.models import ReconstructionRequest
from reconstruction_core.pipeline import ReconstructionPipeline
from reconstruction_core.storage import JobStorage


def generate_video(target: Path, ffmpeg: str) -> None:
    with tempfile.TemporaryDirectory(prefix="harmony-reconstruction-frames-") as temp:
        frame_dir = Path(temp)
        positions = [18, 18, 18, 32, 32, 32, 48, 48, 48, 18, 18, 18]
        for index, x in enumerate(positions, start=1):
            image = np.full((96, 128, 3), (245, 245, 245), np.uint8)
            cv2.rectangle(image, (x, 32), (x + 30, 65), (30, 80, 230), -1)
            cv2.circle(image, (x + 15, 26), 10, (80, 190, 50), -1)
            cv2.imwrite(str(frame_dir / f"frame_{index:06d}.png"), image)
        command = [
            ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-framerate", "12",
            "-i", str(frame_dir / "frame_%06d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", str(target)
        ]
        completed = subprocess.run(command, capture_output=True, text=True, check=False)
        if completed.returncode:
            raise RuntimeError(completed.stderr)


def main() -> None:
    repository = Path(__file__).resolve().parents[1]
    output = repository / "output" / "reconstruction-demo"
    output.mkdir(parents=True, exist_ok=True)
    video = output / "moving_shape.mp4"
    ffmpeg = os.environ.get("FFMPEG_PATH", "ffmpeg")
    generate_video(video, ffmpeg)
    # Очищаем кэш перед запуском демонстрации, чтобы принудительно запустить полный цикл V2 с гипотезами
    cache_dir = output / "cache"
    if cache_dir.exists():
        import shutil
        shutil.rmtree(str(cache_dir))
    
    pipeline = ReconstructionPipeline(
        JobStorage(cache_dir), ffmpeg, os.environ.get("FFPROBE_PATH", "ffprobe"), (60, 1920, 1080)
    )
    result = pipeline.reconstruct(ReconstructionRequest(
        videoPath=str(video), maxColors=4, maxPointsPerShape=40,
        dedupThreshold=0.02, cleanupProfile="production_cleanup"
    ))
    manifest_path = Path(result["manifestPath"])
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    
    # Загружаем гипотезы и проводим сравнение по новым правилам Temporal Fidelity
    from reconstruction_core.models import ReconstructionHypothesis
    from reconstruction_core.hypotheses import compare_hypotheses
    
    hyps_path = manifest_path.parent / "hypotheses.json"
    comp_report = {}
    if hyps_path.exists():
        hyps_data = json.loads(hyps_path.read_text(encoding="utf-8"))
        hypotheses = [ReconstructionHypothesis.model_validate(h) for h in hyps_data]
        comp_report = compare_hypotheses(hypotheses)
        
    report = {
        "videoPath": str(video),
        "manifestPath": result["manifestPath"],
        "sourceFrames": manifest["source"]["frameCount"],
        "uniqueDrawings": len(manifest["drawings"]),
        "paletteColors": len(manifest["palettes"][0]["colors"]),
        "points": manifest["diagnostics"]["totalPointCount"],
        "exposureBlocks": len(manifest["exposures"]),
        "exposureFrames": sum(item["duration"] for item in manifest["exposures"]),
        "stageDurationsMs": manifest["diagnostics"]["stageDurationsMs"],
        "temporalFidelityReport": comp_report,
        "harmonyApplied": False,
        "note": "Harmony не найдена в этой среде; нативное применение проверяется отдельным integration harness.",
    }
    
    report_path = output / "demo_report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    
    # Красивый текстовый вывод для пользователя/аудита
    print("\n========================================================")
    print("=== ОТЧЕТ ВРЕМЕННОЙ И ГЕОМЕТРИЧЕСКОЙ ТОЧНОСТИ (V2) ===")
    print("========================================================")
    print(f"Обработано видео: {video.name} ({report['sourceFrames']} кадров)")
    print(f"Рекомендованный вариант: {comp_report.get('recommendedVariant')}")
    print(f"Пояснение: {comp_report.get('explanation')}\n")
    
    for item in comp_report.get("comparisonTable", []):
        hid = item["hypothesisId"]
        status = "PASSED" if item["eligibleForRecommendation"] else "FAILED"
        print(f"Вариант: {hid} | Статус: {status} | Оценка: {item['recommendationScore']:.1f}")
        print(f"  - Уникальные рисунки: {item['uniqueDrawingCount']} (было {report['uniqueDrawings']})")
        print(f"  - Точки векторов: {item['vectorPointCount']}")
        print(f"  - Silhouette IoU: {item['silhouetteIoU']:.3f} (порог >= 0.80)")
        print(f"  - Foreground Mean Error: {item['foregroundMeanError']:.2f} (порог <= 25.0)")
        print(f"  - Centroid Trajectory Error: {item['centroidTrajectoryError']:.2f} px (порог <= 4.0 px)")
        print(f"  - Потерянные движения (Lost Motion Events): {item['numberOfLostMotionEvents']}")
        if item["rejectionReasons"]:
            print("  - ПРИЧИНЫ ОТКЛОНЕНИЯ:")
            for r in item["rejectionReasons"]:
                print(f"    * {r}")
        print("-" * 50)
    print("========================================================\n")


if __name__ == "__main__":
    main()
