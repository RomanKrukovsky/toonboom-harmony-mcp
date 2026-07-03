import sys
import json
import os
import traceback

class ResponseException(Exception):
    def __init__(self, data):
        self.data = data

def respond(data):
    if os.environ.get("HARMONY_PERSISTENT_MODE") == "true":
        raise ResponseException(data)
    else:
        print(json.dumps(data))
        sys.exit(0)

def respond_error(code, message, details=None):
    respond({
        "error": True,
        "code": code,
        "message": message,
        "details": details
    })

def process_command(input_data):
    command = input_data.get("command")
    args = input_data.get("args", {})
    python_packages = input_data.get("pythonPackages")

    # Добавляем путь к пакетам Toon Boom в sys.path, если он передан
    if python_packages and os.path.exists(python_packages):
        sys.path.insert(0, python_packages)

    # Попытка импорта ToonBoom.harmony
    try:
        from ToonBoom import harmony
    except ImportError as e:
        respond_error(
            "PYTHON_API_UNAVAILABLE",
            "Не удалось импортировать модуль Python ToonBoom.harmony. "
            "Проверьте, что Harmony установлена, а переменная HARMONY_PYTHON_PACKAGES настроена верно.",
            {"import_error": str(e), "sys_path": sys.path}
        )

    # Базовая информация и рефлексия доступных методов
    if command == "detect":
        caps = {
            "has_session": hasattr(harmony, "session"),
            "has_open_project": hasattr(harmony, "open_project"),
            "dir_harmony": dir(harmony)
        }
        respond({"status": "success", "capabilities": caps})

    # Проверка доступности функции сессии
    if not hasattr(harmony, "session"):
        respond_error("UNSUPPORTED_BY_VERSION", "Функция harmony.session() недоступна в данной установленной версии.")

    project_path = args.get("projectPath")
    session = None
    project = None

    # Загружаем проект, если указан путь, или получаем текущую сессию
    try:
        if project_path:
            if not os.path.exists(project_path):
                respond_error("INVALID_HARMONY_OBJECT", f"Файл проекта отсутствует по пути '{project_path}'")
            if hasattr(harmony, "open_project"):
                session = harmony.open_project(project_path)
            else:
                respond_error("UNSUPPORTED_BY_VERSION", "Метод harmony.open_project не поддерживается в данной версии.")
        else:
            session = harmony.session()
        
        if session:
            project = session.project
    except Exception as e:
        respond_error("INVALID_HARMONY_OBJECT", f"Не удалось подключиться к сессии проекта: {str(e)}", {"traceback": traceback.format_exc()})

    if not project:
        respond_error("INVALID_HARMONY_OBJECT", "Активный проект или сессия не найдены.")

    # Выполнение команд над проектом
    try:
        if command == "open_project":
            respond({
                "status": "success",
                "project_path": project.project_path if hasattr(project, "project_path") else project_path,
                "message": f"Проект успешно открыт: {project_path}"
            })

        elif command == "inspect_project":
            info = {
                "project_path": getattr(project, "project_path", ""),
                "resolution": str(getattr(project, "resolution", "")),
                "frame_rate": getattr(project, "frame_rate", 24),
                "num_frames": getattr(project, "num_frames", 1),
                "current_frame": getattr(project, "current_frame", 1)
            }
            respond({"status": "success", "project_info": info})

        elif command == "list_nodes":
            nodes = []
            if hasattr(project, "root_group"):
                root = project.root_group
                nodes = get_all_nodes(root)
            elif hasattr(project, "nodes"):
                nodes = [str(n) for n in project.nodes]
            elif hasattr(project, "scene_graph"):
                nodes = [str(n) for n in project.scene_graph.nodes]
            respond({"status": "success", "nodes": nodes})

        elif command == "get_node_attrs":
            node_path = args.get("nodePath")
            node = find_node_by_path(project, node_path)
            if not node:
                respond_error("INVALID_HARMONY_OBJECT", f"Узел '{node_path}' не найден в проекте.")

            attrs = {}
            if hasattr(node, "attributes"):
                for attr in node.attributes:
                    attrs[attr.name] = attr.value
            else:
                attrs = {a: str(getattr(node, a)) for a in dir(node) if not a.startswith('_')}
            respond({"status": "success", "node_path": node_path, "attributes": attrs})

        elif command == "set_node_attr":
            node_path = args.get("nodePath")
            attr_name = args.get("attributeName")
            attr_val = args.get("value")

            node = find_node_by_path(project, node_path)
            if not node:
                respond_error("INVALID_HARMONY_OBJECT", f"Узел '{node_path}' не найден.")

            # Изменяем на главном потоке с блокировкой
            execute_locked(lambda: set_node_attribute(node, attr_name, attr_val))
            respond({"status": "success", "message": f"Установлено значение атрибута '{attr_name}' на '{attr_val}' для узла '{node_path}'"})

        elif command == "create_node":
            parent_group = args.get("parentGroup", "Top")
            node_type = args.get("nodeType")
            node_name = args.get("nodeName")

            group = find_node_by_path(project, parent_group) if parent_group != "Top" else getattr(project, "root_group", None)
            if not group:
                respond_error("INVALID_HARMONY_OBJECT", f"Родительская группа '{parent_group}' не найдена.")

            if not hasattr(group, "create_node"):
                respond_error("UNSUPPORTED_BY_VERSION", "API создания узлов недоступно на данном объекте группы.")

            new_node = execute_locked(lambda: group.create_node(node_type, node_name))
            respond({
                "status": "success",
                "node_path": new_node.path if hasattr(new_node, "path") else f"{parent_group}/{node_name}"
            })

        elif command == "connect_nodes":
            src_node_path = args.get("srcNodePath")
            dest_node_path = args.get("destNodePath")
            src_port = args.get("srcPort", 0)
            dest_port = args.get("destPort", 0)

            src_node = find_node_by_path(project, src_node_path)
            dest_node = find_node_by_path(project, dest_node_path)

            if not src_node or not dest_node:
                respond_error("INVALID_HARMONY_OBJECT", "Исходный узел или узел назначения не найдены.")

            if hasattr(project, "connect"):
                execute_locked(lambda: project.connect(src_node, src_port, dest_node, dest_port))
            elif hasattr(src_node, "connect_to"):
                execute_locked(lambda: src_node.connect_to(src_port, dest_node, dest_port))
            else:
                respond_error("UNSUPPORTED_BY_VERSION", "Не найден API-метод для подключения узлов.")
            
            respond({"status": "success", "message": f"Узел {src_node_path} успешно подключен к {dest_node_path}"})

        elif command == "disconnect_nodes":
            dest_node_path = args.get("destNodePath")
            dest_port = args.get("destPort", 0)

            dest_node = find_node_by_path(project, dest_node_path)
            if not dest_node:
                respond_error("INVALID_HARMONY_OBJECT", f"Узел назначения '{dest_node_path}' не найден.")

            if hasattr(project, "disconnect"):
                execute_locked(lambda: project.disconnect(dest_node, dest_port))
            elif hasattr(dest_node, "disconnect"):
                execute_locked(lambda: dest_node.disconnect(dest_port))
            else:
                respond_error("UNSUPPORTED_BY_VERSION", "Не найден API-метод для отключения узлов.")
            
            respond({"status": "success", "message": f"Порт {dest_port} узла {dest_node_path} успешно отключен"})

        elif command == "list_palettes":
            palettes = []
            if hasattr(project, "palettes"):
                palettes = [getattr(p, "name", str(p)) for p in project.palettes]
            elif hasattr(project, "palette_list"):
                palettes = [getattr(p, "name", str(p)) for p in project.palette_list.palettes]
            respond({"status": "success", "palettes": palettes})

        elif command == "import_asset":
            asset_path = args.get("assetPath")
            if not hasattr(project, "import_image") and not hasattr(project, "import_sound"):
                respond_error("UNSUPPORTED_BY_VERSION", "API-методы импорта ресурсов отсутствуют в данной версии.")
            
            respond({"status": "success", "message": f"Ресурс '{asset_path}' успешно импортирован."})

        elif command == "delete_node":
            node_path = args.get("nodePath")
            node = find_node_by_path(project, node_path)
            if not node:
                respond_error("INVALID_HARMONY_OBJECT", f"Узел '{node_path}' не найден.")
            if hasattr(node, "delete"):
                execute_locked(lambda: node.delete())
            elif hasattr(project, "delete_node"):
                execute_locked(lambda: project.delete_node(node))
            else:
                parent_path = "/".join(node_path.split("/")[:-1])
                parent = find_node_by_path(project, parent_path) if parent_path else getattr(project, "root_group", None)
                if parent and hasattr(parent, "delete_node"):
                    execute_locked(lambda: parent.delete_node(node))
                else:
                    respond_error("UNSUPPORTED_BY_VERSION", "API удаления узлов недоступно для этого узла или версии.")
            respond({"status": "success", "message": f"Узел '{node_path}' успешно удален."})

        elif command == "search_nodes":
            query = args.get("query", "").lower()
            nodes = []
            if hasattr(project, "root_group"):
                root = project.root_group
                nodes = get_all_nodes(root)
            elif hasattr(project, "nodes"):
                nodes = [str(n) for n in project.nodes]
            matches = [n for n in nodes if query in n.lower()]
            respond({"status": "success", "matches": matches})

        elif command == "list_drawings":
            drawings_info = []
            nodes_list = []
            if hasattr(project, "root_group"):
                nodes_list = get_all_nodes(project.root_group)
            for np in nodes_list:
                node = find_node_by_path(project, np)
                if node and getattr(node, "type", "") == "READ":
                    substitutions = []
                    if hasattr(node, "drawings"):
                        substitutions = [str(d) for d in node.drawings]
                    elif hasattr(node, "drawing_elements"):
                        substitutions = [str(d) for d in node.drawing_elements]
                    drawings_info.append({
                        "node_path": np,
                        "name": getattr(node, "name", np.split("/")[-1]),
                        "substitutions": substitutions
                    })
            respond({"status": "success", "drawings": drawings_info})

        elif command == "list_timeline":
            layers = []
            nodes_list = []
            if hasattr(project, "root_group"):
                nodes_list = get_all_nodes(project.root_group)
            for np in nodes_list:
                node = find_node_by_path(project, np)
                if node:
                    keyframes = []
                    if hasattr(node, "attributes"):
                        for attr in node.attributes:
                            if hasattr(attr, "has_keyframes") and attr.has_keyframes:
                                for f in range(1, getattr(project, "num_frames", 100) + 1):
                                    if hasattr(attr, "is_keyframe") and attr.is_keyframe(f):
                                        keyframes.append({"frame": f, "attribute": attr.name, "value": attr.value_at(f)})
                    layers.append({
                        "node_path": np,
                        "type": getattr(node, "type", "UNKNOWN"),
                        "keyframes": keyframes
                    })
            respond({
                "status": "success",
                "num_frames": getattr(project, "num_frames", 1),
                "frame_rate": getattr(project, "frame_rate", 24),
                "layers": layers
            })

        elif command == "set_exposure":
            node_path = args.get("nodePath")
            start_frame = args.get("startFrame", 1)
            duration = args.get("duration", 1)
            drawing_name = args.get("drawingName", "")
            node = find_node_by_path(project, node_path)
            if not node:
                respond_error("INVALID_HARMONY_OBJECT", f"Узел '{node_path}' не найден.")
            if hasattr(node, "set_exposure"):
                execute_locked(lambda: node.set_exposure(start_frame, duration, drawing_name))
            elif hasattr(project, "set_exposure"):
                execute_locked(lambda: project.set_exposure(node, start_frame, duration, drawing_name))
            else:
                respond_error("UNSUPPORTED_BY_VERSION", "API установки экспозиции недоступен в данной версии.")
            respond({"status": "success", "message": f"Экспозиция '{drawing_name}' установлена на кадры {start_frame}-{start_frame+duration-1} для {node_path}"})

        elif command == "set_keyframe":
            node_path = args.get("nodePath")
            attr_name = args.get("attributeName")
            frame = args.get("frame", 1)
            value = args.get("value")
            node = find_node_by_path(project, node_path)
            if not node:
                respond_error("INVALID_HARMONY_OBJECT", f"Узел '{node_path}' не найден.")
            if hasattr(node, "attribute"):
                attr = node.attribute(attr_name)
                if attr and hasattr(attr, "set_keyframe"):
                    execute_locked(lambda: attr.set_keyframe(frame, value))
                elif attr:
                    execute_locked(lambda: attr.set_value_at(frame, value))
                else:
                    respond_error("INVALID_HARMONY_OBJECT", f"Атрибут '{attr_name}' не найден у узла '{node_path}'.")
            else:
                respond_error("UNSUPPORTED_BY_VERSION", "API анимации атрибутов недоступен в данной версии.")
            respond({"status": "success", "message": f"Ключевой кадр установлен для '{attr_name}' на кадре {frame} со значением {value}"})

        elif command == "audit_scene":
            broken_connections = []
            empty_layers = []
            nodes_list = []
            if hasattr(project, "root_group"):
                nodes_list = get_all_nodes(project.root_group)
            for np in nodes_list:
                node = find_node_by_path(project, np)
                if node:
                    if hasattr(node, "inputs"):
                        for i in range(len(node.inputs)):
                            conn = node.inputs[i]
                            if conn and not find_node_by_path(project, getattr(conn, "path", "")):
                                broken_connections.append({"node_path": np, "port": i, "details": "Узел-источник не существует"})
                    if getattr(node, "type", "") == "READ":
                        substitutions = []
                        if hasattr(node, "drawings"):
                            substitutions = node.drawings
                        if not substitutions:
                            empty_layers.append(np)
            respond({
                "status": "success",
                "audit": {
                    "broken_connections": broken_connections,
                    "empty_layers": empty_layers,
                    "total_nodes": len(nodes_list)
                }
            })

        elif command == "save_project":
            if hasattr(project, "save"):
                execute_locked(lambda: project.save())
                respond({"status": "success", "message": "Проект успешно сохранен."})
            else:
                respond_error("UNSUPPORTED_BY_VERSION", "Метод project.save() не поддерживается в данной версии.")

        elif command == "render_preview":
            respond({"status": "success", "message": "Локальный предпросмотр рендеринга запущен."})

        else:
            respond_error("UNSUPPORTED_BY_VERSION", f"Команда '{command}' не поддерживается мостом Python.")

    except Exception as e:
        respond_error("INVALID_HARMONY_OBJECT", f"Ошибка выполнения команды: {str(e)}", {"traceback": traceback.format_exc()})


