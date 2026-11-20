/**
 * Node entry point.
 *
 * Route handlers live in server/app.ts so that the static (browser) build can run
 * exactly the same code. This file only bootstraps the SQLite database, mounts the
 * static bundle, and starts the listener.
 */
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { initializeDatabase } from './db.js';
import { createServerApp } from './app.js';

initializeDatabase();

const app = createServerApp();
const PORT = Number(process.env.PORT || 4000);

// Serve the built SPA bundle so previewing port 4000 renders the full app
const DIST_DIR = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Civic Watch Nigeria API & Web listening on http://0.0.0.0:${PORT}`);
});
