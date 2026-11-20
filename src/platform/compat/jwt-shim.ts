/**
 * HS256 JSON Web Token sign/verify built on Web Crypto.
 * The payload is identical to the server's tokens, so the same
 * requireAuth / getOptionalUser logic keeps working.
 */

function base64UrlEncode(input: string | Uint8Array) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function keyFor(secret: string) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export const jwtShim = {
  async sign(payload: Record<string, unknown>, secret: string, options?: { expiresIn?: string | number }) {
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
    const key = await keyFor(secret);
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
    return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
  },

  async verify(token: string, secret: string) {
    const [header, claims, signature] = token.split('.');
    if (!header || !claims || !signature) throw new Error('jwt malformed');
    const key = await keyFor(secret);
    const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${claims}`));
    const provided = base64UrlDecode(signature);
    const expectedBinary = String.fromCharCode(...new Uint8Array(expected));
    if (provided !== expectedBinary) throw new Error('invalid signature');
    const payload = JSON.parse(base64UrlDecode(claims)) as { exp?: number };
    if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error('jwt expired');
    return payload;
  },
};