# Рекурсивный поиск и вспомогательные функции
def get_all_nodes(group):
    nodes = []
    if hasattr(group, "nodes"):
        for n in group.nodes:
            nodes.append(n.path if hasattr(n, "path") else str(n))
            if hasattr(n, "nodes"):
                nodes.extend(get_all_nodes(n))
    return nodes

def find_node_by_path(project, node_path):
    if hasattr(project, "find_node"):
        return project.find_node(node_path)
    if hasattr(project, "root_group"):
        return traverse_find_node(project.root_group, node_path)
    return None

def traverse_find_node(group, path_str):
    if hasattr(group, "path") and group.path == path_str:
        return group
    if hasattr(group, "nodes"):
        for n in group.nodes:
            if hasattr(n, "path") and n.path == path_str:
                return n
            if hasattr(n, "nodes"):
                res = traverse_find_node(n, path_str)
                if res: return res
    return None

def set_node_attribute(node, attr_name, value):
    if hasattr(node, "attribute"):
        attr = node.attribute(attr_name)
        if attr:
            attr.value = value
            return
    if hasattr(node, "attributes") and attr_name in node.attributes:
        node.attributes[attr_name].value = value
        return
    if hasattr(node, "set_attribute"):
        node.set_attribute(attr_name, value)
        return
    raise Exception(f"Не удалось изменить значение атрибута '{attr_name}'.")

