import { useLanguageStore } from '@/store/languageStore';
import { translations } from '@/i18n/translations';

export function useTranslation() {
  const { language } = useLanguageStore();
  
  const t = translations[language];
  
  // Helper function for interpolation
  const interpolate = (text: string, params: Record<string, string | number>) => {
    return Object.entries(params).reduce((acc, [key, value]) => {
      return acc.replace(`{${key}}`, String(value));
    }, text);
  };
  
  return { t, language, interpolate };
}
