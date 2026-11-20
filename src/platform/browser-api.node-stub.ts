/** Placeholder used by type-checking; the Netlify build swaps in the real runtime. */
export async function handleApiRequest(): Promise<{ status: number; body: unknown; headers: Record<string, string> }> {
  throw new Error('The in-browser API runtime is only available in the Netlify build (CWN_PLATFORM=netlify).');
}
