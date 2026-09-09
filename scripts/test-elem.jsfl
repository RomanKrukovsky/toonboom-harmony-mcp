(function() {
  var logUri = "file:///Users/romanmolodyko/Documents/toon-boom-harmony-mcp/output/donut-battle/jsfl_test.log";
  try {
    var dom = fl.getDocumentDOM();
    var tl = dom.getTimeline();
    var f = tl.layers[0].frames[0];
    var log = "layer 0 frame 0 elements: " + f.elements.length;
    if (f.elements.length > 0) {
      var el = f.elements[0];
      log += " x=" + el.x + " y=" + el.y + " type=" + el.elementType;
    }
    FLfile.write(logUri, "ELEM TEST: " + log);
  } catch(e) {
    FLfile.write(logUri, "ELEM ERROR: " + e);
  }
})();
