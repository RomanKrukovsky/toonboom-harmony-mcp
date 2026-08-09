-- boneik.lua
-- Tool handlers for bone inverse kinematics: chain inspection, child queries,
-- IK solving to a target point, arc solver toggling, IK state reporting and
-- bone matrix refresh.
--
-- All IK behaviour mirrors Moho's own bone manipulation tool
-- (Support/Scripts/Tool/lm_manipulate_bones.lua). In particular the chain walk
-- reproduces that tool's break conditions so a programmatic solve matches what
-- a human gets by dragging a bone.

local boneik = {}

-- Hard ceiling for any parent-chain walk.
-- A well-formed parent chain visits each bone at most once, so the natural
-- bound is CountBones(). This constant is a second backstop for the case where
-- CountBones() itself is unreasonable. Moho's own loops have no bound at all;
-- they trust the hierarchy. We cannot: this plugin is polled from the window
-- redraw callback, so a cycle (a bone that is its own ancestor after a manual
-- edit) would wedge Moho and time the bridge out with no explanation.
local MAX_CHAIN_DEPTH = 256

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

-- Resolve a bone layer to its skeleton. Returns skel, layer, err.
local function getSkeleton(moho, layerId)
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
    return skel, lyr
end

-- Count bones with a guard: a failed pcall must not be read as zero bones.
local function countBones(skel)
    local ok, n = pcall(function() return skel:CountBones() end)
    if not ok or type(n) ~= "number" then return nil, "Failed to count bones" end
    return n
end

-- Validate a bone index and return the bone object.
local function getBoneAt(skel, boneId)
    if type(boneId) ~= "number" then return nil, "boneId must be a number" end
    local count, cErr = countBones(skel)
    if not count then return nil, cErr end
    if count <= 0 then return nil, "Skeleton has no bones" end
    if boneId < 0 or boneId >= count then
        return nil, "Bone index " .. tostring(boneId) ..
            " out of range (0.." .. tostring(count - 1) .. ")"
    end
    local ok, b = pcall(function() return skel:Bone(math.floor(boneId)) end)
    if not ok or not b then
        return nil, "Failed to retrieve bone " .. tostring(boneId)
    end
    return b
end

-- Resolve skeleton + bone in one step. Returns bone, skel, layer, err.
local function getBone(moho, layerId, boneId)
    local skel, lyr, err = getSkeleton(moho, layerId)
    if not skel then return nil, nil, nil, err end
    local b, bErr = getBoneAt(skel, boneId)
    if not b then return nil, nil, nil, bErr end
    return b, skel, lyr
end

-- Frame used for bone animation channels.
-- Moho's bone tools read moho.layerFrame, which accounts for the layer's own
-- time offset; falling back to the document frame matches curve.lua.
local function resolveFrame(moho, explicit)
    if type(explicit) == "number" then return math.floor(explicit) end
    local f
    local ok = pcall(function() f = moho.layerFrame end)
    if ok and type(f) == "number" then return f end
    ok = pcall(function() f = moho.document:CurrentFrame() end)
    if ok and type(f) == "number" then return f end
    return 0
end

-- Frame 0 is Moho's rigging frame: edits there change the rest pose (fAngle)
-- rather than writing keyframes. lm_manipulate_bones calls this testMode.
local function isRiggingFrame(moho)
    local f
    local ok = pcall(function() f = moho.frame end)
    if ok and type(f) == "number" then return f == 0 end
    ok = pcall(function() f = moho.document:CurrentFrame() end)
    if ok and type(f) == "number" then return f == 0 end
    return false
end

