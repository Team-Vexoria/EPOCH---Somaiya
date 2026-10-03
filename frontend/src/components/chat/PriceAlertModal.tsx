import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Sparkles,
  Zap,
  ArrowRight,
  Share2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CROPS } from '../../config/crops';
import { MANDIS, type MandiConfig } from '../../config/mandis';
import {
  calculateDistanceKm,
  calculateLogicalMandiPrice,
  calculateDetailedTransportCost,
  calculateDetailedSpoilageLoss,
} from '../../api/mockData';
import { useAppStore } from '../../store/useAppStore';
import { formatRupee } from '../../i18n';
import type { CropId } from '../../types';

export interface PriceAlert {
  id: string;
  cropId: CropId;
  mandiId: string; // 'any_best' or specific mandi ID (e.g. 'lasalgaon')
  targetProfit: number; // in-pocket net profit in ₹/quintal
  lotSizeQtl: number; // e.g. 20 quintals
  condition: 'ABOVE' | 'BELOW';
  createdAt: number;
}

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlertsChange?: (count: number, hasHitAlert: boolean) => void;
}

interface MandiNetEvaluation {
  mandi: MandiConfig;
  grossPrice: number;
  transportPerQtl: number;
  spoilagePerQtl: number;
  netInPocket: number;
  distanceKm: number;
  totalCash: number;
}

const STORAGE_KEY = 'Mohra_price_alerts';

