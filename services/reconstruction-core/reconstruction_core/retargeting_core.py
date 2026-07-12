from __future__ import annotations

import math
import numpy as np
from typing import Dict, List, Literal, Optional, Tuple, Any
from .retargeting_models import (
    RetargetingManifest, RigProfile, RigJoint, JointMapping, JointLimit,
    TransformKeyframe, Track
)

class PoseProvider:
    """Интерфейс импорта ориентиров позы (pose landmarks) для ретаргетинга."""
    def get_landmarks(self, frame: int) -> Optional[Dict[str, Tuple[float, float, float, float]]]:
        """Возвращает словарь landmark_name -> (x, y, z, visibility) для кадра."""
        raise NotImplementedError()


class JsonPoseProvider(PoseProvider):
    """Импорт позы из JSON-файла."""
    def __init__(self, data: Dict[int, Dict[str, List[float]]]):
        self.data = data

    def get_landmarks(self, frame: int) -> Optional[Dict[str, Tuple[float, float, float, float]]]:
        frame_data = self.data.get(frame)
        if not frame_data:
            return None
        res = {}
        for k, v in frame_data.items():
            if len(v) >= 4:
                res[k] = (v[0], v[1], v[2], v[3])
            elif len(v) == 3:
                res[k] = (v[0], v[1], v[2], 1.0)
        return res


class SyntheticPoseProvider(PoseProvider):
    """Синтетический провайдер позы для тестов."""
    def __init__(self):
        self.frames: Dict[int, Dict[str, Tuple[float, float, float, float]]] = {}

    def set_landmark(self, frame: int, name: str, x: float, y: float, z: float = 0.0, visibility: float = 1.0):
        if frame not in self.frames:
            self.frames[frame] = {}
        self.frames[frame][name] = (x, y, z, visibility)

    def get_landmarks(self, frame: int) -> Optional[Dict[str, Tuple[float, float, float, float]]]:
        return self.frames.get(frame)


def normalize_skeleton(landmarks: Dict[str, Tuple[float, float, float, float]], mirror: bool = False) -> Dict[str, Tuple[float, float, float, float]]:
    """
    Нормализует скелет источника: центрирует относительно таза (HIP/MID_HIP)
    и масштабирует по расстоянию между плечами (LEFT_SHOULDER, RIGHT_SHOULDER) или тазом и шеей,
    что делает трекинг независимым от расстояния до камеры.
    Также поддерживает отзеркаливание по горизонтали.
    """
    res = {}
    
    # 1. Отзеркаливание если необходимо (инверсия X-оси и обмен право/лево)
    processed = {}
    for k, v in landmarks.items():
        x, y, z, vis = v
        if mirror:
            x = -x
            new_key = k
            if k.startswith("LEFT_"):
                new_key = "RIGHT_" + k[5:]
            elif k.startswith("RIGHT_"):
                new_key = "LEFT_" + k[6:]
            processed[new_key] = (x, y, z, vis)
        else:
            processed[k] = (x, y, z, vis)

    # 2. Находим центр таза (HIP)
    hip_keys = ["HIP", "MID_HIP", "LEFT_HIP", "RIGHT_HIP"]
    found_hip = None
    for hk in hip_keys:
        if hk in processed:
            found_hip = processed[hk]
            break
            
    if not found_hip and "LEFT_HIP" in processed and "RIGHT_HIP" in processed:
        h1 = processed["LEFT_HIP"]
        h2 = processed["RIGHT_HIP"]
        found_hip = ((h1[0]+h2[0])/2.0, (h1[1]+h2[1])/2.0, (h1[2]+h2[2])/2.0, min(h1[3], h2[3]))
        
    if not found_hip:
        # Если таз не найден, используем среднее по всем точкам как fallback
        xs = [v[0] for v in processed.values()]
        ys = [v[1] for v in processed.values()]
        zs = [v[2] for v in processed.values()]
        found_hip = (np.mean(xs), np.mean(ys), np.mean(zs), 1.0)

    # 3. Вычисляем масштаб (shoulder distance)
    scale = 1.0
    if "LEFT_SHOULDER" in processed and "RIGHT_SHOULDER" in processed:
        s1 = processed["LEFT_SHOULDER"]
        s2 = processed["RIGHT_SHOULDER"]
        dist = math.sqrt((s1[0]-s2[0])**2 + (s1[1]-s2[1])**2 + (s1[2]-s2[2])**2)
        if dist > 0.001:
            scale = 0.5 / dist  # нормализуем расстояние между плечами к 0.5

    # 4. Центрируем и масштабируем
    for k, v in processed.items():
        x, y, z, vis = v
        nx = (x - found_hip[0]) * scale
        ny = (y - found_hip[1]) * scale
        nz = (z - found_hip[2]) * scale
        res[k] = (nx, ny, nz, vis)
        
    return res


