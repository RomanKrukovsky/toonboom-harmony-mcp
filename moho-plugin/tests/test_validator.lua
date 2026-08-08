-- test_validator.lua
-- Tests for moho_mcp/validator.lua: isAllowed and validateParams.

local validator = require("validator")

-------------------------------------------------------------------------------
-- isAllowed tests
-------------------------------------------------------------------------------

test("isAllowed: document.getInfo", function()
    assert_true(validator.isAllowed("document.getInfo"))
end)

test("isAllowed: document.getLayers", function()
    assert_true(validator.isAllowed("document.getLayers"))
end)

test("isAllowed: layer.getProperties", function()
    assert_true(validator.isAllowed("layer.getProperties"))
end)

test("isAllowed: layer.getChildren", function()
    assert_true(validator.isAllowed("layer.getChildren"))
end)

test("isAllowed: layer.getBones", function()
    assert_true(validator.isAllowed("layer.getBones"))
end)

test("isAllowed: bone.getProperties", function()
    assert_true(validator.isAllowed("bone.getProperties"))
end)

test("isAllowed: animation.getKeyframes", function()
    assert_true(validator.isAllowed("animation.getKeyframes"))
end)

test("isAllowed: animation.getFrameState", function()
    assert_true(validator.isAllowed("animation.getFrameState"))
end)

test("isAllowed: mesh.getPoints", function()
    assert_true(validator.isAllowed("mesh.getPoints"))
end)

test("isAllowed: mesh.getShapes", function()
    assert_true(validator.isAllowed("mesh.getShapes"))
end)

test("isAllowed: unknown method returns false", function()
    assert_false(validator.isAllowed("unknown.method"))
end)

test("isAllowed: empty string returns false", function()
    assert_false(validator.isAllowed(""))
end)

test("isAllowed: nil returns false", function()
    assert_false(validator.isAllowed(nil))
end)

test("isAllowed: number returns false", function()
    assert_false(validator.isAllowed(42))
end)

test("isAllowed: similar but wrong name returns false", function()
    assert_false(validator.isAllowed("document.getinfo"))  -- wrong case
end)

test("isAllowed: extra whitespace returns false", function()
    assert_false(validator.isAllowed(" document.getInfo"))
end)

-------------------------------------------------------------------------------
-- validateParams: methods with no required params
-------------------------------------------------------------------------------

test("validateParams: document.getInfo with nil params", function()
    local ok, err = validator.validateParams("document.getInfo", nil)
    assert_true(ok, "should pass")
    assert_eq(err, nil)
end)

test("validateParams: document.getInfo with empty table", function()
    local ok, err = validator.validateParams("document.getInfo", {})
    assert_true(ok, "should pass")
    assert_eq(err, nil)
end)

test("validateParams: document.getLayers with nil params", function()
    local ok, err = validator.validateParams("document.getLayers", nil)
    assert_true(ok, "should pass")
end)

test("validateParams: document.getLayers with extra params still passes", function()
    local ok, err = validator.validateParams("document.getLayers", {extra = "ignored"})
    assert_true(ok, "should pass - extra params ignored")
end)

-------------------------------------------------------------------------------
-- validateParams: methods with layerId only
-------------------------------------------------------------------------------

test("validateParams: layer.getProperties with valid params", function()
    local ok, err = validator.validateParams("layer.getProperties", {layerId = 1})
    assert_true(ok)
    assert_eq(err, nil)
end)

test("validateParams: layer.getProperties missing layerId", function()
    local ok, err = validator.validateParams("layer.getProperties", {})
    assert_false(ok)
    assert_true(err:find("layerId"), "error mentions layerId")
end)

test("validateParams: layer.getProperties with string layerId (wrong type)", function()
    local ok, err = validator.validateParams("layer.getProperties", {layerId = "one"})
    assert_false(ok)
    assert_true(err:find("type"), "error mentions type")
    assert_true(err:find("layerId"), "error mentions layerId")
end)

