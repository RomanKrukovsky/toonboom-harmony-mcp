import sys, wave
from pathlib import Path
import cv2
import numpy as np

video, audio = Path(sys.argv[1]), Path(sys.argv[2])
video.parent.mkdir(parents=True, exist_ok=True)
writer = cv2.VideoWriter(str(video), cv2.VideoWriter_fourcc(*"mp4v"), 12, (320, 240))
if not writer.isOpened(): raise RuntimeError("VideoWriter unavailable")
for frame in range(24):
    image = np.zeros((240, 320, 3), dtype=np.uint8)
    cv2.rectangle(image, (20 + frame * 6, 35), (95 + frame * 6, 215), (245, 245, 245), -1)
    writer.write(image)
writer.release()
rate = 16000
t = np.arange(rate * 2) / rate
samples = (np.sin(2 * np.pi * 180 * t) * .35 * 32767).astype("<i2")
with wave.open(str(audio), "wb") as wav:
    wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate); wav.writeframes(samples.tobytes())
