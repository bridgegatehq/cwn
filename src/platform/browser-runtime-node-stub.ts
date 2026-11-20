/**
 * Node edition stand-in. The in-page API runtime only exists in the static build
 * (CWN_PLATFORM=netlify); the Node edition talks to the Express server instead, so
 * this module should never be reached at runtime.
 */
const message = 'The in-browser API runtime is only available in the static build. The Node edition calls the Express server.';

export async function handleApiRequest(): Promise<never> {
  throw new Error(message);
}
export async function ensureBooted(): Promise<never> {
  throw new Error(message);
}
export function isReady() {
  return false;
}
export async function resetBrowserDatabase(): Promise<never> {
  throw new Error(message);
}