export function getStoredAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults: PriceAlert[] = [
        {
          id: 'alert_1',
          cropId: 'onion',
          mandiId: 'any_best',
          targetProfit: 2350,
          lotSizeQtl: 20,
          condition: 'ABOVE',
          createdAt: Date.now() - 3600000,
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    // Backward compatibility normalization
    return parsed.map((a: any) => ({
      id: a.id || `alert_${Date.now()}`,
      cropId: a.cropId || 'onion',
      mandiId: a.mandiId || 'any_best',
      targetProfit: Number(a.targetProfit || a.targetPrice || 2350),
      lotSizeQtl: Number(a.lotSizeQtl || 20),
      condition: a.condition || 'ABOVE',
      createdAt: a.createdAt || Date.now(),
    }));
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
  const navigate = useNavigate();
  const currentLang = i18n.language || 'mr';
  const { harvestDaysAgo } = useAppStore();

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<CropId>('onion');
  const [selectedMandi, setSelectedMandi] = useState<string>('any_best');
  const [targetProfit, setTargetProfit] = useState<number>(2350);
  const [lotSizeQtl, setLotSizeQtl] = useState<number>(20);
  const [isSurgeActive, setIsSurgeActive] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Record<string, boolean>>({});

  // Load stored alerts on open
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredAlerts();
      setAlerts(stored);
    }
  }, [isOpen]);

  // Adjust default target profit when crop changes
  const handleCropChange = (crop: CropId) => {
    setSelectedCrop(crop);
    if (crop === 'tomato') {
      setTargetProfit(1600);
    } else if (crop === 'soybean') {
      setTargetProfit(4450);
    } else {
      setTargetProfit(2350);
    }
  };

  // Central evaluation function for all mandis
  const evaluateMandisForCrop = (cropId: CropId, lotSize: number): MandiNetEvaluation[] => {
    // Niphad agricultural center in Nashik district
    const origin = { lat: 20.0797, lng: 74.1089 };
    const harvestDays = harvestDaysAgo?.[cropId] ?? 0;

    return MANDIS.map((m) => {
      const distanceKm = calculateDistanceKm(origin.lat, origin.lng, m.lat, m.lng);
      const basePrice = calculateLogicalMandiPrice(cropId, m.id, 0).forecastPrice;
      const grossPrice = basePrice + (isSurgeActive ? 220 : 0);
      const transportPerQtl = calculateDetailedTransportCost(distanceKm, m.id).totalPerQtl;
      const spoilagePerQtl = calculateDetailedSpoilageLoss(cropId, grossPrice, harvestDays).lossPerQtl;
      const netInPocket = Math.max(0, grossPrice - transportPerQtl - spoilagePerQtl);
      const totalCash = netInPocket * lotSize;

      return {
        mandi: m,
        grossPrice,
        transportPerQtl,
        spoilagePerQtl,
        netInPocket,
        distanceKm,
        totalCash,
      };
    }).sort((a, b) => b.netInPocket - a.netInPocket);
  };

  // Cache evaluations for all 3 crops
  const evaluatedMandis = useMemo(() => {
    return {
      onion: evaluateMandisForCrop('onion', lotSizeQtl),
      tomato: evaluateMandisForCrop('tomato', lotSizeQtl),
      soybean: evaluateMandisForCrop('soybean', lotSizeQtl),
    };
  }, [isSurgeActive, harvestDaysAgo, lotSizeQtl]);

  // Check if any alert is currently in TARGET HIT state
  const hasAnyHitAlert = useMemo(() => {
    return alerts.some((alert) => {
      const list = evaluatedMandis[alert.cropId] || [];
      if (list.length === 0) return false;
      const topMandi = list[0];
      const targetMandi =
        alert.mandiId === 'any_best'
          ? topMandi
          : list.find((m) => m.mandi.id === alert.mandiId) || topMandi;
      return targetMandi.netInPocket >= alert.targetProfit;
    });
  }, [alerts, evaluatedMandis]);

  // Sync alert state with parent Header
  useEffect(() => {
    if (onAlertsChange) {
      onAlertsChange(alerts.length, hasAnyHitAlert);
    }
  }, [alerts.length, hasAnyHitAlert]);

  if (!isOpen) return null;

  const saveAlerts = (newAlerts: PriceAlert[]) => {
    setAlerts(newAlerts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAlerts));
    if (onAlertsChange) {
      onAlertsChange(newAlerts.length, hasAnyHitAlert);
    }
  };

  const handleAddAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProfit || targetProfit <= 0) return;

    const newAlert: PriceAlert = {
      id: `alert_${Date.now()}`,
      cropId: selectedCrop,
      mandiId: selectedMandi,
      targetProfit,
      lotSizeQtl,
      condition: 'ABOVE',
      createdAt: Date.now(),
    };

    const updated = [newAlert, ...alerts];
    saveAlerts(updated);
    setFeedbackMsg(t('alerts.alertCreated'));
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleDeleteAlert = (id: string) => {
    const updated = alerts.filter((a) => a.id !== id);
    saveAlerts(updated);
  };

  // WhatsApp share generator
  const handleShareWhatsApp = (
    alert: PriceAlert,
    topMandi: MandiNetEvaluation,
    diff: number
  ) => {
    const crop = CROPS[alert.cropId];
    const cropName =
      currentLang === 'mr'
        ? crop.name_mr
        : currentLang === 'hi'
        ? crop.name_hi
        : crop.name_en;

    const mandiName =
      currentLang === 'mr'
        ? topMandi.mandi.name_mr
        : currentLang === 'hi'
        ? topMandi.mandi.name_hi
        : topMandi.mandi.name;

    const text = [
      `🔔 *Mohra Profit Alert - Nashik*`,
      `🌾 *Crop*: ${cropName} (${crop.emoji})`,
      `🏆 *Highest Profit Mandi Right Now*: ${mandiName}`,
      `💰 *Net Realized in Pocket*: ${formatRupee(topMandi.netInPocket)} / qtl`,
      `📦 *Total Cash (${alert.lotSizeQtl} qtl)*: ${formatRupee(topMandi.totalCash)}`,
      `📈 *Profit Target*: ${formatRupee(alert.targetProfit)} / qtl (+${formatRupee(diff)} ABOVE TARGET!)`,
      `📍 *Breakdown*:`,
      `• Gross Auction: ${formatRupee(topMandi.grossPrice)} / qtl`,
      `• Transport Freight (${topMandi.distanceKm}km): -${formatRupee(topMandi.transportPerQtl)} / qtl`,
      `• Transit Decay Spoilage: -${formatRupee(topMandi.spoilagePerQtl)} / qtl`,
      `✅ *Net In Pocket*: ${formatRupee(topMandi.netInPocket)} / qtl`,
      `🚚 *Advisory*: Dispatch produce now to secure peak bidding rates!`,
    ].join('\n');

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-ink/60 overflow-y-auto">
      <div className="w-full max-w-xl bg-neutral-surface border-2 border-neutral-ink shadow-hard my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-primary text-primary-fg border-b-2 border-neutral-ink flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-neutral-surface text-neutral-ink border-2 border-neutral-ink shadow-hard flex items-center justify-center font-bold">
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

        {/* Live Auction Simulation Banner */}
        <div className="p-3 bg-neutral-bg border-b-2 border-neutral-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-sm font-bold text-neutral-ink">
            <Zap className={`w-4 h-4 shrink-0 ${isSurgeActive ? 'text-primary' : 'text-neutral-muted'}`} />
            <span>
              {isSurgeActive
                ? t('alerts.surgeActiveBanner')
                : 'Market Status: Regular Morning Mandi Arrivals'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsSurgeActive(!isSurgeActive)}
            className={`min-h-[44px] px-3 py-1.5 text-sm font-black border-2 border-neutral-ink shadow-hard flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
              isSurgeActive
                ? 'bg-sell text-sell-fg'
                : 'bg-neutral-surface text-neutral-ink hover:bg-neutral-bg'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>
              {isSurgeActive ? t('alerts.resetPrices') : t('alerts.simulateSurge')}
            </span>
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
                onChange={(e) => handleCropChange(e.target.value as CropId)}
                className="w-full p-2.5 bg-neutral-bg border-2 border-neutral-ink font-bold text-sm text-neutral-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
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

            {/* Target Mandi Select */}
            <div>
              <label className="block text-sm font-black text-neutral-ink uppercase tracking-wider mb-1">
                {t('alerts.mandiLabel')}
              </label>
              <select
                value={selectedMandi}
                onChange={(e) => setSelectedMandi(e.target.value)}
                className="w-full p-2.5 bg-neutral-bg border-2 border-neutral-ink font-bold text-sm text-neutral-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              >
                <option value="any_best">
                  🌟 {t('alerts.mandiAutoDetect')}
                </option>
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

          {/* Target Net Profit & Lot Size */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-black text-neutral-ink uppercase tracking-wider mb-1">
                {t('alerts.targetPriceLabel')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 font-black text-neutral-muted text-base">
                  ₹
                </span>
                <input
                  type="number"
                  min="500"
                  max="15000"
                  step="50"
                  value={targetProfit}
                  onChange={(e) => setTargetProfit(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2.5 bg-neutral-bg border-2 border-neutral-ink font-black text-base text-neutral-ink focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-neutral-ink uppercase tracking-wider mb-1">
                {t('alerts.lotSizeLabel')}
              </label>
              <select
                value={lotSizeQtl}
                onChange={(e) => setLotSizeQtl(Number(e.target.value))}
                className="w-full p-2.5 bg-neutral-bg border-2 border-neutral-ink font-bold text-sm text-neutral-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              >
                <option value={10}>10 qtl</option>
                <option value={20}>20 qtl</option>
                <option value={50}>50 qtl</option>
                <option value={100}>100 qtl</option>
              </select>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-sm font-bold text-neutral-muted">Presets:</span>
            {[
              selectedCrop === 'tomato' ? 1500 : selectedCrop === 'soybean' ? 4400 : 2200,
              selectedCrop === 'tomato' ? 1650 : selectedCrop === 'soybean' ? 4500 : 2350,
              selectedCrop === 'tomato' ? 1800 : selectedCrop === 'soybean' ? 4650 : 2500,
            ].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTargetProfit(p)}
                className={`min-h-[44px] px-3 py-1 text-sm font-bold border-2 border-neutral-ink cursor-pointer ${
                  targetProfit === p
                    ? 'bg-primary text-primary-fg shadow-hard'
                    : 'bg-neutral-bg text-neutral-ink hover:bg-neutral-surface'
                }`}
              >
                {formatRupee(p)}/qtl
              </button>
            ))}

            <button
              type="submit"
              className="ml-auto min-h-[44px] px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg font-black text-sm border-2 border-neutral-ink shadow-hard flex items-center gap-1.5 cursor-pointer transition-transform active:translate-x-0.5 active:translate-y-0.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('alerts.save')}</span>
            </button>
          </div>

          {feedbackMsg && (
            <div className="p-3 bg-sell-bg border-2 border-sell text-sell font-bold text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}
        </form>

        {/* Existing Active Profit Alerts List */}
        <div className="p-4 sm:p-5 max-h-80 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-black text-neutral-ink uppercase tracking-wider flex items-center gap-1.5">
              <span>{t('alerts.activeAlerts')}</span>
              <span className="px-2 py-0.2 bg-neutral-ink text-neutral-surface text-sm font-bold">
                {alerts.length}
              </span>
            </span>

            {hasAnyHitAlert && (
              <span className="px-2 py-0.5 bg-sell-bg text-sell border border-sell font-black text-sm uppercase flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Target Hit Active!</span>
              </span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="p-5 text-center text-sm font-semibold text-neutral-muted border-2 border-dashed border-neutral-border">
              {t('alerts.noAlerts')}
            </div>
          ) : (
            alerts.map((alert) => {
              const crop = CROPS[alert.cropId];
              const list = evaluatedMandis[alert.cropId] || [];
              const topMandi = list[0];
              const targetMandi =
                alert.mandiId === 'any_best'
                  ? topMandi
                  : list.find((m) => m.mandi.id === alert.mandiId) || topMandi;

              if (!targetMandi) return null;

              const isHit = targetMandi.netInPocket >= alert.targetProfit;
              const diff = targetMandi.netInPocket - alert.targetProfit;

              const cropName = crop
                ? currentLang === 'mr'
                  ? crop.name_mr
                  : currentLang === 'hi'
                  ? crop.name_hi
                  : crop.name_en
                : alert.cropId;

              const mandiName =
                currentLang === 'mr'
                  ? targetMandi.mandi.name_mr
                  : currentLang === 'hi'
                  ? targetMandi.mandi.name_hi
                  : targetMandi.mandi.name;

              return (
                <div
                  key={alert.id}
                  className={`p-4 border-2 transition-all space-y-2.5 ${
                    isHit
                      ? 'bg-sell-bg border-sell shadow-hard'
                      : 'bg-neutral-surface border-neutral-ink shadow-hard'
                  }`}
                >
                  {/* Top Bar: Status Chip & Delete Button */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{crop?.emoji || '🌾'}</span>
                      <div>
                        <div className="font-black text-base text-neutral-ink">
                          {cropName} ({alert.lotSizeQtl} qtl lot)
                        </div>
                        <div className="text-sm font-semibold text-neutral-muted">
                          Target Net: {formatRupee(alert.targetProfit)} / qtl
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isHit ? (
                        <span className="px-2.5 py-1 bg-sell text-sell-fg font-black text-sm uppercase flex items-center gap-1 border border-neutral-ink">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                          <span>{t('alerts.targetHit')}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-hold-bg text-hold border border-hold font-black text-sm uppercase flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{t('alerts.awayFromTarget', { amount: Math.abs(diff) })}</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteAlert(alert.id)}
                        title={t('alerts.deleteAlert')}
                        aria-label="Delete alert"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-muted hover:text-risk hover:bg-neutral-surface border border-neutral-border cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mandi Profit Details Callout */}
                  <div className="p-3 bg-neutral-surface border border-neutral-ink space-y-2">
                    <div className="flex items-center justify-between text-base flex-wrap gap-1">
                      <div className="font-extrabold text-neutral-ink flex items-center gap-1.5">
                        <MapPin className="w-5 h-5 text-primary shrink-0" />
                        <span>
                          {mandiName}{' '}
                          {alert.mandiId === 'any_best' ? `(${t('alerts.possessesHighest')})` : ''}
                        </span>
                      </div>
                      <div className="font-black text-lg text-primary">
                        {formatRupee(targetMandi.netInPocket)} / qtl net
                      </div>
                    </div>

                    {/* Comparison Message */}
                    {isHit ? (
                      <div className="text-sm font-black text-sell flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          {t('alerts.aboveTarget', { amount: diff })} {mandiName} {t('alerts.possessesHighest')}!
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-neutral-muted">
                        {t('alerts.holdingAdvice')}
                      </div>
                    )}

                    {/* Expandable Breakdown Toggle */}
                    <div className="pt-1 border-t border-neutral-border">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedBreakdowns((prev) => ({
                            ...prev,
                            [alert.id]: !prev[alert.id],
                          }))
                        }
                        className="text-sm font-bold text-neutral-muted hover:text-neutral-ink flex items-center gap-1 cursor-pointer py-1"
                      >
                        <span>
                          {expandedBreakdowns[alert.id]
                            ? t('recommendation.hideBreakdown')
                            : t('recommendation.viewBreakdown')}
                        </span>
                        {expandedBreakdowns[alert.id] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {expandedBreakdowns[alert.id] && (
                        <div className="mt-2 p-2.5 bg-neutral-bg border border-neutral-ink text-sm space-y-1">
                          <div className="font-semibold text-neutral-ink flex justify-between">
                            <span>Mandi Gross Price:</span>
                            <span className="font-bold">{formatRupee(targetMandi.grossPrice)} / qtl</span>
                          </div>
                          <div className="font-semibold text-neutral-muted flex justify-between">
                            <span>Freight ({targetMandi.distanceKm} km):</span>
                            <span>-{formatRupee(targetMandi.transportPerQtl)} / qtl</span>
                          </div>
                          <div className="font-semibold text-risk flex justify-between">
                            <span>Freshness Decay Loss:</span>
                            <span>-{formatRupee(targetMandi.spoilagePerQtl)} / qtl</span>
                          </div>
                          <div className="border-t border-neutral-border pt-1 font-black text-neutral-ink flex justify-between">
                            <span>Total In-Pocket Cash:</span>
                            <span className="text-primary font-black text-base">{formatRupee(targetMandi.totalCash)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions when Target Hit */}
                  {isHit && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(alert, targetMandi, diff)}
                        className="flex-1 min-h-[44px] px-3 py-2 bg-neutral-surface hover:bg-neutral-bg text-neutral-ink font-black text-sm border-2 border-neutral-ink shadow-hard flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4 text-primary" />
                        <span>{t('alerts.dispatchViaWhatsApp')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate('/map');
                        }}
                        className="flex-1 min-h-[44px] px-3 py-2 bg-primary hover:bg-primary-hover text-primary-fg font-black text-sm border-2 border-neutral-ink shadow-hard flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>{t('alerts.viewMapRoute')}</span>
                      </button>
                    </div>
                  )}
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
