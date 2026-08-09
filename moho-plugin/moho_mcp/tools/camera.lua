-- camera.lua
-- Tool handlers for the Moho document camera: position (track), zoom, rotation
-- (roll / pan / tilt), keyframing and reset.
--
-- API surface verified against Moho's own bundled scripts:
--   Scripts/Tool/lm_track_camera.lua      -> moho.document.fCameraTrack   (AnimVec3)
--   Scripts/Tool/lm_zoom_camera.lua       -> moho.document.fCameraZoom    (AnimVal)
--   Scripts/Tool/lm_roll_camera.lua       -> moho.document.fCameraRoll    (AnimVal, radians)
--   Scripts/Tool_pro/lm_pantilt_camera.lua-> moho.document.fCameraPanTilt (AnimVec2, radians)
--   Scripts/Utility/lm_channel_codes.lua  -> CHANNEL_CAMERA_* constants
--   Scripts/Menu/Camera/lm_orbitcamera.lua, lm_handheldcamera.lua
--
-- The camera lives on the document, not on a layer: there is no camera layer to
-- address, so these handlers take no layerId.
--
-- Units: Moho stores roll / pan / tilt in radians. Moho's own tool UI exposes
-- them in degrees (LM.GUI.UNIT_DEGREES), so this module takes and reports
-- degrees by default and echoes radians alongside for callers that need them.

local camera = {}

