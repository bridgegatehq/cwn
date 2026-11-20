import './react-global';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../src/context/AppContext';
import { LiveFeedPage } from '../src/pages/LiveFeedPage';
import { TrendingPage } from '../src/pages/TrendingPage';
import { MessengerUpdatesPage } from '../src/pages/MessengerUpdatesPage';
import { CommunityPage } from '../src/pages/CommunityPage';

const LANGS = (process.env.CWN_LANGS || 'en,ha,ig,yo,pcm,ff,kr').split(',');

function clean(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

let failures = 0;

for (const lang of LANGS) {
  const store: Record<string, string> = { cwn_lang: lang, cwn_theme: 'light', cwn_edition: 'web' };
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  };
  (globalThis as any).navigator = { onLine: true, language: `${lang}-NG`, geolocation: undefined };
  (globalThis as any).window = globalThis;
  (globalThis as any).document = {
    documentElement: { setAttribute: () => {}, lang: '' },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (globalThis as any).matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
  (globalThis as any).addEventListener = () => {};
  (globalThis as any).removeEventListener = () => {};
  (globalThis as any).fetch = async () => ({ ok: true, json: async () => ({}) });

  const pages: Array<[string, React.ReactElement]> = [
    ['live-feed', <LiveFeedPage />],
    ['trending', <TrendingPage />],
    ['messenger', <MessengerUpdatesPage />],
    ['community', <CommunityPage />],
  ];

  for (const [name, element] of pages) {
    try {
      const text = clean(
        renderToString(
          <MemoryRouter>
            <AppProvider>{element}</AppProvider>
          </MemoryRouter>
        )
      );
      if (text.length < 200) {
        failures += 1;
        console.log(`FAIL ${lang}/${name}: rendered only ${text.length} chars`);
      } else {
        console.log(`ok   ${lang}/${name}: ${text.slice(0, 96)}…`);
      }
    } catch (error) {
      failures += 1;
      console.log(`FAIL ${lang}/${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

console.log(failures === 0 ? 'all integration screens render' : `${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
