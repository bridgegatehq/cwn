# Civic Watch Nigeria — Netlify Drop bundle

## What to drop

| Item | Path |
| --- | --- |
| Ready-to-drop archive | `civic-watch-nigeria-netlify.zip` (2.51 MB) |
| Same bundle, unzipped | `netlify-drop/` (3.55 MB, 20 files) |

Go to <https://app.netlify.com/drop> and drag either the zip or the `netlify-drop`
folder onto the page. Netlify serves `index.html` from the archive root, and
`_redirects` handles every in-app route. No build command, environment variable or
server is required.

## What is inside

The complete front end of the ecosystem: landing page, dashboard, reports and the
7-step sealed report flow, case tracking, Justice directory and advocate profiles,
Mobilise (petitions, campaigns, town halls, volunteering), community hub, live social
feed across 8 platforms, expanded trending, messenger updates (WhatsApp/Telegram
digests), Knowledge Centre, notifications, profile, admin overview, the 412px mobile
edition, and all 7 languages.

The backend travels with it. The real Express route handlers and the real SQLite schema
are bundled into the page and run there:

- `better-sqlite3` is replaced by a sql.js database (`assets/sql-wasm-*.wasm`)
  persisted to **IndexedDB**, so records survive reloads and browser restarts.
- Node built-ins are replaced by browser equivalents (`src/platform/compat/`).
- The same `server/app.ts` handlers answer every `/api` call, so no request leaves
  the page. Verified: 0 network requests to `/api`.

## Verified before packing

`node scripts/verify-netlify-bundle.mjs` serves the bundle with **no backend** and
drives it in headless Chromium: 25/25 checks pass, covering sign-in, all 12 screens,
trending filters, community posting that survives a reload, the messenger digest,
report submission with a case reference, petition signing, no console errors, and zero
outbound API traffic.

## Behaviour differences from the Node edition

These are deployment facts, stated plainly, and the UI says so too:

- **Data lives in the browser it was created in.** The database is per-device
  (IndexedDB), not shared between visitors. Clearing site data resets it to the seeded
  sample records.
- **Automated push delivery** needs a trusted server to sign VAPID requests, which a
  static host cannot do. Alerts are saved to the in-app notification log and the push
  card states this. Alerts arrive in-app rather than on the lock screen.
- **Telegram/WhatsApp sending** reports `queued` with
  `telegram_credentials_not_configured`, the same honest result as the Node edition
  without bot credentials. Digests are still built and shown.
- **Live X/social data** falls back to clearly-labelled sample posts unless
  `X_BEARER_TOKEN` is available. The header states which mode is active.

All sample records keep their `Sample` labels; nothing presents demo figures as
measured platform totals.

## Rebuilding

```bash
node scripts/build-netlify.mjs   # builds the static edition into netlify-drop/
node scripts/pack-netlify.mjs    # zips it into civic-watch-nigeria-netlify.zip
node scripts/verify-netlify-bundle.mjs   # 25-check headless walkthrough
```

The Node edition is unchanged: `npm run build` and `npm start`/`npm run server`
on port 4000.

## If you later want shared, multi-user data

Drag-and-drop cannot host a database. The options, in order of effort:

1. **Netlify Functions + a hosted database** (Supabase/Neon Postgres). Deploy via Git
   or Netlify CLI instead of Drop, and point `server/db.ts` at that database.
2. **Keep this static bundle and add a hosted backend** for authentication and shared
   records, leaving the in-page runtime for offline reads.

Both keep the interface as built; only the storage layer changes.
