import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import mr from './locales/mr.json';
import hi from './locales/hi.json';
import en from './locales/en.json';

const savedLang = localStorage.getItem('Mohra_language') || 'en';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      mr: { translation: mr },
      hi: { translation: hi },
      en: { translation: en },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'Mohra_language',
      caches: ['localStorage'],
    },
  });

export function formatRupee(amount: number): string {
  // Format to Indian Currency format: e.g. ₹1,85,000
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default i18n;