def compensate_camera_motion(
    frames_landmarks: List[Dict[str, Tuple[float, float, float, float]]],
    bg_landmarks: List[str]
) -> List[Dict[str, Tuple[float, float, float, float]]]:
    """
    Компенсирует панорамирование и масштабирование камеры на основе трекинга
    неподвижных фоновых референсных ориентиров (landmarks).
    """
    if not bg_landmarks or len(frames_landmarks) < 2:
        return frames_landmarks

    compensated = [frames_landmarks[0]]
    ref_bg_pos = {}
    
    # Считываем референсные позиции фона с первого кадра
    for bg in bg_landmarks:
        if bg in frames_landmarks[0]:
            ref_bg_pos[bg] = frames_landmarks[0][bg]

    for f in range(1, len(frames_landmarks)):
        curr_frame = frames_landmarks[f]
        
        # Находим общие фоновые ориентиры
        common = []
        for bg in bg_landmarks:
            if bg in curr_frame and bg in ref_bg_pos:
                common.append(bg)
                
        if len(common) < 1:
            compensated.append(curr_frame)
            continue
            
        # Рассчитываем средний сдвиг камеры
        dx_sum, dy_sum, dz_sum = 0.0, 0.0, 0.0
        for bg in common:
            ref = ref_bg_pos[bg]
            curr = curr_frame[bg]
            dx_sum += curr[0] - ref[0]
            dy_sum += curr[1] - ref[1]
            dz_sum += curr[2] - ref[2]
            
        dx = dx_sum / len(common)
        dy = dy_sum / len(common)
        dz = dz_sum / len(common)
        
        # Вычитаем сдвиг из всех точек кадра
        new_frame = {}
        for k, v in curr_frame.items():
            # Фоновые точки не меняем, чтобы они оставались стабильными,
            # а точки персонажа сдвигаем в противоположную сторону
            if k in bg_landmarks:
                new_frame[k] = ref_bg_pos.get(k, v)
            else:
                new_frame[k] = (v[0] - dx, v[1] - dy, v[2] - dz, v[3])
        compensated.append(new_frame)
        
    return compensated


def apply_double_exponential_smoothing(
    tracks: Dict[str, List[float]],
    alpha: float = 0.4,
    beta: float = 0.3
) -> Dict[str, List[float]]:
    """
    Сглаживание временных рядов с использованием двойного экспоненциального скользящего среднего.
    Помогает снизить высокочастотный шум и сохранить тренд.
    """
    smoothed = {}
    for node, vals in tracks.items():
        if len(vals) < 2:
            smoothed[node] = vals
            continue
            
        s = [vals[0]]
        b = [0.0]
        res = [vals[0]]
        
        for t in range(1, len(vals)):
            curr_s = alpha * vals[t] + (1 - alpha) * (s[-1] + b[-1])
            curr_b = beta * (curr_s - s[-1]) + (1 - beta) * b[-1]
            s.append(curr_s)
            b.append(curr_b)
            res.append(curr_s)
            
        smoothed[node] = res
    return smoothed


def handle_occluded_landmarks(
    landmarks: Dict[str, Tuple[float, float, float, float]],
    prev_landmarks: Optional[Dict[str, Tuple[float, float, float, float]]],
    min_confidence: float = 0.5,
    decay: float = 0.95
) -> Dict[str, Tuple[float, float, float, float]]:
    """
    Обработка окклюзии: если уверенность Landmark ниже min_confidence,
    мы плавно удерживаем его последнее известное положение из prev_landmarks с затуханием.
    """
    res = {}
    for k, v in landmarks.items():
        x, y, z, vis = v
        if vis < min_confidence and prev_landmarks and k in prev_landmarks:
            px, py, pz, pvis = prev_landmarks[k]
            # Удерживаем позицию, снижая уверенность дальше
            res[k] = (px, py, pz, pvis * decay)
        else:
            res[k] = (x, y, z, vis)
    return res


