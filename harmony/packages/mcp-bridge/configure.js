/* ============================================================================
 * configure.js — Harmony scripting package
 *
 * Положить в:
 *   Win  %APPDATA%\Toon Boom Animation\<app>\<ver>-scripts\packages\mcp-bridge\
 *   mac  ~/Library/Preferences/Toon Boom Animation/<app>/<ver>-scripts/packages/mcp-bridge/
 *   lin  ~/Toon Boom Animation/<app>/<ver>-scripts/packages/mcp-bridge/
 *
 * Рядом: bridge.js
 *
 * Мост стартует РАЗОРУЖЁННЫМ. Обслуживаются только ping/status/capabilities,
 * пока художник (или скрипт запуска) не нажмёт «Arm». Это единственный барьер
 * между localhost и произвольным исполнением кода в чужой сцене.
 * ==========================================================================*/

function configure(packageFolder, packageName) {
    try {
        include(packageFolder + "/bridge.js");
    } catch (e) {
        MessageLog.trace("[mcpb] failed to include bridge.js: " + e);
        return;
    }

    /* Пакеты операций. Каждый — независимый файл, регистрирующийся через
       MCPB.registerOp. Падение одного не должно уносить мост: без columns.js
       ping/eval/render продолжают работать, и это видно в capabilities. */
    var packs = ["columns.js", "drawings.js", "nodes.js", "palettes.js"], i;
    for (i = 0; i < packs.length; i++) {
        try { include(packageFolder + "/" + packs[i]); }
        catch (e2) { MessageLog.trace("[mcpb] op pack failed: " + packs[i] + " :: " + e2); }
    }

    try {
        MCPB.install({
            /* spool: "/path/to/shared/spool",   // по умолчанию specialFolders.temp + "/mcp-harmony" */
            poll_ms: 40,
            audit: true
        });
    } catch (e) {
        MessageLog.trace("[mcpb] install failed: " + e);
        return;
    }

    /* Пункт меню. Сигнатура ScriptManager плавает между версиями — под try. */
    try {
        ScriptManager.addMenuItem({
            targetMenuId: "Windows",
            id:           "mcpbToggle",
            text:         "MCP Bridge: Arm / Disarm",
            action:       "toggleMcpBridge in ./configure.js"
        });
    } catch (e) {
        MessageLog.trace("[mcpb] menu item unavailable on this version: " + e);
    }
}

/* Также вызывается из кнопки Scripts-тулбара, если положить рядом
   MCP_Toggle.js c одноимённой функцией и иконку в script-icons/. */
function toggleMcpBridge() {
    if (typeof MCPB === "undefined" || !MCPB.toggle) {
        MessageBox.information("MCP bridge is not loaded.");
        return;
    }
    MCPB.toggle();
    MessageBox.information("MCP bridge is now " + (MCPB.armed ? "ARMED" : "DISARMED") +
                           "\nspool: " + MCPB.cfg.spool);
}

exports.configure       = configure;
exports.toggleMcpBridge = toggleMcpBridge;
