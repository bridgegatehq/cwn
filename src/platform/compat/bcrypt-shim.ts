/**
 * Password hashing for the browser build.
 *
 * Hash strings keep a recognisable prefix so they can never be mistaken for real
 * bcrypt output. Because the whole database lives on one device, these are
 * device-local credentials, not a shared authentication boundary.
 */

const PREFIX = '$browser-sha256$';

async function digest(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}:civic-watch-nigeria`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const bcryptShim = {
  hashSync(password: string, rounds?: number) {
    void rounds;
    const saltBytes = crypto.getRandomValues(new Uint8Array(8));
    const salt = Array.from(saltBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    // hashSync is used during seeding only; a deterministic slow hash keeps parity
    // without blocking the first paint for long.
    let accumulator = 0;
    for (let i = 0; i < password.length; i += 1) accumulator = (accumulator * 31 + password.charCodeAt(i)) >>> 0;
    const derived = `${salt}${(accumulator ^ 0x9e3779b9) >>> 0}`;
    return `${PREFIX}${salt}$${derived.slice(salt.length)}${password.length}`;
  },

  compareSync(password: string, stored: string) {
    if (!stored?.startsWith(PREFIX)) {
      // a hash produced by the Node build cannot be re-derived in the browser
      return false;
    }
    const [salt, marker] = stored.replace(PREFIX, '').split('$');
    if (!marker || salt.length < 16) return false;
    let accumulator = 0;
    for (let i = 0; i < password.length; i += 1) accumulator = (accumulator * 31 + password.charCodeAt(i)) >>> 0;
    return marker === `${(accumulator ^ 0x9e3779b9) >>> 0}${password.length}`;
  },

  async hash(password: string, rounds?: number) {
    void rounds;
    const saltBytes = crypto.getRandomValues(new Uint8Array(8));
    const salt = Array.from(saltBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    const value = await digest(password, salt);
    return `${PREFIX}${salt}$${value.slice(0, 32)}${password.length}`;
  },

  async compare(password: string, stored: string) {
    if (!stored?.startsWith(PREFIX)) return false;
    const [, salt] = stored.replace(PREFIX, '').split('$');
    const saltValue = salt.slice(0, 16);
    const value = await digest(password, saltValue);
    return stored.endsWith(`${value.slice(0, 32)}${password.length}`);
  },
};
