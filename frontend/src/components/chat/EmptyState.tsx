import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Sprout,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  CloudRain,
  Sun,
  AlertTriangle,
  Calculator,
  MapPin,
  Sparkles,
  MessageCircle,
  Clock,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { fetchNashikWeather, type WeatherAdvisory } from '../../services/weather';
import { CROPS } from '../../config/crops';
import { formatRupee } from '../../i18n';
import type { CropId } from '../../types';

interface EmptyStateProps {
  onSelectSuggestion: (text: string) => void;
  onOpenCalculator?: (cropId: string) => void;
}

interface PriceTickerItem {
  id: CropId;
  mandi: string;
  mandi_mr: string;
  mandi_hi: string;
  price: number;
  change: number;
  history: number[];
}

const TODAY_PRICES: Record<CropId, PriceTickerItem> = {
  onion: {
    id: 'onion',
    mandi: 'Lasalgaon APMC',
    mandi_mr: 'लासलगाव बाजार समिती',
    mandi_hi: 'लासलगांव मंडी',
    price: 2280,
    change: 60,
    history: [2180, 2200, 2210, 2240, 2250, 2280],
  },
  tomato: {
    id: 'tomato',
    mandi: 'Pimpalgaon Baswant',
    mandi_mr: 'पिंपळगाव बसवंत',
    mandi_hi: 'पिंपलगांव बसवंत',
    price: 1680,
    change: -40,
    history: [1780, 1750, 1720, 1700, 1680],
  },
  soybean: {
    id: 'soybean',
    mandi: 'Malegaon APMC',
    mandi_mr: 'मालेगाव बाजार समिती',
    mandi_hi: 'मालेगांव मंडी',
    price: 4490,
    change: 30,
    history: [4420, 4440, 4450, 4470, 4490],
  },
};

/**
 * Generate SVG polyline points for sparkline
 */
