import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@/i18n/translations';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'nl', // Default to Dutch
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'fashion-pulse-language',
    }
  )
);
