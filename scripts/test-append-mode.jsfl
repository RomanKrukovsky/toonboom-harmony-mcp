var uri = "file:///Users/romanmolodyko/Documents/toon-boom-harmony-mcp/output/donut-battle/append_test.log";
FLfile.write(uri, "Line 1\n");
FLfile.write(uri, "Line 2\n", "append");
FLfile.write(uri, "Line 3\n", "append");
