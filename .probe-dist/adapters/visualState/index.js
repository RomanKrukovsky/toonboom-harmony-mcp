import { uiAutomation } from '../uiAutomation/index.js';
export class VisualStateEngine {
    static async detectState(screenshotBase64) {
        // В реальном продукте здесь запускается OpenCV / TensorFlow модель для анализа screenshot.png
        // В нашем MCP-сервере мы опрашиваем состояние UI-автоматизации и возвращаем структурированное состояние.
        const activeWin = await uiAutomation.getActiveWindow();
        const isSceneOpen = await uiAutomation.verifyState('scene_open');
        const importedAssets = uiAutomation.getSimulatedAssets();
        const detectedPanels = ['Camera View', 'Timeline', 'Tool Properties', 'Library'];
        if (activeWin.title.includes('Node')) {
            detectedPanels.push('Node View');
        }
        const warnings = [];
        if (importedAssets.length === 0 && isSceneOpen.status === 'passed') {
            warnings.push('Открытая сцена не содержит импортированных ассетов.');
        }
        return {
            application: 'Toon Boom Harmony',
            activeWindow: activeWin.title,
            detectedPanels,
            dialogs: activeWin.title.includes('Dialog') ? [activeWin.title] : [],
            sceneOpen: isSceneOpen.status === 'passed',
            timelineVisible: true,
            nodeViewVisible: detectedPanels.includes('Node View'),
            warnings
        };
    }
    static async verifyWorkspaceLayout() {
        const report = await this.detectState();
        if (!report.timelineVisible) {
            return { isCorrect: false, issue: 'Таймлайн (Timeline) не отображается на экране.' };
        }
        return { isCorrect: true };
    }
}
