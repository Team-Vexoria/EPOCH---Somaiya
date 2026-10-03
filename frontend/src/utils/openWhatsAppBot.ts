/**
 * openWhatsAppBot
 *
 * Directly redirects to WhatsApp to chat with the Mohra AI Assistant
 * (Meta Business number). Opens a 1-on-1 conversation on WhatsApp Web / Mobile.
 *
 * Target number = VITE_WA_BUSINESS_NUMBER env var (Meta test: +1 555 630-1922)
 */
export function openWhatsAppBot(customGreeting?: string): void {
  // Always use the configured Business number — never the farmer's own phone
  const envNumber = (import.meta.env.VITE_WA_BUSINESS_NUMBER as string | undefined)?.trim();

  // Meta test number fallback (+1 555 630-1922 = 15556301922)
  const targetNumber = envNumber || '15556301922';

  // Detect language from localStorage / document lang
  const storedLang = localStorage.getItem('i18nextLng') || localStorage.getItem('Mohra_language') || 'en';
  const currentLang = storedLang.startsWith('hi') ? 'hi' : storedLang.startsWith('mr') ? 'mr' : 'en';

  const defaultGreeting =
    customGreeting ||
    (currentLang === 'mr'
      ? 'नमस्कार, मला नाशिक बाजार समितीमधील कांदा/टोमॅटो विक्री सल्ला हवा आहे.'
      : currentLang === 'hi'
      ? 'नमस्ते, मुझे नासिक मंडी में फसल बिक्री का परामर्श चाहिए।'
      : 'Hello, I need agricultural advisory for selling crops in Nashik mandis.');

  const cleanNumber = targetNumber.replace(/\D/g, '');
  const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(defaultGreeting)}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}
