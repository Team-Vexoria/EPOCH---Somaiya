import { useAppStore } from '../store/useAppStore';

/**
 * openWhatsAppBot
 *
 * Directly redirects to WhatsApp to chat with the Sell Smart AI Assistant.
 * Opens a 1-on-1 direct conversation on WhatsApp Web / Mobile.
 */
export function openWhatsAppBot(customGreeting?: string): void {
  const envNumber = (import.meta.env.VITE_WA_BUSINESS_NUMBER as string | undefined)?.trim();
  const userPhone = useAppStore.getState().phone?.replace(/\D/g, '') || '';
  const currentLang = useAppStore.getState().language || 'mr';

  // Destination phone number for the WhatsApp chat
  const targetNumber = envNumber || userPhone || '919822012345';

  const defaultGreeting =
    customGreeting ||
    (currentLang === 'mr'
      ? 'नमस्कार, मला नाशिक बाजार समितीमधील कांदा/टोमॅटो विक्री सल्ला हवा आहे.'
      : currentLang === 'hi'
      ? 'नमस्ते, मुझे नासिक मंडी में फसल बिक्री का परामर्श चाहिए।'
      : 'Hello, I need agricultural advisory for selling crops in Nashik mandis.');

  const cleanNumber = targetNumber.startsWith('91') || targetNumber.length > 10 ? targetNumber : `91${targetNumber}`;
  const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(defaultGreeting)}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}
