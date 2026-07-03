export interface HotkeyMapping {
  keys: string[];
  description: string;
}

export class HotkeysAdapter {
  private static mappings: Record<string, Record<string, HotkeyMapping>> = {
    darwin: {
      save: { keys: ['cmd', 's'], description: 'Сохранить сцену' },
      open: { keys: ['cmd', 'o'], description: 'Открыть сцену' },
      undo: { keys: ['cmd', 'z'], description: 'Отмена действия' },
      redo: { keys: ['cmd', 'shift', 'z'], description: 'Повторить действие' },
      import_images: { keys: ['cmd', 'shift', 'y'], description: 'Импортировать изображения' },
      render: { keys: ['cmd', 'shift', 'r'], description: 'Рендеринг' },
      toggle_node_view: { keys: ['cmd', 'shift', 'n'], description: 'Показать/скрыть Node View' },
      reset_workspace: { keys: ['ctrl', 'alt', 'r'], description: 'Сбросить рабочее пространство' }
    },
    win32: {
      save: { keys: ['ctrl', 's'], description: 'Сохранить сцену' },
      open: { keys: ['ctrl', 'o'], description: 'Открыть сцену' },
      undo: { keys: ['ctrl', 'z'], description: 'Отмена действия' },
      redo: { keys: ['ctrl', 'shift', 'z'], description: 'Повторить действие' },
      import_images: { keys: ['ctrl', 'shift', 'y'], description: 'Импортировать изображения' },
      render: { keys: ['ctrl', 'shift', 'r'], description: 'Рендеринг' },
      toggle_node_view: { keys: ['ctrl', 'shift', 'n'], description: 'Показать/скрыть Node View' },
      reset_workspace: { keys: ['ctrl', 'alt', 'r'], description: 'Сбросить рабочее пространство' }
    },
    linux: {
      save: { keys: ['ctrl', 's'], description: 'Сохранить сцену' },
      open: { keys: ['ctrl', 'o'], description: 'Открыть сцену' },
      undo: { keys: ['ctrl', 'z'], description: 'Отмена действия' },
      redo: { keys: ['ctrl', 'shift', 'z'], description: 'Повторить действие' },
      import_images: { keys: ['ctrl', 'shift', 'y'], description: 'Импортировать изображения' },
      render: { keys: ['ctrl', 'shift', 'r'], description: 'Рендеринг' },
      toggle_node_view: { keys: ['ctrl', 'shift', 'n'], description: 'Показать/скрыть Node View' },
      reset_workspace: { keys: ['ctrl', 'alt', 'r'], description: 'Сбросить рабочее пространство' }
    }
  };

  static getHotkey(action: string, platformOverride?: string): string[] {
    const platform = platformOverride || process.platform;
    const platformMap = this.mappings[platform] || this.mappings.win32;
    const actionMapping = platformMap[action];

    if (!actionMapping) {
      throw new Error(`Хоткей для действия "${action}" не определен.`);
    }

    return actionMapping.keys;
  }

  static getHotkeyDescription(action: string, platformOverride?: string): string {
    const platform = platformOverride || process.platform;
    const platformMap = this.mappings[platform] || this.mappings.win32;
    const actionMapping = platformMap[action];

    return actionMapping ? actionMapping.description : '';
  }

  static listAll(platformOverride?: string): Record<string, { keys: string[]; description: string }> {
    const platform = platformOverride || process.platform;
    return this.mappings[platform] || this.mappings.win32;
  }
}
