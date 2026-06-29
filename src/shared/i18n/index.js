import en from './locales/en.js';
import ru from './locales/ru.js';
import es from './locales/es.js';
import fr from './locales/fr.js';
import de from './locales/de.js';
import pt from './locales/pt.js';
import it from './locales/it.js';
import zh from './locales/zh.js';
import ja from './locales/ja.js';
import ko from './locales/ko.js';
import ar from './locales/ar.js';
import hi from './locales/hi.js';
import { normalizeLanguage } from '../constants/languages';

export const translations = { en, ru, es, fr, de, pt, it, zh, ja, ko, ar, hi };

export const LANGUAGE_TO_LOCALE = {
  English: 'en',
  Spanish: 'es',
  French: 'fr',
  German: 'de',
  Portuguese: 'pt',
  Italian: 'it',
  Russian: 'ru',
  'Chinese (Simplified)': 'zh',
  Japanese: 'ja',
  Korean: 'ko',
  Arabic: 'ar',
  Hindi: 'hi',
};

export function resolveLocale(languageName) {
  if (!languageName) return 'en';
  const normalized = normalizeLanguage(languageName);
  return LANGUAGE_TO_LOCALE[normalized] || 'en';
}

export function translate(locale, key) {
  const dict = translations[locale] || translations.en;
  return dict[key] ?? translations.en[key] ?? key;
}