test("validateParams: layer.getProperties with nil params", function()
    local ok, err = validator.validateParams("layer.getProperties", nil)
    assert_false(ok)
    assert_true(err:find("Missing params") or err:find("table"),
        "error mentions missing params")
end)

test("validateParams: layer.getChildren with valid params", function()
    local ok, err = validator.validateParams("layer.getChildren", {layerId = 5})
    assert_true(ok)
end)

test("validateParams: layer.getBones with valid params", function()
    local ok, err = validator.validateParams("layer.getBones", {layerId = 3})
    assert_true(ok)
end)

test("validateParams: mesh.getPoints with valid params", function()
    local ok, err = validator.validateParams("mesh.getPoints", {layerId = 2})
    assert_true(ok)
end)

test("validateParams: mesh.getShapes with valid params", function()
    local ok, err = validator.validateParams("mesh.getShapes", {layerId = 7})
    assert_true(ok)
end)

-------------------------------------------------------------------------------
-- validateParams: methods with two required params
-------------------------------------------------------------------------------

test("validateParams: bone.getProperties with valid params", function()
    local ok, err = validator.validateParams("bone.getProperties",
        {layerId = 1, boneId = 2})
    assert_true(ok)
    assert_eq(err, nil)
end)

test("validateParams: bone.getProperties missing boneId", function()
    local ok, err = validator.validateParams("bone.getProperties", {layerId = 1})
    assert_false(ok)
    assert_true(err:find("boneId"), "error mentions boneId")
end)

test("validateParams: bone.getProperties missing layerId", function()
    local ok, err = validator.validateParams("bone.getProperties", {boneId = 2})
    assert_false(ok)
    assert_true(err:find("layerId"), "error mentions layerId")
end)

test("validateParams: bone.getProperties both wrong type", function()
    local ok, err = validator.validateParams("bone.getProperties",
        {layerId = "a", boneId = "b"})
    assert_false(ok)
    assert_true(err:find("type"), "error mentions type")
end)

test("validateParams: animation.getKeyframes with valid params", function()
    local ok, err = validator.validateParams("animation.getKeyframes",
        {layerId = 1, channel = "rotation"})
    assert_true(ok)
end)

test("validateParams: animation.getKeyframes missing channel", function()
    local ok, err = validator.validateParams("animation.getKeyframes", {layerId = 1})
    assert_false(ok)
    assert_true(err:find("channel"), "error mentions channel")
end)

test("validateParams: animation.getKeyframes channel wrong type", function()
    local ok, err = validator.validateParams("animation.getKeyframes",
        {layerId = 1, channel = 123})
    assert_false(ok)
    assert_true(err:find("channel"), "error mentions channel")
    assert_true(err:find("type"), "error mentions type")
end)

test("validateParams: animation.getFrameState with valid params", function()
    local ok, err = validator.validateParams("animation.getFrameState",
        {layerId = 1, frame = 24})
    assert_true(ok)
end)

test("validateParams: animation.getFrameState missing frame", function()
    local ok, err = validator.validateParams("animation.getFrameState", {layerId = 1})
    assert_false(ok)
    assert_true(err:find("frame"), "error mentions frame")
end)

test("validateParams: animation.getFrameState frame wrong type", function()
    local ok, err = validator.validateParams("animation.getFrameState",
        {layerId = 1, frame = "twelve"})
    assert_false(ok)
    assert_true(err:find("type"), "error mentions type")
end)

-------------------------------------------------------------------------------
-- validateParams: unknown method
-------------------------------------------------------------------------------

test("validateParams: unknown method returns false", function()
    local ok, err = validator.validateParams("nonexistent.method", {})
    assert_false(ok)
    -- validator.lua reports "Unknown or disallowed method: <name>".
    assert_true(err and err:find("Unknown or disallowed method", 1, true),
        "error mentions unknown or disallowed method")
end)

test("validateParams: nil method", function()
    local ok, err = validator.validateParams(nil, {})
    assert_false(ok)
end)

