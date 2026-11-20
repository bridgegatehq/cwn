/**
 * A better-sqlite3-compatible synchronous facade over sql.js, persisted to IndexedDB.
 *
 * Why this exists: the production deployment target is a static drag-and-drop host,
 * so there is no server. The database therefore lives in the browser. Statements keep
 * the same synchronous API the Express handlers already use, and every write is
 * flushed to IndexedDB so data survives reloads and tab restarts.
 */
import type { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';

const IDB_NAME = 'civic-watch-nigeria';
const IDB_STORE = 'database';
const IDB_KEY = 'civic_watch.sqlite';

type SqlValue = string | number | Uint8Array | null;

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'));
  });
}

async function readStoredBytes(): Promise<Uint8Array | null> {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const get = tx.objectStore(IDB_STORE).get(IDB_KEY);
    get.onsuccess = () => resolve((get.result as Uint8Array) ?? null);
    get.onerror = () => reject(get.error ?? new Error('Could not read stored database'));
  });
}

async function writeStoredBytes(bytes: Uint8Array): Promise<void> {
  const db = await openIndexedDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not persist database'));
  });
}

export class BrowserStatement {
  private readonly owner: BrowserDatabase;
  private readonly sql: string;

  constructor(owner: BrowserDatabase, sql: string) {
    this.owner = owner;
    this.sql = sql;
  }

  run(...params: unknown[]): RunResult {
    const db = this.owner.raw;
    if (params.length) {
      const stmt = db.prepare(this.sql);
      try {
        stmt.bind(this.owner.bind(params));
        stmt.step();
      } finally {
        stmt.free();
      }
    } else {
      db.run(this.sql);
    }
    this.owner.markDirty();
    const changes = db.getRowsModified();
    const idResult = db.exec('SELECT last_insert_rowid() AS id');
    const lastInsertRowid = Number(idResult[0]?.values?.[0]?.[0] ?? 0);
    return { changes, lastInsertRowid };
  }

  get(...params: unknown[]): Record<string, unknown> | undefined {
    const stmt = this.owner.raw.prepare(this.sql);
    try {
      stmt.bind(this.owner.bind(params));
      if (!stmt.step()) return undefined;
      return stmt.getAsObject() as Record<string, unknown>;
    } finally {
      stmt.free();
    }
  }

  all(...params: unknown[]): Record<string, unknown>[] {
    const stmt = this.owner.raw.prepare(this.sql);
    const rows: Record<string, unknown>[] = [];
    try {
      stmt.bind(this.owner.bind(params));
      while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>);
      return rows;
    } finally {
      stmt.free();
    }
  }

  /** better-sqlite3 returns the first column of the first row when .pluck() is used */
  pluck() {
    const owner = this.owner;
    const sql = this.sql;
    return {
      get: (...params: unknown[]) => {
        const row = owner.prepare(sql).get(...params);
        return row ? Object.values(row)[0] : undefined;
      },
      all: (...params: unknown[]) => owner.prepare(sql).all(...params).map((row) => Object.values(row)[0]),
      run: (...params: unknown[]) => owner.prepare(sql).run(...params),
    };
  }
}

export class BrowserDatabase {
  readonly raw: SqlJsDatabase;
  private flushTimer: number | null = null;
  private pending = false;
  onFlush?: (bytes: Uint8Array) => void;

  constructor(raw: SqlJsDatabase) {
    this.raw = raw;
  }

  bind(params: unknown[]): SqlValue[] {
    return params.map((value) => {
      if (value === undefined || value === null) return null;
      if (typeof value === 'boolean') return value ? 1 : 0;
      if (typeof value === 'bigint') return Number(value);
      if (value instanceof Uint8Array) return value;
      if (value instanceof ArrayBuffer) return new Uint8Array(value);
      if (typeof value === 'object') return JSON.stringify(value);
      return value as SqlValue;
    });
  }

  prepare(sql: string) {
    return new BrowserStatement(this, sql);
  }

  exec(sql: string) {
    this.raw.exec(sql);
    this.markDirty();
    return this;
  }

  pragma(_statement: string) {
    // WAL and foreign-key pragmas are managed by the storage layer in the browser
    return [];
  }

  transaction<T extends (...args: never[]) => unknown>(fn: T): T {
    const self = this;
    return function transactional(this: unknown, ...args: never[]) {
      self.raw.exec('BEGIN');
      try {
        const result = fn.apply(this, args);
        self.raw.exec('COMMIT');
        self.markDirty();
        return result;
      } catch (error) {
        self.raw.exec('ROLLBACK');
        throw error;
      }
    } as unknown as T;
  }

  close() {
    void this.flushNow();
    this.raw.close();
  }

  markDirty() {
    this.pending = true;
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flushNow();
    }, 250) as unknown as number;
  }

  async flushNow() {
    if (!this.pending) return;
    this.pending = false;
    const bytes = this.raw.export();
    this.onFlush?.(bytes);
    try {
      await writeStoredBytes(bytes);
    } catch (error) {
      console.warn('[civic-watch] Could not persist the browser database:', error);
    }
  }

  /** Exposed so the seed/migration step can decide what to do on first boot */
  static async load(SQL: SqlJsStatic) {
    const stored = await readStoredBytes().catch(() => null);
    const raw = stored ? new SQL.Database(stored) : new SQL.Database();
    return { db: new BrowserDatabase(raw), hydrated: Boolean(stored) };
  }
}

export type { SqlJsStatic };
