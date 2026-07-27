import { HarmonyPython } from '../src/adapters/harmonyPython.js';

async function invokeBridge(): Promise<void> {
  try {
    await HarmonyPython.runCommand('detect');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
}

describe('HarmonyPython daemon lifecycle', () => {
  afterEach(async () => {
    await HarmonyPython.shutdownDaemon();
  });

  it('waits for the persistent bridge process to close and can start it again', async () => {
    await invokeBridge();

    await expect(HarmonyPython.shutdownDaemon()).resolves.toBeUndefined();

    await invokeBridge();
  });
});
