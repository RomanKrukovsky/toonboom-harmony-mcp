-- layer.lua
-- Tool handlers for querying and mutating layers in Moho.

local layer = {}

-- --------------------------------------------------------------------
-- Local helpers
-- --------------------------------------------------------------------

local LAYER_TYPE_NAMES = {}
local function initLayerTypeNames()
    if next(LAYER_TYPE_NAMES) ~= nil then return end
    local M = nil
    pcall(function() M = MOHO end)
    if not M then pcall(function() M = LM.MOHO end) end
    if M then
        pcall(function() LAYER_TYPE_NAMES[M.LT_VECTOR]   = "vector" end)
        pcall(function() LAYER_TYPE_NAMES[M.LT_BONE]     = "bone" end)
        pcall(function() LAYER_TYPE_NAMES[M.LT_GROUP]    = "group" end)
        pcall(function() LAYER_TYPE_NAMES[M.LT_IMAGE]    = "image" end)
        pcall(function() LAYER_TYPE_NAMES[M.LT_AUDIO]    = "audio" end)
        pcall(function() LAYER_TYPE_NAMES[M.LT_SWITCH]   = "switch" end)
        pcall(function() LAYER_TYPE_NAMES[M.LT_PARTICLE] = "particle" end)
        pcall(function() LAYER_TYPE_NAMES[M.LT_NOTE]     = "note" end)
        pcall(function() LAYER_TYPE_NAMES[M.LT_PATCH]    = "patch" end)
    end
end

local function layerTypeName(layerType)
    initLayerTypeNames()
    return LAYER_TYPE_NAMES[layerType] or "unknown"
end

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

local function readTransform(lyr, frame)
    local transform = {}
    frame = frame or 0
    local tOk, tx, ty = pcall(function()
        local val = lyr.fTranslation:GetValue(frame)
        return val.x, val.y
    end)
    if tOk then
        transform.translation = { x = tx, y = ty }
    else
        transform.translation = { x = 0, y = 0 }
    end

    local rOk, rVal = pcall(function() return lyr.fRotationZ:GetValue(frame) end)
    transform.rotation = rOk and rVal or 0

    local sOk, sx, sy = pcall(function()
        local val = lyr.fScale:GetValue(frame)
        return val.x, val.y
    end)
    if sOk then
        transform.scale = { x = sx, y = sy }
    else
        transform.scale = { x = 1, y = 1 }
    end
    return transform
end

