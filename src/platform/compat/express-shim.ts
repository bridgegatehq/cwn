/**
 * Small Express-compatible router so the real route handlers in server/*.ts
 * can run unmodified in the browser. Supports the exact surface the app uses:
 * get/post/patch/put/delete/use, :params, middleware chains, res.status().json(),
 * express.json() body access via req.body, and multipart files via req.files.
 */
import { Buffer } from 'buffer';

export type Handler = (req: any, res: any, next: (err?: unknown) => void) => unknown;

interface Layer {
  method: string;
  keys: string[];
  regex: RegExp;
  handlers: Handler[];
}

export interface BrowserResponsePayload {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

function compile(pathname: string) {
  const keys: string[] = [];
  const pattern = pathname
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { keys, regex: new RegExp(`^${pattern}/?$`) };
}

function parseMultipart(body: ArrayBuffer, contentType: string) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];
  if (!boundary) return null;
  const bytes = new Uint8Array(body);
  const decoder = new TextDecoder('latin1');
  const raw = decoder.decode(bytes);
  const parts = raw.split(`--${boundary}`);
  const fields: Record<string, string> = {};
  const files: Array<{ originalname: string; mimetype: string; size: number; buffer: ArrayBuffer; fieldname: string }> = [];

  for (const part of parts) {
    const trimmed = part.replace(/^\r\n/, '');
    if (!trimmed || trimmed === '--\r\n' || trimmed === '--') continue;
    const headerEnd = trimmed.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headerBlock = trimmed.slice(0, headerEnd);
    const content = trimmed.slice(headerEnd + 4).replace(/\r\n$/, '');
    const nameMatch = /name="([^"]*)"/i.exec(headerBlock);
    const fileMatch = /filename="([^"]*)"/i.exec(headerBlock);
    const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headerBlock);
    if (!nameMatch) continue;
    if (fileMatch) {
      const buffer = Buffer.from(content, 'latin1');
      files.push({
        fieldname: nameMatch[1],
        originalname: fileMatch[1],
        mimetype: typeMatch?.[1]?.trim() || 'application/octet-stream',
        size: buffer.byteLength,
        buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
      });
    } else {
      fields[nameMatch[1]] = content;
    }
  }
  return { fields, files };
}

export class ExpressLike {
  private layers: Layer[] = [];
  private bodyLimit = 5 * 1024 * 1024;

  private middleware: Handler[] = [];

  /**
   * Real Express middleware registered here runs before every route (body parsing,
   * response-header defaults). Routes themselves are dispatched separately.
   */
  use(...args: unknown[]) {
    for (const argument of args) {
      if (typeof argument === 'function' && (argument as Handler).length >= 3) {
        this.middleware.push(argument as Handler);
      }
    }
    return this;
  }

