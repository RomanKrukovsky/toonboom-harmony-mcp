-- mesh.lua
-- Tool handlers for vector mesh operations: read points/shapes, create points,
-- create bezier curves, weld, set fill/stroke/gradient/curvature.

local mesh = {}

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

local function getMesh(moho, layerId)
    local lyr, err = getLayerById(moho, layerId)
    if not lyr then return nil, nil, err end

    local ltOk, lt = pcall(function() return lyr:LayerType() end)
    if not ltOk then return nil, nil, "Failed to read layer type" end
    local isVector = false
    pcall(function()
        local M = MOHO or (LM and LM.MOHO)
        if M and lt == M.LT_VECTOR then isVector = true end
    end)
    if not isVector then
        return nil, nil, "Layer " .. tostring(layerId) .. " is not a vector layer"
    end

    local vOk, vecLyr = pcall(function() return moho:LayerAsVector(lyr) end)
    if not vOk or not vecLyr then
        return nil, nil, "Failed to cast layer to vector layer"
    end

    local mOk, meshObj = pcall(function() return vecLyr:Mesh() end)
    if not mOk or not meshObj then
        return nil, nil, "Failed to get mesh from vector layer"
    end
    return meshObj, vecLyr
end

local function vec2table(v)
    if v == nil then return { x = 0, y = 0 } end
    local ok, x, y = pcall(function() return tonumber(v.x) or 0, tonumber(v.y) or 0 end)
    if ok then return { x = x, y = y } end
    return { x = 0, y = 0 }
end

local function colorToHex(color)
    if color == nil then return nil end
    local ok, r, g, b, a = pcall(function()
        return tonumber(color.r), tonumber(color.g), tonumber(color.b), tonumber(color.a)
    end)
    if not ok or not r or not g or not b then return nil end
    if r <= 1.0 and g <= 1.0 and b <= 1.0 then
        r = math.floor(r * 255 + 0.5)
        g = math.floor(g * 255 + 0.5)
        b = math.floor(b * 255 + 0.5)
        if a then a = math.floor(a * 255 + 0.5) end
    end
    if a and a < 255 then
        return string.format("#%02X%02X%02X%02X", r, g, b, a)
    else
        return string.format("#%02X%02X%02X", r, g, b)
    end
end

local function colorToLM(color, fallback)
    local c = fallback or { r = 0, g = 0, b = 0, a = 1 }
    if type(color) == "table" then
        c.r = color.r or c.r
        c.g = color.g or c.g
        c.b = color.b or c.b
        c.a = color.a or c.a
    end
    return c
end

-- --------------------------------------------------------------------
-- Read handlers
-- --------------------------------------------------------------------

