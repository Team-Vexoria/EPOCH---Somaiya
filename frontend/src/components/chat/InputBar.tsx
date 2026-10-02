import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Send, Square } from 'lucide-react';
import {
  isSpeechRecognitionSupported,
  createSpeechRecognizer,
} from '../../services/speech';
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
  const [interimText, setInterimText] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognizerRef = useRef<any>(null);

  const speechSupported = isSpeechRecognitionSupported();

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

  // Handle Speech Recognition toggle
  const handleToggleMic = () => {
    if (!speechSupported) return;

    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
      setInterimText('');
      return;
    }

    try {
      const recognizer = createSpeechRecognizer(
        language,
        (interim) => {
          setInterimText(interim);
        },
        (final) => {
          setInput((prev) => (prev ? `${prev} ${final}` : final));
          setInterimText('');
        },
        (err) => {
          console.error('Speech recognition error:', err);
          setIsListening(false);
          setInterimText('');
        },
        () => {
          setIsListening(false);
          setInterimText('');
        }
      );

      if (recognizer) {
        recognizerRef.current = recognizer;
        recognizer.start();
        setIsListening(true);
      }
    } catch (err) {
      console.error('Could not start speech recognition:', err);
      setIsListening(false);
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
      recognizerRef.current?.stop();
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

  const displayText = interimText ? (input ? `${input} [${interimText}]` : `[${interimText}]`) : input;

  return (
    <div className="w-full bg-neutral-surface border-t-2 border-neutral-ink p-3 sm:p-4 shrink-0">
      <div className="max-w-3xl mx-auto">
        {/* Main Input Box Container */}
        <div
          className={`relative border-2 border-neutral-ink shadow-hard bg-neutral-surface flex items-end gap-2 p-2 sm:p-2.5 transition-all ${
            isListening ? 'ring-2 ring-risk' : 'focus-within:ring-2 focus-within:ring-primary'
          }`}
        >
          {/* Mic Button */}
          <button
            type="button"
            onClick={handleToggleMic}
            disabled={!speechSupported || isStreaming}
            title={
              speechSupported
                ? isListening
                  ? t('chat.stopListening')
                  : t('chat.listening', { lang: language.toUpperCase() })
                : t('chat.micNotSupported')
            }
            aria-label="Voice input"
            className={`p-2.5 border-2 border-neutral-ink shadow-hard transition-colors shrink-0 ${
              isListening
                ? 'bg-risk text-risk-fg animate-pulse'
                : speechSupported
                ? 'bg-neutral-bg text-neutral-ink hover:bg-primary-subtle hover:text-primary cursor-pointer'
                : 'bg-neutral-bg text-neutral-muted opacity-40 cursor-not-allowed'
            }`}
          >
            {isListening ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Auto-growing Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={displayText}
            onChange={(e) => {
              if (!interimText) setInput(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? t('chat.listening', { lang: language.toUpperCase() })
                : t('chat.inputPlaceholder')
            }
            className="flex-1 py-1.5 px-2 text-base font-semibold text-neutral-ink placeholder:text-neutral-muted resize-none focus:outline-none bg-transparent max-h-36 leading-normal"
          />

          {/* Send / Stop Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!isStreaming && !input.trim() && !interimText.trim()}
            title={isStreaming ? t('chat.stop') : t('chat.send')}
            aria-label={isStreaming ? 'Stop generation' : 'Send message'}
            className={`p-2.5 border-2 border-neutral-ink shadow-hard font-bold transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
              isStreaming
                ? 'bg-neutral-ink text-neutral-surface'
                : 'bg-primary hover:bg-primary-hover text-primary-fg'
            }`}
          >
            {isStreaming ? (
              <Square className="w-5 h-5 fill-current" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Small Disclaimer Footer */}
        <p className="mt-2 text-center text-xs text-neutral-muted select-none">
          {t('chat.disclaimer')}
        </p>
      </div>
    </div>
  );
};

export default InputBar;
