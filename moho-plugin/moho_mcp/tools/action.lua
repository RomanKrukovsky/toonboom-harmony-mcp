-- action.lua
-- Tool handlers for Moho Actions: reusable animation clips stored per layer.
--
-- WHAT AN ACTION IS
-- An Action is a named, self-contained animation recorded on a layer (a walk
-- cycle, a blink, a smart-bone dial). Keyframes live inside the Action instead
-- of on the mainline timeline, so the same motion can be reused instead of being
-- rebuilt keyframe by keyframe.
--
-- =====================================================================
-- GLOBAL STATE WARNING -- READ BEFORE USING action.setCurrent
-- =====================================================================
-- Action editing mode is GLOBAL DOCUMENT STATE, not a per-call argument.
-- While an Action is active, EVERY subsequent keyframe write -- from any tool,
-- any module, any later request over the bridge -- is recorded INTO THAT ACTION
-- and NOT onto the mainline timeline.
--
-- Concretely: call action.setCurrent{ name = "walk" }, then call
-- animation.setKeyframe or bone.setTransform, and those keys land inside "walk".
-- Scrub the mainline afterwards and the animation looks absent -- the keyframes
-- are not lost, they are simply in the Action. The caller who forgot to switch
-- back sees "my keyframes disappeared" with no error anywhere.
--
-- Two facts make this worse than a normal mode flag:
--   1. The state survives across bridge requests. It is stored on the Moho
--      document, not in this process. Nothing resets it between calls.
--   2. It spans two objects that must agree: MohoDoc (the document-wide action
--      name) and MohoLayer (the per-layer active action). Setting only one
--      leaves Moho half-switched.
--
-- ALWAYS return to the mainline when done:
--     action.setCurrent{ layerId = N, mainline = true }
-- Read the current state at any time with action.getCurrent. Mainline is
-- represented throughout Moho as the empty string "".
--
-- API PROVENANCE
-- Every Moho call below was verified against the shipped application, not
-- guessed. Two sources:
--
--   (a) Moho's own bundled scripts under
--       /Applications/Moho.app/Contents/Resources/Support/Scripts/
--       - Tool/lm_select_bone.lua:1603-1636 is the reference implementation of
--         switching into and out of an Action (the Smart Bone workflow). It
--         shows the required call PAIRING and frame handling copied below.
--       - Tool/lm_manipulate_bones.lua:82-83 -- layer:CurrentAction(),
--         layer:IsSmartBoneAction(name)
--       - Tool/lm_reparent_bone.lua:254 -- channel-level CountActions()
--       - Utility/ss_svg_import14.lua:60 -- CurrentDocAction() == "" is the
--         canonical mainline test
--
--   (b) The tolua bindings compiled into the Moho binary, which give exact
--       arities and the underlying C++ entry points:
--         MohoLayer:CountActions()            -> number
--         MohoLayer:ActionName(index)         -> string
--         MohoLayer:ActionID(name)            -> number
--         MohoLayer:HasAction(name)           -> bool   (MohoLayer::HasPose)
--         MohoLayer:CurrentAction()           -> string
--         MohoLayer:ActivateAction(name)      -> void   (MohoLayer::ActivatePose)
--         MohoLayer:RenameAction(old, new)    -> void   (MohoLayer::RenamePose)
--         MohoLayer:DeleteAction(name)        -> void   (MohoLayer::DeletePose)
--         MohoLayer:ReorderAction(name, before) -> void (MohoLayer::ReorderPose)
--         MohoLayer:ActionDuration(name)      -> number (MohoLayer::PoseDuration)
--         MohoLayer:IsSmartBoneAction(name)   -> bool
--         MohoDoc:CurrentDocAction()          -> string
--         MohoDoc:SetCurrentDocAction(name)   -> void
--
-- CREATION IDIOM (non-obvious, verified in the binary)
-- There is no AddAction/CreateAction/NewAction in the Lua API. Creation happens
-- as a side effect of ActivateAction: MohoLayer::ActivatePose takes a second
-- "create if missing" boolean, and the Lua binding hardcodes it to true. So
-- layer:ActivateAction("newName") allocates the Action when it does not exist.
-- Moho's own Smart Bone tool relies on exactly this
-- (lm_select_bone.lua:1610-1611 activates a bone-named Action that may not
-- exist yet). action.create below therefore activates to create, then restores
-- whatever mode the caller was in unless they asked to stay.
--
-- SCOPE
-- Actions belong to a layer, not to the document. Two layers may each hold an
-- Action named "walk" and they are unrelated. The document-level
-- CurrentDocAction is only the name currently being edited; it does not own the
-- Actions. That is why every handler here takes a layerId, and why action.list
-- can optionally sweep all layers to answer "where do Actions exist at all".

