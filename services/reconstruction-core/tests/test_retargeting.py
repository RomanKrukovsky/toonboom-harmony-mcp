import math
import pytest
from pathlib import Path
from reconstruction_core.retargeting_models import RigProfile, RigJoint, JointMapping, JointLimit
from reconstruction_core.retargeting_core import (
    SyntheticPoseProvider, run_motion_retargeting,
    normalize_skeleton, compensate_camera_motion, apply_foot_locking,
    solve_ik_2joint
)


def create_standard_rig() -> RigProfile:
    joints = [
        RigJoint(name="Root", parent=None, pegNodePath="Top/Vex/Root_Peg", pivotX=0.0, pivotY=0.0, length=1.0),
        RigJoint(name="Shoulder_L", parent="Root", pegNodePath="Top/Vex/Shoulder_L_Peg", pivotX=0.0, pivotY=0.0, length=1.0),
        RigJoint(name="Elbow_L", parent="Shoulder_L", pegNodePath="Top/Vex/Elbow_L_Peg", pivotX=1.0, pivotY=0.0, length=1.0),
        RigJoint(name="Wrist_L", parent="Elbow_L", pegNodePath="Top/Vex/Wrist_L_Peg", pivotX=2.0, pivotY=0.0, length=0.2),
        RigJoint(name="Hip_L", parent="Root", pegNodePath="Top/Vex/Hip_L_Peg", pivotX=0.0, pivotY=-0.3, length=1.0),
        RigJoint(name="Knee_L", parent="Hip_L", pegNodePath="Top/Vex/Knee_L_Peg", pivotX=0.0, pivotY=-1.3, length=1.0),
        RigJoint(name="Ankle_L", parent="Knee_L", pegNodePath="Top/Vex/Ankle_L_Peg", pivotX=0.0, pivotY=-2.3, length=0.2),
    ]
    return RigProfile(name="Vex", joints=joints, restPose={"Root": 0.0, "Shoulder_L": 0.0, "Elbow_L": 0.0})


def test_arm_rotation_45_degrees():
    provider = SyntheticPoseProvider()
    
    # Кадр 1: рука направлена прямо по оси X (угол 0)
    provider.set_landmark(1, "LEFT_HIP", 0.0, 0.0, 0.0, 1.0)
    provider.set_landmark(1, "LEFT_SHOULDER", 0.0, 0.0, 0.0, 1.0)
    provider.set_landmark(1, "LEFT_ELBOW", 1.0, 0.0, 0.0, 1.0)
    
    # Кадр 2: рука повёрнута на 45 градусов вверх
    provider.set_landmark(2, "LEFT_HIP", 0.0, 0.0, 0.0, 1.0)
    provider.set_landmark(2, "LEFT_SHOULDER", 0.0, 0.0, 0.0, 1.0)
    provider.set_landmark(2, "LEFT_ELBOW", math.cos(math.radians(45)), math.sin(math.radians(45)), 0.0, 1.0)
    
    rig = create_standard_rig()
    mappings = [
        JointMapping(pegNodePath="Top/Vex/Shoulder_L_Peg", sourceJoints=["LEFT_SHOULDER", "LEFT_ELBOW"], transformType="rotation")
    ]
    
    manifest = run_motion_retargeting(provider, rig, mappings, start_frame=1, end_frame=2, fps=24.0, tolerance=0.1, alpha=1.0, beta=0.0)
    
    track = next(t for t in manifest.tracks if t.peg_node_path == "Top/Vex/Shoulder_L_Peg")
    
    # Ключи на кадрах 1 и 2 должны соответствовать углам 0 и 45 градусов
    assert abs(track.keyframes[0].value - 0.0) < 1.0
    assert abs(track.keyframes[1].value - 45.0) < 1.0


def test_elbow_bend():
    # Проверим IK вычисления сгиба локтя
    root = (0.0, 0.0)
    target = (1.414, 0.0) # расстояние d = 1.414. Длины плеча=1.0, предплечья=1.0
    # cos(theta2) = (1.414**2 - 1 - 1) / (2 * 1 * 1) = (2 - 2) / 2 = 0
    # theta2 = acos(0) = 90 градусов (прямой угол сгиба локтя)
    
    angle1, angle2 = solve_ik_2joint(root, target, l1=1.0, l2=1.0, flip_elbow=False)
    assert abs(abs(angle2) - 90.0) < 1.0