local function collectChildren(moho, groupLayer, parentId)
    local children = {}
    local count = groupLayer:CountLayers()
    for i = 0, count - 1 do
        local ok, childOrErr = pcall(function() return groupLayer:Layer(i) end)
        if ok and childOrErr then
            local child = childOrErr
            local idOk, absId = pcall(function()
                if moho and moho.LayerAbsoluteID then
                    return moho:LayerAbsoluteID(child)
                end
                return i
            end)
            local entry = {
                id       = (idOk and absId ~= nil) and absId or i,
                name     = child:Name(),
                type     = layerTypeName(child:LayerType()),
                visible  = child:IsVisible(),
                locked   = child:IsLocked(),
                parentId = parentId,
                children = {},
            }
            if child:IsGroupType() then
                local gOk, group = pcall(function() return moho:LayerAsGroup(child) end)
                if gOk and group then
                    entry.children = collectChildren(moho, group, entry.id)
                end
            end
            children[#children + 1] = entry
        end
    end
    return children
end

-- --------------------------------------------------------------------
-- Read handlers
-- --------------------------------------------------------------------

function layer.getProperties(moho, params)
    if not params or params.layerId == nil then
        return nil, "Missing required parameter: layerId"
    end
    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    local result = {
        id      = params.layerId,
        name    = lyr:Name(),
        type    = layerTypeName(lyr:LayerType()),
        visible = lyr:IsVisible(),
        locked  = lyr:IsLocked(),
    }

    local opOk, opacity = pcall(function()
        local frame = moho.document:CurrentFrame()
        return lyr.fAlpha:GetValue(frame)
    end)
    result.opacity = opOk and opacity or 1.0

    local bmOk, blendMode = pcall(function() return lyr:BlendingMode() end)
    result.blendMode = bmOk and blendMode or 0

    local frame = 0
    pcall(function() frame = moho.document:CurrentFrame() end)
    result.transform = readTransform(lyr, frame)

    local lt = lyr:LayerType()
    initLayerTypeNames()
    if LAYER_TYPE_NAMES[lt] == "bone" then
        local bOk, boneLyr = pcall(function() return moho:LayerAsBone(lyr) end)
        if bOk and boneLyr then
            local skelOk, skel = pcall(function() return boneLyr:Skeleton() end)
            if skelOk and skel then
                result.boneCount = skel:CountBones()
            end
        end
    elseif LAYER_TYPE_NAMES[lt] == "vector" then
        local vOk, vecLyr = pcall(function() return moho:LayerAsVector(lyr) end)
        if vOk and vecLyr then
            local mOk, mesh = pcall(function() return vecLyr:Mesh() end)
            if mOk and mesh then
                result.pointCount = mesh:CountPoints()
                result.shapeCount = mesh:CountShapes()
            end
        end
    end

    if lyr:IsGroupType() then
        local gOk, group = pcall(function() return moho:LayerAsGroup(lyr) end)
        if gOk and group then
            result.childCount = group:CountLayers()
        end
    end

    return result
end

function layer.getChildren(moho, params)
    if not params or params.layerId == nil then
        return nil, "Missing required parameter: layerId"
    end
    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end
    if not lyr:IsGroupLayer() then
        return nil, "Layer " .. tostring(params.layerId) .. " is not a group layer"
    end
    local gOk, group = pcall(function() return moho:LayerAsGroup(lyr) end)
    if not gOk or not group then
        return nil, "Failed to cast layer to group: " .. tostring(group)
    end
    local children = {}
    local count = group:CountLayers()
    for i = 0, count - 1 do
        local cOk, child = pcall(function() return group:Layer(i) end)
        if cOk and child then
            children[#children + 1] = {
                id      = moho.document:LayerAbsoluteID(child),
                name    = child:Name(),
                type    = layerTypeName(child:LayerType()),
                visible = child:IsVisible(),
                locked  = child:IsLocked(),
                isGroup = child:IsGroupType(),
            }
        end
    end
    return children
end

function layer.getBones(moho, params)
    if not params or params.layerId == nil then
        return nil, "Missing required parameter: layerId"
    end
    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end
    local isBoneOk, isBone = pcall(function() return lyr:IsBoneType() end)
    if not isBoneOk or not isBone then
        return nil, "Layer " .. tostring(params.layerId) .. " is not a bone layer"
    end
    local bOk, boneLyr = pcall(function() return moho:LayerAsBone(lyr) end)
    if not bOk or not boneLyr then
        return nil, "Failed to cast layer to bone layer: " .. tostring(boneLyr)
    end
    local skelOk, skel = pcall(function() return boneLyr:Skeleton() end)
    if not skelOk or not skel then
        return nil, "Failed to get skeleton: " .. tostring(skel)
    end
    local bones = {}
    local count = skel:CountBones()
    for i = 0, count - 1 do
        local ok, boneOrErr = pcall(function() return skel:Bone(i) end)
        if ok and boneOrErr then
            local b = boneOrErr
            bones[#bones + 1] = {
                id       = i,
                name     = b:Name(),
                position = vec2table(b.fPos),
                angle    = b.fAngle or 0,
                scale    = b.fScale or 1,
                length   = b.fLength or 0,
                parentId = b.fParent or -1,
                selected = b.fSelected or false,
            }
        end
    end
    return bones
end

-- --------------------------------------------------------------------
-- Mutation handlers
-- --------------------------------------------------------------------

function layer.setTransform(moho, params)
    if not params or params.layerId == nil then
        return nil, "Missing required parameter: layerId"
    end
    if params.frame == nil then
        return nil, "Missing required parameter: frame"
    end
    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    local frame = params.frame
    pcall(function() moho.document:PrepUndo(lyr) end)

    local changed = {}

    if params.translation ~= nil or (params.transX ~= nil or params.transY ~= nil) then
        local tx = params.transX or (params.translation and params.translation.x) or 0
        local ty = params.transY or (params.translation and params.translation.y) or 0
        local ok, setErr = pcall(function()
            local vec = LM.Vector2:new_local()
            vec.x = tx
            vec.y = ty
            lyr.fTranslation:SetValue(frame, vec)
        end)
        if not ok then return nil, "Failed to set translation: " .. tostring(setErr) end
        changed.translation = { x = tx, y = ty }
    end

    if params.rotation ~= nil then
        local ok, setErr = pcall(function()
            lyr.fRotationZ:SetValue(frame, params.rotation)
        end)
        if not ok then return nil, "Failed to set rotation: " .. tostring(setErr) end
        changed.rotation = params.rotation
    end

    if params.scale ~= nil or (params.scaleX ~= nil or params.scaleY ~= nil) then
        local sx = params.scaleX or (params.scale and params.scale.x) or 1
        local sy = params.scaleY or (params.scale and params.scale.y) or 1
        local ok, setErr = pcall(function()
            local vec = LM.Vector2:new_local()
            vec.x = sx
            vec.y = sy
            lyr.fScale:SetValue(frame, vec)
        end)
        if not ok then return nil, "Failed to set scale: " .. tostring(setErr) end
        changed.scale = { x = sx, y = sy }
    end

    pcall(function() moho.document:SetDirty() end)

    return { success = true, layerId = params.layerId, frame = frame, changed = changed }
end

function layer.setVisibility(moho, params)
    if not params or params.layerId == nil then
        return nil, "Missing required parameter: layerId"
    end
    if params.visible == nil then
        return nil, "Missing required parameter: visible"
    end
    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    pcall(function() moho.document:PrepUndo(lyr) end)
    local ok, setErr = pcall(function() lyr:SetVisible(params.visible == true) end)
    if not ok then return nil, "Failed to set visibility: " .. tostring(setErr) end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, visible = params.visible == true }
