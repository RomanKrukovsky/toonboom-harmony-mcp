// Qt Script: Create a new scene under a specific environment and job.
// Run via Controlcenter -runScript sample_create_scene.js -user usabatch

function createNewScene(envName, jobName, sceneName) {
  try {
    var env = ControlCentre.environment(envName);
    if (!env) {
      ControlCentre.printToConsole("Error: Environment '" + envName + "' not found.");
      return;
    }
    var job = ControlCentre.job(env, jobName);
    if (!job) {
      ControlCentre.printToConsole("Error: Job '" + jobName + "' not found.");
      return;
    }
    var success = ControlCentre.addScene(job, sceneName);
    if (success) {
      ControlCentre.printToConsole("Scene '" + sceneName + "' successfully created.");
    } else {
      ControlCentre.printToConsole("Failed to create scene '" + sceneName + "'.");
    }
  } catch (e) {
    ControlCentre.printToConsole("Exception: " + e.toString());
  }
}

createNewScene("TEST_ENV", "TEST_JOB", "TEST_SCENE");
