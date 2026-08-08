-- animation.lua
-- Tool handlers for animation channels and keyframes.

local animation = {}

-- --------------------------------------------------------------------
-- Channel mapping (name -> AnimVec2 / AnimVal accessor on a layer)
-- --------------------------------------------------------------------

local CHANNEL_MAP = {
    translation = {
        getter = function(lyr) return lyr.fTranslation end,
        isVec2 = true,
    },
    position = {
        getter = function(lyr) return lyr.fTranslation end,
        isVec2 = true,
    },
    rotation = {
        getter = function(lyr) return lyr.fRotationZ end,
        isVec2 = false,
    },
    scale = {
        getter = function(lyr) return lyr.fScale end,
        isVec2 = true,
    },
    opacity = {
        getter = function(lyr) return lyr.fAlpha end,
        isVec2 = false,
    },
    shear = {
        getter = function(lyr) return lyr.fShear end,
        isVec2 = false,
    },
}

-- Build a reverse lookup from MOHO integer constants to human strings.
local INTERP_NAMES = {}
local function buildInterpNames()
    if next(INTERP_NAMES) ~= nil then return end
    local M
    pcall(function() M = MOHO or (LM and LM.MOHO) end)
    if not M then return end
    local pairs = {
        { "INTERP_LINEAR",   "linear" },
        { "INTERP_SMOOTH",   "smooth" },
        { "INTERP_EASE_IN",  "ease_in" },
        { "INTERP_EASE_OUT", "ease_out" },
        { "INTERP_STEP",     "step" },
        { "INTERP_NOISY",    "noisy" },
        { "INTERP_CYCLE",    "cycle" },
    }
    for _, p in ipairs(pairs) do
        local c = p[1]
        local label = p[2]
        pcall(function()
            if M[c] ~= nil then INTERP_NAMES[M[c]] = label end
        end)
    end
    -- Best-effort: bezier may be INTERP_BEZIER on newer Moho, or fall through
    pcall(function()
        if M.INTERP_BEZIER ~= nil then INTERP_NAMES[M.INTERP_BEZIER] = "bezier" end
    end)
end

local function interpName(interpMode)
    if interpMode == nil then return "unknown" end
    buildInterpNames()
    return INTERP_NAMES[interpMode] or tostring(interpMode)
end

-- String -> MOHO integer code for interpolation modes (when setValue exists).
local INTERP_STRING_TO_INT = {
    linear   = function(M) return M.INTERP_LINEAR end,
    smooth   = function(M) return M.INTERP_SMOOTH end,
    ease_in  = function(M) return M.INTERP_EASE_IN end,
    ease_out = function(M) return M.INTERP_EASE_OUT end,
    step     = function(M) return M.INTERP_STEP end,
    noisy    = function(M) return M.INTERP_NOISY end,
    cycle    = function(M) return M.INTERP_CYCLE end,
}

-- --------------------------------------------------------------------
-- Helpers
-- --------------------------------------------------------------------

local function getLayerById(moho, layerId)
    if not moho or not moho.document then return nil, "No active document" end
    if type(layerId) ~= "number" then return nil, "layerId must be a number" end
    local ok, lyr = pcall(function()
        return moho.document:LayerByAbsoluteID(layerId)
    end)
    if not ok or not lyr then
        return nil, "Layer not found with absolute ID " .. tostring(layerId)
    end
    return lyr
end

local function vec2table(v)
    if v == nil then return { x = 0, y = 0 } end
    local ok, x, y = pcall(function() return tonumber(v.x) or 0, tonumber(v.y) or 0 end)
    if ok then return { x = x, y = y } end
    return { x = 0, y = 0 }
end

local function toPlainNumber(val, default)
    if val == nil then return default or 0 end
    local n = tonumber(val)
    if n then return n end
    local s = tostring(val)
    return tonumber(s) or default or 0
end

local function isVec2Channel(channelName)
    return CHANNEL_MAP[channelName] and CHANNEL_MAP[channelName].isVec2
end

