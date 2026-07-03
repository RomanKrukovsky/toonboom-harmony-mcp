import asyncio
import json
import sys

HOST = "127.0.0.1"
PORT = 8765

# Хранилище подключенных клиентов
# Мы ожидаем подключения от панели (harmony_panel) и от MCP-сервера (mcp_client)
clients = {
    "panel": None,
    "mcp": []
}

async def handle_client(reader, writer):
    addr = writer.get_extra_info('peername')
    print(f"Новое подключение от {addr}")
    client_type = None

    try:
        while True:
            data = await reader.readline()
            if not data:
                break
            
            try:
                message = json.loads(data.decode('utf-8').strip())
            except Exception as e:
                print(f"Ошибка декодирования JSON: {e}")
                continue

            # Идентификация подключения
            msg_type = message.get("type")
            if msg_type == "register":
                role = message.get("role")
                if role == "panel":
                    clients["panel"] = writer
                    client_type = "panel"
                    print("Панель Harmony успешно зарегистрирована.")
                    writer.write(json.dumps({"status": "registered"}) .encode('utf-8') + b'\n')
                    await writer.drain()
                elif role == "mcp":
                    clients["mcp"].append(writer)
                    client_type = "mcp"
                    print("MCP-клиент успешно зарегистрирован.")
                continue

            # Пересылка команд
            if client_type == "mcp" and clients["panel"]:
                # MCP присылает команду -> шлем панели
                clients["panel"].write(data)
                await clients["panel"].drain()
            elif client_type == "panel":
                # Панель возвращает ответ -> шлем всем MCP-клиентам
                for mcp_writer in clients["mcp"]:
                    try:
                        mcp_writer.write(data)
                        await mcp_writer.drain()
                    except Exception:
                        pass

    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"Ошибка в сессии клиента {addr}: {e}")
    finally:
        print(f"Соединение закрыто для {addr}")
        if client_type == "panel":
            clients["panel"] = None
        elif client_type == "mcp" and writer in clients["mcp"]:
            clients["mcp"].remove(writer)
        writer.close()
        await writer.wait_closed()

async def main():
    server = await asyncio.start_server(handle_client, HOST, PORT)
    print(f"Вспомогательный сервер Harmony запущен на {HOST}:{PORT}")
    async with server:
        await server.serve_forever()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nСервер остановлен.")
        sys.exit(0)