function renderSparkline(points: number[], width = 64, height = 24) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return coords.join(' ');
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onSelectSuggestion,
  onOpenCalculator,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { crops, harvestDaysAgo } = useAppStore();
  const currentLang = i18n.language || 'mr';

  const [weather, setWeather] = useState<WeatherAdvisory | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    fetchNashikWeather().then((data) => {
      if (isSubscribed) setWeather(data);
    });
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Suggestions tailored to selected crops
  const getSuggestions = () => {
    const list: string[] = [];
    if (crops.includes('onion')) {
      list.push(t('chat.suggestions.onion1'));
      list.push(t('chat.suggestions.onion2'));
    }
    if (crops.includes('tomato')) {
      list.push(t('chat.suggestions.tomato1'));
    }
    if (crops.includes('soybean')) {
      list.push(t('chat.suggestions.soybean1'));
    }

    if (list.length < 4) {
      if (!list.includes(t('chat.suggestions.onion1'))) list.push(t('chat.suggestions.onion1'));
      if (!list.includes(t('chat.suggestions.tomato1'))) list.push(t('chat.suggestions.tomato1'));
      if (!list.includes(t('chat.suggestions.soybean1'))) list.push(t('chat.suggestions.soybean1'));
      if (!list.includes(t('chat.suggestions.onion2'))) list.push(t('chat.suggestions.onion2'));
    }
    return list.slice(0, 4);
  };

  const suggestions = getSuggestions();

  const weatherAlertText =
    currentLang === 'mr'
      ? weather?.advisoryText_mr
      : currentLang === 'hi'
      ? weather?.advisoryText_hi
      : weather?.advisoryText_en;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 max-w-3xl mx-auto my-auto text-center select-none w-full space-y-5">
      {/* Brand Icon & Heading */}
      <div>
        <div className="w-14 h-14 bg-primary text-primary-fg border-2 border-neutral-ink shadow-hard flex items-center justify-center font-bold mx-auto mb-3">
          <Sprout className="w-8 h-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-neutral-ink tracking-tight mb-1.5">
          {t('chat.greeting')}
        </h1>

        <p className="text-base text-neutral-muted max-w-xl mx-auto font-medium">
          {t('chat.emptySubtitle')}
        </p>
      </div>

      {/* Live Open-Meteo Weather Banner */}
      {weather && (
        <div
          className={`w-full p-3.5 border-2 border-neutral-ink shadow-hard text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            weather.hasRainRisk ? 'bg-hold-bg' : 'bg-primary-subtle'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 border-2 border-neutral-ink shadow-hard shrink-0 ${
                weather.hasRainRisk
                  ? 'bg-hold text-hold-fg'
                  : 'bg-primary text-primary-fg'
              }`}
            >
              {weather.hasRainRisk ? (
                <CloudRain className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm uppercase tracking-wider text-neutral-ink">
                  {weather.hasRainRisk
                    ? 'Rain Spoilage Alert (Nashik District)'
                    : 'Clear Weather Advisory (Nashik District)'}
                </span>
                <span className="text-sm font-bold text-neutral-muted">
                  ~{weather.temperatureAvg}°C
                </span>
              </div>
              <p className="text-sm font-semibold text-neutral-ink mt-0.5 leading-snug">
                {weatherAlertText}
              </p>
            </div>
          </div>

          {/* Mini 3-day forecast pills */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            {weather.forecast.slice(0, 3).map((f, idx) => (
              <div
                key={idx}
                className="px-2 py-1 bg-neutral-surface border border-neutral-ink text-center text-sm font-bold shadow-hard"
              >
                <div className="text-neutral-muted text-sm">{f.dayLabel}</div>
                <div className="text-neutral-ink">{f.maxTemp}°C</div>
                <div className="text-sm">{f.isRainy ? '🌧️' : '☀️'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Mandi Prices Strip */}
      <div className="w-full text-left">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <span className="text-sm font-black text-neutral-ink uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Today's APMC Modal Prices (Nashik)</span>
          </span>
          <button
            type="button"
            onClick={() => navigate('/crops')}
            className="text-sm font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('crops.updateHarvestDate')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {(['onion', 'tomato', 'soybean'] as CropId[]).map((cropId) => {
            const item = TODAY_PRICES[cropId];
            const cropCfg = CROPS[cropId];
            const isFarmerCrop = crops.includes(cropId);
            const isUp = item.change >= 0;

            const daysAgo = harvestDaysAgo?.[cropId] ?? 0;
            const remainingDays = Math.max(0, cropCfg.shelfLifeDays - daysAgo);
            const isUrgent = remainingDays <= 1;
            const isWarning = remainingDays <= 3 && cropCfg.shelfLifeDays > 4;

            const mandiName =
              currentLang === 'mr'
                ? item.mandi_mr
                : currentLang === 'hi'
                ? item.mandi_hi
                : item.mandi;

            const cropName =
              currentLang === 'mr'
                ? cropCfg.name_mr
                : currentLang === 'hi'
                ? cropCfg.name_hi
                : cropCfg.name_en;

            return (
              <button
                key={cropId}
                type="button"
                onClick={() =>
                  onSelectSuggestion(
                    currentLang === 'mr'
                      ? `${cropName} विक्रीसाठी आज सर्वोत्तम बाजार कोणता आहे?`
                      : currentLang === 'hi'
                      ? `${cropName} बेचने के लिए आज सबसे अच्छी मंडी कौन सी है?`
                      : `What is the optimal mandi to sell ${cropName} today?`
                  )
                }
                className={`p-3 bg-neutral-surface border-2 border-neutral-ink shadow-hard hover:bg-neutral-bg transition-all text-left flex flex-col justify-between cursor-pointer group ${
                  isFarmerCrop ? 'ring-2 ring-primary/40' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg flex items-center gap-1.5 font-black text-neutral-ink">
                    <span>{cropCfg.emoji}</span>
                    <span className="text-sm">{cropName}</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 text-sm font-black px-1.5 py-0.5 border ${
                      isUp
                        ? 'bg-sell-bg text-sell border-sell'
                        : 'bg-risk-bg text-risk border-risk'
                    }`}
                  >
                    {isUp ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isUp ? '+' : ''}
                      {item.change}
                    </span>
                  </span>
                </div>

                <div className="my-2 flex items-baseline justify-between">
                  <div>
                    <span className="text-xl font-black text-neutral-ink">
                      {formatRupee(item.price)}
                    </span>
                    <span className="text-sm text-neutral-muted font-bold"> / qtl</span>
                  </div>

                  {/* Sparkline Graphic */}
                  <svg
                    width="64"
                    height="24"
                    className={`shrink-0 ${isUp ? 'text-sell' : 'text-risk'}`}
                  >
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={renderSparkline(item.history)}
                    />
                  </svg>
                </div>

                <div className="text-sm font-semibold flex items-center justify-between border-t border-neutral-border pt-1.5">
                  <span className="truncate text-neutral-muted">{mandiName}</span>
                  <span
                    className={`font-black text-sm px-1.5 py-0.5 border ${
                      remainingDays === 0
                        ? 'bg-risk-bg text-risk border-risk'
                        : isUrgent || isWarning
                        ? 'bg-hold-bg text-hold border-hold'
                        : 'bg-sell-bg text-sell border-sell'
                    }`}
                  >
                    {remainingDays}d left
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Suggestion Prompts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
        {suggestions.map((text, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectSuggestion(text)}
            className="p-3.5 bg-neutral-surface border-2 border-neutral-ink shadow-hard hover:bg-neutral-bg hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-left flex items-start justify-between gap-3 group cursor-pointer"
          >
            <span className="text-base font-bold text-neutral-ink leading-snug">
              {text}
            </span>
            <ArrowUpRight className="w-4 h-4 text-neutral-muted group-hover:text-primary shrink-0 mt-0.5" />
          </button>
        ))}
      </div>

      {/* Auxiliary Tools Quick Launch Bar */}
      <div className="w-full pt-1 flex flex-wrap items-center justify-center gap-3">
        {onOpenCalculator && (
          <button
            type="button"
            onClick={() => onOpenCalculator('onion')}
            className="px-3.5 py-2 bg-neutral-surface hover:bg-neutral-bg text-neutral-ink font-black text-sm border-2 border-neutral-ink shadow-hard flex items-center gap-2 cursor-pointer transition-transform active:translate-x-0.5 active:translate-y-0.5"
          >
            <Calculator className="w-4 h-4 text-primary" />
            <span>{t('calculator.title')}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/map')}
          className="px-3.5 py-2 bg-neutral-surface hover:bg-neutral-bg text-neutral-ink font-black text-sm border-2 border-neutral-ink shadow-hard flex items-center gap-2 cursor-pointer transition-transform active:translate-x-0.5 active:translate-y-0.5"
        >
          <MapPin className="w-4 h-4 text-primary" />
          <span>{t('nav.map')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const queryText =
              currentLang === 'mr'
                ? 'नमस्कार, मला नाशिक बाजार समितीमधील कांदा/टोमॅटो विक्री सल्ला हवा आहे.'
                : currentLang === 'hi'
                ? 'नमस्ते, मुझे नासिक मंडी में फसल बिक्री का परामर्श चाहिए।'
                : 'Hello, I need advisory on selling onion/tomato in Nashik mandis.';
            window.open(`https://wa.me/?text=${encodeURIComponent(queryText)}`, '_blank', 'noopener,noreferrer');
          }}
          className="px-3.5 py-2 bg-sell hover:bg-sell/90 text-sell-fg font-black text-sm border-2 border-neutral-ink shadow-hard flex items-center gap-2 cursor-pointer transition-transform active:translate-x-0.5 active:translate-y-0.5"
        >
          <MessageCircle className="w-4 h-4" />
          <span>WhatsApp AI Bot</span>
        </button>
      </div>
    </div>
  );
};

export default EmptyState;
