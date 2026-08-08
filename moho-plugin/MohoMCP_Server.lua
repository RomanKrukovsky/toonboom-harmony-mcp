-- **************************************************
-- MohoMCP_Server.lua
-- Top-level Moho script that wires handlers from moho_mcp/tools/* into the
-- file-based IPC server, and installs polling hooks so requests get processed
-- whenever Moho's UI loop fires.
-- **************************************************

ScriptName = "MohoMCP_Server"

MohoMCP_Server = MohoMCP_Server or {}

if MohoMCP_Server.server == nil then
    MohoMCP_Server.server = nil
    MohoMCP_Server.isLoaded = false
    MohoMCP_Server.BASE_DIR = ""
    MohoMCP_Server.pollActive = false
    MohoMCP_Server._autoStarted = false
    MohoMCP_Server._hooksInstalled = false
    MohoMCP_Server._lastPollTime = 0
end

function MohoMCP_Server:Name()
    return "MohoMCP Server"
end

function MohoMCP_Server:Version()
    return "0.2.0"
end

function MohoMCP_Server:Description()
    return "Start/stop the MohoMCP server for LLM integration (Claude Desktop, Claude Code)"
end

function MohoMCP_Server:Creator()
    return "MohoMCP Project"
end

function MohoMCP_Server:UILabel()
    if MohoMCP_Server.server and MohoMCP_Server.server.isRunning() then
        return "🟢 MohoMCP Server (Active - Click to Stop)"
    else
        return "🔴 MohoMCP Server (Click to Start)"
    end
end

-- **************************************************
-- Helpers
-- **************************************************

local function getScriptDir()
    local info = debug.getinfo(1, "S")
    local path = info.source
    if path:sub(1, 1) == "@" then path = path:sub(2) end
    path = path:gsub("\\", "/")
    return path:match("^(.*/)") or "./"
end

local function setupPackagePath(baseDir)
    local sep = package.config:sub(1, 1)
    local pattern = baseDir .. "?.lua;" .. baseDir .. "?" .. sep .. "init.lua"
    if not package.path:find(baseDir, 1, true) then
        package.path = pattern .. ";" .. package.path
    end
end

-- **************************************************
-- Module loading
-- **************************************************

-- All submodules that may have been loaded previously; clear so changes
-- take effect without restarting Moho.
local function clearPackageCache()
    package.loaded["moho_mcp.protocol"] = nil
    package.loaded["moho_mcp.validator"] = nil
    package.loaded["moho_mcp.server"] = nil
    package.loaded["moho_mcp.tools.document"] = nil
    package.loaded["moho_mcp.tools.layer"] = nil
    package.loaded["moho_mcp.tools.bone"] = nil
    package.loaded["moho_mcp.tools.animation"] = nil
    package.loaded["moho_mcp.tools.mesh"] = nil
    package.loaded["moho_mcp.tools.batch"] = nil
    package.loaded["moho_mcp.tools.workflow"] = nil
end

