(function() {
  var logUri = "file:///Users/romanmolodyko/Documents/toon-boom-harmony-mcp/output/donut-battle/jsfl_test.log";
  try {
    var dom = fl.getDocumentDOM();
    if (!dom) throw new Error("No active document!");

    var symName = "Test_Shot1_Sym";
    if (!dom.library.itemExists(symName)) {
      dom.library.addNewItem("graphic", symName);
    }
    dom.library.editItem(symName);
    var itemTl = dom.getTimeline();
    fl.trace("In editItem mode for " + symName);
    dom.library.addItemToDocument({x: 0, y: 0}, "shot1.jpg");
    var sel = dom.selection;
    var details = "selection length: " + (sel ? sel.length : 0);
    if (sel && sel.length > 0) {
      details += " type: " + sel[0].elementType;
    }
    dom.exitEditMode();
    FLfile.write(logUri, "SUCCESS: " + details);
  } catch(e) {
    FLfile.write(logUri, "ERROR: " + e.toString() + "\n" + (e.stack || ""));
  }
})();
