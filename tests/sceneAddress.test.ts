import assert from 'node:assert/strict';

import {
  AddressError,
  cliArgs,
  decideWritable,
  formatAddress,
  parseAddress,
  requireUnambiguousForWrite,
  writeProbePlan,
} from '../src/adapters/sceneAddress.js';

describe('scene addressing (studio database mode)', () => {
  it('parses a standalone .xstage path', () => {
    const a = parseAddress('/Volumes/work/shot010/shot010.xstage');
    assert.equal(a.mode, 'standalone');
    if (a.mode === 'standalone') assert.match(a.path, /shot010\.xstage$/);
  });

  it('rejects a path that is not a scene', () => {
    // Иначе «открыл проект» тихо не сделает ничего.
    assert.throws(() => parseAddress('/Volumes/work/shot010'),
      (e: any) => e instanceof AddressError && e.code === 'NOT_A_SCENE');
  });

  it('parses a full database address', () => {
    const a = parseAddress('db://PROD_2026/EP07/sc042@v3#ivan');
    assert.equal(a.mode, 'database');
    if (a.mode === 'database') {
      assert.equal(a.environment, 'PROD_2026');
      assert.equal(a.job, 'EP07');
      assert.equal(a.scene, 'sc042');
      assert.equal(a.version, 'v3');
      assert.equal(a.user, 'ivan');
    }
  });

  it('treats a missing version as UNKNOWN, not as latest', () => {
    // Разница принципиальная: «последняя» — это догадка, которая в студии
    // отправляет правку в чужую сданную работу.
    const a = parseAddress('db://PROD/EP01/sc001');
    if (a.mode === 'database') {
      assert.equal(a.version, null);
      assert.equal(a.user, null);
    }
  });

  it('round-trips through format', () => {
    for (const s of [
      '/x/y/scene.xstage',
      'db://E/J/S',
      'db://E/J/S@v2',
      'db://E/J/S@v2#bob',
    ]) {
      assert.equal(formatAddress(parseAddress(s)), s);
    }
  });

  it('rejects names that break CLI addressing', () => {
    // Пробел или слэш в имени не ломает команду — он молча открывает
    // ДРУГУЮ сцену. Поэтому это ошибка на входе.
    for (const bad of [
      'db://PROD 2026/EP07/sc042',
      'db://PROD/EP 07/sc042',
      'db://PROD/EP07/sc 042',
      'db://PROD/EP07/sc042@v 3',
    ]) {
      assert.throws(() => parseAddress(bad),
        (e: any) => e instanceof AddressError && e.code === 'BAD_NAME', bad);
    }
  });

  it('rejects a malformed db address', () => {
    for (const bad of ['db://PROD/EP07', 'db://PROD', 'db://a/b/c/d']) {
      assert.throws(() => parseAddress(bad),
        (e: any) => e.code === 'BAD_DB_ADDRESS', bad);
    }
  });

  it('builds CLI args matching Harmony -help', () => {
    assert.equal(
      cliArgs(parseAddress('db://PROD/EP07/sc042@v3#ivan')).join(' '),
      '-env PROD -job EP07 -scene sc042 -version v3 -user ivan',
    );
    assert.equal(cliArgs(parseAddress('/x/s.xstage')).join(' '), '/x/s.xstage');
  });

  it('refuses to write without an explicit version', () => {
    assert.throws(
      () => requireUnambiguousForWrite(parseAddress('db://PROD/EP01/sc001')),
      (e: any) => e.code === 'AMBIGUOUS_VERSION',
    );
  });

  it('refuses to write without a named user', () => {
    // Анонимная правка делает аудит бесполезным: студия не узнает, кто
    // тронул сцену.
    assert.throws(
      () => requireUnambiguousForWrite(parseAddress('db://PROD/EP01/sc001@v1')),
      (e: any) => e.code === 'NO_USER',
    );
  });

  it('allows a fully specified database write', () => {
    requireUnambiguousForWrite(parseAddress('db://PROD/EP01/sc001@v1#ivan'));
  });

  it('never blocks a standalone write on version rules', () => {
    requireUnambiguousForWrite(parseAddress('/x/s.xstage'));
  });
});

describe('multi-user locking', () => {
  it('allows writing to a free scene', () => {
    const l = decideWritable('free', null, 'ivan');
    assert.equal(l.writable, true);
  });

  it('allows writing when I hold the lock', () => {
    assert.equal(decideWritable('held-by-me', 'ivan', 'ivan').writable, true);
  });

  it('refuses when someone else holds the lock, and names them', () => {
    const l = decideWritable('held-by-other', 'masha', 'ivan');
    assert.equal(l.writable, false);
    assert.match(l.reason, /masha/);
  });

  it('treats an UNKNOWN lock as taken', () => {
    // Мина №14: Harmony принимает правки в read-only сцену МОЛЧА.
    // Значит «не знаю» обязано означать «нельзя», иначе мы узнаём о
    // проблеме от художника, чью работу перезаписали.
    const l = decideWritable('unknown', null, 'ivan');
    assert.equal(l.writable, false);
    assert.match(l.reason, /unknown|refusing/i);
  });

  it('write probe cancels its own undo block', () => {
    // Проба, которая оставляет правку, — это уже не проба.
    const p = writeProbePlan(parseAddress('db://P/J/S@v1#ivan'));
    assert.match(p.script, /beginUndoRedoAccum/);
    assert.match(p.script, /cancelUndoRedoAccum/);
    assert.ok(!/endUndoRedoAccum/.test(p.script),
      'probe must cancel, never commit');
  });
});
