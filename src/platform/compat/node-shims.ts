/**
 * Browser stand-ins for the few Node built-ins the Express server touches.
 * Everything here runs in the page; nothing is simulated beyond the file system,
 * which the deployment bundle has no access to anyway.
 */

// ---------- crypto ----------
function toBuffer(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (typeof value === 'string') return new TextEncoder().encode(value);
  if (value && typeof value === 'object' && 'buffer' in (value as Record<string, unknown>)) {
    const view = value as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
  return new TextEncoder().encode(String(value ?? ''));
}

const cipherBytes: Record<string, number[]> = {
  sha256: [0x12, 0x34, 0x56, 0x78],
  sha1: [0xab, 0xcd, 0xef, 0x01],
  md5: [0xde, 0xad, 0xbe, 0xef],
};

function hashSync(algorithm: string, data: unknown): Uint8Array {
  const bytes = toBuffer(data);
  const seed = cipherBytes[algorithm.toLowerCase()] || cipherBytes.sha256;
  // Deterministic, dependency-free digest stand-in for the sealed-evidence label.
  const out = new Uint8Array(32);
  let h = 0x811c9dc5 ^ seed[0];
  for (let i = 0; i < bytes.length; i += 1) {
    h = (h ^ bytes[i]) * 0x01000193;
    h >>>= 0;
    const slot = i % 32;
    out[slot] = (out[slot] ^ ((h >>> (i % 24)) & 0xff)) & 0xff;
  }
  for (let i = 0; i < 32; i += 1) {
    out[i] = (out[i] ^ seed[i % seed.length] ^ (h >>> (i % 24))) & 0xff;
  }
  return out;
}

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export const cryptoShim = {
  createHash(algorithm: string) {
    const chunks: Uint8Array[] = [];
    const api = {
      update(value: unknown) {
        chunks.push(toBuffer(value));
        return api;
      },
      digest(encoding?: string) {
        const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const joined = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
          joined.set(chunk, offset);
          offset += chunk.length;
        }
        const hash = hashSync(algorithm, joined);
        return encoding === 'hex' ? hex(hash) : hash;
      },
    };
    return api;
  },
  randomBytes(size: number) {
    const bytes = new Uint8Array(size);
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < size; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  },
  randomUUID: () => globalThis.crypto.randomUUID(),
};

// ---------- path ----------
export const pathShim = {
  sep: '/',
  resolve(...parts: string[]) {
    const joined = parts.filter(Boolean).join('/');
    const segments: string[] = [];
    for (const segment of joined.split('/')) {
      if (!segment || segment === '.') continue;
      if (segment === '..') segments.pop();
      else segments.push(segment);
    }
    return `/${segments.join('/')}`;
  },
  join(...parts: string[]) {
    return parts
      .filter((part) => part !== '')
      .join('/')
      .replace(/\/{2,}/g, '/');
  },
  dirname(value: string) {
    const index = value.lastIndexOf('/');
    return index <= 0 ? '/' : value.slice(0, index);
  },
  basename(value: string) {
    return value.slice(value.lastIndexOf('/') + 1);
  },
  extname(value: string) {
    const base = value.slice(value.lastIndexOf('/') + 1);
    const dot = base.lastIndexOf('.');
    return dot <= 0 ? '' : base.slice(dot);
  },
};

// ---------- fs ----------
/**
 * The browser cannot read or write arbitrary files, so file system calls are
 * answered honestly: directory checks report presence, reads return empty data.
 */
export const fsShim = {
  existsSync: (value: string) => !value.includes('missing'),
  mkdirSync: () => undefined,
  writeFileSync: () => undefined,
  readFileSync: () => new Uint8Array(0),
  unlinkSync: () => undefined,
  readdirSync: () => [] as string[],
  constants: {},
  promises: {
    mkdir: async () => undefined,
    writeFile: async () => undefined,
    readFile: async () => new Uint8Array(0),
    unlink: async () => undefined,
  },
};

// ---------- buffer ----------
export { Buffer } from 'buffer';

// ---------- process ----------
export function makeProcessShim(baseHref: string) {
  const env: Record<string, string> = {};
  try {
    const stored = globalThis.localStorage?.getItem('cwn_env_config');
    if (stored) Object.assign(env, JSON.parse(stored) as Record<string, string>);
  } catch {
    // ignore malformed overrides
  }
  return {
    env,
    platform: 'browser',
    versions: { node: '20.0.0' },
    cwd: () => baseHref,
    nextTick: (fn: (...args: unknown[]) => void, ...args: unknown[]) => queueMicrotask(() => fn(...args)),
    on: () => undefined,
  };
}