local function loadModules(baseDir)
    clearPackageCache()
    setupPackagePath(baseDir)

    local jsonOk, jsonMod = pcall(require, "json")
    if not jsonOk then
        print("[MohoMCP] ERROR: Failed to load json.lua: " .. tostring(jsonMod))
        return false
    end
    _G.json = jsonMod

    local protocolOk, protocolMod = pcall(require, "moho_mcp.protocol")
    if not protocolOk then
        print("[MohoMCP] ERROR: Failed to load protocol: " .. tostring(protocolMod))
        return false
    end

    local validatorOk, validatorMod = pcall(require, "moho_mcp.validator")
    if not validatorOk then
        print("[MohoMCP] ERROR: Failed to load validator: " .. tostring(validatorMod))
        return false
    end

    local serverOk, srv = pcall(require, "moho_mcp.server")
    if not serverOk then
        print("[MohoMCP] ERROR: Failed to load server: " .. tostring(srv))
        return false
    end

    srv.init({ protocol = protocolMod, validator = validatorMod, json = jsonMod })

    -- Each tool exposes a `function.<method> = handler` style. Build the map
    -- explicitly so we don't depend on module-side for loops over tnames.
    local toolModules = {
        { name = "moho_mcp.tools.document",  methods = {
            "document.getInfo", "document.getLayers", "document.setFrame", "document.screenshot",
            "document.createLayer", "document.save", "document.close", "document.open",
            "document.render", "document.diagnose",
        } },
        { name = "moho_mcp.tools.layer",     methods = {
            "layer.getProperties", "layer.getChildren", "layer.getBones", "layer.setTransform",
            "layer.setVisibility", "layer.setOpacity", "layer.setName", "layer.selectLayer",
            "layer.reorder", "layer.setBlendMode", "layer.setMask", "layer.createGroup",
            "layer.createSwitch", "layer.delete",
        } },
        { name = "moho_mcp.tools.bone",      methods = {
            "bone.getProperties", "bone.setTransform", "bone.selectBone", "bone.createBone",
            "bone.deleteBone", "bone.setConstraints", "bone.setTarget", "bone.setParent",
        } },
        { name = "moho_mcp.tools.animation", methods = {
            "animation.getKeyframes", "animation.getFrameState", "animation.setKeyframe",
            "animation.setMultiKeyframe", "animation.deleteKeyframe", "animation.setInterpolation",
            "animation.getPointAnim",
        } },
        { name = "moho_mcp.tools.mesh",      methods = {
            "mesh.getPoints", "mesh.getShapes", "mesh.createPoint", "mesh.createBezier",
            "mesh.weld", "mesh.setFill", "mesh.setStroke", "mesh.setGradient", "mesh.setCurvature",
        } },
        { name = "moho_mcp.tools.batch",     methods = { "batch.execute" } },
        { name = "moho_mcp.tools.workflow",  methods = {
            "workflow.createCharacterRig", "workflow.duplicateLayerTree", "workflow.createSmartBone",
            "workflow.applyLipSync", "workflow.batchRender", "workflow.projectDiagnostics",
        } },
    }

    for _, toolDef in ipairs(toolModules) do
        local toolOk, toolMod = pcall(require, toolDef.name)
        if toolOk and toolMod then
            for _, method in ipairs(toolDef.methods) do
                local funcName = method:match("%.(.+)$")
                if funcName and type(toolMod[funcName]) == "function" then
                    srv.registerHandler(method, toolMod[funcName])
                else
                    print("[MohoMCP] WARNING: missing handler in " .. toolDef.name .. " for " .. method)
                end
            end
        else
            print("[MohoMCP] WARNING: failed to load " .. toolDef.name .. ": " .. tostring(toolMod))
        end
    end

    MohoMCP_Server.server = srv
    MohoMCP_Server.isLoaded = true
    return true
end

-- **************************************************
-- DrawMe hooks
-- **************************************************

local TOOL_NAMES = {
    "LM_TransformPoints", "LM_SelectPoints", "LM_AddPoint", "LM_Curvature",
    "LM_Freehand", "LM_Shape", "LM_DeleteEdge", "LM_Magnet",
    "LM_Brush", "LM_Eraser", "LM_PointReduction", "LM_ScatterBrush",
    "LM_PerspectivePoints", "LM_ShearPoints", "LM_BendPoints", "LM_Noise",
    "LM_SelectShape", "LM_CreateShape", "LM_PaintBucket", "LM_DeleteShape",
    "LM_LineWidth", "LM_HideEdge", "LM_CurveExposure", "LM_CurveProfile",
    "LM_SelectBone", "LM_AddBone", "LM_TransformBone", "LM_ManipulateBones",
    "LM_ReparentBone", "LM_BoneStrength", "LM_BoneGroups",
    "LM_BindLayer", "LM_BindPoints", "LM_OffsetBone",
    "LM_TransformLayer", "LM_SetOrigin",
    "LM_FollowCurve", "LM_RotateLayerXY", "LM_ShearLayer",
    "LM_TrackCamera", "LM_ZoomCamera", "LM_RollCamera", "LM_PanTiltCamera",
    "LM_PanWorkspace", "LM_ZoomWorkspace", "LM_RotateWorkspace", "LM_OrbitWorkspace",
}

