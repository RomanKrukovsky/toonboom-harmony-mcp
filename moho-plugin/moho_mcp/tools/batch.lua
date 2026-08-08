-- batch.lua
-- Batch execution handler. Runs N operations in a single IPC round-trip.
-- Uses the central server.getHandler() for dispatch and the validator for
-- parameter shape validation. All-or-best-effort semantics: by default
-- continues past per-op failures, but the `stopOnError` flag is honored.

local batch = {}

local MAX_OPERATIONS = 50

local function dispatch(server, method, params)
    local handler = server.getHandler(method)
    if not handler then
        return false, "No handler registered for: " .. tostring(method)
    end
    return true, handler, params
end

function batch.execute(moho, params)
    if not params then return nil, "Missing parameters" end
    if type(params.operations) ~= "table" or #params.operations == 0 then
        return nil, "operations must be a non-empty array"
    end
    if #params.operations > MAX_OPERATIONS then
        return nil, "Too many operations: " .. #params.operations .. " (max " .. MAX_OPERATIONS .. ")"
    end

    local validator = require("moho_mcp.validator")
    local server = require("moho_mcp.server")

    local stopOnError = params.stopOnError == true
    local results = {}
    local succeeded = 0
    local failed = 0
    local stoppedEarly = false

    for i, op in ipairs(params.operations) do
        if stoppedEarly then
            results[i] = {
                success = false,
                index = i,
                error = { code = -32600, message = "Skipped (stopOnError)" },
            }
            goto continue
        end

        if type(op) ~= "table" or type(op.method) ~= "string" then
            results[i] = {
                success = false,
                index = i,
                error = { code = -32600, message = "Invalid op at index " .. i .. ": must have string 'method'" },
            }
            failed = failed + 1
            if stopOnError then stoppedEarly = true end
            goto continue
        end

        local opParams = op.params or {}
        local valid, validErr = validator.validateParams(op.method, opParams)
        if not valid then
            results[i] = {
                success = false,
                index = i,
                error = { code = -32602, message = validErr or "Invalid parameters" },
            }
            failed = failed + 1
            if stopOnError then stoppedEarly = true end
            goto continue
        end

        local ok, handler, hParams = dispatch(server, op.method, opParams)
        if not ok then
            results[i] = {
                success = false,
                index = i,
                error = { code = -32601, message = tostring(handler) },
            }
            failed = failed + 1
            if stopOnError then stoppedEarly = true end
            goto continue
        end

        local invokeOk, result, handlerErr = pcall(handler, moho, hParams)
        if not invokeOk then
            results[i] = {
                success = false,
                index = i,
                error = { code = -32603, message = "Handler error: " .. tostring(result) },
            }
            failed = failed + 1
            if stopOnError then stoppedEarly = true end
        elseif result == nil and handlerErr then
            results[i] = {
                success = false,
                index = i,
                error = { code = -32603, message = handlerErr },
            }
            failed = failed + 1
            if stopOnError then stoppedEarly = true end
        else
            results[i] = {
                success = true,
                index = i,
                result = result,
            }
            succeeded = succeeded + 1
        end

        ::continue::
    end

    return {
        results = results,
        summary = {
            total = #params.operations,
            succeeded = succeeded,
            failed = failed,
            stoppedEarly = stoppedEarly,
        },
    }
end

return batch
