import './react-global';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../src/context/AppContext';
import { LandingPage } from '../src/pages/LandingPage';
import { HomePage } from '../src/pages/HomePage';
import { AppShell } from '../src/components/AppShell';

// Minimal browser stubs so AppProvider can initialise during server rendering
const LANG = process.env.CWN_LANG || 'ig';
const store: Record<string, string> = { cwn_lang: LANG, cwn_theme: 'light', cwn_edition: 'web' };
(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};
(globalThis as any).navigator = { onLine: true, language: `${LANG}-NG`, geolocation: undefined };
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

function clean(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const landing = clean(
  renderToString(
    <MemoryRouter>
      <AppProvider>
        <LandingPage />
      </AppProvider>
    </MemoryRouter>
  )
);

const home = clean(
  renderToString(
    <MemoryRouter>
      <AppProvider>
        <HomePage />
      </AppProvider>
    </MemoryRouter>
  )
);

const shell = clean(
  renderToString(
    <MemoryRouter initialEntries={['/home']}>
      <AppProvider>
        <AppShell>
          <p>child</p>
        </AppShell>
      </AppProvider>
    </MemoryRouter>
  )
);

console.log('--- SHELL NAV (' + LANG + ') ---');
console.log(shell.slice(0, 520));
console.log('\n--- LANDING (' + LANG + ') ---');
console.log(landing.slice(0, 700));
console.log('\n--- HOME (Igbo) ---');
console.log(home.slice(0, 900));
console.log('\ncontains English promo line:', /Independent|Non-partisan|36 states/.test(landing + home));
