from __future__ import annotations

from pathlib import Path
from typing import Dict, List
from .models import HarmonyReconstructionManifest, Drawing


def render_drawing_to_svg(drawing: Drawing, palette_colors: Dict[str, str], width: int, height: int, dest_path: Path) -> None:
    """
    Рендерит Drawing в SVG-файл с использованием правила fill-rule="evenodd" для отверстий.
    """
    svg_lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">'
    ]
    # Группируем фигуры по color_id
    color_shapes: Dict[str, List[List[tuple[float, float]]]] = {}
    for shape in drawing.shapes:
        pts = [(p.x * width, p.y * height) for p in shape.points]
        if shape.color_id not in color_shapes:
            color_shapes[shape.color_id] = []
        color_shapes[shape.color_id].append(pts)

    for color_id, paths in color_shapes.items():
        color_hex = palette_colors.get(color_id, "#000000")
        
        # Строим составной SVG-путь (compound path) для всех контуров этого цвета
        d_segments = []
        for path in paths:
            if not path:
                continue
            seg = f"M {path[0][0]:.3f} {path[0][1]:.3f} " + " ".join(f"L {pt[0]:.3f} {pt[1]:.3f}" for pt in path[1:]) + " Z"
            d_segments.append(seg)
        
        if d_segments:
            d_attr = " ".join(d_segments)
            # Использование fill-rule="evenodd" позволяет корректно отображать отверстия
            svg_lines.append(f'  <path d="{d_attr}" fill="{color_hex}" fill-rule="evenodd" stroke="none" />')

    svg_lines.append("</svg>")
    dest_path.write_text("\n".join(svg_lines), encoding="utf-8")


def generate_svg_previews(manifest: HarmonyReconstructionManifest, output_dir: Path) -> List[Path]:
    """
    Генерирует SVG-превью для каждого рисунка в манифесте.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    width = manifest.scene.width
    height = manifest.scene.height
    
    # Карта цветов
    palette_colors: Dict[str, str] = {}
    for palette in manifest.palettes:
        for color in palette.colors:
            r, g, b, _ = color.rgba
            palette_colors[color.id] = f"#{r:02x}{g:02x}{b:02x}"
            
    svg_paths = []
    for drawing in manifest.drawings:
        dest_path = output_dir / f"{drawing.id}.svg"
        render_drawing_to_svg(drawing, palette_colors, width, height, dest_path)
        svg_paths.append(dest_path)
    return svg_paths