local action = {}

-- Mainline (i.e. "not editing any Action") is the empty string everywhere in
-- Moho's API and in its own scripts.
local MAINLINE = ""

-- --------------------------------------------------------------------
-- Helpers
-- --------------------------------------------------------------------

local function getLayerById(moho, layerId)
    if not moho or not moho.document then return nil, "No active document" end
    if type(layerId) ~= "number" then return nil, "layerId must be a number" end
    local ok, lyr = pcall(function()
        return moho.document:LayerByAbsoluteID(math.floor(layerId))
    end)
    if not ok or not lyr then
        return nil, "Layer not found with absolute ID " .. tostring(layerId)
    end
    return lyr
end

-- Resolve the layer to operate on: explicit layerId, else the current selection.
-- Falling back to the selected layer matches how Moho's own Action palette
-- behaves, but an explicit layerId is always preferred over ambient state.
local function resolveLayer(moho, params)
    if params and params.layerId ~= nil then
        return getLayerById(moho, params.layerId)
    end
    if not moho or not moho.document then return nil, "No active document" end
    local ok, lyr = pcall(function() return moho.layer end)
    if not ok or not lyr then
        return nil, "No layerId given and no layer is selected"
    end
    return lyr
end

local function layerName(lyr)
    local ok, name = pcall(function() return lyr:Name() end)
    if ok and name then return name end
    return ""
end

-- Absolute ID of a layer, for echoing back to the caller. Not every layer
-- object exposes this cheaply, so failure is tolerated.
local function layerAbsoluteId(moho, lyr)
    local ok, id = pcall(function() return moho.document:LayerAbsoluteID(lyr) end)
    if ok and type(id) == "number" then return id end
    return nil
end

local function countActions(lyr)
    local ok, n = pcall(function() return lyr:CountActions() end)
    if not ok or type(n) ~= "number" then
        return nil, "Failed to count actions on layer"
    end
    return math.floor(n)
end

-- Current frame. Moho tools read moho.frame; bone.lua reads CurrentFrame().
-- Try both, in that order, so this works from either context.
local function currentFrame(moho)
    local f
    local ok = pcall(function() f = moho.frame end)
    if ok and type(f) == "number" then return math.floor(f) end
    ok = pcall(function() f = moho.document:CurrentFrame() end)
    if ok and type(f) == "number" then return math.floor(f) end
    return 0
end

-- The document-wide name of the Action being edited, or "" for mainline.
local function currentDocAction(moho)
    local ok, name = pcall(function() return moho.document:CurrentDocAction() end)
    if ok and type(name) == "string" then return name end
    return nil
end

-- Describe one Action by index, tolerating partial API failures so that a
-- single bad entry cannot blank the whole listing.
local function describeAction(lyr, index, activeName)
    local nameOk, name = pcall(function() return lyr:ActionName(index) end)
    if not nameOk or type(name) ~= "string" then return nil end

    local entry = { index = index, name = name }

    local durOk, dur = pcall(function() return lyr:ActionDuration(name) end)
    if durOk and type(dur) == "number" then entry.duration = dur end

    -- Smart Bone Actions are driven by a bone's angle rather than played back
    -- directly. Callers usually want to treat them differently, so flag them.
    local smartOk, smart = pcall(function() return lyr:IsSmartBoneAction(name) end)
    if smartOk then entry.isSmartBone = smart and true or false end

    local idOk, id = pcall(function() return lyr:ActionID(name) end)
    if idOk and type(id) == "number" then entry.actionId = math.floor(id) end

    entry.isActive = (activeName ~= nil and name == activeName and name ~= MAINLINE)
    return entry
