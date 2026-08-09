-- dynamics.lua
-- Tool handlers for bone dynamics: bone physics (region, motor, torque, flags)
-- and management of ALREADY EXISTING Smart Bone actions.
--
-- Every Moho API name used here was verified against the application's own
-- scripts and binary symbol table. Sources are cited per handler:
--   * Scripts/Tool_pro/lm_bone_physics.lua   -- fPhysicsRadius, fPhysicsMotorSpeed,
--                                               fPhysicsTorque, fPhysicsReturnToZero,
--                                               fPhysicsLockTip, IsPhysicsInEffect
--   * Scripts/Tool_pro/lm_force.lua          -- fGravityStrength, fGravityDirection,
--                                               fWind* channels on the bone layer
--   * Scripts/Tool/lm_manipulate_bones.lua   -- IsSmartBoneAction, CurrentAction
--   * Scripts/Tool/lm_select_bone.lua        -- HasAction, ActivateAction, DeleteAction
--   * Scripts/Tool/lm_reparent_bone.lua      -- channel:CountActions(), channel:Action(id)
--   * Moho binary symbols                    -- fPhysicsEnabled, fPhysicsNudge,
--                                               CountActions, ActionName, ActionByName
--
-- NOT AVAILABLE in Moho's API: spring stiffness, damping, inertia, mass and
-- friction. Moho's bone dynamics is a region/motor/torque model, not a
-- spring-damper model. See dynamics.getBonePhysics notes.

local dynamics = {}

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

-- Resolve a bone layer: returns the raw layer, the bone-layer cast and skeleton.
local function getBoneLayer(moho, layerId)
    local lyr, err = getLayerById(moho, layerId)
    if not lyr then return nil, nil, nil, err end

    local isBoneOk, isBone = pcall(function() return lyr:IsBoneType() end)
    if not isBoneOk or not isBone then
        return nil, nil, nil, "Layer " .. tostring(layerId) .. " is not a bone layer"
    end

    local castOk, boneLyr = pcall(function() return moho:LayerAsBone(lyr) end)
    if not castOk or not boneLyr then
        return nil, nil, nil, "Failed to cast layer " .. tostring(layerId) .. " to a bone layer"
    end

    local skelOk, skel = pcall(function() return boneLyr:Skeleton() end)
    if not skelOk or not skel then
        return nil, nil, nil, "Failed to get skeleton from bone layer " .. tostring(layerId)
    end

    return lyr, boneLyr, skel
end

-- Resolve a single bone with a full index-range check (0..CountBones()-1).
local function getBone(moho, layerId, boneId)
    local lyr, boneLyr, skel, err = getBoneLayer(moho, layerId)
    if not lyr then return nil, nil, nil, err end

    if type(boneId) ~= "number" then
        return nil, nil, nil, "boneId must be a number"
    end

    local countOk, count = pcall(function() return skel:CountBones() end)
    if not countOk or type(count) ~= "number" then
        return nil, nil, nil, "Failed to count bones on layer " .. tostring(layerId)
    end
    if count < 1 then
        return nil, nil, nil, "Bone layer " .. tostring(layerId) .. " has no bones"
    end

    local idx = math.floor(boneId)
    if idx < 0 or idx >= count then
        return nil, nil, nil, "Bone index " .. tostring(boneId)
            .. " out of range (0.." .. tostring(count - 1) .. ")"
    end

    local boneOk, boneObj = pcall(function() return skel:Bone(idx) end)
    if not boneOk or not boneObj then
        return nil, nil, nil, "Failed to retrieve bone " .. tostring(idx)
    end

    return boneObj, skel, lyr
end

-- Safe field readers. Moho raises on fields absent in a given build, so every
-- access is wrapped: a missing field yields nil rather than killing the script.
local function readNum(owner, field)
    local ok, v = pcall(function() return owner[field] end)
    if ok and type(v) == "number" then return v end
    return nil
end

local function readBool(owner, field)
    local ok, v = pcall(function() return owner[field] end)
    if ok and type(v) == "boolean" then return v end
    if ok and v ~= nil then return v and true or false end
    return nil
end

-- Read the current value of an animated channel (AnimVal). Moho exposes both a
-- `.value` shortcut (used by lm_bone_physics.lua) and GetValue(frame).
local function readChannel(owner, field, frame)
    local chOk, ch = pcall(function() return owner[field] end)
    if not chOk or ch == nil then return nil end

    if frame ~= nil then
        local gOk, gv = pcall(function() return ch:GetValue(frame) end)
        if gOk and type(gv) == "number" then return gv end
    end

    local vOk, v = pcall(function() return ch.value end)
    if vOk and type(v) == "number" then return v end
    return nil
