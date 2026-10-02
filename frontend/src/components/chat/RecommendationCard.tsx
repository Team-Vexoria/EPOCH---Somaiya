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

  const [showWhyAdvice, setShowWhyAdvice] = useState(false);
  const [selectedLotSize, setSelectedLotSize] = useState<number>(20); // 20 quintals standard lot

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
      {/* Top Headline Banner */}
      <div
        className={`p-4 border-b-2 border-neutral-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isHold ? 'bg-hold-bg' : 'bg-sell-bg'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1.5 font-black text-base border-2 border-neutral-ink shadow-hard uppercase tracking-wider flex items-center gap-1.5 ${
              isHold ? 'bg-hold text-hold-fg' : 'bg-sell text-sell-fg'
            }`}
          >
            {isHold ? <Clock className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
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
            <div className="text-lg font-black text-neutral-ink flex items-center gap-1">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span>{localizedBestMandi}</span>
            </div>
          </div>
        </div>

        {/* Expected Net Gain Pill */}
        <div className="bg-neutral-surface border-2 border-neutral-ink px-3 py-1.5 shadow-hard self-start sm:self-auto">
          <div className="text-sm font-bold text-neutral-muted">
            Expected Advantage
          </div>
          <div className="text-lg font-black text-sell">
            +{formatRupee(recommendation.expectedGainPerQuintal)} / quintal
          </div>
        </div>
      </div>

      {/* Confidence Chip & Plain-Language Reason */}
      <div className="px-4 py-3 bg-neutral-bg border-b-2 border-neutral-border flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 border-2 border-neutral-ink shadow-hard text-sm font-black uppercase ${
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

        <p className="text-neutral-ink font-semibold text-sm">
          {recommendation.confidenceReason}
        </p>
      </div>

      {/* Forecast Uncertainty Band Chart */}
      {chartPoints.length > 0 && (
        <div className="p-4 border-b-2 border-neutral-border bg-neutral-surface">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
            <h4 className="text-sm font-black text-neutral-ink uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>{t('recommendation.chartTitle')}</span>
            </h4>
            <div className="flex items-center gap-3 text-sm font-bold text-neutral-muted">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-hold-bg border border-hold inline-block" />
                <span>{t('recommendation.chartBand')}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-neutral-ink inline-block" />
                <span>{t('recommendation.modalPrice')}</span>
              </span>
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartPoints}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
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
                          <div className="font-black text-neutral-ink border-b border-neutral-border pb-1 mb-1">
                            {data.dayLabel}
                          </div>
                          <div className="text-primary font-bold">
                            Modal: {formatRupee(data.mid)} / qtl
                          </div>
                          <div className="text-neutral-muted text-sm">
                            Likely Range: {formatRupee(data.low)} - {formatRupee(data.high)}
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
                  strokeWidth={1}
                  fill="var(--color-hold-bg)"
                  fillOpacity={0.7}
                  name="Uncertainty Range"
                />
                {/* Modal Expected Forecast Line */}
                <Line
                  type="monotone"
                  dataKey="mid"
                  stroke="var(--color-neutral-ink)"
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    stroke: 'var(--color-neutral-ink)',
                    strokeWidth: 2,
                    fill: 'var(--color-neutral-surface)',
                  }}
                  activeDot={{ r: 6 }}
                  name="Modal Price"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Mandi Comparison Table */}
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
          <h4 className="text-sm font-black text-neutral-ink uppercase tracking-wider flex items-center gap-1.5">
            <Package className="w-4 h-4 text-primary" />
            <span>{t('recommendation.mandiComparison')}</span>
          </h4>

          {/* Quick Lot Size Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-neutral-muted">Lot:</span>
            {[10, 20, 50].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedLotSize(size)}
                className={`px-2 py-0.5 text-sm font-black border-2 border-neutral-ink transition-colors cursor-pointer ${
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
                <th className="py-2.5 px-3">{t('recommendation.table.mandi')}</th>
                <th className="py-2.5 px-3">{t('recommendation.table.distance')}</th>
                <th className="py-2.5 px-3">{t('recommendation.table.price')}</th>
                <th className="py-2.5 px-3">{t('recommendation.table.transport')}</th>
                <th className="py-2.5 px-3">{t('recommendation.table.spoilage')}</th>
                <th className="py-2.5 px-3 text-right">
                  {t('recommendation.table.net')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border text-sm">
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
                        ? 'bg-primary-subtle font-semibold border-l-4 border-l-primary'
                        : 'hover:bg-neutral-bg'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="font-extrabold text-neutral-ink flex items-center gap-1.5">
                        {isTop && (
                          <span className="text-sell font-black text-sm">👑 Best</span>
                        )}
                        <span>{localizedName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-neutral-muted font-bold">
                      {m.distanceKm} km
                    </td>
                    <td className="py-3 px-3 font-bold text-neutral-ink">
                      {formatRupee(m.forecastPrice)}
                    </td>
                    <td className="py-3 px-3 text-neutral-muted">
                      -₹{m.transportCost}
                    </td>
                    <td className="py-3 px-3 text-risk font-bold">
                      -₹{m.spoilageLoss}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`inline-block font-black text-base ${
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
        <div className="border-t-2 border-neutral-border">
          <button
            type="button"
            onClick={() => setShowWhyAdvice(!showWhyAdvice)}
            className="w-full p-3 bg-neutral-bg hover:bg-neutral-border/60 transition-colors flex items-center justify-between text-left font-bold text-sm text-neutral-ink cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>{t('recommendation.whyAdvice')}</span>
            </span>
            {showWhyAdvice ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showWhyAdvice && (
            <div className="p-4 bg-neutral-surface border-t border-neutral-border space-y-3">
              {recommendation.whyAdvice.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-neutral-bg border border-neutral-border rounded-none"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-extrabold text-sm text-neutral-ink">
                      {item.title}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {item.source}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-muted leading-relaxed">
                    "{item.snippet}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Action Buttons */}
      <div className="p-3 bg-neutral-bg border-t-2 border-neutral-ink flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp Share Button */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="px-3 py-1.5 bg-sell hover:bg-sell/90 text-sell-fg font-extrabold text-sm border-2 border-neutral-ink shadow-hard flex items-center gap-1.5 transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{t('recommendation.shareWhatsApp')}</span>
          </button>

          {/* Mandi Map Link */}
          <button
            type="button"
            onClick={handleOpenMap}
            className="px-3 py-1.5 bg-neutral-surface hover:bg-neutral-bg text-neutral-ink font-bold text-sm border-2 border-neutral-ink shadow-hard flex items-center gap-1.5 transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
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
            className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-primary-fg font-extrabold text-sm border-2 border-neutral-ink shadow-hard flex items-center gap-1.5 transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
            <span>{t('recommendation.simulateDays')}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default RecommendationCard;
