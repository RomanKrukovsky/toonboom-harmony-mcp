import fs from 'fs';
import path from 'path';

export interface XmlAuditResult {
  passed: boolean;
  issues: string[];
  totalNodesCount: number;
  totalLinksCount: number;
}

export class FastXmlAuditor {
  /**
   * Проводит экспресс-аудит XML-структуры файла .xstage
   * @param filePath Абсолютный путь к файлу .xstage
   */
  static auditXstageFile(filePath: string): XmlAuditResult {
    const issues: string[] = [];
    let totalNodesCount = 0;
    let totalLinksCount = 0;

    if (!fs.existsSync(filePath)) {
      return {
        passed: false,
        issues: [`Файл проекта не найден по пути: "${filePath}"`],
        totalNodesCount: 0,
        totalLinksCount: 0
      };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // 1. Поиск объявлений нод (модулей)
      // Пример: <module type="READ" name="Drawing" ...>
      const moduleRegex = /<module\s+[^>]*type="([^"]+)"\s+name="([^"]+)"/g;
      let moduleMatch;
      const nodes: { name: string; type: string }[] = [];
      
      while ((moduleMatch = moduleRegex.exec(content)) !== null) {
        totalNodesCount++;
        nodes.push({ type: moduleMatch[1], name: moduleMatch[2] });
      }

      // 2. Поиск связей (линков)
      // Пример: <link from="Drawing" to="Composite" ...>
      const linkRegex = /<link\s+[^>]*from="([^"]+)"\s+to="([^"]+)"/g;
      let linkMatch;
      const connectedFrom = new Set<string>();
      const connectedTo = new Set<string>();

      while ((linkMatch = linkRegex.exec(content)) !== null) {
        totalLinksCount++;
        connectedFrom.add(linkMatch[1]);
        connectedTo.add(linkMatch[2]);
      }

      // Проверяем ноды типа COMPOSITE на предмет входящих связей
      // (если у композита 0 входящих портов, это признак битого графа)
      const composites = nodes.filter(n => n.type === 'COMPOSITE');
      for (const comp of composites) {
        const isTarget = Array.from(connectedTo).some(to => to.includes(comp.name));
        if (!isTarget && nodes.length > 2) {
          issues.push(`Композит "${comp.name}" не имеет входящих соединений.`);
        }
      }

      // Проверяем ноды типа READ (слои рисунков) на наличие исходящих связей
      const readers = nodes.filter(n => n.type === 'READ');
      for (const read of readers) {
        const isSource = Array.from(connectedFrom).some(from => from.includes(read.name));
        if (!isSource && nodes.length > 2) {
          issues.push(`Слой рисунка "${read.name}" изолирован и никуда не подключен.`);
        }
      }

      // 3. Аудит правил из уроков риггинга (Separate Mode, Kinematic Output, Drawing Lock)
      const pegs = nodes.filter(n => n.type === 'PEG');
      if (content.includes('separatePosition="false"')) {
        issues.push(`Обнаружены Peg-узлы в режиме 3D Path вместо Separate Mode. Рекомендуется включить Separate Position.`);
      }

      const deformers = nodes.filter(n => n.type && n.type.toLowerCase().includes('deform'));
      const kinematicOutputs = nodes.filter(n => n.type === 'KINEMATIC_OUTPUT');
      if (deformers.length > 0 && kinematicOutputs.length === 0) {
        issues.push(`Обнаружены деформаторы без нод Kinematic Output. Дочерние элементы могут слетать при деформации.`);
      }

      // 4. Сканируем файлы ресурсов (картинки, звуки)
      // Пример: <elementName val="drawing_name"/> или пути в атрибутах
      const elementFolderRegex = /<elementName\s+val="([^"]+)"/g;
      let elementFolderMatch;
      const elementsFound: string[] = [];
      while ((elementFolderMatch = elementFolderRegex.exec(content)) !== null) {
        elementsFound.push(elementFolderMatch[1]);
      }

      // Проверяем существование папок элементов
      const projectDir = path.dirname(filePath);
      for (const elemName of elementsFound) {
        const elemPath = path.join(projectDir, 'elements', elemName);
        if (!fs.existsSync(elemPath)) {
          issues.push(`Ресурсная папка элемента "${elemName}" отсутствует на диске.`);
        }
      }

    } catch (e: any) {
      issues.push(`Ошибка чтения/парсинга XML: ${e.message}`);
    }

    return {
      passed: issues.length === 0,
      issues,
      totalNodesCount,
      totalLinksCount
    };
  }

  /**
   * Генерация Mermaid-диаграммы графа нод из файла .xstage
   * @param filePath Абсолютный путь к файлу .xstage
   */
  static generateMermaidGraph(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      return 'graph TD\n  error["Файл проекта не найден"]';
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 1. Поиск объявлений нод (модулей)
      const moduleRegex = /<module\s+[^>]*type="([^"]+)"\s+name="([^"]+)"/g;
      let moduleMatch;
      const nodes: { id: string; name: string; type: string }[] = [];
      
      while ((moduleMatch = moduleRegex.exec(content)) !== null) {
        const type = moduleMatch[1];
        const name = moduleMatch[2];
        const id = name.replace(/[^a-zA-Z0-9]/g, '_');
        nodes.push({ id, name, type });
      }

      // 2. Поиск связей (линков)
      const linkRegex = /<link\s+[^>]*from="([^"]+)"\s+to="([^"]+)"/g;
      let linkMatch;
      const links: { fromId: string; toId: string }[] = [];

      while ((linkMatch = linkRegex.exec(content)) !== null) {
        const fromId = linkMatch[1].replace(/[^a-zA-Z0-9]/g, '_');
        const toId = linkMatch[2].replace(/[^a-zA-Z0-9]/g, '_');
        links.push({ fromId, toId });
      }

      if (nodes.length === 0) {
        return 'graph TD\n  empty["Граф нод пуст"]';
      }

      let mermaid = 'graph TD\n';
      for (const node of nodes) {
        mermaid += `  ${node.id}["${node.name} (${node.type})"]\n`;
      }
      for (const link of links) {
        mermaid += `  ${link.fromId} --> ${link.toId}\n`;
      }

      return mermaid;
    } catch (e: any) {
      return `graph TD\n  error["Ошибка чтения/парсинга XML: ${e.message}"]`;
    }
  }
}
