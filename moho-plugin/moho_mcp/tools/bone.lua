-- bone.lua
-- Tool handlers for bone layer operations: properties, transform, constraints,
-- parenting, IK target binding, creation, and deletion.

local bone = {}

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
    local ok, x, y = pcall(function() return v.x, v.y end)
    if ok then return { x = x or 0, y = y or 0 } end
    return { x = 0, y = 0 }
end

local function getBone(moho, layerId, boneId)
    local lyr, err = getLayerById(moho, layerId)
    if not lyr then return nil, nil, err end

    local isBoneOk, isBone = pcall(function() return lyr:IsBoneType() end)
    if not isBoneOk or not isBone then
        return nil, nil, "Layer " .. tostring(layerId) .. " is not a bone layer"
    end

    local bOk, boneLyr = pcall(function() return moho:LayerAsBone(lyr) end)
    if not bOk or not boneLyr then
        return nil, nil, "Failed to cast layer to bone layer"
    end

    local skelOk, skel = pcall(function() return boneLyr:Skeleton() end)
    if not skelOk or not skel then
        return nil, nil, "Failed to get skeleton from bone layer"
    end

    if type(boneId) ~= "number" then
        return nil, nil, "boneId must be a number"
    end

    local count = skel:CountBones()
    if boneId < 0 or boneId >= count then
        return nil, nil, "Bone index " .. tostring(boneId) .. " out of range (0.." .. tostring(count - 1) .. ")"
    end

    local boneOk, boneObj = pcall(function() return skel:Bone(boneId) end)
    if not boneOk or not boneObj then
        return nil, nil, "Failed to retrieve bone " .. tostring(boneId)
    end
    return boneObj, skel
end

-- --------------------------------------------------------------------
-- Handlers
-- --------------------------------------------------------------------

