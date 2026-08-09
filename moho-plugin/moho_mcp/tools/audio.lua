-- audio.lua
-- Tool handlers for audio layers: enumeration, amplitude sampling, and
-- timing offset adjustment.
--
-- API surface verified against Moho's own bundled scripts (the only reliable
-- source; the online API reference is a redirect stub). The complete audio
-- surface exposed to Lua is four calls, found in:
--   Scripts/Menu/Sound/lm_bonesound.lua
--   Scripts/Menu/Sound/lm_layersound.lua
--
--   moho:CountAudioLayers()                      -> number of audio layers
--   moho:GetAudioLayer(index)                    -> audio layer (0-based)
--   audioLayer:GetAmplitude(startSec, lengthSec) -> amplitude for a window
--   audioLayer:LayerDuration()                   -> duration in FRAMES
--   audioLayer:TotalTimingOffset()               -> offset in FRAMES
--
-- Note there is NO LayerAsAudio() cast. Moho ships LayerAsBone/Group/Image/
-- Particle/Source/Switch/Vector but nothing for audio, so an audio layer can
-- only be reached through moho:GetAudioLayer(index). Everything here is
-- therefore keyed off that index, with absolute layer IDs resolved by scanning
-- the audio layer list rather than by casting a layer we already hold.

local audio = {}

-- --------------------------------------------------------------------
-- Constants
-- --------------------------------------------------------------------

-- Maximum number of amplitude samples returned by one getAmplitudeCurve call.
--
-- Why a cap exists: the MCP poll loop runs on Moho's window redraw, so any
-- work we do here happens on the UI thread. A loop of GetAmplitude calls over
-- a long range would freeze the interface with no way for the user to tell
-- what is happening, and the bridge would report a timeout rather than a
-- reason. A hard limit turns that hang into an explanatory error.
--
-- Why 600: at 24 fps this is 25 seconds of audio, which comfortably covers a
-- single shot or line of dialogue -- the realistic unit of lip sync work. It
-- also keeps the JSON response near 10 KB, so the result stays readable in a
-- model context instead of crowding it out. Longer ranges are still reachable
-- two ways, neither of which blocks the UI for long: raise `step` to sample
-- every Nth frame (step=10 covers 6000 frames in 600 samples), or page through
-- the range with successive startFrame/endFrame calls.
local MAX_CURVE_SAMPLES = 600

-- --------------------------------------------------------------------
-- Helpers
-- --------------------------------------------------------------------

local function getFps(moho)
    local fps = 24
    local ok, value = pcall(function() return moho.document:Fps() end)
    if ok and type(value) == "number" and value > 0 then fps = value end
    return fps
end

local function countAudioLayers(moho)
    local ok, count = pcall(function() return moho:CountAudioLayers() end)
    if not ok or type(count) ~= "number" then
        return nil, "Failed to count audio layers"
    end
    return count
end

-- Collect the descriptive fields of one audio layer. Read-only: never calls
-- PrepUndo or SetDirty.
local function describeAudioLayer(moho, lyr, index, fps)
    local entry = { index = index }

    local nameOk, name = pcall(function() return lyr:Name() end)
    entry.name = (nameOk and name) or ""

    local durOk, duration = pcall(function() return lyr:LayerDuration() end)
    if durOk and type(duration) == "number" then
        -- LayerDuration() is in frames; Moho's own scripts divide by Fps() to
        -- get seconds (lm_bonesound.lua:139).
        entry.durationFrames = duration
        entry.durationSeconds = duration / fps
    else
        entry.durationFrames = 0
        entry.durationSeconds = 0
    end

    local offOk, offset = pcall(function() return lyr:TotalTimingOffset() end)
    entry.timingOffset = (offOk and type(offset) == "number") and offset or 0

    -- Absolute ID lets callers cross-reference with document.getLayers output.
    -- Guarded because it is a moho-level helper, not an audio layer method.
    if moho and moho.LayerAbsoluteID then
        local idOk, absId = pcall(function() return moho:LayerAbsoluteID(lyr) end)
        if idOk and type(absId) == "number" then entry.layerId = absId end
    end

    return entry
end

