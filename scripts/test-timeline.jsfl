var logUri = "file:///Users/romanmolodyko/Documents/toon-boom-harmony-mcp/output/donut-battle/timeline_test.log";
try {
  var dom = fl.getDocumentDOM();
  var tl = dom.getTimeline();
  while (tl.layerCount > 1) tl.deleteLayer(tl.layerCount - 1);
  var fCount = tl.layers[0].frameCount;
  if (fCount > 1) tl.removeFrames(1, fCount - 1);
  tl.currentFrame = 0;
  dom.selectAll();
  dom.deleteSelection();

  tl.layers[0].name = "Test_Layer";
  fl.trace("Layer frameCount initially: " + tl.layers[0].frameCount);

  // Test insertBlankKeyframe at frame 36
  tl.currentFrame = 36;
  tl.insertBlankKeyframe();
  var res = "After insertBlankKeyframe at 36: frameCount = " + tl.layers[0].frameCount;

  FLfile.write(logUri, res + "\n");
} catch(e) {
  FLfile.write(logUri, "ERROR: " + e + "\n");
}
