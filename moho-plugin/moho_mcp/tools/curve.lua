-- curve.lua
-- Tool handlers for precise bezier curve editing on vector layers, plus
-- document-level depth sorting.
--
-- Every Moho API call used here was verified against the shipped scripts in
-- /Applications/Moho.app/Contents/Resources/Support. Sources are cited per
-- handler. No signature is invented.
--
-- UNDO STRATEGY (important):
--   We use moho.document:PrepUndo(layer), NOT mesh:PrepMovePoints().
--   Moho's own curvature tool (Scripts/Tool/lm_curvature.lua:171) calls
--   PrepUndo(moho.drawingLayer) and contains zero PrepMovePoints calls.
--   PrepMovePoints is only used by tools that translate point POSITIONS
--   (lm_transform_points, lm_magnet, lm_noise, lm_bend_points, lm_shear_points,
--   lm_perspective_points). Control handles, weights and segment on/off do not
--   move points, so PrepUndo is the correct and sufficient snapshot here.

local curve = {}

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

-- Resolve the vector mesh for a layer. Mirrors the shape of mesh.lua's private
-- helper; duplicated intentionally because that helper is module-local and
-- mesh.lua is owned by another agent (must not be edited).
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
    return meshObj, lyr
end

local function vec2table(v)
    if v == nil then return { x = 0, y = 0 } end
    local ok, x, y = pcall(function() return tonumber(v.x) or 0, tonumber(v.y) or 0 end)
    if ok then return { x = x, y = y } end
    return { x = 0, y = 0 }
end

-- Curve channels are animatable, so every get/set needs a frame. Prefer an
-- explicit caller frame, then the drawing frame Moho tool scripts use
-- (moho.drawingLayerFrame -- see lm_curvature.lua, lm_autoweld.lua), then the
-- layer frame, then the document frame, then 0.
local function resolveFrame(moho, requested)
    if type(requested) == "number" then return requested end
    local frame
    pcall(function() frame = moho.drawingLayerFrame end)
    if type(frame) == "number" then return frame end
    pcall(function() frame = moho.layerFrame end)
    if type(frame) == "number" then return frame end
    pcall(function() frame = moho.document:CurrentFrame() end)
    if type(frame) == "number" then return frame end
    return 0
end

-- Fetch and range-check a curve. Out-of-range indices crash the script inside
-- Moho, so this must run before any curve access.
local function getCurveAt(meshObj, curveIndex)
    if type(curveIndex) ~= "number" then return nil, "curveIndex must be a number" end
    local cOk, curveCount = pcall(function() return meshObj:CountCurves() end)
    if not cOk or type(curveCount) ~= "number" then
        return nil, "Failed to count curves"
    end
    if curveCount < 1 then return nil, "Layer has no curves" end
    if curveIndex < 0 or curveIndex >= curveCount then
        return nil, "curveIndex out of range (0.." .. (curveCount - 1) .. ")"
    end
    local ok, crv = pcall(function() return meshObj:Curve(curveIndex) end)
    if not ok or not crv then
        return nil, "Failed to get curve at index " .. tostring(curveIndex)
    end
    return crv
end

local function checkPointIndex(crv, pointIndex)
    if type(pointIndex) ~= "number" then return nil, "pointIndex must be a number" end
    local ok, count = pcall(function() return crv:CountPoints() end)
    if not ok or type(count) ~= "number" then return nil, "Failed to count curve points" end
    if pointIndex < 0 or pointIndex >= count then
        return nil, "pointIndex out of range (0.." .. (count - 1) .. ")"
    end
    return count
end

local function checkSegmentIndex(crv, segmentIndex)
    if type(segmentIndex) ~= "number" then return nil, "segmentIndex must be a number" end
    local ok, count = pcall(function() return crv:CountSegments() end)
    if not ok or type(count) ~= "number" then return nil, "Failed to count curve segments" end
    if count < 1 then return nil, "Curve has no segments" end
    if segmentIndex < 0 or segmentIndex >= count then
        return nil, "segmentIndex out of range (0.." .. (count - 1) .. ")"
    end
    return count
end

