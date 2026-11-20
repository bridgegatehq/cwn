/**
 * Platform switch for API calls.
 *
 * The Node edition talks to the Express server over HTTP.
 * The static (Netlify) edition routes the same call into the in-browser
 * Express + SQLite runtime, so screens and components are unchanged.
 */
import { handleApiRequest } from '../platform/browser-entry';

export const API_PLATFORM = (import.meta.env.VITE_API_PLATFORM as string) || 'node';

export async function routeRequest(input: string, init: RequestInit = {}): Promise<Response> {
  if (API_PLATFORM === 'browser') {
    let result;
    try {
      result = await handleApiRequest(input, init);
    } catch (error) {
      console.error('[civic-watch] in-page API failed for', input, error);
      throw error;
    }
    return new Response(JSON.stringify(result.body ?? {}), {
      status: result.status,
      headers: { 'content-type': 'application/json' },
    });
  }
  return fetch(input, init);
}
