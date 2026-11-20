import { TRANSLATIONS, LANGUAGES } from '../src/data/i18n';
import { en } from '../src/data/i18n/en';

const keys = Object.keys(en) as Array<keyof typeof en>;
const allowSame = new Set(['brandName']);

let problems = 0;
for (const { code } of LANGUAGES) {
  const dict = TRANSLATIONS[code] as Record<string, unknown>;
  const missing = keys.filter((k) => !(k in dict));
  if (missing.length) { console.log(code, 'MISSING', missing); problems += missing.length; }
  for (const k of keys) {
    const v = dict[k];
    if (typeof v === 'string' && v.trim() === '') { console.log(code, 'EMPTY', k); problems++; }
    if (Array.isArray(v) && v.length === 0) { console.log(code, 'EMPTY ARRAY', k); problems++; }
  }
  if (code !== 'en') {
    const same = keys.filter((k) => {
      if (allowSame.has(k)) return false;
      const a = (en as Record<string, unknown>)[k];
      const b = dict[k];
      return typeof a === 'string' && a === b;
    });
    console.log(`${code}: ${keys.length} keys, untranslated(same-as-English)=${same.length}`, same.slice(0, 12));
  }
}
console.log('total keys', keys.length, 'problems', problems);
console.log('ha sample:', TRANSLATIONS.ha.heroGreeting, '|', TRANSLATIONS.ha.chooseToday);
console.log('ig sample:', TRANSLATIONS.ig.heroGreeting, '|', TRANSLATIONS.ig.chooseToday);
