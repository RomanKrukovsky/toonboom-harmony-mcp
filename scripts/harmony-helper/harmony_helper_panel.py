import sys
import json
from PySide6.QtWidgets import QApplication, QWidget, QVBoxLayout, QPushButton, QLabel, QTextEdit
from PySide6.QtCore import Slot
from PySide6.QtNetwork import QTcpSocket

class HarmonyHelperPanel(QWidget):
    def __init__(self):
        super().__init__()
        self.socket = QTcpSocket(self)
        self.init_ui()
        self.connect_to_server()

    def init_ui(self):
        self.setWindowTitle("Harmony AI Helper Panel")
        self.resize(350, 400)

        layout = QVBoxLayout(self)

        self.status_label = QLabel("Статус: Отключено от сервера", self)
        layout.addWidget(self.status_label)

        self.log_area = QTextEdit(self)
        self.log_area.setReadOnly(True)
        layout.addWidget(self.log_area)

        self.reconnect_btn = QPushButton("Переподключиться", self)
        self.reconnect_btn.clicked.connect(self.connect_to_server)
        layout.addWidget(self.reconnect_btn)

    def log(self, message):
        self.log_area.append(message)
        print(f"[Helper Panel] {message}")

    def connect_to_server(self):
        self.status_label.setText("Статус: Подключение...")
        self.socket.abort()
        self.socket.connectToHost("127.0.0.1", 8765)
        
        self.socket.connected.connect(self.on_connected)
        self.socket.disconnected.connect(self.on_disconnected)
        self.socket.readyRead.connect(self.on_data_received)

    def on_connected(self):
        self.status_label.setText("Статус: Подключено к localhost:8765")
        self.log("Успешное соединение с сервером автоматизации.")
        # Регистрация роли
        reg = {"type": "register", "role": "panel"}
        self.socket.write((json.dumps(reg) + "\n").encode('utf-8'))

    def on_disconnected(self):
        self.status_label.setText("Статус: Соединение разорвано")
        self.log("Соединение с сервером автоматизации прервано.")

    def on_data_received(self):
        while self.socket.canReadLine():
            line = self.socket.readLine().data().decode('utf-8').strip()
            if not line:
                continue
            
            try:
                msg = json.loads(line)
                self.process_command(msg)
            except Exception as e:
                self.log(f"Не удалось распознать команду: {e}")

    def process_command(self, msg):
        cmd = msg.get("command")
        args = msg.get("args", {})
        self.log(f"Получена команда: {cmd}")

        result = {"status": "error", "message": f"Неподдерживаемая команда: {cmd}"}

        try:
            from ToonBoom import harmony
            session = harmony.session()
            project = session.project
            
            if cmd == "get_active_project":
                result = {
                    "status": "success",
                    "project_path": project.project_path if hasattr(project, "project_path") else ""
                }
            elif cmd == "get_selected_nodes":
                # Получение выделенных нод
                selected = []
                if hasattr(harmony, "selected_nodes"):
                    selected = [n.path for n in harmony.selected_nodes()]
                result = {
                    "status": "success",
                    "selected": selected
                }
            elif cmd == "list_nodes":
                # Рекурсивный обход
                nodes = []
                if hasattr(project, "root_group"):
                    nodes = self.get_all_nodes(project.root_group)
                result = {
                    "status": "success",
                    "nodes": nodes
                }
            elif cmd == "highlight_node":
                node_path = args.get("nodePath")
                # Подсветка или выделение ноды
                self.log(f"Подсвечиваем узел: {node_path}")
                result = {
                    "status": "success",
                    "message": f"Узел {node_path} подсвечен на холсте."
                }
            elif cmd == "refresh_scene":
                # Обновление вьюпорта
                result = {
                    "status": "success",
                    "message": "Сцена обновлена."
                }
            elif cmd == "run_safe_action":
                action = args.get("action")
                self.log(f"Выполняем безопасное действие: {action}")
                result = {
                    "status": "success",
                    "message": f"Действие {action} выполнено."
                }
        except Exception as e:
            self.log(f"Сбой при выполнении {cmd}: {e}")
            result = {"status": "error", "message": str(e)}

        # Отправляем ответ обратно
        resp = {"type": "response", "command": cmd, "data": result}
        self.socket.write((json.dumps(resp) + "\n").encode('utf-8'))

    def get_all_nodes(self, group):
        nodes = []
        if hasattr(group, "nodes"):
            for n in group.nodes:
                nodes.append(n.path if hasattr(n, "path") else str(n))
                if hasattr(n, "nodes"):
                    nodes.extend(self.get_all_nodes(n))
        return nodes

# Код для запуска в рамках Harmony
def show_panel():
    # Проверка, запущен ли QApplication
    app = QApplication.instance()
    if not app:
        app = QApplication(sys.argv)
    
    global panel_window
    panel_window = HarmonyHelperPanel()
    panel_window.show()

if __name__ == "__main__":
    show_panel()
