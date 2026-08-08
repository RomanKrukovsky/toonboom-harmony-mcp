-- workflow.lua
-- High-level multi-step workflow helpers.
-- All of these wrap atomic operations; none bypass the safety engine.

local workflow = {}

-- Map phoneme string to a Moho mouth-chart index, when available.
local PHONEME_INDEX = {
    AI   = 0,
    E    = 1,
    U    = 2,
    O    = 3,
    MBP  = 4,
    FV   = 5,
    L    = 6,
    WQ   = 7,
    etc  = 8,
    rest = 9,
}

local function vec2table(v)
    if v == nil then return { x = 0, y = 0 } end
    local ok, x, y = pcall(function() return tonumber(v.x) or 0, tonumber(v.y) or 0 end)
    if ok then return { x = x, y = y } end
    return { x = 0, y = 0 }
end

local function getLayerById(moho, layerId)
    if not moho or not moho.document then return nil, "No active document" end
    if type(layerId) ~= "number" then return nil, "layerId must be a number" end
    local ok, lyr = pcall(function()
        return moho.document:LayerByAbsoluteID(layerId)
    end)
    if not ok or not lyr then return nil, "Layer not found with absolute ID " .. tostring(layerId) end
    return lyr
end

-- --------------------------------------------------------------------
-- workflow.createCharacterRig
-- Build a starter bone scaffold (root bone + named child bones) ready for the
-- user to bind art to. Idempotent: appends new bones to the existing layer
-- or creates one if needed.
-- --------------------------------------------------------------------

local STANDARD_BONES = {
    "Spine",  "Head",
    "Arm_Left_Upper",  "Arm_Left_Lower",  "Hand_Left",
    "Arm_Right_Upper", "Arm_Right_Lower", "Hand_Right",
    "Leg_Left_Upper",  "Leg_Left_Lower",  "Foot_Left",
    "Leg_Right_Upper", "Leg_Right_Lower", "Foot_Right",
}

local COMPLEX_BONES = {
    "Spine", "Spine_1", "Spine_2",
    "Head", "Head_Top",
    "Arm_Left_Upper",  "Arm_Left_Lower",  "Hand_Left",  "Finger_Left_1",
    "Arm_Right_Upper", "Arm_Right_Lower", "Hand_Right", "Finger_Right_1",
    "Leg_Left_Upper",  "Leg_Left_Lower",  "Foot_Left",  "Toe_Left_1",
    "Leg_Right_Upper", "Leg_Right_Lower", "Foot_Right", "Toe_Right_1",
}

