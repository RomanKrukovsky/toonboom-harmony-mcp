-- server.lua
-- File-based IPC server for MohoMCP. Runs inside MOHO's Lua 5.4 environment.
-- Uses a shared directory for request/response JSON files instead of TCP sockets.
-- Designed to be polled from MOHO's Run callback to avoid UI freezes.

local server = {}

-- Dependencies (set by init)
local protocol = nil
local validator = nil
local json = nil

-- Server state
local isRunning = false
local ipcDir = ""
local deadLetterDir = ""
local lastProcessedSeq = 0
local processedSequences = {}
local lastHealthWrite = 0
local persistenceFile = ""

-- Tool handler registry: method name -> function(moho, params) -> result, err
local handlers = {}

-- Platform detection
local SEP = package.config:sub(1, 1)

-- Configuration constants
local MAX_JSON_SIZE = 10 * 1024 * 1024
local REQUEST_TTL_MS = 30 * 1000
local MAX_DEAD_LETTERS = 100
local HEALTH_WRITE_INTERVAL_MS = 5 * 1000
local PERSIST_INTERVAL = 100
local PROCESSED_SEQUENCES_LIMIT = 10000
local PROCESSED_SEQUENCES_TRIM_TO = 5000

-- ----------------------------------------------------------------------------
-- Lifecycle
-- ----------------------------------------------------------------------------

--- Initialize the server module with its dependencies.
function server.init(deps)
    protocol = deps.protocol
    validator = deps.validator
    json = deps.json
end

--- Register a tool handler for a given method name.
function server.registerHandler(method, handler)
    handlers[method] = handler
end

--- Look up a registered handler by method name.
function server.getHandler(method)
    return handlers[method]
end

-- ----------------------------------------------------------------------------
-- Filesystem helpers (no shell invocation — pure Lua I/O for atomicity)
-- ----------------------------------------------------------------------------

