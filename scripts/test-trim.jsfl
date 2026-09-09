var logUri = "file:///Users/romanmolodyko/Documents/toon-boom-harmony-mcp/output/donut-battle/timeline_test.log";
try {
  var dom = fl.getDocumentDOM();
  var tl = dom.getTimeline();
  var fCount = tl.layers[0].frameCount;
  if (fCount > 1) {
    tl.removeFrames(1, fCount - 1);
  }
  var res = "Frames after trim: " + tl.layers[0].frameCount;
  FLfile.write(logUri, res + "\n");
} catch(e) {
  FLfile.write(logUri, "ERROR: " + e + "\n");
}
