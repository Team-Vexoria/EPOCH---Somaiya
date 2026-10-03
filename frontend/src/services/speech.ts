import type { Language } from '../types';

/**
 * Speech Recognition and Synthesis Service
 * Supports Marathi (mr-IN), Hindi (hi-IN), and English (en-IN).
 * Uses browser Web Speech API with Groq Whisper audio fallback.
 */

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

export function getLanguageCodeForSpeech(lang: Language | string): string {
  const clean = (lang || 'mr').toLowerCase();
  if (clean.startsWith('mr') || clean.includes('marathi')) {
    return 'mr-IN';
  }
  if (clean.startsWith('hi') || clean.includes('hindi')) {
    return 'hi-IN';
  }
  return 'en-IN';
}

/**
 * Reads aloud given text using SpeechSynthesis in the appropriate language voice.
 */
export function speakText(
  text: string,
  lang: Language | string,
  onStart?: () => void,
  onEnd?: () => void
): void {
  if (!isSpeechSynthesisSupported()) return;

  stopSpeaking();

  // Strip Markdown formatting and asterisks for natural human speech
  const plainText = text
    .replace(/[#*`_~\[\]()|]/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[-]{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plainText) return;

  // Auto-detect language if text is in Devanagari vs Latin
  let effectiveLangCode = getLanguageCodeForSpeech(lang);
  const isDevanagari = /[\u0900-\u097F]/.test(plainText);
  if (isDevanagari && !effectiveLangCode.startsWith('mr') && !effectiveLangCode.startsWith('hi')) {
    // Check for Marathi-specific words
    const isMarathi = /\b(आहे|नाही|करा|द्या|शेतकरी|लासलगाव|क्विंटल|बाजार)\b/.test(plainText);
    effectiveLangCode = isMarathi ? 'mr-IN' : 'hi-IN';
  }

  const utterance = new SpeechSynthesisUtterance(plainText);
  utterance.lang = effectiveLangCode;
  utterance.rate = 0.95; // Clear natural pacing for Indian context
  utterance.pitch = 1.0;

  // Try matching system voice for the language
  const voices = window.speechSynthesis.getVoices();
  const langPrefix = effectiveLangCode.split('-')[0].toLowerCase();

  const matchedVoice = voices.find(
    (v) =>
      v.lang.toLowerCase() === effectiveLangCode.toLowerCase() ||
      v.lang.toLowerCase().startsWith(langPrefix) ||
      (langPrefix === 'mr' && v.name.toLowerCase().includes('marathi')) ||
      (langPrefix === 'hi' && v.name.toLowerCase().includes('hindi'))
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
 * Creates and configures a SpeechRecognition instance for real-time live voice capture.
 */
export function createSpeechRecognizer(
  lang: Language | string,
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

/**
 * Helper class to record audio via MediaRecorder for Groq Whisper transcription.
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    this.audioChunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Choose best supported audio mime type
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : '';

    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(new Blob([], { type: 'audio/webm' }));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || 'audio/webm',
        });
        if (this.stream) {
          this.stream.getTracks().forEach((t) => t.stop());
          this.stream = null;
        }
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }
}
