#!/usr/bin/env node
/**
 * Packs netlify-drop/ into a single zip that Netlify Drop accepts directly
 * (dragging a .zip is supported by app.netlify.com/drop).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const source = path.join(root, 'netlify-drop');
const target = path.join(root, 'civic-watch-nigeria-netlify.zip');

if (!fs.existsSync(path.join(source, 'index.html'))) {
  console.error('[pack] netlify-drop/index.html missing — run scripts/build-netlify.mjs first');
  process.exit(1);
}
if (fs.existsSync(target)) fs.rmSync(target);

// Zip the CONTENTS of the folder (Netlify expects index.html at the archive root).
execFileSync('python3', ['-c', `
import os, zipfile
source = ${JSON.stringify(source)}
target = ${JSON.stringify(target)}
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for base, _dirs, files in os.walk(source):
        for name in sorted(files):
            full = os.path.join(base, name)
            archive.write(full, os.path.relpath(full, source))
    print('archived', sum(len(f) for _, _, f in os.walk(source)), 'files')
`], { stdio: 'inherit' });

const size = (fs.statSync(target).size / (1024 * 1024)).toFixed(2);
console.log(`[pack] ${path.basename(target)} — ${size} MB`);
console.log('[pack] drop this file on https://app.netlify.com/drop');