end

local function currentFrame(moho)
    local ok, f = pcall(function() return moho.frame end)
    if ok and type(f) == "number" then return f end
    local dOk, df = pcall(function() return moho.document:CurrentFrame() end)
    if dOk and type(df) == "number" then return df end
    return 0
end

-- Layer frame is what channel setters expect (see lm_bone_physics.lua:243).
local function layerFrame(moho)
    local ok, f = pcall(function() return moho.layerFrame end)
    if ok and type(f) == "number" then return f end
    return currentFrame(moho)
end

local function degOf(rad)
    if type(rad) ~= "number" then return nil end
    local ok, d = pcall(function() return math.deg(rad) end)
    if ok then return d end
    return nil
end

-- --------------------------------------------------------------------
-- dynamics.getBonePhysics
-- Read the physics parameters of one bone, plus the layer-level force field
-- that drives the simulation.
--
-- Moho's model (verified, Scripts/Tool_pro/lm_bone_physics.lua):
--   fPhysicsRadius       number  physics region size. A negative value means
--                                "not set" -- Moho falls back to fStrength.
--   fPhysicsMotorSpeed   AnimVal angular motor speed in RADIANS (animatable)
--   fPhysicsTorque       number  motor torque, stored as UI value * 1000
--   fPhysicsReturnToZero bool    spring back to the neutral angle
--   fPhysicsLockTip      bool    pin the bone tip
--   fPhysicsEnabled      bool    binary symbol; reported only when present
--   fPhysicsNudge        number  binary symbol; reported only when present
--
-- There is deliberately no spring/damping/inertia/mass reported: those fields
-- do not exist anywhere in Moho's API. `fPhysicsReturnToZero` is the closest
-- analogue to a spring, and `fPhysicsRadius` scales the simulated influence.
-- --------------------------------------------------------------------

