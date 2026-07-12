from __future__ import annotations

from pathlib import Path
from typing import List, Sequence

import cv2


def temporal_cleanup(frame_paths: Sequence[Path], output_dir: Path, profile: str) -> List[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    cleaned: List[Path] = []
    for index, source in enumerate(frame_paths, start=1):
        image = cv2.imread(str(source), cv2.IMREAD_UNCHANGED)
        if image is None:
            raise ValueError(f"Не удалось прочитать {source}")
        if profile == "production_cleanup":
            image = cv2.medianBlur(image, 3)
        target = output_dir / f"clean_{index:06d}.png"
        if not cv2.imwrite(str(target), image, [cv2.IMWRITE_PNG_COMPRESSION, 3]):
            raise RuntimeError(f"Не удалось записать {target}")
        cleaned.append(target)
    return cleaned
