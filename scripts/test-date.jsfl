try {
  var d = new Date();
  var iso = d.toISOString ? d.toISOString() : "NO toISOString";
  FLfile.write("file:///Users/romanmolodyko/Documents/toon-boom-harmony-mcp/output/donut-battle/production.log", "Date test: " + iso + "\n");
} catch(e) {
  FLfile.write("file:///Users/romanmolodyko/Documents/toon-boom-harmony-mcp/output/donut-battle/production.log", "Date error: " + e + "\n");
}