def test_step_with_locked_foot():
    # Проверка Foot locking
    frames = [
        {"LEFT_ANKLE": (0.1, -0.68, 0.0, 1.0)},
        {"LEFT_ANKLE": (0.1005, -0.6805, 0.0, 1.0)}, # мизерное движение
        {"LEFT_ANKLE": (0.2, -0.68, 0.0, 1.0)}  # стопа поднялась и сделала шаг
    ]
    
    locked = apply_foot_locking(frames, fps=24.0, foot_joint_name="LEFT_ANKLE", ground_y=-0.7, vel_threshold=0.1)
    
    # На втором кадре стопа должна быть заблокирована в позиции первого кадра
    assert locked[1]["LEFT_ANKLE"][0] == 0.1
    assert locked[1]["LEFT_ANKLE"][1] == -0.68
    # На третьем кадре движение превышает порог скорости, стопа разблокирована
    assert locked[2]["LEFT_ANKLE"][0] == 0.2


def test_squat():
    provider = SyntheticPoseProvider()
    
    # Кадр 1: стоячая поза
    provider.set_landmark(1, "MID_HIP", 0.0, 0.0, 0.0, 1.0)
    provider.set_landmark(1, "LEFT_ANKLE", 0.0, -0.7, 0.0, 1.0)
    
    # Кадр 2: присед (таз опустился по Y на 0.2)
    provider.set_landmark(2, "MID_HIP", 0.0, -0.2, 0.0, 1.0)
    provider.set_landmark(2, "LEFT_ANKLE", 0.0, -0.7, 0.0, 1.0)
    
    rig = create_standard_rig()
    mappings = [
        JointMapping(pegNodePath="Top/Vex/Root_Peg", sourceJoints=["MID_HIP"], transformType="translation"),
        JointMapping(pegNodePath="Top/Vex/Ankle_L_Peg", sourceJoints=["LEFT_ANKLE"], transformType="translation")
    ]
    
    manifest = run_motion_retargeting(provider, rig, mappings, start_frame=1, end_frame=2, fps=24.0, tolerance=0.01, alpha=1.0, beta=0.0)
    
    root_track = next(t for t in manifest.tracks if t.peg_node_path == "Top/Vex/Root_Peg")
    # Ожидаем опускание рута по Y
    # Поскольку Root_Peg Y вытаскивается по оси Y, проверим значения Y
    assert root_track.keyframes[1].value < root_track.keyframes[0].value


def test_lost_landmark():
    # Симуляция окклюзии ориентира (колено/локоть)
    provider = SyntheticPoseProvider()
    provider.set_landmark(1, "LEFT_ELBOW", 0.5, 0.5, 0.0, 1.0)
    # На кадре 2 ориентир пропадает (visibility = 0.1)
    provider.set_landmark(2, "LEFT_ELBOW", 0.9, 0.9, 0.0, 0.1)
    
    rig = create_standard_rig()
    mappings = [
        JointMapping(pegNodePath="Top/Vex/Elbow_L_Peg", sourceJoints=["LEFT_SHOULDER", "LEFT_ELBOW"], transformType="rotation")
    ]
    
    # Задаем плечо
    provider.set_landmark(1, "LEFT_SHOULDER", 0.0, 0.0, 0.0, 1.0)
    provider.set_landmark(2, "LEFT_SHOULDER", 0.0, 0.0, 0.0, 1.0)
    
    manifest = run_motion_retargeting(provider, rig, mappings, start_frame=1, end_frame=2, fps=24.0, tolerance=0.1)
    track = next(t for t in manifest.tracks if t.peg_node_path == "Top/Vex/Elbow_L_Peg")
    
    # Из-за низкой уверенности позиция локтя на кадре 2 удерживается близко к кадру 1
    # Разница углов не должна быть огромной
    assert abs(track.keyframes[1].value - track.keyframes[0].value) < 10.0


def test_camera_motion_compensation():
    frames = [
        {"LEFT_SHOULDER": (0.0, 0.0, 0.0, 1.0), "BG_ROCK": (1.0, 1.0, 0.0, 1.0)},
        # Камера сместилась вправо на 0.1 и вниз на 0.05, поэтому все точки уплыли влево и вверх
        {"LEFT_SHOULDER": (-0.1, 0.05, 0.0, 1.0), "BG_ROCK": (0.9, 1.05, 0.0, 1.0)}
    ]
    
    compensated = compensate_camera_motion(frames, bg_landmarks=["BG_ROCK"])
    
    # Плечо после компенсации движения камеры должно вернуться в исходную позицию (0.0, 0.0)
    assert abs(compensated[1]["LEFT_SHOULDER"][0] - 0.0) < 0.001
    assert abs(compensated[1]["LEFT_SHOULDER"][1] - 0.0) < 0.001


