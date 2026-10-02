import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ArrowRight, Sprout, AlertCircle } from 'lucide-react';
import { CROPS_LIST } from '../config/crops';
import { useAppStore } from '../store/useAppStore';
import type { CropId } from '../types';

export const CropsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = (i18n.language as 'en' | 'hi' | 'mr') || 'mr';

  const { crops: savedCrops, setCrops, completeOnboarding } = useAppStore();
  const [selectedCrops, setSelectedCrops] = useState<CropId[]>(
    savedCrops && savedCrops.length > 0 ? savedCrops : ['onion']
  );

  const toggleCrop = (id: CropId) => {
    setSelectedCrops((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    if (selectedCrops.length === 0) return;
    setCrops(selectedCrops);
    completeOnboarding();
    navigate('/chat');
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

          <p className="mt-1 text-base text-neutral-muted max-w-md mx-auto">
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
                  className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
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
                  <div className="text-xs font-bold text-neutral-muted mt-0.5">
                    {crop.name_en}
                  </div>
                </div>

                {/* Shelf-life tag */}
                <div className="mt-3 text-xs font-semibold px-2 py-0.5 border border-neutral-ink bg-neutral-surface text-neutral-ink">
                  {t('crops.shelfLife', { days: crop.shelfLifeDays })}
                </div>
              </div>
            );
          })}
        </div>

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
