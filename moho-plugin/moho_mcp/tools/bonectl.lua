-- bonectl.lua
-- Extended bone control: the rigging-side bone properties that bone.lua does
-- not cover. bone.lua owns transform/constraints/parenting/target-layer/create/
-- delete; this module owns visibility, locking, binding strength, IK exclusion,
-- squash-and-stretch scaling, flipping, fixed angle, renaming, and a single
-- read-everything call.
--
-- Bone physics (fBoneDynamics, fAngle*Force, fWind*, fGravity*) is deliberately
-- absent: it belongs to moho_mcp.tools.dynamics. Do not add it here.
--
-- Every Moho API name below was verified against the application's own scripts
-- and its binary symbol table. Sources are cited per handler:
--   * Scripts/Tool/lm_select_bone.lua      -- fHidden, fShy, fFixedAngle,
--                                             fScalingMode, fSquashStretchScaling,
--                                             fMaxAutoScaling, fIgnoredByIK,
--                                             EnableArcSolver/IsArcSolverEnabled,
--                                             LockBone/UnlockBone, SetName +
--                                             MakeBoneNameUnique, fTargetBone,
--                                             Tags/IsLabelShowing
--   * Scripts/Tool/lm_transform_bone.lua   -- FlipBone, fFlipH/fFlipV channels,
--                                             IsGroupVisible
--   * Scripts/Tool/lm_bone_strength.lua    -- fStrength and its >= 0 clamp
--   * Scripts/Tool/lm_manipulate_bones.lua -- fIgnoredByIK in IK chain walking
--   * Scripts/Tool/lm_sketch_bones.lua     -- fStrength defaults, IsBoneATarget
--   * Scripts/Tool/lm_reparent_bone.lua    -- fTargetBone:SetValue(frame, id)
--   * Scripts/Utility/lm_channel_codes.lua -- CHANNEL_BONE_LOCK / _FLIPH / _FLIPV
--   * Moho binary symbols                  -- fAnimParent, TargetOfBone,
--                                             TargetOfBoneChain, IsBoneATarget

local bonectl = {}

-- Channel codes used when a mutation lands on an animated channel. Moho defines
-- these globally via Scripts/Utility/lm_channel_codes.lua, but that file is not
-- guaranteed to have been loaded in our host context, so every use is nil-guarded
-- and we keep local fallbacks with the documented numeric values.
local CH_BONE_LOCK  = 10104
local CH_BONE_FLIPH = 10100
local CH_BONE_FLIPV = 10102

-- --------------------------------------------------------------------
-- Helpers (same shape as bone.lua / dynamics.lua)
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

-- Resolve a bone: returns bone, skeleton, raw layer. Validates that the layer is
-- a bone layer and that boneId is inside 0..CountBones()-1 BEFORE indexing --
-- M_Skeleton:Bone() with an out-of-range index aborts the script inside Moho and
-- the bridge would only see a timeout.
local function getBone(moho, layerId, boneId)
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

    local bOk, b = pcall(function() return skel:Bone(idx) end)
    if not bOk or not b then
        return nil, nil, nil, "Failed to retrieve bone " .. tostring(idx)
    end
    return b, skel, lyr
end

-- Channel setters expect the layer-relative frame, not the document frame
-- (lm_select_bone.lua uses moho.layerFrame for LockBone and fTargetBone).
local function layerFrame(moho)
    local ok, f = pcall(function() return moho.layerFrame end)
    if ok and type(f) == "number" then return f end
    local dOk, df = pcall(function() return moho.document:CurrentFrame() end)
    if dOk and type(df) == "number" then return df end
    return 0
end

-- Read a plain field; returns nil when the field is absent on this Moho build.
local function field(b, name)
    local ok, v = pcall(function() return b[name] end)
    if ok then return v end
    return nil
end

-- Read an animated channel's value at a frame, falling back to its .value.
local function channelAt(b, name, frame)
    local ch = field(b, name)
    if ch == nil then return nil end
    local gOk, v = pcall(function() return ch:GetValue(frame) end)
    if gOk and v ~= nil then return v end
    local vOk, v2 = pcall(function() return ch.value end)
    if vOk then return v2 end
    return nil
end

