var logUri = "file:///Users/romanmolodyko/Documents/toon-boom-harmony-mcp/output/donut-battle/timeline_test.log";
try {
  var dom = fl.getDocumentDOM();
  var tl = dom.getTimeline();
  tl.addNewLayer("Clean_Shots");
  while (tl.layerCount > 1) {
    tl.deleteLayer(1);
  }
  var res = "Layer count: " + tl.layerCount + ", layer 0 name: " + tl.layers[0].name + ", frames: " + tl.layers[0].frameCount;
  FLfile.write(logUri, res + "\n");
} catch(e) {
  FLfile.write(logUri, "ERROR: " + e + "\n");
}
