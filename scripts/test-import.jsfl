(function() {
  fl.outputPanel.clear();
  fl.trace("Testing JSFL import...");
  var dom = fl.getDocumentDOM();
  if (!dom) {
    fl.trace("No active document!");
    return;
  }
  var uri = "file:///Users/romanmolodyko/Documents/toon-boom-harmony-mcp/output/donut-battle/assets/shot1.jpg";
  fl.trace("Importing shot1: " + uri);
  dom.importFile(uri, true);
  fl.trace("Library items count: " + dom.library.items.length);
  for (var i = 0; i < dom.library.items.length; i++) {
    fl.trace("Item " + i + ": " + dom.library.items[i].name);
  }
})();