end

-- Collect Actions for a single layer.
local function listForLayer(moho, lyr)
    local count, err = countActions(lyr)
    if not count then return nil, err end

    local activeOk, activeName = pcall(function() return lyr:CurrentAction() end)
    if not activeOk or type(activeName) ~= "string" then activeName = nil end

    local actions = {}
    for i = 0, count - 1 do
        local entry = describeAction(lyr, i, activeName)
        if entry then actions[#actions + 1] = entry end
    end

    local result = {
        layerName = layerName(lyr),
        actionCount = count,
        actions = actions,
        currentAction = activeName,
        onMainline = (activeName == nil) or (activeName == MAINLINE),
    }
    local absId = layerAbsoluteId(moho, lyr)
    if absId then result.layerId = absId end
    return result
end

-- Walk every layer in the document, depth first. Used by action.list when the
-- caller asks for document-wide scope.
local function forEachLayer(moho, visit)
    local doc = moho.document
    local function descend(lyr, depth)
        if not lyr or depth > 64 then return end
        visit(lyr)
        local isGroupOk, isGroup = pcall(function() return lyr:IsGroupType() end)
        if not isGroupOk or not isGroup then return end
        local grpOk, grp = pcall(function() return moho:LayerAsGroup(lyr) end)
        if not grpOk or not grp then return end
        local cOk, childCount = pcall(function() return grp:CountLayers() end)
        if not cOk or type(childCount) ~= "number" then return end
        for i = 0, childCount - 1 do
            local childOk, child = pcall(function() return grp:Layer(i) end)
            if childOk and child then descend(child, depth + 1) end
        end
    end

    local topOk, topCount = pcall(function() return doc:CountLayers() end)
    if not topOk or type(topCount) ~= "number" then
        return nil, "Failed to enumerate document layers"
    end
    for i = 0, topCount - 1 do
        local lOk, lyr = pcall(function() return doc:Layer(i) end)
        if lOk and lyr then descend(lyr, 0) end
    end
    return true
end

-- Perform the full, correctly paired switch into an Action or back to mainline.
--
-- Both objects must be updated together. lm_select_bone.lua:1603-1620 is the
-- reference: MohoDoc carries the document-wide action name (what the UI shows
-- and what other code tests with CurrentDocAction() == ""), while MohoLayer
-- carries the per-layer active action (what actually receives keyframes).
-- Setting only one leaves Moho half-switched: the timeline can claim mainline
-- while writes still land in the Action.
--
-- The SetCurFrame(frame, false) call before switching is also copied from
-- lm_select_bone.lua:1609. It flushes any in-progress tool preview (for
-- example a half-finished bone manipulation) so that transient values are not
-- baked into the Action on entry.
local function applySwitch(moho, lyr, actionName, targetFrame)
    local name = actionName or MAINLINE

    -- Clear pending temporary changes before changing mode.
    pcall(function() moho:SetCurFrame(currentFrame(moho), false) end)

    local docOk, docErr = pcall(function() moho.document:SetCurrentDocAction(name) end)
    if not docOk then
        return nil, "Failed to set document action: " .. tostring(docErr)
    end

    local layerOk, layerErr = pcall(function() lyr:ActivateAction(name) end)
    if not layerOk then
        -- Roll the document back so the two objects do not disagree. Leaving
        -- them out of sync is worse than failing outright.
        pcall(function() moho.document:SetCurrentDocAction(MAINLINE) end)
        return nil, "Failed to activate action on layer: " .. tostring(layerErr)
    end

    if targetFrame ~= nil then
        pcall(function() moho:SetCurFrame(math.floor(targetFrame)) end)
    end
    return true
end

-- --------------------------------------------------------------------
-- Handlers
-- --------------------------------------------------------------------

-- action.list: enumerate Actions on a layer, or across the whole document.
--
-- Read-only. With `allLayers = true` (or no layerId and no selection) it sweeps
-- every layer and reports only those that actually own Actions, which answers
-- "which layers in this rig have reusable animation".
function action.list(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    params = params or {}

    local docAction = currentDocAction(moho)

    if params.allLayers == true then
        local layers = {}
        local totalActions = 0
        local okWalk, walkErr = forEachLayer(moho, function(lyr)
            local info = listForLayer(moho, lyr)
            -- Skip layers with no Actions; the interesting signal is where they exist.
            if info and info.actionCount and info.actionCount > 0 then
                layers[#layers + 1] = info
                totalActions = totalActions + info.actionCount
            end
        end)
        if not okWalk then return nil, walkErr end
        return {
            scope = "document",
            layersWithActions = #layers,
            totalActions = totalActions,
            layers = layers,
            currentDocAction = docAction,
            onMainline = (docAction == nil) or (docAction == MAINLINE),
        }
    end

    local lyr, err = resolveLayer(moho, params)
    if not lyr then return nil, err end

    local info, listErr = listForLayer(moho, lyr)
    if not info then return nil, listErr end

    info.scope = "layer"
    info.currentDocAction = docAction
    return info
end

-- action.getCurrent: report which Action is being edited, or mainline.
--
-- Read-only, and the thing to call whenever keyframes appear to have gone
-- missing. `onMainline = false` means writes are going into `currentDocAction`.
--
-- It reports the document-level and layer-level values separately on purpose.
-- They should agree; if they do not, the document is half-switched (something
-- set one without the other) and `inSync = false` says so rather than hiding it.
function action.getCurrent(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    params = params or {}

    local docAction = currentDocAction(moho)
    if docAction == nil then
        return nil, "Failed to read current document action"
    end

    local result = {
        currentDocAction = docAction,
        onMainline = (docAction == MAINLINE),
    }

    -- The layer-level value is optional context: there may be no selection.
    local lyr = resolveLayer(moho, params)
    if lyr then
        result.layerName = layerName(lyr)
        local absId = layerAbsoluteId(moho, lyr)
        if absId then result.layerId = absId end

        local curOk, layerAction = pcall(function() return lyr:CurrentAction() end)
        if curOk and type(layerAction) == "string" then
            result.layerCurrentAction = layerAction
            result.inSync = (layerAction == docAction)
        end

        if docAction ~= MAINLINE then
            local hasOk, has = pcall(function() return lyr:HasAction(docAction) end)
            if hasOk then result.layerHasAction = has and true or false end
            local smartOk, smart = pcall(function() return lyr:IsSmartBoneAction(docAction) end)
            if smartOk then result.isSmartBone = smart and true or false end
            local durOk, dur = pcall(function() return lyr:ActionDuration(docAction) end)
            if durOk and type(dur) == "number" then result.duration = dur end
        end
    end

    result.frame = currentFrame(moho)
    return result
end

-- action.setCurrent: enter an Action for editing, or return to the mainline.
--
-- CHANGES GLOBAL DOCUMENT STATE. See the warning at the top of this file.
-- After this call every keyframe write goes into the named Action until
-- something switches back. Pass `mainline = true` (or name = "") to return.
--
-- Frame handling follows Moho's Smart Bone tool (lm_select_bone.lua:1607-1621):
-- entering an Action jumps to frame 1, because an Action has its own local
-- timeline starting at 1 and the mainline frame is meaningless inside it.
-- Returning to the mainline restores a frame. The caller can pass
-- `restoreFrame` to get back to a specific mainline frame; without it the
-- current frame is kept, since this process cannot know which mainline frame
-- the user was on before an earlier, separate request switched away.
function action.setCurrent(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if not params then return nil, "Missing parameters" end

    local toMainline = false
    local name

    if params.mainline == true then
        toMainline = true
        name = MAINLINE
    elseif params.name ~= nil then
        if type(params.name) ~= "string" then
            return nil, "name must be a string"
        end
        name = params.name
        if name == MAINLINE then toMainline = true end
    else
        return nil, "Provide name (Action to edit) or mainline = true"
    end

    local lyr, err = resolveLayer(moho, params)
    if not lyr then return nil, err end

    local previous = currentDocAction(moho)

    if not toMainline then
        -- Refuse to silently create. ActivateAction would allocate a new Action
        -- for a typo'd name, so an unnoticed misspelling would leave the caller
        -- editing an empty Action that looks like the real one. action.create is
        -- the explicit way to make one.
        local hasOk, has = pcall(function() return lyr:HasAction(name) end)
        if not hasOk then
            return nil, "Failed to check for action '" .. name .. "' on layer"
        end
        if not has then
            return nil, "Layer '" .. layerName(lyr) .. "' has no action named '"
                .. name .. "'. Use action.create to make it."
        end
    end

    -- Switching mode alters what the document contains at the current frame, so
    -- this is a mutation: PrepUndo first, per the contract, and mirroring
    -- lm_select_bone.lua which prepares undo around the same transition.
    pcall(function() moho.document:PrepUndo(lyr, true) end)

    local targetFrame
    if toMainline then
        if params.restoreFrame ~= nil then
            if type(params.restoreFrame) ~= "number" then
                return nil, "restoreFrame must be a number"
            end
            targetFrame = math.floor(params.restoreFrame)
        end
    else
        -- Actions run on their own timeline; frame 1 is its start.
        targetFrame = 1
    end

    local ok, switchErr = applySwitch(moho, lyr, name, targetFrame)
    if not ok then return nil, switchErr end

    pcall(function() moho.document:SetDirty() end)
    pcall(function() moho:UpdateUI() end)

    local result = {
        success = true,
        previousAction = previous,
        currentDocAction = name,
        onMainline = toMainline,
        layerName = layerName(lyr),
        frame = currentFrame(moho),
    }
    local absId = layerAbsoluteId(moho, lyr)
    if absId then result.layerId = absId end

    if not toMainline then
        -- Restate the consequence in the response so a caller reading only the
        -- result still learns that later keyframes are being redirected.
        result.warning = "Keyframe writes now go into action '" .. name
            .. "', not the mainline. Call action.setCurrent{ mainline = true } when done."
    end
    return result
end

-- action.create: create a new, empty Action on a layer.
--
-- There is no CreateAction in Moho's Lua API. Creation is a side effect of
-- ActivateAction, whose underlying MohoLayer::ActivatePose takes a
-- create-if-missing flag that the Lua binding hardcodes to true. Moho's own
-- Smart Bone tool creates Actions this way (lm_select_bone.lua:1610-1611).
--
-- Because creation happens by activating, this handler necessarily enters the
-- new Action for a moment. By default it then switches back to wherever the
-- caller was, so creating an Action does not quietly leave the document in
-- Action-editing mode. Pass `activate = true` to stay in the new Action and
-- start recording into it.
function action.create(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if not params then return nil, "Missing parameters" end
    if type(params.name) ~= "string" or params.name == "" then
        return nil, "Missing required parameter: name (non-empty string)"
    end

    local name = params.name
    local lyr, err = resolveLayer(moho, params)
    if not lyr then return nil, err end

    local hasOk, has = pcall(function() return lyr:HasAction(name) end)
    if not hasOk then
        return nil, "Failed to check existing actions on layer"
    end
    if has then
        return nil, "Layer '" .. layerName(lyr) .. "' already has an action named '" .. name .. "'"
    end

    local previous = currentDocAction(moho)
    if previous == nil then
        return nil, "Failed to read current document action"
    end
    local previousFrame = currentFrame(moho)

    pcall(function() moho.document:PrepUndo(lyr, true) end)

    -- Activating a name that does not exist is what allocates it.
    local ok, switchErr = applySwitch(moho, lyr, name, 1)
    if not ok then return nil, switchErr end

    -- Confirm the Action really exists now rather than trusting the side effect.
    local verifyOk, verify = pcall(function() return lyr:HasAction(name) end)
    if not verifyOk or not verify then
        pcall(function() applySwitch(moho, lyr, previous, previousFrame) end)
        return nil, "Action '" .. name .. "' was not created"
    end

    pcall(function() moho.document:SetDirty() end)

    local stayInAction = (params.activate == true)
    if not stayInAction then
        -- Restore the caller's prior mode so creation has no lingering effect.
        local restoreOk, restoreErr = applySwitch(moho, lyr, previous, previousFrame)
        if not restoreOk then
            return nil, "Action '" .. name .. "' was created but restoring the previous mode failed: "
                .. tostring(restoreErr)
        end
    end

    pcall(function() moho:UpdateUI() end)

    local count = countActions(lyr) or 0
    local result = {
        success = true,
        name = name,
        layerName = layerName(lyr),
        actionCount = count,
        activated = stayInAction,
        currentDocAction = currentDocAction(moho),
        frame = currentFrame(moho),
    }
    local absId = layerAbsoluteId(moho, lyr)
    if absId then result.layerId = absId end

    local idOk, id = pcall(function() return lyr:ActionID(name) end)
    if idOk and type(id) == "number" then result.actionId = math.floor(id) end

    if stayInAction then
        result.warning = "Now editing action '" .. name
            .. "'. Keyframe writes go into it, not the mainline. Call action.setCurrent{ mainline = true } when done."
    end
    return result
end

-- action.delete: remove an Action from a layer.
--
-- DESTRUCTIVE: requires previewHash from the safety engine. Deleting an Action
-- discards every keyframe recorded inside it.
--
-- Order matters and is taken from Moho's own delete path
-- (lm_select_bone.lua:1624-1636): leave Action-editing mode FIRST, then delete.
-- Deleting the Action that is currently active would leave the document
-- pointing at an Action that no longer exists.
function action.delete(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if not params then return nil, "Missing parameters" end
    if type(params.name) ~= "string" or params.name == "" then
        return nil, "Missing required parameter: name (non-empty string)"
    end
    if not params.previewHash or params.previewHash == "" then
        return nil, "previewHash is required for action.delete"
    end

    local name = params.name
    local lyr, err = resolveLayer(moho, params)
    if not lyr then return nil, err end

    local hasOk, has = pcall(function() return lyr:HasAction(name) end)
    if not hasOk then
        return nil, "Failed to check existing actions on layer"
    end
    if not has then
        return nil, "Layer '" .. layerName(lyr) .. "' has no action named '" .. name .. "'"
    end

    local wasSmartBone = false
    local smartOk, smart = pcall(function() return lyr:IsSmartBoneAction(name) end)
    if smartOk then wasSmartBone = smart and true or false end

    local previous = currentDocAction(moho) or MAINLINE
    local restoreFrame = params.restoreFrame
    if restoreFrame ~= nil and type(restoreFrame) ~= "number" then
        return nil, "restoreFrame must be a number"
    end

    pcall(function() moho.document:PrepUndo(lyr, true) end)

    -- Step 1: get out of the doomed Action before removing it.
    local leftAction = false
    if previous ~= MAINLINE then
        local ok, switchErr = applySwitch(moho, lyr, MAINLINE,
            restoreFrame and math.floor(restoreFrame) or nil)
        if not ok then
            return nil, "Failed to leave action editing mode before delete: " .. tostring(switchErr)
        end
        leftAction = true
    end

    -- Step 2: delete.
    local delOk, delErr = pcall(function() lyr:DeleteAction(name) end)
    if not delOk then
        return nil, "Failed to delete action '" .. name .. "': " .. tostring(delErr)
    end

    local stillOk, still = pcall(function() return lyr:HasAction(name) end)
    if stillOk and still then
        return nil, "Moho did not remove action '" .. name .. "'"
    end

    pcall(function() moho.document:SetDirty() end)
    pcall(function() moho:UpdateUI() end)

    local remaining = countActions(lyr) or 0
    local result = {
        success = true,
        name = name,
        layerName = layerName(lyr),
        remainingActions = remaining,
        wasSmartBone = wasSmartBone,
        previousAction = previous,
        currentDocAction = currentDocAction(moho),
        returnedToMainline = leftAction,
        frame = currentFrame(moho),
    }
    local absId = layerAbsoluteId(moho, lyr)
    if absId then result.layerId = absId end
    return result
end

-- action.rename: change an Action's name.
--
-- Note the coupling to Smart Bones: a Smart Bone Action is matched to its bone
-- BY NAME (lm_select_bone.lua:1604 looks up layer:HasAction(bone:Name())).
-- Renaming such an Action breaks that link and the bone stops driving it. This
-- handler refuses by default and requires an explicit
-- `allowSmartBoneRename = true` to proceed, so the tie cannot be severed by
-- accident.
function action.rename(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if not params then return nil, "Missing parameters" end
    if type(params.name) ~= "string" or params.name == "" then
        return nil, "Missing required parameter: name (current action name)"
    end
    if type(params.newName) ~= "string" or params.newName == "" then
        return nil, "Missing required parameter: newName (non-empty string)"
    end

    local oldName, newName = params.name, params.newName
    if oldName == newName then
        return nil, "newName is the same as the current name"
    end

    local lyr, err = resolveLayer(moho, params)
    if not lyr then return nil, err end

    local hasOk, has = pcall(function() return lyr:HasAction(oldName) end)
    if not hasOk then
        return nil, "Failed to check existing actions on layer"
    end
    if not has then
        return nil, "Layer '" .. layerName(lyr) .. "' has no action named '" .. oldName .. "'"
    end

    -- Moho's Action palette rejects duplicate names on the same layer
    -- ("This layer already has an action with that name"); mirror that here.
    local dupOk, dup = pcall(function() return lyr:HasAction(newName) end)
    if not dupOk then
        return nil, "Failed to check for name collision"
    end
    if dup then
        return nil, "Layer '" .. layerName(lyr) .. "' already has an action named '" .. newName .. "'"
    end

    local isSmartBone = false
    local smartOk, smart = pcall(function() return lyr:IsSmartBoneAction(oldName) end)
    if smartOk then isSmartBone = smart and true or false end
    if isSmartBone and params.allowSmartBoneRename ~= true then
        return nil, "'" .. oldName .. "' is a Smart Bone action, bound to its bone by name. "
            .. "Renaming it breaks that binding and the bone will stop driving it. "
            .. "Pass allowSmartBoneRename = true to proceed anyway."
    end

    local wasActive = (currentDocAction(moho) == oldName)

    pcall(function() moho.document:PrepUndo(lyr, true) end)

    local renOk, renErr = pcall(function() lyr:RenameAction(oldName, newName) end)
    if not renOk then
        return nil, "Failed to rename action: " .. tostring(renErr)
    end

    local verifyOk, verify = pcall(function() return lyr:HasAction(newName) end)
    if not verifyOk or not verify then
        return nil, "Moho did not rename action '" .. oldName .. "'"
    end

    -- If the renamed Action was the one being edited, the document still holds
    -- the OLD name and now refers to nothing. Re-point it at the new name so
    -- the document is not left pointing at a stale Action.
    if wasActive then
        local ok, switchErr = applySwitch(moho, lyr, newName, nil)
        if not ok then
            return nil, "Action renamed to '" .. newName
                .. "' but re-activating it failed: " .. tostring(switchErr)
        end
    end

    pcall(function() moho.document:SetDirty() end)
    pcall(function() moho:UpdateUI() end)

    local result = {
        success = true,
        previousName = oldName,
        name = newName,
        layerName = layerName(lyr),
        wasSmartBone = isSmartBone,
        wasActive = wasActive,
        currentDocAction = currentDocAction(moho),
        frame = currentFrame(moho),
    }
    local absId = layerAbsoluteId(moho, lyr)
    if absId then result.layerId = absId end

    local idOk, id = pcall(function() return lyr:ActionID(newName) end)
    if idOk and type(id) == "number" then result.actionId = math.floor(id) end
    return result
end

return action
