import type { LangCode, LanguageOption, TranslationKeys } from './types';
import { en } from './en';
import { pcm } from './pcm';
import { ha } from './ha';
import { yo } from './yo';
import { ig } from './ig';
import { ff } from './ff';
import { kr } from './kr';

export type { LangCode, LanguageOption, TranslationKeys };

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', bcp47: 'en-NG' },
  { code: 'pcm', nativeName: 'Naija Pidgin', englishName: 'Nigerian Pidgin', bcp47: 'en-NG' },
  { code: 'ha', nativeName: 'Hausa', englishName: 'Hausa', bcp47: 'ha-NG' },
  { code: 'yo', nativeName: 'Yorùbá', englishName: 'Yoruba', bcp47: 'yo-NG' },
  { code: 'ig', nativeName: 'Ásụ̀sụ́ Ìgbò', englishName: 'Igbo', bcp47: 'ig-NG' },
  { code: 'ff', nativeName: 'Fulfulde', englishName: 'Fulfulde', bcp47: 'ff-NG' },
  { code: 'kr', nativeName: 'Kanuri', englishName: 'Kanuri', bcp47: 'kr-NG' },
];

export const TRANSLATIONS: Record<LangCode, TranslationKeys> = {
  en,
  pcm,
  ha,
  yo,
  ig,
  ff,
  kr,
};

export function detectPreferredLanguage(): LangCode {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem('cwn_lang') as LangCode | null;
  if (saved && LANGUAGES.some((l) => l.code === saved)) return saved;
  const nav = (navigator.language || 'en').toLowerCase();
  if (nav.startsWith('ha')) return 'ha';
  if (nav.startsWith('yo')) return 'yo';
  if (nav.startsWith('ig')) return 'ig';
  if (nav.startsWith('ff')) return 'ff';
  if (nav.startsWith('kr')) return 'kr';
  return 'en';
}