function mesh.getPoints(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end

    local meshObj, _, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end

    local countOk, pointCount = pcall(function() return meshObj:CountPoints() end)
    if not countOk then return nil, "Failed to count points: " .. tostring(pointCount) end

    local points = {}
    for i = 0, pointCount - 1 do
        local pOk, pt = pcall(function() return meshObj:Point(i) end)
        if pOk and pt then
            local entry = { index = i, position = vec2table(pt.fPos) }
            local selOk, sel = pcall(function() return pt.fSelected end)
            entry.selected = selOk and sel or false
            points[#points + 1] = entry
        end
    end
    return { layerId = params.layerId, pointCount = pointCount, points = points }
end

function mesh.getShapes(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end

    local meshObj, _, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end

    local countOk, shapeCount = pcall(function() return meshObj:CountShapes() end)
    if not countOk then return nil, "Failed to count shapes: " .. tostring(shapeCount) end

    local shapes = {}
    for i = 0, shapeCount - 1 do
        local sOk, shape = pcall(function() return meshObj:Shape(i) end)
        if sOk and shape then
            local entry = { index = i }
            local nOk, name = pcall(function() return shape:Name() end)
            entry.name = nOk and name or ""
            local eOk, ec = pcall(function() return shape:CountEdges() end)
            entry.edgeCount = eOk and ec or 0

            local fillOk, fc = pcall(function()
                if shape.fMyStyle then return shape.fMyStyle.fFillCol end
            end)
            if fillOk and fc then entry.fillColor = colorToHex(fc) end

            local strokeOk, sc = pcall(function()
                if shape.fMyStyle then return shape.fMyStyle.fLineCol end
            end)
            if strokeOk and sc then entry.strokeColor = colorToHex(sc) end

            local swOk, sw = pcall(function()
                if shape.fMyStyle then return shape.fMyStyle.fLineWidth end
            end)
            if swOk and sw then entry.strokeWidth = tonumber(sw) or 0 end

            local hfOk, hf = pcall(function() if shape.fMyStyle then return shape.fMyStyle.fHasFill end end)
            if hfOk and hf ~= nil then entry.hasFill = hf end
            local hsOk, hs = pcall(function() if shape.fMyStyle then return shape.fMyStyle.fHasLine end end)
            if hsOk and hs ~= nil then entry.hasStroke = hs end

            shapes[#shapes + 1] = entry
        end
    end
    return { layerId = params.layerId, shapeCount = shapeCount, shapes = shapes }
end

-- --------------------------------------------------------------------
-- Mutation handlers
-- --------------------------------------------------------------------

local function applyBezierHandles(point, params)
    if params.bezierInX ~= nil or params.bezierInY ~= nil then
        pcall(function()
            if point.fBezierIn then
                if params.bezierInX ~= nil then point.fBezierIn.x = params.bezierInX end
                if params.bezierInY ~= nil then point.fBezierIn.y = params.bezierInY end
            end
        end)
    end
    if params.bezierOutX ~= nil or params.bezierOutY ~= nil then
        pcall(function()
            if point.fBezierOut then
                if params.bezierOutX ~= nil then point.fBezierOut.x = params.bezierOutX end
                if params.bezierOutY ~= nil then point.fBezierOut.y = params.bezierOutY end
            end
        end)
    end
end

function mesh.createPoint(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.x == nil or params.y == nil then
        return nil, "Missing required parameters: x and y"
    end

    local meshObj, _, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end

    pcall(function() moho.document:PrepUndo(nil) end)

    local vec = LM.Vector2:new_local()
    vec.x = params.x
    vec.y = params.y
    local ok, pt = pcall(function() return meshObj:AddPoint(vec) end)
    if not ok or not pt then
        return nil, "Failed to add point: " .. tostring(pt)
    end
    applyBezierHandles(pt, params)
    pcall(function() moho.document:SetDirty() end)

    local newIndex = meshObj:CountPoints() - 1
    return {
        success = true,
        layerId = params.layerId,
        pointIndex = newIndex,
        x = params.x,
        y = params.y,
    }
end

function mesh.createBezier(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if type(params.points) ~= "table" or #params.points < 2 then
        return nil, "points must be an array of 2+ entries"
    end

    local meshObj, _, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end

    pcall(function() moho.document:PrepUndo(nil) end)

    local firstIndex = -1
    for i, p in ipairs(params.points) do
        if p.x == nil or p.y == nil then
            return nil, "point[" .. i .. "] missing x or y"
        end
        local vec = LM.Vector2:new_local()
        vec.x = p.x
        vec.y = p.y
        local ok, pt = pcall(function() return meshObj:AddPoint(vec) end)
        if not ok or not pt then
            return nil, "Failed to add point " .. i .. ": " .. tostring(pt)
        end
        if firstIndex < 0 then firstIndex = meshObj:CountPoints() - 1 end
        applyBezierHandles(pt, p)
    end

    -- Form a shape from the just-added points
    local closed = params.closed == true
    local shapeOk, shape = pcall(function()
        meshObj:SelectAll()
        return meshObj:MakeShape(closed)
    end)
    pcall(function() meshObj:DeselectAll() end)
    pcall(function() moho.document:SetDirty() end)

    return {
        success = true,
        layerId = params.layerId,
        pointCount = #params.points,
        firstIndex = firstIndex,
        shapeIndex = (shapeOk and shape) and (meshObj:CountShapes() - 1) or nil,
        closed = closed,
    }
end

-- mesh.weld: merge two points. DESTRUCTIVE — previewHash validated upstream.
function mesh.weld(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil or params.pointIndexA == nil or params.pointIndexB == nil then
        return nil, "Missing required parameters: layerId, pointIndexA, pointIndexB"
    end

    local meshObj, _, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end

    pcall(function() moho.document:PrepUndo(nil) end)
    local ok, weldErr = pcall(function() meshObj:WeldPoints(params.pointIndexA, params.pointIndexB) end)
    if not ok then return nil, "Failed to weld points: " .. tostring(weldErr) end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, pointIndexA = params.pointIndexA, pointIndexB = params.pointIndexB }
end

function mesh.setFill(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil or params.shapeIndex == nil or params.hasFill == nil then
        return nil, "Missing layerId/shapeIndex/hasFill"
    end
    local meshObj, _, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end
    local count = meshObj:CountShapes()
    if params.shapeIndex < 0 or params.shapeIndex >= count then
        return nil, "shapeIndex out of range"
    end
    local shape = meshObj:Shape(params.shapeIndex)

    pcall(function() moho.document:PrepUndo(nil) end)
    local ok, setErr = pcall(function()
        if shape and shape.fMyStyle then
            shape.fMyStyle.fHasFill = (params.hasFill == true)
            if params.color and type(params.color) == "table" then
                local c = shape.fMyStyle.fFillCol
                if c then
                    local rgb = colorToLM(params.color, c)
                    c.r = rgb.r
                    c.g = rgb.g
                    c.b = rgb.b
                    if rgb.a then c.a = rgb.a end
                end
            end
        end
    end)
    if not ok then return nil, "Failed to set fill: " .. tostring(setErr) end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, shapeIndex = params.shapeIndex, hasFill = params.hasFill == true }
end

function mesh.setStroke(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil or params.shapeIndex == nil or params.hasStroke == nil then
        return nil, "Missing layerId/shapeIndex/hasStroke"
    end
    local meshObj, _, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end
    local count = meshObj:CountShapes()
    if params.shapeIndex < 0 or params.shapeIndex >= count then
        return nil, "shapeIndex out of range"
    end
    local shape = meshObj:Shape(params.shapeIndex)

    pcall(function() moho.document:PrepUndo(nil) end)
    local ok, setErr = pcall(function()
        if shape and shape.fMyStyle then
            shape.fMyStyle.fHasLine = (params.hasStroke == true)
            if params.width ~= nil then shape.fMyStyle.fLineWidth = params.width end
            if params.color and type(params.color) == "table" then
                local c = shape.fMyStyle.fLineCol
                if c then
                    local rgb = colorToLM(params.color, c)
                    c.r = rgb.r
                    c.g = rgb.g
                    c.b = rgb.b
                    if rgb.a then c.a = rgb.a end
                end
            end
        end
    end)
    if not ok then return nil, "Failed to set stroke: " .. tostring(setErr) end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, shapeIndex = params.shapeIndex, hasStroke = params.hasStroke == true }
end

function mesh.setGradient(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil or params.shapeIndex == nil or params.enabled == nil then
        return nil, "Missing layerId/shapeIndex/enabled"
    end
    local meshObj, _, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end
    local count = meshObj:CountShapes()
    if params.shapeIndex < 0 or params.shapeIndex >= count then
        return nil, "shapeIndex out of range"
    end
    local shape = meshObj:Shape(params.shapeIndex)

    pcall(function() moho.document:PrepUndo(nil) end)
    local ok, setErr = pcall(function()
        if shape and shape.fMyStyle then
            if shape.fMyStyle.fHasGradient ~= nil then
                shape.fMyStyle.fHasGradient = (params.enabled == true)
            end
            if params.startColor and shape.fMyStyle.fGradStart then
                local c = colorToLM(params.startColor, shape.fMyStyle.fGradStart)
                shape.fMyStyle.fGradStart.r = c.r
                shape.fMyStyle.fGradStart.g = c.g
                shape.fMyStyle.fGradStart.b = c.b
            end
            if params.endColor and shape.fMyStyle.fGradEnd then
                local c = colorToLM(params.endColor, shape.fMyStyle.fGradEnd)
                shape.fMyStyle.fGradEnd.r = c.r
                shape.fMyStyle.fGradEnd.g = c.g
                shape.fMyStyle.fGradEnd.b = c.b
            end
            if params.angle ~= nil and shape.fMyStyle.fGradAngle ~= nil then
                shape.fMyStyle.fGradAngle = params.angle
            end
        end
    end)
    if not ok then return nil, "Failed to set gradient: " .. tostring(setErr) end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, shapeIndex = params.shapeIndex, enabled = params.enabled == true }
end

function mesh.setCurvature(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil or params.pointIndex == nil then
        return nil, "Missing layerId/pointIndex"
    end
    if params.bezierInX == nil or params.bezierInY == nil or
       params.bezierOutX == nil or params.bezierOutY == nil then
        return nil, "All four bezier handle coordinates are required"
    end

    local meshObj, _, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end
    local count = meshObj:CountPoints()
    if params.pointIndex < 0 or params.pointIndex >= count then
        return nil, "pointIndex out of range"
    end

    local point = meshObj:Point(params.pointIndex)
    pcall(function() moho.document:PrepUndo(nil) end)
    local ok, setErr = pcall(function()
        if point.fBezierIn then
            point.fBezierIn.x = params.bezierInX
            point.fBezierIn.y = params.bezierInY
        end
        if point.fBezierOut then
            point.fBezierOut.x = params.bezierOutX
            point.fBezierOut.y = params.bezierOutY
        end
    end)
    if not ok then return nil, "Failed to set curvature: " .. tostring(setErr) end
    pcall(function() moho.document:SetDirty() end)
    return { success = true, layerId = params.layerId, pointIndex = params.pointIndex }
end

return mesh
