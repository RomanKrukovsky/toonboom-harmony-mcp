/**
 * Вспомогательная функция для экранирования строковых параметров для генерации скриптов Qt Script
 */
export function escapeString(str) {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}
export class QtScriptBuilder {
    /**
     * Оборачивает блок скрипта в конструкцию try-catch для возврата ответа в формате JSON
     */
    static wrapScript(body) {
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
    static buildListUsers() {
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
    static buildCreateUser(name, role, password) {
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
    static buildListEnvironments() {
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
    static buildCreateEnvironment(name, path, server, user) {
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
    static buildListJobs(envName) {
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
    static buildCreateJob(envName, jobName) {
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
    static buildListScenes(envName, jobName) {
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
    static buildCreateScene(envName, jobName, sceneName) {
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
    static buildRenameScene(envName, jobName, oldName, newName) {
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
    static buildListVersions(envName, jobName, sceneName) {
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
    static buildListLockedScenes() {
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
    static buildImportScenePackage(envName, jobName, packagePath) {
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
    static buildExportScenePackage(envName, jobName, sceneName, versionNum, packagePath) {
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
    static buildCreateDeformerChain(targetNodePath, deformerType, chainName) {
        const escTarget = escapeString(targetNodePath);
        const escName = escapeString(chainName);
        return this.wrapScript(`
      var targetNode = node.subNode("${escTarget}");
      if (!targetNode) throw new Error("Целевой узел не найден: " + "${escTarget}");
      var parentGroup = node.parentNode("${escTarget}");
      var defGroup = node.add(parentGroup, "${escName}_DeformerGroup", "Group", 0, 0, 0);
      var bone1 = node.add(defGroup, "${escName}_Bone1", "BONE_MODULE", 0, 0, 0);
      var bone2 = node.add(defGroup, "${escName}_Bone2", "BONE_MODULE", 0, 50, 0);
      var kinOutput = node.add(defGroup, "${escName}_Kinematic", "KinematicOutput", 0, 100, 0);
      node.link(bone1, 0, bone2, 0);
      node.link(bone2, 0, kinOutput, 0);
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: "success",
        deformerGroup: defGroup,
        message: "Цепочка деформеров успешно создана"
      }));
    `);
    }
    static buildMasterControllerScript(characterName, controllerType, specJson) {
        const escChar = escapeString(characterName);
        const escSpec = escapeString(specJson);
        return this.wrapScript(`
      var mcNode = node.add("Top", "${escChar}_MasterController", "MasterController", 0, 0, 0);
      node.setTextAttr(mcNode, "SPECIFICATION", 1, "${escSpec}");
      ControlCentre.printToConsole("[RESULT]" + JSON.stringify({
        status: "success",
        masterControllerNode: mcNode,
        message: "Master Controller создан для " + "${escChar}"
      }));
    `);
    }
}
export class QtScriptTransaction {
    statements = [];
    addStatement(jsCode) {
        let code = jsCode;
        code = code.replace(/function executeScript\(\) \{/g, '');
        code = code.replace(/executeScript\(\);/g, '');
        code = code.replace(/var log = ControlCentre\.messageLog\(\);[\s\S]*ControlCentre\.printToConsole\("\[LOG\]" \+ log\);/g, '');
        this.statements.push(code);
    }
    compile() {
        return [
            'function executeTransaction() {',
            '  try {',
            this.statements.map((s, idx) => `
    // Statement ${idx}
    (function(){
      ${s}
    })();
      `).join('\n'),
            '  } catch(e) {',
            '    ControlCentre.printToConsole("[RESULT]" + JSON.stringify({ status: "error", message: e.toString() }));',
            '  }',
            '}',
            'executeTransaction();',
            'var log = ControlCentre.messageLog();',
            'if (log) {',
            '  ControlCentre.printToConsole("[LOG]" + log);',
            '}'
        ].join('\n');
    }
}