-- PrepUndo must run BEFORE the mutation or the edit is not undoable with Cmd+Z
-- inside Moho. Our operation journal is an audit trail, it rolls nothing back,
-- so a missing PrepUndo means the user's work is unrecoverable.
-- The `true` second argument matches Moho's own bone-property editing
-- (lm_select_bone.lua: self.document:PrepUndo(self.layer, true)).
local function prepUndo(moho, lyr)
    pcall(function() moho.document:PrepUndo(lyr, true) end)
end

local function markDirty(moho)
    pcall(function() moho.document:SetDirty() end)
end

-- Rebuild the layer's current frame so the viewport reflects the change.
local function refresh(lyr)
    pcall(function() lyr:UpdateCurFrame(true) end)
end

local function newKeyframe(moho, code)
    if code == nil then return end
    pcall(function() moho:NewKeyframe(code) end)
end

local function boneName(b)
    local ok, n = pcall(function() return b:Name() end)
    if ok and type(n) == "string" then return n end
    return ""
end

local function asBool(v)
    if v == nil then return nil end
    return v and true or false
end

-- --------------------------------------------------------------------
-- bonectl.getFullState
-- Read every extended bone parameter in one call. READ ONLY: no PrepUndo and no
-- SetDirty here. Flagging the document dirty after a pure read would tell the
-- user they have unsaved changes when they do not.
--
-- Fields that do not exist on the running Moho build (Debut vs Pro differ; the
-- Pro-only properties are gated by MOHO.IsMohoPro() in lm_select_bone.lua) are
-- simply omitted rather than reported as false.
-- --------------------------------------------------------------------