local function installDrawMeHooks()
    if MohoMCP_Server._hooksInstalled then return end

    local wrapped = 0
    for _, name in ipairs(TOOL_NAMES) do
        local tool = _G[name]
        if tool and tool.DrawMe then
            local original = tool.DrawMe
            tool.DrawMe = function(self, moho, view)
                if MohoMCP_Server.pollActive and MohoMCP_Server.server then
                    -- pcall isolates any plugin-internal error from the
                    -- view paint path so a single bad poll never freezes the UI.
                    local pollOk, pollErr = pcall(MohoMCP_Server.server.poll, moho)
                    if not pollOk then
                        print("[MohoMCP] Poll error (non-fatal): " .. tostring(pollErr))
                    end
                    -- Self-sustaining redraw: ask Moho to repaint at ~4Hz so
                    -- our poll loop continues even when the user is idle.
                    local now = os.clock()
                    if not MohoMCP_Server._lastPollTime
                       or (now - MohoMCP_Server._lastPollTime) > 0.25 then
                        MohoMCP_Server._lastPollTime = now
                        pcall(function() moho:UpdateUI() end)
                    end
                end
                return original(self, moho, view)
            end
            wrapped = wrapped + 1
        end
    end

    MohoMCP_Server._hooksInstalled = true
    print("[MohoMCP] Injected polling into " .. wrapped .. " tool DrawMe callbacks")
end

-- **************************************************
-- IsEnabled — heart-beat: auto-start, run poll.
-- **************************************************

function MohoMCP_Server:IsEnabled(moho)
    if not MohoMCP_Server._autoStarted then
        MohoMCP_Server._autoStarted = true
        if MohoMCP_Server.BASE_DIR == "" then
            MohoMCP_Server.BASE_DIR = getScriptDir()
        end
        if loadModules(MohoMCP_Server.BASE_DIR) then
            local srv = MohoMCP_Server.server
            if srv and not srv.isRunning() then
                local ok, err = srv.start()
                if ok then
                    MohoMCP_Server.pollActive = true
                    installDrawMeHooks()
                    print("[MohoMCP] Auto-started. IPC dir: " .. srv.getInfo().ipcDir)
                else
                    print("[MohoMCP] Auto-start failed: " .. tostring(err))
                end
            end
        end
    end

    if MohoMCP_Server.pollActive and MohoMCP_Server.server then
        local ok, err = pcall(MohoMCP_Server.server.poll, moho)
        if not ok then print("[MohoMCP] Poll error: " .. tostring(err)) end
    end
    return true
end

-- **************************************************
-- Run — toggle start/stop
-- **************************************************

function MohoMCP_Server:Run(moho)
    if MohoMCP_Server.BASE_DIR == "" then
        MohoMCP_Server.BASE_DIR = getScriptDir()
    end

    if not MohoMCP_Server.isLoaded then
        if not loadModules(MohoMCP_Server.BASE_DIR) then
            print("[MohoMCP] ERROR: Failed to load modules.")
            return
        end
    end

    local srv = MohoMCP_Server.server
    if srv.isRunning() then
        srv.stop()
        MohoMCP_Server.pollActive = false
        print("[MohoMCP] Server STOPPED.")
    else
        local ok, err = srv.start()
        if ok then
            MohoMCP_Server.pollActive = true
            installDrawMeHooks()
            srv.poll(moho)
            print("[MohoMCP] Server STARTED! IPC dir: " .. srv.getInfo().ipcDir)
        else
            print("[MohoMCP] Server start error: " .. tostring(err))
        end
    end
end

-- **************************************************
-- Auto-start on script load
-- **************************************************

function MohoMCP_Server:AutoStartOnLoad()
    if MohoMCP_Server._autoStarted then return end
    MohoMCP_Server._autoStarted = true
    if MohoMCP_Server.BASE_DIR == "" then
        MohoMCP_Server.BASE_DIR = getScriptDir()
    end
    if loadModules(MohoMCP_Server.BASE_DIR) then
        local srv = MohoMCP_Server.server
        if srv and not srv.isRunning() then
            local ok, err = srv.start()
            if ok then
                MohoMCP_Server.pollActive = true
                installDrawMeHooks()
                print("[MohoMCP] AUTO-STARTED. IPC dir: " .. srv.getInfo().ipcDir)
            else
                print("[MohoMCP] Auto-start error: " .. tostring(err))
            end
        end
    end
end

pcall(function() MohoMCP_Server:AutoStartOnLoad() end)
