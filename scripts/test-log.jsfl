(function() {
  var logUri = "file:///Users/romanmolodyko/Documents/toon-boom-harmony-mcp/output/donut-battle/jsfl_test.log";
  var logText = "JSFL executed successfully at " + new Date() + "\n";
  var dom = fl.getDocumentDOM();
  if (dom) {
    logText += "Document: " + dom.name + " (" + dom.path + ")\n";
    logText += "Library count: " + dom.library.items.length + "\n";
    for (var i = 0; i < dom.library.items.length; i++) {
      logText += "  - " + dom.library.items[i].name + " (" + dom.library.items[i].itemType + ")\n";
    }
  } else {
    logText += "No active document!\n";
  }
  FLfile.write(logUri, logText);
})();
