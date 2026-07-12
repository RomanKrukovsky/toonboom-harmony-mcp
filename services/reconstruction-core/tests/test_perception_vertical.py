import json
import wave
from pathlib import Path

import cv2
import numpy as np

from reconstruction_core.perception import perceive_video


def test_real_video_audio_to_retarget_preview(tmp_path: Path):
    video = tmp_path / "moving_actor.mp4"
    audio = tmp_path / "voice.wav"
    writer = cv2.VideoWriter(str(video), cv2.VideoWriter_fourcc(*"mp4v"), 12, (160, 120))
    assert writer.isOpened()
    for frame in range(24):
        image = np.zeros((120, 160, 3), dtype=np.uint8)
        cv2.rectangle(image, (15 + frame * 3, 20), (55 + frame * 3, 108), (240, 240, 240), -1)
        writer.write(image)
    writer.release()
    rate = 8000
    t = np.arange(rate * 2) / rate
    samples = (np.sin(2 * np.pi * 180 * t) * (t < 1.4) * 0.35 * 32767).astype("<i2")
    with wave.open(str(audio), "wb") as wav:
        wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate); wav.writeframes(samples.tobytes())
    result = perceive_video(str(video), str(audio), str(tmp_path / "output"))
    assert result["status"] == "verified_real"
    assert result["verified"] is True
    assert len(result["previewFiles"]) >= 10
    manifest = json.loads(Path(result["perceptionManifestPath"]).read_text())
    assert manifest["video"]["frameCount"] == 24
    assert manifest["pose"]["observedFrames"] >= 10
    assert manifest["pose"]["isAnatomicalPoseModel"] is False
    assert manifest["audio"]["energySamples"] > 20
