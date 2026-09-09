import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function pathToURI(filePath) {
  const normalized = path.resolve(filePath).replace(/\\/g, '/');
  return `file://${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

const outputDir = path.resolve('output/polandball-cartoon');
fs.mkdirSync(outputDir, { recursive: true });

const docPath = path.join(outputDir, 'polandball_in_space.fla');
const docUri = pathToURI(docPath);
const preview01 = path.join(outputDir, 'scene_01_ready.png');
const preview02 = path.join(outputDir, 'scene_02_apex.png');
const preview03 = path.join(outputDir, 'scene_03_splat.png');

const preview01Uri = pathToURI(preview01);
const preview02Uri = pathToURI(preview02);
const preview03Uri = pathToURI(preview03);

const logFile = path.join(outputDir, 'build.log');
const logUri = pathToURI(logFile);

const jsfl = `
(function() {
  var logUri = ${JSON.stringify(logUri)};
  function log(msg) {
    if (typeof FLfile !== 'undefined') {
      FLfile.write(logUri, msg + "\\n", "append");
    }
    fl.trace(msg);
  }

  try {
    if (typeof FLfile !== 'undefined') {
      FLfile.write(logUri, "=== POLANDBALL SCRIPT STARTED ===\\n");
    }
    log("Animate version: " + fl.version);

    // 1. Close open documents
    while (fl.documents && fl.documents.length > 0) {
      fl.closeDocument(fl.documents[0], false);
    }
    log("Cleaned open documents");

    // 2. Create new document
    var dom = fl.createDocument();
    if (!dom) {
      log("ERROR: Could not create document");
      return;
    }
    dom.width = 1920;
    dom.height = 1080;
    dom.frameRate = 24;
    dom.backgroundColor = "#64B5F6"; // Sky blue

    var tl = dom.getTimeline();

    // 3. Create all 4 layers at frame 0 while clean
    var bgLayer = tl.layers[0];
    bgLayer.name = "01_Background";

    tl.addNewLayer("02_Launchpad", "normal", true);
    tl.addNewLayer("03_Polandball", "normal", true);
    tl.addNewLayer("04_Dialogue_FX", "normal", true);

    function getLayerIndex(name) {
      for (var i = 0; i < tl.layers.length; i++) {
        if (tl.layers[i].name === name) return i;
      }
      return 0;
    }

    log("Layers created at frame 0");

    // -----------------------------------------------------------------
    // LAYER 1: 01_Background (Ground, Sun, Signpost)
    // -----------------------------------------------------------------
    var bgIdx = getLayerIndex("01_Background");
    tl.setSelectedLayers(bgIdx);
    tl.currentFrame = 0;

    // Sun
    dom.setFillColor("#FFEE58");
    dom.setStrokeColor("#FDD835");
    dom.setStrokeSize(4);
    dom.addNewOval({left: 1550, top: 60, right: 1800, bottom: 310});

    // Grass
    dom.setFillColor("#43A047");
    dom.setStrokeColor("#2E7D32");
    dom.setStrokeSize(6);
    dom.addNewRectangle({left: -50, top: 820, right: 1970, bottom: 1120}, 0);

    // Dirt base
    dom.setFillColor("#6D4C41");
    dom.setStrokeColor("#4E342E");
    dom.addNewRectangle({left: -50, top: 960, right: 1970, bottom: 1120}, 0);

    // Signpost
    dom.setFillColor("#8D6E63");
    dom.addNewRectangle({left: 280, top: 680, right: 310, bottom: 840}, 0);
    dom.setFillColor("#EFEBE9");
    dom.setStrokeColor("#5D4037");
    dom.setStrokeSize(4);
    dom.addNewRectangle({left: 180, top: 580, right: 410, bottom: 690}, 10);

    var signText = dom.addNewText({left: 190, top: 590, right: 400, bottom: 680});
    if (signText) {
      signText.setTextString("POLAN SPACE\\nPROGRAM :D");
      signText.setTextAttr("size", 22);
      signText.setTextAttr("fillColor", "#BF360C");
      signText.setTextAttr("face", "Impact");
    }
    log("Background drawn");

    // -----------------------------------------------------------------
    // LAYER 2: 02_Launchpad
    // -----------------------------------------------------------------
    var padIdx = getLayerIndex("02_Launchpad");
    tl.setSelectedLayers(padIdx);
    tl.currentFrame = 0;

    dom.setFillColor("#78909C");
    dom.setStrokeColor("#37474F");
    dom.setStrokeSize(5);
    dom.addNewRectangle({left: 820, top: 790, right: 1100, bottom: 830}, 8);
    // Spring underneath
    dom.setFillColor("#B0BEC5");
    dom.addNewOval({left: 920, top: 825, right: 1000, bottom: 845});
    log("Launchpad drawn");

    // -----------------------------------------------------------------
    // SYMBOL: Polandball_Char
    // -----------------------------------------------------------------
    dom.library.addNewItem("graphic", "Polandball_Char");
    dom.library.editItem("Polandball_Char");
    var symTl = dom.getTimeline();

    // Red bottom half
    dom.setFillColor("#E53935");
    dom.setStrokeColor("#000000");
    dom.setStrokeSize(8);
    dom.addNewOval({left: -120, top: -120, right: 120, bottom: 120});

    // White top half
    dom.setFillColor("#FFFFFF");
    dom.setStrokeColor("#000000");
    dom.setStrokeSize(8);
    dom.addNewOval({left: -120, top: -120, right: 120, bottom: 0});

    // Eyes
    dom.setFillColor("#FFFFFF");
    dom.setStrokeColor("#000000");
    dom.setStrokeSize(6);
    dom.addNewOval({left: -55, top: -65, right: -10, bottom: -5});
    dom.addNewOval({left: 10, top: -65, right: 55, bottom: -5});

    // Pupils looking eagerly UP
    dom.setFillColor("#000000");
    dom.addNewOval({left: -40, top: -60, right: -25, bottom: -35});
    dom.addNewOval({left: 25, top: -60, right: 40, bottom: -35});

    dom.exitEditMode();
    log("Polandball symbol created in library");

    // -----------------------------------------------------------------
    // LAYER 3: 03_Polandball Animation
    // -----------------------------------------------------------------
    var heroIdx = getLayerIndex("03_Polandball");
    tl.setSelectedLayers(heroIdx);
    tl.currentFrame = 0;

    // Place character at (960, 710)
    dom.addItem({x: 960, y: 710}, dom.library.items[dom.library.findItemIndex("Polandball_Char")]);
    log("Placed Polandball on stage");

    // -----------------------------------------------------------------
    // LAYER 4: 04_Dialogue_FX
    // -----------------------------------------------------------------
    var fxIdx = getLayerIndex("04_Dialogue_FX");
    tl.setSelectedLayers(fxIdx);
    tl.currentFrame = 0;

    // Bubble 1 at frame 0
    dom.setFillColor("#FFFFFF");
    dom.setStrokeColor("#000000");
    dom.setStrokeSize(4);
    dom.addNewRectangle({left: 650, top: 460, right: 1130, bottom: 560}, 16);
    var t1 = dom.addNewText({left: 670, top: 480, right: 1110, bottom: 545});
    if (t1) {
      t1.setTextString("POLSKA CAN INTO SPACE! 🚀");
      t1.setTextAttr("size", 26);
      t1.setTextAttr("fillColor", "#D50000");
      t1.setTextAttr("face", "Impact");
    }
    log("Dialogue bubble 1 drawn");

    // -----------------------------------------------------------------
    // TIMELINE EXTENSION & ANIMATION
    // -----------------------------------------------------------------
    // Extend background and launchpad to 80 frames
    tl.setSelectedLayers(bgIdx);
    tl.insertFrames(79, false, 0);

    tl.setSelectedLayers(padIdx);
    tl.insertFrames(79, false, 0);

    // Animate Polandball
    tl.setSelectedLayers(heroIdx);

    // Frame 15: Anticipation squash
    tl.insertKeyframe(14);
    tl.currentFrame = 14;
    if (dom.selection && dom.selection[0]) {
      dom.selection[0].scaleY = 0.55;
      dom.selection[0].scaleX = 1.4;
      dom.selection[0].y = 750;
    }

    // Frame 18: Launch Rocket Stretch!
    tl.insertKeyframe(17);
    tl.currentFrame = 17;
    if (dom.selection && dom.selection[0]) {
      dom.selection[0].scaleY = 1.5;
      dom.selection[0].scaleX = 0.75;
      dom.selection[0].y = 620;
    }

    // Frame 38: In high space! (Apex)
    tl.insertKeyframe(37);
    tl.currentFrame = 37;
    if (dom.selection && dom.selection[0]) {
      dom.selection[0].scaleY = 1.0;
      dom.selection[0].scaleX = 1.0;
      dom.selection[0].y = 180;
    }

    // Frame 48: Floating in space
    tl.insertKeyframe(47);
    tl.currentFrame = 47;
    if (dom.selection && dom.selection[0]) {
      dom.selection[0].y = 170;
    }

    // Frame 54: Plunging down (stretch down)!
    tl.insertKeyframe(53);
    tl.currentFrame = 53;
    if (dom.selection && dom.selection[0]) {
      dom.selection[0].scaleY = 1.6;
      dom.selection[0].scaleX = 0.7;
      dom.selection[0].y = 520;
    }

    // Frame 60: IMPACT SPLAT! (Extreme Squash)
    tl.insertKeyframe(59);
    tl.currentFrame = 59;
    if (dom.selection && dom.selection[0]) {
      dom.selection[0].scaleY = 0.22;
      dom.selection[0].scaleX = 2.1;
      dom.selection[0].y = 790;
    }

    // Frame 80: Still flat, dazed
    tl.insertKeyframe(79);

    // Set classic motion tweens
    tl.layers[heroIdx].frames[0].tweenType = "motion";
    tl.layers[heroIdx].frames[17].tweenType = "motion";
    tl.layers[heroIdx].frames[17].tweenEasing = -60;
    tl.layers[heroIdx].frames[47].tweenType = "motion";
    tl.layers[heroIdx].frames[53].tweenType = "motion";
    tl.layers[heroIdx].frames[53].tweenEasing = 80;
    log("Polandball animation and tweens configured");

    // Dialogue Layer animation
    tl.setSelectedLayers(fxIdx);

    // Hide bubble 1 at frame 18
    tl.insertBlankKeyframe(17);

    // Bubble 2 at frame 38: "...kurwa..." in apex of sky
    tl.insertBlankKeyframe(37);
    tl.currentFrame = 37;
    dom.setFillColor("#FFFFFF");
    dom.setStrokeColor("#000000");
    dom.setStrokeSize(4);
    dom.addNewRectangle({left: 820, top: 60, right: 1100, bottom: 140}, 12);
    var t2 = dom.addNewText({left: 840, top: 75, right: 1080, bottom: 125});
    if (t2) {
      t2.setTextString("...kurwa...");
      t2.setTextAttr("size", 34);
      t2.setTextAttr("fillColor", "#212121");
      t2.setTextAttr("face", "Impact");
    }

    // Hide bubble 2 at frame 48
    tl.insertBlankKeyframe(47);

    // Bubble 3 at frame 60: "💥 SPLAT! 💥 Poland still cannot into space."
    tl.insertBlankKeyframe(59);
    tl.currentFrame = 59;
    dom.setFillColor("#FFF9C4");
    dom.setStrokeColor("#E65100");
    dom.setStrokeSize(5);
    dom.addNewRectangle({left: 680, top: 620, right: 1240, bottom: 740}, 14);
    var t3 = dom.addNewText({left: 700, top: 640, right: 1220, bottom: 720});
    if (t3) {
      t3.setTextString("💥 SPLAT! 💥\\nPoland still cannot into space.");
      t3.setTextAttr("size", 28);
      t3.setTextAttr("fillColor", "#BF360C");
      t3.setTextAttr("face", "Impact");
    }
    tl.insertFrames(20, false, 59);
    log("Dialogue timing configured");

    // -----------------------------------------------------------------
    // SAVE AND EXPORT
    // -----------------------------------------------------------------
    log("Saving .FLA to " + ${JSON.stringify(docUri)});
    fl.saveDocument(dom, ${JSON.stringify(docUri)});

    log("Exporting Frame 0 preview...");
    tl.currentFrame = 0;
    dom.exportPNG(${JSON.stringify(preview01Uri)}, true, false);

    log("Exporting Frame 38 preview...");
    tl.currentFrame = 37;
    dom.exportPNG(${JSON.stringify(preview02Uri)}, true, false);

    log("Exporting Frame 60 preview...");
    tl.currentFrame = 59;
    dom.exportPNG(${JSON.stringify(preview03Uri)}, true, false);

    log("=== CARTOON SUCCESSFULLY COMPLETED ===");
  } catch(err) {
    log("EXCEPTION: " + err + "\\n" + (err.stack || ""));
  }
})();
`;

const scriptFile = path.join(outputDir, 'build_cartoon.jsfl');
fs.writeFileSync(scriptFile, jsfl, 'utf-8');

console.log('Sending Polandball cartoon generation script to Adobe Animate 2024...');
const appName = 'Adobe Animate 2024';
const appleScript = `tell application "${appName}" to open POSIX file "${scriptFile.replace(/"/g, '\\"')}"`;
execSync(`osascript -e '${appleScript}'`, { timeout: 45_000, stdio: 'inherit' });

console.log('Execution finished! Checking output files...');
