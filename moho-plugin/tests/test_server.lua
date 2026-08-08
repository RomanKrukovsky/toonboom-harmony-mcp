-- test_server.lua
-- Tests for moho_mcp/server.lua. Focus: the filename-suffix helper and IPC
-- directory resolution, both of which previously failed silently at runtime.

local server = require("server")

-- server.lua holds protocol/validator/json as upvalues set by init(). The real
-- plugin does this in MohoMCP_Server.lua:loadModules(); mirror it here or
-- writeHealthFile() dereferences a nil json.
server.init({
    protocol  = require("protocol"),
    validator = require("validator"),
    json      = json,
})

-------------------------------------------------------------------------------
-- Regression: string:endsWith did not exist.
--
-- server.lua called fname:endsWith(".tmp") in cleanupStaleFiles() and poll().
-- Lua 5.4 has no string.endsWith, and Moho adds none, so the call raised
-- "attempt to call a nil value (method 'endsWith')". cleanupStaleFiles() runs
-- first in poll(), so every poll aborted before reading a single request: the
-- plugin looked alive but answered nothing. Guard the behaviour it needs.
-------------------------------------------------------------------------------

test("regression: string.endsWith is genuinely absent in this Lua", function()
    -- If a future Lua/Moho adds it, we want to know rather than assume.
    assert_true(("x"):len() == 1, "sanity")
    assert_eq(string.endsWith, nil,
        "string.endsWith unexpectedly exists - revisit hasSuffix in server.lua")
end)

test("regression: server.lua no longer calls the endsWith method", function()
    local f = assert(io.open(PLUGIN_DIR .. "moho_mcp/server.lua", "r"))
    local body = f:read("*a")
    f:close()
    -- Strip comment lines first: the fix's own comment mentions the old call.
    local code = {}
    for line in body:gmatch("[^\n]*") do
        if not line:match("^%s*%-%-") then code[#code + 1] = line end
    end
    local codeOnly = table.concat(code, "\n")
    assert_false(codeOnly:find(":endsWith", 1, true),
        "server.lua executable code must not call the non-existent :endsWith")
    assert_true(codeOnly:find("hasSuffix", 1, true) ~= nil,
        "server.lua should use the local hasSuffix helper instead")
end)

test("regression: poll() survives a directory containing health.json", function()
    -- health.json is always present in a live spool dir and is neither req_ nor
    -- resp_, so it hit the exact branch that used :endsWith. poll() on a
    -- stopped server must simply no-op rather than raise.
    local ok, err = pcall(server.poll, nil)
    assert_true(ok, "poll on stopped server raised: " .. tostring(err))
end)

-------------------------------------------------------------------------------
-- IPC directory resolution
-------------------------------------------------------------------------------

test("server exposes lifecycle API", function()
    assert_eq(type(server.start), "function")
    assert_eq(type(server.stop), "function")
    assert_eq(type(server.poll), "function")
    assert_eq(type(server.isRunning), "function")
    assert_eq(type(server.getInfo), "function")
    assert_eq(type(server.registerHandler), "function")
    assert_eq(type(server.getHandler), "function")
end)

test("server starts in a not-running state", function()
    assert_false(server.isRunning())
end)

test("registerHandler / getHandler round-trip", function()
    local sentinel = function() return { ok = true } end
    server.registerHandler("document.getInfo", sentinel)
    assert_eq(server.getHandler("document.getInfo"), sentinel)
end)

test("getHandler returns nil for unregistered method", function()
    assert_eq(server.getHandler("nope.nothing"), nil)
end)

test("getInfo reports the wire protocol version", function()
    local info = server.getInfo()
    assert_eq(type(info), "table")
    -- Must agree with the bridge's CURRENT in src/moho/protocol-version.ts.
    assert_eq(info.protocolVersion, "1.1.0")
end)

-------------------------------------------------------------------------------
-- Regression: IPC dir was probed before it was created.
--
-- resolveIpcDirWithFallback() wrote a .mcp_test probe file to decide whether a
-- candidate directory was usable, but io.open(path,"w") does not create missing
-- parents. A configured-but-not-yet-existing spool (MOHO_MCP_IPC_DIR=/tmp/moho-mcp
-- on a fresh boot) therefore looked unwritable and was silently demoted to a
-- fallback the bridge never reads.
-------------------------------------------------------------------------------

test("regression: server.lua creates the IPC dir before probing it", function()
    local f = assert(io.open(PLUGIN_DIR .. "moho_mcp/server.lua", "r"))
    local body = f:read("*a")
    f:close()
    local block = body:match("function resolveIpcDirWithFallback%(%)(.-)\nend")
    assert_true(block ~= nil, "resolveIpcDirWithFallback not found")
    local mkdirAt = block:find("mkdirp(candidate)", 1, true)
    local probeAt = block:find(".mcp_test", 1, true)
    assert_true(mkdirAt ~= nil, "must mkdirp(candidate) before probing")
    assert_true(probeAt ~= nil, "probe write not found")
    assert_true(mkdirAt < probeAt, "mkdirp must come BEFORE the probe write")
end)

test("start() resolves a writable IPC dir, creating it if absent", function()
    -- Exercises the real bug: the spool directory does not exist yet, exactly
    -- like MOHO_MCP_IPC_DIR=/tmp/moho-mcp on a fresh boot. Pre-fix, the probe
    -- write failed and this candidate was silently skipped.
    local ok = server.start()
    assert_true(ok, "server.start() failed")

    local info = server.getInfo()
    assert_true(info.ipcDir ~= nil and info.ipcDir ~= "", "ipcDir must be set")
    assert_true(server.isRunning())

    -- The resolved directory must genuinely be writable now.
    local probe = info.ipcDir .. ".mcp_selftest"
    local fh = io.open(probe, "w")
    assert_true(fh ~= nil, "resolved ipcDir is not writable: " .. tostring(info.ipcDir))
    if fh then fh:close(); os.remove(probe) end

    -- health.json is written on start; its presence is what the bridge polls.
    local health = io.open(info.ipcDir .. "health.json", "r")
    assert_true(health ~= nil, "health.json must exist after start()")
    if health then health:close() end

    server.stop()
    assert_false(server.isRunning())
end)