def solve_ik_2joint(
    root: Tuple[float, float],
    target: Tuple[float, float],
    l1: float,
    l2: float,
    flip_elbow: bool = False
) -> Tuple[float, float]:
    """
    Аналитическое решение обратной кинематики (IK) для 2-звенной конечности (плечо-локоть или бедро-колено).
    Возвращает углы поворота первого (shoulder/hip) и второго (elbow/knee) суставов в градусах.
    """
    dx = target[0] - root[0]
    dy = target[1] - root[1]
    d = math.sqrt(dx**2 + dy**2)
    
    # 1. Если цель дальше полной длины конечности
    if d >= (l1 + l2):
        angle1 = math.degrees(math.atan2(dy, dx))
        return angle1, 0.0
        
    # 2. Если цель слишком близко
    if d <= abs(l1 - l2):
        angle1 = math.degrees(math.atan2(dy, dx))
        return angle1, 180.0

    # 3. Теорема косинусов для внутреннего угла локтя / колена
    cos_theta2 = (d**2 - l1**2 - l2**2) / (2 * l1 * l2)
    cos_theta2 = max(-1.0, min(1.0, cos_theta2))
    theta2 = math.acos(cos_theta2)
    
    if flip_elbow:
        theta2 = -theta2

    # Теорема косинусов для угла между вектором к цели и вектором плеча
    cos_alpha = (l1**2 + d**2 - l2**2) / (2 * l1 * d)
    cos_alpha = max(-1.0, min(1.0, cos_alpha))
    alpha = math.acos(cos_alpha)
    
    # Угол вектора к цели
    gamma = math.atan2(dy, dx)
    
    if flip_elbow:
        theta1 = gamma + alpha
    else:
        theta1 = gamma - alpha
        
    return math.degrees(theta1), math.degrees(theta2)


def apply_foot_locking(
    frames_landmarks: List[Dict[str, Tuple[float, float, float, float]]],
    fps: float,
    foot_joint_name: str = "LEFT_ANKLE",
    ground_y: float = -0.7,
    vel_threshold: float = 0.05
) -> List[Dict[str, Tuple[float, float, float, float]]]:
    """
    Блокировка стопы (Foot Locking): предотвращает проскальзывание стопы.
    Если стопа находится ниже/близко к ground_y и её скорость мала,
    её положение жестко фиксируется на время фазы опоры.
    """
    if len(frames_landmarks) < 2:
        return frames_landmarks

    locked = [dict(frames_landmarks[0])]
    lock_pos = None
    
    dt = 1.0 / fps

    for f in range(1, len(frames_landmarks)):
        curr = dict(frames_landmarks[f])
        prev = locked[-1]
        
        if foot_joint_name in curr and foot_joint_name in prev:
            cx, cy, cz, cvis = curr[foot_joint_name]
            px, py, pz, pvis = prev[foot_joint_name]
            
            # Вычисляем 2D скорость
            vel = math.sqrt((cx - px)**2 + (cy - py)**2) / dt
            
            # Если стопа близко к земле и скорость мала, блокируем её
            is_near_ground = cy <= (ground_y + 0.15)
            if is_near_ground and vel < vel_threshold:
                if lock_pos is None:
                    lock_pos = (px, py, pz, pvis)
                curr[foot_joint_name] = lock_pos
            else:
                lock_pos = None
                
        locked.append(curr)
        
    return locked