-- Resolve an audio layer from either audioIndex (0-based, as accepted by
-- moho:GetAudioLayer) or layerId (absolute document ID). Returns the layer,
-- its audio index, and the layer count.
local function resolveAudioLayer(moho, params)
    if not moho or not moho.document then return nil, nil, nil, "No active document" end

    local count, countErr = countAudioLayers(moho)
    if not count then return nil, nil, nil, countErr end
    if count < 1 then
        return nil, nil, nil, "Document contains no audio layers"
    end

    local index = nil

    if params.audioIndex ~= nil then
        if type(params.audioIndex) ~= "number" then
            return nil, nil, nil, "audioIndex must be a number"
        end
        index = math.floor(params.audioIndex)
        if index < 0 or index >= count then
            return nil, nil, nil, "audioIndex " .. tostring(index) ..
                " out of range (0.." .. tostring(count - 1) .. ")"
        end
    elseif params.layerId ~= nil then
        if type(params.layerId) ~= "number" then
            return nil, nil, nil, "layerId must be a number"
        end
        -- No LayerAsAudio cast exists, so match by absolute ID across the
        -- audio layer list instead of casting the layer directly.
        local wanted = math.floor(params.layerId)
        if not (moho and moho.LayerAbsoluteID) then
            return nil, nil, nil, "This Moho build cannot resolve layerId for audio layers; use audioIndex"
        end
        for i = 0, count - 1 do
            local ok, candidate = pcall(function() return moho:GetAudioLayer(i) end)
            if ok and candidate then
                local idOk, absId = pcall(function() return moho:LayerAbsoluteID(candidate) end)
                if idOk and absId == wanted then
                    index = i
                    break
                end
            end
        end
        if index == nil then
            return nil, nil, nil, "Layer " .. tostring(wanted) .. " is not an audio layer in this document"
        end
    else
        return nil, nil, nil, "Provide either audioIndex or layerId"
    end

    local ok, lyr = pcall(function() return moho:GetAudioLayer(index) end)
    if not ok or not lyr then
        return nil, nil, nil, "Failed to get audio layer at index " .. tostring(index)
    end

    return lyr, index, count
end

-- Convert a document frame to a time in seconds inside the audio content,
-- which is the coordinate GetAmplitude expects.
--
-- Derivation from lm_bonesound.lua:147-160. That script initialises
--   frame    = 1 - audioLayer:TotalTimingOffset()
--   audioTime = 0
-- and advances both together, so audio content time 0 sits at the document
-- frame where (documentFrame + audioTimingOffset) == 1. This matches how the
-- rest of Moho treats timing offsets: lm_transform_layer.lua writes channel
-- values at `moho.frame + layer:TotalTimingOffset()`, i.e. layer-local time is
-- document time plus the offset. Hence:
--
--   audioTime = (documentFrame + timingOffset - 1) / fps
--
-- Callers who need to bypass this convention entirely can pass `time` in
-- seconds instead of `frame`; it is forwarded to GetAmplitude untouched.
local function frameToAudioTime(frame, timingOffset, fps)
    return (frame + timingOffset - 1) / fps
end

local function sampleAmplitude(lyr, startSec, lengthSec)
    local ok, amp = pcall(function() return lyr:GetAmplitude(startSec, lengthSec) end)
    if not ok then
        return nil, "GetAmplitude failed: " .. tostring(amp)
    end
    if type(amp) ~= "number" then
        return nil, "GetAmplitude returned a non-numeric value"
    end
    return amp
end

-- Resolve the sampling window (in seconds) used for one amplitude reading.
-- GetAmplitude's second argument is a duration, not an end time: Moho's own
-- scripts pass stepSize/Fps() as the window (lm_bonesound.lua:153).
local function resolveWindowSeconds(params, fps)
    if params.window ~= nil then
        if type(params.window) ~= "number" or params.window <= 0 then
            return nil, "window must be a positive number of seconds"
        end
        return params.window
    end
    if params.windowFrames ~= nil then
        if type(params.windowFrames) ~= "number" or params.windowFrames <= 0 then
            return nil, "windowFrames must be a positive number of frames"
        end
        return params.windowFrames / fps
    end
    -- Default: one frame's worth of audio.
    return 1 / fps
end

-- --------------------------------------------------------------------
-- Handlers
-- --------------------------------------------------------------------

-- audio.listLayers: enumerate audio layers with name, duration and offset.
-- Read-only.
function audio.listLayers(moho, params)
    if not moho or not moho.document then return nil, "No active document" end

    local count, countErr = countAudioLayers(moho)
    if not count then return nil, countErr end

    local fps = getFps(moho)
    local layers = {}
    for i = 0, count - 1 do
        local ok, lyr = pcall(function() return moho:GetAudioLayer(i) end)
        if ok and lyr then
            table.insert(layers, describeAudioLayer(moho, lyr, i, fps))
        else
            -- Report the gap instead of silently shortening the list, so a
            -- caller indexing by position is not misled.
            table.insert(layers, { index = i, error = "unreadable audio layer" })
        end
    end

    return { count = count, fps = fps, layers = layers }
end