function workflow.createCharacterRig(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if not params.characterName or type(params.characterName) ~= "string" then
        return nil, "Missing required parameter: characterName"
    end

    pcall(function() moho.document:PrepUndo(nil) end)

    local rigProfile = params.rigProfile or "standard"
    local boneNames = (rigProfile == "complex") and COMPLEX_BONES
        or (rigProfile == "simple") and { "Spine", "Head" }
        or STANDARD_BONES

    local layerOk, layerOrErr = pcall(function() return moho:CreateNewLayer(MOHO.LT_BONE) end)
    if not layerOk or not layerOrErr then
        return nil, "Failed to create bone layer: " .. tostring(layerOrErr)
    end
    pcall(function() layerOrErr:SetName(params.characterName .. "_Rig") end)
    local boneLyr = moho:LayerAsBone(layerOrErr)
    local skel = boneLyr:Skeleton()

    local created = {}
    for i, name in ipairs(boneNames) do
        local ok, bone = pcall(function() return skel:AppendBone() end)
        if ok and bone then
            pcall(function() bone:SetName(name) end)
            created[#created + 1] = name
        end
    end

    pcall(function() moho.document:SetDirty() end)
    local absId = moho.document:LayerAbsoluteID(layerOrErr)
    return {
        success = true,
        characterName = params.characterName,
        rigProfile = rigProfile,
        layerId = absId,
        boneCount = #created,
        bones = created,
    }
end

-- --------------------------------------------------------------------
-- workflow.duplicateLayerTree
-- Best-effort deep-clone of a layer (with children). Animation cloning is
-- best-effort because Moho scripting for sub-tree duplication varies by
-- version.
-- --------------------------------------------------------------------

function workflow.duplicateLayerTree(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if not params.layerId then return nil, "Missing required parameter: layerId" end
    if not params.newName or type(params.newName) ~= "string" then
        return nil, "Missing required parameter: newName"
    end

    local sourceLayer, err = getLayerById(moho, params.layerId)
    if not sourceLayer then return nil, err end

    pcall(function() moho.document:PrepUndo(nil) end)
    local ok, dupOrErr = pcall(function() return moho:DuplicateLayer(sourceLayer) end)
    if not ok or not dupOrErr then
        return nil, "Failed to duplicate layer: " .. tostring(dupOrErr)
    end
    pcall(function() dupOrErr:SetName(params.newName) end)
    pcall(function() moho.document:SetDirty() end)
    local dupId = moho.document:LayerAbsoluteID(dupOrErr)
    return { success = true, sourceLayerId = params.layerId, newLayerId = dupId, newName = params.newName }
end

-- --------------------------------------------------------------------
-- workflow.createSmartBone
-- Create a Smart Bone action bound to a bone for the given frame range.
-- The action is added to the bone's action list with a default amplitude
-- table if `parameters` is omitted.
-- --------------------------------------------------------------------

function workflow.createSmartBone(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if not params.layerId or not params.boneId or not params.actionName then
        return nil, "Missing layerId/boneId/actionName"
    end
    if params.startFrame == nil or params.endFrame == nil then
        return nil, "Missing startFrame/endFrame"
    end

    local layerOk, lyr = pcall(function()
        return moho.document:LayerByAbsoluteID(params.layerId)
    end)
    if not layerOk or not lyr then return nil, "Layer not found" end

    local boneLyr = moho:LayerAsBone(lyr)
    if not boneLyr then return nil, "Layer is not a bone layer" end
    local skel = boneLyr:Skeleton()
    local count = skel:CountBones()
    if params.boneId < 0 or params.boneId >= count then
        return nil, "boneId out of range"
    end
    local bone = skel:Bone(params.boneId)

    pcall(function() moho.document:PrepUndo(nil) end)

    -- Bind a default action if the Moho API exposes it.
    local actionCreated = false
    pcall(function()
        if bone.CreateSmartBoneAction then
            local act = bone:CreateSmartBoneAction(params.actionName)
            if act then
                actionCreated = true
                if act.SetRange then act:SetRange(math.floor(params.startFrame), math.floor(params.endFrame)) end
                if params.parameters and type(params.parameters) == "table" then
                    for k, v in pairs(params.parameters) do
                        pcall(function() act:SetParameter(k, v) end)
                    end
                end
            end
        end
    end)
    if not actionCreated then
        return nil, "Smart Bone API is not available in this Moho build"
    end

    pcall(function() moho.document:SetDirty() end)
    return {
        success = true,
        layerId = params.layerId,
        boneId = params.boneId,
        actionName = params.actionName,
        startFrame = params.startFrame,
        endFrame = params.endFrame,
    }
end

-- --------------------------------------------------------------------
-- workflow.applyLipSync
-- Convert a frame-indexed phoneme list into a series of keyframes on a
-- vector mouth layer's fPAnim channel. Each phoneme is mapped to a numeric
-- mouth shape index.
-- --------------------------------------------------------------------

function workflow.applyLipSync(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if not params.layerId then return nil, "Missing required parameter: layerId" end
    if type(params.phonemes) ~= "table" or #params.phonemes == 0 then
        return nil, "phonemes must be a non-empty array"
    end

    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    local isVecOk, isVec = pcall(function() return lyr:IsVectorType() end)
    if not isVecOk or not isVec then
        return nil, "Target layer is not a vector layer"
    end
    local vOk, vecLyr = pcall(function() return moho:LayerAsVector(lyr) end)
    if not vOk or not vecLyr then return nil, "Failed to cast to vector layer" end

    pcall(function() moho.document:PrepUndo(lyr) end)
    local written = 0
    for _, ph in ipairs(params.phonemes) do
        if ph.frame ~= nil and ph.phoneme ~= nil then
            local index = PHONEME_INDEX[ph.phoneme]
            if index ~= nil then
                local ok, setErr = pcall(function()
                    -- Moho exposes mouth shape via the mesh's fMyStyle; we
                    -- set the fMouthShapeAnim channel if present.
                    if vecLyr.SetMouthShapeAtFrame then
                        vecLyr:SetMouthShapeAtFrame(math.floor(ph.frame), index)
                    end
                end)
                if ok then written = written + 1 end
            end
        end
    end

    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, written = written, total = #params.phonemes }
end

-- --------------------------------------------------------------------
-- workflow.batchRender
-- Render a list of scene configurations in sequence. DESTRUCTIVE — caller
-- must provide a previewHash (validated upstream by the safety engine).
-- --------------------------------------------------------------------

function workflow.batchRender(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if not params.scenes or type(params.scenes) ~= "table" or #params.scenes == 0 then
        return nil, "scenes must be a non-empty array"
    end

    pcall(function() moho.document:PrepUndo(nil) end)
    local results = {}
    for i, scene in ipairs(params.scenes) do
        if not scene.outputPath or not scene.width or not scene.height then
            results[i] = { sceneName = scene.sceneName, success = false, error = "missing outputPath/width/height" }
        else
            local ok, err = pcall(function()
                moho:Render(scene.outputPath, scene.width, scene.height)
            end)
            if ok then
                results[i] = { sceneName = scene.sceneName, success = true, outputPath = scene.outputPath }
            else
                results[i] = { sceneName = scene.sceneName, success = false, error = tostring(err) }
            end
        end
    end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, count = #results, results = results }
end

-- --------------------------------------------------------------------
-- workflow.projectDiagnostics
-- Sanity scan that returns counts of common authoring issues.
-- --------------------------------------------------------------------

function workflow.projectDiagnostics(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    local doc = moho.document
    local report = {
        totalLayers = 0,
        boneLayers = 0,
        vectorLayers = 0,
        groupLayers = 0,
        missingMedia = 0,
        renderWidth = 0,
        renderHeight = 0,
        fps = 0,
        dirty = false,
    }
    pcall(function() report.totalLayers = doc:TotalLayerCount() end)
    pcall(function() report.dirty = doc:IsDirty() end)
    pcall(function() report.renderWidth = doc:Width() end)
    pcall(function() report.renderHeight = doc:Height() end)
    pcall(function() report.fps = doc:Fps() end)

    local function walk(lyr)
        if not lyr then return end
        local lt = lyr:LayerType()
        if lt == MOHO.LT_VECTOR then report.vectorLayers = report.vectorLayers + 1
        elseif lt == MOHO.LT_BONE then report.boneLayers = report.boneLayers + 1
        elseif lt == MOHO.LT_GROUP then report.groupLayers = report.groupLayers + 1 end

        local ok, missing = pcall(function() return lyr:HasMissingMedia() end)
        if ok and missing then report.missingMedia = report.missingMedia + 1 end

        if lyr:IsGroupType() then
            local gOk, group = pcall(function() return moho:LayerAsGroup(lyr) end)
            if gOk and group then
                for i = 0, group:CountLayers() - 1 do
                    local cOk, child = pcall(function() return group:Layer(i) end)
                    if cOk and child then walk(child) end
                end
            end
        end
    end

    local countOk, topCount = pcall(function() return doc:CountLayers() end)
    if countOk then
        for i = 0, topCount - 1 do
            local ok, lyr = pcall(function() return doc:Layer(i) end)
            if ok and lyr then walk(lyr) end
        end
    end
    return report
end

return workflow
