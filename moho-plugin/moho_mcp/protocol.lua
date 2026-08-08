-- protocol.lua
-- JSON-RPC 2.0 message parsing and serialization for MohoMCP.
-- Assumes the global `json` table is available (loaded by the main server script).
--
-- This module mirrors the bridge-side wire codes exactly. See bridge/src/protocol.ts.

local protocol = {}

-- JSON-RPC 2.0 standard codes (-32700..-32000)
protocol.PARSE_ERROR      = -32700
protocol.INVALID_REQUEST  = -32600
protocol.METHOD_NOT_FOUND = -32601
protocol.INVALID_PARAMS   = -32602
protocol.INTERNAL_ERROR   = -32603

-- Application-specific extension codes (-32001..-32099)
protocol.NO_DOCUMENT            = -32001
protocol.LAYER_NOT_FOUND        = -32002
protocol.BONE_NOT_FOUND         = -32003
protocol.INVALID_FRAME          = -32004
protocol.VERSION_INCOMPATIBLE   = -32005
protocol.PROTOCOL_MISMATCH      = -32006
protocol.TOO_LARGE              = -32007
protocol.DUPLICATE_REQUEST      = -32008
protocol.RATE_LIMITED           = -32009
protocol.MOHO_ERROR              = -32010
protocol.QUEUE_OVERFLOW          = -32011
protocol.RESOURCE_LOCKED        = -32012
protocol.PAYLOAD_TOO_LARGE       = -32013
protocol.REQUEST_CANCELLED       = -32014
protocol.MOHO_NOT_RUNNING       = -32015
protocol.PROTOCOL_VERSION_MISSING = -32016
protocol.PERMISSION_DENIED       = -32017
protocol.IPC_TIMEOUT             = -32018
protocol.INTERNAL                = -32019
protocol.UNKNOWN                 = -32099

-- Current wire-protocol version. MUST match the bridge's CURRENT in protocol-version.ts.
protocol.WIRE_PROTOCOL_VERSION = "1.1.0"

-- Minimum bridge protocol version we still understand.
protocol.MIN_SUPPORTED_VERSION = "1.0.0"

-- Default timeouts (milliseconds) for IPC operations.
protocol.MAX_REQUEST_BYTES = 10 * 1024 * 1024  -- 10 MB hard cap on request body
protocol.REQUEST_TTL_MS    = 30 * 1000         -- 30 s

-- Map application codes to human-readable names (for log readability).
local CODE_NAMES = {}
for k, v in pairs(protocol) do
  if type(v) == "number" and v <= -32001 and v >= -32099 then
    CODE_NAMES[v] = k
  end
end
protocol.codeName = function(code)
  return CODE_NAMES[code] or tostring(code)
end

--- Compare two semver strings ("1.0.0" vs "1.1.0"). Returns -1/0/1.
-- @param a string  semver
-- @param b string  semver
-- @return number
function protocol.semverCompare(a, b)
  local function split(s)
    local out = {}
    for part in string.gmatch(s, "([^.]+)") do
      table.insert(out, tonumber(part) or 0)
    end
    return out
  end
  local aa = split(a or "0.0.0")
  local bb = split(b or "0.0.0")
  for i = 1, math.max(#aa, #bb) do
    local x = aa[i] or 0
    local y = bb[i] or 0
    if x ~= y then return x < y and -1 or 1 end
  end
  return 0
end

--- Negotiate protocol version against the minimum supported.
-- @param peerVersion string|nil  The bridge's protocol version (may be nil for older clients).
-- @return boolean compatible, string reason
function protocol.negotiate(peerVersion)
  if not peerVersion or peerVersion == "" then
    return false, "bridge did not advertise a protocolVersion"
  end
  if protocol.semverCompare(peerVersion, protocol.MIN_SUPPORTED_VERSION) < 0 then
    return false, string.format(
      "bridge protocol %s is below minimum supported %s",
      peerVersion, protocol.MIN_SUPPORTED_VERSION
    )
  end
  return true, "ok"
end

--- Parse a JSON-RPC 2.0 request string into a request table.
-- Validates that the decoded object contains jsonrpc="2.0", id, and method fields.
-- @param jsonStr string  The raw JSON string to parse
-- @return table|nil  The parsed request table on success, or nil on failure
-- @return string|nil  An error message on failure
function protocol.parseRequest(jsonStr)
  if type(jsonStr) ~= "string" or jsonStr == "" then
    return nil, "Invalid input: expected non-empty JSON string"
  end

  if #jsonStr > protocol.MAX_REQUEST_BYTES then
    return nil, string.format(
      "Request payload exceeds maximum size of %d bytes", protocol.MAX_REQUEST_BYTES
    )
  end

  local ok, decoded = pcall(json.decode, jsonStr)
  if not ok or type(decoded) ~= "table" then
    return nil, "Parse error: malformed JSON"
  end

  if decoded.jsonrpc ~= "2.0" then
    return nil, 'Invalid request: missing or incorrect jsonrpc version (must be "2.0")'
  end

  if decoded.id == nil then
    return nil, "Invalid request: missing id field"
  end

  if type(decoded.method) ~= "string" or decoded.method == "" then
    return nil, "Invalid request: missing or invalid method field"
  end

  return decoded, nil
end

--- Create a JSON-RPC 2.0 success response string.
-- @param id  The request id to echo back
-- @param result  The result value to include in the response
-- @param correlationId string|nil  Optional correlation id to echo back
-- @return string  The encoded JSON-RPC 2.0 response
function protocol.createResponse(id, result, correlationId)
  local response = {
    jsonrpc = "2.0",
    protocolVersion = protocol.WIRE_PROTOCOL_VERSION,
    id = id,
    result = result,
  }
  if correlationId then response.correlationId = correlationId end
  return json.encode(response)
end

--- Create a JSON-RPC 2.0 error response string.
-- @param id  The request id to echo back (may be nil for parse errors)
-- @param code number  The JSON-RPC error code
-- @param message string  A short human-readable error message
-- @param data any|nil  Optional additional error data
-- @param correlationId string|nil  Optional correlation id
-- @return string  The encoded JSON-RPC 2.0 error response
function protocol.createError(id, code, message, data, correlationId)
  local errorObj = {
    code = code,
    message = message,
  }
  if data ~= nil then errorObj.data = data end

  local response = {
    jsonrpc = "2.0",
    protocolVersion = protocol.WIRE_PROTOCOL_VERSION,
    id = id,
    error = errorObj,
  }
  if correlationId then response.correlationId = correlationId end
  return json.encode(response)
end

return protocol
