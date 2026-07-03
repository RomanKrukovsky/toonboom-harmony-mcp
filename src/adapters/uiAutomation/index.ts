import { HarmonyError } from '../../security.js';

export interface ScreenshotResult {
  status: 'success' | 'error';
  imagePath?: string;
  base64?: string;
  width: number;
  height: number;
  timestamp: string;
}

export interface WindowInfo {
  title: string;
  bounds: { x: number; y: number; width: number; height: number };
  isActive: boolean;
  pid?: number;
}

export interface ActionResult {
  status: 'success' | 'error';
  message: string;
  durationMs: number;
  timestamp: string;
}

export interface WaitResult {
  status: 'success' | 'timeout' | 'error';
  found: boolean;
  location?: { x: number; y: number; width: number; height: number };
  message: string;
}

export interface ElementLocationResult {
  status: 'success' | 'not_found' | 'error';
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface VerificationResult {
  status: 'passed' | 'failed' | 'uncertain';
  details: string;
}

export interface UIAutomationAdapter {
  getScreenshot(): Promise<ScreenshotResult>;
  getActiveWindow(): Promise<WindowInfo>;
  click(x: number, y: number): Promise<ActionResult>;
  doubleClick(x: number, y: number): Promise<ActionResult>;
  rightClick(x: number, y: number): Promise<ActionResult>;
  hotkey(keys: string[]): Promise<ActionResult>;
  typeText(text: string): Promise<ActionResult>;
  wait(ms: number): Promise<ActionResult>;
  waitForImageOrText(query: string, timeoutMs: number): Promise<WaitResult>;
  locateElement(query: string): Promise<ElementLocationResult>;
  verifyState(expectation: string): Promise<VerificationResult>;
}

export class HarmonyUIAutomationAdapter implements UIAutomationAdapter {
  private simulate: boolean;
  private currentSceneOpen = false;
  private importedAssets: string[] = [];
  private currentActiveWindow = 'Harmony Premium (Simulation)';

  constructor() {
    // Симуляция включена, если задана переменная окружения или библиотеки автоматизации отсутствуют
    this.simulate = process.env.HARMONY_UI_SIMULATE !== 'false';
  }

  private checkBackendAvailability() {
    if (!this.simulate) {
      // В реальном продукте здесь проверяется наличие nut.js / robotjs / accessibility API
      // В нашем случае, так как сторонние библиотеки по умолчанию не установлены, мы бросаем ошибку
      throw new HarmonyError(
        'HELPER_UNAVAILABLE',
        'UI_BACKEND_UNAVAILABLE: Реальные библиотеки UI-автоматизации (nut.js/robotjs) не настроены.'
      );
    }
  }

  async getScreenshot(): Promise<ScreenshotResult> {
    this.checkBackendAvailability();
    return {
      status: 'success',
      width: 1920,
      height: 1080,
      base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      timestamp: new Date().toISOString()
    };
  }

  async getActiveWindow(): Promise<WindowInfo> {
    this.checkBackendAvailability();
    return {
      title: this.currentActiveWindow,
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      isActive: true,
      pid: 9999
    };
  }

  async click(x: number, y: number): Promise<ActionResult> {
    this.checkBackendAvailability();
    return {
      status: 'success',
      message: `Клик по координатам (${x}, ${y})`,
      durationMs: 150,
      timestamp: new Date().toISOString()
    };
  }

  async doubleClick(x: number, y: number): Promise<ActionResult> {
    this.checkBackendAvailability();
    return {
      status: 'success',
      message: `Двойной клик по координатам (${x}, ${y})`,
      durationMs: 300,
      timestamp: new Date().toISOString()
    };
  }

  async rightClick(x: number, y: number): Promise<ActionResult> {
    this.checkBackendAvailability();
    return {
      status: 'success',
      message: `Правый клик по координатам (${x}, ${y})`,
      durationMs: 150,
      timestamp: new Date().toISOString()
    };
  }

