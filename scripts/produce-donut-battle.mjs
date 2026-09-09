import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const workspaceRoot = '/Users/romanmolodyko/Documents/toon-boom-harmony-mcp';
const outputDir = path.join(workspaceRoot, 'output', 'donut-battle');
const assetsDir = path.join(outputDir, 'assets');
const flaPath = path.join(outputDir, 'donut_battle.fla');
const logPath = path.join(outputDir, 'production.log');

function pathToURI(p) {
  let normalized = p.replace(/\\/g, '/');
  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  return 'file://' + normalized;
}

const flaUri = pathToURI(flaPath);
const logUri = pathToURI(logPath);
const seqBaseUri = pathToURI(path.join(outputDir, 'frame.png'));

const jsfl = `
(function() {
  var logUri = "${logUri}";
  FLfile.write(logUri, "=== INITIALIZING CINEMATIC DONUT BATTLE ===\\n");

  function log(msg) {
    var line = "[" + (new Date()).toString() + "] " + msg + "\\n";
    FLfile.write(logUri, line, "append");
    fl.trace(msg);
  }

  try {
    log("=== STARTING CINEMATIC COUNTRYBALLS PRODUCTION ===");

    // Find donut_battle.fla or open it
    var dom = null;
    for (var i = 0; i < fl.documents.length; i++) {
      if (fl.documents[i].path && fl.documents[i].path.indexOf("donut_battle.fla") !== -1) {
        dom = fl.documents[i];
        break;
      }
    }
    if (!dom) {
      log("Opening existing document: " + "${flaUri}");
      dom = fl.openDocument("${flaUri}");
    }
    if (!dom) {
      throw new Error("Could not open donut_battle.fla!");
    }

    log("Active document: " + dom.name + " (" + dom.path + ")");

    // Configure document: 1920x1080 @ 24fps
    dom.width = 1920;
    dom.height = 1080;
    dom.frameRate = 24;
    dom.backgroundColor = "#12100e";

    var shots = [
      { id: 1, name: "shot1.jpg", sym: "Sym_Shot1", file: "${pathToURI(path.join(assetsDir, 'shot1.jpg'))}" },
      { id: 2, name: "shot2.jpg", sym: "Sym_Shot2", file: "${pathToURI(path.join(assetsDir, 'shot2.jpg'))}" },
      { id: 3, name: "shot3.jpg", sym: "Sym_Shot3", file: "${pathToURI(path.join(assetsDir, 'shot3.jpg'))}" },
      { id: 4, name: "shot4.jpg", sym: "Sym_Shot4", file: "${pathToURI(path.join(assetsDir, 'shot4.jpg'))}" },
      { id: 5, name: "shot5.jpg", sym: "Sym_Shot5", file: "${pathToURI(path.join(assetsDir, 'shot5.jpg'))}" },
      { id: 6, name: "shot6.jpg", sym: "Sym_Shot6", file: "${pathToURI(path.join(assetsDir, 'shot6.jpg'))}" },
      { id: 7, name: "shot7.jpg", sym: "Sym_Shot7", file: "${pathToURI(path.join(assetsDir, 'shot7.jpg'))}" },
      { id: 8, name: "shot8.jpg", sym: "Sym_Shot8", file: "${pathToURI(path.join(assetsDir, 'shot8.jpg'))}" }
    ];

    // Import all shots to library
    for (var s = 0; s < shots.length; s++) {
      var item = shots[s];
      if (dom.library.itemExists(item.name)) {
        dom.library.deleteItem(item.name);
      }
      log("Importing " + item.name + " to library...");
      dom.importFile(item.file, true);
    }

    // Create graphic symbols for each shot with centered 1936x1080 registration
    for (var s = 0; s < shots.length; s++) {
      var item = shots[s];
      if (dom.library.itemExists(item.sym)) {
        dom.library.deleteItem(item.sym);
      }
      dom.library.addNewItem("graphic", item.sym);
      dom.library.editItem(item.sym);
      dom.library.addItemToDocument({x: 0, y: 0}, item.name);
      if (dom.selection && dom.selection.length > 0) {
        var el = dom.selection[0];
        el.width = 1936;
        el.height = 1080;
        el.x = -968;
        el.y = -540;
      }
      dom.exitEditMode();
      log("Created graphic symbol " + item.sym);
    }

    // Reset root timeline
    var rootTl = dom.getTimeline();
    rootTl.addNewLayer("Shots_Choreography");
    while (rootTl.layerCount > 1) {
      rootTl.deleteLayer(1);
    }

    // Span layer to 360 frames
    var curF = rootTl.layers[0].frameCount;
    if (curF < 360) {
      rootTl.currentFrame = curF - 1;
      rootTl.insertFrames(360 - curF);
    }

    log("Placing 8 cinematic shots on Shots layer...");

    // Cuts definitions: frame is 0-indexed
    var cuts = [
      { frame: 0, sym: "Sym_Shot1", desc: "Stand-off" },
      { frame: 36, sym: "Sym_Shot2", desc: "Face-off Standoff" },
      { frame: 72, sym: "Sym_Shot3", desc: "USA Claims Donut" },
      { frame: 108, sym: "Sym_Shot4", desc: "Russia Tea Trick" },
      { frame: 148, sym: "Sym_Shot5", desc: "USA Ponders Tea" },
      { frame: 188, sym: "Sym_Shot6", desc: "POLANDBALL HEIST!" },
      { frame: 240, sym: "Sym_Shot7", desc: "Shock Silence" },
      { frame: 280, sym: "Sym_Shot8", desc: "Mission Failed Finale" }
    ];

    for (var i = 0; i < cuts.length; i++) {
      rootTl.currentFrame = cuts[i].frame;
      if (cuts[i].frame > 0) {
        rootTl.insertBlankKeyframe();
      }
      dom.library.addItemToDocument({x: 960, y: 540}, cuts[i].sym);
      log("Placed " + cuts[i].sym + " at frame " + cuts[i].frame + " (" + cuts[i].desc + ")");
    }

    // Camera push-in for Shot 1 (0 -> 35)
    rootTl.currentFrame = 35;
    rootTl.convertToKeyframes(35);
    var el1 = rootTl.layers[0].frames[35].elements[0];
    if (el1) {
      el1.scaleX = 1.05;
      el1.scaleY = 1.05;
      el1.y = 546;
    }
    rootTl.layers[0].frames[0].tweenType = "motion";

    // Snap pulse on Shot 2 (frame 55)
    rootTl.currentFrame = 54;
    rootTl.convertToKeyframes(54);
    rootTl.currentFrame = 55;
    rootTl.convertToKeyframes(55);
    var el2 = rootTl.layers[0].frames[55].elements[0];
    if (el2) {
      el2.scaleX = 1.06;
      el2.scaleY = 1.06;
    }
    rootTl.currentFrame = 58;
    rootTl.convertToKeyframes(58);
    var el2b = rootTl.layers[0].frames[58].elements[0];
    if (el2b) {
      el2b.scaleX = 1.02;
      el2b.scaleY = 1.02;
    }

    // Flag slam impact on Shot 3 (frame 76)
    rootTl.currentFrame = 76;
    rootTl.convertToKeyframes(76);
    var el3 = rootTl.layers[0].frames[76].elements[0];
    if (el3) { el3.y = 548; }
    rootTl.currentFrame = 78;
    rootTl.convertToKeyframes(78);
    var el3b = rootTl.layers[0].frames[78].elements[0];
    if (el3b) { el3b.y = 538; }
    rootTl.currentFrame = 80;
    rootTl.convertToKeyframes(80);
    var el3c = rootTl.layers[0].frames[80].elements[0];
    if (el3c) { el3c.y = 540; }

    // Glide motion on Shot 4 (tea slides right)
    rootTl.layers[0].frames[108].elements[0].x = 985;
    rootTl.currentFrame = 138;
    rootTl.convertToKeyframes(138);
    var el4 = rootTl.layers[0].frames[138].elements[0];
    if (el4) {
      el4.x = 940;
    }
    rootTl.layers[0].frames[108].tweenType = "motion";

    // Inquisitive zoom on Shot 5
    rootTl.currentFrame = 175;
    rootTl.convertToKeyframes(175);
    var el5 = rootTl.layers[0].frames[175].elements[0];
    if (el5) {
      el5.scaleX = 1.04;
      el5.scaleY = 1.04;
    }
    rootTl.layers[0].frames[148].tweenType = "motion";

    // Sonic camera shake on Shot 6 (The Polandball Heist!)
    var shakes = [
      { f: 188, x: 982, y: 524, s: 1.05 },
      { f: 190, x: 938, y: 556, s: 1.05 },
      { f: 192, x: 978, y: 528, s: 1.04 },
      { f: 194, x: 944, y: 550, s: 1.04 },
      { f: 196, x: 970, y: 534, s: 1.03 },
      { f: 198, x: 952, y: 545, s: 1.02 },
      { f: 200, x: 966, y: 537, s: 1.01 },
      { f: 202, x: 956, y: 543, s: 1.01 },
      { f: 204, x: 960, y: 540, s: 1.00 }
    ];
    for (var k = 0; k < shakes.length; k++) {
      rootTl.currentFrame = shakes[k].f;
      rootTl.convertToKeyframes(shakes[k].f);
      var elShake = rootTl.layers[0].frames[shakes[k].f].elements[0];
      if (elShake) {
        elShake.x = shakes[k].x;
        elShake.y = shakes[k].y;
        elShake.scaleX = shakes[k].s;
        elShake.scaleY = shakes[k].s;
      }
    }

    // Dramatic impact pulse on Shot 8 (frame 305 when MISSION FAILED lands)
    rootTl.currentFrame = 305;
    rootTl.convertToKeyframes(305);
    var el8 = rootTl.layers[0].frames[305].elements[0];
    if (el8) {
      el8.scaleX = 1.05;
      el8.scaleY = 1.05;
    }
    rootTl.currentFrame = 308;
    rootTl.convertToKeyframes(308);
    var el8b = rootTl.layers[0].frames[308].elements[0];
    if (el8b) {
      el8b.scaleX = 1.02;
      el8b.scaleY = 1.02;
    }

    // Add Letterbox layer on top
    rootTl.addNewLayer("Letterbox_FX", "normal", true); // on top of shots
    rootTl.currentFrame = 0;
    dom.addNewRectangle({left: 0, top: 0, right: 1920, bottom: 44}, 0);
    dom.addNewRectangle({left: 0, top: 1036, right: 1920, bottom: 1080}, 0);
    rootTl.currentFrame = 0;
    rootTl.insertFrames(359);

    log("Choreography completed across all 360 frames!");

    // Save document
    log("Saving .FLA to " + "${flaUri}");
    fl.saveDocument(dom);

    // Export keyframe checkpoints
    log("Exporting keyframe checkpoints...");
    rootTl.currentFrame = 18;
    dom.exportPNG("${pathToURI(path.join(outputDir, 'shot_01_standoff.png'))}", true, true);
    rootTl.currentFrame = 55;
    dom.exportPNG("${pathToURI(path.join(outputDir, 'shot_02_faceoff.png'))}", true, true);
    rootTl.currentFrame = 90;
    dom.exportPNG("${pathToURI(path.join(outputDir, 'shot_03_us_claim.png'))}", true, true);
    rootTl.currentFrame = 128;
    dom.exportPNG("${pathToURI(path.join(outputDir, 'shot_04_ru_tea.png'))}", true, true);
    rootTl.currentFrame = 166;
    dom.exportPNG("${pathToURI(path.join(outputDir, 'shot_05_us_ponder.png'))}", true, true);
    rootTl.currentFrame = 205;
    dom.exportPNG("${pathToURI(path.join(outputDir, 'shot_06_poland_heist.png'))}", true, true);
    rootTl.currentFrame = 255;
    dom.exportPNG("${pathToURI(path.join(outputDir, 'shot_07_shock_silence.png'))}", true, true);
    rootTl.currentFrame = 325;
    dom.exportPNG("${pathToURI(path.join(outputDir, 'shot_08_mission_failed.png'))}", true, true);

    // Export full frame sequence
    log("Exporting full frame sequence (360 frames)...");
    rootTl.currentFrame = 0;
    dom.exportPNG("${seqBaseUri}", true, false);

    log("=== PRODUCTION COMPLETED SUCCESSFULLY ===");
  } catch(err) {
    log("PRODUCTION ERROR: " + err);
  }
})();
`;

const jsflFile = path.join(outputDir, 'run_cinematic_production.jsfl');
fs.writeFileSync(jsflFile, jsfl, 'utf-8');
console.log('Wrote JSFL to:', jsflFile);

console.log('Dispatching production command to Adobe Animate 2024...');
const appleScript = `tell application "Adobe Animate 2024" to open POSIX file "${jsflFile.replace(/"/g, '\\"')}"`;
execSync(`osascript -e '${appleScript}'`, { timeout: 300_000, stdio: 'inherit' });
console.log('Command sent to Adobe Animate 2024!');