-------------------------------------------------------------------------------
-- validateParams: params as non-table type (for methods that require params)
-------------------------------------------------------------------------------

test("validateParams: string params rejected for method requiring table", function()
    local ok, err = validator.validateParams("layer.getProperties", "not a table")
    assert_false(ok)
    assert_true(err:find("table") or err:find("Missing params"),
        "error about non-table params")
end)

test("validateParams: number params rejected", function()
    local ok, err = validator.validateParams("layer.getProperties", 42)
    assert_false(ok)
end)

-------------------------------------------------------------------------------
-- Contract: allow-list <-> implementation parity.
--
-- A method that is allow-listed but not implemented passes validation and then
-- dies at dispatch. A method that is implemented but not allow-listed is
-- rejected as METHOD_NOT_FOUND even though the code exists. Both are silent
-- from the bridge's point of view, so assert the two sets agree exactly.
-- This is what caught bone.deleteBone missing from bone.lua.
-------------------------------------------------------------------------------

local TOOL_MODULES = {
    "document", "layer", "bone", "animation", "mesh", "batch", "workflow",
}

local function collectImplemented()
    local impl = {}
    for _, modName in ipairs(TOOL_MODULES) do
        local ok, mod = pcall(require, "tools." .. modName)
        if not ok then
            ok, mod = pcall(require, "moho_mcp.tools." .. modName)
        end
        if not ok or type(mod) ~= "table" then
            error("cannot load tool module: " .. modName .. " (" .. tostring(mod) .. ")")
        end
        for key, value in pairs(mod) do
            if type(value) == "function" then
                impl[modName .. "." .. key] = true
            end
        end
    end
    return impl
end

-- Every method the top-level server script registers. Parsed from the same
-- source of truth the plugin uses, so the test tracks it automatically.
local function collectRegistered()
    local registered = {}
    local f = assert(io.open(PLUGIN_DIR .. "MohoMCP_Server.lua", "r"))
    local body = f:read("*a")
    f:close()
    for method in body:gmatch('"([a-z]+%.[a-zA-Z0-9_]+)"') do
        local prefix = method:match("^([a-z]+)%.")
        for _, modName in ipairs(TOOL_MODULES) do
            if prefix == modName then registered[method] = true end
        end
    end
    return registered
end

test("contract: every implemented tool function is allow-listed", function()
    for method in pairs(collectImplemented()) do
        assert_true(validator.isAllowed(method),
            "implemented but NOT allow-listed: " .. method)
    end
end)

test("contract: every registered method is implemented", function()
    local impl = collectImplemented()
    for method in pairs(collectRegistered()) do
        assert_true(impl[method],
            "registered in MohoMCP_Server.lua but NOT implemented: " .. method)
    end
end)

test("contract: every registered method is allow-listed", function()
    for method in pairs(collectRegistered()) do
        assert_true(validator.isAllowed(method),
            "registered but NOT allow-listed: " .. method)
    end
end)

test("contract: every allow-listed method has a parameter schema", function()
    -- validateParams must never fall through to "no parameter schema".
    for method in pairs(collectImplemented()) do
        local ok, err = validator.validateParams(method, {})
        if not ok then
            assert_false(err:find("no parameter schema", 1, true),
                "missing schema for " .. method)
        end
    end
end)

test("contract: bone.deleteBone is implemented (regression)", function()
    local impl = collectImplemented()
    assert_true(impl["bone.deleteBone"],
        "bone.deleteBone must exist in tools/bone.lua")
end)

test("contract: destructive methods all require previewHash", function()
    local destructive = {
        "animation.deleteKeyframe", "layer.delete", "bone.deleteBone",
        "mesh.weld", "document.save", "document.close", "workflow.batchRender",
    }
    for _, method in ipairs(destructive) do
        assert_true(validator.isDestructive(method),
            method .. " must be marked destructive")
        local schema_ok = validator.validateParams(method, {})
        assert_false(schema_ok,
            method .. " must reject empty params (previewHash required)")
    end
end)
