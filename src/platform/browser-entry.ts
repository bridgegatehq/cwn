/**
 * Import surface for the static build. The implementation is generated at build
 * time by the `cwn-browser-server-runtime` Vite plugin, which inlines the real
 * server route handlers into this module.
 */
// @ts-expect-error resolved by the Netlify Vite plugin at build time
export { handleApiRequest, ensureBooted, isReady, resetBrowserDatabase } from 'virtual:cwn-browser-server';
