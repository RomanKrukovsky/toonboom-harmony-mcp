import { mlTools } from '../src/tools/mlTools.js';
import { MLClient } from '../src/clients/mlClient.js';
import { HarmonyError } from '../src/security.js';

describe('ML Perception Stack integration', () => {
  test('mlTools list contains all requested perception tools', () => {
    const names = mlTools.map(t => t.name);
    expect(names).toContain('harmony.ml.get_system_profile');
    expect(names).toContain('harmony.ml.list_models');
    expect(names).toContain('harmony.ml.install_models');
    expect(names).toContain('harmony.ml.verify_models');
    expect(names).toContain('harmony.ml.list_datasets');
    expect(names).toContain('harmony.ml.segment_video');
    expect(names).toContain('harmony.ml.estimate_pose');
    expect(names).toContain('harmony.ml.track_points');
    expect(names).toContain('harmony.ml.transcribe_audio');
    expect(names).toContain('harmony.ml.perceive_video');
    expect(names).toContain('harmony.ml.get_job');
    expect(names).toContain('harmony.ml.cancel_job');
  });

  test('MLClient handles unavailable core error', async () => {
    const client = new MLClient('http://127.0.0.1:9999', 100);
    await expect(client.getSystemProfile()).rejects.toThrow('ML core perception stack недоступен по адресу');
  });
});
