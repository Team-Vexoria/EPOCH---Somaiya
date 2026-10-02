import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import mr from './locales/mr.json';
import hi from './locales/hi.json';
import en from './locales/en.json';

const savedLang = localStorage.getItem('sellsmart_language') || 'mr';

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
    fallbackLng: 'mr', // Default language is Marathi per hackathon brief
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'sellsmart_language',
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
