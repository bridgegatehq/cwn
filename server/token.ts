import jwt from 'jsonwebtoken';

/**
 * Token helpers.
 *
 * Node and the browser build both sign and verify synchronously; the browser uses the
 * pure-JS HS256 implementation in src/platform/compat/modules/jsonwebtoken.ts, which
 * this module resolves to through the build alias.
 */
export function signToken(payload: Record<string, unknown>, secret: string) {
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function decodeToken(token: string, secret: string): Record<string, unknown> | null {
  try {
    return jwt.verify(token, secret) as Record<string, unknown>;
  } catch {
    return null;
  }
}
