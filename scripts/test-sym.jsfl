(function() {
  var logUri = "file:///Users/romanmolodyko/Documents/toon-boom-harmony-mcp/output/donut-battle/jsfl_test.log";
  var dom = fl.getDocumentDOM();
  if (!dom) return;

  var symName = "Test_Shot1_Sym";
  if (!dom.library.itemExists(symName)) {
    dom.library.addNewItem("graphic", symName);
  }
  dom.library.editItem(symName);
  var itemTl = dom.getTimeline();
  itemTl.clear();
  dom.library.addItemToDocument({x: 0, y: 0}, "shot1.jpg");
  if (dom.selection && dom.selection.length > 0) {
    var elem = dom.selection[0];
    elem.x = -960;
    elem.y = -540;
    elem.width = 1920;
    elem.height = 1080;
  }
  dom.exitEditMode();

  var res = "Created symbol " + symName + " successfully!";
  FLfile.write(logUri, res);
})();