def simplify_keyframes_rdp_2d(
    keys: List[TransformKeyframe],
    tolerance: float = 1.0
) -> List[TransformKeyframe]:
    """
    Сжатие ключевых кадров с использованием алгоритма Рамера-Дугласа-Пекера (RDP).
    tolerance задает порог максимального отклонения угла/значения в градусах/пикселях.
    """
    if len(keys) <= 2:
        return keys

    # Рекурсивный поиск точки с максимальным отклонением
    def find_max_deviation(start_idx: int, end_idx: int) -> Tuple[int, float]:
        max_dist = 0.0
        max_idx = start_idx
        
        p_start = keys[start_idx]
        p_end = keys[end_idx]
        
        # Линейная интерполяция между крайними точками
        for i in range(start_idx + 1, end_idx):
            p = keys[i]
            # Интерполированное значение на кадре p.frame
            t = (p.frame - p_start.frame) / (p_end.frame - p_start.frame) if p_end.frame != p_start.frame else 0.0
            interp_val = p_start.value + t * (p_end.value - p_start.value)
            
            dist = abs(p.value - interp_val)
            if dist > max_dist:
                max_dist = dist
                max_idx = i
        return max_idx, max_dist

    def rdp_recursive(start_idx: int, end_idx: int) -> List[int]:
        idx, dist = find_max_deviation(start_idx, end_idx)
        if dist > tolerance:
            left = rdp_recursive(start_idx, idx)
            right = rdp_recursive(idx, end_idx)
            return left[:-1] + right
        else:
            return [start_idx, end_idx]

    indices = rdp_recursive(0, len(keys) - 1)
    return [keys[i] for i in indices]


def calculate_fidelity_metrics(
    manifest: RetargetingManifest,
    provider: PoseProvider,
    frames_count: int
) -> Dict[str, Any]:
    """
    Вычисляет метрики соответствия (fidelity metrics) между исходным скелетом
    и сгенерированной анимацией рига, блокируя читерство (например, нулевое движение).
    """
    total_angle_error = 0.0
    tracked_joints_count = 0
    total_keys = 0
    
    # 1. Считаем количество сгенерированных ключей
    for track in manifest.tracks:
        total_keys += len(track.keyframes)

    # 2. Вычисляем среднюю абсолютную ошибку по углам поворота
    for mapping in manifest.mappings:
        if mapping.transform_type != "rotation":
            continue
            
        track = next((t for t in manifest.tracks if t.peg_node_path == mapping.peg_node_path), None)
        if not track or not track.keyframes:
            continue
            
        joint_name = mapping.peg_node_path.split("/")[-1].replace("_Peg", "")
        
        # Получаем значения углов по кадрам из интерполяции ключей
        key_dict = {k.frame: k.value for k in track.keyframes}
        
        frame_errors = []
        for f in range(1, frames_count + 1):
            # Простейший поиск интерполированного значения угла
            val = get_interpolated_value(track.keyframes, f)
            
            # Извлекаем истинный угол из ориентиров источника
            landmarks = provider.get_landmarks(f)
            if not landmarks:
                continue
            
            # Вычисляем истинный угол сустава источника по его landmarks
            if len(mapping.source_joints) >= 2:
                s_joint1 = landmarks.get(mapping.source_joints[0])
                s_joint2 = landmarks.get(mapping.source_joints[1])
                if s_joint1 and s_joint2:
                    v = (s_joint2[0] - s_joint1[0], s_joint2[1] - s_joint1[1])
                    src_angle = math.degrees(math.atan2(v[1], v[0]))
                    
                    # Разница углов с нормализацией в диапазон [-180, 180]
                    diff = (val - src_angle + 180) % 360 - 180
                    frame_errors.append(abs(diff))
                    
        if frame_errors:
            total_angle_error += np.mean(frame_errors)
            tracked_joints_count += 1

    mean_angle_error = total_angle_error / tracked_joints_count if tracked_joints_count > 0 else 0.0
    
    # 3. Анти-читерские проверки:
    # Замороженная поза (когда все ключи одинаковые или движения нет)
    frozen = True
    for track in manifest.tracks:
        if len(track.keyframes) > 1:
            vals = [k.value for k in track.keyframes]
            if max(vals) - min(vals) > 1.0: # движение больше 1 градуса/пикселя
                frozen = False
                break
                
    eligible = not frozen and mean_angle_error < 25.0
    
    return {
        "meanAngleErrorDegrees": round(mean_angle_error, 2),
        "totalGeneratedTracks": len(manifest.tracks),
        "totalKeyframesCount": total_keys,
        "compressionRatio": round(1.0 - (total_keys / (len(manifest.tracks) * frames_count if frames_count > 0 else 1)), 3),
        "frozenMotionDetected": frozen,
        "eligible": eligible
    }