def test_mirror_video():
    # Проверка инверсии сторон
    lms = {
        "LEFT_SHOULDER": (0.2, 0.5, 0.0, 1.0),
        "RIGHT_SHOULDER": (-0.2, 0.5, 0.0, 1.0)
    }
    mirrored = normalize_skeleton(lms, mirror=True)
    
    # После зеркалирования левое плечо должно стать правым с инвертированным знаком X
    assert mirrored["RIGHT_SHOULDER"][0] == -0.25
    assert mirrored["LEFT_SHOULDER"][0] == 0.25


def test_sharp_gesture():
    # Проверим, что сглаживание снижает резкие выбросы
    provider = SyntheticPoseProvider()
    provider.set_landmark(1, "LEFT_SHOULDER", 0.0, 0.0, 0.0, 1.0)
    provider.set_landmark(1, "LEFT_ELBOW", 1.0, 0.0, 0.0, 1.0)
    
    provider.set_landmark(2, "LEFT_SHOULDER", 0.0, 0.0, 0.0, 1.0)
    # Резкий скачок на 90 градусов вверх
    provider.set_landmark(2, "LEFT_ELBOW", 0.0, 1.0, 0.0, 1.0)
    
    provider.set_landmark(3, "LEFT_SHOULDER", 0.0, 0.0, 0.0, 1.0)
    provider.set_landmark(3, "LEFT_ELBOW", 0.0, 1.0, 0.0, 1.0)
    
    rig = create_standard_rig()
    mappings = [
        JointMapping(pegNodePath="Top/Vex/Shoulder_L_Peg", sourceJoints=["LEFT_SHOULDER", "LEFT_ELBOW"], transformType="rotation")
    ]
    
    manifest = run_motion_retargeting(provider, rig, mappings, start_frame=1, end_frame=3, fps=24.0, tolerance=0.1)
    track = next(t for t in manifest.tracks if t.peg_node_path == "Top/Vex/Shoulder_L_Peg")
    
    # Угол на кадре 2 сглаживается и не доходит до крайних 90 градусов мгновенно
    assert track.keyframes[1].value < 80.0


def test_static_pose():
    # Проверка RDP сжатия
    provider = SyntheticPoseProvider()
    # 10 абсолютно одинаковых кадров (статичная поза)
    for f in range(1, 11):
        provider.set_landmark(f, "LEFT_SHOULDER", 0.0, 0.0, 0.0, 1.0)
        provider.set_landmark(f, "LEFT_ELBOW", 1.0, 0.0, 0.0, 1.0)
        
    rig = create_standard_rig()
    mappings = [
        JointMapping(pegNodePath="Top/Vex/Shoulder_L_Peg", sourceJoints=["LEFT_SHOULDER", "LEFT_ELBOW"], transformType="rotation")
    ]
    
    manifest = run_motion_retargeting(provider, rig, mappings, start_frame=1, end_frame=10, fps=24.0, tolerance=0.5)
    track = next(t for t in manifest.tracks if t.peg_node_path == "Top/Vex/Shoulder_L_Peg")
    
    # Ожидаем сжатие до 2 ключей (кадр 1 и кадр 10)
    assert len(track.keyframes) == 2
    assert track.keyframes[0].frame == 1
    assert track.keyframes[-1].frame == 10


def test_rig_other_names_and_proportions():
    # Тест на нормализацию пропорций рига с другими именами
    provider = SyntheticPoseProvider()
    provider.set_landmark(1, "LEFT_HIP", 0.0, 0.0, 0.0, 1.0)
    provider.set_landmark(1, "LEFT_SHOULDER", 0.0, 0.0, 0.0, 1.0)
    provider.set_landmark(1, "LEFT_ELBOW", 2.0, 0.0, 0.0, 1.0) # Длина руки = 2.0
    
    # Создаем риг с другими именами суставов и пропорциями (длина 0.5)
    joints = [
        RigJoint(name="Root", parent=None, pegNodePath="Top/Hero/Root_Peg", pivotX=0.0, pivotY=0.0, length=1.0),
        RigJoint(name="ArmUpper", parent="Root", pegNodePath="Top/Hero/ArmUpper_Peg", pivotX=0.0, pivotY=0.0, length=0.5),
    ]
    rig = RigProfile(name="Hero", joints=joints, restPose={"Root": 0.0, "ArmUpper": 0.0})
    
    mappings = [
        JointMapping(pegNodePath="Top/Hero/ArmUpper_Peg", sourceJoints=["LEFT_SHOULDER", "LEFT_ELBOW"], transformType="rotation")
    ]
    
    manifest = run_motion_retargeting(provider, rig, mappings, start_frame=1, end_frame=1, fps=24.0, tolerance=0.1)
    
    # Проверяем правильность маппинга
    track = next(t for t in manifest.tracks if t.peg_node_path == "Top/Hero/ArmUpper_Peg")
    assert abs(track.keyframes[0].value - 0.0) < 1.0
