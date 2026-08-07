"""
build_scene.py — исполняется ВНУТРИ Blender: blender -b --python build_scene.py

Читает scene_spec.json, строит сцену, опционально рендерит.
Логика здесь намеренно тупая: движок снаружи уже всё посчитал.

Соответствие координат (2D cutout в 3D-хосте):
    движок x -> Blender X
    движок y -> Blender Z   (вверх)
    слой     -> Blender Y   (глубина; камера смотрит вдоль +Y)

Камера ортографическая: без перспективных искажений, плоские части
остаются плоскими — это и есть 2D в 3D-приложении.
"""

import argparse
import json
import math
import os
import sys

import bpy


def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--spec", help="одна спека сцены")
    p.add_argument("--specs", help="файл со списком спек: считать их ВСЕ в этом "
                                   "процессе Blender (батч)")
    p.add_argument("--out", required=True)
    p.add_argument("--render", action="store_true")
    p.add_argument("--frames", nargs=2, type=int, default=None)
    return p.parse_args(argv)


def wipe_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_material(name, rgb):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    # Emission: плоский цвет без освещения — ровно то, что нужно cutout'у.
    # С обычным BSDF пришлось бы ставить свет и бороться с градиентами.
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
    em.inputs["Strength"].default_value = 1.0
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    # Двусторонний рендер: у плоского полигона направление нормали
    # зависит от порядка обхода вершин, а порядок задаёт художник в
    # спеке. Полагаться на него — значит терять части наугад
    # (см. use_backface_culling ниже и комментарий в make_flat_poly).
    m.use_backface_culling = False
    return m


def make_flat_poly(name, points, color, depth):
    """Плоский полигон в XZ. points — [(x, z), ...] в локальных координатах.

    Геометрия кладётся в меш как есть; смещение по глубине идёт в
    ВЕРШИНЫ, а не в object.location — иначе Y-координата объекта занята
    глубиной и конфликтует с пивотом (см. ниже, где location задаётся
    из pivot).

    Нормаль приводится К КАМЕРЕ принудительно. Дефект, пойманный
    сравнением мешей: у «руки» нормаль вышла +Y (от камеры), у «торса»
    −Y (к камере) — просто потому, что контуры описаны в разном
    порядке обхода. Рука не рендерилась вообще, а сообщения об ошибке
    не было: с точки зрения Blender всё корректно. Требовать от
    художника «рисуй контур против часовой» — это мина, которая
    сработает на первой же зеркальной части.
    """
    mesh = bpy.data.meshes.new(name + "_mesh")
    verts = [(x, depth, z) for (x, z) in points]
    faces = [list(range(len(verts)))] if len(verts) >= 3 else []
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    # Камера смотрит вдоль +Y, значит видимая нормаль должна быть −Y.
    if mesh.polygons and mesh.polygons[0].normal.y > 0.0:
        mesh.flip_normals()
        mesh.update()

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(make_material(name + "_mat", color))
    bpy.context.collection.objects.link(obj)
    return obj


def iter_fcurves(obj):
    """F-кривые объекта, независимо от версии API.

    Blender 5.x перевёл действия на слои/слоты: у Action больше нет
    .fcurves, кривые лежат в channelbag страйпа для конкретного слота.
    Проверено на живом 5.1.1 (`Action` has no attribute `fcurves`),
    старый путь оставлен для 3.x/4.x — версия хоста не должна быть
    зашита в код, который её не проверяет.
    """
    ad = obj.animation_data
    if not ad or not ad.action:
        return
    act = ad.action
    legacy = getattr(act, "fcurves", None)
    if legacy is not None:
        for fc in legacy:
            yield fc
        return
    slot = getattr(ad, "action_slot", None)
    for layer in getattr(act, "layers", []):
        for strip in getattr(layer, "strips", []):
            try:
                bag = strip.channelbag(slot) if slot else None
            except Exception:
                bag = None
            if bag is None:
                continue
            for fc in bag.fcurves:
                yield fc