-- audio.getAmplitude: amplitude for a single frame (or raw time), or the
-- aggregate over a frame range. Read-only.
--
-- The returned amplitude is whatever Moho reports for the window; it is not
-- rescaled or clamped here. Moho's own scripts treat it as a factor and
-- multiply it by a user magnitude (lm_bonesound.lua:167).
function audio.getAmplitude(moho, params)
    if not params then return nil, "Missing parameters" end

    local lyr, index, _, err = resolveAudioLayer(moho, params)
    if not lyr then return nil, err end

    local fps = getFps(moho)
    local offOk, timingOffset = pcall(function() return lyr:TotalTimingOffset() end)
    if not offOk or type(timingOffset) ~= "number" then timingOffset = 0 end

    -- Raw seconds path: forwarded to GetAmplitude without frame conversion.
    if params.time ~= nil then
        if type(params.time) ~= "number" then
            return nil, "time must be a number of seconds"
        end
        if params.time < 0 then
            return nil, "time must not be negative"
        end
        local window, windowErr = resolveWindowSeconds(params, fps)
        if not window then return nil, windowErr end

        local amp, ampErr = sampleAmplitude(lyr, params.time, window)
        if amp == nil then return nil, ampErr end

        return {
            audioIndex = index,
            time = params.time,
            window = window,
            amplitude = amp,
        }
    end

    -- Frame range path: aggregate over startFrame..endFrame in one window.
    if params.startFrame ~= nil and params.endFrame ~= nil then
        if type(params.startFrame) ~= "number" or type(params.endFrame) ~= "number" then
            return nil, "startFrame and endFrame must be numbers"
        end
        local startFrame = math.floor(params.startFrame)
        local endFrame = math.floor(params.endFrame)
        if endFrame < startFrame then
            return nil, "endFrame must be greater than or equal to startFrame"
        end

        local startSec = frameToAudioTime(startFrame, timingOffset, fps)
        if startSec < 0 then
            return nil, "Frame " .. tostring(startFrame) ..
                " maps to a negative audio time; the audio starts later in the timeline"
        end
        -- Inclusive range: frame N still covers its own frame of audio.
        local lengthSec = (endFrame - startFrame + 1) / fps

        local amp, ampErr = sampleAmplitude(lyr, startSec, lengthSec)
        if amp == nil then return nil, ampErr end

        return {
            audioIndex = index,
            startFrame = startFrame,
            endFrame = endFrame,
            time = startSec,
            window = lengthSec,
            amplitude = amp,
        }
    end

    -- Single frame path. Defaults to the document's current frame.
    local frame = params.frame
    if frame == nil then
        local frameOk, current = pcall(function() return moho.document:CurrentFrame() end)
        if frameOk and type(current) == "number" then
            frame = current
        else
            return nil, "Provide frame, time, or startFrame/endFrame"
        end
    end
    if type(frame) ~= "number" then return nil, "frame must be a number" end
    frame = math.floor(frame)

    local window, windowErr = resolveWindowSeconds(params, fps)
    if not window then return nil, windowErr end

    local startSec = frameToAudioTime(frame, timingOffset, fps)
    if startSec < 0 then
        return nil, "Frame " .. tostring(frame) ..
            " maps to a negative audio time; the audio starts later in the timeline"
    end

    local amp, ampErr = sampleAmplitude(lyr, startSec, window)
    if amp == nil then return nil, ampErr end

    return {
        audioIndex = index,
        frame = frame,
        time = startSec,
        window = window,
        timingOffset = timingOffset,
        amplitude = amp,
    }
end