-- --------------------------------------------------------------------
-- Constants (mirrored from Moho's bundled scripts, not invented)
-- --------------------------------------------------------------------

-- lm_zoom_camera.lua: DEFAULT_FOV = math.rad(60); FOV clamped to 0.25..160 deg.
local DEFAULT_FOV_DEG = 60.0
local MIN_FOV_DEG     = 0.25
local MAX_FOV_DEG     = 160.0

-- Derived zoom bounds: zoom = DEFAULT_FOV / fov.
local MIN_ZOOM = DEFAULT_FOV_DEG / MAX_FOV_DEG -- 0.375
local MAX_ZOOM = DEFAULT_FOV_DEG / MIN_FOV_DEG -- 240

-- Document defaults, taken from each camera tool's own Reset handler.
local DEFAULT_TRACK_Z = 3.7320508 -- lm_track_camera.lua RESET
local DEFAULT_ZOOM    = 2.0       -- lm_zoom_camera.lua RESET
local DEFAULT_ROLL    = 0.0       -- lm_roll_camera.lua RESET
local DEFAULT_PANTILT = 0.0       -- lm_pantilt_camera.lua RESET

-- lm_pantilt_camera.lua clamps tilt (panTilt.x) to +/- pi/2. Pan is free.
local MAX_TILT_RAD = math.pi / 2

-- Fallback values for the CHANNEL_CAMERA_* globals. These are the literal
-- numbers from Scripts/Utility/lm_channel_codes.lua and are only used when that
-- utility script has not populated the globals in our environment.
local CHANNEL_CODE_FALLBACK = {
    track   = 10134, -- CHANNEL_CAMERA_TRACK
    zoom    = 10135, -- CHANNEL_CAMERA_ZOOM
    roll    = 10136, -- CHANNEL_CAMERA_ROLL
    pantilt = 10137, -- CHANNEL_CAMERA_PANTILT
}

local CHANNEL_GLOBAL_NAME = {
    track   = "CHANNEL_CAMERA_TRACK",
    zoom    = "CHANNEL_CAMERA_ZOOM",
    roll    = "CHANNEL_CAMERA_ROLL",
    pantilt = "CHANNEL_CAMERA_PANTILT",
}

-- Accepted channel aliases -> canonical key.
local CHANNEL_ALIASES = {
    track    = "track",
    position = "track",
    pos      = "track",
    translation = "track",
    zoom     = "zoom",
    fov      = "zoom",
    roll     = "roll",
    rotation = "roll",
    pantilt  = "pantilt",
    ["pan_tilt"] = "pantilt",
    pan      = "pantilt",
    tilt     = "pantilt",
}

-- --------------------------------------------------------------------
-- Small helpers
-- --------------------------------------------------------------------

local function clamp(v, lo, hi)
    if v < lo then return lo end
    if v > hi then return hi end
    return v
end

local function num(v, default)
    local n = tonumber(v)
    if n then return n end
    return default
end

local function vec3table(v)
    if v == nil then return { x = 0, y = 0, z = 0 } end
    local ok, x, y, z = pcall(function()
        return tonumber(v.x) or 0, tonumber(v.y) or 0, tonumber(v.z) or 0
    end)
    if ok then return { x = x, y = y, z = z } end
    return { x = 0, y = 0, z = 0 }
end

local function vec2table(v)
    if v == nil then return { x = 0, y = 0 } end
    local ok, x, y = pcall(function()
        return tonumber(v.x) or 0, tonumber(v.y) or 0
    end)
    if ok then return { x = x, y = y } end
    return { x = 0, y = 0 }
end

-- Resolve a CHANNEL_CAMERA_* constant. Prefers the global that Moho's
-- lm_channel_codes.lua defines; falls back to the literal from that same file.
local function channelCode(key)
    local code
    pcall(function()
        local name = CHANNEL_GLOBAL_NAME[key]
        if name then code = _G[name] end
    end)
    if type(code) == "number" then return code end
    return CHANNEL_CODE_FALLBACK[key]
end

-- Fetch the four document camera channels. Every access is guarded because a
-- missing document (or a Moho build without one of these fields) must surface as
-- an error string rather than an in-app crash.
local function getChannels(moho)
    if not moho then return nil, "No Moho context" end
    if not moho.document then return nil, "No active document" end

    local ch = {}
    local ok = pcall(function()
        ch.track   = moho.document.fCameraTrack
        ch.zoom    = moho.document.fCameraZoom
        ch.roll    = moho.document.fCameraRoll
        ch.pantilt = moho.document.fCameraPanTilt
    end)
    if not ok then return nil, "Failed to access document camera channels" end
    if not ch.track or not ch.zoom or not ch.roll or not ch.pantilt then
        return nil, "Document camera channels unavailable (fCameraTrack/Zoom/Roll/PanTilt)"
    end
    return ch
end

-- Current frame. Moho tools read moho.frame; bone.lua reads CurrentFrame().
-- Try both so this works from either entry point.
local function currentFrame(moho)
    local f
    pcall(function() f = moho.frame end)
    if type(f) == "number" then return math.floor(f) end
    pcall(function() f = moho.document:CurrentFrame() end)
    if type(f) == "number" then return math.floor(f) end
    return 0
end

local function endFrame(moho)
    local f
    pcall(function() f = moho.document:EndFrame() end)
    if type(f) == "number" then return math.floor(f) end
    return nil
end

-- Validate and normalise a requested frame. Returns integer frame or nil, err.
local function resolveFrame(moho, requested)
    if requested == nil then return currentFrame(moho) end
    local f = tonumber(requested)
    if not f then return nil, "frame must be a number" end
    f = math.floor(f)
    if f < 0 then return nil, "frame must be >= 0 (got " .. tostring(f) .. ")" end
    local last = endFrame(moho)
    if last and f > last then
        return nil, "frame " .. tostring(f) .. " is past the document end frame ("
            .. tostring(last) .. "); extend the document before keying the camera there"
    end
    return f
end

-- Moho disables every camera tool while an action is being edited
-- (see IsEnabled in lm_track_camera / lm_zoom_camera / lm_roll_camera /
-- lm_pantilt_camera). Writing the camera in that state would land the edit in
-- the action instead of the document, so refuse it the same way.
local function assertNotEditingAction(moho)
    local action
    pcall(function()
        if moho.layer then action = moho.layer:CurrentAction() end
    end)
    if type(action) == "string" and action ~= "" then
        return nil, "Cannot edit the camera while action '" .. action
            .. "' is being edited; exit the action first"
    end
    return true
end

-- Moho's camera tools all call PrepUndo(moho.layer, true) before touching a
-- camera channel. Without it the edit is not undoable with Cmd+Z inside Moho.
local function prepUndo(moho)
    local ok = pcall(function() moho.document:PrepUndo(moho.layer, true) end)
    if not ok then
        -- Older/limited builds may only accept the single-argument form.
        ok = pcall(function() moho.document:PrepUndo(moho.layer) end)
    end
    return ok
end

-- Post-mutation bookkeeping, mirroring Moho's camera tools:
-- DepthSort() re-sorts layers for the new camera, NewKeyframe() registers the
-- key in the timeline UI, SetDirty() marks the document modified.
local function finishMutation(moho, changedKeys, frame)
    pcall(function() moho.document:DepthSort() end)
    for _, key in ipairs(changedKeys or {}) do
        local code = channelCode(key)
        if code then pcall(function() moho:NewKeyframe(code) end) end
    end
    pcall(function() moho.document:SetDirty() end)
    -- Force a refresh when the edited key is not the frame on screen.
    if frame ~= nil and frame ~= currentFrame(moho) then
        pcall(function() moho:SetCurFrame(currentFrame(moho)) end)
    end
    pcall(function() moho:UpdateUI() end)
end

local function zoomToFovDeg(zoom)
    local z = num(zoom, DEFAULT_ZOOM)
    if z == nil or z <= 0 then return nil end
    return DEFAULT_FOV_DEG / z
end

local function fovDegToZoom(fovDeg)
    local f = num(fovDeg, nil)
    if f == nil or f <= 0 then return nil end
    return DEFAULT_FOV_DEG / f
end

-- 35mm-equivalent focal length, per the comment block in lm_zoom_camera.lua:
-- vertical FOV = 2*atan(0.5 * 24mm / focalLength) => focalLength = 12/tan(fov/2)
local function fovDegToFocalLength(fovDeg)
    local f = num(fovDeg, nil)
    if f == nil or f <= 0 then return nil end
    local t = math.tan(math.rad(f) / 2.0)
    if t <= 0 then return nil end
    return 12.0 / t
end

local function focalLengthToFovDeg(mm)
    local m = num(mm, nil)
    if m == nil or m < 1 then return nil end
    return math.deg(2.0 * math.atan(12.0 / m))
end

-- Read a channel value at a frame, falling back to the live `.value` field.
local function channelValueAt(ch, frame)
    local v
    local ok = pcall(function() v = ch:GetValue(frame) end)
    if ok and v ~= nil then return v end
    pcall(function() v = ch.value end)
    return v
end

local function channelKeyCount(ch)
    local n
    pcall(function() n = ch:CountKeys() end)
    return tonumber(n) or 0
end

local function channelHasKey(ch, frame)
    local has
    pcall(function() has = ch:HasKey(frame) end)
    return has and true or false
end

-- --------------------------------------------------------------------
-- camera.getInfo
-- --------------------------------------------------------------------

-- Report the camera state at a frame: position, zoom (raw + FOV + focal
-- length), roll, pan, tilt, per-channel key counts, and view context.
function camera.getInfo(moho, params)
    local ch, err = getChannels(moho)
    if not ch then return nil, err end

    local frame, ferr = resolveFrame(moho, params and params.frame)
    if frame == nil then return nil, ferr end

    local result = { frame = frame }

    result.position = vec3table(channelValueAt(ch.track, frame))

    local zoom = num(channelValueAt(ch.zoom, frame), DEFAULT_ZOOM)
    local fovDeg = zoomToFovDeg(zoom)
    result.zoom = zoom
    result.fovDegrees = fovDeg
    result.focalLength35mm = fovDeg and fovDegToFocalLength(fovDeg) or nil

    local rollRad = num(channelValueAt(ch.roll, frame), 0)
    result.roll = { degrees = math.deg(rollRad), radians = rollRad }

    local pt = vec2table(channelValueAt(ch.pantilt, frame))
    -- lm_pantilt_camera.lua UpdateWidgets: pan is .y, tilt is .x.
    result.rotation = {
        panDegrees  = math.deg(pt.y),
        tiltDegrees = math.deg(pt.x),
        rollDegrees = math.deg(rollRad),
        panRadians  = pt.y,
        tiltRadians = pt.x,
        rollRadians = rollRad,
    }

    result.channels = {}
    for _, key in ipairs({ "track", "zoom", "roll", "pantilt" }) do
        result.channels[key] = {
            keyCount = channelKeyCount(ch[key]),
            hasKeyAtFrame = channelHasKey(ch[key], frame),
            channelCode = channelCode(key),
        }
    end

    -- Moho's camera is a fixed perspective camera: the zoom channel is a field
    -- of view multiplier and there is no orthographic toggle anywhere in the
    -- bundled scripts or the document API. Reported as a constant, with the
    -- limitation stated, rather than pretending a settable property exists.
    result.projection = {
        type = "perspective",
        configurable = false,
        note = "Moho exposes no projection-type API; the camera is always perspective. "
            .. "Framing is controlled through zoom / field of view.",
    }

    local outside
    pcall(function() outside = moho.document:IsOutsideViewEnabled() end)
    result.outsideViewEnabled = outside and true or false

    local last = endFrame(moho)
    if last then result.documentEndFrame = last end

    local action
    pcall(function() if moho.layer then action = moho.layer:CurrentAction() end end)
    result.editable = not (type(action) == "string" and action ~= "")
    if not result.editable then result.currentAction = action end

    result.limits = {
        minZoom = MIN_ZOOM,
        maxZoom = MAX_ZOOM,
        minFovDegrees = MIN_FOV_DEG,
        maxFovDegrees = MAX_FOV_DEG,
        maxTiltDegrees = math.deg(MAX_TILT_RAD),
    }

    return result
end

-- --------------------------------------------------------------------
-- camera.setPosition
-- --------------------------------------------------------------------

-- Move the camera in 3D (Moho's "track"). Any of x / y / z may be omitted, in
-- which case the current value at that frame is kept. Accepts either a nested
-- `position = { x, y, z }` table or flat x / y / z, matching bone.setTransform.
function camera.setPosition(moho, params)
    if not params then return nil, "Missing parameters" end

    local ch, err = getChannels(moho)
    if not ch then return nil, err end

    local okAction, actionErr = assertNotEditingAction(moho)
    if not okAction then return nil, actionErr end

    local frame, ferr = resolveFrame(moho, params.frame)
    if frame == nil then return nil, ferr end

    local pos = params.position
    if pos ~= nil and type(pos) ~= "table" then
        return nil, "position must be a table { x, y, z }"
    end

    local wantX = params.x; if wantX == nil and pos then wantX = pos.x end
    local wantY = params.y; if wantY == nil and pos then wantY = pos.y end
    local wantZ = params.z; if wantZ == nil and pos then wantZ = pos.z end

    if wantX == nil and wantY == nil and wantZ == nil then
        return nil, "Provide at least one of x, y, z (or position = { x, y, z })"
    end
    for name, v in pairs({ x = wantX, y = wantY, z = wantZ }) do
        if v ~= nil and tonumber(v) == nil then
            return nil, "position." .. name .. " must be a number"
        end
    end

    local current = vec3table(channelValueAt(ch.track, frame))
    local target = {
        x = num(wantX, current.x),
        y = num(wantY, current.y),
        z = num(wantZ, current.z),
    }

    -- Skip a no-op write so we do not litter the timeline with dead keys.
    -- Moho's own track tool uses the same 0.0001 threshold.
    local dx, dy, dz = target.x - current.x, target.y - current.y, target.z - current.z
    if math.sqrt(dx * dx + dy * dy + dz * dz) <= 0.0001 then
        return {
            success = true,
            changed = false,
            frame = frame,
            position = current,
            note = "Camera already at this position; no keyframe written",
        }
    end

    prepUndo(moho)

    local setOk, setErr = pcall(function()
        local vec = LM.Vector3:new_local()
        vec:Set(target.x, target.y, target.z)
        ch.track:SetValue(frame, vec)
    end)
    if not setOk then
        return nil, "Failed to set camera position: " .. tostring(setErr)
    end

    finishMutation(moho, { "track" }, frame)

    return {
        success = true,
        changed = true,
        frame = frame,
        position = target,
        previousPosition = current,
    }
end

-- --------------------------------------------------------------------
-- camera.setZoom
-- --------------------------------------------------------------------

-- Set the camera zoom. Accepts exactly one of:
--   zoom            raw multiplier (1.0 = 60 deg vertical FOV, 2.0 = default)
--   fovDegrees      vertical field of view in degrees (0.25 .. 160)
--   focalLength35mm 35mm-equivalent focal length in mm
-- These are the three forms Moho's own zoom tool exposes.
function camera.setZoom(moho, params)
    if not params then return nil, "Missing parameters" end

    local ch, err = getChannels(moho)
    if not ch then return nil, err end

    local okAction, actionErr = assertNotEditingAction(moho)
    if not okAction then return nil, actionErr end

    local frame, ferr = resolveFrame(moho, params.frame)
    if frame == nil then return nil, ferr end

    local fov = params.fovDegrees
    if fov == nil then fov = params.fov end
    local focal = params.focalLength35mm
    if focal == nil then focal = params.focalLength end

    local provided = 0
    if params.zoom ~= nil then provided = provided + 1 end
    if fov ~= nil then provided = provided + 1 end
    if focal ~= nil then provided = provided + 1 end
    if provided == 0 then
        return nil, "Provide one of: zoom, fovDegrees, focalLength35mm"
    end
    if provided > 1 then
        return nil, "Provide only one of zoom, fovDegrees, focalLength35mm (they are alternate spellings of the same value)"
    end

    local targetFovDeg
    if params.zoom ~= nil then
        local z = tonumber(params.zoom)
        if z == nil then return nil, "zoom must be a number" end
        if z <= 0 then return nil, "zoom must be greater than 0" end
        targetFovDeg = zoomToFovDeg(z)
    elseif fov ~= nil then
        local f = tonumber(fov)
        if f == nil then return nil, "fovDegrees must be a number" end
        if f <= 0 then return nil, "fovDegrees must be greater than 0" end
        targetFovDeg = f
    else
        local m = tonumber(focal)
        if m == nil then return nil, "focalLength35mm must be a number" end
        if m < 1 then return nil, "focalLength35mm must be >= 1 mm" end
        targetFovDeg = focalLengthToFovDeg(m)
    end

    if targetFovDeg == nil then
        return nil, "Could not derive a field of view from the supplied value"
    end

    -- Clamp through FOV exactly as lm_zoom_camera.lua does.
    local clampedFovDeg = clamp(targetFovDeg, MIN_FOV_DEG, MAX_FOV_DEG)
    local wasClamped = math.abs(clampedFovDeg - targetFovDeg) > 1e-9
    local targetZoom = fovDegToZoom(clampedFovDeg)
    if targetZoom == nil then
        return nil, "Could not derive a zoom value from the supplied value"
    end

    local currentZoom = num(channelValueAt(ch.zoom, frame), DEFAULT_ZOOM)
    if math.abs(targetZoom - currentZoom) <= 0.0001 then
        return {
            success = true,
            changed = false,
            frame = frame,
            zoom = currentZoom,
            fovDegrees = zoomToFovDeg(currentZoom),
            note = "Camera already at this zoom; no keyframe written",
        }
    end

    prepUndo(moho)

    local setOk, setErr = pcall(function() ch.zoom:SetValue(frame, targetZoom) end)
    if not setOk then
        return nil, "Failed to set camera zoom: " .. tostring(setErr)
    end

    finishMutation(moho, { "zoom" }, frame)

    return {
        success = true,
        changed = true,
        frame = frame,
        zoom = targetZoom,
        fovDegrees = clampedFovDeg,
        focalLength35mm = fovDegToFocalLength(clampedFovDeg),
        previousZoom = currentZoom,
        clamped = wasClamped,
    }
end

-- --------------------------------------------------------------------
-- camera.setRotation
-- --------------------------------------------------------------------

-- Set camera orientation. Moho splits this across two channels:
--   pan  -> fCameraPanTilt.y   (yaw, unconstrained)
--   tilt -> fCameraPanTilt.x   (pitch, clamped to +/- 90 deg by Moho)
--   roll -> fCameraRoll        (bank around the view axis)
-- Values are degrees by default; pass radians = true to supply radians.
-- Any axis may be omitted and keeps its current value.
function camera.setRotation(moho, params)
    if not params then return nil, "Missing parameters" end

    local ch, err = getChannels(moho)
    if not ch then return nil, err end

    local okAction, actionErr = assertNotEditingAction(moho)
    if not okAction then return nil, actionErr end

    local frame, ferr = resolveFrame(moho, params.frame)
    if frame == nil then return nil, ferr end

    local pan, tilt, roll = params.pan, params.tilt, params.roll
    if pan == nil and tilt == nil and roll == nil then
        return nil, "Provide at least one of pan, tilt, roll"
    end
    for name, v in pairs({ pan = pan, tilt = tilt, roll = roll }) do
        if v ~= nil and tonumber(v) == nil then
            return nil, name .. " must be a number"
        end
    end

    local useRadians = params.radians and true or false
    local function toRad(v)
        local n = tonumber(v)
        if n == nil then return nil end
        if useRadians then return n end
        return math.rad(n)
    end

    local currentPT = vec2table(channelValueAt(ch.pantilt, frame))
    local currentRoll = num(channelValueAt(ch.roll, frame), 0)

    local targetPan = (pan ~= nil) and toRad(pan) or currentPT.y
    local targetTilt = (tilt ~= nil) and toRad(tilt) or currentPT.x
    local targetRoll = (roll ~= nil) and toRad(roll) or currentRoll

    -- Moho clamps tilt to +/- pi/2 (lm_pantilt_camera.lua OnMouseMoved).
    local clampedTilt = clamp(targetTilt, -MAX_TILT_RAD, MAX_TILT_RAD)
    local tiltClamped = math.abs(clampedTilt - targetTilt) > 1e-9
    targetTilt = clampedTilt

    local wantPanTilt = (pan ~= nil) or (tilt ~= nil)
    local wantRoll = (roll ~= nil)

    local panTiltChanged = false
    if wantPanTilt then
        local dx = targetTilt - currentPT.x
        local dy = targetPan - currentPT.y
        panTiltChanged = math.sqrt(dx * dx + dy * dy) > 0.0001
    end
    local rollChanged = wantRoll and math.abs(targetRoll - currentRoll) > 0.0001

    if not panTiltChanged and not rollChanged then
        return {
            success = true,
            changed = false,
            frame = frame,
            rotation = {
                panDegrees = math.deg(currentPT.y),
                tiltDegrees = math.deg(currentPT.x),
                rollDegrees = math.deg(currentRoll),
            },
            note = "Camera already at this orientation; no keyframe written",
        }
    end

    prepUndo(moho)

    local touched = {}

    if panTiltChanged then
        local setOk, setErr = pcall(function()
            local vec = LM.Vector2:new_local()
            -- x = tilt, y = pan (lm_pantilt_camera.lua HandleMessage).
            vec:Set(targetTilt, targetPan)
            ch.pantilt:SetValue(frame, vec)
        end)
        if not setOk then
            return nil, "Failed to set camera pan/tilt: " .. tostring(setErr)
        end
        touched[#touched + 1] = "pantilt"
    end

    if rollChanged then
        local setOk, setErr = pcall(function() ch.roll:SetValue(frame, targetRoll) end)
        if not setOk then
            return nil, "Failed to set camera roll: " .. tostring(setErr)
        end
        touched[#touched + 1] = "roll"
    end

    finishMutation(moho, touched, frame)

    return {
        success = true,
        changed = true,
        frame = frame,
        rotation = {
            panDegrees = math.deg(targetPan),
            tiltDegrees = math.deg(targetTilt),
            rollDegrees = math.deg(targetRoll),
            panRadians = targetPan,
            tiltRadians = targetTilt,
            rollRadians = targetRoll,
        },
        previousRotation = {
            panDegrees = math.deg(currentPT.y),
            tiltDegrees = math.deg(currentPT.x),
            rollDegrees = math.deg(currentRoll),
        },
        channelsWritten = touched,
        tiltClamped = tiltClamped,
    }
end

-- --------------------------------------------------------------------
-- camera.setKeyframe
-- --------------------------------------------------------------------

-- Key a camera channel at a frame — the building block for camera moves.
--
-- Two modes:
--   no `value`  -> pin the current interpolated value as a key (AddKey), which
--                  is what Moho's camera tools do on mouse-down.
--   with `value`-> write that value at the frame (SetValue also creates the key).
--
-- `channel` accepts: track / position, zoom, roll, pantilt, or "all".
-- `value` shape per channel: track = { x, y, z }, pantilt = { pan, tilt } or
-- { x = tilt, y = pan }, zoom = number, roll = number (degrees unless
-- radians = true).
function camera.setKeyframe(moho, params)
    if not params then return nil, "Missing parameters" end

    local ch, err = getChannels(moho)
    if not ch then return nil, err end

    local okAction, actionErr = assertNotEditingAction(moho)
    if not okAction then return nil, actionErr end

    local frame, ferr = resolveFrame(moho, params.frame)
    if frame == nil then return nil, ferr end

    local requested = params.channel
    if requested == nil then requested = "all" end
    if type(requested) ~= "string" then
        return nil, "channel must be a string"
    end
    local wanted = string.lower(requested)
    wanted = wanted:gsub("[%s%-]", "")

    local keys
    if wanted == "all" then
        keys = { "track", "zoom", "roll", "pantilt" }
    else
        local canonical = CHANNEL_ALIASES[wanted]
        if not canonical then
            local valid = {}
            for alias, _ in pairs(CHANNEL_ALIASES) do valid[#valid + 1] = alias end
            table.sort(valid)
            return nil, "Unknown camera channel '" .. requested
                .. "'. Valid: all, " .. table.concat(valid, ", ")
        end
        keys = { canonical }
    end

    local useRadians = params.radians and true or false
    local value = params.value

    if value ~= nil and wanted == "all" then
        return nil, "value cannot be used with channel = 'all'; key one channel at a time to set a value"
    end

    -- Validate and pre-compute every write BEFORE PrepUndo. A validation error
    -- must not leave a stray undo entry in Moho's history.
    local values = {}
    local writers = {}

    if value ~= nil then
        for _, key in ipairs(keys) do
            local channel = ch[key]

            if key == "track" then
                if type(value) ~= "table" then
                    return nil, "value for the track channel must be a table { x, y, z }"
                end
                local current = vec3table(channelValueAt(channel, frame))
                local tx = num(value.x, current.x)
                local ty = num(value.y, current.y)
                local tz = num(value.z, current.z)
                values[key] = { x = tx, y = ty, z = tz }
                writers[key] = function()
                    local vec = LM.Vector3:new_local()
                    vec:Set(tx, ty, tz)
                    channel:SetValue(frame, vec)
                end
            elseif key == "pantilt" then
                if type(value) ~= "table" then
                    return nil, "value for the pantilt channel must be a table { pan, tilt }"
                end
                local current = vec2table(channelValueAt(channel, frame))
                local function ang(v, fallback)
                    local n = tonumber(v)
                    if n == nil then return fallback end
                    if useRadians then return n end
                    return math.rad(n)
                end
                -- Accept { pan, tilt } or raw { x = tilt, y = pan }.
                local tilt = ang(value.tilt, nil)
                if tilt == nil then tilt = ang(value.x, current.x) end
                local pan = ang(value.pan, nil)
                if pan == nil then pan = ang(value.y, current.y) end
                tilt = clamp(tilt, -MAX_TILT_RAD, MAX_TILT_RAD)
                values[key] = { panDegrees = math.deg(pan), tiltDegrees = math.deg(tilt) }
                writers[key] = function()
                    local vec = LM.Vector2:new_local()
                    vec:Set(tilt, pan)
                    channel:SetValue(frame, vec)
                end
            elseif key == "zoom" then
                local z = tonumber(value)
                if z == nil and type(value) == "table" then
                    z = tonumber(value.zoom)
                    if z == nil and value.fovDegrees ~= nil then
                        z = fovDegToZoom(tonumber(value.fovDegrees))
                    end
                end
                if z == nil then
                    return nil, "value for the zoom channel must be a number (or { zoom } / { fovDegrees })"
                end
                if z <= 0 then return nil, "zoom must be greater than 0" end
                z = clamp(z, MIN_ZOOM, MAX_ZOOM)
                values[key] = { zoom = z, fovDegrees = zoomToFovDeg(z) }
                writers[key] = function() channel:SetValue(frame, z) end
            elseif key == "roll" then
                local r = tonumber(value)
                if r == nil and type(value) == "table" then r = tonumber(value.roll) end
                if r == nil then
                    return nil, "value for the roll channel must be a number (degrees unless radians = true)"
                end
                local rollRad = useRadians and r or math.rad(r)
                values[key] = { rollDegrees = math.deg(rollRad), rollRadians = rollRad }
                writers[key] = function() channel:SetValue(frame, rollRad) end
            end
        end
    end

    prepUndo(moho)

    local written = {}

    for _, key in ipairs(keys) do
        local channel = ch[key]
        local ok, opErr

        if value == nil then
            -- Pin the current value as a key.
            ok, opErr = pcall(function() channel:AddKey(frame) end)
        else
            local writer = writers[key]
            ok, opErr = pcall(writer)
        end

        if not ok then
            return nil, "Failed to key camera channel '" .. key .. "': " .. tostring(opErr)
        end
        written[#written + 1] = key
    end

    finishMutation(moho, written, frame)

    local result = {
        success = true,
        frame = frame,
        channelsWritten = written,
        mode = (value == nil) and "pinned_current_value" or "explicit_value",
    }
    if next(values) ~= nil then result.values = values end
    return result
end

-- --------------------------------------------------------------------
-- camera.reset
-- --------------------------------------------------------------------

-- Return the camera to its default framing, using the exact semantics of the
-- Reset button in each of Moho's camera tools:
--   at frame 0   -> write the documented defaults
--   at frame > 0 -> copy whatever is on frame 0, so the reset matches the
--                   framing the artist established at the start
-- `channel` limits the reset to one channel (default: all four).
function camera.reset(moho, params)
    local ch, err = getChannels(moho)
    if not ch then return nil, err end

    local okAction, actionErr = assertNotEditingAction(moho)
    if not okAction then return nil, actionErr end

    local frame, ferr = resolveFrame(moho, params and params.frame)
    if frame == nil then return nil, ferr end

    local requested = (params and params.channel) or "all"
    if type(requested) ~= "string" then
        return nil, "channel must be a string"
    end
    local wanted = string.lower(requested):gsub("[%s%-]", "")

    local keys
    if wanted == "all" then
        keys = { "track", "zoom", "roll", "pantilt" }
    else
        local canonical = CHANNEL_ALIASES[wanted]
        if not canonical then
            return nil, "Unknown camera channel '" .. requested
                .. "'. Valid: all, track, zoom, roll, pantilt"
        end
        keys = { canonical }
    end

    prepUndo(moho)

    local written = {}
    local applied = {}

    for _, key in ipairs(keys) do
        local channel = ch[key]
        local ok, opErr

        if key == "track" then
            ok, opErr = pcall(function()
                local vec = LM.Vector3:new_local()
                if frame == 0 then
                    vec:Set(0, 0, DEFAULT_TRACK_Z)
                else
                    vec:Set(channel:GetValue(0))
                end
                channel:SetValue(frame, vec)
                applied.position = vec3table(vec)
            end)
        elseif key == "pantilt" then
            ok, opErr = pcall(function()
                local vec = LM.Vector2:new_local()
                if frame == 0 then
                    vec:Set(DEFAULT_PANTILT, DEFAULT_PANTILT)
                else
                    vec:Set(channel:GetValue(0))
                end
                channel:SetValue(frame, vec)
                local pt = vec2table(vec)
                applied.panDegrees = math.deg(pt.y)
                applied.tiltDegrees = math.deg(pt.x)
            end)
        elseif key == "zoom" then
            ok, opErr = pcall(function()
                local z = (frame == 0) and DEFAULT_ZOOM or channel:GetValue(0)
                channel:SetValue(frame, z)
                applied.zoom = num(z, DEFAULT_ZOOM)
                applied.fovDegrees = zoomToFovDeg(applied.zoom)
            end)
        elseif key == "roll" then
            ok, opErr = pcall(function()
                local r = (frame == 0) and DEFAULT_ROLL or channel:GetValue(0)
                channel:SetValue(frame, r)
                applied.rollDegrees = math.deg(num(r, 0))
            end)
        end

        if not ok then
            return nil, "Failed to reset camera channel '" .. key .. "': " .. tostring(opErr)
        end
        written[#written + 1] = key
    end

    finishMutation(moho, written, frame)

    return {
        success = true,
        frame = frame,
        channelsReset = written,
        applied = applied,
        mode = (frame == 0) and "document_defaults" or "copied_from_frame_0",
    }
end

return camera
