import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Volume2, ArrowRight, Languages } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { SUPPORTED_LANGUAGES } from '../config/constants';
import { speakText } from '../services/speech';
import type { Language } from '../types';

export const LanguagePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const { language, setLanguage } = useAppStore();
  const [selectedLang, setSelectedLang] = useState<Language>(language || 'en');
  const [playingLang, setPlayingLang] = useState<string | null>(null);

  const handleSelectLang = (langCode: Language) => {
    setSelectedLang(langCode);
    setLanguage(langCode);
    i18n.changeLanguage(langCode);
  };

  const handlePlayVoice = (
    e: React.MouseEvent,
    langCode: Language,
    textToSpeak: string
  ) => {
    e.stopPropagation();
    setPlayingLang(langCode);
    speakText(
      textToSpeak,
      langCode,
      () => setPlayingLang(langCode),
      () => setPlayingLang(null)
    );
  };

  const handleContinue = () => {
    setLanguage(selectedLang);
    navigate('/crops');
  };

  return (
    <div className="min-h-screen bg-neutral-bg flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-xl bg-neutral-surface border-2 border-neutral-ink shadow-hard-lg p-6 sm:p-8">
        {/* Multilingual Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-subtle text-primary border-2 border-primary mb-3">
            <Languages className="w-6 h-6" />
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-neutral-ink leading-snug">
            Choose your language
            <span className="block text-primary text-lg sm:text-xl mt-1">
              अपनी भाषा चुनें / तुमची भाषा निवडा
            </span>
          </h1>

          <p className="mt-2 text-sm text-neutral-muted">
            {t('language.subtitle')}
          </p>
        </div>

        {/* 3 Selectable Language Cards */}
        <div className="space-y-3 sm:space-y-4 mb-8">
          {SUPPORTED_LANGUAGES.map((item) => {
            const isSelected = selectedLang === item.code;
            const isPlaying = playingLang === item.code;

            return (
              <div
                key={item.code}
                onClick={() => handleSelectLang(item.code as Language)}
                className={`p-4 sm:p-5 border-2 transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-primary bg-primary-subtle shadow-hard'
                    : 'border-neutral-ink bg-neutral-surface hover:bg-neutral-bg shadow-none'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-fg border-primary'
                        : 'border-neutral-ink bg-neutral-surface'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>

                  <div>
                    <div className="text-xl sm:text-2xl font-black text-neutral-ink leading-tight">
                      {item.nativeName}
                    </div>
                    <div className="text-sm font-semibold text-neutral-muted">
                      {item.name}
                    </div>
                  </div>
                </div>

                {/* Speaker icon for voice reading */}
                <button
                  type="button"
                  onClick={(e) =>
                    handlePlayVoice(
                      e,
                      item.code as Language,
                      item.code === 'mr'
                        ? 'मराठी'
                        : item.code === 'hi'
                        ? 'हिन्दी'
                        : 'English'
                    )
                  }
                  title={t('language.listen')}
                  aria-label={`Listen ${item.name}`}
                  className={`p-2.5 border-2 border-neutral-ink transition-colors cursor-pointer ${
                    isPlaying
                      ? 'bg-secondary text-secondary-fg animate-pulse'
                      : 'bg-neutral-surface text-neutral-ink hover:bg-neutral-bg'
                  }`}
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Continue Button */}
        <button
          type="button"
          onClick={handleContinue}
          className="w-full min-h-[48px] py-3.5 px-4 bg-primary hover:bg-primary-hover text-primary-fg font-extrabold text-base md:text-lg border-2 border-neutral-ink shadow-hard flex items-center justify-center gap-2 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <span>{t('language.continue')}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default LanguagePage;
