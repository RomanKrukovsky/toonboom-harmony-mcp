import json
import os
import subprocess
import tempfile
from pathlib import Path
import cv2
import numpy as np

def find_foreground_centroid(img: np.ndarray) -> tuple[float, float]:
    """
    Находит центр масс (центроид) объекта переднего плана, используя вычитание фонового цвета.
    """
    if img is None:
        return (0.0, 0.0)
    
    h, w = img.shape[:2]
    # Извлекаем пиксели по периметру кадра для определения цвета фона
    border_pixels = []
    border_pixels.extend(img[0:2, :, :3].reshape(-1, 3))
    border_pixels.extend(img[h-2:h, :, :3].reshape(-1, 3))
    border_pixels.extend(img[:, 0:2, :3].reshape(-1, 3))
    border_pixels.extend(img[:, w-2:w, :3].reshape(-1, 3))
    
    bg_color = np.median(np.array(border_pixels), axis=0)
    
    # Считаем разницу цветов
    diff = np.linalg.norm(img[:, :, :3].astype(np.float32) - bg_color, axis=2)
    fg_mask = (diff > 15.0).astype(np.uint8) * 255
    
    moments = cv2.moments(fg_mask)
    if moments["m00"] > 0:
        return (moments["m10"] / moments["m00"], moments["m01"] / moments["m00"])
    return (0.0, 0.0)

def main():
    demo_dir = Path("output/reconstruction-demo")
    cache_dir = demo_dir / "cache"
    
    if not cache_dir.exists():
        print("Каталог кэша демо не найден.")
        return
        
    jobs = list(cache_dir.glob("*"))
    if not jobs:
        print("Задания не найдены в кэше.")
        return
        
    job_dir = jobs[0]
    print(f"Аудит задания в: {job_dir}")
    
    # 1. Загружаем варианты манифестов
    variants = ["frame_by_frame_vector", "clean_frame_by_frame", "compact_frame_by_frame"]
    manifests = {}
    for v in variants:
        p = job_dir / f"manifest_{v}.json"
        if p.exists():
            manifests[v] = json.loads(p.read_text(encoding="utf-8"))
            
    if not manifests:
        print("Файлы манифестов вариантов не найдены.")
        return
        
    print("\n=== РАСПРЕДЕЛЕНИЕ РИСУНКОВ ПО КАДРАМ ===")
    for name, m in manifests.items():
        exp_map = []
        for exp in m["exposures"]:
            exp_map.extend([exp["drawingId"]] * exp["duration"])
        print(f"{name}: {[eid[-8:] for eid in exp_map]}")
        
    # 2. Проверяем долю изображения, занимаемую объектом
    # Считаем по первому кадру оригинального видео
    frames_dir = job_dir / "cleaned"
    if not frames_dir.exists():
        frames_dir = job_dir / "frames"
        
    frame_files = sorted(list(frames_dir.glob("*.png")))
    if not frame_files:
        print("Кадры оригинального видео не найдены.")
        return
        
    first_frame = cv2.imread(str(frame_files[0]))
    gray = cv2.cvtColor(first_frame, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
    object_pixels = np.sum(thresh > 0)
    total_pixels = thresh.size
    ratio = object_pixels / total_pixels
    print(f"\nРазрешение кадра: {first_frame.shape[1]}x{first_frame.shape[0]}")
    print(f"Количество пикселей объекта: {object_pixels} из {total_pixels}")
    print(f"Доля изображения, занимаемая движущимся объектом: {ratio*100:.2f}%")

    # 3. Анализ траекторий
    print("\n=== АНАЛИЗ ТРАЕКТОРИЙ ЦЕНТРОИДОВ ===")
    source_centroids = []
    for f in frame_files:
        img = cv2.imread(str(f))
        source_centroids.append(find_foreground_centroid(img))
        
    print("Траектория источника (X, Y):")
    for idx, (x, y) in enumerate(source_centroids, start=1):
        print(f"Кадр {idx}: ({x:.1f}, {y:.1f})")
        
    for name, m in manifests.items():
        preview_dir = job_dir / f"previews_{name}"
        if not preview_dir.exists():
            continue
        v_centroids = []
        p_files = sorted(list(preview_dir.glob("*.png")))
        for pf in p_files:
            img = cv2.imread(str(pf), cv2.IMREAD_UNCHANGED)
            v_centroids.append(find_foreground_centroid(img))
        
        print(f"\nТраектория {name} (X, Y):")
        for idx, (x, y) in enumerate(v_centroids, start=1):
            print(f"  Кадр {idx}: ({x:.1f}, {y:.1f})")
            
        diffs = [np.linalg.norm(np.array(c1) - np.array(c2)) for c1, c2 in zip(source_centroids, v_centroids)]
        mean_deviation = np.mean(diffs)
        print(f"Среднее отклонение центроида для '{name}': {mean_deviation:.3f} пикселей")

    # 4. Генерация side-by-side GIF
    print("\n=== ГЕНЕРАЦИЯ SIDE-BY-SIDE GIF ===")
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        for idx in range(len(frame_files)):
            # Загружаем оригинал
            orig = cv2.imread(str(frame_files[idx]))
            
            # Подтягиваем варианты
            var_imgs = [orig]
            for v in variants:
                p_file = job_dir / f"previews_{v}" / f"frame_{idx+1:06d}.png"
                if p_file.exists():
                    v_img = cv2.imread(str(p_file))
                    # Если есть альфа, накладываем на белый фон
                    if v_img.shape[2] == 4:
                        alpha = v_img[:, :, 3:4] / 255.0
                        v_img = (v_img[:, :, :3] * alpha + 245 * (1.0 - alpha)).astype(np.uint8)
                    var_imgs.append(v_img)
                else:
                    # Заглушка
                    var_imgs.append(np.zeros_like(orig))
                    
            # Добавляем текстовые подписи сверху каждого блока
            labels = ["SOURCE", "FRAME-BY-FRAME", "CLEAN", "COMPACT"]
            labeled_imgs = []
            for img, label in zip(var_imgs, labels):
                annotated = img.copy()
                cv2.putText(annotated, label, (5, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 255), 1, cv2.LINE_AA)
                labeled_imgs.append(annotated)
                
            stitched = cv2.hconcat(labeled_imgs)
            cv2.imwrite(str(tmp_path / f"frame_{idx+1:06d}.png"), stitched)
            
        gif_output = demo_dir / "side_by_side.gif"
        print(f"Экспорт GIF в: {gif_output}")
        
        # Используем ffmpeg для сборки GIF
        ffmpeg = os.environ.get("FFMPEG_PATH", "ffmpeg")
        cmd = [
            ffmpeg, "-y", "-framerate", "4",
            "-i", str(tmp_path / "frame_%06d.png"),
            "-vf", "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
            str(gif_output)
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
            print("GIF успешно собран!")
        else:
            print("Не удалось собрать GIF через ffmpeg:", res.stderr)

if __name__ == "__main__":
    main()
