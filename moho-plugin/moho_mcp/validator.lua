-- validator.lua
-- Allow-list validator and parameter validation for MohoMCP methods.
-- Mirrors the bridge-side safety engine in bridge/src/security/mohoSafetyEngine.ts.

local validator = {}

-- All method names allowed over the IPC bridge.
-- Adding a method here REQUIRES a matching implementation in moho-plugin/moho_mcp/tools/*.
local allowedMethods = {
    -- Document
    ["document.getInfo"]       = true,
    ["document.getLayers"]     = true,
    ["document.setFrame"]      = true,
    ["document.screenshot"]    = true,
    ["document.createLayer"]   = true,
    ["document.save"]          = true,
    ["document.close"]         = true,
    ["document.open"]          = true,
    ["document.render"]        = true,
    ["document.diagnose"]      = true,
    -- Layer
    ["layer.getProperties"]    = true,
    ["layer.getChildren"]      = true,
    ["layer.getBones"]         = true,
    ["layer.setTransform"]     = true,
    ["layer.setVisibility"]    = true,
    ["layer.setOpacity"]       = true,
    ["layer.setName"]          = true,
    ["layer.selectLayer"]      = true,
    ["layer.reorder"]          = true,
    ["layer.setBlendMode"]     = true,
    ["layer.setMask"]          = true,
    ["layer.createGroup"]      = true,
    ["layer.createSwitch"]     = true,
    ["layer.delete"]           = true,
    -- Bone
    ["bone.getProperties"]     = true,
    ["bone.setTransform"]      = true,
    ["bone.selectBone"]        = true,
    ["bone.createBone"]        = true,
    ["bone.deleteBone"]        = true,
    ["bone.setConstraints"]    = true,
    ["bone.setTarget"]         = true,
    ["bone.setParent"]         = true,
    -- Animation
    ["animation.getKeyframes"] = true,
    ["animation.getFrameState"]= true,
    ["animation.setKeyframe"]  = true,
    ["animation.setMultiKeyframe"] = true,
    ["animation.deleteKeyframe"]= true,
    ["animation.setInterpolation"]= true,
    ["animation.getPointAnim"] = true,
    -- Mesh
    ["mesh.getPoints"]         = true,
    ["mesh.getShapes"]         = true,
    ["mesh.createPoint"]       = true,
    ["mesh.createBezier"]      = true,
    ["mesh.weld"]              = true,
    ["mesh.setFill"]           = true,
    ["mesh.setStroke"]         = true,
    ["mesh.setGradient"]       = true,
    ["mesh.setCurvature"]      = true,
    -- Batch + Workflows
    ["batch.execute"]          = true,
    ["workflow.duplicateLayerTree"] = true,
    ["workflow.createSmartBone"] = true,
    ["workflow.applyLipSync"]  = true,
    ["workflow.batchRender"]   = true,
    ["workflow.projectDiagnostics"] = true,
    ["workflow.createCharacterRig"] = true,
}

-- Destructive methods. Require `previewHash` from the safety engine.
local destructiveMethods = {
    ["animation.deleteKeyframe"]  = true,
    ["layer.delete"]               = true,
    ["bone.deleteBone"]            = true,
    ["mesh.weld"]                  = true,
    ["document.save"]              = true,
    ["document.close"]             = true,
    ["workflow.batchRender"]       = true,
}

-- Permitted interpolation modes. See INTERPOLATION_MODES in bridge.
local INTERP_MODES = {
    linear   = true,
    smooth   = true,
    ease_in  = true,
    ease_out = true,
    step     = true,
    bezier   = true,
    noisy    = true,
    cycle    = true,
}

-- Permitted layer types for createLayer / createGroup / createSwitch.
local LAYER_TYPES = {
    vector   = true,
    bone     = true,
    group    = true,
    image    = true,
    audio    = true,
    switch   = true,
    particle = true,
    note     = true,
    patch    = true,
}

-- Maximum allowed batch size (matches bridge config.moho.maxBatchSize).
local MAX_BATCH_OPS = 50

-- Parameter schemas. `type` is the required type; `optional` lets the field be absent.
-- `enum` restricts to a list of strings; `min`/`max` for numbers; `custom` for special cases.
local paramSchemas = {
    -- Document read
    ["document.getInfo"]       = {},
    ["document.getLayers"]     = {},
    ["document.setFrame"]      = {
        { name = "frame", type = "number" },
    },
    ["document.createLayer"]   = {
        { name = "layerType", type = "string", enum = "LAYER_TYPES" },
        { name = "name",      type = "string" },
        { name = "parentId",  type = "number", optional = true },
    },
    ["document.screenshot"]    = {
        { name = "width",      type = "number", optional = true },
        { name = "height",     type = "number", optional = true },
        { name = "outputPath", type = "string", optional = true },
    },
    ["document.save"]          = {
        { name = "path",        type = "string", optional = true },
        { name = "format",      type = "string", enum = { "moho", "fbx", "json" }, optional = true },
        { name = "previewHash", type = "string" },
    },
    ["document.close"]         = {
        { name = "save",        type = "boolean", optional = true },
        { name = "previewHash", type = "string" },
    },
    ["document.open"]          = {
        { name = "path", type = "string" },
    },
    ["document.render"]        = {
        { name = "outputPath", type = "string" },
        { name = "width",      type = "number" },
        { name = "height",     type = "number" },
        { name = "startFrame", type = "number", optional = true },
        { name = "endFrame",   type = "number", optional = true },
        { name = "format",     type = "string", enum = { "png", "jpg", "tiff", "exr" }, optional = true },
    },
    ["document.diagnose"]      = {},

    -- Layer
    ["layer.getProperties"]    = {
        { name = "layerId", type = "number" },
    },
    ["layer.getChildren"]      = {
        { name = "layerId", type = "number" },
    },
    ["layer.getBones"]         = {
        { name = "layerId", type = "number" },
    },
    ["layer.setTransform"]     = {
        { name = "layerId",     type = "number" },
        { name = "translation", type = "table",  optional = true },
        { name = "rotation",    type = "number", optional = true },
        { name = "scale",       type = "table",  optional = true },
        { name = "frame",       type = "number", optional = true },
    },
    ["layer.setVisibility"]    = {
        { name = "layerId", type = "number" },
        { name = "visible", type = "boolean" },
        { name = "frame",   type = "number", optional = true },
    },
    ["layer.setOpacity"]       = {
        { name = "layerId", type = "number" },
        { name = "opacity", type = "number" },
        { name = "frame",   type = "number", optional = true },
    },
    ["layer.setName"]          = {
        { name = "layerId", type = "number" },
        { name = "name",    type = "string" },
    },
    ["layer.selectLayer"]      = {
        { name = "layerId", type = "number" },
    },
    ["layer.reorder"]          = {
        { name = "layerId",  type = "number" },
        { name = "newIndex", type = "number" },
        { name = "parentId", type = "number", optional = true },
    },
    ["layer.setBlendMode"]     = {
        { name = "layerId",   type = "number" },
        { name = "blendMode", type = "string", enum = {
            "normal", "multiply", "screen", "overlay", "darken", "lighten",
            "color_dodge", "color_burn", "soft_light", "hard_light",
            "difference", "exclusion",
        } },
        { name = "frame",     type = "number", optional = true },
    },
    ["layer.setMask"]          = {
        { name = "layerId",     type = "number" },
        { name = "masked",      type = "boolean" },
        { name = "maskLayerId", type = "number", optional = true },
    },
    ["layer.createGroup"]      = {
        { name = "name",          type = "string" },
        { name = "childLayerIds", type = "table",  optional = true, of = "number" },
    },
    ["layer.createSwitch"]     = {
        { name = "name",          type = "string" },
        { name = "optionLayerIds", type = "table", of = "number" },
        { name = "activeIndex",   type = "number", optional = true },
    },
    ["layer.delete"]           = {
        { name = "layerId",     type = "number" },
        { name = "previewHash", type = "string" },
    },

    -- Bone
    ["bone.getProperties"]     = {
        { name = "layerId", type = "number" },
        { name = "boneId",  type = "number" },
    },
    ["bone.setTransform"]      = {
        { name = "layerId", type = "number" },
        { name = "boneId",  type = "number" },
        { name = "position", type = "table",  optional = true },
        { name = "angle",    type = "number", optional = true },
        { name = "scale",    type = "number", optional = true },
        { name = "frame",    type = "number", optional = true },
    },
    ["bone.selectBone"]        = {
        { name = "layerId", type = "number" },
        { name = "boneId",  type = "number" },
    },
    ["bone.createBone"]        = {
        { name = "layerId",      type = "number" },
        { name = "name",         type = "string" },
        { name = "position",     type = "table",  optional = true },
        { name = "angle",        type = "number", optional = true },
        { name = "parentBoneId", type = "number", optional = true },
    },
    ["bone.deleteBone"]        = {
        { name = "layerId",     type = "number" },
        { name = "boneId",      type = "number" },
        { name = "previewHash", type = "string" },
    },
    ["bone.setConstraints"]    = {
        { name = "layerId",        type = "number" },
        { name = "boneId",         type = "number" },
        { name = "minAngle",        type = "number", optional = true },
        { name = "maxAngle",        type = "number", optional = true },
        { name = "enabled",        type = "boolean", optional = true },
        { name = "positionControl", type = "boolean", optional = true },
        { name = "angleControl",    type = "boolean", optional = true },
        { name = "scaleControl",    type = "boolean", optional = true },
    },
    ["bone.setTarget"]         = {
        { name = "layerId",      type = "number" },
        { name = "boneId",       type = "number" },
        { name = "targetLayerId", type = "number" },
        { name = "targetBoneId",  type = "number", optional = true },
    },
    ["bone.setParent"]         = {
        { name = "layerId",     type = "number" },
        { name = "boneId",      type = "number" },
        { name = "parentBoneId", type = "number" },
    },

    -- Animation
    ["animation.getKeyframes"] = {
        { name = "layerId", type = "number" },
        { name = "channel", type = "string" },
    },
    ["animation.getFrameState"]= {
        { name = "layerId", type = "number" },
        { name = "frame",   type = "number" },
    },
    ["animation.setKeyframe"]  = {
        { name = "layerId", type = "number" },
        { name = "channel", type = "string" },
        { name = "frame",   type = "number" },
        { name = "value",   type = "any" },
    },
    ["animation.setMultiKeyframe"] = {
        { name = "layerId",   type = "number" },
        { name = "channel",   type = "string" },
        { name = "keyframes", type = "table" },
    },
    ["animation.deleteKeyframe"] = {
        { name = "layerId",     type = "number" },
        { name = "channel",     type = "string" },
        { name = "frame",       type = "number" },
        { name = "previewHash", type = "string" },
    },
    ["animation.setInterpolation"] = {
        { name = "layerId",   type = "number" },
        { name = "channel",   type = "string" },
        { name = "frame",     type = "number" },
        { name = "interpMode", type = "string", enum = "INTERP_MODES" },
    },
    ["animation.getPointAnim"] = {
        { name = "layerId",    type = "number" },
        { name = "pointIndex", type = "number" },
    },

    -- Mesh
    ["mesh.getPoints"]         = {
        { name = "layerId", type = "number" },
    },
    ["mesh.getShapes"]         = {
        { name = "layerId", type = "number" },
    },
    ["mesh.createPoint"]       = {
        { name = "layerId",     type = "number" },
        { name = "x",           type = "number" },
        { name = "y",           type = "number" },
        { name = "bezierInX",   type = "number", optional = true },
        { name = "bezierInY",   type = "number", optional = true },
        { name = "bezierOutX",  type = "number", optional = true },
        { name = "bezierOutY",  type = "number", optional = true },
    },
    ["mesh.createBezier"]      = {
        { name = "layerId", type = "number" },
        { name = "points",  type = "table" },
        { name = "closed",  type = "boolean", optional = true },
    },
    ["mesh.weld"]              = {
        { name = "layerId",      type = "number" },
        { name = "pointIndexA",  type = "number" },
        { name = "pointIndexB",  type = "number" },
        { name = "previewHash",  type = "string" },
    },
    ["mesh.setFill"]           = {
        { name = "layerId",   type = "number" },
        { name = "shapeIndex", type = "number" },
        { name = "hasFill",   type = "boolean" },
        { name = "color",     type = "table",  optional = true },
    },
    ["mesh.setStroke"]         = {
        { name = "layerId",   type = "number" },
        { name = "shapeIndex", type = "number" },
        { name = "hasStroke", type = "boolean" },
        { name = "width",     type = "number", optional = true },
        { name = "color",     type = "table",  optional = true },
    },
    ["mesh.setGradient"]       = {
        { name = "layerId",   type = "number" },
        { name = "shapeIndex", type = "number" },
        { name = "enabled",   type = "boolean" },
        { name = "startColor", type = "table", optional = true },
        { name = "endColor",   type = "table", optional = true },
        { name = "angle",     type = "number", optional = true },
    },
    ["mesh.setCurvature"]      = {
        { name = "layerId",    type = "number" },
        { name = "pointIndex", type = "number" },
        { name = "bezierInX",  type = "number" },
        { name = "bezierInY",  type = "number" },
        { name = "bezierOutX", type = "number" },
        { name = "bezierOutY", type = "number" },
    },

    -- Batch
    ["batch.execute"]          = {
        { name = "operations", type = "table" },
    },

    -- Workflows
    ["workflow.duplicateLayerTree"] = {
        { name = "layerId",         type = "number" },
        { name = "newName",         type = "string" },
        { name = "includeAnimation", type = "boolean", optional = true },
    },
    ["workflow.createSmartBone"] = {
        { name = "layerId",    type = "number" },
        { name = "boneId",     type = "number" },
        { name = "actionName", type = "string" },
        { name = "startFrame", type = "number" },
        { name = "endFrame",   type = "number" },
        { name = "parameters", type = "table", optional = true, of = "number" },
    },
    ["workflow.applyLipSync"]  = {
        { name = "layerId",  type = "number" },
        { name = "phonemes", type = "table" },
    },
    ["workflow.batchRender"]   = {
        { name = "scenes",      type = "table" },
        { name = "previewHash", type = "string" },
    },
    ["workflow.projectDiagnostics"] = {},
    ["workflow.createCharacterRig"] = {
        { name = "characterName", type = "string" },
        { name = "rigProfile",    type = "string", enum = { "simple", "standard", "complex" }, optional = true },
        { name = "views",         type = "table", optional = true },
    },
}

--- Check whether a method name is in the allow-list.
function validator.isAllowed(method)
    return type(method) == "string" and allowedMethods[method] == true
end

--- Check whether a method is destructive.
function validator.isDestructive(method)
    return destructiveMethods[method] == true
end

--- Validate an interpolation mode string.
function validator.isValidInterp(mode)
    return INTERP_MODES[mode] == true
end

--- Validate a layer type string.
function validator.isValidLayerType(t)
    return LAYER_TYPES[t] == true
end

--- Validate parameters for a given method against its expected schema.
-- @param method string
-- @param params table|nil
-- @return boolean ok
-- @return string|nil error
function validator.validateParams(method, params)
    if not validator.isAllowed(method) then
        return false, "Unknown or disallowed method: " .. tostring(method)
    end

    local schema = paramSchemas[method]
    if schema == nil then
        return false, "Method has no parameter schema: " .. tostring(method)
    end

    if #schema == 0 then
        return true, nil
    end

    if type(params) ~= "table" then
        return false, "Missing params: expected a table of parameters"
    end

    for _, field in ipairs(schema) do
        local value = params[field.name]
        if value == nil then
            if field.optional then
                -- ok
            else
                return false, "Missing required parameter: " .. field.name
            end
        else
            local actualType = type(value)
            if actualType ~= field.type then
                return false, string.format(
                    "Invalid parameter type for '%s': expected %s, got %s",
                    field.name, field.type, actualType
                )
            end

            if field.enum == "LAYER_TYPES" and not LAYER_TYPES[value] then
                return false, "Invalid layerType: " .. tostring(value)
            elseif field.enum == "INTERP_MODES" and not INTERP_MODES[value] then
                return false, "Invalid interpolation mode: " .. tostring(value)
            elseif type(field.enum) == "table" then
                local allowed = false
                for _, v in ipairs(field.enum) do
                    if v == value then allowed = true; break end
                end
                if not allowed then
                    return false, "Invalid value for '" .. field.name .. "': " .. tostring(value)
                end
            end

            if field.type == "number" then
                if field.min ~= nil and value < field.min then
                    return false, "Value for '" .. field.name .. "' is below minimum " .. field.min
                end
                if field.max ~= nil and value > field.max then
                    return false, "Value for '" .. field.name .. "' is above maximum " .. field.max
                end
            end
        end
    end

    return true, nil
end

--- Validate a batch of operations.
function validator.validateBatch(operations)
    if type(operations) ~= "table" then
        return false, "operations must be an array"
    end
    if #operations == 0 then
        return false, "operations array must not be empty"
    end
    if #operations > MAX_BATCH_OPS then
        return false, string.format(
            "batch exceeds MAX_BATCH_OPS=%d (got %d)", MAX_BATCH_OPS, #operations
        )
    end
    for i, op in ipairs(operations) do
        if type(op) ~= "table" then
            return false, string.format("op[%d] must be a table", i)
        end
        if type(op.method) ~= "string" or op.method == "" then
            return false, string.format("op[%d].method must be a non-empty string", i)
        end
        local ok, err = validator.validateParams(op.method, op.params or {})
        if not ok then
            return false, string.format("op[%d] (%s): %s", i, op.method, err or "invalid")
        end
    end
    return true, nil
end

return validator
