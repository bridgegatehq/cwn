#!/usr/bin/env node
/**
 * Builds the static drag-and-drop bundle for Netlify Drop.
 *
 * The output folder is completely self-contained: index.html, hashed assets, the
 * service worker, the sql.js WebAssembly engine, and every editorial image. No build
 * step, environment variable or server is required on the host.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'netlify-drop');

console.log('[netlify] building the static edition');
execSync('npx vite build --outDir netlify-drop --emptyOutDir', {
  stdio: 'inherit',
  env: { ...process.env, CWN_PLATFORM: 'netlify', VITE_API_PLATFORM: 'browser' },
});

// --- SPA fallback + headers ------------------------------------------------
const indexHtml = path.join(outDir, 'index.html');
if (!fs.existsSync(indexHtml)) {
  throw new Error('[netlify] index.html was not produced');
}

fs.writeFileSync(
  path.join(outDir, '_redirects'),
  [
    '# Single-page app fallback. API calls never hit the network in this build:',
    '# they are handled inside the page by the bundled Express + SQLite runtime.',
    '/*    /index.html   200',
    '',
  ].join('\n')
);

fs.writeFileSync(
  path.join(outDir, '_headers'),
  [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: SAMEORIGIN',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: geolocation=(self), camera=(), microphone=(self)',
    '',
    '/assets/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    '/sw.js',
    '  Cache-Control: no-cache',
    '',
    '/*.wasm',
    '  Content-Type: application/wasm',
    '',
    '/*.webmanifest',
    '  Content-Type: application/manifest+json',
    '',
  ].join('\n')
);

// --- web manifest ----------------------------------------------------------
fs.writeFileSync(
  path.join(outDir, 'site.webmanifest'),
  JSON.stringify(
    {
      name: 'Civic Watch Nigeria',
      short_name: 'Civic Watch',
      description: 'Civic accountability records, cases, petitions and community updates.',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#0b6b52',
      icons: [
        { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      ],
    },
    null,
    2
  )
);

// --- verify the runtime artefacts are present ------------------------------
const assets = fs.readdirSync(path.join(outDir, 'assets'));
const wasm = assets.filter((file) => file.endsWith('.wasm'));
const js = assets.filter((file) => file.endsWith('.js'));

const missing = [];
if (!wasm.length) missing.push('sql.js WebAssembly engine');
if (!js.length) missing.push('application bundle');
if (!fs.existsSync(path.join(outDir, 'sw.js'))) missing.push('service worker');
if (!fs.existsSync(path.join(outDir, 'images'))) missing.push('editorial images');

if (missing.length) {
  throw new Error(`[netlify] bundle incomplete, missing: ${missing.join(', ')}`);
}

// --- size report -----------------------------------------------------------
function directorySize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? directorySize(full) : fs.statSync(full).size;
  }
  return total;
}

const bytes = directorySize(outDir);
const mb = (bytes / (1024 * 1024)).toFixed(2);

console.log('\n[netlify] static bundle ready');
console.log(`  folder:  ${path.relative(root, outDir)}/`);
console.log(`  size:    ${mb} MB`);
console.log(`  bundle:  ${js.find((file) => file.startsWith('index-')) ?? js[0]}`);
console.log(`  wasm:    ${wasm[0]}`);
console.log(`  files:   ${fs.readdirSync(outDir).sort().join(', ')}`);
if (bytes > 45 * 1024 * 1024) {
  console.warn('  warning: Netlify Drop recommends keeping uploads under 50 MB');
}

// Netlify file-count sanity check
const fileCount = (function count(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, entry) => {
    const full = path.join(dir, entry.name);
    return sum + (entry.isDirectory() ? count(full) : 1);
  }, 0);
})(outDir);
console.log(`  entries: ${fileCount} files`);
