import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

/**
 * B5 — mocap → gesture library builder (python) smoke test.
 * Synthetic 12-frame elbow bend 0 → -90 → 0 must produce a motion_capture
 * gesture whose middle-area rotation is a negative peak.
 */

const ROOT = process.cwd();
const TMP = path.join(ROOT, 'output', '__mocap_test');

function have(bin: string): boolean {
  try {
    execFileSync('which', [bin], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const python = have('python3');
const script = path.join(ROOT, 'scripts', 'ml', 'build_gestures_from_mocap.py');

(python && fs.existsSync(script) ? describe : describe.skip)('mocap → gesture builder', () => {
  beforeEach(() => {
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });
  });
  afterAll(() => fs.rmSync(TMP, { recursive: true, force: true }));

  it('builds a motion_capture gesture from a synthetic elbow bend', () => {
    const rows: string[] = [];
    for (let f = 0; f < 12; f += 1) {
      const t = f / 11;
      const swing = Math.sin(t * Math.PI) * 40; // px offset of the wrist
      const points = [
        { name: 'shoulder_left', x: 200, y: 100, confidence: 0.9 },
        { name: 'elbow_left', x: 200, y: 180, confidence: 0.9 },
        { name: 'wrist_left', x: 200 + swing, y: 260, confidence: 0.9 }
      ];
      rows.push(JSON.stringify({ frame: f, points }));
    }
    const kp = path.join(TMP, 'kp.jsonl');
    fs.writeFileSync(kp, rows.join('\n'));
    const out = path.join(TMP, 'gesture.json');

    execFileSync('python3', [
      script, '--keypoints', kp, '--output', out,
      '--gesture-id', 'mocap_elbow_bend',
      '--joint-pairs', 'elbow_left:shoulder_left,wrist_left',
      '--controller-map', 'elbow_left:ARM_POINT'
    ], { stdio: 'pipe' });

    const lib = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(lib.characterId).toBeTruthy();
    expect(lib.gestures.length).toBe(1);
    const g = lib.gestures[0];
    expect(g.gestureId).toBe('mocap_elbow_bend');
    expect(g.provenance).toBe('motion_capture');
    const rotations = g.tracks[0].keys.map((k: any) => k.rotation);
    const peak = Math.min(...rotations);
    expect(peak).toBeLessThan(-20); // clear negative bend peak
  });

  it('exits 2 with a reason when joints are missing from most frames', () => {
    const rows: string[] = [];
    for (let f = 0; f < 12; f += 1) {
      rows.push(JSON.stringify({ frame: f, points: [{ name: 'head_top', x: 1, y: 2, confidence: 0.9 }] }));
    }
    const kp = path.join(TMP, 'bad.jsonl');
    fs.writeFileSync(kp, rows.join('\n'));
    let failed = false;
    try {
      execFileSync('python3', [
        script, '--keypoints', kp, '--output', path.join(TMP, 'x.json'),
        '--gesture-id', 'g', '--joint-pairs', 'elbow_left:shoulder_left,wrist_left'
      ], { stdio: 'pipe' });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });
});
