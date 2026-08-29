local inputPath = [=[/Users/romanmolodyko/Documents/toon-boom-harmony-mcp/docs/evidence/moho-stage1-humanoid/stage1_production_hero.moho]=]
local outputPath = [=[/Users/romanmolodyko/Documents/toon-boom-harmony-mcp/docs/evidence/moho-stage1-humanoid/acceptance/roundtrip.moho]=]

function MohoScript(moho)
	moho:FileOpen(inputPath)
	moho:FileSaveAs(outputPath)
	print("MCP_ROUNDTRIP_SAVE_OK")
	moho:Quit()
end
