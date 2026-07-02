/**
 * Вспомогательная функция для экранирования строковых параметров для генерации скриптов Qt Script
 */
export function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

export class QtScriptBuilder {
  /**
   * Оборачивает блок скрипта в конструкцию try-catch для возврата ответа в формате JSON
   */
  private static wrapScript(body: string): string {
    return `
function executeScript() {
  try {
    ${body}
  } catch (e) {
    ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
      status: "error",
      message: e.toString()
    }));
  }
}
executeScript();
var log = ControlCentre.messageLog();
if (log) {
  ControlCentre.printToConsole("[LOG]" + log);
}
`;
  }

  static buildListUsers(): string {
    return this.wrapScript(`
      var userList = ControlCentre.users();
      var users = [];
      for (var i = 0; i < userList.length; i++) {
        users.push({
          name: userList[i].name,
          role: userList[i].role
        });
      }
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: "success",
        data: users
      }));
    `);
  }

  static buildCreateUser(name: string, role: string, password?: string): string {
    const escName = escapeString(name);
    const escRole = escapeString(role);
    const escPass = password ? escapeString(password) : '';
    return this.wrapScript(`
      var success = ControlCentre.addUser("${escName}", "${escRole}", "${escPass}");
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: success ? "success" : "error",
        message: success ? "Пользователь успешно создан" : "Не удалось создать пользователя"
      }));
    `);
  }

  static buildListEnvironments(): string {
    return this.wrapScript(`
      var envList = ControlCentre.environments();
      var envs = [];
      for (var i = 0; i < envList.length; i++) {
        envs.push({
          name: envList[i].name,
          path: envList[i].path,
          server: envList[i].server,
          user: envList[i].user
        });
      }
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: "success",
        data: envs
      }));
    `);
  }

  static buildCreateEnvironment(name: string, path: string, server: string, user: string): string {
    const escName = escapeString(name);
    const escPath = escapeString(path);
    const escServer = escapeString(server);
    const escUser = escapeString(user);
    return this.wrapScript(`
      var success = ControlCentre.addEnvironment("${escName}", "${escPath}", "${escServer}", "${escUser}");
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: success ? "success" : "error",
        message: success ? "Окружение успешно создано" : "Не удалось создать окружение"
      }));
    `);
  }

  static buildListJobs(envName: string): string {
    const escEnvName = escapeString(envName);
    return this.wrapScript(`
      var env = ControlCentre.environment("${escEnvName}");
      if (!env) {
        throw new Error("Окружение не найдено: " + "${escEnvName}");
      }
      var jobList = ControlCentre.jobs(env);
      var jobs = [];
      for (var i = 0; i < jobList.length; i++) {
        jobs.push({
          name: jobList[i].name,
          path: jobList[i].path
        });
      }
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: "success",
        data: jobs
      }));
    `);
  }

  static buildCreateJob(envName: string, jobName: string): string {
    const escEnvName = escapeString(envName);
    const escJobName = escapeString(jobName);
    return this.wrapScript(`
      var env = ControlCentre.environment("${escEnvName}");
      if (!env) {
        throw new Error("Окружение не найдено: " + "${escEnvName}");
      }
      var success = ControlCentre.addJob(env, "${escJobName}");
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: success ? "success" : "error",
        message: success ? "Проект успешно создан" : "Не удалось создать проект"
      }));
    `);
  }

  static buildListScenes(envName: string, jobName: string): string {
    const escEnvName = escapeString(envName);
    const escJobName = escapeString(jobName);
    return this.wrapScript(`
      var env = ControlCentre.environment("${escEnvName}");
      if (!env) {
        throw new Error("Окружение не найдено: " + "${escEnvName}");
      }
      var job = ControlCentre.job(env, "${escJobName}");
      if (!job) {
        throw new Error("Проект не найден: " + "${escJobName}" + " в окружении " + "${escEnvName}");
      }
      var sceneList = ControlCentre.scenes(job);
      var scenes = [];
      for (var i = 0; i < sceneList.length; i++) {
        scenes.push({
          name: sceneList[i].name,
          path: sceneList[i].path
        });
      }
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: "success",
        data: scenes
      }));
    `);
  }

