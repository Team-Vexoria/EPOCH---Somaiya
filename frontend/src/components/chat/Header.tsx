import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Globe,
  ChevronDown,
  Bell,
  Calculator,
  MapPin,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { CROPS } from '../../config/crops';
import { SUPPORTED_LANGUAGES } from '../../config/constants';
import type { Language } from '../../types';

interface HeaderProps {
  conversationTitle?: string;
  onOpenSidebar: () => void;
  onOpenAlerts?: () => void;
  onOpenCalculator?: () => void;
  alertsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  conversationTitle,
  onOpenSidebar,
  onOpenAlerts,
  onOpenCalculator,
  alertsCount = 0,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { language, setLanguage, crops } = useAppStore();
  const currentLang = (i18n.language as Language) || language || 'mr';

  const handleLanguageToggle = () => {
    // Cycle between languages: mr -> hi -> en -> mr
    const nextLang: Language =
      currentLang === 'mr' ? 'hi' : currentLang === 'hi' ? 'en' : 'mr';
    setLanguage(nextLang);
    i18n.changeLanguage(nextLang);
  };

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[2];

  return (
    <header className="h-14 sm:h-16 bg-neutral-surface border-b-2 border-neutral-ink px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 shrink-0 z-10 select-none">
      {/* Left: Mobile Hamburger + Conversation Title */}
      <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open conversation menu"
          className="p-1.5 md:hidden text-neutral-ink border-2 border-neutral-ink shadow-hard hover:bg-neutral-bg shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h2 className="text-base sm:text-lg font-black text-neutral-ink truncate">
          {conversationTitle || t('chat.newChat')}
        </h2>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Mandi Map Link Button */}
        <button
          type="button"
          onClick={() => navigate('/map')}
          title="Open Nashik Mandi Map"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-neutral-surface text-neutral-ink border-2 border-neutral-ink font-bold text-sm hover:bg-neutral-bg shadow-hard cursor-pointer transition-transform active:translate-x-0.5 active:translate-y-0.5"
        >
          <MapPin className="w-4 h-4 text-primary" />
          <span>{t('nav.map')}</span>
        </button>

        {/* Calculator Launcher */}
        {onOpenCalculator && (
          <button
            type="button"
            onClick={onOpenCalculator}
            title="Open Net Return Calculator"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-neutral-surface text-neutral-ink border-2 border-neutral-ink font-bold text-sm hover:bg-neutral-bg shadow-hard cursor-pointer transition-transform active:translate-x-0.5 active:translate-y-0.5"
          >
            <Calculator className="w-4 h-4 text-primary" />
            <span>Calculator</span>
          </button>
        )}

        {/* Price Alerts Bell Button */}
        {onOpenAlerts && (
          <button
            type="button"
            onClick={onOpenAlerts}
            title={t('alerts.title')}
            aria-label="Price Alerts"
            className="relative p-1.5 sm:px-2.5 sm:py-1 bg-neutral-surface text-neutral-ink border-2 border-neutral-ink font-bold text-sm hover:bg-neutral-bg shadow-hard cursor-pointer flex items-center gap-1.5 transition-transform active:translate-x-0.5 active:translate-y-0.5"
          >
            <Bell className="w-4 h-4 text-hold" />
            <span className="hidden sm:inline">Alerts</span>
            {alertsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-sell text-sell-fg font-black text-xs flex items-center justify-center border border-neutral-ink shrink-0">
                {alertsCount}
              </span>
            )}
          </button>
        )}

        {/* Farmer's Crop Chips */}
        <div className="hidden lg:flex items-center gap-1.5">
          {crops.map((cropId) => {
            const crop = CROPS[cropId];
            if (!crop) return null;
            const cropName =
              currentLang === 'mr'
                ? crop.name_mr
                : currentLang === 'hi'
                ? crop.name_hi
                : crop.name_en;

            return (
              <span
                key={cropId}
                className="inline-flex items-center gap-1 px-2 py-0.5 border border-neutral-ink bg-neutral-bg text-sm font-bold text-neutral-ink"
              >
                <span>{crop.emoji}</span>
                <span>{cropName}</span>
              </span>
            );
          })}
        </div>

        {/* Language Pill (Click to toggle language) */}
        <button
          type="button"
          onClick={handleLanguageToggle}
          title="Click to switch language"
          className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-subtle text-primary border-2 border-primary font-bold text-sm hover:bg-primary hover:text-primary-fg transition-colors cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{currentLangObj.nativeName}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </div>
    </header>
  );
};

export default Header;
