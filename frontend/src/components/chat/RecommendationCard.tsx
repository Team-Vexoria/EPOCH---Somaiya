import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  MapPin,
  Truck,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles,
  Share2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Calculator,
  BookOpen,
  DollarSign,
  Package,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import type { Recommendation, ForecastPoint } from '../../types';
import { formatRupee } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onOpenCalculator?: (cropId: string) => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onOpenCalculator,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language || 'mr';
  const { cropQuantities } = useAppStore();

  const farmerStock = recommendation.cropId && cropQuantities?.[recommendation.cropId]
    ? cropQuantities[recommendation.cropId]
    : 20;

  const [showDetailedGraphs, setShowDetailedGraphs] = useState(false);
  const [showWhyAdvice, setShowWhyAdvice] = useState(false);
  const [selectedLotSize, setSelectedLotSize] = useState<number>(farmerStock);

  const isHold = recommendation.decision === 'HOLD';
  const localizedBestMandi =
    currentLang === 'mr'
      ? recommendation.bestMandi_mr || recommendation.bestMandi
      : currentLang === 'hi'
      ? recommendation.bestMandi_hi || recommendation.bestMandi
      : recommendation.bestMandi;

  // Chart data formatting for uncertainty band
  const chartPoints = (recommendation.forecastTrend || []).map((pt: ForecastPoint) => ({
    dayLabel: pt.dayLabel,
    date: pt.date,
    mid: pt.mid,
    range: [pt.low, pt.high],
    low: pt.low,
    high: pt.high,
  }));

  const handleWhatsAppShare = () => {
    const headline = isHold
      ? `*${t('recommendation.holdDays', { days: recommendation.holdDays || 10 })}*`
      : `*${t('recommendation.sellNow')}*`;

    const bestMandiText = `📍 ${t('recommendation.bestMandi')}: ${localizedBestMandi}`;
    const gainText = `💰 ${t('recommendation.expectedGain', {
      gain: `₹${recommendation.expectedGainPerQuintal}`,
    })}`;
    const reasonText = `ℹ️ ${recommendation.confidenceReason}`;
    const linkText = `🌾 Sell Smart Advisory - Nashik Mandis`;

    const shareBody = `${headline}\n${bestMandiText}\n${gainText}\n${reasonText}\n\n${linkText}`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareBody)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenMap = () => {
    const cropQuery = recommendation.cropId ? `?crop=${recommendation.cropId}` : '';
    navigate(`/map${cropQuery}`);
  };

  return (
    <div className="mt-4 bg-neutral-surface border-2 border-neutral-ink shadow-hard overflow-hidden">
      {/* 1. Top Headline Banner: Core Decision & Best Mandi */}
      <div
        className={`p-4 sm:p-5 border-b-2 border-neutral-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isHold ? 'bg-hold-bg' : 'bg-sell-bg'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`min-h-[48px] px-4 py-2 font-black text-lg border-2 border-neutral-ink shadow-hard uppercase tracking-wider flex items-center gap-2 ${
              isHold ? 'bg-hold text-hold-fg' : 'bg-sell text-sell-fg'
            }`}
          >
            {isHold ? <Clock className="w-6 h-6 shrink-0" /> : <Sparkles className="w-6 h-6 shrink-0" />}
            <span>
              {isHold
                ? t('recommendation.holdDays', {
                    days: recommendation.holdDays || 10,
                  })
                : t('recommendation.sellNow')}
            </span>
          </div>

          <div>
            <div className="text-sm font-bold text-neutral-muted uppercase tracking-wider">
              {t('recommendation.bestMandi')}
            </div>
            <div className="text-xl sm:text-2xl font-black text-neutral-ink flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <span>{localizedBestMandi}</span>
            </div>
          </div>
        </div>

        {/* Expected Net Gain Pill */}
        <div className="bg-neutral-surface border-2 border-neutral-ink px-4 py-2 shadow-hard self-start sm:self-auto">
          <div className="text-sm font-bold text-neutral-muted">
            Expected Advantage
          </div>
          <div className="text-xl sm:text-2xl font-black text-sell">
            +{formatRupee(recommendation.expectedGainPerQuintal)} / qtl
          </div>
        </div>
      </div>

      {/* 2. Confidence Chip & Scannable Plain-Language Reason */}
      <div className="px-4 py-3 bg-neutral-bg border-b-2 border-neutral-border flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 border-2 border-neutral-ink shadow-hard text-sm font-black uppercase ${
              recommendation.confidence === 'HIGH'
                ? 'bg-sell text-sell-fg'
                : recommendation.confidence === 'MEDIUM'
                ? 'bg-hold text-hold-fg'
                : 'bg-risk text-risk-fg'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{recommendation.confidence} Confidence</span>
          </span>
        </div>

        <p className="text-neutral-ink font-bold text-base leading-snug">
          {recommendation.confidenceReason}
        </p>
      </div>

      {/* 3. Primary Quick Action Buttons (Immediate 1-Tap Access for Farmers) */}
      <div className="p-3.5 bg-neutral-surface flex flex-wrap items-center justify-between gap-2.5 border-b-2 border-neutral-ink">
        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp Share Button */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="min-h-[44px] px-4 py-2 bg-sell hover:bg-sell/90 text-sell-fg font-black text-base border-2 border-neutral-ink shadow-hard flex items-center gap-2 transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{t('recommendation.shareWhatsApp')}</span>
          </button>

          {/* Mandi Map Link */}
          <button
            type="button"
            onClick={handleOpenMap}
            className="min-h-[44px] px-4 py-2 bg-neutral-surface hover:bg-neutral-bg text-neutral-ink font-black text-base border-2 border-neutral-ink shadow-hard flex items-center gap-2 transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span>{t('recommendation.viewMap')}</span>
          </button>
        </div>

        {/* Simulate Holding Days Tool Launcher */}
        {onOpenCalculator && (
          <button
            type="button"
            onClick={() => onOpenCalculator(recommendation.cropId || 'onion')}
            className="min-h-[44px] px-4 py-2 bg-primary hover:bg-primary-hover text-primary-fg font-black text-base border-2 border-neutral-ink shadow-hard flex items-center gap-2 transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
            <span>{t('recommendation.simulateDays')}</span>
          </button>
        )}
      </div>

      {/* 4. Progressive Disclosure Button ("Read More" for Details & Graphs) */}
      <div className="p-3 bg-neutral-bg border-b-2 border-neutral-ink">
        <button
          type="button"
          onClick={() => setShowDetailedGraphs(!showDetailedGraphs)}
          className={`w-full min-h-[48px] py-3 px-4 text-base font-black border-2 border-neutral-ink shadow-hard flex items-center justify-center gap-2 cursor-pointer transition-colors ${
            showDetailedGraphs
              ? 'bg-neutral-surface text-neutral-ink hover:bg-neutral-bg'
              : 'bg-primary-subtle text-primary hover:bg-primary hover:text-primary-fg'
          }`}
        >
          <TrendingUp className="w-5 h-5 shrink-0" />
          <span>
            {showDetailedGraphs
              ? t('recommendation.collapseGraphs')
              : t('recommendation.readMoreGraphs')}
          </span>
          {showDetailedGraphs ? (
            <ChevronUp className="w-5 h-5 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 shrink-0" />
          )}
        </button>
      </div>

      {/* 5. Collapsible Detailed Graphs, Mandi Table, and Citations */}
      {showDetailedGraphs && (
        <div className="animate-in fade-in duration-200 divide-y-2 divide-neutral-border">
          {/* Forecast Uncertainty Band Chart */}
          {chartPoints.length > 0 && (
            <div className="p-4 sm:p-5 bg-neutral-surface">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                <h4 className="text-base font-black text-neutral-ink uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span>{t('recommendation.chartTitle')}</span>
                </h4>
                <div className="flex items-center gap-3 text-sm font-bold text-neutral-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 bg-hold-bg border border-hold inline-block" />
                    <span>{t('recommendation.chartBand')}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-1 bg-neutral-ink inline-block" />
                    <span>{t('recommendation.modalPrice')}</span>
                  </span>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartPoints}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 14, fill: 'var(--color-neutral-ink)', fontWeight: 700 }}
                      axisLine={{ stroke: 'var(--color-neutral-ink)', strokeWidth: 2 }}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 14, fill: 'var(--color-neutral-muted)', fontWeight: 600 }}
                      axisLine={{ stroke: 'var(--color-neutral-ink)', strokeWidth: 2 }}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-neutral-surface border-2 border-neutral-ink shadow-hard p-3 text-sm">
                              <div className="font-black text-base text-neutral-ink border-b border-neutral-border pb-1 mb-1">
                                {data.dayLabel}
                              </div>
                              <div className="text-primary font-black text-base">
                                Modal Price: {formatRupee(data.mid)} / qtl
                              </div>
                              <div className="text-neutral-muted font-bold text-sm mt-0.5">
                                Uncertainty Band: {formatRupee(data.low)} - {formatRupee(data.high)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Uncertainty Shaded Band between Low and High */}
                    <Area
                      dataKey="range"
                      stroke="var(--color-hold)"
                      strokeWidth={1.5}
                      fill="var(--color-hold-bg)"
                      fillOpacity={0.7}
                      name="Uncertainty Range"
                    />
                    {/* Modal Expected Forecast Line */}
                    <Line
                      type="monotone"
                      dataKey="mid"
                      stroke="var(--color-neutral-ink)"
                      strokeWidth={3}
                      dot={{
                        r: 4.5,
                        stroke: 'var(--color-neutral-ink)',
                        strokeWidth: 2,
                        fill: 'var(--color-neutral-surface)',
                      }}
                      activeDot={{ r: 7 }}
                      name="Modal Price"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Mandi Comparison Table */}
          <div className="p-4 sm:p-5 bg-neutral-surface">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <h4 className="text-base font-black text-neutral-ink uppercase tracking-wider flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <span>{t('recommendation.mandiComparison')}</span>
              </h4>

              {/* Quick Lot Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-muted">Lot Size:</span>
                {[10, 20, 50].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedLotSize(size)}
                    className={`min-h-[44px] px-3 py-1.5 text-sm font-black border-2 border-neutral-ink transition-colors cursor-pointer ${
                      selectedLotSize === size
                        ? 'bg-primary text-primary-fg shadow-hard'
                        : 'bg-neutral-surface text-neutral-ink hover:bg-neutral-bg'
                    }`}
                  >
                    {size} qtl
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto border-2 border-neutral-ink">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-neutral-ink bg-neutral-bg text-sm font-black text-neutral-ink">
                    <th className="py-3 px-3.5">{t('recommendation.table.mandi')}</th>
                    <th className="py-3 px-3.5">{t('recommendation.table.distance')}</th>
                    <th className="py-3 px-3.5">{t('recommendation.table.price')}</th>
                    <th className="py-3 px-3.5">{t('recommendation.table.transport')}</th>
                    <th className="py-3 px-3.5">{t('recommendation.table.spoilage')}</th>
                    <th className="py-3 px-3.5 text-right">
                      {t('recommendation.table.net')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border text-base">
                  {recommendation.mandis.map((m, idx) => {
                    const localizedName =
                      currentLang === 'mr'
                        ? m.name_mr || m.name
                        : currentLang === 'hi'
                        ? m.name_hi || m.name
                        : m.name;

                    const isTop = m.isOptimal ?? idx === 0;
                    const totalNetLot = m.netPerQuintal * selectedLotSize;

                    return (
                      <tr
                        key={m.id}
                        className={`transition-colors ${
                          isTop
                            ? 'bg-primary-subtle font-bold border-l-4 border-l-primary'
                            : 'hover:bg-neutral-bg'
                        }`}
                      >
                        <td className="py-3 px-3.5">
                          <div className="font-extrabold text-neutral-ink flex items-center gap-1.5">
                            {isTop && (
                              <span className="text-sell font-black text-sm">👑 Best</span>
                            )}
                            <span>{localizedName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-neutral-muted font-bold text-sm">
                          {m.distanceKm} km
                        </td>
                        <td className="py-3 px-3.5 font-bold text-neutral-ink">
                          {formatRupee(m.forecastPrice)}
                        </td>
                        <td className="py-3 px-3.5 text-neutral-muted font-semibold text-sm">
                          -₹{m.transportCost}
                        </td>
                        <td className="py-3 px-3.5 text-risk font-bold text-sm">
                          -₹{m.spoilageLoss}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <span
                            className={`inline-block font-black text-lg ${
                              isTop ? 'text-sell' : 'text-neutral-ink'
                            }`}
                          >
                            {formatRupee(m.netPerQuintal)}
                          </span>
                          <span className="text-sm font-bold text-neutral-muted block">
                            Total: {formatRupee(totalNetLot)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* RAG Citations Accordion ("Why this advice?") */}
          {recommendation.whyAdvice && recommendation.whyAdvice.length > 0 && (
            <div className="p-4 sm:p-5 bg-neutral-surface">
              <button
                type="button"
                onClick={() => setShowWhyAdvice(!showWhyAdvice)}
                className="w-full flex items-center justify-between text-left font-black text-base text-neutral-ink hover:text-primary transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary shrink-0" />
                  <span>{t('recommendation.whyAdvice')}</span>
                </div>
                {showWhyAdvice ? (
                  <ChevronUp className="w-5 h-5 text-neutral-muted" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-neutral-muted" />
                )}
              </button>

              {showWhyAdvice && (
                <div className="mt-3.5 space-y-3 pt-3 border-t border-neutral-border">
                  {recommendation.whyAdvice.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-neutral-bg border-2 border-neutral-ink shadow-hard"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-extrabold text-base text-neutral-ink">
                          {item.title}
                        </span>
                        <span className="text-sm font-bold px-2 py-0.5 bg-neutral-surface border border-neutral-ink text-neutral-muted">
                          {item.source}
                        </span>
                      </div>
                      <p className="text-base text-neutral-ink leading-relaxed">
                        "{item.snippet}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendationCard;