  async hotkey(keys: string[]): Promise<ActionResult> {
    this.checkBackendAvailability();
    const keysJoined = keys.join('+');
    
    // Симуляция открытия/сохранения сцены по хоткеям
    if (keysJoined.toLowerCase() === 'cmd+s' || keysJoined.toLowerCase() === 'ctrl+s') {
      this.currentActiveWindow = 'Harmony Premium - [Saved]';
    }
    
    return {
      status: 'success',
      message: `Нажато сочетание клавиш: ${keysJoined}`,
      durationMs: 100,
      timestamp: new Date().toISOString()
    };
  }

  async typeText(text: string): Promise<ActionResult> {
    this.checkBackendAvailability();
    
    // Если вводится путь к сцене/ассету, симулируем добавление
    if (text.includes('.xstage')) {
      this.currentSceneOpen = true;
    } else if (text.match(/\.(png|wav|tpl|tpl\.zip)$/i)) {
      this.importedAssets.push(text);
    }

    return {
      status: 'success',
      message: `Введен текст: "${text}"`,
      durationMs: text.length * 20,
      timestamp: new Date().toISOString()
    };
  }

  async wait(ms: number): Promise<ActionResult> {
    this.checkBackendAvailability();
    await new Promise((resolve) => setTimeout(resolve, ms));
    return {
      status: 'success',
      message: `Ожидание завершено: ${ms}мс`,
      durationMs: ms,
      timestamp: new Date().toISOString()
    };
  }

  async waitForImageOrText(query: string, timeoutMs: number): Promise<WaitResult> {
    this.checkBackendAvailability();
    
    // Симулируем успешный поиск
    return {
      status: 'success',
      found: true,
      location: { x: 450, y: 300, width: 100, height: 30 },
      message: `Элемент "${query}" успешно обнаружен в интерфейсе`
    };
  }

  async locateElement(query: string): Promise<ElementLocationResult> {
    this.checkBackendAvailability();
    
    // Простейшая семантическая привязка координат
    let x = 100;
    let y = 100;
    
    if (query.includes('File')) { x = 20; y = 10; }
    else if (query.includes('Import')) { x = 40; y = 120; }
    else if (query.includes('Timeline')) { x = 500; y = 800; }
    else if (query.includes('Node View')) { x = 1200; y = 500; }
    else if (query.includes('Camera View')) { x = 600; y = 400; }
    
    return {
      status: 'success',
      x,
      y,
      width: 80,
      height: 25,
      confidence: 0.95
    };
  }

  async verifyState(expectation: string): Promise<VerificationResult> {
    this.checkBackendAvailability();
    
    if (expectation.includes('scene_open')) {
      return {
        status: this.currentSceneOpen ? 'passed' : 'failed',
        details: this.currentSceneOpen ? 'Сцена открыта' : 'Сцена закрыта'
      };
    }
    
    if (expectation.includes('asset_exists')) {
      const asset = expectation.split(':')[1] || '';
      const exists = this.importedAssets.some(a => a.includes(asset));
      return {
        status: exists ? 'passed' : 'failed',
        details: exists ? `Ассет ${asset} обнаружен` : `Ассет ${asset} отсутствует`
      };
    }

    return {
      status: 'passed',
      details: `Состояние успешно проверено для ожидания: "${expectation}"`
    };
  }

  // Вспомогательные методы для симулятора
  setSimulatedSceneOpen(open: boolean) {
    this.currentSceneOpen = open;
  }

  addSimulatedAsset(asset: string) {
    this.importedAssets.push(asset);
  }

  getSimulatedAssets() {
    return this.importedAssets;
  }

  clearSimulatedState() {
    this.currentSceneOpen = false;
    this.importedAssets = [];
    this.currentActiveWindow = 'Harmony Premium (Simulation)';
  }
}

export const uiAutomation = new HarmonyUIAutomationAdapter();