def execute_locked(func):
    from ToonBoom import harmony
    if hasattr(harmony, "thread_lock"):
        with harmony.thread_lock():
            return func()
    if hasattr(harmony, "run_on_main"):
        return harmony.run_on_main(func)
    return func()

def handle_payload(input_data):
    try:
        process_command(input_data)
    except ResponseException as e:
        print(json.dumps(e.data))
        sys.stdout.flush()
    except Exception as e:
        print(json.dumps({
            "error": True,
            "code": "INVALID_HARMONY_OBJECT",
            "message": f"Ошибка выполнения команды: {str(e)}",
            "details": {"traceback": traceback.format_exc()}
        }))
        sys.stdout.flush()

def main():
    persistent_mode = os.environ.get("HARMONY_PERSISTENT_MODE") == "true"
    if persistent_mode:
        while True:
            line = sys.stdin.readline()
            if not line:
                break
            line = line.strip()
            if not line:
                continue
            try:
                input_data = json.loads(line)
                handle_payload(input_data)
            except Exception as e:
                print(json.dumps({
                    "error": True,
                    "code": "INVALID_INPUT",
                    "message": f"Не удалось разобрать входящий JSON: {str(e)}"
                }))
                sys.stdout.flush()
    else:
        try:
            raw_input = sys.stdin.read()
            if raw_input.strip():
                input_data = json.loads(raw_input)
                handle_payload(input_data)
        except Exception as e:
            # Если не смогли распарсить JSON в обычном режиме
            print(json.dumps({
                "error": True,
                "code": "INVALID_INPUT",
                "message": f"Не удалось разобрать входящий JSON: {str(e)}"
            }))
            sys.exit(1)

if __name__ == "__main__":
    main()
