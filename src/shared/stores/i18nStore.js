import { create } from 'zustand';
import { resolveLocale, translate } from '../i18n';

export const useI18nStore = create((set, get) => ({
  locale: 'en',

  setLocaleFromLanguageName: (languageName) => {
    const locale = resolveLocale(languageName);
    set({ locale });
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    }
  },

  t: (key) => translate(get().locale, key),
}));
