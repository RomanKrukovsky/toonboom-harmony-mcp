import { HarmonyError } from '../security.js';

export interface WebccResponse {
  status: 'success' | 'error' | 'unsupported';
  code?: string;
  message?: string;
  data?: any;
}

export class WebccAdapter {
  static isAvailable(): boolean {
    // В будущем тут может быть проверка env переменной HARMONY_WEBCC_URL
    return !!process.env.HARMONY_WEBCC_URL;
  }

  static async performAction(actionName: string, params: any): Promise<WebccResponse> {
    if (!this.isAvailable()) {
      return {
        status: 'unsupported',
        message: `Действие WebCC "${actionName}" не поддерживается в текущей конфигурации.`,
        data: {
          reason: 'WebCC API server URL is not configured. Set HARMONY_WEBCC_URL in .env.',
          workarounds: [
            'Use Control Center Scripting server',
            'Perform action via Control Center desktop app',
            'Connect via WebCC browser portal manually'
          ]
        }
      };
    }

    const base = process.env.HARMONY_WEBCC_URL!;
    const routes: Record<string, { method: string; pathname: (p: any) => string; body?: (p: any) => any }> = {
      list_projects: { method: 'GET', pathname: () => '/api/projects' },
      list_scenes: { method: 'GET', pathname: p => `/api/projects/${encodeURIComponent(p.projectId)}/scenes` },
      render_scene: { method: 'POST', pathname: p => `/api/scenes/${encodeURIComponent(p.sceneId)}/render`, body: p => ({ format: p.format }) },
      get_job_status: { method: 'GET', pathname: p => `/api/jobs/${encodeURIComponent(p.jobId)}` }
    };
    const route = routes[actionName];
    if (!route) return { status: 'error', code: 'WEBCC_UNAVAILABLE', message: `Неизвестное действие WebCC: ${actionName}` };
    try {
      const body = route.body?.(params);
      const response = await fetch(new URL(route.pathname(params), base), {
        method: route.method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return { status: 'error', code: 'WEBCC_UNAVAILABLE', message: `WebCC HTTP ${response.status}`, data };
      return {
        status: 'success',
        message: `Действие "${actionName}" выполнено через WebCC.`,
        data
      };
    } catch (err: any) {
      return { status: 'error', code: 'WEBCC_UNAVAILABLE', message: `Сбой соединения с WebCC: ${err.message}` };
    }
  }
}
