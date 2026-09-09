var res = "";
res += "FLfile: " + (typeof FLfile) + "\n";
res += "FLfile.write: " + (typeof FLfile.write) + "\n";
res += "FLfile.append: " + (typeof FLfile.append) + "\n";
res += "FLfile.exists: " + (typeof FLfile.exists) + "\n";
res += "FLfile.read: " + (typeof FLfile.read) + "\n";
FLfile.write("file:///Users/romanmolodyko/Documents/toon-boom-harmony-mcp/output/donut-battle/flfile_test.log", res);
