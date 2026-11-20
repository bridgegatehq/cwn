/**
 * Build-time stand-in for better-sqlite3.
 *
 * server/db.ts opens a connection while its module body runs, and the bundler may
 * inline that module more than once. Every placeholder therefore delegates to a
 * single connection stored on globalThis, installed by the browser boot step
 * (see scripts/vite-plugin-browser-server.ts). Nothing can reach SQLite before then.
 */
const CONNECTION_KEY = '__cwnDatabaseConnection';

type Connection = Record<string | symbol, unknown>;

function connection(): Connection {
  const active = (globalThis as Record<string, unknown>)[CONNECTION_KEY] as Connection | undefined;
  if (!active) {
    throw new Error('The browser SQLite connection was not injected before use.');
  }
  return active;
}

export function installConnection(next: unknown) {
  (globalThis as Record<string, unknown>)[CONNECTION_KEY] = next;
}

function delegate(method: string) {
  return (...args: unknown[]) => {
    const target = connection()[method];
    if (typeof target !== 'function') {
      throw new Error(`SQLite connection has no "${method}" method.`);
    }
    return (target as (...inner: unknown[]) => unknown).apply(connection(), args);
  };
}

export default class BetterSqlitePlaceholder {
  constructor(_path?: string) {
    // the real connection is installed during boot
  }
  prepare = delegate('prepare');
  transaction = delegate('transaction');
  close = delegate('close');

  /** Connection setup calls are harmless no-ops until the connection exists. */
  exec(sql: string) {
    const active = (globalThis as Record<string, unknown>)[CONNECTION_KEY] as Connection | undefined;
    if (!active) return undefined;
    return (active.exec as (value: string) => unknown).call(active, sql);
  }

  pragma(statement: string) {
    const active = (globalThis as Record<string, unknown>)[CONNECTION_KEY] as Connection | undefined;
    if (!active) return [];
    return (active.pragma as (value: string) => unknown).call(active, statement);
  }
}
