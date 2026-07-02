// Qt Script: Lists all environments inside Harmony Server.
// Run via Controlcenter -runScript sample_list_envs.js -user usabatch

function listAllEnvironments() {
  try {
    var envList = ControlCentre.environments();
    ControlCentre.printToConsole("Environments count: " + envList.length);
    for (var i = 0; i < envList.length; i++) {
      var env = envList[i];
      ControlCentre.printToConsole(" - " + env.name + " (Path: " + env.path + ")");
    }
  } catch (e) {
    ControlCentre.printToConsole("Error listing environments: " + e.toString());
  }
}

listAllEnvironments();
