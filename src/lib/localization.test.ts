import { afterEach, describe, expect, it } from 'vitest';
import { applyDocumentLocale, DATE_LOCALES, translate, translateRenderedText } from '@/lib/localization';

describe('localization', () => {
  afterEach(() => applyDocumentLocale('fr'));

  it('traduit les libellés du shell et conserve les textes inconnus', () => {
    expect(translate('en', 'Paramètres')).toBe('Settings');
    expect(translate('ar', 'Déconnexion')).toBe('تسجيل الخروج');
    expect(translate('en', 'Aucune donnée')).toBe('No data');
    expect(translate('ar', 'Enregistrer')).toBe('حفظ');
    expect(translate('en', 'Texte métier inconnu')).toBe('Texte métier inconnu');
  });

  it('expose une locale Intl adaptée à chaque langue', () => {
    expect(DATE_LOCALES).toEqual({ fr: 'fr-DZ', ar: 'ar-DZ', en: 'en-GB' });
  });

  it('traduit uniquement les textes exacts et les compteurs reconnus', () => {
    expect(translateRenderedText('en', '  Enregistrer  ')).toBe('  Save  ');
    expect(translateRenderedText('ar', 'Enregistrer')).toBe('حفظ');
    expect(translateRenderedText('en', '3 en attente')).toBe('3 pending');
    expect(translateRenderedText('ar', '3 en attente')).toBe('3 قيد الانتظار');
    expect(translateRenderedText('ar', 'bg-card border rounded-xl p-4')).toBe('bg-card border rounded-xl p-4');
    expect(translateRenderedText('fr', 'Enregistrer')).toBe('Enregistrer');
  });

  it('utilise le glossaire métier plutôt que les traductions littérales', () => {
    expect(translateRenderedText('en', 'chambre(s) en ménage')).toBe('room(s) being cleaned');
    expect(translateRenderedText('en', 'pointage(s) en attente de validation.')).toBe('attendance record(s) awaiting approval.');
    expect(translateRenderedText('ar', 'Clôture journalière')).toBe('الإقفال اليومي');
    expect(translateRenderedText('ar', 'ex: STD, SUP, DLX')).toBe('مثال: STD، SUP، DLX');
  });

  it('applique la langue et la direction au document', () => {
    applyDocumentLocale('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');

    applyDocumentLocale('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
