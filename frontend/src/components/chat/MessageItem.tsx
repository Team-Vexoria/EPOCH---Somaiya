import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import {
  Sprout,
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  User,
} from 'lucide-react';
import type { Message, Language } from '../../types';
import { RecommendationCard } from './RecommendationCard';
import { speakText, stopSpeaking, getIsSpeaking } from '../../services/speech';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onFeedback?: (feedback: 'up' | 'down') => void;
  onOpenCalculator?: (cropId: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isStreaming = false,
  onRegenerate,
  onFeedback,
  onOpenCalculator,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language as Language) || 'mr';

  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
    } else {
      speakText(
        message.content,
        currentLang,
        () => setIsPlayingAudio(true),
        () => setIsPlayingAudio(false)
      );
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[85%] sm:max-w-[75%] bg-neutral-ink text-neutral-surface border-2 border-neutral-ink shadow-hard p-3.5 sm:p-4 text-base font-semibold leading-relaxed">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 sm:gap-4 mb-6 group">
      {/* Assistant Avatar */}
      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary text-primary-fg border-2 border-neutral-ink shadow-hard flex items-center justify-center font-bold shrink-0 mt-0.5 select-none">
        <Sprout className="w-5 h-5" />
      </div>

      {/* Assistant Content Container */}
      <div className="flex-1 min-w-0">
        <div className="text-base text-neutral-ink leading-relaxed font-normal">
          {message.content ? (
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-black text-neutral-ink mt-3 mb-2">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-extrabold text-neutral-ink mt-3 mb-2">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-bold text-neutral-ink mt-2 mb-1.5">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-2 text-base leading-relaxed text-neutral-ink">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 mb-2 ml-1 text-base">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 mb-2 ml-1 text-base">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-base text-neutral-ink leading-relaxed">
                    {children}
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-extrabold text-neutral-ink">
                    {children}
                  </strong>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3 border-2 border-neutral-ink">
                    <table className="w-full text-left text-sm">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="bg-neutral-bg p-2 border-b-2 border-neutral-ink font-bold text-neutral-ink">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="p-2 border-b border-neutral-border text-neutral-ink font-medium">
                    {children}
                  </td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : isStreaming ? (
            <div className="flex items-center gap-1.5 py-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"></span>
              <span
                className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: '0.15s' }}
              ></span>
              <span
                className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: '0.3s' }}
              ></span>
            </div>
          ) : null}

          {/* Streaming blinking cursor */}
          {isStreaming && message.content && (
            <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
          )}
        </div>

        {/* Structured Recommendation Card */}
        {message.recommendation && (
          <RecommendationCard
            recommendation={message.recommendation}
            onOpenCalculator={onOpenCalculator}
          />
        )}

        {/* Assistant Action Bar (Copy, Read aloud, Regenerate, Thumbs) */}
        {!isStreaming && message.content && (
          <div className="flex items-center gap-1.5 mt-3 pt-2 text-neutral-muted">
            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              title={copied ? t('chat.copied') : t('chat.copy')}
              aria-label="Copy response"
              className="p-1.5 hover:text-neutral-ink hover:bg-neutral-bg border border-transparent hover:border-neutral-border transition-colors flex items-center gap-1 text-sm font-bold cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-sell" />
                  <span className="text-sell">{t('chat.copied')}</span>
                </>
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {/* Read aloud button */}
            <button
              type="button"
              onClick={handleToggleAudio}
              title={isPlayingAudio ? t('chat.stopReading') : t('chat.readAloud')}
              aria-label="Read response aloud"
              className={`p-1.5 border transition-colors flex items-center gap-1 text-sm font-bold cursor-pointer ${
                isPlayingAudio
                  ? 'bg-secondary text-secondary-fg border-neutral-ink'
                  : 'hover:text-neutral-ink hover:bg-neutral-bg border-transparent hover:border-neutral-border'
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <VolumeX className="w-4 h-4 animate-pulse" />
                  <span>{t('chat.stopReading')}</span>
                </>
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {/* Regenerate button */}
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                title={t('chat.regenerate')}
                aria-label="Regenerate response"
                className="p-1.5 hover:text-neutral-ink hover:bg-neutral-bg border border-transparent hover:border-neutral-border transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}

            {/* Thumbs Up */}
            {onFeedback && (
              <button
                type="button"
                onClick={() => onFeedback('up')}
                title={t('chat.thumbsUp')}
                aria-label="Helpful"
                className={`p-1.5 border transition-colors ${
                  message.feedback === 'up'
                    ? 'text-sell bg-sell-bg border-sell'
                    : 'hover:text-neutral-ink hover:bg-neutral-bg border-transparent hover:border-neutral-border'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
            )}

            {/* Thumbs Down */}
            {onFeedback && (
              <button
                type="button"
                onClick={() => onFeedback('down')}
                title={t('chat.thumbsDown')}
                aria-label="Not helpful"
                className={`p-1.5 border transition-colors ${
                  message.feedback === 'down'
                    ? 'text-risk bg-risk-bg border-risk'
                    : 'hover:text-neutral-ink hover:bg-neutral-bg border-transparent hover:border-neutral-border'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
