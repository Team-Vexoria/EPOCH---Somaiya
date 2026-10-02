import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calculator,
  Calendar,
  Truck,
  Package,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  X,
  CheckCircle2,
  Info,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { formatRupee } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import { CROPS } from '../../config/crops';
import type { CropId } from '../../types';

interface NetReturnCalculatorProps {
  initialCrop?: CropId;
  onClose?: () => void;
  isModal?: boolean;
}

interface CropParams {
  name_en: string;
  name_hi: string;
  name_mr: string;
  emoji: string;
  basePrice: number;
  maxDays: number;
  dailySpoilageRate: number; // fraction per day
  priceDeltaFn: (day: number) => number;
}

const CROP_PARAMS: Record<CropId, CropParams> = {
  onion: {
    name_en: 'Onion (कांदा)',
    name_hi: 'प्याज (कांदा)',
    name_mr: 'कांदा (Onion)',
    emoji: '🧅',
    basePrice: 2280,
    maxDays: 30,
    dailySpoilageRate: 0.0045, // 0.45% per day in aerated chawl
    priceDeltaFn: (d: number) => {
      // Prices rise for 10-12 days due to seasonal supply contraction, then plateau
      if (d <= 10) return d * 22;
      return 220 + (d - 10) * 4;
    },
  },
  tomato: {
    name_en: 'Tomato (टोमॅटो)',
    name_hi: 'टमाटर (टोमॅटो)',
    name_mr: 'टोमॅटो (Tomato)',
    emoji: '🍅',
    basePrice: 1680,
    maxDays: 7,
    dailySpoilageRate: 0.038, // 3.8% rapid spoilage per day!
    priceDeltaFn: (d: number) => {
      // Tomatoes fall rapidly as crate firmness deteriorates
      return -d * 25;
    },
  },
  soybean: {
    name_en: 'Soybean (सोयाबीन)',
    name_hi: 'सोयाबीन (Soybean)',
    name_mr: 'सोयाबीन (Soybean)',
    emoji: '🫘',
    basePrice: 4490,
    maxDays: 45,
    dailySpoilageRate: 0.0003, // 0.03% very low decay in dry bag
    priceDeltaFn: (d: number) => {
      // Gradual steady gains over weeks
      return d * 11;
    },
  },
};

