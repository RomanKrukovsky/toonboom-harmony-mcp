from __future__ import annotations

from pathlib import Path
from typing import List, Sequence, Tuple

import cv2
import numpy as np

from .models import PaletteColor


def _read_image(path: Path) -> np.ndarray:
    image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError(f"Не удалось прочитать кадр: {path}")
    return image


def normalize_palette(frame_paths: Sequence[Path], output_dir: Path, max_colors: int) -> Tuple[List[Path], List[PaletteColor]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    samples = []
    for path in frame_paths:
        image = _read_image(path)
        step_y = max(1, image.shape[0] // 96)
        step_x = max(1, image.shape[1] // 96)
        downsampled = image[::step_y, ::step_x]
        if downsampled.shape[-1] == 4:
            # Исключаем прозрачные пиксели (альфа < 127) из кластеризации палитры
            bgr = downsampled[:, :, :3].reshape(-1, 3)
            alpha = downsampled[:, :, 3].reshape(-1)
            valid = bgr[alpha >= 127]
            if len(valid) > 0:
                samples.append(valid)
        else:
            samples.append(downsampled.reshape(-1, 3))
            
    if samples:
        bgr_samples = np.concatenate(samples, axis=0)
    else:
        # Резервный вариант, если все пиксели во всех кадрах прозрачные
        bgr_samples = np.zeros((1, 3), dtype=np.uint8)

    if len(bgr_samples) > 100_000:
        indices = np.linspace(0, len(bgr_samples) - 1, 100_000, dtype=np.int64)
        bgr_samples = bgr_samples[indices]
    lab_samples = cv2.cvtColor(bgr_samples.reshape(-1, 1, 3), cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
    unique_count = len(np.unique(bgr_samples, axis=0))
    k = max(1, min(max_colors, unique_count))
    cv2.setRNGSeed(1337)
    _, labels, centers_lab = cv2.kmeans(
        lab_samples, k, None,
        (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.2),
        4, cv2.KMEANS_PP_CENTERS
    )
    counts = np.bincount(labels.reshape(-1), minlength=k)
    order = np.argsort(-counts)
    centers_lab = centers_lab[order]
    centers_bgr = cv2.cvtColor(np.clip(centers_lab, 0, 255).astype(np.uint8).reshape(-1, 1, 3), cv2.COLOR_LAB2BGR).reshape(-1, 3)
    palette = []
    for index, bgr in enumerate(centers_bgr):
        source_cluster = lab_samples[labels.reshape(-1) == order[index]]
        error = float(np.mean(np.linalg.norm(source_cluster - centers_lab[index], axis=1))) if len(source_cluster) else 0.0
        palette.append(PaletteColor(
            id=f"COLOR_{index + 1:03d}", name=f"COLOR_{index + 1:03d}",
            rgba=(int(bgr[2]), int(bgr[1]), int(bgr[0]), 255),
            originalRgba=(float(bgr[2]), float(bgr[1]), float(bgr[0]), 255.0), replacementError=error
        ))

    normalized = []
    for index, path in enumerate(frame_paths, start=1):
        image = _read_image(path)
        if image.shape[-1] == 4:
            image_bgr = image[:, :, :3]
            alpha = image[:, :, 3]
            lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
            distance = np.sum((lab[:, :, None, :] - centers_lab[None, None, :, :]) ** 2, axis=3)
            nearest = np.argmin(distance, axis=2)
            quantized_bgr = centers_bgr[nearest].astype(np.uint8)
            
            # Сохраняем альфа-канал: прозрачные пиксели остаются прозрачными, остальные получают непрозрачность 255
            quantized = np.zeros((image.shape[0], image.shape[1], 4), dtype=np.uint8)
            quantized[:, :, :3] = quantized_bgr
            quantized[:, :, 3] = np.where(alpha >= 127, 255, 0)
        else:
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB).astype(np.float32)
            distance = np.sum((lab[:, :, None, :] - centers_lab[None, None, :, :]) ** 2, axis=3)
            nearest = np.argmin(distance, axis=2)
            quantized = centers_bgr[nearest].astype(np.uint8)
            
        target = output_dir / f"normalized_{index:06d}.png"
        if not cv2.imwrite(str(target), quantized, [cv2.IMWRITE_PNG_COMPRESSION, 3]):
            raise RuntimeError(f"Не удалось записать {target}")
        normalized.append(target)
    return normalized, palette
