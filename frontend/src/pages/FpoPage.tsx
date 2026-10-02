import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  TrendingUp,
  Truck,
  AlertTriangle,
  Download,
  Printer,
  Calendar,
  CheckCircle,
  Clock,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { CROPS } from '../config/crops';
import { VILLAGES } from '../config/villages';
import { fetchFpoPlan } from '../api/client';
import type { FpoPlanResponse } from '../api/types';
import { formatRupee } from '../i18n';

// Colors for allocations using token variables
const ALLOCATION_COLORS = [
  'var(--color-primary, #1E6B2D)',
  'var(--color-secondary, #B44A28)',
  'var(--color-hold, #B45309)',
  'var(--color-sell, #15803D)',
];

export const FpoPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'mr';

  // Form Inputs
  const [selectedCrop, setSelectedCrop] = useState<string>('onion');
  const [quantity, setQuantity] = useState<number>(300); // Quintals
  const [selectedVillageId, setSelectedVillageId] = useState<string>('niphad_rural');
  const [horizonDays, setHorizonDays] = useState<number>(7);

  // FPO Plan Result
  const [plan, setPlan] = useState<FpoPlanResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetchFpoPlan({
      crop: selectedCrop,
      quantity,
      village: selectedVillageId,
      horizonDays,
    })
      .then((data) => {
        if (!isCancelled) {
          setPlan(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('FPO plan calculation error:', err);
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCrop, quantity, selectedVillageId, horizonDays]);

  // CSV Export handler
  const handleExportCsv = () => {
    if (!plan) return;

    const headers = [
      'Mandi',
      'Allocation Percentage',
      'Quantity (Quintals)',
      '10-Ton Trucks Needed',
      'Expected Price (₹/Qtl)',
      'Estimated Freight (₹/Qtl)',
      'Net Revenue (₹)',
      'Dispatch Window',
      'Intake Status',
    ];

    const rows = plan.allocations.map((a) => [
      `"${a.mandiName}"`,
      `${a.percentage}%`,
      a.quantityQuintals,
      a.trucksNeeded,
      a.expectedPrice,
      a.estimatedFreight,
      a.netRevenue,
      `"${a.dispatchDate}"`,
      `"${a.capacityWarning || 'Normal'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `FPO_SellSmart_Plan_${selectedCrop}_${quantity}qtl.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Pie chart data
  const pieData =
    plan?.allocations.map((a) => ({
      name: currentLang === 'mr' ? a.mandiName_mr : a.mandiName,
      value: a.percentage,
      quintals: a.quantityQuintals,
    })) || [];

  return (
    <div className="flex-1 bg-neutral-bg py-6 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Value Proposition */}
        <div className="bg-neutral-surface border-2 border-neutral-border p-5 md:p-6 shadow-hard flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary-subtle border border-primary px-3 py-1 text-sm font-bold text-primary mb-2">
              <Building2 className="w-4 h-4" />
              <span>Farmer Producer Organisation (FPO) Mode</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-neutral-ink">
              {t('fpo.title')}
            </h1>
            <p className="text-base text-neutral-muted mt-1 max-w-2xl">
              {t('fpo.subtitle')}
            </p>
          </div>

          {/* Action buttons (CSV & Print) */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              disabled={!plan || loading}
              className="bg-neutral-surface hover:bg-neutral-bg text-neutral-ink font-bold py-2.5 px-4 border-2 border-neutral-ink shadow-hard flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{t('fpo.exportCsv')}</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-primary hover:bg-primary-hover text-primary-fg font-bold py-2.5 px-4 border-2 border-neutral-ink shadow-hard flex items-center gap-2 text-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>{t('fpo.print')}</span>
            </button>
          </div>
        </div>

        {/* Configuration Bar (FPO Inputs) */}
        <div className="bg-neutral-surface border-2 border-neutral-border p-5 shadow-hard">
          <div className="text-sm font-extrabold text-neutral-ink uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>
              {currentLang === 'mr'
                ? 'घाऊक माल व संकलन केंद्र तपशील'
                : 'Bulk Lot & Aggregation Center Parameters'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Crop Selector */}
            <div>
              <label className="block text-sm font-bold text-neutral-ink mb-1">
                {t('map.cropSelect')}
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full bg-neutral-surface border-2 border-neutral-border px-3 py-2 text-base font-semibold text-neutral-ink focus:border-primary focus:outline-none"
              >
                {Object.values(CROPS).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {currentLang === 'mr' ? c.name_mr : currentLang === 'hi' ? c.name_hi : c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Total Quantity */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-bold text-neutral-ink">
                  {currentLang === 'mr' ? 'एकूण माल (क्विंटल)' : 'Total Lot Quantity'}
                </label>
                <span className="text-sm font-black text-primary bg-primary-subtle px-2 py-0.5 border border-primary">
                  {quantity} Quintals
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="2000"
                step="50"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-neutral-border cursor-pointer"
              />
              <div className="flex justify-between text-xs text-neutral-muted mt-1">
                <span>50 qtl</span>
                <span>500 qtl</span>
                <span>1000 qtl</span>
                <span>2000 qtl</span>
              </div>
            </div>

            {/* Aggregation Center Village */}
            <div>
              <label className="block text-sm font-bold text-neutral-ink mb-1">
                {currentLang === 'mr' ? 'FPO संकलन केंद्र (गाव)' : 'FPO Aggregation Cluster'}
              </label>
              <select
                value={selectedVillageId}
                onChange={(e) => setSelectedVillageId(e.target.value)}
                className="w-full bg-neutral-surface border-2 border-neutral-border px-3 py-2 text-base font-semibold text-neutral-ink focus:border-primary focus:outline-none"
              >
                {VILLAGES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {currentLang === 'mr' ? v.name_mr : currentLang === 'hi' ? v.name_hi : v.name} ({v.taluka})
                  </option>
                ))}
              </select>
            </div>

            {/* Planning Window */}
            <div>
              <label className="block text-sm font-bold text-neutral-ink mb-1">
                {currentLang === 'mr' ? 'विक्री कालावधी (नियोजन)' : 'Dispatch Horizon'}
              </label>
              <select
                value={horizonDays}
                onChange={(e) => setHorizonDays(Number(e.target.value))}
                className="w-full bg-neutral-surface border-2 border-neutral-border px-3 py-2 text-base font-semibold text-neutral-ink focus:border-primary focus:outline-none"
              >
                <option value={3}>{currentLang === 'mr' ? '३ दिवस (तातडीने विक्री)' : '3 Days (Fast Track)'}</option>
                <option value={7}>{currentLang === 'mr' ? '७ दिवस (संतुलित टप्पे)' : '7 Days (Standard Phased)'}</option>
                <option value={14}>{currentLang === 'mr' ? '१४ दिवस (हवामान व साठा)' : '14 Days (Extended Holding)'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* KPI Cards Row */}
        {plan && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Revenue */}
            <div className="bg-neutral-surface border-2 border-neutral-border p-5 shadow-hard">
              <div className="flex items-center justify-between text-neutral-muted text-sm font-bold">
                <span>{t('fpo.kpiRevenue')}</span>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="text-3xl font-black text-neutral-ink mt-2">
                {formatRupee(plan.totalRevenue)}
              </div>
              <div className="text-xs text-neutral-muted mt-1">
                {plan.totalQuantity} quintals aggregated lot
              </div>
            </div>

            {/* Card 2: Extra Earned vs Baseline */}
            <div className="bg-neutral-surface border-2 border-sell p-5 shadow-hard relative overflow-hidden">
              <div className="flex items-center justify-between text-sell text-sm font-bold">
                <span>{t('fpo.kpiExtra')}</span>
                <span className="bg-sell text-sell-fg font-black text-xs px-2 py-0.5 border border-neutral-ink">
                  +{plan.percentageGain}%
                </span>
              </div>
              <div className="text-3xl font-black text-sell mt-2">
                +{formatRupee(plan.extraRevenueEarned)}
              </div>
              <div className="text-xs text-neutral-muted mt-1">
                {currentLang === 'mr'
                  ? 'स्थानिक बाजारात एकरकमी टाकण्यापेक्षा'
                  : 'vs. single local mandi dumping'}
              </div>
            </div>

            {/* Card 3: Anchor Mandi */}
            <div className="bg-neutral-surface border-2 border-neutral-border p-5 shadow-hard">
              <div className="flex items-center justify-between text-neutral-muted text-sm font-bold">
                <span>{t('fpo.kpiBest')}</span>
                <Building2 className="w-5 h-5 text-secondary" />
              </div>
              <div className="text-2xl font-black text-neutral-ink mt-2 truncate">
                {plan.bestMandi}
              </div>
              <div className="text-xs text-neutral-muted mt-1">
                {currentLang === 'mr' ? 'सर्वाधिक कोटा (४५%)' : 'Receives 45% volume share'}
              </div>
            </div>

            {/* Card 4: Risk Level */}
            <div className="bg-neutral-surface border-2 border-neutral-border p-5 shadow-hard">
              <div className="flex items-center justify-between text-neutral-muted text-sm font-bold">
                <span>{t('fpo.kpiRisk')}</span>
                <ShieldCheck className="w-5 h-5 text-sell" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-black text-sell">
                  {plan.riskLevel}
                </span>
                <span className="bg-primary-subtle text-neutral-ink text-xs px-2 py-0.5 border border-primary font-bold">
                  Diversified
                </span>
              </div>
              <div className="text-xs text-neutral-muted mt-1">
                {currentLang === 'mr'
                  ? '३ बाजारांमध्ये विभागल्याने घसरण टळेल'
                  : 'Multi-mandi spread mitigates gluts'}
              </div>
            </div>
          </div>
        )}

        {/* Multi-Mandi Allocation & Charts Section */}
        {plan && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Allocation Breakdown (Donut Chart) */}
            <div className="bg-neutral-surface border-2 border-neutral-border p-5 shadow-hard flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-neutral-ink mb-1 flex items-center gap-2">
                  <span>{currentLang === 'mr' ? 'माल वाटप प्रमाण' : 'Volume Allocation'}</span>
                </h3>
                <p className="text-sm text-neutral-muted">
                  {currentLang === 'mr'
                    ? 'स्थानिक आवक मर्यादेनुसार शिफारस'
                    : 'Recommended split to avoid local price collapse'}
                </p>

                <div className="w-full h-56 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}
                            stroke="#1C1917"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => [`${val}%`, 'Allocation']}
                        contentStyle={{
                          backgroundColor: 'var(--color-neutral-surface, white)',
                          border: '2px solid var(--color-neutral-ink, black)',
                          borderRadius: 0,
                          fontSize: '14px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Legend for Donut */}
              <div className="space-y-2 border-t-2 border-neutral-border pt-4">
                {plan.allocations.map((a, idx) => (
                  <div key={a.mandiId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 border border-neutral-ink"
                        style={{
                          backgroundColor:
                            idx === 0
                              ? 'var(--color-primary, #1E6B2D)'
                              : idx === 1
                              ? 'var(--color-secondary, #B44A28)'
                              : 'var(--color-hold, #B45309)',
                        }}
                      />
                      <span className="font-bold text-neutral-ink">
                        {currentLang === 'mr' ? a.mandiName_mr : a.mandiName}
                      </span>
                    </div>
                    <span className="font-bold text-neutral-ink">
                      {a.percentage}% ({a.quantityQuintals} qtl)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dispatch Schedule & Truck Allocation Details */}
            <div className="lg:col-span-2 bg-neutral-surface border-2 border-neutral-border p-5 shadow-hard flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 border-b-2 border-neutral-border pb-3">
                  <div>
                    <h3 className="text-xl font-extrabold text-neutral-ink flex items-center gap-2">
                      <Truck className="w-5 h-5 text-secondary" />
                      <span>{t('fpo.planHeading')}</span>
                    </h3>
                    <p className="text-sm text-neutral-muted mt-0.5">
                      {currentLang === 'mr'
                        ? '१० टनी ट्रक वेळापत्रक व अपेक्षित निव्वळ रक्कम'
                        : '10-ton bulk truck dispatch windows & net revenue projections'}
                    </p>
                  </div>
                  <span className="bg-neutral-bg border border-neutral-border px-3 py-1 text-sm font-bold text-neutral-ink">
                    {plan.allocations.reduce((acc, curr) => acc + curr.trucksNeeded, 0)} {t('fpo.trucks')}
                  </span>
                </div>

                {/* Table of Lots */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-neutral-ink bg-neutral-bg text-sm font-bold text-neutral-ink">
                        <th className="py-2.5 px-3">Mandi / Market</th>
                        <th className="py-2.5 px-3 text-center">Share</th>
                        <th className="py-2.5 px-3 text-center">Trucks</th>
                        <th className="py-2.5 px-3">Dispatch Window</th>
                        <th className="py-2.5 px-3 text-right">Net Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-border text-sm">
                      {plan.allocations.map((a, idx) => (
                        <tr
                          key={a.mandiId}
                          className={idx === 0 ? 'bg-primary-subtle/50 font-medium' : ''}
                        >
                          <td className="py-3 px-3">
                            <div className="font-extrabold text-neutral-ink">
                              {currentLang === 'mr' ? a.mandiName_mr : a.mandiName}
                            </div>
                            {a.capacityWarning && (
                              <div className="flex items-center gap-1 text-xs text-hold font-bold mt-0.5">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>{a.capacityWarning}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-neutral-ink">
                            {a.percentage}%
                            <div className="text-xs text-neutral-muted font-normal">
                              {a.quantityQuintals} qtl
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-block bg-neutral-surface border border-neutral-ink font-bold px-2 py-0.5 text-xs">
                              {a.trucksNeeded} 🚛
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 font-bold text-neutral-ink">
                              <Calendar className="w-4 h-4 text-primary shrink-0" />
                              <span>{a.dispatchDate}</span>
                            </div>
                            <div className="text-xs text-neutral-muted">
                              Freight: {formatRupee(a.estimatedFreight)}/qtl
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-black text-sell text-base">
                              {formatRupee(a.netRevenue)}
                            </div>
                            <div className="text-xs text-neutral-muted">
                              @{formatRupee(a.expectedPrice)}/qtl
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Economic Advantage Summary Footer */}
              <div className="mt-4 p-3 bg-neutral-bg border-2 border-neutral-border flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-neutral-ink font-medium">
                    {currentLang === 'mr'
                      ? '१० टनी (१०० क्विंटल) मोठ्या वाहनांच्या वापरामुळे प्रति क्विंटल सुमारे ₹२५ भाडे बचत.'
                      : 'Bulk 10-wheeler aggregation saves ~₹25/quintal in haulage freight versus mini-pickups.'}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs text-neutral-muted block">Estimated Freight Savings</span>
                  <span className="font-black text-sell text-base">
                    +{formatRupee(plan.totalQuantity * 25)} saved
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FpoPage;
