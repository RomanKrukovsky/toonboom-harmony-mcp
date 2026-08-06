/**
 * bridgeSpool.test.ts — тесты TS-стороны моста против поддельного хоста.
 *
 * Поддельный мост здесь на TypeScript и намеренно НЕ переиспользует
 * питоновский fake_bridge.py: цель проверить, что ДВЕ независимые
 * реализации протокола совпадают. Если бы обе стороны читали один
 * помощник, тест доказывал бы только его самосогласованность.
 *
 * Границы честные: семантику вызовов Harmony это не проверяет — для неё
 * нужна лицензия. Проверяется протокол и поведение при авариях.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  BridgeError,
  BridgeSpool,
  BridgeTimeout,
  MUTATING_OPS,
  PROTOCOL_V,
} from '../src/adapters/bridgeSpool.js';

/** Поддельный мост: обрабатывает заявки из спула, как QTimer в bridge.js. */
class FakeBridge {
  private timer: NodeJS.Timeout | null = null;
  served = 0;
  rejected = 0;
  armed: boolean;
  hangOps: Set<string>;
  dieAfterClaim: Set<string>;
  latencyMs: number;

  constructor(
    private spool: string,
    opts: { armed?: boolean; hangOps?: string[]; dieAfterClaim?: string[]; latencyMs?: number } = {},
  ) {
    this.armed = opts.armed ?? false;
    this.hangOps = new Set(opts.hangOps ?? []);
    this.dieAfterClaim = new Set(opts.dieAfterClaim ?? []);
    this.latencyMs = opts.latencyMs ?? 0;
  }