-- Moho encodes handle side as a boolean: true = incoming ("in") handle,
-- false = outgoing ("out") handle. Derived from lm_curvature.lua:107/122 where
-- GetControlHandle(j, frame, true) is the handle guarded against j == 0 on an
-- open curve (i.e. the leading one) and ...,false is guarded against the last
-- point.
local function resolveSide(side)
    if side == nil then return nil, "Missing required parameter: side (\"in\" or \"out\")" end
    if side == "in" then return true end
    if side == "out" then return false end
    if side == true then return true end
    if side == false then return false end
    return nil, "side must be \"in\" or \"out\""
end

-- Curve edits create keyframes on the curve channel in Moho's own tools
-- (moho:NewKeyframe(CHANNEL_CURVE), lm_curvature.lua:342). CHANNEL_CURVE is a
-- host-provided global that may not exist in every scripting context, so this
-- is strictly best-effort and never fails the operation.
local function touchCurveKeyframe(moho)
    pcall(function()
        if CHANNEL_CURVE ~= nil then moho:NewKeyframe(CHANNEL_CURVE) end
    end)
end

-- --------------------------------------------------------------------
-- Read handlers
-- --------------------------------------------------------------------

-- curve.getCurves: enumerate the layer's curves with point/segment counts.
-- API: mesh:CountCurves(), mesh:Curve(i), curve:CountPoints(),
--      curve:CountSegments(), curve:IsSelected(), curve.fClosed,
--      curve:Point(j), mesh:PointID(pt), curve:GetCurvature(j, frame),
--      curve:GetWeight(j, frame, bool)
-- Sources: lm_curvature.lua:101-124, lm_create_shape.lua:398-410,
--          lm_utilities.lua:431-436, HS_FillMesh.lua:563
function curve.getCurves(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end

    local meshObj, _, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end

    local cOk, curveCount = pcall(function() return meshObj:CountCurves() end)
    if not cOk or type(curveCount) ~= "number" then
        return nil, "Failed to count curves: " .. tostring(curveCount)
    end

    local frame = resolveFrame(moho, params.frame)
    local includePoints = params.includePoints == true

    local curves = {}
    for i = 0, curveCount - 1 do
        local gOk, crv = pcall(function() return meshObj:Curve(i) end)
        if gOk and crv then
            local entry = { index = i }

            local pOk, pc = pcall(function() return crv:CountPoints() end)
            entry.pointCount = (pOk and type(pc) == "number") and pc or 0

            local sOk, sc = pcall(function() return crv:CountSegments() end)
            entry.segmentCount = (sOk and type(sc) == "number") and sc or 0

            local clOk, closed = pcall(function() return crv.fClosed end)
            if clOk and closed ~= nil then entry.closed = closed and true or false end

            local selOk, sel = pcall(function() return crv:IsSelected() end)
            if selOk and sel ~= nil then entry.selected = sel and true or false end

            if includePoints and entry.pointCount > 0 then
                local pts = {}
                for j = 0, entry.pointCount - 1 do
                    local ptOk, pt = pcall(function() return crv:Point(j) end)
                    if ptOk and pt then
                        local p = { curvePointIndex = j }

                        -- Mesh-level ID lets callers cross-reference mesh.getPoints.
                        local idOk, meshId = pcall(function() return meshObj:PointID(pt) end)
                        if idOk and type(meshId) == "number" then p.meshPointIndex = meshId end

                        local posOk, pos = pcall(function() return pt.fPos end)
                        if posOk then p.position = vec2table(pos) end

                        local psOk, psel = pcall(function() return pt.fSelected end)
                        if psOk and psel ~= nil then p.selected = psel and true or false end

                        local curvOk, curvature = pcall(function()
                            return crv:GetCurvature(j, frame)
                        end)
                        if curvOk and type(curvature) == "number" then p.curvature = curvature end

                        local wiOk, wIn = pcall(function() return crv:GetWeight(j, frame, true) end)
                        if wiOk and type(wIn) == "number" then p.weightIn = wIn end
                        local woOk, wOut = pcall(function() return crv:GetWeight(j, frame, false) end)
                        if woOk and type(wOut) == "number" then p.weightOut = wOut end

                        pts[#pts + 1] = p
                    end
                end
                entry.points = pts
            end

            curves[#curves + 1] = entry
        end
    end

    return {
        layerId = params.layerId,
        frame = frame,
        curveCount = curveCount,
        curves = curves,
    }
end

-- curve.getControlHandle: read one bezier control handle in world coordinates.
-- API: curve:GetControlHandle(pointIndex, frame, isIncoming) -> LM.Vector2
-- Sources: lm_curvature.lua:107,122; lm_paint_bucket.lua:267-268;
--          lm_delete_edge.lua:157-158
function curve.getControlHandle(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.curveIndex == nil then return nil, "Missing required parameter: curveIndex" end
    if params.pointIndex == nil then return nil, "Missing required parameter: pointIndex" end

    local meshObj, _, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end

    local crv, cErr = getCurveAt(meshObj, params.curveIndex)
    if not crv then return nil, cErr end

    local _, pErr = checkPointIndex(crv, params.pointIndex)
    if pErr then return nil, pErr end

    local frame = resolveFrame(moho, params.frame)

    -- side is optional here: with no side we report both handles.
    local result = {
        layerId = params.layerId,
        curveIndex = params.curveIndex,
        pointIndex = params.pointIndex,
        frame = frame,
    }

    if params.side ~= nil then
        local isIn, sErr = resolveSide(params.side)
        if sErr then return nil, sErr end
        local ok, handle = pcall(function()
            return crv:GetControlHandle(params.pointIndex, frame, isIn)
        end)
        if not ok then
            return nil, "Failed to read control handle: " .. tostring(handle)
        end
        result.side = isIn and "in" or "out"
        result.handle = vec2table(handle)
    else
        local inOk, hIn = pcall(function()
            return crv:GetControlHandle(params.pointIndex, frame, true)
        end)
        if not inOk then return nil, "Failed to read incoming handle: " .. tostring(hIn) end
        local outOk, hOut = pcall(function()
            return crv:GetControlHandle(params.pointIndex, frame, false)
        end)
        if not outOk then return nil, "Failed to read outgoing handle: " .. tostring(hOut) end
        result.handleIn = vec2table(hIn)
        result.handleOut = vec2table(hOut)
    end

    local curvOk, curvature = pcall(function()
        return crv:GetCurvature(params.pointIndex, frame)
    end)
    if curvOk and type(curvature) == "number" then result.curvature = curvature end

    return result
end

-- curve.getSegmentLength: length of one curve segment in document units.
-- API: curve:SegmentLength(segmentIndex) -> number
-- Sources: lm_freehand.lua:1169-1172; lm_line_width.lua:171,253;
--          lm_utilities.lua:372-373
function curve.getSegmentLength(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.curveIndex == nil then return nil, "Missing required parameter: curveIndex" end

    local meshObj, _, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end

    local crv, cErr = getCurveAt(meshObj, params.curveIndex)
    if not crv then return nil, cErr end

    local segOk, segCount = pcall(function() return crv:CountSegments() end)
    if not segOk or type(segCount) ~= "number" then
        return nil, "Failed to count curve segments"
    end
    if segCount < 1 then return nil, "Curve has no segments" end

    -- No segmentIndex: report every segment plus the total.
    if params.segmentIndex == nil then
        local segments = {}
        local total = 0
        for i = 0, segCount - 1 do
            local lOk, len = pcall(function() return crv:SegmentLength(i) end)
            local value = (lOk and type(len) == "number") and len or nil
            segments[#segments + 1] = { index = i, length = value }
            if value then total = total + value end
        end
        return {
            layerId = params.layerId,
            curveIndex = params.curveIndex,
            segmentCount = segCount,
            segments = segments,
            totalLength = total,
        }
    end

    local _, sErr = checkSegmentIndex(crv, params.segmentIndex)
    if sErr then return nil, sErr end

    local lOk, len = pcall(function() return crv:SegmentLength(params.segmentIndex) end)
    if not lOk or type(len) ~= "number" then
        return nil, "Failed to read segment length: " .. tostring(len)
    end

    local result = {
        layerId = params.layerId,
        curveIndex = params.curveIndex,
        segmentIndex = params.segmentIndex,
        segmentCount = segCount,
        length = len,
    }

    local selOk, sel = pcall(function() return crv:IsSegmentSelected(params.segmentIndex) end)
    if selOk and sel ~= nil then result.selected = sel and true or false end

    return result
end

-- --------------------------------------------------------------------
-- Mutation handlers
-- --------------------------------------------------------------------

-- curve.setControlHandle: move one bezier control handle. MUTATION.
-- API: curve:SetControlHandle(pointIndex, LM.Vector2, frame, isIncoming, syncHandles)
-- Source: lm_curvature.lua:259; lm_paint_bucket.lua:311-312;
--         lm_delete_edge.lua:171,173
--
-- Moho guards this call: a point whose curvature is ~0 (perfectly peaked)
-- ignores handle changes. lm_curvature.lua:257-258 nudges curvature to 0.001
-- first. We replicate that, otherwise the edit silently does nothing.
function curve.setControlHandle(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.curveIndex == nil then return nil, "Missing required parameter: curveIndex" end
    if params.pointIndex == nil then return nil, "Missing required parameter: pointIndex" end
    if type(params.x) ~= "number" or type(params.y) ~= "number" then
        return nil, "Missing required numeric parameters: x and y"
    end

    local isIn, sErr = resolveSide(params.side)
    if sErr then return nil, sErr end

    local meshObj, lyr, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end

    local crv, cErr = getCurveAt(meshObj, params.curveIndex)
    if not crv then return nil, cErr end

    local _, pErr = checkPointIndex(crv, params.pointIndex)
    if pErr then return nil, pErr end

    local frame = resolveFrame(moho, params.frame)
    -- syncHandles mirrors the opposite handle to keep the point smooth. Moho
    -- defaults to true and disables it when Alt is held (lm_curvature.lua:250).
    local syncHandles = true
    if params.syncHandles ~= nil then syncHandles = params.syncHandles == true end

    pcall(function() moho.document:PrepUndo(lyr) end)

    local nudged = false
    pcall(function()
        local c = crv:GetCurvature(params.pointIndex, frame)
        if type(c) == "number" and math.abs(c) < 0.001 then
            crv:SetCurvature(params.pointIndex, 0.001, frame)
            nudged = true
        end
    end)

    local ok, setErr = pcall(function()
        local vec = LM.Vector2:new_local()
        vec.x = params.x
        vec.y = params.y
        crv:SetControlHandle(params.pointIndex, vec, frame, isIn, syncHandles)
    end)
    if not ok then
        return nil, "Failed to set control handle: " .. tostring(setErr)
    end

    touchCurveKeyframe(moho)
    pcall(function() moho.document:SetDirty() end)

    return {
        success = true,
        layerId = params.layerId,
        curveIndex = params.curveIndex,
        pointIndex = params.pointIndex,
        side = isIn and "in" or "out",
        frame = frame,
        syncHandles = syncHandles,
        curvatureNudged = nudged,
        x = params.x,
        y = params.y,
    }
end

-- curve.setWeight: set the handle weight (handle length factor) at a point.
-- MUTATION.
-- API: curve:SetWeight(pointIndex, weight, frame, isIncoming)
-- Source: lm_add_point.lua:271-272,303; lm_curvature.lua:563-564
--
-- With no side given, both handles are set (the symmetric case Moho itself
-- writes as two consecutive calls).
function curve.setWeight(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.curveIndex == nil then return nil, "Missing required parameter: curveIndex" end
    if params.pointIndex == nil then return nil, "Missing required parameter: pointIndex" end
    if type(params.weight) ~= "number" then
        return nil, "Missing required numeric parameter: weight"
    end
    -- Sanity bound only. Moho's own PEAK_WEIGHT constant is host-defined and
    -- not readable from Lua source, so we do not pretend to know the exact cap.
    if params.weight < 0 or params.weight > 1000 then
        return nil, "weight out of sane range (0..1000)"
    end

    local isIn = nil
    if params.side ~= nil then
        local resolved, sErr = resolveSide(params.side)
        if sErr then return nil, sErr end
        isIn = resolved
    end

    local meshObj, lyr, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end

    local crv, cErr = getCurveAt(meshObj, params.curveIndex)
    if not crv then return nil, cErr end

    local _, pErr = checkPointIndex(crv, params.pointIndex)
    if pErr then return nil, pErr end

    local frame = resolveFrame(moho, params.frame)

    pcall(function() moho.document:PrepUndo(lyr) end)

    local ok, setErr = pcall(function()
        if isIn == nil then
            crv:SetWeight(params.pointIndex, params.weight, frame, true)
            crv:SetWeight(params.pointIndex, params.weight, frame, false)
        else
            crv:SetWeight(params.pointIndex, params.weight, frame, isIn)
        end
    end)
    if not ok then
        return nil, "Failed to set weight: " .. tostring(setErr)
    end

    touchCurveKeyframe(moho)
    pcall(function() moho.document:SetDirty() end)

    return {
        success = true,
        layerId = params.layerId,
        curveIndex = params.curveIndex,
        pointIndex = params.pointIndex,
        side = (isIn == nil) and "both" or (isIn and "in" or "out"),
        frame = frame,
        weight = params.weight,
    }
end

-- curve.setSegmentOn: show or hide one curve segment's stroke. MUTATION.
-- API: curve:SetSegmentOn(segmentIndex, on)  -- 2 args, NOT animatable
-- Source: lm_create_shape.lua:411,425; lm_freehand.lua:769,784,818
--
-- Note: unlike handles/weights this takes no frame argument in any shipped
-- script, so it is treated as a static mesh property.
function curve.setSegmentOn(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.curveIndex == nil then return nil, "Missing required parameter: curveIndex" end
    if params.segmentIndex == nil then return nil, "Missing required parameter: segmentIndex" end
    if params.on == nil then return nil, "Missing required parameter: on" end
    if type(params.on) ~= "boolean" then return nil, "on must be a boolean" end

    local meshObj, lyr, err = getMesh(moho, params.layerId)
    if not meshObj then return nil, err end

    local crv, cErr = getCurveAt(meshObj, params.curveIndex)
    if not crv then return nil, cErr end

    local _, sErr = checkSegmentIndex(crv, params.segmentIndex)
    if sErr then return nil, sErr end

    pcall(function() moho.document:PrepUndo(lyr) end)

    local ok, setErr = pcall(function()
        crv:SetSegmentOn(params.segmentIndex, params.on == true)
    end)
    if not ok then
        return nil, "Failed to set segment state: " .. tostring(setErr)
    end

    pcall(function() moho.document:SetDirty() end)

    return {
        success = true,
        layerId = params.layerId,
        curveIndex = params.curveIndex,
        segmentIndex = params.segmentIndex,
        on = params.on == true,
    }
end

-- curve.depthSort: re-sort every layer in the document by depth. MUTATION.
-- API: moho.document:DepthSort()  -- no arguments
-- Source: lm_transform_layer.lua:578,629,665,1097; lm_track_camera.lua:112;
--         lm_pantilt_camera.lua:127; lm_set_origin.lua:84
--
-- SCOPE WARNING: this is a DOCUMENT-level operation. It rebuilds the render
-- order of the ENTIRE scene, not just one layer, so it can visibly reorder
-- layers the caller never mentioned. Because no single layer owns the change,
-- the undo snapshot is taken with PrepUndo(nil) -- the document-level form Moho
-- itself uses for whole-scene edits (lm_tile1.lua:143, lm_tile2.lua:124,
-- js_image_sequence.lua:146). Passing a layer here would scope the undo too
-- narrowly and leave the reorder un-undoable.
function curve.depthSort(moho, params)
    if not moho or not moho.document then return nil, "No active document" end

    local layerCount = nil
    pcall(function() layerCount = moho.document:CountLayers() end)

    -- Document-level undo: the whole scene is about to change order.
    pcall(function() moho.document:PrepUndo(nil) end)

    local ok, sortErr = pcall(function() moho.document:DepthSort() end)
    if not ok then
        return nil, "Failed to depth sort document: " .. tostring(sortErr)
    end

    pcall(function() moho.document:SetDirty() end)

    return {
        success = true,
        scope = "document",
        layerCount = layerCount,
        note = "Depth sort reorders all layers in the document, not a single layer.",
    }
end

return curve
