import { useAppStore } from '../store/useAppStore';

/**
 * openWhatsAppBot
 *
 * Opens the WhatsApp AI Assistant for Sell Smart.
 *
 * Behavior:
 * 1. By default, opens the interactive in-app WhatsApp Bot Dialog & Simulator
 *    so the user can chat with the AI assistant in real-time right inside the app.
 * 2. In that dialog, the user can also click "Open in WhatsApp App" to open a
 *    1-on-1 direct chat with Twilio Sandbox or configured Meta Business Number.
 * 3. Never opens the broken "Share on WhatsApp" broadcast screen.
 */
export function openWhatsAppBot(): void {
  useAppStore.getState().setIsWhatsAppModalOpen(true);
}

/**
 * openWhatsAppDirect
 * Opens direct one-on-one chat with a specific phone number on WhatsApp Web / Mobile
 */
export function openWhatsAppDirect(phoneNumber?: string, initialText?: string): void {
  const number = phoneNumber || (import.meta.env.VITE_WA_BUSINESS_NUMBER as string | undefined)?.trim() || '14155238886';
  const textParam = initialText ? `?text=${encodeURIComponent(initialText)}` : '';
  window.open(`https://wa.me/${number}${textParam}`, '_blank', 'noopener,noreferrer');
}
