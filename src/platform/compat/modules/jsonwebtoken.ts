import { hmacSha256 } from '../sync-hmac';

/**
 * Synchronous HS256 JWT sign/verify for the browser build.
 * Matches the token shape the server issues, so the same requireAuth logic applies.
 */

// JWT_SECRET used by the browser build. Tokens are device-local because the whole
// database is device-local, so this is a signing key for local state, not a shared
// authentication boundary.
const BROWSER_SECRET = 'civic-watch-nigeria-browser-build-2026';

function base64UrlEncode(input: string | Uint8Array) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecodeBytes(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlDecode(value: string) {
  return new TextDecoder().decode(base64UrlDecodeBytes(value));
}

function secretFor(provided?: string) {
  return provided || BROWSER_SECRET;
}

function sign(payload: Record<string, unknown>, secret?: string, options?: { expiresIn?: string | number }) {
  let exp: number | undefined;
  if (options?.expiresIn) {
    const raw = String(options.expiresIn);
    const match = /^(\d+)([smhd])$/.exec(raw);
    const amount = match ? Number(match[1]) : Number(raw) || 0;
    const unit = match?.[2] ?? 's';
    const factor = unit === 'h' ? 3600 : unit === 'd' ? 86400 : unit === 'm' ? 60 : 1;
    exp = Math.floor(Date.now() / 1000) + amount * factor;
  }
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const claims = base64UrlEncode(JSON.stringify(exp ? { ...payload, exp } : payload));
  const signingInput = `${header}.${claims}`;
  const signature = hmacSha256(new TextEncoder().encode(secretFor(secret)), new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

function verify(token: string, secret?: string) {
  const [header, claims, signature] = token.split('.');
  if (!header || !claims || !signature) throw new Error('jwt malformed');
  const expected = hmacSha256(new TextEncoder().encode(secretFor(secret)), new TextEncoder().encode(`${header}.${claims}`));
  const provided = base64UrlDecodeBytes(signature);
  if (expected.length !== provided.length || !expected.every((byte, index) => byte === provided[index])) {
    throw new Error('invalid signature');
  }
  const payload = JSON.parse(base64UrlDecode(claims)) as { exp?: number };
  if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error('jwt expired');
  return payload as Record<string, unknown>;
}

const jwt = { sign, verify };
export default jwt;
export { sign, verify };
