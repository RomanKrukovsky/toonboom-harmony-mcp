/**
 * Harmony Action Recorder — Harmony-side event notifier (QtScript).
 *
 * Install: copy this file into your Harmony scripts folder, then run
 * `startHarmonyActionRecorder("<sessionId>", "<absolute spool directory>")` from the
 * Script Editor or bind it to a toolbar button.
 *
 * What it does:
 *   Subscribes to SceneChangeNotifier and appends one JSON object per line to
 *   <spoolDir>/events.jsonl. Nothing else. It does not modify the scene, does not read
 *   drawings, does not capture the screen, the mouse, the keyboard or any other application.
 *
 * What it deliberately does NOT do:
 *   A notifier signal is only a hint that some region of the scene may have changed. This
 *   script therefore records the signal name and the node/column names Harmony reported —
 *   never a guess at which UI command the animator used. Normalized state is read separately
 *   by the MCP server after a debounce interval.
 *
 * API reference: SceneChangeNotifier, Harmony 25 Scripting Interface
 * (Contents/Documentation/script/classSceneChangeNotifier.html of the local installation).
 *
 * This script is static. It never evaluates strings supplied by a user or a model.
 */

var HARMONY_ACTION_RECORDER_VERSION = "harmony-action-recorder/1.0.0";
var HARMONY_ACTION_SCHEMA_VERSION = "1.0.0";

function HarmonyActionRecorderSpool(sessionId, spoolDir) {
  this.sessionId = sessionId;
  this.spoolDir = spoolDir;
  this.sequence = 0;
  this.filePath = spoolDir + "/events.jsonl";
  this.notifier = null;
  this.parent = null;
}

HarmonyActionRecorderSpool.prototype.append = function (signal, targets) {
  var event = {
    schemaVersion: HARMONY_ACTION_SCHEMA_VERSION,
    sessionId: this.sessionId,
    sequence: this.sequence,
    timestamp: new Date().toISOString(),
    signal: signal,
    origin: "harmony_notifier",
    targets: targets || []
  };
  this.sequence = this.sequence + 1;

  var file = new File(this.filePath);
  try {
    // Append-only: an earlier line is never rewritten, so a crash truncates the tail
    // instead of destroying the log.
    file.open(FileAccess.Append);
    file.writeLine(JSON.stringify(event));
  } catch (error) {
    MessageLog.trace("[HarmonyActionRecorder] failed to append event: " + error);
  } finally {
    try {
      file.close();
    } catch (closeError) {
      MessageLog.trace("[HarmonyActionRecorder] failed to close spool: " + closeError);
    }
  }
};

HarmonyActionRecorderSpool.prototype.toStringList = function (list) {
  var out = [];
  if (!list) return out;
  for (var i = 0; i < list.length; i++) {
    out.push(String(list[i]));
  }
  return out;
};

HarmonyActionRecorderSpool.prototype.attach = function (parentObject) {
  if (typeof SceneChangeNotifier === "undefined") {
    MessageLog.trace(
      "[HarmonyActionRecorder] SceneChangeNotifier is not available in this Harmony build; no events will be recorded."
    );
    return false;
  }

  this.parent = parentObject;
  this.notifier = new SceneChangeNotifier(parentObject);
  var self = this;

  this.notifier.sceneChanged.connect(function () {
    self.append("sceneChanged", []);
  });
  this.notifier.networkChanged.connect(function (nodeList) {
    self.append("networkChanged", self.toStringList(nodeList));
  });
  this.notifier.nodeChanged.connect(function (nodeList) {
    self.append("nodeChanged", self.toStringList(nodeList));
  });
  this.notifier.nodeMetadataChanged.connect(function (nodeList) {
    self.append("nodeMetadataChanged", self.toStringList(nodeList));
  });
  this.notifier.columnValuesChanged.connect(function (columnList) {
    self.append("columnValuesChanged", self.toStringList(columnList));
  });
  this.notifier.currentFrameChanged.connect(function () {
    self.append("currentFrameChanged", []);
  });
  this.notifier.selectionChanged.connect(function () {
    self.append("selectionChanged", []);
  });
  this.notifier.controlChanged.connect(function () {
    self.append("controlChanged", []);
  });
  this.notifier.sceneMarkersChanged.connect(function () {
    self.append("sceneMarkersChanged", []);
  });
  this.notifier.deformerReset.connect(function (groupList) {
    self.append("deformerReset", self.toStringList(groupList));
  });
  this.notifier.deformerResetCurrentFrame.connect(function (groupList) {
    self.append("deformerResetCurrentFrame", self.toStringList(groupList));
  });

  MessageLog.trace("[HarmonyActionRecorder] attached, spooling to " + this.filePath);
  return true;
};

HarmonyActionRecorderSpool.prototype.detach = function () {
  if (this.notifier) {
    this.notifier.disconnectAll();
    this.notifier = null;
    MessageLog.trace("[HarmonyActionRecorder] detached");
  }
};

var __harmonyActionRecorderSpool = null;

/**
 * Start recording.
 * @param sessionId  session id issued by harmony.capture.start
 * @param spoolDir   absolute path of that session's evidence directory
 */
function startHarmonyActionRecorder(sessionId, spoolDir) {
  if (!sessionId || !spoolDir) {
    MessageLog.trace("[HarmonyActionRecorder] usage: startHarmonyActionRecorder(sessionId, spoolDir)");
    return false;
  }
  if (__harmonyActionRecorderSpool) {
    MessageLog.trace("[HarmonyActionRecorder] already running; stop it first.");
    return false;
  }

  var directory = new Dir(spoolDir);
  if (!directory.exists) {
    MessageLog.trace("[HarmonyActionRecorder] spool directory does not exist: " + spoolDir);
    return false;
  }

  // The notifier's parent controls its lifetime. `this` at global scope is the script
  // context, which stays alive for the duration of the Harmony session.
  __harmonyActionRecorderSpool = new HarmonyActionRecorderSpool(sessionId, spoolDir);
  var attached = __harmonyActionRecorderSpool.attach(this);
  if (!attached) {
    __harmonyActionRecorderSpool = null;
    return false;
  }
  __harmonyActionRecorderSpool.append("recorder.sessionStarted", []);
  return true;
}

/** Stop recording and disconnect every signal. */
function stopHarmonyActionRecorder() {
  if (!__harmonyActionRecorderSpool) {
    MessageLog.trace("[HarmonyActionRecorder] not running.");
    return false;
  }
  __harmonyActionRecorderSpool.append("recorder.sessionStopped", []);
  __harmonyActionRecorderSpool.detach();
  __harmonyActionRecorderSpool = null;
  return true;
}

exports.startHarmonyActionRecorder = startHarmonyActionRecorder;
exports.stopHarmonyActionRecorder = stopHarmonyActionRecorder;