export const NetReturnCalculator: React.FC<NetReturnCalculatorProps> = ({
  initialCrop = 'onion',
  onClose,
  isModal = false,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'mr';

  const { harvestDaysAgo } = useAppStore();
  const [selectedCrop, setSelectedCrop] = useState<CropId>(initialCrop);
  const [daysHeld, setDaysHeld] = useState<number>(selectedCrop === 'tomato' ? 0 : 10);
  const [quantityQtl, setQuantityQtl] = useState<number>(20);
  const [distanceKm, setDistanceKm] = useState<number>(22);

  const daysSinceHarvest = harvestDaysAgo?.[selectedCrop] ?? 0;
  const totalCropShelfLife = CROPS[selectedCrop]?.shelfLifeDays ?? 30;
  const remainingShelfLife = Math.max(0, totalCropShelfLife - daysSinceHarvest);
  const willExceedRemainingShelfLife = daysHeld > remainingShelfLife;

  const crop = CROP_PARAMS[selectedCrop] || CROP_PARAMS.onion;
  const transportRatePerKm = 1.8; // ₹1.8 / quintal / km for pickup/truck freight

  // When crop changes, ensure daysHeld is within range
  const handleCropChange = (c: CropId) => {
    setSelectedCrop(c);
    const newMax = CROP_PARAMS[c].maxDays;
    if (c === 'tomato') {
      setDaysHeld(0); // Default sell now for tomatoes
    } else if (daysHeld > newMax) {
      setDaysHeld(newMax);
    }
  };

  // Math logic: Net = Price - Transport - Spoilage
  const computeNet = (days: number) => {
    const grossPrice = crop.basePrice + crop.priceDeltaFn(days);
    const transportCost = distanceKm * transportRatePerKm;
    const spoilageLoss = grossPrice * (crop.dailySpoilageRate * days);
    const netPerQtl = Math.max(0, grossPrice - transportCost - spoilageLoss);
    const totalNet = netPerQtl * quantityQtl;

    return {
      grossPrice,
      transportCost,
      spoilageLoss,
      netPerQtl: Math.round(netPerQtl),
      totalNet: Math.round(totalNet),
    };
  };

  const currentResult = useMemo(() => computeNet(daysHeld), [selectedCrop, daysHeld, quantityQtl, distanceKm]);
  const dayZeroResult = useMemo(() => computeNet(0), [selectedCrop, quantityQtl, distanceKm]);

  const diffVsSellNow = currentResult.totalNet - dayZeroResult.totalNet;
  const diffPerQtl = currentResult.netPerQtl - dayZeroResult.netPerQtl;

  // Generate curve data points from day 0 to maxDays
  const curveData = useMemo(() => {
    const points = [];
    for (let d = 0; d <= crop.maxDays; d++) {
      const res = computeNet(d);
      points.push({
        day: d,
        dayLabel: d === 0 ? 'Today' : `+${d}d`,
        netPerQtl: res.netPerQtl,
        totalNet: res.totalNet,
      });
    }
    return points;
  }, [selectedCrop, quantityQtl, distanceKm]);

  // Find optimal day
  const optimalPoint = useMemo(() => {
    let best = curveData[0];
    for (const pt of curveData) {
      if (pt.netPerQtl > best.netPerQtl) {
        best = pt;
      }
    }
    return best;
  }, [curveData]);

  const isTomatoDecayWarning = selectedCrop === 'tomato' && daysHeld > 1;

  const content = (
    <div className="bg-neutral-surface border-2 border-neutral-ink shadow-hard overflow-hidden">
      {/* Top Header */}
      <div className="p-4 bg-primary text-primary-fg border-b-2 border-neutral-ink flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-neutral-surface text-neutral-ink border-2 border-neutral-ink shadow-hard flex items-center justify-center font-bold">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
              {t('calculator.title')}
            </h3>
            <p className="text-sm opacity-90 font-medium">
              {t('calculator.subtitle')}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calculator"
            className="p-1.5 bg-neutral-surface text-neutral-ink border-2 border-neutral-ink hover:bg-neutral-bg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Crop Selector Tabs */}
        <div>
          <label className="block text-sm font-black text-neutral-ink uppercase tracking-wider mb-2">
            1. {t('alerts.cropLabel')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['onion', 'tomato', 'soybean'] as CropId[]).map((cId) => {
              const c = CROP_PARAMS[cId];
              const isSelected = selectedCrop === cId;
              const displayName =
                currentLang === 'mr'
                  ? c.name_mr
                  : currentLang === 'hi'
                  ? c.name_hi
                  : c.name_en;

              return (
                <button
                  key={cId}
                  type="button"
                  onClick={() => handleCropChange(cId)}
                  className={`p-2.5 text-center border-2 border-neutral-ink transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary-subtle border-primary text-primary font-black shadow-hard translate-x-0.5'
                      : 'bg-neutral-surface text-neutral-ink hover:bg-neutral-bg font-bold'
                  }`}
                >
                  <span className="text-xl block mb-0.5">{c.emoji}</span>
                  <span className="text-sm truncate block">{displayName}</span>
                </button>
              );
            })}
          </div>

          {/* Batch Freshness Strip based on user harvest date */}
          <div className="mt-2.5 flex items-center justify-between text-sm px-3 py-2 bg-neutral-surface border-2 border-neutral-ink shadow-hard">
            <div className="flex items-center gap-2 font-bold text-neutral-ink">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span>
                Batch Harvest:{' '}
                {daysSinceHarvest === 0
                  ? 'Today (0d)'
                  : `${daysSinceHarvest} days ago`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-muted font-medium">Remaining:</span>
              <span
                className={`font-black text-sm px-2 py-0.5 border ${
                  remainingShelfLife <= 1
                    ? 'bg-risk-bg text-risk border-risk'
                    : remainingShelfLife <= 3
                    ? 'bg-hold-bg text-hold border-hold'
                    : 'bg-sell-bg text-sell border-sell'
                }`}
              >
                {remainingShelfLife} days left
              </span>
            </div>
          </div>
        </div>

        {/* Sliders Grid: Days Held & Distance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-neutral-bg border-2 border-neutral-ink">
          {/* Days Held Slider */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-black text-neutral-ink uppercase flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{t('calculator.daysLabel')}</span>
              </span>
              <span className="px-2.5 py-0.5 bg-neutral-surface border-2 border-neutral-ink font-black text-base text-neutral-ink shadow-hard">
                {daysHeld === 0 ? 'Today (0 days)' : `${daysHeld} Days`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={crop.maxDays}
              value={daysHeld}
              onChange={(e) => setDaysHeld(Number(e.target.value))}
              className="w-full accent-primary h-2 cursor-pointer bg-neutral-border border border-neutral-ink"
            />
            <div className="flex justify-between text-sm font-bold text-neutral-muted mt-1">
              <span>0 (Immediate)</span>
              <span className="text-primary font-black">
                Peak: +{optimalPoint.day} days
              </span>
              <span>+{crop.maxDays} days max</span>
            </div>
          </div>

          {/* Harvest Quantity Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-black text-neutral-ink uppercase flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary" />
                <span>{t('calculator.quantityLabel')}</span>
              </span>
              <span className="px-2 py-0.5 bg-neutral-surface border-2 border-neutral-ink font-bold text-sm text-neutral-ink">
                {quantityQtl} qtl
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[10, 20, 50, 100].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setQuantityQtl(qty)}
                  className={`flex-1 py-1 text-sm font-black border-2 border-neutral-ink transition-colors cursor-pointer ${
                    quantityQtl === qty
                      ? 'bg-neutral-ink text-neutral-surface shadow-hard'
                      : 'bg-neutral-surface text-neutral-ink hover:bg-neutral-bg'
                  }`}
                >
                  {qty}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Perishability Warning Banner */}
        {isTomatoDecayWarning && (
          <div className="p-3 bg-risk-bg border-2 border-risk text-risk flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-sm uppercase tracking-wide">
                High Perishability Risk
              </div>
              <p className="text-sm font-semibold text-neutral-ink leading-snug">
                Tomatoes held past 24-48 hours face 15%-25% crate rot and skin softening. Holding lowers net cash in hand!
              </p>
            </div>
          </div>
        )}

        {/* Exceeds Remaining Shelf Life Warning Banner */}
        {willExceedRemainingShelfLife && (
          <div className="p-3 bg-risk-bg border-2 border-risk text-risk flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-sm uppercase tracking-wide">
                Exceeds Remaining Shelf-Life
              </div>
              <p className="text-sm font-semibold text-neutral-ink leading-snug">
                Holding for +{daysHeld} days exceeds remaining shelf-life ({remainingShelfLife} days left, {daysSinceHarvest}d already elapsed). Produce will face severe spoilage!
              </p>
            </div>
          </div>
        )}

        {/* Live Calculation Output Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Net Per Quintal */}
          <div className="p-4 bg-neutral-surface border-2 border-neutral-ink shadow-hard">
            <div className="text-sm font-bold text-neutral-muted uppercase">
              {t('calculator.netPerQuintal')}
            </div>
            <div className="text-2xl font-black text-neutral-ink mt-1">
              {formatRupee(currentResult.netPerQtl)}
              <span className="text-sm text-neutral-muted font-normal"> / qtl</span>
            </div>
            <div className="text-sm text-neutral-muted mt-1 font-semibold">
              Gross: ₹{currentResult.grossPrice} | Freight: -₹{Math.round(currentResult.transportCost)} | Loss: -₹{Math.round(currentResult.spoilageLoss)}
            </div>
          </div>

          {/* Total Lot Payout */}
          <div className="p-4 bg-neutral-surface border-2 border-neutral-ink shadow-hard">
            <div className="text-sm font-bold text-neutral-muted uppercase">
              {t('calculator.totalLotValue')} ({quantityQtl} qtl)
            </div>
            <div className="text-2xl font-black text-primary mt-1">
              {formatRupee(currentResult.totalNet)}
            </div>
            <div className="text-sm text-neutral-muted mt-1 font-semibold">
              Net cash deposited in bank
            </div>
          </div>

          {/* Advantage vs Selling Day 0 */}
          <div
            className={`p-4 border-2 border-neutral-ink shadow-hard ${
              diffVsSellNow >= 0 ? 'bg-sell-bg' : 'bg-risk-bg'
            }`}
          >
            <div className="text-sm font-bold text-neutral-muted uppercase">
              {t('calculator.gainVsSellNow')}
            </div>
            <div
              className={`text-2xl font-black mt-1 ${
                diffVsSellNow >= 0 ? 'text-sell' : 'text-risk'
              }`}
            >
              {diffVsSellNow >= 0 ? '+' : ''}
              {formatRupee(diffVsSellNow)}
            </div>
            <div className="text-sm font-bold text-neutral-ink mt-1">
              {diffPerQtl >= 0 ? `+₹${diffPerQtl}` : `-₹${Math.abs(diffPerQtl)}`} / quintal difference
            </div>
          </div>
        </div>

        {/* Interactive Net Return Curve Chart */}
        <div className="p-4 bg-neutral-bg border-2 border-neutral-ink">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
            <div>
              <h4 className="text-sm font-black text-neutral-ink uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>Net Return Curve (Inflection Point Analysis)</span>
              </h4>
              <p className="text-sm text-neutral-muted font-medium">
                Peak net returns occur on <strong className="text-neutral-ink font-black">Day {optimalPoint.day} ({formatRupee(optimalPoint.netPerQtl)}/qtl)</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-sm font-bold text-sell">
                <CheckCircle2 className="w-4 h-4" />
                <span>Max: Day {optimalPoint.day}</span>
              </span>
            </div>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={curveData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="dayLabel"
                  tick={{ fontSize: 14, fill: 'var(--color-neutral-ink)', fontWeight: 600 }}
                  axisLine={{ stroke: 'var(--color-neutral-ink)', strokeWidth: 1.5 }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 14, fill: 'var(--color-neutral-muted)' }}
                  axisLine={{ stroke: 'var(--color-neutral-ink)', strokeWidth: 1.5 }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-neutral-surface border-2 border-neutral-ink shadow-hard p-2.5 text-sm">
                          <div className="font-black text-neutral-ink">
                            Day {data.day}
                          </div>
                          <div className="text-primary font-bold">
                            Net: {formatRupee(data.netPerQtl)} / qtl
                          </div>
                          <div className="text-neutral-muted text-sm font-medium">
                            Total: {formatRupee(data.totalNet)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Vertical marker for selected slider day */}
                <ReferenceLine
                  x={daysHeld === 0 ? 'Today' : `+${daysHeld}d`}
                  stroke="var(--color-risk)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
                {/* Peak point reference */}
                <ReferenceDot
                  x={optimalPoint.dayLabel}
                  y={optimalPoint.netPerQtl}
                  r={6}
                  fill="var(--color-sell)"
                  stroke="var(--color-neutral-ink)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="netPerQtl"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-ink/60 overflow-y-auto">
        <div className="w-full max-w-3xl my-auto animate-in fade-in zoom-in-95 duration-150">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default NetReturnCalculator;
