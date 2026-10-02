import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { Recommendation, RagSource } from '../../api/types';
import { formatRupee } from '../../i18n';
import {
  TrendingUp,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface RecommendationCardProps {
  recommendation: Recommendation;
  sources?: RagSource[];
  totalQuantity?: number;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  sources,
  totalQuantity = 30,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.slice(0, 2);
  const [showWhy, setShowWhy] = useState(false);

  const isHold = recommendation.decision === 'HOLD';
  const bestMandiName =
    currentLang === 'mr'
      ? recommendation.bestMandi_mr
      : currentLang === 'hi'
      ? recommendation.bestMandi_hi
      : recommendation.bestMandi;

  const confidenceReason =
    currentLang === 'mr'
      ? recommendation.confidenceReason_mr
      : currentLang === 'hi'
      ? recommendation.confidenceReason_hi
      : recommendation.confidenceReason;

  const headlineDecision = isHold
    ? `${t('assistant.decision.holdDays', { days: recommendation.holdDays || 7 })}`
    : t('assistant.decision.sellNow');

  return (
    <div className="bg-neutral-surface border-2 border-neutral-ink shadow-hard p-5 sm:p-6 space-y-6 max-w-3xl my-2">
      {/* 1. Headline Decision Banner */}
      <div
        className={`p-4 sm:p-5 border-2 border-neutral-ink flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isHold ? 'bg-hold-bg' : 'bg-sell-bg'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 text-sm font-bold border-2 border-neutral-ink text-neutral-surface ${
                isHold ? 'bg-hold' : 'bg-sell'
              }`}
            >
              {headlineDecision}
            </span>
            <span className="text-base font-bold text-neutral-ink">
              @ {bestMandiName}
            </span>
          </div>

          <p className="text-lg sm:text-xl font-bold text-neutral-ink pt-1">
            {t('assistant.decision.expectedGain')}:{' '}
            <span className={isHold ? 'text-hold' : 'text-sell'}>
              +{formatRupee(recommendation.expectedGainPerQuintal)} / {t('assistant.decision.perQuintal')}
            </span>
          </p>
        </div>

        {/* Confidence Chip */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-surface border-2 border-neutral-ink self-start sm:self-auto">
          {recommendation.confidence === 'HIGH' ? (
            <Check className="w-4 h-4 text-sell" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-hold" />
          )}
          <span className="text-sm font-bold text-neutral-ink">
            {recommendation.confidence === 'HIGH'
              ? t('assistant.confidence.high')
              : recommendation.confidence === 'MEDIUM'
              ? t('assistant.confidence.medium')
              : t('assistant.confidence.low')}
          </span>
        </div>
      </div>

      {/* Confidence Reason */}
      <p className="text-base text-neutral-ink font-medium leading-relaxed bg-neutral-bg p-3 border border-neutral-border">
        <strong>{currentLang === 'mr' ? 'कारण:' : currentLang === 'hi' ? 'कारण:' : 'Rationale:'}</strong> {confidenceReason}
      </p>

      {/* 2. Honest Uncertainty: 3-Week Price Range Forecast Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-border pb-2">
          <h4 className="text-base font-bold text-neutral-ink flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>{t('assistant.priceForecastTitle')}</span>
          </h4>
          <span className="text-sm text-neutral-muted">
            {currentLang === 'mr' ? 'संभाव्य किंमत पट्टा' : 'Uncertainty Band'}
          </span>
        </div>

        <div className="w-full h-48 bg-neutral-bg border border-neutral-border p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={recommendation.forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DDD8CB" />
              <XAxis dataKey="dayLabel" tick={{ fontSize: 14, fill: '#1C1917' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 14, fill: '#1C1917' }} />
              <Tooltip
                formatter={(val: number) => [`₹${val}/qtl`, '']}
                contentStyle={{
                  backgroundColor: 'var(--color-neutral-surface, white)',
                  border: '2px solid var(--color-neutral-ink, #1C1917)',
                  borderRadius: 0,
                  fontSize: '14px',
                }}
              />
              <Area
                type="monotone"
                dataKey="high"
                stroke="#B45309"
                fill="#FEF3C7"
                fillOpacity={0.7}
                name={t('assistant.highRange')}
              />
              <Area
                type="monotone"
                dataKey="low"
                stroke="#B45309"
                fill="#FFFFFF"
                fillOpacity={1}
                name={t('assistant.lowRange')}
              />
              <Line
                type="monotone"
                dataKey="mid"
                stroke="#1C1917"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#1C1917' }}
                name={t('assistant.expectedRange')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Mandi Comparison Table (Sorted by Net Realized Return) */}
      <div className="space-y-2">
        <h4 className="text-base font-bold text-neutral-ink">
          {currentLang === 'mr' ? 'प्रमुख मंड्यांची तुलना (खर्च वजा निव्वळ भाव):' : 'Mandi Comparison Matrix (Net in Hand):'}
        </h4>

        <div className="overflow-x-auto border-2 border-neutral-ink">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-neutral-bg border-b-2 border-neutral-ink text-neutral-ink">
                <th className="p-3 font-bold">{t('assistant.table.mandi')}</th>
                <th className="p-3 font-bold">{t('assistant.table.distance')}</th>
                <th className="p-3 font-bold">{t('assistant.table.forecast')}</th>
                <th className="p-3 font-bold">{t('assistant.table.transport')}</th>
                <th className="p-3 font-bold">{t('assistant.table.spoilage')}</th>
                <th className="p-3 font-bold bg-neutral-surface border-l-2 border-neutral-ink">
                  {t('assistant.table.net')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border">
              {recommendation.mandis.map((m, idx) => {
                const mandiTitle =
                  currentLang === 'mr' ? m.name_mr : currentLang === 'hi' ? m.name_hi : m.name;
                const isHighlight = idx === 0;

                return (
                  <tr
                    key={m.id}
                    className={`transition-colors ${
                      isHighlight ? 'bg-sell-bg font-semibold' : 'bg-neutral-surface hover:bg-neutral-bg'
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {isHighlight && (
                          <span className="px-1.5 py-0.5 bg-sell text-neutral-surface text-xs font-bold">
                            {t('assistant.table.best')}
                          </span>
                        )}
                        <span className="font-bold text-neutral-ink">{mandiTitle}</span>
                      </div>
                    </td>
                    <td className="p-3 text-neutral-muted">{m.distanceKm} km</td>
                    <td className="p-3 font-mono">{formatRupee(m.forecastPrice)}</td>
                    <td className="p-3 font-mono text-signal">-{formatRupee(m.transportCost)}</td>
                    <td className="p-3 font-mono text-signal">
                      {m.spoilageLoss > 0 ? `-${formatRupee(m.spoilageLoss)}` : '₹0'}
                    </td>
                    <td className="p-3 font-mono text-base font-bold text-neutral-ink border-l-2 border-neutral-ink">
                      {formatRupee(m.netPerQuintal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Total Financial Impact for Farmer's Quantity */}
      <div className="bg-primary-subtle border-2 border-primary p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-sm font-bold text-primary block">
            {currentLang === 'mr'
              ? `${totalQuantity} क्विंटल मालासाठी एकूण अतिरिक्त फायदा:`
              : currentLang === 'hi'
              ? `${totalQuantity} क्विंटल के लिए कुल अतिरिक्त लाभ:`
              : `Total Extra Realized for ${totalQuantity} Quintals:`}
          </span>
          <span className="text-2xl font-bold text-neutral-ink">
            +{formatRupee(recommendation.expectedGainPerQuintal * totalQuantity)}
          </span>
        </div>

        <span className="text-sm font-semibold text-neutral-ink bg-neutral-surface px-3 py-1.5 border border-primary">
          {currentLang === 'mr' ? 'स्थानिक विक्रीपेक्षा जास्त नफा' : 'Net Extra in Hand vs Harvest Day'}
        </span>
      </div>

      {/* 5. "Why This Advice?" RAG Citations (Expandable) */}
      {sources && sources.length > 0 && (
        <div className="border border-neutral-border pt-2">
          <button
            type="button"
            onClick={() => setShowWhy(!showWhy)}
            className="w-full flex items-center justify-between p-2 text-sm font-bold text-neutral-ink hover:text-primary"
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <span>{t('assistant.whyAdvice')}</span>
            </span>
            {showWhy ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showWhy && (
            <div className="p-3 bg-neutral-bg space-y-2.5 border-t border-neutral-border text-sm">
              {sources.map((s, i) => (
                <div key={i} className="space-y-1">
                  <div className="font-bold text-neutral-ink flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-primary"></span>
                    <span>{s.title}</span>
                  </div>
                  <p className="text-neutral-muted pl-3 leading-relaxed">
                    {s.snippet}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
