from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any


def generate_html_comparison_report(
    job_dir: Path,
    hypotheses: List[Any],
    comparison_data: Dict[str, Any]
) -> Path:
    """
    Генерирует автономный HTML-отчёт сравнения вариантов реконструкции (без зависимостей от интернета).
    """
    report_path = job_dir / "comparison_report.html"
    
    # Строим строки таблицы сравнения
    table_rows = ""
    for h in hypotheses:
        vm = h.visual_metrics
        cm = h.complexity_metrics
        # Вычисляем счет рекомендации
        score = next((t["recommendationScore"] for t in comparison_data["comparisonTable"] if t["hypothesisId"] == h.hypothesis_id), 80.0)
        
        is_rec = "★ РЕКОМЕНДУЕТСЯ" if h.hypothesis_id == comparison_data["recommendedVariant"] else ""
        
        table_rows += f"""
        <tr class="{'recommended-row' if is_rec else ''}">
            <td><strong>{h.hypothesis_id}</strong> <span class="badge">{is_rec}</span></td>
            <td class="score-cell">{score:.1f}</td>
            <td>{vm.mean_pixel_difference:.2f}</td>
            <td>{vm.maximum_pixel_difference:.1f}</td>
            <td>{vm.silhouette_difference:.3f}</td>
            <td>{vm.contour_difference:.3f}</td>
            <td>{cm.unique_drawing_count}</td>
            <td>{cm.vector_point_count}</td>
            <td>{cm.palette_color_count}</td>
            <td>{cm.exposure_block_count}</td>
            <td>{cm.estimated_scene_size / 1024:.1f} KB</td>
            <td>{cm.problem_frame_count}</td>
        </tr>
        """

    # Преимущества для аниматора
    benefits_html = ""
    for h in hypotheses:
        cm = h.complexity_metrics
        if h.hypothesis_id == "compact_frame_by_frame":
            benefits_html += f"""
            <div class="card">
                <h3>compact_frame_by_frame</h3>
                <p><strong>Преимущества:</strong> Сокращает количество уникальных фазовок до {cm.unique_drawing_count} (меньше ручной отрисовки). Ограничивает число опорных точек векторов ({cm.vector_point_count} точек на всю сцену), что делает кривые Безье чрезвычайно легкими для редактирования инструментами Contour/Pencil Editor в Harmony.</p>
            </div>
            """
        elif h.hypothesis_id == "clean_frame_by_frame":
            benefits_html += """
            <div class="card">
                <h3>clean_frame_by_frame</h3>
                <p><strong>Преимущества:</strong> Повышенная геометрическая стабильность. Идеально сглаживает мелкое дрожание и факел контуров (flicker), отфильтровывая артефакты векторизации площадью менее 35 пикселей. Упрощает заливку цветом (Paint Tool) в Harmony.</p>
            </div>
            """
        else:
            benefits_html += """
            <div class="card">
                <h3>frame_by_frame_vector</h3>
                <p><strong>Преимущества:</strong> 100% пиксельное соответствие источнику. Служит точным геометрическим и цветовым референсом для сложных сцен.</p>
            </div>
            """

    # Раздел проблемных кадров
    problems_html = ""
    all_problems = []
    for h in hypotheses:
        for pf in h.problem_frames:
            all_problems.append((h.hypothesis_id, pf))
            
    # Группируем по кадрам для компактности
    problems_by_frame = {}
    for hyp_id, pf in all_problems:
        problems_by_frame.setdefault(pf.frame, []).append((hyp_id, pf))
        
    for frame_num in sorted(problems_by_frame.keys())[:10]:  # Показываем первые 10 проблемных кадров
        items = problems_by_frame[frame_num]
        prob_rows = ""
        for hyp_id, pf in items:
            # Находим относительный путь к превью от папки джобы
            # Превью лежат в previews_{hyp_id}/frame_{frame_num:06d}.png
            # Карта разности лежит в problem_previews/diff_drawing_dr_...
            # Для упрощения сошлемся на локальные PNG превью
            preview_path = f"previews_{hyp_id}/frame_{frame_num:06d}.png"
            prob_rows += f"""
            <div class="variant-preview-box">
                <h4>Вариант: {hyp_id}</h4>
                <p>Критичность: <span class="badge-severity-{pf.severity}">{pf.severity}</span> | {pf.category}</p>
                <img src="{preview_path}" alt="{hyp_id} frame {frame_num}" />
                <p class="recommendation"><em>Рекомендация: {pf.recommended_action}</em></p>
            </div>
            """
            
        problems_html += f"""
        <div class="frame-report">
            <h3>Кадр #{frame_num}</h3>
            <div class="previews-grid">
                {prob_rows}
            </div>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Отчет сравнения вариантов реконструкции (V2 Addendum)</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #121214;
            color: #e1e1e6;
            margin: 0;
            padding: 24px;
        }}
        h1, h2, h3 {{
            color: #ffffff;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background-color: #1a1a1e;
            border-radius: 8px;
            overflow: hidden;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #2a2a30;
        }}
        th {{
            background-color: #252529;
            color: #a1a1a6;
            font-weight: 600;
        }}
        tr:hover {{
            background-color: #222226;
        }}
        .recommended-row {{
            background-color: #1e2c1e;
        }}
        .recommended-row:hover {{
            background-color: #243824;
        }}
        .badge {{
            background-color: #2da44e;
            color: #ffffff;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: bold;
        }}
        .badge-severity-high, .badge-severity-critical {{
            background-color: #cf222e;
            color: white;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 4px;
        }}
        .badge-severity-medium, .badge-severity-low {{
            background-color: #d4a72c;
            color: black;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 4px;
        }}
        .score-cell {{
            font-size: 16px;
            font-weight: bold;
            color: #2da44e;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        .recommendation-panel {{
            background-color: #1b2735;
            border-left: 4px solid #0066cc;
            padding: 16px;
            border-radius: 4px;
            margin-bottom: 24px;
        }}
        .grid {{
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
        }}
        .card {{
            background-color: #1a1a1e;
            border: 1px solid #2a2a30;
            padding: 16px;
            border-radius: 8px;
        }}
        .previews-grid {{
            display: flex;
            gap: 16px;
            overflow-x: auto;
            padding-bottom: 12px;
        }}
        .variant-preview-box {{
            flex: 0 0 280px;
            background-color: #1a1a1e;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #2a2a30;
        }}
        .variant-preview-box img {{
            width: 100%;
            height: auto;
            border-radius: 4px;
            background-color: #000;
        }}
        .frame-report {{
            background-color: #161619;
            border: 1px solid #252529;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Сводный отчет сравнения гипотез реконструкции</h1>
        <p>Сгенерирован: {datetime.now(timezone.utc).isoformat()}</p>
        
        <div class="recommendation-panel">
            <h2>Рекомендация алгоритма</h2>
            <p><strong>Рекомендуемый вариант:</strong> <span class="badge">{comparison_data["recommendedVariant"]}</span></p>
            <p>{comparison_data["explanation"]}</p>
        </div>

        <h2>Сводная таблица метрик</h2>
        <table>
            <thead>
                <tr>
                    <th>Вариант (ID)</th>
                    <th>Оценка (Score)</th>
                    <th>Средняя разность (px)</th>
                    <th>Макс. разность (px)</th>
                    <th>Ошибка силуэта</th>
                    <th>Ошибка контуров</th>
                    <th>Уникальные рисунки</th>
                    <th>Точки векторов</th>
                    <th>Цвета палитры</th>
                    <th>Блоки экспозиций</th>
                    <th>Объем сцены (эст.)</th>
                    <th>Проблемные кадры</th>
                </tr>
            </thead>
            <tbody>
                {table_rows}
            </tbody>
        </table>

        <h2>Преимущества для аниматора в Harmony</h2>
        <div class="grid">
            {benefits_html}
        </div>

        <h2>Проблемные кадры и варианты отрисовки</h2>
        {problems_html if problems_html else "<p>Проблемные кадры не обнаружены.</p>"}
    </div>
</body>
</html>
"""
    
    report_path.write_text(html_content, encoding="utf-8")
    return report_path