-- Read a single keyframe from a channel at the given index.
local function readKey(channel, i, channelName)
    local entry = {}
    local fOk, frame = pcall(function() return channel:GetKeyWhen(i) end)
    if fOk then entry.frame = frame else entry.frame = i end

    local vOk, val = pcall(function() return channel:GetValue(entry.frame) end)
    if vOk and val ~= nil then
        if isVec2Channel(channelName) then
            entry.value = vec2table(val)
        else
            entry.value = toPlainNumber(val, 0)
        end
    else
        entry.value = nil
    end

    local iOk, interp = pcall(function() return channel:GetKeyInterpMode(i) end)
    entry.interpolation = (iOk and interp ~= nil) and interpName(interp) or "unknown"
    return entry
end

-- Find the index of the keyframe at `frame` on `channel`. Returns -1 if not found.
local function findKeyIndex(channel, frame, keyCount)
    for i = 0, keyCount - 1 do
        local ok, when = pcall(function() return channel:GetKeyWhen(i) end)
        if ok and when == frame then return i end
    end
    return -1
end

-- Convert a value to a Vector2 userdata for vec2 channels.
local function valueToVec2(value, fallback)
    local vec = LM.Vector2:new_local()
    if type(value) == "table" then
        vec.x = value.x or value[1] or (fallback and fallback.x) or 0
        vec.y = value.y or value[2] or (fallback and fallback.y) or 0
    else
        vec.x = toPlainNumber(value, 0)
        vec.y = toPlainNumber(value, 0)
    end
    return vec
end

-- Apply a single keyframe to a channel.
local function setOneKeyframe(channel, frame, value, isVec2)
    if isVec2 then
        local cur = nil
        pcall(function() cur = channel:GetValue(frame) end)
        local vec = valueToVec2(value, cur)
        channel:SetValue(frame, vec)
    else
        channel:SetValue(frame, toPlainNumber(value, 0))
    end
end

-- --------------------------------------------------------------------
-- Handlers
-- --------------------------------------------------------------------