end

function layer.setOpacity(moho, params)
    if not params or params.layerId == nil then
        return nil, "Missing required parameter: layerId"
    end
    if params.frame == nil then
        return nil, "Missing required parameter: frame"
    end
    if params.opacity == nil then
        return nil, "Missing required parameter: opacity"
    end
    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    pcall(function() moho.document:PrepUndo(lyr) end)
    local ok, setErr = pcall(function()
        lyr.fAlpha:SetValue(params.frame, params.opacity)
    end)
    if not ok then return nil, "Failed to set opacity: " .. tostring(setErr) end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, frame = params.frame, opacity = params.opacity }
end

function layer.setName(moho, params)
    if not params or params.layerId == nil then
        return nil, "Missing required parameter: layerId"
    end
    if type(params.name) ~= "string" then
        return nil, "Missing required parameter: name (string)"
    end
    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    pcall(function() moho.document:PrepUndo(lyr) end)
    local ok, setErr = pcall(function() lyr:SetName(params.name) end)
    if not ok then return nil, "Failed to set name: " .. tostring(setErr) end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, name = params.name }
end

function layer.selectLayer(moho, params)
    if not params or params.layerId == nil then
        return nil, "Missing required parameter: layerId"
    end
    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end
    local ok, selErr = pcall(function() moho:SetSelLayer(lyr) end)
    if not ok then return nil, "Failed to select layer: " .. tostring(selErr) end
    return { success = true, layerId = params.layerId, name = lyr:Name() }
end

-- layer.reorder: change a layer's index within its parent group.
function layer.reorder(moho, params)
    if not params or params.layerId == nil then
        return nil, "Missing required parameter: layerId"
    end
    if params.newIndex == nil then
        return nil, "Missing required parameter: newIndex"
    end
    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    pcall(function() moho.document:PrepUndo(lyr) end)
    local ok, moveErr = pcall(function()
        if params.parentId and params.parentId > 0 then
            local parent = getLayerById(moho, params.parentId)
            if parent and parent:IsGroupLayer() then
                local group = moho:LayerAsGroup(parent)
                group:MoveLayer(lyr, math.floor(params.newIndex))
            else
                return false, "parentId does not point to a group layer"
            end
        else
            moho.document:MoveLayer(lyr, math.floor(params.newIndex))
        end
        return true
    end)
    if not ok then return nil, "Failed to reorder layer: " .. tostring(moveErr) end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, newIndex = params.newIndex }
end

-- layer.setBlendMode: change a layer's blend mode by string name.
local BLEND_MODE_LOOKUP = {
    normal       = 0,
    multiply     = 1,
    screen       = 2,
    overlay      = 3,
    darken       = 4,
    lighten      = 5,
    color_dodge  = 6,
    color_burn   = 7,
    soft_light   = 8,
    hard_light   = 9,
    difference   = 10,
    exclusion    = 11,
}