  /** Runs the registered middleware chain, then the matched route. */
  private async runMiddleware(
    request: any,
    responseHeaders: Record<string, string>,
    setStatus: (code: number) => void
  ) {
    for (const middleware of this.middleware) {
      await new Promise<void>((resolve, reject) => {
        const res: any = {
          status(code: number) {
            setStatus(code);
            return res;
          },
          setHeader(name: string, value: string) {
            responseHeaders[name.toLowerCase()] = value;
            return res;
          },
          json() {
            resolve();
            return res;
          },
          send() {
            resolve();
            return res;
          },
          end() {
            resolve();
            return res;
          },
        };
        try {
          const result = middleware(request, res, (error?: unknown) => (error ? reject(error) : resolve()));
          if (result && typeof (result as Promise<unknown>).then === 'function') {
            (result as Promise<unknown>).then(() => resolve()).catch(reject);
          }
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    }
  }

  private add(method: string, pathname: string, handlers: Handler[]) {
    const { keys, regex } = compile(pathname);
    this.layers.push({ method, keys, regex, handlers });
    return this;
  }

  get(pathname: string, ...handlers: Handler[]) {
    return this.add('GET', pathname, handlers.filter((h) => typeof h === 'function'));
  }
  post(pathname: string, ...handlers: Handler[]) {
    return this.add('POST', pathname, handlers.filter((h) => typeof h === 'function'));
  }
  patch(pathname: string, ...handlers: Handler[]) {
    return this.add('PATCH', pathname, handlers.filter((h) => typeof h === 'function'));
  }
  put(pathname: string, ...handlers: Handler[]) {
    return this.add('PUT', pathname, handlers.filter((h) => typeof h === 'function'));
  }
  delete(pathname: string, ...handlers: Handler[]) {
    return this.add('DELETE', pathname, handlers.filter((h) => typeof h === 'function'));
  }

  listen(_port: unknown, _host?: unknown, callback?: () => void) {
    callback?.();
    return { close: () => undefined };
  }

  json() {
    return (_req: any, _res: any, next: () => void) => next();
  }

  get registeredCount() {
    return this.layers.length;
  }

  async handle(method: string, url: URL, body: ArrayBuffer | null, contentType: string, headers: Record<string, string>) {
    const request: any = {
      method,
      url: url.pathname + url.search,
      params: {} as Record<string, string>,
      query: Object.fromEntries(url.searchParams.entries()),
      headers: Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])),
      body: {} as Record<string, unknown>,
      files: undefined as unknown,
      file: undefined as unknown,
      ip: 'browser',
    };

    if (body && body.byteLength) {
      if (contentType.includes('multipart/form-data')) {
        const parsed = parseMultipart(body, contentType);
        if (parsed) {
          request.body = parsed.fields;
          request.files = parsed.files.map((file) => ({ ...file, path: `browser://${file.originalname}` }));
        }
      } else if (contentType.includes('json')) {
        if (body.byteLength > this.bodyLimit) {
          return { status: 413, body: { error: 'Request body is larger than 5mb.' }, headers: {} } as BrowserResponsePayload;
        }
        try {
          request.body = JSON.parse(new TextDecoder().decode(body));
        } catch {
          return { status: 400, body: { error: 'Malformed JSON body.' }, headers: {} } as BrowserResponsePayload;
        }
      } else {
        try {
          request.body = JSON.parse(new TextDecoder().decode(body));
        } catch {
          request.body = {};
        }
      }
    }

    let middlewareStatus = 200;
    const middlewareHeaders: Record<string, string> = {};
    await this.runMiddleware(request, middlewareHeaders, (code) => {
      middlewareStatus = code;
    });
    void middlewareStatus;

    const layer = this.layers.find((candidate) => {
      if (candidate.method !== method) return false;
      return candidate.regex.test(url.pathname);
    });

    if (!layer) {
      return { status: 404, body: { error: `No route for ${method} ${url.pathname}` }, headers: {} } as BrowserResponsePayload;
    }

    const match = layer.regex.exec(url.pathname);
    layer.keys.forEach((key, index) => {
      request.params[key] = decodeURIComponent(match?.[index + 1] ?? '');
    });

    return await new Promise<BrowserResponsePayload>((resolve, reject) => {
      let status = 200;
      let settled = false;
      const responseHeaders: Record<string, string> = { 'content-type': 'application/json' };

      const send = (payload: unknown) => {
        if (settled) return;
        settled = true;
        resolve({ status, body: payload, headers: responseHeaders });
      };

      const res: any = {
        status(code: number) {
          status = code;
          return res;
        },
        setHeader(name: string, value: string) {
          responseHeaders[name.toLowerCase()] = value;
          return res;
        },
        json(payload: unknown) {
          send(payload);
          return res;
        },
        send(payload: unknown) {
          send(payload);
          return res;
        },
        end(payload?: unknown) {
          send(payload ?? '');
          return res;
        },
        sendFile() {
          send({ error: 'File responses are not available in the browser build.' });
          return res;
        },
      };

      const next = (error?: unknown) => {
        if (error) {
          if (!settled) {
            settled = true;
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        }
      };

      const run = (index: number) => {
        const handler = layer.handlers[index];
        if (!handler) return;
        try {
          const result = handler(request, res, (error?: unknown) => {
            if (error) return next(error);
            run(index + 1);
          });
          if (result && typeof (result as Promise<unknown>).then === 'function') {
            (result as Promise<unknown>).catch(reject);
          }
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };

      run(0);
    });
  }
}

export function expressShim() {
  const app = new ExpressLike();
  const express: any = () => app;
  express.json = () => (_req: any, _res: any, next: () => void) => next();
  express.urlencoded = () => (_req: any, _res: any, next: () => void) => next();
  express.static = () => (_req: any, _res: any, next: () => void) => next();
  express.Router = () => new ExpressLike();
  return express;
}

export function corsShim() {
  return (_req: any, _res: any, next: () => void) => next();
}

export function multerShim() {
  const make = () => ({
    array: () => (_req: any, _res: any, next: () => void) => next(),
    single: () => (_req: any, _res: any, next: () => void) => next(),
    fields: () => (_req: any, _res: any, next: () => void) => next(),
    none: () => (_req: any, _res: any, next: () => void) => next(),
  });
  const factory: any = (options?: unknown) => {
    void options;
    return make();
  };
  factory.diskStorage = (options?: unknown) => options ?? {};
  factory.memoryStorage = () => ({});
  return factory;
}