function bone.getProperties(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end

    local b, skel, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    local result = { id = params.boneId, layerId = params.layerId }
    local nOk, name = pcall(function() return b:Name() end)
    result.name = nOk and name or ""

    result.position = vec2table(b.fPos)

    local aOk, angle = pcall(function() return b.fAngle end)
    result.angle = (aOk and angle) or 0

    local scOk, scale = pcall(function() return b.fScale end)
    result.scale = (scOk and scale) or 1

    local lOk, length = pcall(function() return b.fLength end)
    result.length = (lOk and length) or 0

    local pOk, parent = pcall(function() return b.fParent end)
    result.parentId = (pOk and parent) or -1

    local selOk, sel = pcall(function() return b.fSelected end)
    result.selected = selOk and sel or false

    local constraints = {}
    local minOk, minAngle = pcall(function() return b.fMinConstraint end)
    if minOk and minAngle then constraints.minAngle = minAngle end
    local maxOk, maxAngle = pcall(function() return b.fMaxConstraint end)
    if maxOk and maxAngle then constraints.maxAngle = maxAngle end
    local conOk, conEnabled = pcall(function() return b.fConstraints end)
    if conOk then constraints.enabled = conEnabled and true or false end
    local posConOk, posCon = pcall(function() return b.fPosControl end)
    if posConOk then constraints.positionControl = posCon and true or false end
    local angleConOk, angleCon = pcall(function() return b.fAngleControl end)
    if angleConOk then constraints.angleControl = angleCon and true or false end
    local scaleConOk, scaleCon = pcall(function() return b.fScaleControl end)
    if scaleConOk then constraints.scaleControl = scaleCon and true or false end
    result.constraints = constraints

    local frame = 0
    pcall(function() frame = moho.document:CurrentFrame() end)
    local animated = {}
    local animPosOk, animPos = pcall(function() return b.fAnimPos:GetValue(frame) end)
    if animPosOk and animPos then animated.position = vec2table(animPos) end
    local animAngleOk, animAngle = pcall(function() return b.fAnimAngle:GetValue(frame) end)
    if animAngleOk and animAngle then animated.angle = animAngle end
    local animScaleOk, animScale = pcall(function() return b.fAnimScale:GetValue(frame) end)
    if animScaleOk and animScale then animated.scale = animScale end
    if next(animated) ~= nil then result.animated = animated end

    return result
end

function bone.setTransform(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end
    if params.frame == nil then return nil, "Missing required parameter: frame" end

    local b, skel, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    local lyr = getLayerById(moho, params.layerId)
    pcall(function() moho.document:PrepUndo(lyr) end)

    local frame = params.frame
    local changed = {}

    if params.angle ~= nil then
        local ok, setErr = pcall(function() b.fAnimAngle:SetValue(frame, params.angle) end)
        if not ok then return nil, "Failed to set angle: " .. tostring(setErr) end
        changed.angle = params.angle
    end

    if params.position ~= nil or params.posX ~= nil or params.posY ~= nil then
        local ok, setErr = pcall(function()
            local cur = b.fAnimPos:GetValue(frame)
            local nx = params.posX or (params.position and params.position.x) or cur.x
            local ny = params.posY or (params.position and params.position.y) or cur.y
            local vec = LM.Vector2:new_local()
            vec.x = nx
            vec.y = ny
            b.fAnimPos:SetValue(frame, vec)
        end)
        if not ok then return nil, "Failed to set position: " .. tostring(setErr) end
        changed.position = { x = params.posX, y = params.posY }
    end

    if params.scale ~= nil then
        local ok, setErr = pcall(function() b.fAnimScale:SetValue(frame, params.scale) end)
        if not ok then return nil, "Failed to set scale: " .. tostring(setErr) end
        changed.scale = params.scale
    end

    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, boneId = params.boneId, frame = frame, changed = changed }
end

function bone.selectBone(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end

    local b, skel, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    local ok, selErr = pcall(function() skel:SelectNone(); b.fSelected = true end)
    if not ok then return nil, "Failed to select bone: " .. tostring(selErr) end
    return { success = true, layerId = params.layerId, boneId = params.boneId, boneName = b:Name() }
end

-- bone.createBone: append a new bone to a bone layer.
function bone.createBone(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if not params.layerId or type(params.layerId) ~= "number" then
        return nil, "Missing required parameter: layerId"
    end
    if type(params.name) ~= "string" then
        return nil, "Missing required parameter: name"
    end

    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end
    local isBoneOk, isBone = pcall(function() return lyr:IsBoneType() end)
    if not isBoneOk or not isBone then
        return nil, "Target layer is not a bone layer"
    end

    local boneLyr = moho:LayerAsBone(lyr)
    local skel = boneLyr:Skeleton()
    local newBone = skel:AppendBone()
    pcall(function() newBone:SetName(params.name) end)
    if params.position and type(params.position) == "table" then
        local vec = LM.Vector2:new_local()
        vec.x = params.position.x or 0
        vec.y = params.position.y or 0
        pcall(function() newBone.fPos = vec end)
    end
    if params.angle ~= nil then pcall(function() newBone.fAngle = params.angle end) end
    if params.parentBoneId and params.parentBoneId >= 0 then
        pcall(function() newBone.fParent = math.floor(params.parentBoneId) end)
    end

    pcall(function() moho.document:SetDirty() end)
    local newId = skel:CountBones() - 1
    return { success = true, layerId = params.layerId, boneId = newId, name = params.name }
end

-- bone.deleteBone: remove a bone from the skeleton.
-- Destructive: requires previewHash from the safety engine.
-- Follows Moho's own deletion order (see Moho's Tool/lm_select_bone.lua):
-- detach the bone from every child layer that binds it, THEN delete it from the
-- skeleton. Skipping DeleteParentBone leaves layers bound to a bone index that
-- has shifted, which silently rebinds artwork to the wrong bone.
function bone.deleteBone(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil or params.boneId == nil then
        return nil, "Both layerId and boneId are required"
    end
    if not params.previewHash or params.previewHash == "" then
        return nil, "previewHash is required for bone.deleteBone"
    end

    local boneObj, skel, err = getBone(moho, params.layerId, params.boneId)
    if not boneObj then return nil, err end

    local lyr, lyrErr = getLayerById(moho, params.layerId)
    if not lyr then return nil, lyrErr end

    local boneId = math.floor(params.boneId)
    local name = ""
    pcall(function() name = boneObj:Name() or "" end)

    pcall(function() moho.document:PrepUndo(lyr, false) end)

    -- Unbind the doomed bone from any child layers of this bone layer.
    pcall(function()
        local boneLayer = moho:LayerAsGroup(lyr)
        if boneLayer then
            for j = 0, boneLayer:CountLayers() - 1 do
                local child = boneLayer:Layer(j)
                if child then pcall(function() child:DeleteParentBone(boneId) end) end
            end
        end
    end)

    local delOk, delErr = pcall(function() skel:DeleteBone(boneId) end)
    if not delOk then
        return nil, "Failed to delete bone: " .. tostring(delErr)
    end

    pcall(function() moho.document:SetDirty() end)
    -- Refresh bone state so any in-progress manipulation preview is rebuilt.
    pcall(function() moho:SetCurFrame(moho.frame) end)

    local remaining = 0
    pcall(function() remaining = skel:CountBones() end)

    return {
        success = true,
        layerId = params.layerId,
        boneId = params.boneId,
        name = name,
        remainingBones = remaining,
    }
end

-- bone.setConstraints: configure min/max angle and control flags.
function bone.setConstraints(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil or params.boneId == nil then
        return nil, "Missing layerId/boneId"
    end
    local b, skel, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end
    local lyr = getLayerById(moho, params.layerId)
    pcall(function() moho.document:PrepUndo(lyr) end)

    if params.minAngle ~= nil then pcall(function() b.fMinConstraint = params.minAngle end) end
    if params.maxAngle ~= nil then pcall(function() b.fMaxConstraint = params.maxAngle end) end
    if params.enabled ~= nil then pcall(function() b.fConstraints = params.enabled end) end
    if params.positionControl ~= nil then pcall(function() b.fPosControl = params.positionControl end) end
    if params.angleControl ~= nil then pcall(function() b.fAngleControl = params.angleControl end) end
    if params.scaleControl ~= nil then pcall(function() b.fScaleControl = params.scaleControl end) end

    pcall(function() moho.document:SetDirty() end)
    return {
        success = true,
        layerId = params.layerId,
        boneId = params.boneId,
        minAngle = params.minAngle,
        maxAngle = params.maxAngle,
    }
end

-- bone.setTarget: bind a bone to a target layer (or another bone) for IK.
function bone.setTarget(moho, params)
    if not params then return nil, "Missing parameters" end
    if not params.layerId or not params.boneId or not params.targetLayerId then
        return nil, "Missing layerId/boneId/targetLayerId"
    end
    local b, skel, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end
    local targetLayer, targetErr = getLayerById(moho, params.targetLayerId)
    if not targetLayer then return nil, "targetLayer: " .. tostring(targetErr) end

    local lyr = getLayerById(moho, params.layerId)
    pcall(function() moho.document:PrepUndo(lyr) end)

    local ok, bindErr
    if params.targetBoneId and params.targetBoneId >= 0 then
        local targetBoneLyr = moho:LayerAsBone(targetLayer)
        if not targetBoneLyr then return nil, "targetLayer is not a bone layer" end
        local targetSkel = targetBoneLyr:Skeleton()
        local count = targetSkel:CountBones()
        if params.targetBoneId >= count then
            return nil, "targetBoneId out of range"
        end
        local targetBone = targetSkel:Bone(params.targetBoneId)
        ok, bindErr = pcall(function() b:SetTargetBone(targetBone) end)
    else
        ok, bindErr = pcall(function() b:SetTargetLayer(targetLayer) end)
    end
    if not ok then return nil, "Failed to set target: " .. tostring(bindErr) end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, boneId = params.boneId, targetLayerId = params.targetLayerId }
end

-- bone.setParent: re-parent a bone within the same bone layer.
function bone.setParent(moho, params)
    if not params then return nil, "Missing parameters" end
    if not params.layerId or not params.boneId or not params.parentBoneId then
        return nil, "Missing layerId/boneId/parentBoneId"
    end
    if params.boneId == params.parentBoneId then
        return nil, "Cannot parent a bone to itself"
    end
    local b, skel, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end
    local count = skel:CountBones()
    if params.parentBoneId < 0 or params.parentBoneId >= count then
        return nil, "parentBoneId out of range"
    end
    local lyr = getLayerById(moho, params.layerId)
    pcall(function() moho.document:PrepUndo(lyr) end)
    local ok, pErr = pcall(function() b.fParent = math.floor(params.parentBoneId) end)
    if not ok then return nil, "Failed to set parent: " .. tostring(pErr) end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, boneId = params.boneId, parentBoneId = params.parentBoneId }
end

return bone