-- Direct children of boneId.
-- skel:CountBoneChildren(boneID, ignoreControlledBones) is native, but
-- lm_manipulate_bones ships its own copy, so we fall back to a local scan if
-- the native call is unavailable in this build.
local function countChildren(skel, boneId, ignoreControlled)
    if type(boneId) ~= "number" then return 0 end
    local ok, n = pcall(function()
        return skel:CountBoneChildren(math.floor(boneId), ignoreControlled and true or false)
    end)
    if ok and type(n) == "number" then return n end

    -- Fallback mirrors LM_ManipulateBones:CountBoneChildren.
    local total = countBones(skel)
    if not total then return 0 end
    local count = 0
    for i = 0, total - 1 do
        local cOk, child = pcall(function() return skel:Bone(i) end)
        if cOk and child then
            local pOk, parent = pcall(function() return child.fParent end)
            if pOk and parent == math.floor(boneId) then
                count = count + 1
                if ignoreControlled then
                    local freeOk, controlled = pcall(function()
                        return child.fAngleControlParent >= 0
                            or child.fPosControlParent >= 0
                            or child.fScaleControlParent >= 0
                            or child:AreDynamicsActive()
                            or child.fIgnoredByIK
                    end)
                    if freeOk and controlled then
                        count = count - 1
                    end
                end
            end
        end
    end
    return count
end

-- Read a boolean bone field without letting a missing field read as false.
local function boolField(b, name)
    local ok, v = pcall(function() return b[name] end)
    if not ok then return nil end
    return v and true or false
end

local function numField(b, name, fallback)
    local ok, v = pcall(function() return b[name] end)
    if ok and type(v) == "number" then return v end
    return fallback
end

-- True when a bone cannot be driven freely by the IK solver.
-- Same predicate lm_manipulate_bones uses to stop climbing a chain.
local function isIkBlocked(b)
    local ok, blocked = pcall(function()
        return b.fAngleControlParent >= 0
            or b.fPosControlParent >= 0
            or b.fScaleControlParent >= 0
            or b:AreDynamicsActive()
            or b.fFixedAngle
            or b.fIgnoredByIK
    end)
    if not ok then return false end
    return blocked and true or false
end

-- Reason a chain walk stopped, for the caller's benefit.
local function blockReason(b)
    if numField(b, "fAngleControlParent", -1) >= 0 then return "angleControlParent" end
    if numField(b, "fPosControlParent", -1) >= 0 then return "posControlParent" end
    if numField(b, "fScaleControlParent", -1) >= 0 then return "scaleControlParent" end
    local dOk, dyn = pcall(function() return b:AreDynamicsActive() end)
    if dOk and dyn then return "dynamicsActive" end
    if boolField(b, "fFixedAngle") then return "fixedAngle" end
    if boolField(b, "fIgnoredByIK") then return "ignoredByIK" end
    return "blocked"
end

-- Walk a parent chain from startId toward the root, applying Moho's IK stop
-- rules. Returns an array of bone ids (start first) plus the stop reason.
-- Cycle-safe: a visited set catches the exact repeat, and the step budget is a
-- backstop, so a corrupted hierarchy yields an error instead of a hang.
local function walkChain(skel, startId, applyIkRules)
    local total, tErr = countBones(skel)
    if not total then return nil, nil, tErr end

    local budget = total
    if budget > MAX_CHAIN_DEPTH then budget = MAX_CHAIN_DEPTH end
    if budget < 1 then budget = 1 end

    local ids = {}
    local visited = {}
    local currentId = math.floor(startId)
    local stopReason = "root"
    local steps = 0

    while true do
        if visited[currentId] then
            return nil, nil, "Bone hierarchy contains a cycle at bone " ..
                tostring(currentId) .. "; fix the parenting in Moho before solving IK"
        end
        visited[currentId] = true
        table.insert(ids, currentId)

        local b, bErr = getBoneAt(skel, currentId)
        if not b then return nil, nil, bErr end

        local parentId = numField(b, "fParent", -1)
        if parentId < 0 then
            stopReason = "root"
            break
        end
        if parentId >= total then
            return nil, nil, "Bone " .. tostring(currentId) ..
                " has out-of-range parent " .. tostring(parentId)
        end

        if applyIkRules then
            -- A branch point ends the IK chain: the parent drives more than one
            -- free child, so rotating it is ambiguous.
            if countChildren(skel, parentId, true) > 1 then
                stopReason = "branch"
                break
            end
            local parentBone, pErr = getBoneAt(skel, parentId)
            if not parentBone then return nil, nil, pErr end
            if isIkBlocked(parentBone) then
                stopReason = blockReason(parentBone)
                break
            end
        end

        steps = steps + 1
        if steps >= budget then
            return nil, nil, "Bone chain exceeded the maximum depth of " ..
                tostring(budget) .. " starting at bone " .. tostring(startId) ..
                "; the hierarchy is likely corrupt"
        end
        currentId = parentId
    end

    return ids, stopReason
