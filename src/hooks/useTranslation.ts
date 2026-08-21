import { useCallback } from 'react';
import { translate } from '@/lib/localization';
import { useUiStore } from '@/stores/ui.store';

export function useTranslation() {
  const locale = useUiStore((state) => state.locale);
  const t = useCallback((text: string) => translate(locale, text), [locale]);

  return { locale, t };
}