function animation.getKeyframes(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if type(params.channel) ~= "string" or params.channel == "" then
        return nil, "Missing required parameter: channel (string)"
    end

    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    local channelName = string.lower(params.channel)
    local mapping = CHANNEL_MAP[channelName]
    if not mapping then
        local validNames = {}
        for k, _ in pairs(CHANNEL_MAP) do validNames[#validNames + 1] = k end
        table.sort(validNames)
        return nil, "Unknown channel '" .. params.channel .. "'. Valid channels: " .. table.concat(validNames, ", ")
    end

    local chOk, channel = pcall(function() return mapping.getter(lyr) end)
    if not chOk or not channel then
        return nil, "Failed to get '" .. channelName .. "' channel from layer: " .. tostring(channel)
    end

    local countOk, keyCount = pcall(function() return channel:CountKeys() end)
    if not countOk then return nil, "Failed to count keyframes: " .. tostring(keyCount) end

    local keyframes = {}
    for i = 0, keyCount - 1 do
        keyframes[#keyframes + 1] = readKey(channel, i, channelName)
    end

    return {
        layerId = params.layerId,
        channel = channelName,
        keyCount = keyCount,
        keyframes = keyframes,
    }
end

function animation.getFrameState(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.frame == nil then return nil, "Missing required parameter: frame" end

    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    local frame = params.frame
    local doc = moho.document
    local startFrame = 0
    local endFrame = 0
    pcall(function() startFrame = doc:StartFrame() end)
    pcall(function() endFrame = doc:EndFrame() end)

    if type(frame) ~= "number" then return nil, "frame must be a number" end

    local result = { layerId = params.layerId, frame = frame }

    local tOk, tVal = pcall(function() return lyr.fTranslation:GetValue(frame) end)
    if tOk and tVal then result.translation = vec2table(tVal) else result.translation = { x = 0, y = 0 } end

    local rOk, rVal = pcall(function() return lyr.fRotationZ:GetValue(frame) end)
    result.rotation = rOk and toPlainNumber(rVal, 0) or 0

    local sOk, sVal = pcall(function() return lyr.fScale:GetValue(frame) end)
    if sOk and sVal then result.scale = vec2table(sVal) else result.scale = { x = 1, y = 1 } end

    local opOk, opVal = pcall(function() return lyr.fAlpha:GetValue(frame) end)
    result.opacity = opOk and toPlainNumber(opVal, 1.0) or 1.0

    local shOk, shVal = pcall(function() return lyr.fShear:GetValue(frame) end)
    result.shear = shOk and toPlainNumber(shVal, 0) or 0

    local visOk, vis = pcall(function() return lyr:IsVisible() end)
    result.visible = visOk and (vis == true) or true

    return result
end

function animation.setKeyframe(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if type(params.channel) ~= "string" or params.channel == "" then
        return nil, "Missing required parameter: channel (string)"
    end
    if params.frame == nil then return nil, "Missing required parameter: frame" end
    if params.value == nil then return nil, "Missing required parameter: value" end

    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    local channelName = string.lower(params.channel)
    local mapping = CHANNEL_MAP[channelName]
    if not mapping then
        local validNames = {}
        for k, _ in pairs(CHANNEL_MAP) do validNames[#validNames + 1] = k end
        table.sort(validNames)
        return nil, "Unknown channel '" .. params.channel .. "'. Valid channels: " .. table.concat(validNames, ", ")
    end

    local chOk, channel = pcall(function() return mapping.getter(lyr) end)
    if not chOk or not channel then
        return nil, "Failed to get '" .. channelName .. "' channel from layer"
    end

    pcall(function() moho.document:PrepUndo(lyr) end)

    local frame = params.frame
    local ok, setErr = pcall(function() setOneKeyframe(channel, frame, params.value, mapping.isVec2) end)
    if not ok then return nil, "Failed to set keyframe: " .. tostring(setErr) end

    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, channel = channelName, frame = frame, value = params.value }
end

-- setMultiKeyframe: set N keyframes on a channel in one call.
function animation.setMultiKeyframe(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if type(params.channel) ~= "string" or params.channel == "" then
        return nil, "Missing required parameter: channel (string)"
    end
    if type(params.keyframes) ~= "table" or #params.keyframes == 0 then
        return nil, "keyframes must be a non-empty array"
    end

    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    local channelName = string.lower(params.channel)
    local mapping = CHANNEL_MAP[channelName]
    if not mapping then
        return nil, "Unknown channel '" .. params.channel .. "'"
    end

    local chOk, channel = pcall(function() return mapping.getter(lyr) end)
    if not chOk or not channel then
        return nil, "Failed to get '" .. channelName .. "' channel from layer"
    end

    pcall(function() moho.document:PrepUndo(lyr) end)

    local written = 0
    for _, kf in ipairs(params.keyframes) do
        if kf.frame ~= nil and kf.value ~= nil then
            local ok, setErr = pcall(function()
                setOneKeyframe(channel, math.floor(kf.frame), kf.value, mapping.isVec2)
            end)
            if ok then written = written + 1 end
        end
    end

    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, channel = channelName, written = written, total = #params.keyframes }
end

function animation.deleteKeyframe(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if type(params.channel) ~= "string" or params.channel == "" then
        return nil, "Missing required parameter: channel (string)"
    end
    if params.frame == nil then return nil, "Missing required parameter: frame" end

    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    local channelName = string.lower(params.channel)
    local mapping = CHANNEL_MAP[channelName]
    if not mapping then
        local validNames = {}
        for k, _ in pairs(CHANNEL_MAP) do validNames[#validNames + 1] = k end
        table.sort(validNames)
        return nil, "Unknown channel '" .. params.channel .. "'. Valid channels: " .. table.concat(validNames, ", ")
    end

    local chOk, channel = pcall(function() return mapping.getter(lyr) end)
    if not chOk or not channel then
        return nil, "Failed to get '" .. channelName .. "' channel from layer"
    end

    pcall(function() moho.document:PrepUndo(lyr) end)
    local ok, delErr = pcall(function() channel:DeleteKey(params.frame) end)
    if not ok then return nil, "Failed to delete keyframe: " .. tostring(delErr) end
    pcall(function() moho.document:SetDirty() end)

    return { success = true, layerId = params.layerId, channel = channelName, frame = params.frame }
end

function animation.setInterpolation(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if type(params.channel) ~= "string" or params.channel == "" then
        return nil, "Missing required parameter: channel (string)"
    end
    if params.frame == nil then return nil, "Missing required parameter: frame" end
    if type(params.mode) ~= "string" or params.mode == "" then
        return nil, "Missing required parameter: mode (string)"
    end

    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    local channelName = string.lower(params.channel)
    local mapping = CHANNEL_MAP[channelName]
    if not mapping then
        return nil, "Unknown channel '" .. params.channel .. "'"
    end

    local chOk, channel = pcall(function() return mapping.getter(lyr) end)
    if not chOk or not channel then
        return nil, "Failed to get '" .. channelName .. "' channel from layer"
    end

    local modeName = string.lower(params.mode)
    local M = MOHO or (LM and LM.MOHO)
    if not M then return nil, "Cannot access MOHO constants" end

    local modeFn = INTERP_STRING_TO_INT[modeName]
    local interpMode = modeFn and modeFn(M) or nil
    if interpMode == nil and modeName == "bezier" then
        -- try common bezier constant names
        pcall(function() interpMode = M.INTERP_BEZIER end)
    end
    if interpMode == nil then
        return nil, "Unknown interpolation mode '" .. params.mode .. "'. Valid: linear, smooth, ease_in, ease_out, step, bezier, noisy, cycle"
    end

    pcall(function() moho.document:PrepUndo(lyr) end)

    local ok, setErr = pcall(function()
        local keyCount = channel:CountKeys()
        local idx = findKeyIndex(channel, math.floor(params.frame), keyCount)
        if idx < 0 then
            error("No keyframe at frame " .. tostring(params.frame))
        end
        channel:SetKeyInterp(idx, interpMode, 0, 0)
    end)
    if not ok then return nil, "Failed to set interpolation: " .. tostring(setErr) end

    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, channel = channelName, frame = params.frame, mode = modeName }
end

-- animation.getPointAnim: per-point animation data (vector mesh morph).
function animation.getPointAnim(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.pointIndex == nil then return nil, "Missing required parameter: pointIndex" end
    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    local isVecOk, isVec = pcall(function() return lyr:IsVectorType() end)
    if not isVecOk or not isVec then
        return nil, "Layer is not a vector layer"
    end

    local vOk, vecLyr = pcall(function() return moho:LayerAsVector(lyr) end)
    if not vOk or not vecLyr then return nil, "Failed to cast layer to vector layer" end

    local mOk, mesh = pcall(function() return vecLyr:Mesh() end)
    if not mOk or not mesh then return nil, "Failed to get mesh" end

    local pointCount = mesh:CountPoints()
    if params.pointIndex < 0 or params.pointIndex >= pointCount then
        return nil, "pointIndex out of range (0.." .. tostring(pointCount - 1) .. ")"
    end

    local pOk, point = pcall(function() return mesh:Point(params.pointIndex) end)
    if not pOk or not point then return nil, "Failed to retrieve point" end

    -- Per-point animation lives on fPAnim; the API surface varies across
    -- Moho versions, so we surface what we can and gracefully report the rest.
    local result = {
        layerId = params.layerId,
        pointIndex = params.pointIndex,
    }
    if point.fPAnim then
        local keys = {}
        local countOk, keyCount = pcall(function() return point.fPAnim:CountKeys() end)
        if countOk and keyCount then
            for i = 0, keyCount - 1 do
                local entry = {}
                local fOk, frame = pcall(function() return point.fPAnim:GetKeyWhen(i) end)
                if fOk then entry.frame = frame end
                local vOk, val = pcall(function() return point.fPAnim:GetValue(entry.frame or 0) end)
                if vOk and val then entry.value = vec2table(val) end
                keys[#keys + 1] = entry
            end
            result.keyframes = keys
            result.keyCount = keyCount
        end
    else
        result.keyframes = {}
        result.keyCount = 0
    end
    return result
end

return animation
