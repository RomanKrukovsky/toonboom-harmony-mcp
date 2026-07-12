from __future__ import annotations

import os
from typing import Dict, List, Any
from .retargeting_models import RetargetingManifest, Track, TransformKeyframe


def compile_harmony_command_plan(manifest: RetargetingManifest) -> Dict[str, Any]:
    """
    Компилирует RetargetingManifest в HarmonyCommandPlan (набор команд для моста Harmony),
    группируя ключи трансформаций по нодам и кадрам.
    Все команды помечаются как implemented_unverified.
    """
    commands: List[Dict[str, Any]] = []
    
    # 1. Создаем необходимые Peg-ноды
    created_pegs = set()
    for track in manifest.tracks:
        node_path = track.peg_node_path
        node_name = node_path.split("/")[-1]
        
        if node_path not in created_pegs:
            # Создаем Peg ноду в Harmony
            commands.append({
                "type": "create_peg",
                "params": {
                    "pegName": node_name
                }
            })
            
            # Находим сустав в профиле рига для установки пивота
            joint_name = node_name.replace("_Peg", "")
            joint = next((j for j in manifest.rig_profile.joints if j.name == joint_name), None)
            if joint:
                commands.append({
                    "type": "set_peg_pivot",
                    "params": {
                        "pegName": node_name,
                        "pivotX": joint.pivot_x,
                        "pivotY": joint.pivot_y
                    }
                })
            created_pegs.add(node_path)

    # 2. Группируем ключи трансформаций по (pegName, frame)
    # pegName -> frame -> {rotation: val, tx: val, ty: val, sx: val, sy: val}
    keyframes_by_node_frame: Dict[str, Dict[int, Dict[str, float]]] = {}
    
    # Для инициализации всех осей
    for track in manifest.tracks:
        node_name = track.peg_node_path.split("/")[-1]
        if node_name not in keyframes_by_node_frame:
            keyframes_by_node_frame[node_name] = {}
            
        for k in track.keyframes:
            if k.frame not in keyframes_by_node_frame[node_name]:
                # Значения по умолчанию
                keyframes_by_node_frame[node_name][k.frame] = {
                    "rotation": 0.0,
                    "positionX": 0.0,
                    "positionY": 0.0,
                    "scaleX": 1.0,
                    "scaleY": 1.0,
                    "skew": 0.0
                }
                
            # Заполняем конкретную ось
            if track.transform_type == "rotation":
                keyframes_by_node_frame[node_name][k.frame]["rotation"] = k.value
            elif track.transform_type == "translation":
                axis = "X" if "X" in node_name or "x" in node_name else "Y"
                if axis == "X":
                    keyframes_by_node_frame[node_name][k.frame]["positionX"] = k.value
                else:
                    keyframes_by_node_frame[node_name][k.frame]["positionY"] = k.value
            elif track.transform_type == "scale":
                axis = "X" if "X" in node_name or "x" in node_name else "Y"
                if axis == "X":
                    keyframes_by_node_frame[node_name][k.frame]["scaleX"] = k.value
                else:
                    keyframes_by_node_frame[node_name][k.frame]["scaleY"] = k.value

    # 3. Добавляем команды установки ключевых кадров
    for node_name, frames_data in keyframes_by_node_frame.items():
        # Сортируем кадры по возрастанию
        for frame in sorted(frames_data.keys()):
            data = frames_data[frame]
            commands.append({
                "type": "set_transform_keyframe",
                "params": {
                    "pegName": node_name,
                    "frame": frame,
                    "positionX": round(data["positionX"], 4),
                    "positionY": round(data["positionY"], 4),
                    "rotation": round(data["rotation"], 4),
                    "scaleX": round(data["scaleX"], 4),
                    "scaleY": round(data["scaleY"], 4),
                    "skew": round(data["skew"], 4)
                }
            })

    # 4. Команда сохранения проекта
    max_frame = 1
    for track in manifest.tracks:
        if track.keyframes:
            max_frame = max(max_frame, max(k.frame for k in track.keyframes))
            
    commands.append({
        "type": "save_project",
        "params": {
            "frameCount": max_frame,
            "fps": 24.0
        }
    })

    return {
        "schemaVersion": "1.0",
        "manifestId": manifest.manifest_id,
        "characterName": manifest.character_name,
        "commands": commands,
        "verification": "implemented_unverified",
        "note": "Harmony command plan compiled autonomously without live Harmony connection."
    }