end

-- Describe one bone for chain/children output.
local function describeBone(skel, boneId, frame)
    local b, err = getBoneAt(skel, boneId)
    if not b then return nil, err end

    local info = { id = boneId }
    local nOk, name = pcall(function() return b:Name() end)
    info.name = (nOk and name) or ""
    info.length = numField(b, "fLength", 0)
    info.restAngle = numField(b, "fAngle", 0)
    info.parentId = numField(b, "fParent", -1)

    local aOk, animAngle = pcall(function() return b.fAnimAngle:GetValue(frame) end)
    if aOk and type(animAngle) == "number" then info.angle = animAngle end

    local ignored = boolField(b, "fIgnoredByIK")
    if ignored ~= nil then info.ignoredByIK = ignored end
    local fixed = boolField(b, "fFixedAngle")
    if fixed ~= nil then info.fixedAngle = fixed end

    local arcOk, arc = pcall(function() return b:IsArcSolverEnabled() end)
    if arcOk then info.arcSolver = arc and true or false end

    info.childCount = countChildren(skel, boneId, false)
    info.freeChildCount = countChildren(skel, boneId, true)
    return info
end

-- --------------------------------------------------------------------
-- Handlers
-- --------------------------------------------------------------------

-- boneik.getChain: bones from the given bone toward the root, with lengths and
-- angles. Read-only. By default the walk stops where Moho's IK solver stops
-- (branch point, controlled bone, fixed angle, IK-excluded bone); pass
-- ikRules=false to follow raw parenting all the way to the root.
function boneik.getChain(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end

    local skel, _, err = getSkeleton(moho, params.layerId)
    if not skel then return nil, err end

    local _, boneErr = getBoneAt(skel, params.boneId)
    if boneErr then return nil, boneErr end

    local applyIkRules = true
    if params.ikRules ~= nil then applyIkRules = params.ikRules and true or false end

    local frame = resolveFrame(moho, params.frame)
    local ids, stopReason, walkErr = walkChain(skel, params.boneId, applyIkRules)
    if not ids then return nil, walkErr end

    local bones = {}
    local totalLength = 0
    for _, id in ipairs(ids) do
        local info, iErr = describeBone(skel, id, frame)
        if not info then return nil, iErr end
        totalLength = totalLength + (info.length or 0)
        table.insert(bones, info)
    end

    -- IK target for this chain, if one is bound.
    local targetBoneId = -1
    pcall(function()
        local t = skel:TargetOfBoneChain(math.floor(params.boneId), frame)
        if type(t) == "number" then targetBoneId = t end
    end)

    return {
        layerId = params.layerId,
        boneId = math.floor(params.boneId),
        frame = frame,
        ikRules = applyIkRules,
        stopReason = stopReason,
        rootBoneId = ids[#ids],
        chainLength = #bones,
        totalLength = totalLength,
        targetBoneId = targetBoneId,
        bones = bones,
        maxDepth = MAX_CHAIN_DEPTH,
    }
end

-- boneik.getChildren: direct children of a bone. Read-only.
function boneik.getChildren(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end

    local skel, _, err = getSkeleton(moho, params.layerId)
    if not skel then return nil, err end

    local _, boneErr = getBoneAt(skel, params.boneId)
    if boneErr then return nil, boneErr end

    local total, tErr = countBones(skel)
    if not total then return nil, tErr end

    local frame = resolveFrame(moho, params.frame)
    local parentId = math.floor(params.boneId)

    local children = {}
    for i = 0, total - 1 do
        local cOk, child = pcall(function() return skel:Bone(i) end)
        if cOk and child then
            if numField(child, "fParent", -1) == parentId then
                local info, iErr = describeBone(skel, i, frame)
                if not info then return nil, iErr end
                table.insert(children, info)
            end
        end
    end

    local firstChildId = -1
    pcall(function()
        local f = skel:GetFirstChildBone(parentId)
        if type(f) == "number" then firstChildId = f end
    end)

    return {
        layerId = params.layerId,
        boneId = parentId,
        frame = frame,
        count = countChildren(skel, parentId, false),
        freeCount = countChildren(skel, parentId, true),
        firstChildId = firstChildId,
        children = children,
    }
end

-- boneik.solveToPoint: rotate a chain so the tip of the given bone reaches a
-- target point, then record the resulting angles.
--
-- Mirrors lm_manipulate_bones case 2 (the only-child-chain IK case):
--   skel:UpdateBoneMatrix(boneID)
--   skel:IKAngleSolver(boneID, targetVec [, iterMultiplier])
--   write bone.fAngle into fAnimAngle for the bone and each chain parent
--   skel:UpdateBoneMatrix()
--
-- The target point is absolute, in the bone layer's coordinate system - the
-- same space Moho's tool converts mouse positions into before solving.
-- At frame 0 (Moho's rigging frame) the rest pose is written instead of
-- keyframes, matching Moho's own testMode behaviour.
function boneik.solveToPoint(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end

    local tx = params.x
    local ty = params.y
    if tx == nil and type(params.point) == "table" then tx = params.point.x end
    if ty == nil and type(params.point) == "table" then ty = params.point.y end
    if type(tx) ~= "number" or type(ty) ~= "number" then
        return nil, "Missing required target point: provide x and y (or point = {x, y})"
    end

    local iterMultiplier = params.iterMultiplier
    if iterMultiplier ~= nil then
        if type(iterMultiplier) ~= "number" then
            return nil, "iterMultiplier must be a number"
        end
        if iterMultiplier < 1 or iterMultiplier > 10 then
            return nil, "iterMultiplier out of range (1..10)"
        end
        iterMultiplier = math.floor(iterMultiplier)
    end

    local b, skel, lyr, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    local boneId = math.floor(params.boneId)

    -- Refuse up front rather than silently producing nothing: a bone excluded
    -- from IK or pinned to a fixed angle will not be rotated by the solver.
    if boolField(b, "fIgnoredByIK") then
        return nil, "Bone " .. tostring(boneId) ..
            " is excluded from IK (fIgnoredByIK); clear it before solving"
    end

    local frame = resolveFrame(moho, params.frame)
    local riggingFrame = isRiggingFrame(moho)

    -- Resolve the chain before mutating so a corrupt hierarchy is reported
    -- without having touched the document.
    local ids, stopReason, walkErr = walkChain(skel, boneId, true)
    if not ids then return nil, walkErr end

    pcall(function() moho.document:PrepUndo(lyr, true) end)

    -- Seed the solver from the current pose, as Moho's tool does.
    local seedOk, seedErr = pcall(function()
        for _, id in ipairs(ids) do
            local cb = skel:Bone(id)
            cb.fAngle = cb.fAnimAngle:GetValue(frame)
        end
    end)
    if not seedOk then
        return nil, "Failed to seed chain angles: " .. tostring(seedErr)
    end

    local matOk, matErr = pcall(function() skel:UpdateBoneMatrix(boneId) end)
    if not matOk then
        return nil, "Failed to update bone matrix: " .. tostring(matErr)
    end

    -- Record the tip position before solving so the caller can see the delta.
    local beforeTip = { x = 0, y = 0 }
    pcall(function()
        local v = LM.Vector2:new_local()
        v:Set(b.fLength, 0)
        b.fMovedMatrix:Transform(v)
        beforeTip.x = v.x
        beforeTip.y = v.y
    end)

    local solveOk, solveErr = pcall(function()
        local targetVec = LM.Vector2:new_local()
        targetVec:Set(tx, ty)
        if iterMultiplier then
            skel:IKAngleSolver(boneId, targetVec, iterMultiplier)
        else
            skel:IKAngleSolver(boneId, targetVec)
        end
    end)
    if not solveOk then
        return nil, "IKAngleSolver failed: " .. tostring(solveErr)
    end

    -- Persist the solved angles along the chain.
    local solved = {}
    local writeOk, writeErr = pcall(function()
        for _, id in ipairs(ids) do
            local cb = skel:Bone(id)
            local angle = cb.fAngle
            if not riggingFrame then
                cb.fAnimAngle:SetValue(frame, angle)
                cb.fAnimAngle.value = angle
            end
            table.insert(solved, { id = id, angle = angle })
        end
    end)
    if not writeOk then
        return nil, "Failed to write solved angles: " .. tostring(writeErr)
    end

    pcall(function() skel:UpdateBoneMatrix() end)

    local afterTip = { x = 0, y = 0 }
    pcall(function()
        local v = LM.Vector2:new_local()
        v:Set(b.fLength, 0)
        b.fMovedMatrix:Transform(v)
        afterTip.x = v.x
        afterTip.y = v.y
    end)

    local dx = afterTip.x - tx
    local dy = afterTip.y - ty
    local residual = math.sqrt(dx * dx + dy * dy)

    if not riggingFrame then
        pcall(function() lyr:UpdateCurFrame() end)
        pcall(function() moho:NewKeyframe(CHANNEL_BONE) end)
    end
    pcall(function() moho.document:SetDirty() end)

    return {
        success = true,
        layerId = params.layerId,
        boneId = boneId,
        frame = frame,
        riggingFrame = riggingFrame,
        keyframesWritten = not riggingFrame,
        target = { x = tx, y = ty },
        tipBefore = beforeTip,
        tipAfter = afterTip,
        residual = residual,
        stopReason = stopReason,
        rootBoneId = ids[#ids],
        chainLength = #ids,
        iterMultiplier = iterMultiplier,
        solved = solved,
    }
end

-- boneik.setArcSolver: enable or disable the arc solver for a bone.
-- The arc solver constrains IK so the bone tip travels along an arc; Moho
-- exposes it per bone in the Select Bone tool.
function boneik.setArcSolver(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end
    if type(params.enabled) ~= "boolean" then
        return nil, "Missing required parameter: enabled (boolean)"
    end

    local b, _, lyr, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    local previous
    local prevOk, prev = pcall(function() return b:IsArcSolverEnabled() end)
    if prevOk then previous = prev and true or false end

    pcall(function() moho.document:PrepUndo(lyr, true) end)

    local ok, setErr = pcall(function() b:EnableArcSolver(params.enabled) end)
    if not ok then
        return nil, "Failed to set arc solver: " .. tostring(setErr)
    end

    pcall(function() moho.document:SetDirty() end)

    local current = params.enabled
    local curOk, cur = pcall(function() return b:IsArcSolverEnabled() end)
    if curOk then current = cur and true or false end

    return {
        success = true,
        layerId = params.layerId,
        boneId = math.floor(params.boneId),
        enabled = current,
        previous = previous,
    }
end

-- boneik.getIkState: IK-related state for a bone. Read-only.
-- Reports whether the bone is a target, what its target is, whether it is
-- excluded from IK, and - when referenceBoneId is given - whether it belongs
-- to that bone's IK chain (skel:IsBoneIKChild).
function boneik.getIkState(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end
    if params.boneId == nil then return nil, "Missing required parameter: boneId" end

    local b, skel, _, err = getBone(moho, params.layerId, params.boneId)
    if not b then return nil, err end

    local boneId = math.floor(params.boneId)
    local frame = resolveFrame(moho, params.frame)

    local result = {
        layerId = params.layerId,
        boneId = boneId,
        frame = frame,
    }

    local nOk, name = pcall(function() return b:Name() end)
    result.name = (nOk and name) or ""

    local ignored = boolField(b, "fIgnoredByIK")
    if ignored ~= nil then result.ignoredByIK = ignored end
    local fixed = boolField(b, "fFixedAngle")
    if fixed ~= nil then result.fixedAngle = fixed end

    local arcOk, arc = pcall(function() return b:IsArcSolverEnabled() end)
    if arcOk then result.arcSolver = arc and true or false end

    local dynOk, dyn = pcall(function() return b:AreDynamicsActive() end)
    if dynOk then result.dynamicsActive = dyn and true or false end

    result.angleControlParent = numField(b, "fAngleControlParent", -1)
    result.posControlParent = numField(b, "fPosControlParent", -1)
    result.scaleControlParent = numField(b, "fScaleControlParent", -1)

    pcall(function()
        local t = skel:IsBoneATarget(boneId, frame)
        result.isTarget = t and true or false
    end)
    pcall(function()
        local t = skel:TargetOfBone(boneId, frame)
        if type(t) == "number" then result.targetOfBone = t end
    end)
    pcall(function()
        local t = skel:TargetOfBoneChain(boneId, frame)
        if type(t) == "number" then result.targetOfBoneChain = t end
    end)
    pcall(function()
        local t = b.fTargetBone:GetValue(frame)
        if type(t) == "number" then result.targetBone = t end
    end)

    -- Would the solver actually be able to rotate this bone?
    result.solvable = not isIkBlocked(b)
    if not result.solvable then
        result.blockedBy = blockReason(b)
    end

    result.childCount = countChildren(skel, boneId, false)
    result.freeChildCount = countChildren(skel, boneId, true)
    result.parentId = numField(b, "fParent", -1)

    -- Chain membership relative to another bone.
    if params.referenceBoneId ~= nil then
        if type(params.referenceBoneId) ~= "number" then
            return nil, "referenceBoneId must be a number"
        end
        local refId = math.floor(params.referenceBoneId)
        local _, refErr = getBoneAt(skel, refId)
        if refErr then return nil, "referenceBoneId: " .. tostring(refErr) end
        result.referenceBoneId = refId
        pcall(function()
            local v = skel:IsBoneIKChild(refId, boneId)
            result.isIkChildOfReference = v and true or false
        end)
        pcall(function()
            local v = skel:IsBoneChild(boneId, refId)
            result.isDescendantOfReference = v and true or false
        end)
    end

    return result
end

-- boneik.updateMatrices: recompute cached bone transforms.
-- UpdateBoneMatrix refreshes derived matrices (fMovedMatrix) from the current
-- pose; it stores no document data of its own. Moho calls it freely without
-- PrepUndo, so this handler deliberately takes no undo snapshot and does not
-- mark the document dirty - there is nothing here for Cmd+Z to undo.
-- Omit boneId to refresh the whole skeleton.
function boneik.updateMatrices(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.layerId == nil then return nil, "Missing required parameter: layerId" end

    local skel, _, err = getSkeleton(moho, params.layerId)
    if not skel then return nil, err end

    local scope = "skeleton"
    local boneId = nil

    if params.boneId ~= nil then
        local b, bErr = getBoneAt(skel, params.boneId)
        if not b then return nil, bErr end
        boneId = math.floor(params.boneId)
        scope = "bone"
    end

    local ok, updErr
    if boneId ~= nil then
        ok, updErr = pcall(function() skel:UpdateBoneMatrix(boneId) end)
    else
        ok, updErr = pcall(function() skel:UpdateBoneMatrix() end)
    end
    if not ok then
        return nil, "Failed to update bone matrices: " .. tostring(updErr)
    end

    local total = countBones(skel) or 0

    return {
        success = true,
        layerId = params.layerId,
        boneId = boneId,
        scope = scope,
        boneCount = total,
    }
end

return boneik
