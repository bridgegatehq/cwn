/**
 * Installs the browser stand-ins for Node built-ins.
 * Must run before the server module graph is evaluated.
 */
import { Buffer } from 'buffer';
import { cryptoShim, fsShim, makeProcessShim, pathShim } from './node-shims';
import { expressShim, corsShim, multerShim } from './express-shim';
import { jwtShim } from './jwt-shim';
import { bcryptShim } from './bcrypt-shim';
import { webpushShim } from './webpush-shim';

export interface RuntimeHandles {
  express: ReturnType<typeof expressShim>;
  cors: typeof corsShim;
  multer: typeof multerShim;
  jwt: typeof jwtShim;
  bcrypt: typeof bcryptShim;
  webpush: ReturnType<typeof webpushShim>;
  fs: typeof fsShim;
  path: typeof pathShim;
  crypto: typeof cryptoShim;
}

declare global {
  // eslint-disable-next-line no-var
  var __cwnRuntime: RuntimeHandles | undefined;
  // eslint-disable-next-line no-var
  var __cwnGetDb: (() => unknown) | undefined;
}

export function installShims() {
  if (globalThis.__cwnRuntime) return globalThis.__cwnRuntime;

  const baseHref = new URL('/', window.location.href).pathname;

  (globalThis as Record<string, unknown>).Buffer = Buffer;
  (globalThis as Record<string, unknown>).process = makeProcessShim(baseHref);

  const runtime: RuntimeHandles = {
    express: expressShim(),
    cors: corsShim,
    multer: multerShim,
    jwt: jwtShim,
    bcrypt: bcryptShim,
    webpush: webpushShim(),
    fs: fsShim,
    path: pathShim,
    crypto: cryptoShim,
  };

  globalThis.__cwnRuntime = runtime;
  return runtime;
}
