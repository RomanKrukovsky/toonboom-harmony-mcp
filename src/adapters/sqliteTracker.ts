import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';

export class SqliteTracker {
  private db: sqlite3.Database;

  constructor() {
    const dbPath = path.join(config.allowedRoots[0] || '.', 'harmony_workflow.db');
    this.db = new sqlite3.Database(dbPath);
  }

  async initialize(): Promise<void> {
    const schemas = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        role TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS productions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        production_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(production_id) REFERENCES productions(id) ON DELETE CASCADE,
        UNIQUE(production_id, name)
      )`,
      `CREATE TABLE IF NOT EXISTS sequences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        episode_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
        UNIQUE(episode_id, name)
      )`,
      `CREATE TABLE IF NOT EXISTS shots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sequence_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'Ready to Start',
        assigned_user_id INTEGER,
        harmony_env TEXT,
        harmony_job TEXT,
        harmony_scene TEXT,
        harmony_version INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sequence_id) REFERENCES sequences(id) ON DELETE CASCADE,
        FOREIGN KEY(assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(sequence_id, name)
      )`,
      `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shot_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'Todo',
        assigned_user_id INTEGER,
        due_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(shot_id) REFERENCES shots(id) ON DELETE CASCADE,
        FOREIGN KEY(assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        production_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT,
        harmony_path TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(production_id) REFERENCES productions(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        author_user_id INTEGER,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(author_user_id) REFERENCES users(id) ON DELETE SET NULL
      )`
    ];

    for (const sql of schemas) {
      await this.run(sql);
    }

    // Добавляем администратора по умолчанию, если таблица пуста
    const usersCount = await this.get<{ count: number }>('SELECT COUNT(*) as count FROM users');
    if (usersCount && usersCount.count === 0) {
      await this.run("INSERT INTO users (username, role) VALUES ('usabatch', 'Administrator')");
    }
  }

  // Обертки с промисами для методов sqlite3
  run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (this: sqlite3.RunResult, err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  // Методы управления рабочим процессом
  async createProduction(name: string, description?: string): Promise<any> {
    const res = await this.run('INSERT INTO productions (name, description) VALUES (?, ?)', [name, description || null]);
    return { id: res.lastID, name, description };
  }

  async listProductions(): Promise<any[]> {
    return this.all('SELECT * FROM productions');
  }

  async createEpisode(productionId: number, name: string, description?: string): Promise<any> {
    const res = await this.run('INSERT INTO episodes (production_id, name, description) VALUES (?, ?, ?)', [productionId, name, description || null]);
    return { id: res.lastID, productionId, name, description };
  }

  async listEpisodes(productionId: number): Promise<any[]> {
    return this.all('SELECT * FROM episodes WHERE production_id = ?', [productionId]);
  }

  async createSequence(episodeId: number, name: string, description?: string): Promise<any> {
    const res = await this.run('INSERT INTO sequences (episode_id, name, description) VALUES (?, ?, ?)', [episodeId, name, description || null]);
    return { id: res.lastID, episodeId, name, description };
  }

  async listSequences(episodeId: number): Promise<any[]> {
    return this.all('SELECT * FROM sequences WHERE episode_id = ?', [episodeId]);
  }

  async createShot(sequenceId: number, name: string, description?: string): Promise<any> {
    const res = await this.run('INSERT INTO shots (sequence_id, name, description) VALUES (?, ?, ?)', [sequenceId, name, description || null]);
    return { id: res.lastID, sequenceId, name, description, status: 'Ready to Start' };
  }

  async listShots(sequenceId: number): Promise<any[]> {
    return this.all('SELECT * FROM shots WHERE sequence_id = ?', [sequenceId]);
  }

  async updateShotStatus(shotId: number, status: string): Promise<void> {
    await this.run('UPDATE shots SET status = ? WHERE id = ?', [status, shotId]);
  }

  async assignShotUser(shotId: number, userId: number): Promise<void> {
    await this.run('UPDATE shots SET assigned_user_id = ? WHERE id = ?', [userId, shotId]);
  }

  async linkHarmony(shotId: number, env: string, job: string, scene: string, version: number): Promise<void> {
    await this.run(
      'UPDATE shots SET harmony_env = ?, harmony_job = ?, harmony_scene = ?, harmony_version = ? WHERE id = ?',
      [env, job, scene, version, shotId]
    );
  }

  async createTask(shotId: number, name: string, assignedUserId?: number, dueDate?: string): Promise<any> {
    const res = await this.run('INSERT INTO tasks (shot_id, name, assigned_user_id, due_date) VALUES (?, ?, ?, ?)', [
      shotId,
      name,
      assignedUserId || null,
      dueDate || null
    ]);
    return { id: res.lastID, shotId, name, status: 'Todo', assignedUserId, dueDate };
  }

  async listTasks(shotId: number): Promise<any[]> {
    return this.all('SELECT * FROM tasks WHERE shot_id = ?', [shotId]);
  }

  async updateTaskStatus(taskId: number, status: string): Promise<void> {
    await this.run('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId]);
  }

  async createAsset(productionId: number, name: string, type: string, harmonyPath?: string): Promise<any> {
    const res = await this.run('INSERT INTO assets (production_id, name, type, harmony_path) VALUES (?, ?, ?, ?)', [
      productionId,
      name,
      type,
      harmonyPath || null
    ]);
    return { id: res.lastID, productionId, name, type, harmonyPath };
  }

  async listAssets(productionId: number): Promise<any[]> {
    return this.all('SELECT * FROM assets WHERE production_id = ?', [productionId]);
  }

  async addNote(entityType: string, entityId: number, authorUserId: number, content: string): Promise<any> {
    const res = await this.run('INSERT INTO notes (entity_type, entity_id, author_user_id, content) VALUES (?, ?, ?, ?)', [
      entityType,
      entityId,
      authorUserId,
      content
    ]);
    return { id: res.lastID, entityType, entityId, authorUserId, content };
  }

  async listNotes(entityType: string, entityId: number): Promise<any[]> {
    return this.all('SELECT * FROM notes WHERE entity_type = ? AND entity_id = ?', [entityType, entityId]);
  }

  async getStatusReport(): Promise<any> {
    const shots = await this.all<{ status: string; count: number }>('SELECT status, count(*) as count FROM shots GROUP BY status');
    const tasks = await this.all<{ status: string; count: number }>('SELECT status, count(*) as count FROM tasks GROUP BY status');
    return { shots, tasks };
  }

  async generateProductionReport(): Promise<any> {
    const productions = await this.listProductions();
    const report: any[] = [];
    for (const p of productions) {
      const episodes = await this.listEpisodes(p.id);
      const epDetails = [];
      for (const ep of episodes) {
        const seqs = await this.listSequences(ep.id);
        const seqDetails = [];
        for (const seq of seqs) {
          const shots = await this.listShots(seq.id);
          seqDetails.push({ ...seq, shots });
        }
        epDetails.push({ ...ep, sequences: seqDetails });
      }
      report.push({ ...p, episodes: epDetails });
    }
    return report;
  }

  close() {
    this.db.close();
  }
}
export const tracker = new SqliteTracker();
