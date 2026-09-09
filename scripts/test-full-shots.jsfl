var logUri = "file:///Users/romanmolodyko/Documents/toon-boom-harmony-mcp/output/donut-battle/timeline_test.log";
try {
  var dom = fl.getDocumentDOM();
  var tl = dom.getTimeline();

  // Create graphic symbols for all 8 shots
  for (var s = 1; s <= 8; s++) {
    var symName = "Sym_Shot" + s;
    var bitName = "shot" + s + ".jpg";
    if (dom.library.itemExists(symName)) {
      dom.library.deleteItem(symName);
    }
    dom.library.addNewItem("graphic", symName);
    dom.library.editItem(symName);
    dom.library.addItemToDocument({x: 0, y: 0}, bitName);
    if (dom.selection && dom.selection.length > 0) {
      var el = dom.selection[0];
      el.width = 1936;
      el.height = 1080;
      el.x = -968;
      el.y = -540;
    }
    dom.exitEditMode();
  }

  // Setup Shots layer
  tl.addNewLayer("Shots_Choreography");
  while (tl.layerCount > 1) {
    tl.deleteLayer(1);
  }

  // Span layer to 360 frames
  var curF = tl.layers[0].frameCount;
  if (curF < 360) {
    tl.currentFrame = curF - 1;
    tl.insertFrames(360 - curF);
  }

  // Place 8 shots at keyframes
  var cuts = [
    { frame: 0, sym: "Sym_Shot1" },
    { frame: 36, sym: "Sym_Shot2" },
    { frame: 72, sym: "Sym_Shot3" },
    { frame: 108, sym: "Sym_Shot4" },
    { frame: 148, sym: "Sym_Shot5" },
    { frame: 188, sym: "Sym_Shot6" },
    { frame: 240, sym: "Sym_Shot7" },
    { frame: 280, sym: "Sym_Shot8" }
  ];

  for (var i = 0; i < cuts.length; i++) {
    tl.currentFrame = cuts[i].frame;
    if (cuts[i].frame > 0) {
      tl.insertBlankKeyframe();
    }
    dom.library.addItemToDocument({x: 960, y: 540}, cuts[i].sym);
  }

  // Add Letterbox layer on top
  tl.addNewLayer("Letterbox_FX", "normal", true); // above shots
  tl.currentFrame = 0;
  dom.addNewRectangle({left: 0, top: 0, right: 1920, bottom: 44}, 0);
  dom.addNewRectangle({left: 0, top: 1036, right: 1920, bottom: 1080}, 0);
  tl.currentFrame = 0;
  tl.insertFrames(359);

  var res = "SUCCESS! Layer count: " + tl.layerCount + ", Shots frameCount: " + tl.layers[1].frameCount;
  FLfile.write(logUri, res + "\n");
} catch(e) {
  FLfile.write(logUri, "ERROR: " + e + "\n");
}