def make_image_material(name, image_path):
    """Материал из PNG с альфой: плоский цвет + прозрачность.

    Emission, а не BSDF: рисунок художника уже содержит освещение и
    тени. Досвечивать его — значит спорить с автором.

    Alpha идёт в Mix Shader с Transparent BSDF: это работает и в EEVEE, и
    в Cycles. Straight alpha (не premultiplied) — иначе по краям штриха
    появляется тёмная кайма, которую художник не рисовал.
    """
    img = bpy.data.images.load(image_path, check_existing=True)
    img.alpha_mode = "STRAIGHT"
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = "Closest" if max(img.size) < 256 else "Linear"
    em = nt.nodes.new("ShaderNodeEmission")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(tex.outputs["Color"], em.inputs["Color"])
    nt.links.new(tex.outputs["Alpha"], mix.inputs["Fac"])
    nt.links.new(tr.outputs["BSDF"], mix.inputs[1])
    nt.links.new(em.outputs["Emission"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    m.blend_method = "BLEND" if hasattr(m, "blend_method") else m.blend_method
    m.use_backface_culling = False
    return m


def make_image_plane(name, quad, image_path, depth):
    """Плоскость с текстурой. UV кладутся явно: автоматическая развёртка
    для четырёхугольника может прийти повёрнутой, и рисунок окажется
    зеркальным — без единого сообщения об ошибке."""
    mesh = bpy.data.meshes.new(name + "_mesh")
    verts = [(x, depth, z) for (x, z) in quad]
    mesh.from_pydata(verts, [], [[0, 1, 2, 3]])
    mesh.update()
    if mesh.polygons and mesh.polygons[0].normal.y > 0.0:
        mesh.flip_normals()
        mesh.update()
    uv = mesh.uv_layers.new(name="UVMap")
    # порядок вершин quad: BL, BR, TR, TL
    for i, co in enumerate([(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0)]):
        uv.data[i].uv = co
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(make_image_material(name + "_mat", image_path))
    bpy.context.collection.objects.link(obj)
    return obj



def apply_swaps(spec, objs):
    """Подмена рисунков (drawing substitution): рты, глаза, кисти.

    В cutout-анимации рот — это НЕ деформация, а набор нарисованных
    вариантов, из которых на каждом кадре показан один. Здесь это
    реализовано ключами на видимость: все варианты лежат в сцене друг
    на друге, видим ровно один.

    Почему CONSTANT обязателен: интерполяция видимости между 0 и 1 дала
    бы полупрозрачные кадры на стыках — рот «проявлялся» бы вместо
    мгновенной смены. Дефект был бы виден только на просмотре.
    """
    for group in spec.get("swap_groups") or []:
        members = [m for m in group["members"] if m in objs]
        missing = [m for m in group["members"] if m not in objs]
        if missing:
            raise KeyError("swap group %r references unknown parts: %s"
                           % (group.get("name", "?"), ", ".join(missing)))
        if not members:
            continue
        # Кадры, на которых что-то меняется, плюс первый кадр сцены.
        events = sorted({int(a["frame"]) for a in group["timeline"]})
        if not events or events[0] > spec["frame_start"]:
            events.insert(0, int(spec["frame_start"]))
        table = {int(a["frame"]): a["drawing"] for a in group["timeline"]}
        current = group.get("default") or members[0]
        for f in events:
            current = table.get(f, current)
            for m in members:
                o = objs[m]
                o.hide_render = (m != current)
                o.hide_viewport = (m != current)
                o.keyframe_insert("hide_render", frame=f)
                o.keyframe_insert("hide_viewport", frame=f)
        for m in members:
            for fc in iter_fcurves(objs[m]):
                if "hide" in fc.data_path:
                    for kp in fc.keyframe_points:
                        kp.interpolation = "CONSTANT"


def build(spec, out_dir):
    wipe_scene()
    scene = bpy.context.scene
    scene.render.fps = spec["fps"]
    scene.frame_start = spec["frame_start"]
    scene.frame_end = spec["frame_end"]
    scene.render.resolution_x, scene.render.resolution_y = spec["resolution"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"

    # Цветовое преобразование: STANDARD, а не дефолтный AgX.
    #
    # Дефект, найденный сравнением ЧИСЕЛ: заданный цвет (0.92,0.72,0.35)
    # выходил в PNG как (195,182,158) вместо ожидаемых (246,221,160) —
    # AgX это фильмический tone mapping, он сжимает яркое и десатурирует.
    # Для плоской заливки cutout-анимации это чистый вред: цвет из
    # палитры перестаёт быть цветом на экране, и никакая проверка
    # «совпал ли цвет» больше не работает. STANDARD отдаёт ровно то,
    # что задано.
    try:
        scene.view_settings.view_transform = "Standard"
    except TypeError:
        pass  # старая сборка без этого преобразования: цвет останется как есть
    try:
        scene.view_settings.look = "None"
    except TypeError:
        pass  # look отсутствует в 3.x — там его и не нужно снимать

    # Фон: world с плоским цветом
    world = bpy.data.worlds.new("W")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        c = spec["bg_color"]
        bg.inputs["Color"].default_value = (c[0], c[1], c[2], 1.0)
        bg.inputs["Strength"].default_value = 1.0

    # Части: сначала все объекты, потом родительство (родитель может идти
    # позже в списке — порядок в спеке не должен иметь значения)
    objs = {}
    rest = {}
    for p in spec["parts"]:
        o = make_flat_poly(p["name"], p["points"], p["color"], p["depth"])
        objs[p["name"]] = o

    # Части-рисунки: PNG художника вместо полигонов. Иерархия, пивоты и
    # каналы для них те же — движок таймингов ничего не знает о том,
    # нарисована часть или собрана из фигур.
    for p in spec.get("image_parts") or []:
        if not os.path.exists(p["image"]):
            raise FileNotFoundError("artwork missing: " + p["image"])
        objs[p["name"]] = make_image_plane(
            p["name"], [tuple(q) for q in p["quad"]], p["image"], p["depth"])

    for p in list(spec["parts"]) + list(spec.get("image_parts") or []):
        o = objs[p["name"]]
        px, pz = p["pivot"]
        if p["parent"]:
            parent = objs.get(p["parent"])
            if parent is None:
                raise KeyError(f"part {p['name']!r} references unknown "
                               f"parent {p['parent']!r}")
            o.parent = parent
            o.matrix_parent_inverse.identity()
        # Пивот в координатах родителя = локальная позиция объекта.
        # Глубина уже вшита в вершины меша, поэтому Y здесь всегда 0.
        o.location = (px, 0.0, pz)
        rest[p["name"]] = (px, pz)

    # Камера: ортографическая, смотрит вдоль +Y
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = spec["camera_ortho_scale"]
    cam = bpy.data.objects.new("Cam", cam_data)
    cx, cz = spec["camera_loc"]
    cam.location = (cx, -12.0, cz)
    cam.rotation_euler = (math.radians(90.0), 0.0, 0.0)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam

    # Анимация. Свойства движка -> пути данных Blender.
    for ch in spec["channels"]:
        o = objs.get(ch["part"])
        if o is None:
            # Канал на несуществующую часть — ошибка спеки, а не повод
            # тихо пропустить: иначе анимация «частично не работает».
            raise KeyError(f"channel targets unknown part {ch['part']!r}")
        prop = ch["prop"]
        rx, rz = rest.get(ch["part"], (0.0, 0.0))
        for (frame, value) in ch["keys"]:
            if prop == "rot":
                o.rotation_euler[1] = math.radians(-value)   # вокруг Y (глубина)
                o.keyframe_insert("rotation_euler", index=1, frame=frame)
            elif prop == "x":
                # Канал x — СМЕЩЕНИЕ от пивота, а не абсолютная позиция.
                # Дефект, пойманный до рендера: `o.location[0] = value`
                # затирал пивот, и любая часть с x-каналом прыгала в
                # начало координат родителя. Для master (пивот 0,0)
                # разницы нет — поэтому дефект прошёл бы незамеченным
                # до первой руки с x-смещением.
                o.location[0] = rx + value
                o.keyframe_insert("location", index=0, frame=frame)
            elif prop == "y":
                o.location[2] = rz + value
                o.keyframe_insert("location", index=2, frame=frame)
            elif prop == "sx":
                o.scale[0] = value
                o.keyframe_insert("scale", index=0, frame=frame)
            elif prop == "sy":
                o.scale[2] = value
                o.keyframe_insert("scale", index=2, frame=frame)
            else:
                raise ValueError(f"unsupported prop {prop!r}")
        # Интерполяция: плотные ключи движка уже несут изинг в значениях.
        # BEZIER поверх них исказил бы профиль — ставим LINEAR явно.
        for fc in iter_fcurves(o):
            for kp in fc.keyframe_points:
                kp.interpolation = ch["interp"]

    # Рендер-движок: EEVEE быстрый и для плоских emission-полигонов
    # даёт тот же результат, что Cycles, за доли времени.
    for name in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "CYCLES"):
        try:
            scene.render.engine = name
            break
        except TypeError:
            continue

    # Звуковая дорожка в VSE. Проверено на живом Blender 5.1:
    # sequence_editor_create().strips.new_sound(...).
    #
    # Дорожка нужна В СЦЕНЕ, а не только в финальном mux: без неё
    # художник не может проверить попадание рта в звук — а это главная
    # причина, по которой липсинк «почти совпадает».
    for tr in spec.get("audio_tracks") or []:
        if not os.path.exists(tr["path"]):
            raise FileNotFoundError("audio track missing: " + tr["path"])
        se = scene.sequence_editor_create()
        st = se.strips.new_sound(tr.get("name", "dialogue"), tr["path"],
                                 1, int(tr.get("start_frame", 1)))
        st.volume = float(tr.get("volume", 1.0))

    apply_swaps(spec, objs)

    blend = os.path.join(out_dir, spec["name"] + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    return scene


def one(spec, out_dir, render, frames):
    """Собрать и (опционально) отрендерить одну сцену в этом процессе."""
    scene = build(spec, out_dir)
    print("BUILD_OK %s parts=%d channels=%d engine=%s"
          % (spec["name"], len(spec.get("parts") or []),
             len(spec.get("channels") or []), scene.render.engine))
    if render:
        f0, f1 = frames if frames else (spec["frame_start"], spec["frame_end"])
        scene.frame_start, scene.frame_end = f0, f1
        scene.render.filepath = os.path.join(out_dir, "f")
        bpy.ops.render.render(animation=True)
        print("RENDER_OK %s %d..%d" % (spec["name"], f0, f1))


def main():
    a = parse_args()

    # Батч: несколько шотов в ОДНОМ процессе Blender.
    #
    # Замер, ради которого это написано: пустой запуск Blender стоит ~0.67 с, и
    # на 12 шотов это 8 из 15 секунд прогона. Батч на уровне питона (несколько
    # шотов в одном процессе-воркере) этих секунд НЕ убирал, потому что
    # build_scene всё равно стартовал Blender подпроцессом на каждый шот —
    # проверено, стало медленнее на 13%. Экономит только батч здесь, внутри
    # самого Blender: процесс запускается один раз на группу.
    #
    # Между шотами сцена стирается начисто (wipe_scene в build), иначе объекты
    # предыдущего шота остаются в новом — дефект, который не даёт ошибки, а даёт
    # чужого персонажа в кадре.
    if a.specs:
        with open(a.specs, "r", encoding="utf-8") as f:
            jobs = json.load(f)
        for job in jobs:
            with open(job["spec"], "r", encoding="utf-8") as sf:
                spec = json.load(sf)
            try:
                one(spec, job["out"], a.render,
                    tuple(job["frames"]) if job.get("frames") else None)
            except Exception as e:                        # noqa: BLE001
                # Один плохой шот не должен уносить остальные в батче.
                print("SHOT_FAILED %s %s: %s"
                      % (spec.get("name", "?"), type(e).__name__, e))
        return

    with open(a.spec, "r", encoding="utf-8") as f:
        spec = json.load(f)
    one(spec, a.out, a.render, a.frames)


main()
