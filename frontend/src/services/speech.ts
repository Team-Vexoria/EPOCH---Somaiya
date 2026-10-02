import type { Language } from '../types';

/**
 * Speech Recognition and Synthesis Service
 * Uses standard browser Web Speech APIs with graceful fallbacks.
 */

// Global state to track active speech synthesis
let isSpeakingActive = false;

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
}

export function getLanguageCodeForSpeech(lang: Language): string {
  switch (lang) {
    case 'mr':
      return 'mr-IN';
    case 'hi':
      return 'hi-IN';
    case 'en':
    default:
      return 'en-IN';
  }
}

/**
 * Reads aloud given text using SpeechSynthesis in the chosen language.
 */
export function speakText(
  text: string,
  lang: Language,
  onStart?: () => void,
  onEnd?: () => void
): void {
  if (!isSpeechSynthesisSupported()) return;

  // Stop any currently speaking utterance
  stopSpeaking();

  // Strip Markdown characters and HTML tags for natural speech
  const plainText = text
    .replace(/[#*`_~\[\]()]/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plainText) return;

  const utterance = new SpeechSynthesisUtterance(plainText);
  const langCode = getLanguageCodeForSpeech(lang);
  utterance.lang = langCode;
  utterance.rate = 0.95; // Slightly slower for clarity in rural Indian context
  utterance.pitch = 1.0;

  // Try matching a voice for the language
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(
    (v) => v.lang.toLowerCase() === langCode.toLowerCase() || v.lang.startsWith(lang)
  );
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  utterance.onstart = () => {
    isSpeakingActive = true;
    onStart?.();
  };

  utterance.onend = () => {
    isSpeakingActive = false;
    onEnd?.();
  };

  utterance.onerror = () => {
    isSpeakingActive = false;
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Halts active spoken audio playback.
 */
export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
    isSpeakingActive = false;
  }
}

export function getIsSpeaking(): boolean {
  return isSpeakingActive;
}

/**
 * Creates and configures a SpeechRecognition instance for voice capture.
 */
export function createSpeechRecognizer(
  lang: Language,
  onInterim: (text: string) => void,
  onFinal: (text: string) => void,
  onError: (err: any) => void,
  onEnd: () => void
): any | null {
  if (!isSpeechRecognitionSupported()) return null;

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  const recognizer = new SpeechRecognition();
  recognizer.continuous = false;
  recognizer.interimResults = true;
  recognizer.lang = getLanguageCodeForSpeech(lang);

  recognizer.onresult = (event: any) => {
    let interimText = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        onFinal(event.results[i][0].transcript);
      } else {
        interimText += event.results[i][0].transcript;
      }
    }
    if (interimText) {
      onInterim(interimText);
    }
  };

  recognizer.onerror = (event: any) => {
    onError(event);
  };

  recognizer.onend = () => {
    onEnd();
  };

  return recognizer;
}