def get_interpolated_value(keys: List[TransformKeyframe], frame: int) -> float:
    """Интерполяция значения на кадре."""
    if not keys:
        return 0.0
    if frame <= keys[0].frame:
        return keys[0].value
    if frame >= keys[-1].frame:
        return keys[-1].value
        
    for i in range(len(keys) - 1):
        k1 = keys[i]
        k2 = keys[i+1]
        if k1.frame <= frame <= k2.frame:
            t = (frame - k1.frame) / (k2.frame - k1.frame)
            return k1.value + t * (k2.value - k1.value)
    return 0.0


def run_motion_retargeting(
    provider: PoseProvider,
    rig_profile: RigProfile,
    mappings: List[JointMapping],
    start_frame: int,
    end_frame: int,
    fps: float,
    tolerance: float = 1.0,
    mirror: bool = False,
    bg_landmarks: Optional[List[str]] = None,
    foot_locking: bool = True,
    alpha: float = 0.4,
    beta: float = 0.3
) -> RetargetingManifest:
    """
    Полный автономный пайплайн ретаргетинга:
    video landmarks -> normalization -> smoothing -> IK/mapping -> key reduction -> manifest.
    """
    local_frames = []
    global_frames = []
    
    for f in range(start_frame, end_frame + 1):
        lms = provider.get_landmarks(f)
        if lms:
            # 1. Отзеркаливание и нормализация
            processed = {}
            for k, v in lms.items():
                x, y, z, vis = v
                if mirror:
                    x = -x
                    new_key = k
                    if k.startswith("LEFT_"):
                        new_key = "RIGHT_" + k[5:]
                    elif k.startswith("RIGHT_"):
                        new_key = "LEFT_" + k[6:]
                    processed[new_key] = (x, y, z, vis)
                else:
                    processed[k] = (x, y, z, vis)
                    
            # Вычисляем масштаб (shoulder distance)
            scale = 1.0
            if "LEFT_SHOULDER" in processed and "RIGHT_SHOULDER" in processed:
                s1 = processed["LEFT_SHOULDER"]
                s2 = processed["RIGHT_SHOULDER"]
                dist = math.sqrt((s1[0]-s2[0])**2 + (s1[1]-s2[1])**2 + (s1[2]-s2[2])**2)
                if dist > 0.001:
                    scale = 0.5 / dist
                    
            # Глобальные ориентиры (только масштабирование)
            g_frame = {k: (v[0]*scale, v[1]*scale, v[2]*scale, v[3]) for k, v in processed.items()}
            
            # Локальные ориентиры (масштабирование + центрирование относительно таза)
            hip_keys = ["HIP", "MID_HIP", "LEFT_HIP", "RIGHT_HIP"]
            found_hip = None
            for hk in hip_keys:
                if hk in processed:
                    found_hip = processed[hk]
                    break
            if not found_hip and "LEFT_HIP" in processed and "RIGHT_HIP" in processed:
                h1 = processed["LEFT_HIP"]
                h2 = processed["RIGHT_HIP"]
                found_hip = ((h1[0]+h2[0])/2.0, (h1[1]+h2[1])/2.0, (h1[2]+h2[2])/2.0, min(h1[3], h2[3]))
            if not found_hip:
                xs = [v[0] for v in processed.values()]
                ys = [v[1] for v in processed.values()]
                zs = [v[2] for v in processed.values()]
                found_hip = (np.mean(xs), np.mean(ys), np.mean(zs), 1.0)
                
            l_frame = {}
            for k, v in processed.items():
                l_frame[k] = ((v[0] - found_hip[0])*scale, (v[1] - found_hip[1])*scale, (v[2] - found_hip[2])*scale, v[3])
                
            # Обработка окклюзии
            prev_l = local_frames[-1] if local_frames else None
            cleaned_l = handle_occluded_landmarks(l_frame, prev_l)
            local_frames.append(cleaned_l)
            
            prev_g = global_frames[-1] if global_frames else None
            cleaned_g = handle_occluded_landmarks(g_frame, prev_g)
            global_frames.append(cleaned_g)
        else:
            local_frames.append({})
            global_frames.append({})

    # Компенсация движения камеры на глобальных координатах
    if bg_landmarks:
        global_frames = compensate_camera_motion(global_frames, bg_landmarks)

    # Блокировка стоп на глобальных координатах
    if foot_locking:
        global_frames = apply_foot_locking(global_frames, fps, "LEFT_ANKLE", ground_y=-0.7)
        global_frames = apply_foot_locking(global_frames, fps, "RIGHT_ANKLE", ground_y=-0.7)

    # Генерация сырых временных треков для каждого маппинга
    raw_tracks: Dict[Tuple[str, str], List[float]] = {}
    confidences: Dict[Tuple[str, str], List[float]] = {}
    
    for mapping in mappings:
        key = (mapping.peg_node_path, mapping.transform_type)
        raw_tracks[key] = []
        confidences[key] = []

    # Расчёт значений по кадрам
    for f_idx in range(len(local_frames)):
        l_lms = local_frames[f_idx]
        g_lms = global_frames[f_idx]
        
        for mapping in mappings:
            key = (mapping.peg_node_path, mapping.transform_type)
            
            if mapping.transform_type == "rotation" and len(mapping.source_joints) >= 2:
                # Вращения всегда вычисляем на локальных (центрированных) координатах
                j1 = l_lms.get(mapping.source_joints[0])
                j2 = l_lms.get(mapping.source_joints[1])
                if j1 and j2:
                    vx = j2[0] - j1[0]
                    vy = j2[1] - j1[1]
                    angle = math.degrees(math.atan2(vy, vx))
                    
                    if mapping.min_angle_limit is not None:
                        angle = max(mapping.min_angle_limit, angle)
                    if mapping.max_angle_limit is not None:
                        angle = min(mapping.max_angle_limit, angle)
                        
                    raw_tracks[key].append(angle)
                    confidences[key].append(min(j1[3], j2[3]))
                else:
                    raw_tracks[key].append(0.0)
                    confidences[key].append(0.0)
                    
            elif mapping.transform_type == "translation" and len(mapping.source_joints) >= 1:
                # Трансляции всегда вычисляем на глобальных (не центрированных) координатах
                j = g_lms.get(mapping.source_joints[0])
                if j:
                    node_name = mapping.peg_node_path.split("/")[-1]
                    is_x = "X" in node_name or "x" in node_name
                    val = j[0] if is_x else j[1]
                    raw_tracks[key].append(val * (mapping.scale_factor or 1.0))
                    confidences[key].append(j[3])
                else:
                    raw_tracks[key].append(0.0)
                    confidences[key].append(0.0)
            else:
                raw_tracks[key].append(1.0 if mapping.transform_type == "scale" else 0.0)
                confidences[key].append(1.0)

    # Применяем временное сглаживание к полученным углам/сдвигам
    smoothed_inputs = {}
    for k, vals in raw_tracks.items():
        smoothed_inputs[k] = apply_double_exponential_smoothing({k[0]: vals}, alpha=alpha, beta=beta)[k[0]]

    # Сжимаем ключи по RDP
    tracks: List[Track] = []
    for mapping in mappings:
        key = (mapping.peg_node_path, mapping.transform_type)
        vals = smoothed_inputs[key]
        confs = confidences[key]
        
        raw_keys = []
        for i, val in enumerate(vals):
            frame = start_frame + i
            raw_keys.append(TransformKeyframe(frame=frame, value=round(val, 3), confidence=confs[i]))
            
        reduced_keys = simplify_keyframes_rdp_2d(raw_keys, tolerance=tolerance)
        tracks.append(Track(
            pegNodePath=mapping.peg_node_path,
            transformType=mapping.transform_type,
            keyframes=reduced_keys
        ))

    import hashlib
    from datetime import datetime
    manifest_id = hashlib.sha256(f"retarget:{datetime.now().isoformat()}".encode()).hexdigest()[:32]
    
    manifest = RetargetingManifest(
        schemaVersion="1.0",
        manifestId=manifest_id,
        createdAt=datetime.now().isoformat(),
        characterName=rig_profile.name,
        rigProfile=rig_profile,
        mappings=mappings,
        tracks=tracks,
        fidelityMetrics={},
        provenance={"tool": "harmony-motion-retargeting-core", "version": "1.0.0"}
    )
    
    # Считаем итоговые метрики точности
    metrics = calculate_fidelity_metrics(manifest, provider, end_frame - start_frame + 1)
    manifest.fidelity_metrics = metrics
    
    return manifest