-- audio.getAmplitudeCurve: amplitude sampled across a frame range, for driving
-- animation from the soundtrack. Read-only.
--
-- Sample count is capped at MAX_CURVE_SAMPLES because this loop runs on Moho's
-- UI thread (see the constant's comment). Exceeding it returns an error that
-- names the limit and the ways around it, rather than freezing the app.
function audio.getAmplitudeCurve(moho, params)
    if not params then return nil, "Missing parameters" end
    if params.startFrame == nil or params.endFrame == nil then
        return nil, "Both startFrame and endFrame are required"
    end
    if type(params.startFrame) ~= "number" or type(params.endFrame) ~= "number" then
        return nil, "startFrame and endFrame must be numbers"
    end

    local startFrame = math.floor(params.startFrame)
    local endFrame = math.floor(params.endFrame)
    if endFrame < startFrame then
        return nil, "endFrame must be greater than or equal to startFrame"
    end

    local step = 1
    if params.step ~= nil then
        if type(params.step) ~= "number" then return nil, "step must be a number" end
        step = math.floor(params.step)
        if step < 1 then return nil, "step must be at least 1" end
    end

    local sampleCount = math.floor((endFrame - startFrame) / step) + 1
    if sampleCount > MAX_CURVE_SAMPLES then
        return nil, "Requested " .. tostring(sampleCount) .. " samples, limit is " ..
            tostring(MAX_CURVE_SAMPLES) ..
            ". Sampling runs inside Moho's redraw loop, so a larger range would freeze the interface." ..
            " Either raise step (currently " .. tostring(step) ..
            ") or request the range in smaller startFrame/endFrame chunks."
    end

    local lyr, index, _, err = resolveAudioLayer(moho, params)
    if not lyr then return nil, err end

    local fps = getFps(moho)
    local offOk, timingOffset = pcall(function() return lyr:TotalTimingOffset() end)
    if not offOk or type(timingOffset) ~= "number" then timingOffset = 0 end

    -- Each sample covers the audio spanned by `step` frames, matching how
    -- Moho's own scripts size the window (frameDuration = stepSize / Fps()).
    local window, windowErr = resolveWindowSeconds(params, fps)
    if not window then return nil, windowErr end
    if params.window == nil and params.windowFrames == nil then
        window = step / fps
    end

    local samples = {}
    local skipped = 0
    local minAmp = nil
    local maxAmp = nil
    local total = 0
    local counted = 0

    local frame = startFrame
    while frame <= endFrame do
        local startSec = frameToAudioTime(frame, timingOffset, fps)
        if startSec < 0 then
            -- Before the audio begins: record silence rather than aborting the
            -- whole curve, so a range that straddles the audio start is usable.
            table.insert(samples, { frame = frame, amplitude = 0, beforeStart = true })
            skipped = skipped + 1
        else
            local amp, ampErr = sampleAmplitude(lyr, startSec, window)
            if amp == nil then
                return nil, "Sampling stopped at frame " .. tostring(frame) .. ": " .. tostring(ampErr)
            end
            table.insert(samples, { frame = frame, amplitude = amp })
            if minAmp == nil or amp < minAmp then minAmp = amp end
            if maxAmp == nil or amp > maxAmp then maxAmp = amp end
            total = total + amp
            counted = counted + 1
        end
        frame = frame + step
    end

    local result = {
        audioIndex = index,
        startFrame = startFrame,
        endFrame = endFrame,
        step = step,
        fps = fps,
        window = window,
        timingOffset = timingOffset,
        sampleCount = #samples,
        samples = samples,
    }
    if skipped > 0 then result.samplesBeforeAudioStart = skipped end
    if counted > 0 then
        result.min = minAmp
        result.max = maxAmp
        result.average = total / counted
    end

    return result
end

-- audio.setTimingOffset: shift an audio layer along the timeline.
-- MUTATION -- PrepUndo before, SetDirty after.
--
-- SetTimingOffset is a generic MohoLayer method (Moho calls it on duplicated
-- layers of arbitrary type in Scripts/Menu/Tiling/lm_tile2.lua:199), and the
-- object returned by GetAudioLayer is a layer, so it is called directly here.
-- The offset is measured in FRAMES, consistent with TotalTimingOffset().
function audio.setTimingOffset(moho, params)
    if not moho or not moho.document then return nil, "No active document" end
    if not params then return nil, "Missing parameters" end
    if params.offset == nil then
        return nil, "Missing required parameter: offset"
    end
    if type(params.offset) ~= "number" then
        return nil, "offset must be a number of frames"
    end

    local lyr, index, _, err = resolveAudioLayer(moho, params)
    if not lyr then return nil, err end

    local offset = math.floor(params.offset)

    local prevOk, previous = pcall(function() return lyr:TotalTimingOffset() end)
    if not prevOk or type(previous) ~= "number" then previous = nil end

    -- PrepUndo must run before the change, or Cmd+Z inside Moho cannot revert
    -- it and the user silently loses the ability to undo.
    local undoOk, undoErr = pcall(function() moho.document:PrepUndo(lyr) end)
    if not undoOk then
        return nil, "Failed to prepare undo: " .. tostring(undoErr)
    end

    local setOk, setErr = pcall(function() lyr:SetTimingOffset(offset) end)
    if not setOk then
        return nil, "Failed to set timing offset: " .. tostring(setErr)
    end

    pcall(function() moho.document:SetDirty() end)

    local newOk, applied = pcall(function() return lyr:TotalTimingOffset() end)

    local name = ""
    pcall(function() name = lyr:Name() or "" end)

    return {
        success = true,
        audioIndex = index,
        name = name,
        requestedOffset = offset,
        previousOffset = previous,
        -- TotalTimingOffset includes inherited offsets from parent groups, so
        -- it can legitimately differ from the value just written.
        totalTimingOffset = (newOk and type(applied) == "number") and applied or nil,
    }
end

return audio
