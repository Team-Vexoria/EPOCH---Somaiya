import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { CROPS } from '../../config/crops';
import { MANDIS } from '../../config/mandis';
import { formatRupee } from '../../i18n';
import type { CropId } from '../../types';

export interface PriceAlert {
  id: string;
  cropId: CropId;
  mandiId: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  createdAt: number;
}

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlertsChange?: (count: number) => void;
}

const STORAGE_KEY = 'sellsmart_price_alerts';

export function getStoredAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Default sample alert for demonstration
      const defaults: PriceAlert[] = [
        {
          id: 'alert_1',
          cropId: 'onion',
          mandiId: 'lasalgaon',
          targetPrice: 2400,
          condition: 'ABOVE',
          createdAt: Date.now() - 3600000,
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  isOpen,
  onClose,
  onAlertsChange,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'mr';

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<CropId>('onion');
  const [selectedMandi, setSelectedMandi] = useState<string>('lasalgaon');
  const [targetPrice, setTargetPrice] = useState<number>(2400);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredAlerts();
      setAlerts(stored);
      if (onAlertsChange) onAlertsChange(stored.length);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const saveAlerts = (newAlerts: PriceAlert[]) => {
    setAlerts(newAlerts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAlerts));
    if (onAlertsChange) onAlertsChange(newAlerts.length);
  };

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPrice || targetPrice <= 0) return;

    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}`,
      cropId: selectedCrop,
      mandiId: selectedMandi,
      targetPrice,
      condition: 'ABOVE',
      createdAt: Date.now(),
    };

    const updated = [newAlert, ...alerts];
    saveAlerts(updated);
    setFeedbackMsg(t('alerts.alertCreated'));
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleDeleteAlert = (id: string) => {
    const updated = alerts.filter((a) => a.id !== id);
    saveAlerts(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-ink/60 overflow-y-auto">
      <div className="w-full max-w-lg bg-neutral-surface border-2 border-neutral-ink shadow-hard my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-primary text-primary-fg border-b-2 border-neutral-ink flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-neutral-surface text-neutral-ink border-2 border-neutral-ink shadow-hard flex items-center justify-center font-bold">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                {t('alerts.title')}
              </h3>
              <p className="text-sm opacity-90 font-medium">
                {t('alerts.subtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 bg-neutral-surface text-neutral-ink border-2 border-neutral-ink hover:bg-neutral-bg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create Alert Form */}
        <form onSubmit={handleAddAlert} className="p-4 sm:p-5 border-b-2 border-neutral-border space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Crop Select */}
            <div>
              <label className="block text-sm font-black text-neutral-ink uppercase tracking-wider mb-1">
                {t('alerts.cropLabel')}
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value as CropId)}
                className="w-full p-2.5 bg-neutral-bg border-2 border-neutral-ink font-bold text-sm text-neutral-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {(['onion', 'tomato', 'soybean'] as CropId[]).map((cId) => {
                  const c = CROPS[cId];
                  const name =
                    currentLang === 'mr'
                      ? c.name_mr
                      : currentLang === 'hi'
                      ? c.name_hi
                      : c.name_en;
                  return (
                    <option key={cId} value={cId}>
                      {c.emoji} {name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Mandi Select */}
            <div>
              <label className="block text-sm font-black text-neutral-ink uppercase tracking-wider mb-1">
                {t('alerts.mandiLabel')}
              </label>
              <select
                value={selectedMandi}
                onChange={(e) => setSelectedMandi(e.target.value)}
                className="w-full p-2.5 bg-neutral-bg border-2 border-neutral-ink font-bold text-sm text-neutral-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {MANDIS.slice(0, 10).map((m) => {
                  const mName =
                    currentLang === 'mr'
                      ? m.name_mr
                      : currentLang === 'hi'
                      ? m.name_hi
                      : m.name;
                  return (
                    <option key={m.id} value={m.id}>
                      {mName}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Target Price */}
          <div>
            <label className="block text-sm font-black text-neutral-ink uppercase tracking-wider mb-1">
              {t('alerts.targetPriceLabel')}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 font-black text-neutral-muted text-base">
                  ₹
                </span>
                <input
                  type="number"
                  min="500"
                  max="15000"
                  step="50"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 bg-neutral-bg border-2 border-neutral-ink font-black text-base text-neutral-ink focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg font-black text-sm border-2 border-neutral-ink shadow-hard flex items-center gap-1.5 cursor-pointer transition-transform active:translate-x-0.5 active:translate-y-0.5"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{t('alerts.save')}</span>
              </button>
            </div>
          </div>

          {feedbackMsg && (
            <div className="p-2.5 bg-sell-bg border-2 border-sell text-sell font-bold text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{feedbackMsg}</span>
            </div>
          )}
        </form>

        {/* Existing Active Alerts List */}
        <div className="p-4 sm:p-5 max-h-64 overflow-y-auto space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-black text-neutral-ink uppercase tracking-wider">
              {t('alerts.activeAlerts')} ({alerts.length})
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="p-4 text-center text-sm font-semibold text-neutral-muted border border-dashed border-neutral-border">
              {t('alerts.noAlerts')}
            </div>
          ) : (
            alerts.map((alert) => {
              const crop = CROPS[alert.cropId];
              const mandi = MANDIS.find((m) => m.id === alert.mandiId);

              const cropName = crop
                ? currentLang === 'mr'
                  ? crop.name_mr
                  : currentLang === 'hi'
                  ? crop.name_hi
                  : crop.name_en
                : alert.cropId;

              const mandiName = mandi
                ? currentLang === 'mr'
                  ? mandi.name_mr
                  : currentLang === 'hi'
                  ? mandi.name_hi
                  : mandi.name
                : alert.mandiId;

              return (
                <div
                  key={alert.id}
                  className="p-3 bg-neutral-bg border-2 border-neutral-ink shadow-hard flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{crop?.emoji || '🌾'}</span>
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm text-neutral-ink truncate">
                        {cropName} @ {mandiName}
                      </div>
                      <div className="text-sm font-black text-primary">
                        Target: {alert.condition === 'ABOVE' ? '> ' : '< '}
                        {formatRupee(alert.targetPrice)} / qtl
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 bg-sell-bg text-sell border border-sell font-black text-sm uppercase">
                      Active
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteAlert(alert.id)}
                      title={t('alerts.deleteAlert')}
                      aria-label="Delete alert"
                      className="p-1.5 text-neutral-muted hover:text-risk hover:bg-neutral-surface border border-neutral-border cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceAlertModal;
