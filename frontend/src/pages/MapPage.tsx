import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import {
  MapPin,
  TrendingUp,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CROPS } from '../config/crops';
import { VILLAGES, type VillageConfig } from '../config/villages';
import { fetchHeatmap } from '../api/client';
import type { HeatmapResponse, HeatmapItem } from '../api/types';
import { formatRupee } from '../i18n';

export const MapPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language || 'mr';

  // Controls state
  const [selectedCrop, setSelectedCrop] = useState<string>('onion');
  const [selectedHorizon, setSelectedHorizon] = useState<number>(0); // 0 = today, 7 = +1w, 14 = +2w, 21 = +3w
  const [metricMode, setMetricMode] = useState<'net' | 'forecast'>('net');
  const [selectedVillageId, setSelectedVillageId] = useState<string>('niphad_rural');

  // Heatmap data & selection
  const [heatmapData, setHeatmapData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMandiId, setSelectedMandiId] = useState<string>('lasalgaon');

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Selected village object
  const currentVillage: VillageConfig =
    VILLAGES.find((v) => v.id === selectedVillageId) || VILLAGES[0];

  // Fetch heatmap data when controls change
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetchHeatmap(selectedCrop, selectedHorizon, selectedVillageId)
      .then((data) => {
        if (!isCancelled) {
          setHeatmapData(data);
          // If current selection is not in list, select top mandi
          if (data.items.length > 0 && (!selectedMandiId || !data.items.some((m) => m.mandiId === selectedMandiId))) {
            setSelectedMandiId(data.topMandiId || data.items[0].mandiId);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Heatmap load error:', err);
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCrop, selectedHorizon, selectedVillageId]);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered on Nashik district
    const map = L.map(mapContainerRef.current, {
      center: [20.08, 74.15],
      zoom: 9,
      minZoom: 8,
      maxZoom: 13,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Update map markers and polylines whenever data or metricMode changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers || !heatmapData) return;

    layers.clearLayers();

    // 1. Plot Farmer's Origin Village Marker
    const villageIcon = L.divIcon({
      className: 'custom-leaflet-village-pin',
      html: `
        <div class="flex items-center gap-1.5 bg-neutral-ink text-neutral-surface border-2 border-neutral-surface px-2.5 py-1 text-sm font-bold shadow-hard select-none">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-secondary"></span>
          <span>${currentLang === 'mr' ? currentVillage.name_mr : currentLang === 'hi' ? currentVillage.name_hi : currentVillage.name}</span>
        </div>
      `,
      iconSize: [140, 32],
      iconAnchor: [70, 16],
    });

    const villageMarker = L.marker([currentVillage.lat, currentVillage.lng], {
      icon: villageIcon,
      zIndexOffset: 1000,
    }).addTo(layers);

    villageMarker.bindTooltip(
      `<strong>${t('map.villageSelect')}:</strong> ${
        currentLang === 'mr' ? currentVillage.name_mr : currentLang === 'hi' ? currentVillage.name_hi : currentVillage.name
      } (${currentVillage.taluka})`,
      { direction: 'top', offset: [0, -10] }
    );

    // 2. Sort mandis by chosen metric
    const sorted = [...heatmapData.items].sort((a, b) => {
      const valA = metricMode === 'net' ? a.netReturn : a.forecastPrice;
      const valB = metricMode === 'net' ? b.netReturn : b.forecastPrice;
      return valB - valA;
    });

    const topRankedIds = new Set(sorted.slice(0, 3).map((m) => m.mandiId));

    // 3. Draw connection lines to top 3 mandis
    sorted.slice(0, 3).forEach((mandi, idx) => {
      const isTop1 = idx === 0;
      const polyline = L.polyline(
        [
          [currentVillage.lat, currentVillage.lng],
          [mandi.lat, mandi.lng],
        ],
        {
          color: isTop1 ? 'var(--color-sell, green)' : 'var(--color-hold, darkgoldenrod)',
          weight: isTop1 ? 4 : 2.5,
          dashArray: isTop1 ? undefined : '5, 5',
          opacity: 0.85,
        }
      ).addTo(layers);

      const mandiLabel = currentLang === 'mr' ? mandi.name_mr : currentLang === 'hi' ? mandi.name_hi : mandi.name;
      const metricVal = metricMode === 'net' ? mandi.netReturn : mandi.forecastPrice;

      polyline.bindTooltip(
        `#${idx + 1}: ${mandiLabel} (${mandi.distanceKm} km) &rarr; ${formatRupee(metricVal)}/qtl`,
        { sticky: true }
      );
    });

    // 4. Plot markers for all mandis
    sorted.forEach((item, index) => {
      const isSelected = item.mandiId === selectedMandiId;
      const isTop3 = topRankedIds.has(item.mandiId);
      const isRank1 = index === 0;

      const metricValue = metricMode === 'net' ? item.netReturn : item.forecastPrice;
      const localizedName = currentLang === 'mr' ? item.name_mr : currentLang === 'hi' ? item.name_hi : item.name;

      // Color tier: top 3 green, middle amber, bottom red
      let badgeBg = 'bg-sell text-sell-fg';
      let borderTone = 'border-sell';
      if (index >= 3 && index < 9) {
        badgeBg = 'bg-hold text-hold-fg';
        borderTone = 'border-hold';
      } else if (index >= 9) {
        badgeBg = 'bg-risk text-risk-fg';
        borderTone = 'border-risk';
      }

      const activeRing = isSelected ? 'ring-4 ring-neutral-ink scale-110 z-50' : 'hover:scale-105';

      const mandiIcon = L.divIcon({
        className: 'custom-mandi-marker-wrapper',
        html: `
          <div class="cursor-pointer transition-transform ${activeRing} flex flex-col items-center">
            <div class="flex items-center gap-1.5 px-2 py-1 border-2 border-neutral-ink shadow-hard ${badgeBg} font-bold text-sm leading-none whitespace-nowrap">
              ${isRank1 ? '👑 ' : ''}<span>${localizedName.split(' ')[0]}</span>
              <span class="bg-neutral-surface text-neutral-ink px-1 py-0.5 border border-neutral-ink text-sm">₹${metricValue}</span>
            </div>
            <div class="w-2 h-2 rotate-45 border-r-2 border-b-2 border-neutral-ink bg-neutral-ink -mt-1"></div>
          </div>
        `,
        iconSize: [110, 36],
        iconAnchor: [55, 36],
      });

      const marker = L.marker([item.lat, item.lng], {
        icon: mandiIcon,
        zIndexOffset: isSelected ? 800 : isTop3 ? 500 : 100,
      }).addTo(layers);

      marker.on('click', () => {
        setSelectedMandiId(item.mandiId);
      });
    });
  }, [heatmapData, metricMode, selectedMandiId, selectedVillageId, currentLang, t]);

  // Selected mandi detail object
  const selectedMandi: HeatmapItem | undefined = heatmapData?.items.find(
    (m) => m.mandiId === selectedMandiId
  );

  // Sparkline data array for Recharts
  const sparklineChartData = selectedMandi?.sparkline.map((price, idx) => ({
    day: `D-${7 - idx}`,
    price,
  })) || [];

  const handleAskAssistant = () => {
    if (!selectedMandi) return;
    const cropName = CROPS[selectedCrop]?.[`name_${currentLang}` as 'name_mr'] || selectedCrop;
    const mandiName = currentLang === 'mr' ? selectedMandi.name_mr : currentLang === 'hi' ? selectedMandi.name_hi : selectedMandi.name;
    const query = `${cropName}, 20 क्विंटल, ${mandiName}, ${selectedVillageId}`;
    navigate('/assistant', { state: { initialPrompt: query } });
  };

  return (
    <div className="flex flex-col flex-1 bg-neutral-bg min-h-[calc(100vh-80px)]">
      {/* Top Banner / Controls Bar */}
      <div className="bg-neutral-surface border-b-2 border-neutral-border px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-ink flex items-center gap-2">
              <Layers className="w-7 h-7 text-primary" />
              {t('map.title')}
            </h1>
            <p className="text-base text-neutral-muted mt-1">
              {t('map.subtitle')}
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="inline-flex items-center gap-3 bg-primary-subtle border-2 border-primary px-3.5 py-2">
            <span className="w-3 h-3 rounded-full bg-sell animate-pulse"></span>
            <span className="text-sm font-bold text-neutral-ink">
              14 {currentLang === 'mr' ? 'बाजार समित्या सक्रिय' : currentLang === 'hi' ? 'मंडियां सक्रिय' : 'APMC Mandis Active'}
            </span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="max-w-7xl mx-auto mt-4 pt-4 border-t border-neutral-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Crop Selector */}
          <div>
            <label className="block text-sm font-bold text-neutral-ink mb-1">
              {t('map.cropSelect')}
            </label>
            <div className="grid grid-cols-3 gap-1 bg-neutral-bg p-1 border-2 border-neutral-border">
              {Object.values(CROPS).map((crop) => (
                <button
                  key={crop.id}
                  onClick={() => setSelectedCrop(crop.id)}
                  className={`py-1.5 px-2 text-sm font-bold border transition-colors flex items-center justify-center gap-1 ${
                    selectedCrop === crop.id
                      ? 'bg-primary text-primary-fg border-primary shadow-hard'
                      : 'bg-neutral-surface text-neutral-ink border-transparent hover:border-neutral-border'
                  }`}
                >
                  <span>{crop.icon}</span>
                  <span className="truncate">
                    {currentLang === 'mr' ? crop.name_mr : currentLang === 'hi' ? crop.name_hi : crop.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Village Selector */}
          <div>
            <label className="block text-sm font-bold text-neutral-ink mb-1">
              {t('map.villageSelect')}
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

          {/* Horizon Selector */}
          <div>
            <label className="block text-sm font-bold text-neutral-ink mb-1">
              {t('map.horizonSelect')}
            </label>
            <div className="grid grid-cols-4 gap-1 bg-neutral-bg p-1 border-2 border-neutral-border">
              {[
                { days: 0, labelKey: 'today' },
                { days: 7, labelKey: 'plus1Week' },
                { days: 14, labelKey: 'plus2Weeks' },
                { days: 21, labelKey: 'plus3Weeks' },
              ].map((h) => (
                <button
                  key={h.days}
                  onClick={() => setSelectedHorizon(h.days)}
                  className={`py-1.5 text-sm font-bold border transition-colors ${
                    selectedHorizon === h.days
                      ? 'bg-secondary text-secondary-fg border-secondary shadow-hard'
                      : 'bg-neutral-surface text-neutral-ink border-transparent hover:border-neutral-border'
                  }`}
                >
                  {t(`map.${h.labelKey}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Toggle */}
          <div>
            <label className="block text-sm font-bold text-neutral-ink mb-1">
              {t('map.metricToggle')}
            </label>
            <div className="grid grid-cols-2 gap-1 bg-neutral-bg p-1 border-2 border-neutral-border">
              <button
                onClick={() => setMetricMode('net')}
                className={`py-1.5 px-2 text-sm font-bold border transition-colors ${
                  metricMode === 'net'
                    ? 'bg-neutral-ink text-neutral-surface border-neutral-ink shadow-hard'
                    : 'bg-neutral-surface text-neutral-ink border-transparent hover:border-neutral-border'
                }`}
              >
                {t('map.netMetric')}
              </button>
              <button
                onClick={() => setMetricMode('forecast')}
                className={`py-1.5 px-2 text-sm font-bold border transition-colors ${
                  metricMode === 'forecast'
                    ? 'bg-neutral-ink text-neutral-surface border-neutral-ink shadow-hard'
                    : 'bg-neutral-surface text-neutral-ink border-transparent hover:border-neutral-border'
                }`}
              >
                {t('map.forecastMetric')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Map + Side Details Area */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* Map Container View */}
        <div className="flex-1 flex flex-col bg-neutral-surface border-2 border-neutral-border relative shadow-hard">
          {/* Legend Banner on top of Map */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-neutral-bg border-b-2 border-neutral-border z-10 text-sm">
            <div className="flex items-center gap-4 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-sell border border-neutral-ink"></span>
                <span>{t('map.legendHigh')}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-hold border border-neutral-ink"></span>
                <span>{t('map.legendMid')}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-risk border border-neutral-ink"></span>
                <span>{t('map.legendLow')}</span>
              </span>
            </div>

            <div className="text-neutral-muted text-sm italic">
              {t('map.clickForDetails')}
            </div>
          </div>

          {/* Leaflet Map Target */}
          <div className="flex-1 min-h-[460px] w-full relative z-0">
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
            {loading && (
              <div className="absolute inset-0 bg-neutral-bg/75 flex items-center justify-center z-20">
                <div className="bg-neutral-surface border-2 border-neutral-ink p-4 shadow-hard flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent animate-spin rounded-full"></div>
                  <span className="font-bold text-neutral-ink text-base">
                    {currentLang === 'mr' ? 'नकाशा माहिती अपडेट होत आहे...' : currentLang === 'hi' ? 'नक्शा लोड हो रहा है...' : 'Updating mandi routes...'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Farmer Route Guide Footer */}
          <div className="p-3 bg-primary-subtle border-t-2 border-neutral-border text-sm flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-ink font-medium">
              <span className="font-bold text-primary">🟢 Top 3 Direct Transit:</span>
              <span>
                {currentLang === 'mr'
                  ? 'हिरवी व पिवळी रेषा तुमच्या गावातून सर्वाधिक नफा देणाऱ्या सर्वोत्तम बाजारांकडे जाते.'
                  : 'Colored lines represent optimal transit corridors from your village to highest net APMC mandis.'}
              </span>
            </div>
          </div>
        </div>

        {/* Side Panel: Selected Mandi Breakdown */}
        <div className="w-full lg:w-96 flex flex-col gap-4">
          {selectedMandi ? (
            <div className="bg-neutral-surface border-2 border-neutral-border p-5 shadow-hard flex flex-col justify-between flex-1">
              <div>
                {/* Mandi Title Header */}
                <div className="border-b-2 border-neutral-border pb-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-primary-subtle border border-primary text-primary px-2.5 py-0.5 text-sm font-bold uppercase tracking-wider">
                      {selectedMandi.taluka} Taluka
                    </span>
                    <span className="flex items-center gap-1 text-sm font-bold text-neutral-ink">
                      <MapPin className="w-4 h-4 text-secondary" />
                      {selectedMandi.distanceKm} km {t('map.distance')}
                    </span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-black text-neutral-ink mt-2">
                    {currentLang === 'mr'
                      ? selectedMandi.name_mr
                      : currentLang === 'hi'
                      ? selectedMandi.name_hi
                      : selectedMandi.name}
                  </h2>
                </div>

                {/* Big Metric Display */}
                <div className="my-4 bg-neutral-bg border-2 border-neutral-border p-4">
                  <div className="text-sm font-bold text-neutral-muted">
                    {metricMode === 'net' ? t('map.netInHand') : t('map.forecastMetric')}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-sell">
                      {formatRupee(metricMode === 'net' ? selectedMandi.netReturn : selectedMandi.forecastPrice)}
                    </span>
                    <span className="text-base text-neutral-muted font-bold">/ quintal</span>
                  </div>
                  <div className="text-sm text-neutral-muted mt-1">
                    {metricMode === 'net'
                      ? `${t('map.forecastMetric')}: ${formatRupee(selectedMandi.forecastPrice)}`
                      : `${t('map.netMetric')}: ${formatRupee(selectedMandi.netReturn)}`}
                  </div>
                </div>

                {/* Financial Ledger (Net of Freight & Spoilage) */}
                <div className="border border-neutral-border bg-neutral-surface p-3 space-y-2 mb-4">
                  <div className="text-sm font-bold text-neutral-ink border-b border-neutral-border pb-1">
                    {currentLang === 'mr' ? 'खर्च वजावट तपशील' : 'Freight & Spoilage Breakdown'}
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-muted flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-sell" /> {t('map.forecastMetric')}
                    </span>
                    <span className="font-bold text-neutral-ink">+{formatRupee(selectedMandi.forecastPrice)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-muted flex items-center gap-1">
                      <Truck className="w-4 h-4 text-secondary" /> {t('map.transportDeduction')} ({selectedMandi.distanceKm} km)
                    </span>
                    <span className="font-bold text-risk">-{formatRupee(selectedMandi.transportCost)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-muted flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-hold" /> {t('map.spoilageDeduction')}
                    </span>
                    <span className="font-bold text-risk">-{formatRupee(selectedMandi.spoilageLoss)}</span>
                  </div>

                  <div className="flex justify-between text-base font-extrabold border-t-2 border-neutral-ink pt-1 text-sell">
                    <span>{t('map.netInHand')}</span>
                    <span>={formatRupee(selectedMandi.netReturn)}/qtl</span>
                  </div>
                </div>

                {/* 7-Day Trend Sparkline Chart */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm font-bold text-neutral-ink mb-1.5">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      {currentLang === 'mr' ? '७ दिवसांचा भावाचा कल' : '7-Day Price Trend (APMC)'}
                    </span>
                    <span className="text-neutral-muted text-sm">
                      {selectedMandi.arrivalsTodayQuintals.toLocaleString('en-IN')} {t('map.quintal')} {t('map.arrivals')}
                    </span>
                  </div>

                  <div className="w-full h-24 bg-neutral-bg border border-neutral-border p-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineChartData}>
                        <XAxis dataKey="day" hide />
                        <YAxis domain={['dataMin - 50', 'dataMax + 50']} hide />
                        <Tooltip
                          formatter={(val: number) => [`₹${val}`, 'Price']}
                          contentStyle={{
                            backgroundColor: 'var(--color-neutral-surface, white)',
                            border: '2px solid var(--color-neutral-ink, black)',
                            borderRadius: 0,
                            fontSize: '14px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="var(--color-primary, #1E6B2D)"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: 'var(--color-primary, #1E6B2D)' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Confidence Chip */}
                <div className="flex items-center gap-2 p-2 bg-neutral-bg border border-neutral-border mb-4">
                  <CheckCircle2 className="w-4 h-4 text-sell shrink-0" />
                  <span className="text-sm font-medium text-neutral-ink">
                    <strong>{selectedMandi.confidence} Confidence:</strong>{' '}
                    {selectedMandi.confidence === 'HIGH'
                      ? currentLang === 'mr' ? 'उच्च आवक व स्थिर लिलाव' : 'High volume APMC with consistent arrivals'
                      : currentLang === 'mr' ? 'मध्यम लिलाव चढउतार' : 'Moderate price volatility'}
                  </span>
                </div>
              </div>

              {/* Action Button: Consult Assistant */}
              <button
                onClick={handleAskAssistant}
                className="w-full bg-primary hover:bg-primary-hover text-primary-fg font-extrabold py-3 px-4 border-2 border-neutral-ink shadow-hard flex items-center justify-center gap-2 text-base transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                <span>{t('map.askAboutMandi')}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="bg-neutral-surface border-2 border-neutral-border p-6 shadow-hard flex items-center justify-center text-center text-neutral-muted">
              <p className="text-base">{t('map.selectMandiPrompt')}</p>
            </div>
          )}

          {/* Quick Comparison Ledger of Top 3 Mandis */}
          {heatmapData && (
            <div className="bg-neutral-surface border-2 border-neutral-border p-4 shadow-hard">
              <div className="text-sm font-extrabold text-neutral-ink uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="text-sell">★</span>
                <span>Top 3 Mandis from {currentVillage.name}</span>
              </div>
              <div className="space-y-2">
                {[...heatmapData.items]
                  .sort((a, b) => b.netReturn - a.netReturn)
                  .slice(0, 3)
                  .map((m, idx) => (
                    <div
                      key={m.mandiId}
                      onClick={() => setSelectedMandiId(m.mandiId)}
                      className={`cursor-pointer p-2 border-2 transition-all flex items-center justify-between text-sm ${
                        selectedMandiId === m.mandiId
                          ? 'border-neutral-ink bg-neutral-bg shadow-hard'
                          : 'border-neutral-border bg-neutral-surface hover:border-neutral-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-neutral-ink text-neutral-surface font-black text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-neutral-ink">
                            {currentLang === 'mr' ? m.name_mr : currentLang === 'hi' ? m.name_hi : m.name}
                          </div>
                          <div className="text-xs text-neutral-muted">{m.distanceKm} km away</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-sell text-base">{formatRupee(m.netReturn)}</div>
                        <div className="text-xs text-neutral-muted">net/qtl</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;