function layer.setBlendMode(moho, params)
    if not params or params.layerId == nil then
        return nil, "Missing required parameter: layerId"
    end
    if not params.blendMode then return nil, "Missing required parameter: blendMode" end
    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    local mode = BLEND_MODE_LOOKUP[params.blendMode]
    if mode == nil then return nil, "Unknown blend mode: " .. tostring(params.blendMode) end

    pcall(function() moho.document:PrepUndo(lyr) end)
    local ok, setErr = pcall(function() lyr:SetBlendingMode(mode) end)
    if not ok then return nil, "Failed to set blend mode: " .. tostring(setErr) end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, blendMode = params.blendMode }
end

-- layer.setMask: toggle masking, optionally linking to another layer.
function layer.setMask(moho, params)
    if not params or params.layerId == nil then
        return nil, "Missing required parameter: layerId"
    end
    if params.masked == nil then return nil, "Missing required parameter: masked" end
    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    pcall(function() moho.document:PrepUndo(lyr) end)

    local ok, maskErr
    if params.masked and params.maskLayerId then
        local maskLayer, maskErr2 = getLayerById(moho, params.maskLayerId)
        if not maskLayer then ok = false; maskErr = maskErr2
        else
            ok, maskErr = pcall(function() lyr:SetMasked(true); lyr:SetMaskLayer(maskLayer) end)
        end
    else
        ok, maskErr = pcall(function() lyr:SetMasked(params.masked == true) end)
    end
    if not ok then return nil, "Failed to set mask: " .. tostring(maskErr) end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, masked = params.masked == true }
end

-- layer.createGroup: create a new group layer; optionally reparent existing layers.
function layer.createGroup(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if type(params.name) ~= "string" then return nil, "Missing required parameter: name" end

    pcall(function() moho.document:PrepUndo(nil) end)
    local ok, groupOrErr = pcall(function() return moho:CreateNewLayer(MOHO.LT_GROUP) end)
    if not ok or not groupOrErr then
        return nil, "Failed to create group layer: " .. tostring(groupOrErr)
    end
    local group = groupOrErr
    pcall(function() group:SetName(params.name) end)

    if type(params.childLayerIds) == "table" and #params.childLayerIds > 0 then
        for _, childId in ipairs(params.childLayerIds) do
            local child = getLayerById(moho, childId)
            if child then
                local parent = moho:LayerAsGroup(moho.document:LayerByAbsoluteID(
                    moho.document:LayerAbsoluteID(group)
                ))
                pcall(function() parent:AppendLayer(child) end)
            end
        end
    end

    local absId = moho.document:LayerAbsoluteID(group)
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = absId, name = params.name }
end

-- layer.createSwitch: create a switch layer with the supplied option layers.
function layer.createSwitch(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if type(params.name) ~= "string" then return nil, "Missing required parameter: name" end
    if type(params.optionLayerIds) ~= "table" or #params.optionLayerIds == 0 then
        return nil, "optionLayerIds must be a non-empty array"
    end

    pcall(function() moho.document:PrepUndo(nil) end)
    local ok, switchOrErr = pcall(function() return moho:CreateNewLayer(MOHO.LT_SWITCH) end)
    if not ok or not switchOrErr then
        return nil, "Failed to create switch layer: " .. tostring(switchOrErr)
    end
    local sw = switchOrErr
    pcall(function() sw:SetName(params.name) end)

    for i, optionId in ipairs(params.optionLayerIds) do
        local optionLyr = getLayerById(moho, optionId)
        if optionLyr then
            pcall(function()
                if i == 1 and params.activeIndex == nil then
                    sw:SetActiveLayer(i - 1)
                end
            end)
        end
    end

    if params.activeIndex then
        pcall(function() sw:SetActiveLayer(math.floor(params.activeIndex)) end)
    end

    local absId = moho.document:LayerAbsoluteID(sw)
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = absId, name = params.name, optionCount = #params.optionLayerIds }
end

-- layer.delete: remove a layer. DESTRUCTIVE — requires previewHash (validated upstream).
function layer.delete(moho, params)
    if not params or params.layerId == nil then
        return nil, "Missing required parameter: layerId"
    end
    if not params.previewHash or params.previewHash == "" then
        return nil, "previewHash is required for layer.delete"
    end
    local lyr, err = getLayerById(moho, params.layerId)
    if not lyr then return nil, err end

    pcall(function() moho.document:PrepUndo(nil) end)
    local ok, delErr = pcall(function() moho.document:DeleteLayer(lyr) end)
    if not ok then return nil, "Failed to delete layer: " .. tostring(delErr) end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId }
end

return layer