local function listDir(dirPath)
    local out = {}
    local fd = io.popen(string.format(
        SEP == "\\" and 'cmd.exe /c dir /b "%s" 2>NUL' or '/bin/ls -1 "%s" 2>/dev/null',
        dirPath
    ))
    if not fd then return out end
    for line in fd:lines() do
        out[#out + 1] = line
    end
    fd:close()
    return out
end

-- Path-safety gate: no shell metacharacters.
local function isSafePath(p)
    return type(p) == "string" and p:match("^[%w%_%-%./\\: ]+$") ~= nil
end

local function mkdirp(dirPath)
    if not isSafePath(dirPath) then return end
    local cleanPath = dirPath:gsub("[/\\]+$", "")
    local cmd
    if SEP == "\\" then
        cmd = 'cmd.exe /c mkdir "' .. cleanPath .. '" 2>NUL'
    else
        cmd = '/bin/mkdir -p "' .. cleanPath .. '" 2>/dev/null'
    end
    local fd = io.popen(cmd)
    if fd then fd:close() end
end

local function fileExists(path)
    if not isSafePath(path) then return false end
    local f = io.open(path, "r")
    if not f then return false end
    f:close()
    return true
end

--- Atomic file write: write to .tmp, fsync via close(), then rename.
-- On any error, unlink the partial .tmp. Returns (ok, errMsg).
local function writeFile(path, content)
    if not isSafePath(path) then
        return false, "unsafe path"
    end
    local tmpPath = path .. ".tmp"
    local f, err = io.open(tmpPath, "w")
    if not f then
        return false, "open tmp failed: " .. tostring(err)
    end
    f:write(content)
    f:close()
    -- io.rename in Lua 5.4 is atomic on POSIX, near-atomic on Windows.
    local ok, renameErr = os.rename(tmpPath, path)
    if not ok then
        os.remove(tmpPath)
        return false, "rename failed: " .. tostring(renameErr)
    end
    return true, nil
end

local function readFile(path)
    if not isSafePath(path) then return nil, "unsafe path" end
    local f, err = io.open(path, "r")
    if not f then return nil, err end
    local content = f:read("*a")
    f:close()
    return content, nil
end

local function unlinkSafe(path)
    if isSafePath(path) then os.remove(path) end
end

local function getFileModTime(path)
    if not isSafePath(path) then return nil end
    local cmd
    if SEP == "\\" then
        cmd = 'cmd.exe /c for %I in ("' .. path .. '") do @echo %~tI 2>NUL'
    else
        cmd = 'stat -f "%m" "' .. path .. '" 2>/dev/null || stat -c "%Y" "' .. path .. '" 2>/dev/null'
    end
    local fd = io.popen(cmd)
    if not fd then return nil end
    local result = fd:read("*a")
    fd:close()
    result = result:match("^%s*(.-)%s*$")
    return tonumber(result)
end

-- Lua has no string:endsWith. Moho's Lua 5.4 provides no such extension either,
-- so calling fname:endsWith(...) raises "attempt to call a nil value" and — because
-- cleanupStaleFiles() runs first in poll() — kills the whole poll before any
-- request is read. Plain-text suffix match, no pattern escaping needed.
local function hasSuffix(s, suffix)
    if type(s) ~= "string" or type(suffix) ~= "string" then return false end
    return #s >= #suffix and s:sub(-#suffix) == suffix
end

local function parseSeqFromFilename(fname)
    local seq = fname:match("^req_(%d+)%.json$") or fname:match("^resp_(%d+)%.json$")
    if seq then return tonumber(seq) end
    return nil
end

-- ----------------------------------------------------------------------------
-- Persistence
-- ----------------------------------------------------------------------------

local function persistState()
    if persistenceFile == "" then return end
    local data = {
        lastProcessedSeq = lastProcessedSeq,
        processedSequences = processedSequences,
        savedAt = os.date("!%Y-%m-%dT%H:%M:%SZ"),
    }
    local content = json.encode(data)
    writeFile(persistenceFile, content)
end

local function loadState()
    if persistenceFile == "" or not fileExists(persistenceFile) then return end
    local content = readFile(persistenceFile)
    if not content then return end
    local ok, data = pcall(json.decode, content)
    if not ok or type(data) ~= "table" then return end
    if type(data.lastProcessedSeq) == "number" then
        lastProcessedSeq = data.lastProcessedSeq
    end
    if type(data.processedSequences) == "table" then
        processedSequences = data.processedSequences
    end
end

-- ----------------------------------------------------------------------------
-- Health and dead-letter management
-- ----------------------------------------------------------------------------

local function writeHealthFile()
    if ipcDir == "" then return end
    local health = {
        running = isRunning,
        pid = "moho",
        version = "0.2.0",
        protocolVersion = protocol and protocol.WIRE_PROTOCOL_VERSION or "1.1.0",
        lastPollTimestamp = os.date("!%Y-%m-%dT%H:%M:%SZ"),
        lastProcessedSequence = lastProcessedSeq,
        queueDepth = 0,
        errorCount = 0,
        uptimeSeconds = math.floor(os.clock()),
    }
    local content = json.encode(health)
    writeFile(ipcDir .. "health.json", content)
end

local function quarantineFile(srcPath, fname, reason)
    if not fileExists(srcPath) then return end
    mkdirp(deadLetterDir)
    local timestamp = os.date("!%Y%m%d_%H%M%S")
    local destName = timestamp .. "_" .. fname
    local destPath = deadLetterDir .. destName
    os.rename(srcPath, destPath)

    local metaPath = destPath .. ".meta"
    local meta = {
        originalName = fname,
        quarantinedAt = os.date("!%Y-%m-%dT%H:%M:%SZ"),
        reason = reason,
        fileSize = 0,
    }
    if fileExists(destPath) then
        local f = io.open(destPath, "r")
        if f then
            f:seek("end")
            meta.fileSize = f:seek("end")
            f:close()
        end
    end
    writeFile(metaPath, json.encode(meta))

    -- Enforce max dead letters: prune oldest non-meta first
    local files = listDir(deadLetterDir)
    local metaFiles = {}
    for _, f in ipairs(files) do
        if f:match("%.meta$") then
            metaFiles[#metaFiles + 1] = f
        end
    end
    if #metaFiles > MAX_DEAD_LETTERS then
        table.sort(metaFiles)
        for i = 1, #metaFiles - MAX_DEAD_LETTERS do
            local oldMeta = metaFiles[i]
            local base = oldMeta:gsub("%.meta$", "")
            unlinkSafe(deadLetterDir .. oldMeta)
            unlinkSafe(deadLetterDir .. base)
        end
    end
end

-- ----------------------------------------------------------------------------
-- IPC directory resolution
-- ----------------------------------------------------------------------------

local function getIpcDir()
    local override = os.getenv("MOHO_IPC_DIR") or os.getenv("MOHO_MCP_IPC_DIR")
    if override and override ~= "" then
        if not override:match("[/\\]$") then
            override = override .. SEP
        end
        return override
    end

    local home = os.getenv("HOME") or os.getenv("USERPROFILE") or ""
    if SEP == "/" then
        if home ~= "" then
            return home .. "/Library/Application Support/MohoMCP/ipc/"
        end
    else
        local localAppData = os.getenv("LOCALAPPDATA")
        if localAppData and localAppData ~= "" then
            return localAppData .. "\\MohoMCP\\ipc\\"
        elseif home ~= "" then
            return home .. "\\AppData\\Local\\MohoMCP\\ipc\\"
        end
    end

    local tmp = os.getenv("TEMP") or os.getenv("TMP") or os.getenv("TMPDIR") or "/tmp"
    return tmp .. SEP .. "moho-mcp" .. SEP
end

local function resolveIpcDirWithFallback()
    local candidates = { getIpcDir() }
    local home = os.getenv("HOME") or os.getenv("USERPROFILE") or ""
    if home ~= "" then
        table.insert(candidates, home .. SEP .. ".moho_mcp" .. SEP .. "ipc" .. SEP)
    end
    local tmp = os.getenv("TEMP") or os.getenv("TMP") or os.getenv("TMPDIR") or "/tmp"
    table.insert(candidates, tmp .. SEP .. "moho-mcp" .. SEP)

    for _, candidate in ipairs(candidates) do
        -- Create the directory BEFORE probing it. io.open("w") does not create
        -- missing parent directories, so probing first made a valid-but-absent
        -- directory look unwritable. That silently demoted the configured spool
        -- (e.g. MOHO_MCP_IPC_DIR=/tmp/moho-mcp on a fresh boot) to a fallback the
        -- bridge never reads, and requests went nowhere.
        mkdirp(candidate)
        local testPath = candidate .. ".mcp_test"
        local ok = writeFile(testPath, "ok")
        if ok then
            os.remove(testPath)
            return candidate
        end
    end
    return nil, "Cannot write to any IPC directory candidate"
end

-- ----------------------------------------------------------------------------
-- Request processing
-- ----------------------------------------------------------------------------

local function processRequest(requestStr, moho)
    local request, parseErr = protocol.parseRequest(requestStr)
    if not request then
        return protocol.createError(nil, protocol.PARSE_ERROR, parseErr or "Parse error")
    end

    local method = request.method
    local params = request.params or {}
    local id = request.id
    local correlationId = request.correlationId

    if not validator.isAllowed(method) then
        return protocol.createError(id, protocol.METHOD_NOT_FOUND,
            "Method not found: " .. tostring(method), nil, correlationId)
    end

    local valid, validErr = validator.validateParams(method, params)
    if not valid then
        return protocol.createError(id, protocol.INVALID_PARAMS,
            validErr or "Invalid parameters", nil, correlationId)
    end

    local handler = handlers[method]
    if not handler then
        return protocol.createError(id, protocol.METHOD_NOT_FOUND,
            "No handler registered for: " .. tostring(method), nil, correlationId)
    end

    local ok, result, handlerErr = pcall(handler, moho, params)
    if not ok then
        return protocol.createError(id, protocol.INTERNAL_ERROR,
            "Handler error: " .. tostring(result), nil, correlationId)
    end

    if result == nil and handlerErr then
        return protocol.createError(id, protocol.MOHO_ERROR,
            handlerErr, nil, correlationId)
    end

    return protocol.createResponse(id, result, correlationId)
end

local function cleanupStaleFiles()
    if ipcDir == "" then return end
    local now = os.time()
    local files = listDir(ipcDir)
    for _, fname in ipairs(files) do
        local path = ipcDir .. fname
        local seq = parseSeqFromFilename(fname)
        local isReqResp = seq and (fname:match("^req_") or fname:match("^resp_"))
        if isReqResp then
            if processedSequences[seq] then
                unlinkSafe(path)
            else
                local mtime = getFileModTime(path)
                if mtime and (now - mtime) * 1000 > REQUEST_TTL_MS then
                    quarantineFile(path, fname, "expired_ttl")
                end
            end
        elseif hasSuffix(fname, ".tmp") then
            local mtime = getFileModTime(path)
            if mtime and (now - mtime) * 1000 > REQUEST_TTL_MS then
                unlinkSafe(path)
            end
        end
    end
end

local function trimProcessedSequences()
    local count = 0
    for _ in pairs(processedSequences) do count = count + 1 end
    if count <= PROCESSED_SEQUENCES_LIMIT then return end
    local keys = {}
    for k in pairs(processedSequences) do keys[#keys + 1] = k end
    table.sort(keys)
    for i = 1, #keys - PROCESSED_SEQUENCES_TRIM_TO do
        processedSequences[keys[i]] = nil
    end
end

-- ----------------------------------------------------------------------------
-- Public lifecycle
-- ----------------------------------------------------------------------------

function server.start()
    if isRunning then return true end

    local resolved, err = resolveIpcDirWithFallback()
    if not resolved then
        return false, err
    end
    ipcDir = resolved
    deadLetterDir = ipcDir .. "dead_letter" .. SEP
    persistenceFile = ipcDir .. "cursor.json"

    mkdirp(ipcDir)
    mkdirp(deadLetterDir)

    loadState()
    writeHealthFile()

    -- Clean any leftover request/response files from previous sessions
    for _, fname in ipairs(listDir(ipcDir)) do
        if fname:match("^req_") or fname:match("^resp_") then
            unlinkSafe(ipcDir .. fname)
        end
    end

    isRunning = true
    print("[MohoMCP] Server started. IPC directory: " .. ipcDir)
    return true
end

function server.stop()
    if not isRunning then return end
    persistState()
    unlinkSafe(ipcDir .. "status.json")
    unlinkSafe(ipcDir .. "health.json")
    for _, fname in ipairs(listDir(ipcDir)) do
        if fname:match("^req_") or fname:match("^resp_") then
            unlinkSafe(ipcDir .. fname)
        end
    end
    isRunning = false
    print("[MohoMCP] Server stopped")
end

function server.isRunning() return isRunning end
function server.getIpcDir() return ipcDir end

function server.getInfo()
    return {
        running = isRunning,
        ipcDir = ipcDir,
        deadLetterDir = deadLetterDir,
        lastProcessedSequence = lastProcessedSeq,
        protocolVersion = protocol and protocol.WIRE_PROTOCOL_VERSION or "1.1.0",
    }
end

-- Main poll loop: process pending requests in sequence order.
function server.poll(moho)
    if not isRunning then return end

    local now = os.clock() * 1000
    if now - lastHealthWrite > HEALTH_WRITE_INTERVAL_MS then
        writeHealthFile()
        lastHealthWrite = now
    end

    cleanupStaleFiles()

    local files = listDir(ipcDir)
    local requestFiles = {}
    for _, fname in ipairs(files) do
        local seq = parseSeqFromFilename(fname)
        if seq and fname:match("^req_") and not hasSuffix(fname, ".tmp") then
            requestFiles[#requestFiles + 1] = { seq = seq, fname = fname }
        end
    end

    table.sort(requestFiles, function(a, b) return a.seq < b.seq end)

    local processedThisPoll = 0
    for _, rf in ipairs(requestFiles) do
        local seq = rf.seq
        local fname = rf.fname
        local reqPath = ipcDir .. fname
        local respPath = ipcDir .. "resp_" .. seq .. ".json"

        if processedSequences[seq] then
            unlinkSafe(reqPath)
            unlinkSafe(respPath)
            goto continue
        end

        local reqStr = readFile(reqPath)
        unlinkSafe(reqPath)

        if reqStr then
            if #reqStr > MAX_JSON_SIZE then
                local errResp = protocol.createError(nil, protocol.PAYLOAD_TOO_LARGE,
                    "Request payload exceeds maximum size of " .. MAX_JSON_SIZE .. " bytes")
                writeFile(respPath, errResp)
                quarantineFile(reqPath, fname, "oversized_request")
            else
                local respStr = processRequest(reqStr, moho)
                writeFile(respPath, respStr)
            end
        end

        processedSequences[seq] = true
        if lastProcessedSeq < seq then lastProcessedSeq = seq end
        processedThisPoll = processedThisPoll + 1

        if processedThisPoll % PERSIST_INTERVAL == 0 then
            persistState()
        end
        trimProcessedSequences()

        ::continue::
    end
end

return server
