import { useCallback } from 'react';
import { useI18nStore } from '../stores/i18nStore';
import { translate } from '../i18n';

export function useT() {
  const locale = useI18nStore((s) => s.locale);
  return useCallback((key) => translate(locale, key), [locale]);
}
