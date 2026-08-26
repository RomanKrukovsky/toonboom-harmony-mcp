/**
 * Pipeline-producer executor tests — the real job runner.
 *
 * Covers what the previous "durable jobs" layer promised but never did:
 * topological step order, cancel-between-steps honored from the DB, retry
 * with attempts, and honest failed/completed terminal states.
 */

import fs from 'fs';
import path from 'path';
import { FactoryFoundationStore } from '../src/adapters/factoryFoundation/index.js';

const ROOT = path.resolve(process.cwd(), 'output', '__factory_executor_test');

describe('FactoryFoundationStore.executeJob — real DAG execution', () => {
  let store: FactoryFoundationStore;

  beforeAll(async () => {
    fs.rmSync(ROOT, { recursive: true, force: true });
    fs.mkdirSync(ROOT, { recursive: true });
    store = new FactoryFoundationStore();
    // The store derives its root from config allowedRoots[0]; point it at TMP.
    (store as any).root = ROOT;
    (store as any).dbPath = path.join(ROOT, 'factory.db');
  });

  afterAll(() => {
    fs.rmSync(ROOT, { recursive: true, force: true });
  });

  it('runs steps in dependency order with progress updates', async () => {
    const job = await store.createJob('test_order', {}, ['a', 'b', 'c']);
    const ran: string[] = [];
    const result = await store.executeJob(job.jobId, {
      a: async () => { ran.push('a'); return { n: 1 }; },
      b: async () => { ran.push('b'); return { n: 2 }; },
      c: async () => { ran.push('c'); return { n: 3 }; }
    }, { maxAttemptsPerStep: 2 });
    expect(ran).toEqual(['a', 'b', 'c']);
    expect(result.status).toBe('completed');
    expect(result.progress).toBe(1);
    expect(result.steps.every(s => s.status === 'completed')).toBe(true);
  });

  it('retries a flaky step and completes within maxAttemptsPerStep', async () => {
    const job = await store.createJob('test_retry', {}, ['only']);
    let calls = 0;
    const result = await store.executeJob(job.jobId, {
      only: async () => {
        calls += 1;
        if (calls < 3) throw new Error('flaky');
        return { ok: true };
      }
    }, { maxAttemptsPerStep: 3 });
    expect(calls).toBe(3);
    expect(result.status).toBe('completed');
    const step = result.steps.find(s => s.name === 'only')!;
    expect(step.attempt).toBeGreaterThanOrEqual(3);
  });

  it('marks the job failed when attempts are exhausted', async () => {
    const job = await store.createJob('test_fail', {}, ['boom']);
    const result = await store.executeJob(job.jobId, {
      boom: async () => { throw new Error('nope'); }
    }, { maxAttemptsPerStep: 2 });
    expect(result.status).toBe('failed');
    expect(result.error?.error).toContain('nope');
  });

  it('stops between steps when cancel() lands mid-run', async () => {
    const job = await store.createJob('test_cancel', {}, ['one', 'two']);
    const result = await store.executeJob(job.jobId, {
      one: async () => {
        // External producer cancels while step one is running.
        await store.cancel(job.jobId);
        return { ok: true };
      },
      two: async () => ({ never: true })
    }, { maxAttemptsPerStep: 1 });
    expect(result.status).toBe('cancelled');
    expect(result.steps.map(s => s.status)).toEqual(['completed', 'cancelled']);
  });
});
