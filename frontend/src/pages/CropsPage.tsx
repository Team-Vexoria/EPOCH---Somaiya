import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ArrowRight,
  Sprout,
  AlertCircle,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
} from 'lucide-react';
import { CROPS_LIST } from '../config/crops';
import { useAppStore } from '../store/useAppStore';
import type { CropId, Crop } from '../types';

interface PresetOption {
  days: number;
  labelKey?: string;
  labelFallback: string;
}

export const CropsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = (i18n.language as 'en' | 'hi' | 'mr') || 'mr';

  const {
    crops: savedCrops,
    harvestDaysAgo: savedHarvestDaysAgo,
    setCrops,
    setAllHarvestDaysAgo,
    completeOnboarding,
  } = useAppStore();

  const [selectedCrops, setSelectedCrops] = useState<CropId[]>(
    savedCrops && savedCrops.length > 0 ? savedCrops : ['onion']
  );

  const [harvestDays, setHarvestDays] = useState<Record<CropId, number>>({
    onion: savedHarvestDaysAgo?.onion ?? 0,
    tomato: savedHarvestDaysAgo?.tomato ?? 0,
    soybean: savedHarvestDaysAgo?.soybean ?? 0,
  });

  const toggleCrop = (id: CropId) => {
    setSelectedCrops((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const updateHarvestDay = (cropId: CropId, days: number) => {
    setHarvestDays((prev) => ({
      ...prev,
      [cropId]: Math.max(0, days),
    }));
  };

  const handleContinue = () => {
    if (selectedCrops.length === 0) return;
    setCrops(selectedCrops);
    setAllHarvestDaysAgo(harvestDays);
    completeOnboarding();
    navigate('/chat');
  };

  const getCropPresets = (crop: Crop): PresetOption[] => {
    if (crop.id === 'tomato') {
      return [
        { days: 0, labelKey: 'crops.harvestToday', labelFallback: 'Today (0d)' },
        { days: 1, labelKey: 'crops.harvestYesterday', labelFallback: 'Yesterday (1d)' },
        { days: 2, labelKey: 'crops.harvest2Days', labelFallback: '2 days ago' },
        { days: 3, labelKey: 'crops.harvest3Days', labelFallback: '3 days ago' },
      ];
    }
    if (crop.id === 'onion') {
      return [
        { days: 0, labelKey: 'crops.harvestToday', labelFallback: 'Today (0d)' },
        { days: 3, labelKey: 'crops.harvest3Days', labelFallback: '3 days ago' },
        { days: 7, labelKey: 'crops.harvest1Week', labelFallback: '1 week (7d)' },
        {
          days: 15,
          labelFallback:
            currentLang === 'mr'
              ? '१५ दिवस'
              : currentLang === 'hi'
              ? '१५ दिन'
              : '15 days ago',
        },
      ];
    }
    // soybean
    return [
      { days: 0, labelKey: 'crops.harvestToday', labelFallback: 'Today (0d)' },
      { days: 7, labelKey: 'crops.harvest1Week', labelFallback: '1 week (7d)' },
      {
        days: 15,
        labelFallback:
          currentLang === 'mr'
            ? '१५ दिवस'
            : currentLang === 'hi'
            ? '१५ दिन'
            : '15 days ago',
      },
      {
        days: 30,
        labelFallback:
          currentLang === 'mr'
            ? '१ महिना (३० दिवस)'
            : currentLang === 'hi'
            ? '१ माह (३० दिन)'
            : '1 month (30d)',
      },
    ];
  };

  return (
    <div className="min-h-screen bg-neutral-bg flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-2xl bg-neutral-surface border-2 border-neutral-ink shadow-hard-lg p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-subtle text-primary border-2 border-primary mb-3">
            <Sprout className="w-6 h-6" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-neutral-ink tracking-tight">
            {t('crops.title')}
          </h1>

          <p className="mt-1 text-base text-neutral-muted max-w-lg mx-auto font-medium">
            {t('crops.subtitle')}
          </p>
        </div>

        {/* 3 Responsive Crop Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {CROPS_LIST.map((crop) => {
            const isSelected = selectedCrops.includes(crop.id);
            const localizedName =
              currentLang === 'mr'
                ? crop.name_mr
                : currentLang === 'hi'
                ? crop.name_hi
                : crop.name_en;

            return (
              <div
                key={crop.id}
                onClick={() => toggleCrop(crop.id)}
                className={`p-5 border-2 transition-all cursor-pointer flex flex-col items-center justify-between text-center select-none relative ${
                  isSelected
                    ? 'border-primary bg-primary-subtle shadow-hard'
                    : 'border-neutral-ink bg-neutral-surface hover:bg-neutral-bg'
                }`}
              >
                {/* Checkmark Badge */}
                <div
                  className={`absolute top-3 right-3 w-6 h-6 border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-fg border-primary'
                      : 'border-neutral-border bg-neutral-surface'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                {/* Big Crop Emoji */}
                <div className="text-5xl sm:text-6xl my-2">
                  {crop.emoji}
                </div>

                {/* Crop Name */}
                <div className="mt-2">
                  <div className="text-xl sm:text-2xl font-black text-neutral-ink">
                    {localizedName}
                  </div>
                  <div className="text-sm font-bold text-neutral-muted mt-0.5">
                    {crop.name_en}
                  </div>
                </div>

                {/* Total Shelf-life tag */}
                <div className="mt-3 text-sm font-semibold px-2 py-0.5 border border-neutral-ink bg-neutral-surface text-neutral-ink">
                  {t('crops.shelfLife', { days: crop.shelfLifeDays })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Shelf-Life & Harvest Date Section for Selected Crops */}
        {selectedCrops.length > 0 && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-2 border-b-2 border-neutral-ink pb-2">
              <Calendar className="w-5 h-5 text-primary shrink-0" />
              <div className="text-left">
                <h2 className="text-lg sm:text-xl font-black text-neutral-ink">
                  {t('crops.harvestQuestion')}
                </h2>
                <p className="text-sm text-neutral-muted font-medium">
                  {t('crops.harvestSubtitle')}
                </p>
              </div>
            </div>

            {selectedCrops.map((cropId) => {
              const crop = CROPS_LIST.find((c) => c.id === cropId);
              if (!crop) return null;

              const daysAgo = harvestDays[cropId] ?? 0;
              const remainingDays = Math.max(0, crop.shelfLifeDays - daysAgo);
              const percentRemaining = Math.max(
                0,
                Math.min(100, Math.round((remainingDays / crop.shelfLifeDays) * 100))
              );

              const localizedName =
                currentLang === 'mr'
                  ? crop.name_mr
                  : currentLang === 'hi'
                  ? crop.name_hi
                  : crop.name_en;

              const presets = getCropPresets(crop);

              // Condition states
              const isCritical = remainingDays === 0;
              const isUrgent = remainingDays === 1;
              const isWarning = remainingDays <= 3 && crop.shelfLifeDays > 4;

              return (
                <div
                  key={crop.id}
                  className="p-4 sm:p-5 bg-neutral-surface border-2 border-neutral-ink shadow-hard text-left space-y-3"
                >
                  {/* Card Title & Shelf-Life pill */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{crop.emoji}</span>
                      <span className="text-lg font-black text-neutral-ink">
                        {localizedName} ({crop.name_en})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold px-2 py-0.5 border border-neutral-ink bg-neutral-bg text-neutral-ink">
                        {t('crops.totalShelfLife', { days: crop.shelfLifeDays })}
                      </span>
                    </div>
                  </div>

                  {/* Harvest Presets & Stepper */}
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-neutral-ink flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-neutral-muted" />
                      <span>{t('crops.harvestQuestion')}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {presets.map((preset) => {
                        const isPresetActive = daysAgo === preset.days;
                        const label = preset.labelKey
                          ? t(preset.labelKey)
                          : preset.labelFallback;

                        return (
                          <button
                            key={preset.days}
                            type="button"
                            onClick={() => updateHarvestDay(crop.id, preset.days)}
                            className={`min-h-[44px] px-3 py-1.5 text-sm font-bold border-2 transition-all cursor-pointer ${
                              isPresetActive
                                ? 'bg-primary text-primary-fg border-neutral-ink shadow-hard'
                                : 'bg-neutral-bg text-neutral-ink border-neutral-ink hover:bg-neutral-surface'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Numeric Stepper for Exact Custom Days */}
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-sm font-semibold text-neutral-muted">
                        {t('crops.harvestCustomDays')}:
                      </span>
                      <div className="inline-flex items-center border-2 border-neutral-ink bg-neutral-surface shadow-hard">
                        <button
                          type="button"
                          onClick={() => updateHarvestDay(crop.id, daysAgo - 1)}
                          disabled={daysAgo <= 0}
                          className="w-11 h-11 flex items-center justify-center bg-neutral-bg hover:bg-neutral-surface disabled:opacity-40 disabled:cursor-not-allowed border-r-2 border-neutral-ink text-neutral-ink font-black cursor-pointer"
                          aria-label="Decrease harvest days"
                        >
                          <Minus className="w-4 h-4 stroke-[3]" />
                        </button>

                        <div className="px-3 min-w-[120px] text-center font-black text-sm text-neutral-ink">
                          {daysAgo === 0
                            ? t('crops.harvestedToday')
                            : t('crops.daysAgo', { count: daysAgo })}
                        </div>

                        <button
                          type="button"
                          onClick={() => updateHarvestDay(crop.id, daysAgo + 1)}
                          className="w-11 h-11 flex items-center justify-center bg-neutral-bg hover:bg-neutral-surface border-l-2 border-neutral-ink text-neutral-ink font-black cursor-pointer"
                          aria-label="Increase harvest days"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Shelf-Life Progress Meter */}
                  <div className="pt-2 border-t border-neutral-border space-y-1.5">
                    <div className="flex items-center justify-between text-sm font-bold text-neutral-ink">
                      <span>{t('crops.remainingShelfLife', { days: remainingDays })}</span>
                      <span className="text-neutral-muted">
                        {percentRemaining}% {t('crops.freshnessLevel')}
                      </span>
                    </div>

                    {/* High-contrast Progress Bar */}
                    <div className="w-full h-4 bg-neutral-bg border-2 border-neutral-ink overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCritical
                            ? 'bg-risk w-0'
                            : isUrgent || isWarning
                            ? 'bg-hold'
                            : 'bg-sell'
                        }`}
                        style={{ width: `${percentRemaining}%` }}
                      />
                    </div>
                  </div>

                  {/* Dynamic Status Advisory Banner */}
                  {isCritical ? (
                    <div className="p-3 bg-risk-bg border-2 border-risk text-risk flex items-start gap-2 text-sm font-bold">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{t('crops.shelfLifeCritical')}</span>
                    </div>
                  ) : isUrgent ? (
                    <div className="p-3 bg-hold-bg border-2 border-hold text-hold flex items-start gap-2 text-sm font-bold">
                      <Clock className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{t('crops.shelfLifeUrgent')}</span>
                    </div>
                  ) : isWarning ? (
                    <div className="p-3 bg-hold-bg border-2 border-hold text-hold flex items-start gap-2 text-sm font-bold">
                      <Clock className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{t('crops.shelfLifeWarning', { days: remainingDays })}</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-sell-bg border-2 border-sell text-sell flex items-start gap-2 text-sm font-bold">
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{t('crops.shelfLifeGood', { days: remainingDays })}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Validation Warning if none selected */}
        {selectedCrops.length === 0 && (
          <div className="mb-4 p-3 bg-hold-bg border border-hold text-neutral-ink text-sm flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-hold shrink-0" />
            <span>{t('crops.minOneRequired')}</span>
          </div>
        )}

        {/* Continue Button */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={selectedCrops.length === 0}
          className="w-full min-h-[48px] py-3.5 px-4 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-primary-fg font-extrabold text-base md:text-lg border-2 border-neutral-ink shadow-hard flex items-center justify-center gap-2 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <span>{t('crops.continue')}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default CropsPage;
