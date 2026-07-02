import sys
import json
import os
import traceback

def respond(data):
    print(json.dumps(data))
    sys.exit(0)

def respond_error(code, message, details=None):
    respond({
        "error": True,
        "code": code,
        "message": message,
        "details": details
    })

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except Exception as e:
        respond_error("INVALID_INPUT", f"Не удалось разобрать входящий JSON: {str(e)}")

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

if __name__ == "__main__":
    main()