  static buildCreateScene(envName: string, jobName: string, sceneName: string): string {
    const escEnvName = escapeString(envName);
    const escJobName = escapeString(jobName);
    const escSceneName = escapeString(sceneName);
    return this.wrapScript(`
      var env = ControlCentre.environment("${escEnvName}");
      if (!env) {
        throw new Error("Окружение не найдено: " + "${escEnvName}");
      }
      var job = ControlCentre.job(env, "${escJobName}");
      if (!job) {
        throw new Error("Проект не найден: " + "${escJobName}");
      }
      var success = ControlCentre.addScene(job, "${escSceneName}");
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: success ? "success" : "error",
        message: success ? "Сцена успешно создана" : "Не удалось создать сцену"
      }));
    `);
  }

  static buildRenameScene(envName: string, jobName: string, oldName: string, newName: string): string {
    const escEnv = escapeString(envName);
    const escJob = escapeString(jobName);
    const escOld = escapeString(oldName);
    const escNew = escapeString(newName);
    return this.wrapScript(`
      var env = ControlCentre.environment("${escEnv}");
      if (!env) throw new Error("Окружение не найдено");
      var job = ControlCentre.job(env, "${escJob}");
      if (!job) throw new Error("Проект не найден");
      var scene = ControlCentre.scene(job, "${escOld}");
      if (!scene) throw new Error("Сцена не найдена");
      var success = ControlCentre.renameScene(job, "${escOld}", "${escNew}");
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: success ? "success" : "error",
        message: success ? "Сцена успешно переименована" : "Не удалось переименовать сцену"
      }));
    `);
  }

  static buildListVersions(envName: string, jobName: string, sceneName: string): string {
    const escEnv = escapeString(envName);
    const escJob = escapeString(jobName);
    const escScene = escapeString(sceneName);
    return this.wrapScript(`
      var env = ControlCentre.environment("${escEnv}");
      if (!env) throw new Error("Окружение не найдено");
      var job = ControlCentre.job(env, "${escJob}");
      if (!job) throw new Error("Проект не найден");
      var scene = ControlCentre.scene(job, "${escScene}");
      if (!scene) throw new Error("Сцена не найдена");
      var versionList = ControlCentre.versions(scene);
      var versions = [];
      for (var i = 0; i < versionList.length; i++) {
        versions.push({
          number: versionList[i].number,
          comment: versionList[i].comment,
          user: versionList[i].user
        });
      }
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: "success",
        data: versions
      }));
    `);
  }

  static buildListLockedScenes(): string {
    return this.wrapScript(`
      var lockedList = ControlCentre.lockedScenes();
      var locks = [];
      for (var i = 0; i < lockedList.length; i++) {
        locks.push({
          sceneName: lockedList[i].sceneName,
          jobName: lockedList[i].jobName,
          envName: lockedList[i].envName,
          userName: lockedList[i].userName,
          lockType: lockedList[i].lockType
        });
      }
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: "success",
        data: locks
      }));
    `);
  }

  static buildImportScenePackage(envName: string, jobName: string, packagePath: string): string {
    const escEnv = escapeString(envName);
    const escJob = escapeString(jobName);
    const escPath = escapeString(packagePath);
    return this.wrapScript(`
      var env = ControlCentre.environment("${escEnv}");
      if (!env) throw new Error("Окружение не найдено");
      var job = ControlCentre.job(env, "${escJob}");
      if (!job) throw new Error("Проект не найден");
      var success = ControlCentre.importScene(job, "${escPath}");
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: success ? "success" : "error",
        message: success ? "Сцена успешно импортирована" : "Не удалось импортировать пакет сцены"
      }));
    `);
  }

  static buildExportScenePackage(envName: string, jobName: string, sceneName: string, versionNum: number, packagePath: string): string {
    const escEnv = escapeString(envName);
    const escJob = escapeString(jobName);
    const escScene = escapeString(sceneName);
    const escPath = escapeString(packagePath);
    return this.wrapScript(`
      var env = ControlCentre.environment("${escEnv}");
      if (!env) throw new Error("Окружение не найдено");
      var job = ControlCentre.job(env, "${escJob}");
      if (!job) throw new Error("Проект не найден");
      var success = ControlCentre.exportScene(job, "${escScene}", ${versionNum}, "${escPath}");
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: success ? "success" : "error",
        message: success ? "Сцена успешно экспортирована" : "Не удалось экспортировать пакет сцены"
      }));
    `);
  }
}