  start() {
    this.timer = setInterval(() => this.tick(), 5);
    return this;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick() {
    let names: string[];
    try {
      names = fs.readdirSync(this.spool).filter((f) => f.startsWith('req-'));
    } catch {
      return;
    }
    for (const name of names.sort()) {
      const rid = name.slice('req-'.length, -'.json'.length);
      const work = path.join(this.spool, `work-${rid}.json`);
      try {
        fs.renameSync(path.join(this.spool, name), work); // клейм
      } catch {
        continue;
      }
      let env: any;
      try {
        env = JSON.parse(fs.readFileSync(work, 'utf8'));
      } catch {
        fs.rmSync(work, { force: true });
        continue;
      }
      const op = env.op as string;
      if (this.dieAfterClaim.has(op) || this.hangOps.has(op)) return; // work остаётся
      const out = this.dispatch(env);
      const write = () => {
        const res = path.join(this.spool, `res-${rid}.json`);
        fs.writeFileSync(`${res}.part`, JSON.stringify(out), 'utf8');
        fs.renameSync(`${res}.part`, res);
        fs.rmSync(work, { force: true });
      };
      if (this.latencyMs) setTimeout(write, this.latencyMs);
      else write();
    }
  }

  private err(code: string, message: string) {
    this.rejected++;
    return { v: PROTOCOL_V, ok: false, error: { code, message }, log: [], harmony: {} };
  }

  private dispatch(env: any) {
    if (env.v !== PROTOCOL_V) return this.err('BAD_PROTOCOL', `got v=${env.v}`);
    const tokFile = path.join(this.spool, '.token');
    const expected = fs.existsSync(tokFile) ? fs.readFileSync(tokFile, 'utf8').trim() : null;
    if (!env.token || env.token !== expected) return this.err('NO_TOKEN', 'bad token');
    if (!this.armed && MUTATING_OPS.has(env.op)) {
      return this.err('DISARMED', `${env.op} refused while disarmed`);
    }
    let result: any;
    switch (env.op) {
      case 'ping': result = { pong: true, armed: this.armed }; break;
      case 'status':
        result = { armed: this.armed, busy: false, served: this.served, failed: this.rejected };
        break;
      case 'capabilities':
        result = { version: '25.0.0 (fake)', protocol: PROTOCOL_V,
                   probes: { 'column.setEntry': true, exportOGL: false } };
        break;
      case 'arm': this.armed = !!env.args.armed; result = { armed: this.armed }; break;
      case 'xsheet_set': result = { column: env.args.column, applied: env.args.edits.length }; break;
      case 'curve_set': result = { column: env.args.column, keys_written: env.args.keys.length }; break;
      case 'render_frame': {
        const p = path.join(this.spool, 'img', `fake_${String(env.args.frame).padStart(4, '0')}.png`);
        fs.writeFileSync(p, Buffer.from('\x89PNG\r\n\x1a\nfake'));
        result = { path: p, frame: env.args.frame };
        break;
      }
      case 'xsheet_get':
        return this.err('NO_COLUMN', `no column ${env.args.column}`);
      default:
        return this.err('UNKNOWN_OP', `no such op ${env.op}`);
    }
    this.served++;
    return { v: PROTOCOL_V, ok: true, result, log: [`[fake] ${env.op}`],
             harmony: { version: '25.0.0 (fake)' } };
  }
}

interface FakeOpts {
  armed?: boolean;
  hangOps?: string[];
  dieAfterClaim?: string[];
  latencyMs?: number;
}

function makePair(opts: FakeOpts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge-test-'));
  const client = new BridgeSpool({ spool: dir, pollMs: 5 });
  const fake = new FakeBridge(dir, opts);
  return { dir, client, fake };
}

describe('bridge protocol (TS side)', () => {
  it('ping round-trips', async () => {
    const { client, fake } = makePair();
    fake.start();
    try {
      const r = await client.ping();
      assert.equal(r.result.pong, true);
    } finally { fake.stop(); }
  });

  it('capabilities returns probes, not a version guess', async () => {
    const { client, fake } = makePair();
    fake.start();
    try {
      const caps = await client.capabilities();
      assert.equal(caps.result.probes['column.setEntry'], true);
      assert.equal(caps.result.probes.exportOGL, false);
    } finally { fake.stop(); }
  });

  it('token file is created 0600', async () => {
    const { dir } = makePair();
    const st = fs.statSync(path.join(dir, '.token'));
    assert.equal((st.mode & 0o777).toString(8), '600');
  });

  it('rejects a foreign token', async () => {
    const { dir, client, fake } = makePair();
    fs.writeFileSync(path.join(dir, '.token'), 'someone-elses');
    fake.start();
    try {
      await assert.rejects(() => client.ping(), (e: any) => e.code === 'NO_TOKEN');
    } finally { fake.stop(); }
  });

  it('disarmed bridge refuses mutation but serves ping', async () => {
    const { client, fake } = makePair({ armed: false });
    fake.start();
    try {
      assert.equal((await client.ping()).result.armed, false);
      await assert.rejects(
        () => client.call('xsheet_set', { column: 'c', edits: [] }, 3),
        (e: any) => e.code === 'DISARMED',
      );
    } finally { fake.stop(); }
  });

  it('armed bridge allows mutation', async () => {
    const { client, fake } = makePair({ armed: true });
    fake.start();
    try {
      const r = await client.call('xsheet_set', { column: 'Top/head', edits: [{ frame: 1, value: 'a' }] }, 3);
      assert.equal(r.result.applied, 1);
    } finally { fake.stop(); }
  });

  it('propagates the error code, not just a message', async () => {
    const { client, fake } = makePair({ armed: true });
    fake.start();
    try {
      await assert.rejects(
        () => client.call('xsheet_get', { column: 'Missing' }, 3),
        (e: any) => e instanceof BridgeError && e.code === 'NO_COLUMN',
      );
    } finally { fake.stop(); }
  });

  it('times out close to the requested deadline, not 13x later', async () => {
    // Регрессия дефекта #1: надбавка была константой +5с, и дедлайн 0.4с
    // превращался в 5.4с ожидания. Для человека это «повисло».
    const { client, fake } = makePair({ hangOps: ['status'] });
    fake.start();
    const t0 = Date.now();
    try {
      await assert.rejects(() => client.call('status', {}, 0.4), (e: any) => e instanceof BridgeTimeout);
      const waited = (Date.now() - t0) / 1000;
      assert.ok(waited < 1.2, `waited ${waited.toFixed(2)}s for a 0.4s deadline`);
    } finally { fake.stop(); }
  });

  it('timeout removes req but KEEPS work as evidence', async () => {
    // Регрессия дефекта #2: work-файл — единственный след «мост забрал
    // работу и не ответил». Без него зависание Harmony неотличимо от
    // выдуманного клиентом таймаута.
    const { dir, client, fake } = makePair({ dieAfterClaim: ['status'] });
    fake.start();
    try {
      await assert.rejects(() => client.call('status', {}, 0.3));
      assert.equal(fs.readdirSync(dir).filter((f) => f.startsWith('req-')).length, 0);
      assert.ok(fs.readdirSync(dir).some((f) => f.startsWith('work-')), 'work evidence was destroyed');
    } finally { fake.stop(); }
  });

  it('timeout message distinguishes hung Harmony from missing bridge', async () => {
    const { client, fake } = makePair({ dieAfterClaim: ['status'] });
    fake.start();
    try {
      await client.call('status', {}, 0.3).catch((e: BridgeTimeout) => {
        assert.match(e.message, /hung|modal/i);
        assert.ok(e.orphaned.length > 0);
      });
    } finally { fake.stop(); }

    const solo = makePair(); // мост не запущен вовсе
    await solo.client.call('status', {}, 0.3).catch((e: BridgeTimeout) => {
      assert.match(e.message, /never picked|not be installed/i);
      assert.equal(e.orphaned.length, 0);
    });
  });

  it('probe reports down when the bridge is absent', async () => {
    const { client } = makePair();
    const p = await client.probe(0.3);
    assert.equal(p.up, false);
  });

  it('concurrent calls never cross answers', async () => {
    const { client, fake } = makePair({ latencyMs: 5 });
    fake.start();
    try {
      const got = await Promise.all(
        [1, 2, 3, 4, 5, 6, 7, 8].map((i) =>
          client.call('render_frame', { frame: i }, 5).then((r) => r.result.frame)),
      );
      assert.equal(got.join(','), '1,2,3,4,5,6,7,8');
    } finally { fake.stop(); }
  });

  it('leaves the spool clean after success', async () => {
    const { dir, client, fake } = makePair();
    fake.start();
    try {
      for (let i = 0; i < 5; i++) await client.ping();
      const junk = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
      // Сравнение по длине, а не deepEqual: node:assert внутри jest
      // сравнивает и прототипы, а массив из fs.readdirSync приходит из
      // другого realm — «[] !== []» без видимой разницы. Курьёз стоил
      // отладки, поэтому зафиксирован комментарием.
      assert.equal(junk.length, 0, `spool not clean: ${junk.join(', ')}`);
    } finally { fake.stop(); }
  });

  it('rejects a non-positive deadline instead of hanging forever', async () => {
    const { client } = makePair();
    await assert.rejects(() => client.call('ping', {}, 0));
  });
});
