import { create } from 'zustand';
import { resolveLocale, translate } from '../i18n';

const LOCALE_STORAGE_KEY = 'meract_locale';

function readStoredLocale() {
  if (typeof localStorage === 'undefined') return 'en';
  return localStorage.getItem(LOCALE_STORAGE_KEY) || 'en';
}

function applyDocumentLocale(locale) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

export const useI18nStore = create((set, get) => ({
  locale: readStoredLocale(),

  setLocaleFromLanguageName: (languageName) => {
    const locale = resolveLocale(languageName);
    set({ locale });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
    applyDocumentLocale(locale);
  },

  t: (key) => translate(get().locale, key),
}));

applyDocumentLocale(readStoredLocale());