function dynamics.getBonePhysics(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end

    local b, skel, lyr, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    local frame = params.frame
    if frame ~= nil and type(frame) ~= "number" then
        return nil, "frame must be a number"
    end
    if frame == nil then frame = currentFrame(moho) end

    local result = {
        layerId = params.layerId,
        boneId  = math.floor(params.boneId),
        frame   = frame,
    }

    local nameOk, name = pcall(function() return b:Name() end)
    result.name = (nameOk and name) or ""

    -- Physics region. Negative radius means "unset"; Moho substitutes fStrength.
    local radius = readNum(b, "fPhysicsRadius")
    local strength = readNum(b, "fStrength")
    result.radius = radius
    result.strength = strength
    if radius ~= nil and radius < 0 then
        result.radiusIsUnset = true
        result.effectiveRadius = strength
    else
        result.radiusIsUnset = false
        result.effectiveRadius = radius
    end

    -- Motor speed is stored in radians; expose both units to avoid ambiguity.
    local motorRad = readChannel(b, "fPhysicsMotorSpeed", frame)
    result.motorSpeedRad = motorRad
    result.motorSpeedDeg = degOf(motorRad)

    -- Torque is stored as the UI value multiplied by 1000 (lm_bone_physics.lua:198,217).
    local torqueRaw = readNum(b, "fPhysicsTorque")
    result.torqueRaw = torqueRaw
    if torqueRaw ~= nil then result.torque = torqueRaw / 1000.0 end

    result.returnToZero = readBool(b, "fPhysicsReturnToZero")
    result.lockTip      = readBool(b, "fPhysicsLockTip")

    -- Present in the binary symbol table but unused by Moho's own scripts:
    -- reported only when this build actually exposes them.
    local enabled = readBool(b, "fPhysicsEnabled")
    if enabled ~= nil then result.physicsEnabled = enabled end
    local nudge = readNum(b, "fPhysicsNudge")
    if nudge ~= nil then result.nudge = nudge end

    -- Layer-level context: whether physics actually runs, and the force field.
    local layerInfo = {}
    local effOk, inEffect = pcall(function() return lyr:IsPhysicsInEffect(frame) end)
    if effOk and inEffect ~= nil then layerInfo.physicsInEffect = inEffect and true or false end

    local parentOk, physParent = pcall(function() return lyr:PhysicsParent(-1) end)
    if parentOk then layerInfo.hasPhysicsParent = (physParent ~= nil) end

    local _, boneLyr = getBoneLayer(moho, params.layerId)
    if boneLyr then
        layerInfo.gravityStrength      = readChannel(boneLyr, "fGravityStrength", frame)
        layerInfo.gravityDirection     = readChannel(boneLyr, "fGravityDirection", frame)
        layerInfo.windStrength         = readChannel(boneLyr, "fWindStrength", frame)
        layerInfo.windDirection        = readChannel(boneLyr, "fWindDirection", frame)
        layerInfo.windTurbulentAmp     = readChannel(boneLyr, "fWindTurbulentAmplitude", frame)
        layerInfo.windTurbulentFreq    = readChannel(boneLyr, "fWindTurbulentFrequency", frame)
    end
    result.layer = layerInfo

    -- Moho gates the Bone Physics tool to frame 0 (lm_bone_physics.lua:52).
    result.editableAtThisFrame = (frame == 0)
    result.unsupportedParameters = {
        "spring", "springStiffness", "damping", "inertia", "mass", "friction",
    }

    return result
end

-- --------------------------------------------------------------------
-- dynamics.setBonePhysics
-- Write physics parameters onto one bone.
--
-- Non-animated fields (radius, torque, returnToZero, lockTip) are frame-0 only,
-- mirroring Moho's own tool: editing them on a later frame is silently ignored
-- by the simulation, so this handler refuses instead of pretending to succeed.
-- Motor speed is an animated channel and may be keyed on any frame.
-- --------------------------------------------------------------------

function dynamics.setBonePhysics(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end

    local b, skel, lyr, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    -- Reject the spring-damper vocabulary explicitly: silently dropping these
    -- would look like a working call that changes nothing.
    local unsupported = {
        spring = true, springStiffness = true, stiffness = true,
        damping = true, damp = true, inertia = true, mass = true, friction = true,
    }
    for key in pairs(params) do
        if unsupported[key] then
            return nil, "Parameter '" .. tostring(key)
                .. "' does not exist in Moho's bone physics API. Moho uses a "
                .. "region/motor/torque model: use radius, motorSpeed, torque, "
                .. "returnToZero, lockTip instead."
        end
    end

    if params.radius ~= nil and type(params.radius) ~= "number" then
        return nil, "radius must be a number"
    end
    if params.radius ~= nil and params.radius < 0 then
        return nil, "radius must be >= 0 (Moho clamps negative values to 0)"
    end
    if params.torque ~= nil and type(params.torque) ~= "number" then
        return nil, "torque must be a number"
    end
    if params.torqueRaw ~= nil and type(params.torqueRaw) ~= "number" then
        return nil, "torqueRaw must be a number"
    end
    if params.motorSpeedRad ~= nil and type(params.motorSpeedRad) ~= "number" then
        return nil, "motorSpeedRad must be a number"
    end
    if params.motorSpeedDeg ~= nil and type(params.motorSpeedDeg) ~= "number" then
        return nil, "motorSpeedDeg must be a number"
    end
    if params.returnToZero ~= nil and type(params.returnToZero) ~= "boolean" then
        return nil, "returnToZero must be a boolean"
    end
    if params.lockTip ~= nil and type(params.lockTip) ~= "boolean" then
        return nil, "lockTip must be a boolean"
    end
    if params.enabled ~= nil and type(params.enabled) ~= "boolean" then
        return nil, "enabled must be a boolean"
    end

    local wantsStatic = (params.radius ~= nil) or (params.torque ~= nil)
        or (params.torqueRaw ~= nil) or (params.returnToZero ~= nil)
        or (params.lockTip ~= nil) or (params.enabled ~= nil)
    local wantsMotor = (params.motorSpeedRad ~= nil) or (params.motorSpeedDeg ~= nil)

    if not wantsStatic and not wantsMotor then
        return nil, "Nothing to set: provide at least one of radius, torque, "
            .. "torqueRaw, motorSpeedRad, motorSpeedDeg, returnToZero, lockTip, enabled"
    end

    local frame = currentFrame(moho)
    if wantsStatic and frame ~= 0 then
        return nil, "Bone physics setup fields (radius, torque, returnToZero, "
            .. "lockTip, enabled) can only be edited on frame 0; current frame is "
            .. tostring(frame) .. ". Set the document to frame 0 first, or pass "
            .. "only motorSpeedRad/motorSpeedDeg to key the animated motor channel."
    end

    -- PrepUndo BEFORE any mutation, matching lm_bone_physics.lua:80 and :212.
    -- Without it the edit is not reversible with Cmd+Z inside Moho.
    local undoOk = pcall(function() moho.document:PrepUndo(lyr, true) end)
    if not undoOk then
        return nil, "Failed to open an undo record; refusing to mutate bone physics"
    end

    local changed = {}
    local failures = {}

    if params.radius ~= nil then
        local ok = pcall(function() b.fPhysicsRadius = params.radius end)
        if ok then changed.radius = params.radius else failures[#failures + 1] = "radius" end
    end

    -- Torque: prefer the raw internal value when both are supplied.
    if params.torqueRaw ~= nil then
        local ok = pcall(function() b.fPhysicsTorque = params.torqueRaw end)
        if ok then
            changed.torqueRaw = params.torqueRaw
            changed.torque = params.torqueRaw / 1000.0
        else
            failures[#failures + 1] = "torqueRaw"
        end
    elseif params.torque ~= nil then
        local raw = params.torque * 1000.0
        local ok = pcall(function() b.fPhysicsTorque = raw end)
        if ok then
            changed.torque = params.torque
            changed.torqueRaw = raw
        else
            failures[#failures + 1] = "torque"
        end
    end

    if params.returnToZero ~= nil then
        local ok = pcall(function() b.fPhysicsReturnToZero = params.returnToZero end)
        if ok then changed.returnToZero = params.returnToZero else failures[#failures + 1] = "returnToZero" end
    end

    if params.lockTip ~= nil then
        local ok = pcall(function() b.fPhysicsLockTip = params.lockTip end)
        if ok then changed.lockTip = params.lockTip else failures[#failures + 1] = "lockTip" end
    end

    -- fPhysicsEnabled exists in the binary but no Moho script touches it; treat
    -- a failure here as "not available in this build" rather than a hard error.
    if params.enabled ~= nil then
        local ok = pcall(function() b.fPhysicsEnabled = params.enabled end)
        if ok then
            changed.physicsEnabled = params.enabled
        else
            failures[#failures + 1] = "enabled (fPhysicsEnabled not exposed by this Moho build)"
        end
    end

    -- Motor speed is animatable: key it on the layer frame, in radians.
    if wantsMotor then
        local rad = params.motorSpeedRad
        if rad == nil then
            local converted = pcall(function() return math.rad(params.motorSpeedDeg) end)
            if converted then rad = math.rad(params.motorSpeedDeg) end
        end
        if type(rad) ~= "number" then
            failures[#failures + 1] = "motorSpeed (could not resolve a numeric value)"
        else
            local lf = layerFrame(moho)
            local ok = pcall(function() b.fPhysicsMotorSpeed:SetValue(lf, rad) end)
            if ok then
                changed.motorSpeedRad = rad
                changed.motorSpeedDeg = degOf(rad)
                changed.motorKeyframeFrame = lf
                -- Register the new keyframe on the motor channel, as Moho's own
                -- tool does (lm_bone_physics.lua:247). The channel constant is a
                -- bare global there, so guard against builds without it.
                pcall(function()
                    if CHANNEL_BONE_MOTOR ~= nil then
                        moho:NewKeyframe(CHANNEL_BONE_MOTOR)
                    end
                end)
            else
                failures[#failures + 1] = "motorSpeed"
            end
        end
    end

    if next(changed) == nil then
        return nil, "No physics parameter could be written. Failed fields: "
            .. table.concat(failures, ", ")
    end

    pcall(function() moho.document:SetDirty() end)
    -- Rebuild the frame so the simulation picks the new parameters up.
    pcall(function() lyr:UpdateCurFrame() end)

    local result = {
        success = true,
        layerId = params.layerId,
        boneId  = math.floor(params.boneId),
        frame   = frame,
        changed = changed,
    }
    if #failures > 0 then result.failed = failures end
    return result
end

-- --------------------------------------------------------------------
-- Smart Bone helpers
--
-- Moho's Smart Bone convention (Scripts/Tool/lm_select_bone.lua:1599-1640):
-- a Smart Bone action is a layer action whose NAME EQUALS THE BONE NAME.
-- There is no bone->action pointer; the binding is by name. Hence:
--   layer:HasAction(boneName)            -- does the action exist
--   layer:IsSmartBoneAction(boneName)    -- is it a Smart Bone action
--   layer:ActivateAction(name) / ("")    -- enter / leave the action
--   layer:DeleteAction(name)             -- remove it
-- --------------------------------------------------------------------

local function boneName(b)
    local ok, n = pcall(function() return b:Name() end)
    if ok and type(n) == "string" then return n end
    return nil
end

local function hasAction(lyr, name)
    local ok, has = pcall(function() return lyr:HasAction(name) end)
    if ok and has ~= nil then return has and true or false end
    return nil
end

local function isSmartBoneAction(lyr, name)
    local ok, isSmart = pcall(function() return lyr:IsSmartBoneAction(name) end)
    if ok and isSmart ~= nil then return isSmart and true or false end
    return nil
end

-- Derive the angular range of a Smart Bone action from its keyframes.
--
-- IMPORTANT -- this is DERIVED, not read from a property. Moho stores no
-- min/max angle field for Smart Bones (verified: no fMinAngle / fMaxAngle /
-- AngleRange symbol exists). In a Smart Bone action the timeline axis IS the
-- bone angle: frame N corresponds to N degrees of rotation. The reachable
-- range is therefore the keyframe extent of the action's channels.
--
-- Enumeration uses the verified channel-level action API
-- (Scripts/Tool/lm_reparent_bone.lua:254-255):
--   channel:CountActions() / channel:Action(id) + moho:ChannelAsAnimVal(...)
local function deriveActionRange(moho, b)
    local channels = { "fAnimAngle", "fAnimPos", "fAnimScale" }
    local maxFrame = nil
    local keyCount = 0
    local scanned = {}

    for _, chName in ipairs(channels) do
        local chOk, ch = pcall(function() return b[chName] end)
        if chOk and ch ~= nil then
            local cOk, actionCount = pcall(function() return ch:CountActions() end)
            if cOk and type(actionCount) == "number" and actionCount > 0 then
                scanned[#scanned + 1] = chName
                for actionID = 0, actionCount - 1 do
                    pcall(function()
                        local raw = ch:Action(actionID)
                        if raw == nil then return end
                        local action = moho:ChannelAsAnimVal(raw)
                        if action == nil then return end
                        local keys = action:CountKeys()
                        if type(keys) ~= "number" then return end
                        for keyID = 0, keys - 1 do
                            local when = action:GetKeyWhen(keyID)
                            if type(when) == "number" then
                                keyCount = keyCount + 1
                                if maxFrame == nil or when > maxFrame then
                                    maxFrame = when
                                end
                            end
                        end
                    end)
                end
            end
        end
    end

    return {
        -- Frame extent of the action == degrees of bone rotation it covers.
        maxActionFrame       = maxFrame,
        impliedMaxAngleDeg   = maxFrame,
        keyframesFound       = keyCount,
        channelsWithActions  = scanned,
        derivation           = "frame extent of action keyframes; Moho maps 1 action frame to 1 degree of bone rotation",
    }
end

-- --------------------------------------------------------------------
-- dynamics.getSmartBone
-- Report the Smart Bone state of one bone: whether an action is bound, whether
-- Moho classifies it as a Smart Bone action, and the derived angular range.
-- --------------------------------------------------------------------

function dynamics.getSmartBone(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end

    local b, skel, lyr, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    local name = boneName(b)
    if not name then
        return nil, "Could not read the name of bone " .. tostring(params.boneId)
            .. "; Smart Bone actions are bound by bone name, so the name is required"
    end

    local result = {
        layerId  = params.layerId,
        boneId   = math.floor(params.boneId),
        boneName = name,
        -- The action name IS the bone name: that is the whole binding mechanism.
        actionName = name,
    }

    result.hasAction = hasAction(lyr, name)
    result.isSmartBone = isSmartBoneAction(lyr, name)

    local curOk, cur = pcall(function() return lyr:CurrentAction() end)
    if curOk and cur ~= nil then
        result.layerCurrentAction = cur
        result.isCurrentlyEditing = (cur == name)
    end

    local docOk, docAction = pcall(function() return moho.document:CurrentDocAction() end)
    if docOk and docAction ~= nil then result.documentCurrentAction = docAction end

    if result.hasAction then
        result.range = deriveActionRange(moho, b)
    else
        result.range = nil
        result.note = "No action named '" .. name .. "' exists on this layer, so this "
            .. "bone is not a Smart Bone. Create one first."
    end

    -- Angle constraints are a separate mechanism from the Smart Bone range, but
    -- they bound how far the dial can actually be driven, so report them.
    local constraints = {}
    constraints.enabled  = readBool(b, "fConstraints")
    local minC = readNum(b, "fMinConstraint")
    local maxC = readNum(b, "fMaxConstraint")
    constraints.minAngleRad = minC
    constraints.maxAngleRad = maxC
    constraints.minAngleDeg = degOf(minC)
    constraints.maxAngleDeg = degOf(maxC)
    result.angleConstraints = constraints

    return result
end

-- --------------------------------------------------------------------
-- dynamics.setSmartBoneRange
--
-- Moho exposes NO settable angular range for a Smart Bone. Verified absent from
-- both the bundled scripts and the binary symbol table: there is no fMinAngle,
-- fMaxAngle, AngleRange, SetActionRange or equivalent. A Smart Bone action's
-- range is an emergent property of WHERE ITS KEYFRAMES SIT -- the action's
-- timeline axis is the bone angle, one frame per degree.
--
-- So this handler does not invent a setter. It reports the current derived
-- range and the two real mechanisms that change it, and refuses to mutate.
-- Redefining the range means re-timing the artist's keyframes inside the
-- action, which would destroy authored interpolation; that is a deliberate
-- keyframe operation, not a range property write.
--
-- The one genuinely settable angular limit is the bone's angle constraint pair
-- (fMinConstraint / fMaxConstraint), which is already owned by
-- bone.setConstraints -- use that rather than duplicating it here.
-- --------------------------------------------------------------------

function dynamics.setSmartBoneRange(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end

    local b, skel, lyr, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    local name = boneName(b) or ""
    local current = nil
    if hasAction(lyr, name) then
        current = deriveActionRange(moho, b)
    end

    local detail = "Moho has no settable Smart Bone angle range. A Smart Bone "
        .. "action's range is defined by the position of its keyframes: the "
        .. "action timeline axis is the bone angle, one frame per degree. "
        .. "To change the range either (1) move or add keyframes inside the "
        .. "action for bone '" .. name .. "' via the animation tools, or "
        .. "(2) set the bone's angle limits with bone.setConstraints "
        .. "(fMinConstraint / fMaxConstraint), which is the only angular range "
        .. "Moho stores as a property."

    if current and current.impliedMaxAngleDeg ~= nil then
        detail = detail .. " Current derived range for this bone: 0.."
            .. tostring(current.impliedMaxAngleDeg) .. " degrees ("
            .. tostring(current.keyframesFound) .. " action keyframes)."
    end

    return nil, detail
end

-- --------------------------------------------------------------------
-- dynamics.listSmartBones
-- Enumerate which bones of a bone layer are Smart Bones.
-- A bone is a Smart Bone when the layer owns an action named after it and Moho
-- classifies that action as a Smart Bone action.
-- --------------------------------------------------------------------

function dynamics.listSmartBones(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end

    local lyr, boneLyr, skel, err = getBoneLayer(moho, params.layerId)
    if not lyr then return nil, err end

    local countOk, count = pcall(function() return skel:CountBones() end)
    if not countOk or type(count) ~= "number" then
        return nil, "Failed to count bones on layer " .. tostring(params.layerId)
    end

    local includeRange = params.includeRange and true or false

    local smartBones = {}
    local scanned = 0
    local unreadable = {}

    for i = 0, count - 1 do
        local bOk, b = pcall(function() return skel:Bone(i) end)
        if bOk and b then
            scanned = scanned + 1
            local name = boneName(b)
            if name then
                local has = hasAction(lyr, name)
                if has then
                    local isSmart = isSmartBoneAction(lyr, name)
                    -- Keep name-matched actions even when the classifier is
                    -- unavailable, flagging the uncertainty instead of guessing.
                    if isSmart ~= false then
                        local entry = {
                            boneId     = i,
                            boneName   = name,
                            actionName = name,
                            isSmartBone = isSmart,
                        }
                        if isSmart == nil then
                            entry.classifierUnavailable = true
                        end
                        if includeRange then
                            entry.range = deriveActionRange(moho, b)
                        end
                        smartBones[#smartBones + 1] = entry
                    end
                end
            else
                unreadable[#unreadable + 1] = i
            end
        else
            unreadable[#unreadable + 1] = i
        end
    end

    local result = {
        layerId    = params.layerId,
        boneCount  = count,
        scanned    = scanned,
        smartBones = smartBones,
        count      = #smartBones,
    }
    if #unreadable > 0 then result.unreadableBones = unreadable end

    local maxOk, atMax = pcall(function() return moho:HasMaximumSmartBones() end)
    if maxOk and atMax ~= nil then result.atSmartBoneLimit = atMax and true or false end

    local curOk, cur = pcall(function() return lyr:CurrentAction() end)
    if curOk and cur ~= nil then result.layerCurrentAction = cur end

    return result
end

return dynamics
