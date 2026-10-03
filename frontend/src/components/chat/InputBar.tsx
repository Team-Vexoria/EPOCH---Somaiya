import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Send, Square, Globe, Loader2, Sparkles } from 'lucide-react';
import {
  isSpeechRecognitionSupported,
  createSpeechRecognizer,
  AudioRecorder,
} from '../../services/speech';
import { transcribeAudio } from '../../api/client';
import type { Language } from '../../types';

interface InputBarProps {
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  isStreaming: boolean;
  language: Language;
}

export const InputBar: React.FC<InputBarProps> = ({
  onSendMessage,
  onStopStreaming,
  isStreaming,
  language,
}) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimText, setInterimText] = useState('');
  
  // Dedicated voice language (allows farmer to speak in Marathi even if UI is in English)
  const [voiceLang, setVoiceLang] = useState<Language>(language || 'mr');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognizerRef = useRef<any>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const hasRecognizedTextRef = useRef(false);
  // Bug #2 fix: ref mirrors isListening state so callbacks can read it without
  // stale-closure issues (state inside a callback is captured at creation time).
  const isListeningRef = useRef(false);

  // Bug #5 fix: only seed voiceLang once on mount — do NOT re-run on every
  // language prop change or it silently resets the farmer's manual selection.
  useEffect(() => {
    if (language) setVoiceLang(language);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — seed only on mount

  // Auto-grow textarea up to max 6 lines (~144px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        144
      )}px`;
    }
  }, [input, interimText]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      recognizerRef.current?.stop();
      audioRecorderRef.current?.stop().catch(() => {});
      audioRecorderRef.current = null;
    };
  }, []);

  // Handle Speech Recognition toggle
  const handleToggleMic = async () => {
    if (isListening) {
      // User tapped to stop recording
      isListeningRef.current = false;
      setIsListening(false);
      recognizerRef.current?.stop();

      // If user spoke and text was still in interim buffer, commit it immediately
      const currentInterim = interimText.trim();
      if (currentInterim && !hasRecognizedTextRef.current) {
        setInput((prev) => (prev ? `${prev} ${currentInterim}` : currentInterim));
        hasRecognizedTextRef.current = true;
      }

      // If MediaRecorder was active and WebSpeech captured nothing, fallback to Whisper
      if (audioRecorderRef.current) {
        try {
          setIsTranscribing(true);
          const audioBlob = await audioRecorderRef.current.stop();
          if (!hasRecognizedTextRef.current && audioBlob.size > 1000) {
            const res = await transcribeAudio(audioBlob, voiceLang);
            if (res.text) {
              setInput((prev) => (prev ? `${prev} ${res.text}` : res.text));
            }
          }
        } catch (err) {
          console.warn('Whisper fallback error:', err);
        } finally {
          setIsTranscribing(false);
          audioRecorderRef.current = null;
        }
      }

      setInterimText('');
      return;
    }

    // Start recording & listening
    setIsListening(true);
    isListeningRef.current = true;
    setInterimText('');
    hasRecognizedTextRef.current = false;

    // Start MediaRecorder in parallel for high-fidelity audio capture fallback
    try {
      const recorder = new AudioRecorder();
      await recorder.start();
      audioRecorderRef.current = recorder;
    } catch (e) {
      console.warn('MediaRecorder not available or permission denied, using browser STT:', e);
    }

    // Start browser SpeechRecognition
    try {
      const recognizer = createSpeechRecognizer(
        voiceLang,
        (interim) => {
          setInterimText(interim);
        },
        (final) => {
          if (final.trim()) {
            hasRecognizedTextRef.current = true;
            setInput((prev) => (prev ? `${prev} ${final}` : final));
            setInterimText('');
          }
        },
        async (err) => {
          console.warn('Browser speech recognition notice:', err);
          // If permission is denied, stop listening immediately
          if (err?.error === 'not-allowed' || err?.error === 'service-not-allowed') {
            isListeningRef.current = false;
            setIsListening(false);
            setInterimText('');
          }
        },
        () => {
          // Bug #2 fix: if the user hasn't manually stopped, restart the recognizer.
          // Wait 150ms before restart to avoid Chrome InvalidStateError race condition.
          if (isListeningRef.current && recognizerRef.current) {
            setTimeout(() => {
              if (isListeningRef.current && recognizerRef.current) {
                try {
                  recognizerRef.current.start();
                } catch (e) {
                  console.debug('Speech recognition restart attempt:', e);
                }
              }
            }, 150);
          } else {
            setIsListening(false);
            setInterimText('');
          }
        }
      );

      if (recognizer) {
        recognizerRef.current = recognizer;
        recognizer.start();
      }
    } catch (err) {
      console.warn('SpeechRecognition start failed, relying on audio recording:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (isStreaming) {
      onStopStreaming();
      return;
    }

    const textToSend = (input + (interimText ? ` ${interimText}` : '')).trim();
    if (!textToSend) return;

    if (isListening) {
      isListeningRef.current = false;
      recognizerRef.current?.stop();
      audioRecorderRef.current?.stop().catch(() => {});
      audioRecorderRef.current = null;
      setIsListening(false);
      setInterimText('');
    }

    onSendMessage(textToSend);
    setInput('');
    setInterimText('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const voiceLangLabels = {
    mr: { label: 'मराठी', hint: 'मराठीत बोला (उदा. "कांदा कधी विकू?")' },
    hi: { label: 'हिंदी', hint: 'हिंदी में बोलें (उदा. "टमाटर का भाव क्या है?")' },
    en: { label: 'English', hint: 'Speak in English (e.g. "Where should I sell?")' },
  };

  const activeLangConfig = voiceLangLabels[voiceLang] || voiceLangLabels.mr;

  return (
    <div className="w-full bg-neutral-surface border-t-2 border-neutral-ink p-3 sm:p-4 shrink-0">
      <div className="max-w-3xl mx-auto space-y-2">
        
        {/* Voice Language Selector & Voice Status Bar */}
        <div className="flex items-center justify-between text-xs font-bold px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-muted flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>{voiceLang === 'mr' ? 'बोलण्याची भाषा:' : voiceLang === 'hi' ? 'बोलने की भाषा:' : 'Voice Language:'}</span>
            </span>
            <div className="inline-flex bg-neutral-bg border border-neutral-ink p-0.5 gap-0.5 shadow-sm">
              {(['mr', 'hi', 'en'] as const).map((langCode) => (
                <button
                  key={langCode}
                  type="button"
                  onClick={() => {
                    setVoiceLang(langCode);
                    if (isListening) {
                      recognizerRef.current?.stop();
                      setIsListening(false);
                    }
                  }}
                  className={`px-2 py-0.5 font-black text-xs transition-colors cursor-pointer ${
                    voiceLang === langCode
                      ? 'bg-primary text-primary-fg border border-neutral-ink'
                      : 'text-neutral-ink hover:bg-neutral-surface'
                  }`}
                >
                  {voiceLangLabels[langCode].label}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Listening / Transcribing Indicator */}
          {isListening && (
            <div className="flex items-center gap-1.5 text-risk font-black animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-risk inline-block"></span>
              <span>
                {voiceLang === 'mr'
                  ? 'ऐकत आहे (मराठी)...'
                  : voiceLang === 'hi'
                  ? 'सुन रहा है (हिंदी)...'
                  : 'Listening (English)...'}
              </span>
            </div>
          )}

          {isTranscribing && (
            <div className="flex items-center gap-1.5 text-primary font-black">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Transcribing voice...</span>
            </div>
          )}
        </div>

        {/* Main Input Box Container */}
        <div
          className={`relative border-2 border-neutral-ink shadow-hard bg-neutral-surface flex items-end gap-2 p-2 sm:p-2.5 transition-all ${
            isListening ? 'ring-2 ring-risk' : 'focus-within:ring-2 focus-within:ring-primary'
          }`}
        >
          {/* Mic Button with Pulse Ring */}
          <button
            type="button"
            onClick={handleToggleMic}
            disabled={isStreaming || isTranscribing}
            title={
              isListening
                ? 'Stop recording (क्लिक करून थांबवा)'
                : `Record voice in ${activeLangConfig.label} (${activeLangConfig.label} मध्ये बोला)`
            }
            aria-label="Voice input"
            className={`p-2.5 border-2 border-neutral-ink shadow-hard transition-all shrink-0 cursor-pointer ${
              isListening
                ? 'bg-risk text-risk-fg animate-pulse scale-105'
                : 'bg-neutral-bg text-neutral-ink hover:bg-primary hover:text-primary-fg'
            }`}
          >
            {isListening ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5 text-primary" />
            )}
          </button>

          {/* Auto-growing Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? activeLangConfig.hint
                : voiceLang === 'mr'
                ? 'कांदा, टोमॅटो किंवा सोयाबीन विक्रीबद्दल प्रश्न विचारा किंवा माइक दाबा...'
                : voiceLang === 'hi'
                ? 'फसल बिक्री या मंडी भाव के बारे में पूछें या माइक दबाएं...'
                : 'Ask a question about crop prices, or click mic to speak...'
            }
            aria-label="Message input"
            className="flex-1 max-h-36 bg-transparent resize-none border-0 text-base text-neutral-ink placeholder:text-neutral-muted focus:outline-none focus:ring-0 p-1 leading-relaxed font-medium"
          />

          {/* Send / Stop Streaming Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={(!input.trim() && !interimText.trim() && !isStreaming) || isTranscribing}
            aria-label={isStreaming ? 'Stop generation' : 'Send message'}
            className={`p-2.5 border-2 border-neutral-ink shadow-hard transition-colors shrink-0 ${
              isStreaming
                ? 'bg-risk text-risk-fg hover:bg-risk-hover cursor-pointer'
                : input.trim() || interimText.trim()
                ? 'bg-primary text-primary-fg hover:bg-primary-hover cursor-pointer active:translate-x-0.5 active:translate-y-0.5'
                : 'bg-neutral-bg text-neutral-muted opacity-40 cursor-not-allowed'
            }`}
          >
            {isStreaming ? (
              <Square className="w-5 h-5 fill-current" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Live Interim Transcript Pill while Speaking */}
        {interimText && (
          <div className="p-2 bg-neutral-bg border border-neutral-ink text-sm font-bold text-neutral-ink flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sell animate-ping shrink-0"></span>
            <span className="italic">"{interimText}"</span>
          </div>
        )}

      </div>
    </div>
  );
};

export default InputBar;
