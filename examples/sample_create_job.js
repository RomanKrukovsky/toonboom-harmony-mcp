// Qt Script: Create a new job in a specific environment.
// Run via Controlcenter -runScript sample_create_job.js -user usabatch

function createNewJob(envName, jobName) {
  try {
    var env = ControlCentre.environment(envName);
    if (!env) {
      ControlCentre.printToConsole("Error: Environment '" + envName + "' not found.");
      return;
    }
    var success = ControlCentre.addJob(env, jobName);
    if (success) {
      ControlCentre.printToConsole("Job '" + jobName + "' successfully created under environment '" + envName + "'.");
    } else {
      ControlCentre.printToConsole("Failed to create job '" + jobName + "'.");
    }
  } catch (e) {
    ControlCentre.printToConsole("Exception: " + e.toString());
  }
}

createNewJob("TEST_ENV", "TEST_JOB");