function bonectl.getFullState(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end

    local b, skel, _, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    local boneId = math.floor(params.boneId)
    local frame = params.frame
    if type(frame) ~= "number" then frame = layerFrame(moho) end
    frame = math.floor(frame)

    local state = {
        layerId = params.layerId,
        boneId  = boneId,
        frame   = frame,
        name    = boneName(b),
    }

    -- Visibility. fHidden is the actual per-bone hide flag; fShy is the user
    -- intent that drives it (lm_select_bone.lua:1571-1572 sets fShy then mirrors
    -- it into fHidden). IsGroupVisible() reports the bone group's visibility,
    -- which suppresses the bone independently of fHidden.
    local visibility = {}
    visibility.hidden = asBool(field(b, "fHidden"))
    local shy = field(b, "fShy")
    if shy ~= nil then visibility.shy = asBool(shy) end
    local gvOk, groupVisible = pcall(function() return b:IsGroupVisible() end)
    if gvOk and groupVisible ~= nil then visibility.groupVisible = asBool(groupVisible) end
    local lblOk, labelShowing = pcall(function() return b:IsLabelShowing() end)
    if lblOk and labelShowing ~= nil then visibility.labelShowing = asBool(labelShowing) end
    state.visibility = visibility

    -- Locking. Moho exposes M_Skeleton:LockBone / :UnlockBone but NO query for
    -- the current lock state (verified: no IsBoneLocked / fLocked / fBoneLock in
    -- either the bundled scripts or the binary symbol table). Moho's own UI does
    -- not read it back either. So we report only whether this bone CAN be locked:
    -- lm_select_bone.lua locks only bones with fParent >= 0.
    local parent = field(b, "fParent")
    state.lock = {
        lockable  = (type(parent) == "number" and parent >= 0) or false,
        stateKnown = false,
        note = "Moho exposes LockBone/UnlockBone but no lock-state query; current lock state is not readable",
    }

    -- Binding strength: how much geometry this bone captures (lm_bone_strength.lua).
    local strength = field(b, "fStrength")
    if type(strength) == "number" then state.strength = strength end

    -- IK behaviour. fIgnoredByIK removes the bone from IK chain solving
    -- (lm_manipulate_bones.lua:326, :543). The arc solver and max auto-scaling
    -- are the other two IK-side switches in the same dialog section.
    local ik = {}
    local ignored = field(b, "fIgnoredByIK")
    if ignored ~= nil then ik.ignoredByIK = asBool(ignored) end
    local arcOk, arc = pcall(function() return b:IsArcSolverEnabled() end)
    if arcOk and arc ~= nil then ik.arcSolver = asBool(arc) end
    local maxAuto = field(b, "fMaxAutoScaling")
    if type(maxAuto) == "number" then ik.maxAutoScaling = maxAuto end
    local fixed = field(b, "fFixedAngle")
    if fixed ~= nil then ik.fixedAngle = asBool(fixed) end
    if next(ik) ~= nil then state.ik = ik end

    -- Scaling mode: squash and stretch. lm_select_bone.lua treats 2 as
    -- squash-and-stretch and 0 as normal; fSquashStretchScaling is the maximum
    -- stretch factor, clamped by Moho to 0.01..100.
    local scaling = {}
    local mode = field(b, "fScalingMode")
    if type(mode) == "number" then
        scaling.mode = mode
        scaling.squashStretch = (mode == 2)
    end
    local maxStretch = field(b, "fSquashStretchScaling")
    if type(maxStretch) == "number" then scaling.maxStretch = maxStretch end
    if next(scaling) ~= nil then state.scaling = scaling end

    -- Flip. fFlipH / fFlipV are ANIMATED channels, not plain booleans
    -- (lm_transform_bone.lua:1129-1131 uses :SetValue(frame, ...) / .value).
    local flip = {}
    local fh = channelAt(b, "fFlipH", frame)
    if fh ~= nil then flip.horizontal = asBool(fh) end
    local fv = channelAt(b, "fFlipV", frame)
    if fv ~= nil then flip.vertical = asBool(fv) end
    if next(flip) ~= nil then state.flip = flip end

    -- Fixed angle: the bone does not inherit its parent's rotation
    -- (lm_transform_bone.lua:768, lm_manipulate_bones.lua:274).
    local fixedAngle = field(b, "fFixedAngle")
    if fixedAngle ~= nil then state.fixedAngle = asBool(fixedAngle) end

    -- Target bone (IK target). fTargetBone is an animated int channel; the
    -- skeleton also answers the reverse questions.
    local target = {}
    local tb = channelAt(b, "fTargetBone", frame)
    if type(tb) == "number" then target.targetBoneId = tb end
    local tobOk, tob = pcall(function() return skel:TargetOfBone(boneId, frame) end)
    if tobOk and type(tob) == "number" then target.targetOfBone = tob end
    local chainOk, chain = pcall(function() return skel:TargetOfBoneChain(boneId, frame) end)
    if chainOk and type(chain) == "number" then target.targetOfBoneChain = chain end
    local isTOk, isT = pcall(function() return skel:IsBoneATarget(boneId, frame) end)
    if isTOk and isT ~= nil then target.isATarget = asBool(isT) end
    if next(target) ~= nil then state.target = target end

    -- Animated parent: re-parenting over time (handing a prop between hands).
    local animParent = channelAt(b, "fAnimParent", frame)
    if type(animParent) == "number" then state.animParentId = animParent end

    -- Control-bone wiring: one bone driving another.
    local control = {}
    local pcp = field(b, "fPosControlParent")
    if type(pcp) == "number" then control.posControlParent = pcp end
    local acp = field(b, "fAngleControlParent")
    if type(acp) == "number" then control.angleControlParent = acp end
    local scp = field(b, "fScaleControlParent")
    if type(scp) == "number" then control.scaleControlParent = scp end
    if next(control) ~= nil then state.control = control end

    -- Colour tag (used to group bones visually in dense rigs).
    local tagOk, tag = pcall(function() return b:Tags() end)
    if tagOk and type(tag) == "number" then state.colorTag = tag end

    if type(parent) == "number" then state.parentId = parent end
    local selected = field(b, "fSelected")
    if selected ~= nil then state.selected = asBool(selected) end

    return state
end

-- --------------------------------------------------------------------
-- bonectl.setVisibility
-- Hide or show a bone. Hidden bones cannot be picked in the viewport, which is
-- how a dense rig stays workable (lm_select_bone.lua:280 and
-- lm_transform_bone.lua:106 both skip bones with fHidden set).
--
-- Moho's own UI keeps fShy and fHidden in sync (fHidden = fShy), so by default
-- we mirror that. Pass shy=false explicitly to hide a bone for this session
-- without marking it shy.
-- --------------------------------------------------------------------

function bonectl.setVisibility(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end
    if params.hidden == nil then return nil, "Missing required parameter: hidden" end
    if type(params.hidden) ~= "boolean" then return nil, "hidden must be a boolean" end
    if params.shy ~= nil and type(params.shy) ~= "boolean" then
        return nil, "shy must be a boolean"
    end

    local b, _, lyr, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    if field(b, "fHidden") == nil then
        return nil, "This Moho build does not expose bone.fHidden"
    end

    prepUndo(moho, lyr)

    local applied = {}

    -- fShy first, then fHidden, matching lm_select_bone.lua:1571-1572.
    local wantShy = params.shy
    if wantShy == nil then wantShy = params.hidden end
    if field(b, "fShy") ~= nil then
        local shyOk = pcall(function() b.fShy = wantShy end)
        if shyOk then applied.shy = wantShy end
    end

    local ok, setErr = pcall(function() b.fHidden = params.hidden end)
    if not ok then
        return nil, "Failed to set bone visibility: " .. tostring(setErr)
    end
    applied.hidden = params.hidden

    markDirty(moho)
    refresh(lyr)

    return {
        success = true,
        layerId = params.layerId,
        boneId  = math.floor(params.boneId),
        name    = boneName(b),
        applied = applied,
    }
end

-- --------------------------------------------------------------------
-- bonectl.setLock
-- Lock or unlock a bone so a finished part of the rig cannot be nudged.
--
-- These are SKELETON methods that take a frame:
--   skel:LockBone(index, layerFrame) / skel:UnlockBone(index, layerFrame)
-- (lm_select_bone.lua:1486-1488). Locking is animatable, hence the frame and
-- the CHANNEL_BONE / CHANNEL_BONE_LOCK keyframes Moho registers afterwards.
--
-- Moho only locks bones that have a parent (fParent >= 0); a root bone is
-- rejected here instead of silently doing nothing.
-- --------------------------------------------------------------------

function bonectl.setLock(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end
    if params.locked == nil then return nil, "Missing required parameter: locked" end
    if type(params.locked) ~= "boolean" then return nil, "locked must be a boolean" end

    local b, skel, lyr, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    local boneId = math.floor(params.boneId)

    local parent = field(b, "fParent")
    if type(parent) ~= "number" or parent < 0 then
        return nil, "Bone " .. tostring(boneId)
            .. " has no parent; Moho only locks bones with a parent bone"
    end

    local frame = params.frame
    if type(frame) ~= "number" then frame = layerFrame(moho) end
    frame = math.floor(frame)

    prepUndo(moho, lyr)

    local ok, lockErr = pcall(function()
        if params.locked then
            skel:LockBone(boneId, frame)
        else
            skel:UnlockBone(boneId, frame)
        end
    end)
    if not ok then
        return nil, "Failed to " .. (params.locked and "lock" or "unlock")
            .. " bone: " .. tostring(lockErr)
    end

    markDirty(moho)
    refresh(lyr)

    -- Moho registers both channels after a lock change (lm_select_bone.lua:1495-1496).
    newKeyframe(moho, CHANNEL_BONE)
    newKeyframe(moho, CHANNEL_BONE_LOCK or CH_BONE_LOCK)

    return {
        success = true,
        layerId = params.layerId,
        boneId  = boneId,
        name    = boneName(b),
        locked  = params.locked,
        frame   = frame,
        note    = "Moho has no lock-state query, so this result reports the requested state, not a read-back",
    }
end

-- --------------------------------------------------------------------
-- bonectl.setStrength
-- Set how much geometry the bone captures when binding by region.
-- fStrength is a plain number and Moho clamps it at 0 (lm_bone_strength.lua:
-- 109-110). We clamp the same way instead of writing a negative value.
-- --------------------------------------------------------------------

function bonectl.setStrength(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end
    if params.strength == nil then return nil, "Missing required parameter: strength" end
    if type(params.strength) ~= "number" then return nil, "strength must be a number" end

    local b, _, lyr, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    if type(field(b, "fStrength")) ~= "number" then
        return nil, "This Moho build does not expose bone.fStrength"
    end

    local value = params.strength
    local clamped = false
    if value < 0 then
        value = 0
        clamped = true
    end

    prepUndo(moho, lyr)

    local ok, setErr = pcall(function() b.fStrength = value end)
    if not ok then
        return nil, "Failed to set bone strength: " .. tostring(setErr)
    end

    markDirty(moho)
    refresh(lyr)

    return {
        success   = true,
        layerId   = params.layerId,
        boneId    = math.floor(params.boneId),
        name      = boneName(b),
        strength  = value,
        clamped   = clamped,
    }
end

-- --------------------------------------------------------------------
-- bonectl.setIkFlags
-- Configure how the bone participates in IK solving.
--
--   ignoredByIK   bool   exclude the bone from IK chains entirely
--                        (fIgnoredByIK; lm_manipulate_bones.lua:326, :543)
--   arcSolver     bool   bone:EnableArcSolver(bool) / :IsArcSolverEnabled()
--   maxAutoScaling number fMaxAutoScaling; Moho snaps anything below ~1.0 to 1.0
--
-- All three are Pro-only in Moho's UI (gated by MOHO.IsMohoPro()). Any field the
-- running build does not expose is reported as unsupported rather than faked.
-- --------------------------------------------------------------------

function bonectl.setIkFlags(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end
    if params.ignoredByIK == nil and params.arcSolver == nil and params.maxAutoScaling == nil then
        return nil, "Provide at least one of: ignoredByIK, arcSolver, maxAutoScaling"
    end
    if params.ignoredByIK ~= nil and type(params.ignoredByIK) ~= "boolean" then
        return nil, "ignoredByIK must be a boolean"
    end
    if params.arcSolver ~= nil and type(params.arcSolver) ~= "boolean" then
        return nil, "arcSolver must be a boolean"
    end
    if params.maxAutoScaling ~= nil and type(params.maxAutoScaling) ~= "number" then
        return nil, "maxAutoScaling must be a number"
    end

    local b, _, lyr, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    prepUndo(moho, lyr)

    local applied, unsupported = {}, {}

    if params.ignoredByIK ~= nil then
        if field(b, "fIgnoredByIK") == nil then
            unsupported[#unsupported + 1] = "fIgnoredByIK"
        else
            local ok = pcall(function() b.fIgnoredByIK = params.ignoredByIK end)
            if ok then
                applied.ignoredByIK = params.ignoredByIK
            else
                unsupported[#unsupported + 1] = "fIgnoredByIK"
            end
        end
    end

    if params.arcSolver ~= nil then
        local ok = pcall(function() b:EnableArcSolver(params.arcSolver) end)
        if ok then
            applied.arcSolver = params.arcSolver
        else
            unsupported[#unsupported + 1] = "EnableArcSolver"
        end
    end

    if params.maxAutoScaling ~= nil then
        if type(field(b, "fMaxAutoScaling")) ~= "number" then
            unsupported[#unsupported + 1] = "fMaxAutoScaling"
        else
            -- Moho normalises anything under 1.0 up to 1.0 (lm_select_bone.lua:981-983).
            local value = params.maxAutoScaling
            if value < 0.999999 then value = 1.0 end
            local ok = pcall(function() b.fMaxAutoScaling = value end)
            if ok then
                applied.maxAutoScaling = value
            else
                unsupported[#unsupported + 1] = "fMaxAutoScaling"
            end
        end
    end

    if next(applied) == nil then
        return nil, "No IK flag could be applied; unsupported on this Moho build: "
            .. table.concat(unsupported, ", ")
    end

    markDirty(moho)
    refresh(lyr)

    local result = {
        success = true,
        layerId = params.layerId,
        boneId  = math.floor(params.boneId),
        name    = boneName(b),
        applied = applied,
    }
    if #unsupported > 0 then result.unsupported = unsupported end
    return result
end

-- --------------------------------------------------------------------
-- bonectl.setScalingMode
-- Turn squash and stretch on or off for the bone -- the basic animation move.
--
-- fScalingMode is an integer: Moho's UI writes 2 for squash-and-stretch and 0
-- for normal (lm_select_bone.lua:961-966). fSquashStretchScaling is the maximum
-- stretch factor and Moho clamps it into 0.01..100 (lines 968-976); we apply the
-- same clamp so we never store a value Moho would reject.
--
-- Accepts either squashStretch=true/false (the UI-level switch) or an explicit
-- numeric mode.
-- --------------------------------------------------------------------

function bonectl.setScalingMode(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end
    if params.squashStretch == nil and params.mode == nil and params.maxStretch == nil then
        return nil, "Provide at least one of: squashStretch, mode, maxStretch"
    end
    if params.squashStretch ~= nil and type(params.squashStretch) ~= "boolean" then
        return nil, "squashStretch must be a boolean"
    end
    if params.mode ~= nil then
        if type(params.mode) ~= "number" then return nil, "mode must be a number" end
        local m = math.floor(params.mode)
        if m < 0 or m > 2 then
            return nil, "mode out of range (0..2); Moho's UI uses 0 for normal and 2 for squash and stretch"
        end
    end
    if params.maxStretch ~= nil and type(params.maxStretch) ~= "number" then
        return nil, "maxStretch must be a number"
    end

    local b, _, lyr, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    if type(field(b, "fScalingMode")) ~= "number" and params.maxStretch == nil then
        return nil, "This Moho build does not expose bone.fScalingMode"
    end

    prepUndo(moho, lyr)

    local applied, unsupported = {}, {}

    local targetMode = nil
    if params.mode ~= nil then
        targetMode = math.floor(params.mode)
    elseif params.squashStretch ~= nil then
        targetMode = params.squashStretch and 2 or 0
    end

    if targetMode ~= nil then
        if type(field(b, "fScalingMode")) ~= "number" then
            unsupported[#unsupported + 1] = "fScalingMode"
        else
            local ok = pcall(function() b.fScalingMode = targetMode end)
            if ok then
                applied.mode = targetMode
                applied.squashStretch = (targetMode == 2)
            else
                unsupported[#unsupported + 1] = "fScalingMode"
            end
        end
    end

    if params.maxStretch ~= nil then
        if type(field(b, "fSquashStretchScaling")) ~= "number" then
            unsupported[#unsupported + 1] = "fSquashStretchScaling"
        else
            local value = params.maxStretch
            local clamped = false
            if value < 0.01 then
                value = 0.01
                clamped = true
            elseif value > 100.0 then
                value = 100.0
                clamped = true
            end
            local ok = pcall(function() b.fSquashStretchScaling = value end)
            if ok then
                applied.maxStretch = value
                if clamped then applied.maxStretchClamped = true end
            else
                unsupported[#unsupported + 1] = "fSquashStretchScaling"
            end
        end
    end

    if next(applied) == nil then
        return nil, "No scaling property could be applied; unsupported on this Moho build: "
            .. table.concat(unsupported, ", ")
    end

    markDirty(moho)
    refresh(lyr)

    local result = {
        success = true,
        layerId = params.layerId,
        boneId  = math.floor(params.boneId),
        name    = boneName(b),
        applied = applied,
    }
    if #unsupported > 0 then result.unsupported = unsupported end
    return result
end

-- --------------------------------------------------------------------
-- bonectl.setFlip
-- Flip a bone for mirrored limbs.
--
-- Moho has TWO different flips and picks between them by frame
-- (lm_transform_bone.lua:FlipBones, lines 1107-1142):
--   frame 0 (rigging)   -> skel:FlipBone(index, horizontal) -- edits the rig
--   frame > 0 (animate) -> bone.fFlipH / bone.fFlipV animated channels
-- We reproduce that split exactly. Writing the rig flip on an animation frame,
-- or the channel on frame 0, does not match what the artist sees in Moho.
--
-- axis: "horizontal" (Moho's "End Flip") or "vertical" ("Side Flip").
-- On animation frames `value` may be given to set an absolute state; without it
-- the channel is toggled, which is Moho's own behaviour.
-- --------------------------------------------------------------------

function bonectl.setFlip(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end

    local axis = params.axis
    if axis == nil then axis = "vertical" end
    if axis ~= "horizontal" and axis ~= "vertical" then
        return nil, "axis must be 'horizontal' or 'vertical'"
    end
    if params.value ~= nil and type(params.value) ~= "boolean" then
        return nil, "value must be a boolean"
    end

    local b, skel, lyr, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    local boneId = math.floor(params.boneId)
    local horizontal = (axis == "horizontal")

    local frame = params.frame
    if type(frame) ~= "number" then frame = layerFrame(moho) end
    frame = math.floor(frame)

    prepUndo(moho, lyr)

    if frame == 0 then
        -- Rigging flip: mutates the bone's rest pose.
        local ok, flipErr = pcall(function() skel:FlipBone(boneId, horizontal) end)
        if not ok then
            return nil, "Failed to flip bone: " .. tostring(flipErr)
        end
        markDirty(moho)
        pcall(function() lyr:UpdateCurFrame() end)
        return {
            success = true,
            layerId = params.layerId,
            boneId  = boneId,
            name    = boneName(b),
            axis    = axis,
            frame   = frame,
            mode    = "rig",
        }
    end

    -- Animation flip: write the animated channel at this frame.
    local chName = horizontal and "fFlipH" or "fFlipV"
    local ch = field(b, chName)
    if ch == nil then
        return nil, "This Moho build does not expose bone." .. chName
    end

    local newValue = params.value
    if newValue == nil then
        local cur = channelAt(b, chName, frame)
        newValue = not (cur and true or false)
    end

    local ok, setErr = pcall(function() ch:SetValue(frame, newValue) end)
    if not ok then
        return nil, "Failed to set " .. chName .. ": " .. tostring(setErr)
    end

    markDirty(moho)
    pcall(function() lyr:UpdateCurFrame() end)

    if horizontal then
        newKeyframe(moho, CHANNEL_BONE_FLIPH or CH_BONE_FLIPH)
    else
        newKeyframe(moho, CHANNEL_BONE_FLIPV or CH_BONE_FLIPV)
    end

    return {
        success = true,
        layerId = params.layerId,
        boneId  = boneId,
        name    = boneName(b),
        axis    = axis,
        frame   = frame,
        mode    = "animation",
        value   = newValue,
    }
end

-- --------------------------------------------------------------------
-- bonectl.setFixedAngle
-- When set, the bone stops inheriting its parent's rotation. Moho's IK and
-- manipulation code treats a fixed-angle bone as a chain boundary
-- (lm_manipulate_bones.lua:149, :274, :325; lm_transform_bone.lua:768).
-- Plain boolean field, written directly (lm_select_bone.lua:958-959).
-- --------------------------------------------------------------------

function bonectl.setFixedAngle(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end
    if params.fixedAngle == nil then return nil, "Missing required parameter: fixedAngle" end
    if type(params.fixedAngle) ~= "boolean" then return nil, "fixedAngle must be a boolean" end

    local b, _, lyr, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    if field(b, "fFixedAngle") == nil then
        return nil, "This Moho build does not expose bone.fFixedAngle"
    end

    prepUndo(moho, lyr)

    local ok, setErr = pcall(function() b.fFixedAngle = params.fixedAngle end)
    if not ok then
        return nil, "Failed to set fixed angle: " .. tostring(setErr)
    end

    markDirty(moho)
    refresh(lyr)

    return {
        success    = true,
        layerId    = params.layerId,
        boneId     = math.floor(params.boneId),
        name       = boneName(b),
        fixedAngle = params.fixedAngle,
    }
end

-- --------------------------------------------------------------------
-- bonectl.rename
-- Rename a bone the way Moho does it (lm_select_bone.lua:1471-1472 and
-- lm_add_bone.lua:392-393): bone:SetName(name) THEN
-- skel:MakeBoneNameUnique(index). Skipping MakeBoneNameUnique leaves duplicate
-- bone names, and Moho resolves bone references by name in places such as Smart
-- Bone actions -- duplicates silently bind the wrong bone.
--
-- The name Moho settles on may differ from the requested one, so the actual
-- stored name is read back and returned.
-- --------------------------------------------------------------------

function bonectl.rename(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end
    if params.name == nil then return nil, "Missing required parameter: name" end
    if type(params.name) ~= "string" then return nil, "name must be a string" end
    if params.name == "" then return nil, "name must not be empty" end

    local b, skel, lyr, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    local boneId = math.floor(params.boneId)
    local previousName = boneName(b)

    prepUndo(moho, lyr)

    local ok, setErr = pcall(function() b:SetName(params.name) end)
    if not ok then
        return nil, "Failed to rename bone: " .. tostring(setErr)
    end

    -- Moho may append a suffix here to keep the name unique in the skeleton.
    local uniqueOk = pcall(function() skel:MakeBoneNameUnique(boneId) end)

    markDirty(moho)
    pcall(function() moho:UpdateUI() end)

    local finalName = boneName(b)

    return {
        success      = true,
        layerId      = params.layerId,
        boneId       = boneId,
        previousName = previousName,
        requestedName = params.name,
        name         = finalName,
        renamedToUnique = uniqueOk and (finalName ~= params.name) or false,
        uniquenessEnforced = uniqueOk,
    }
end

return bonectl
