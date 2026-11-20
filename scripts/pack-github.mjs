#!/usr/bin/env node
/**
 * Packs the whole repository into one archive for GitHub.
 *
 * Includes: all source, the server, scripts, images, the seeded SQLite database
 * (accounts and records), screenshots and documentation.
 * Excludes: node_modules, build output, packaged bundles and SQLite runtime files —
 * all reproducible with `npm install && npm run build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const target = path.join(root, 'civic-watch-nigeria-github.zip');

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'netlify-drop', '.cwn-browser-server', '.git', 'private_evidence', '.arena', '.cache']);
const EXCLUDED_FILES = new Set(['civic-watch-nigeria-github.zip', 'civic-watch-nigeria-netlify.zip']);
const EXCLUDED_SUFFIX = ['-wal', '-shm'];

if (fs.existsSync(target)) fs.rmSync(target);

execFileSync(
  'python3',
  [
    '-c',
    `
import os, zipfile, json

root = ${JSON.stringify(root)}
target = ${JSON.stringify(target)}
excluded_dirs = ${JSON.stringify([...EXCLUDED_DIRS])}
excluded_files = ${JSON.stringify([...EXCLUDED_FILES])}
excluded_suffix = ${JSON.stringify(EXCLUDED_SUFFIX)}

root_name = 'civic-watch-nigeria'
entries = []
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for base, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in excluded_dirs and not d.startswith('.'))
        for name in sorted(files):
            if name in excluded_files or any(name.endswith(s) for s in excluded_suffix):
                continue
            full = os.path.join(base, name)
            rel = os.path.relpath(full, root)
            archive.write(full, os.path.join(root_name, rel))
            entries.append(rel)

with open('/tmp/gh-manifest.json', 'w') as handle:
    json.dump(entries, handle)
print('archived', len(entries), 'files')
`,
  ],
  { stdio: 'inherit' }
);

const manifest = JSON.parse(fs.readFileSync('/tmp/gh-manifest.json', 'utf8'));
const size = (fs.statSync(target).size / (1024 * 1024)).toFixed(2);

const groups = {
  source: manifest.filter((f) => f.startsWith('src/')).length,
  server: manifest.filter((f) => f.startsWith('server/')).length,
  scripts: manifest.filter((f) => f.startsWith('scripts/')).length,
  images: manifest.filter((f) => f.startsWith('public/images/')).length,
  screenshots: manifest.filter((f) => f.startsWith('docs/screenshots/')).length,
  data: manifest.filter((f) => f.startsWith('data/')).length,
};

console.log(`\n[github] ${path.basename(target)} — ${size} MB`);
console.log(`  src files:          ${groups.source}`);
console.log(`  server files:       ${groups.server}`);
console.log(`  scripts:            ${groups.scripts}`);
console.log(`  editorial images:   ${groups.images}`);
console.log(`  screenshots:        ${groups.screenshots}`);
console.log(`  database files:     ${groups.data}`);
console.log(`  total entries:      ${manifest.length}`);

const required = ['README.md', 'package.json', 'package-lock.json', 'data/civic_watch.sqlite', 'server/app.ts', 'server/db.ts', 'src/App.tsx'];
const missing = required.filter((file) => !manifest.includes(file));
console.log(missing.length ? `  MISSING: ${missing.join(', ')}` : '  required files: all present');
if (missing.length) process.exitCode = 1;
