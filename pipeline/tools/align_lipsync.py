"""Инструмент инжекции липсинка в .moho файл по таймингам аудио/фонем.

Принимает:
1. Путь к входному .moho файлу.
2. Список ключевых кадров фонем: [(frame, phoneme), ...] ИЛИ транскрипт с длительностями.
3. Имя свитч-слоя рта (по умолчанию 'Mouth Switch' или 'sw_mouth_Front').

Записывает пошаговые ключи (Step Interpolation) в switch_keys на таймлайн Moho.
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path
from typing import Sequence


STEP_INTERP = {"im": 0, "v1": 0.1, "v2": 0.5, "in": 1, "h": 0, "s": False, "t": 0}


def apply_lipsync_to_moho(
    moho_path: str | Path,
    cues: Sequence[tuple[int, str]],
    output_path: str | Path | None = None,
    switch_layer_name: str | None = None
) -> str:
    """Внедряет таймлайн липсинка в .moho проект."""
    in_p = Path(moho_path)
    out_p = Path(output_path) if output_path else in_p

    with zipfile.ZipFile(in_p, "r") as z_in:
        doc = json.loads(z_in.read("Project.mohoproj"))
        preview_bytes = z_in.read("preview.jpg") if "preview.jpg" in z_in.namelist() else None

    # Поиск свитч-слоя рта
    found = False

    def process_layer(layer: dict) -> bool:
        nonlocal found
        name = layer.get("name", "")
        ltype = layer.get("type", "")

        is_target = False
        if switch_layer_name:
            if name == switch_layer_name:
                is_target = True
        else:
            if ltype == "SwitchLayer" and any(k in name.lower() for k in ["mouth", "рот", "phoneme", "lips"]):
                is_target = True

        if is_target:
            when = [c[0] for c in cues]
            val = [c[1] for c in cues]
            interp = [dict(STEP_INTERP) for _ in cues]

            layer["switch_keys"] = {
                "type": "String",
                "ref": False,
                "mute": False,
                "when": when,
                "val": val,
                "interp": interp
            }
            found = True
            return True

        for child in layer.get("layers", []):
            if process_layer(child):
                return True
        return False

    for l in doc.get("layers", []):
        if process_layer(l):
            break

    if not found:
        # Если слой с точным именем не найден, ищем любой свитч первого подходящего уровня
        for l in doc.get("layers", []):
            for child in l.get("layers", []):
                if child.get("type") == "SwitchLayer":
                    when = [c[0] for c in cues]
                    val = [c[1] for c in cues]
                    child["switch_keys"] = {
                        "type": "String", "ref": False, "mute": False,
                        "when": when, "val": val,
                        "interp": [dict(STEP_INTERP) for _ in cues]
                    }
                    found = True
                    break
            if found:
                break

    if not found:
        raise ValueError(f"Не найден подходящий SwitchLayer рта в {in_p}")

    out_p.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_p, "w", zipfile.ZIP_DEFLATED) as z_out:
        z_out.writestr("Project.mohoproj", json.dumps(doc))
        if preview_bytes:
            z_out.writestr("preview.jpg", preview_bytes)

    return str(out_p)
