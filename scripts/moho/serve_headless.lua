-- serve_headless.lua — запуск моста Moho БЕЗ ручного нажатия в меню.
--
-- ЗАЧЕМ. Плагин MohoMCP штатно поднимается из интерфейса: Scripts -> MohoMCP
-- Server либо выбор инструмента MohoMCP Poller. Это требует человека у
-- клавиатуры, и на macOS нажать за него нельзя — синтетические клики
-- блокируются без разрешения Accessibility.
--
-- Moho умеет другое: принять .lua файл аргументом командной строки и вызвать
-- в нём MohoScript(moho). Управление приходит сразу, без интерфейса.
--
--   /Applications/Moho.app/Contents/MacOS/Moho scripts/moho/serve_headless.lua
--
-- Проверено на живом приложении: тул moho.document.get_info вернул реальные
-- данные документа (1280x720, 24 fps, 240 кадров).
--
-- ТРИ ГРАБЛИ, каждая ломала связь молча:
--
--  1. json обязан быть ГЛОБАЛЬНЫМ. protocol.lua ждёт global json (так же
--     делает MohoMCP_Server.lua:94). Без этого poll падает на json.decode, а
--     наружу это выглядит как таймаут без причины.
--
--  2. srv.start() удаляет ВСЕ req-файлы как остатки прошлой сессии. Запрос,
--     положенный до старта, будет стёрт. Порядок обязателен: сначала плагин,
--     потом вызов.
--
--  3. Без открытого документа тулы честно отвечают "No active document".
--     Это уже живой ответ, но данных не даёт, поэтому здесь FileNew().
--     Если нужен свой файл — передайте его первым аргументом Moho.
--
function MohoScript(moho)
    local f = io.open("/tmp/live_serve.txt", "w")
    local function w(s) f:write(tostring(s).."\n"); f:flush() end
    local base = os.getenv("HOME") .. "/Library/Application Support/Moho/scripts/menu/MohoMCP/"
    package.path = base .. "?.lua;" .. base .. "?/init.lua;" .. package.path
    -- Настоящий загрузчик ставит json ГЛОБАЛЬНО (MohoMCP_Server.lua:94):
    -- protocol.lua ждёт global json, иначе poll падает на json.decode.
    _G.json = require("json")
    local srv = require("moho_mcp.server")
    srv.init({ protocol = require("moho_mcp.protocol"),
               validator = require("moho_mcp.validator"),
               json = require("json") })
    -- Регистрируем все обработчики документа
    local doc = require("moho_mcp.tools.document")
    for _, m in ipairs({"getInfo","getLayers","setFrame","diagnose"}) do
        if doc[m] then srv.registerHandler("document."..m, doc[m]) end
    end
    -- Создаём документ: без него document.getInfo честно отвечает
    -- "No active document" — это уже был живой ответ, но данных не даёт.
    pcall(function() moho:FileNew() end)
    w("doc created")
    local ok, res = pcall(srv.start)
    w("start="..tostring(res))
    -- Крутим опрос 55 секунд, чтобы точно перекрыть внешний вызов
    for i = 1, 550 do
        local pok, perr = pcall(srv.poll, moho)
        if not pok then w("poll error: "..tostring(perr)); break end
        os.execute("sleep 0.1")
    end
    w("polling finished")
    f:close()
    moho:Quit()
end
