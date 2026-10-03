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
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Layers,
  Clock,
  Share2,
  ChevronDown,
  Navigation,
  DollarSign,
  Scale,
  Calendar,
  MessageSquare,
  Award,
} from 'lucide-react';
import { CROPS } from '../config/crops';
import { VILLAGES, type VillageConfig } from '../config/villages';
import { fetchHeatmap } from '../api/client';
import type { HeatmapResponse, HeatmapItem } from '../api/types';
import { formatRupee } from '../i18n';
import { useAppStore } from '../store/useAppStore';
import type { CropId } from '../types';

// --------------------------------------------------------------------------
// Multi-language Dictionary for 100% Clean Localization
// --------------------------------------------------------------------------
const DICTIONARY = {
  en: {
    backBtn: 'Back',
    badge: 'Nashik APMC Mandi Heatmap',
    title: 'Mandi Route & Profit Map',
    subtitle: 'Select any APMC on the map to see road distance, travel freight cost, and net in-pocket profit',
    cropLabel: '1. Select Crop',
    villageLabel: '2. Your Farm Location',
    qtyLabel: '3. Harvest Quantity',
    horizonLabel: '4. Selling Time',
    today: 'Today',
    plus1w: '+1 Week',
    plus2w: '+2 Weeks',
    plus3w: '+3 Weeks',
    qtl: 'qtl',
    rankTop: '#1 Highest Net Return in Nashik',
    rankHigh: 'Top 3 High Paying Mandi',
    rankStandard: 'Standard Mandi Rate',
    distanceLabel: 'Road Distance',
    travelTimeLabel: 'Estimated Transit Time',
    freightCostLabel: 'Road Freight Cost',
    mandiPriceLabel: 'Mandi Auction Price',
    spoilageLabel: 'Storage Spoilage & Decay',
    spoilageLossText: 'Decay / Weight Shrinkage',
    freshHarvest: '0% (Sold Fresh Today)',
    spoilageAdvisoryHeader: 'Crop Storage & Decay Advisory',
    netProfitLabel: 'Net In-Hand Cash',
    netProfitSubtext: 'After Freight & Spoilage Loss',
    extraProfitLabel: 'Extra In-Hand Cash vs Local',
    shareWhatsApp: 'Share Route on WhatsApp',
    askChat: 'Ask Advisory Strategy in Chat',
    allMandisHeader: 'All 14 Nashik Mandis Ranked by Profit',
    legendBest: 'Best Price (#1-3)',
    legendMed: 'Medium Price',
    legendLow: 'Lower / Local Price',
    activeMandis: '14 APMC Mandis Active',
    youAreHere: '📍 You Are Here (Farm Origin)',
    mandiBadgeText: 'APMC Market',
    crops: {
      onion: 'Summer Onion',
      tomato: 'Tomato',
      soybean: 'Soybean',
    },
  },
  mr: {
    backBtn: 'मागे जा',
    badge: 'नाशिक बाजार समिती नफा नकाशा',
    title: 'बाजार समिती अंतर व नफा नकाशा',
    subtitle: 'नकाशावरील कोणतीही बाजार समिती निवडून गाडी अंतर, वाहतूक खर्च आणि हातात पडणारा निव्वळ नफा पहा',
    cropLabel: '१. पीक निवडा',
    villageLabel: '२. तुमचे शेत / गाव',
    qtyLabel: '३. मालाचे वजन',
    horizonLabel: '४. विक्रीचा काळ',
    today: 'आज',
    plus1w: '+१ आठवडा',
    plus2w: '+२ आठवडे',
    plus3w: '+३ आठवडे',
    qtl: 'क्विंटल',
    rankTop: '#१ नाशिक जिल्ह्यातील सर्वाधिक नफा',
    rankHigh: 'उत्कृष्ट भाव देणारी बाजार समिती',
    rankStandard: 'मध्यम बाजार समिती दर',
    distanceLabel: 'गाडी अंतर',
    travelTimeLabel: 'लागणारा वेळ (अंदाजे)',
    freightCostLabel: 'एकूण गाडीभाडे',
    mandiPriceLabel: 'बाजार भाव (प्रति क्विंटल)',
    spoilageLabel: 'साठवणूक घट व सड नुकसान',
    spoilageLossText: 'वजन व दर्जा घट',
    freshHarvest: '०% (आजच ताजी विक्री)',
    spoilageAdvisoryHeader: 'साठवणूक व नाशवंतता सल्ला',
    netProfitLabel: 'खिशात पडणारा निव्वळ नफा',
    netProfitSubtext: 'गाडीभाडे व सड वजा जाता',
    extraProfitLabel: 'स्थानिक विक्रीपेक्षा जास्तीचा निव्वळ फायदा',
    shareWhatsApp: 'व्हॉट्सॲपवर माहिती शेअर करा',
    askChat: 'सल्लागाराला प्रश्न विचारा',
    allMandisHeader: 'नाशिक जिल्ह्यातील १४ बाजार समित्यांची यादी',
    legendBest: 'सर्वोत्तम भाव (#१-३)',
    legendMed: 'मध्यम भाव',
    legendLow: 'कमी / स्थानिक भाव',
    activeMandis: '१४ बाजार समित्या उपलब्ध',
    youAreHere: '📍 तुमचे शेत (स्थान)',
    mandiBadgeText: 'बाजार समिती',
    crops: {
      onion: 'कांदा',
      tomato: 'टोमॅटो',
      soybean: 'सोयाबीन',
    },
  },
  hi: {
    backBtn: 'पीछे जाएं',
    badge: 'नासिक मंडी लाभ व मार्ग मैप',
    title: 'मंडी दूरी व मुनाफा मैप',
    subtitle: 'नक्शे पर कोई भी मंडी चुनकर सड़क दूरी, गाड़ी भाड़ा और जेब में आने वाला शुद्ध लाभ देखें',
    cropLabel: '१. फसल चुनें',
    villageLabel: '२. आपका गांव / स्थान',
    qtyLabel: '३. फसल मात्रा',
    horizonLabel: '४. बेचने का समय',
    today: 'आज',
    plus1w: '+1 सप्ताह',
    plus2w: '+2 सप्ताह',
    plus3w: '+3 सप्ताह',
    qtl: 'क्विंटल',
    rankTop: '#1 नासिक जिले में सबसे ज्यादा लाभ',
    rankHigh: 'उत्कृष्ट भाव देने वाली मंडी',
    rankStandard: 'सामान्य मंडी भाव',
    distanceLabel: 'सड़क दूरी',
    travelTimeLabel: 'अनुमानित समय',
    freightCostLabel: 'कुल गाड़ी भाड़ा',
    mandiPriceLabel: 'मंडी भाव (प्रति क्विंटल)',
    spoilageLabel: 'भंडारण वजन कमी व खराबी',
    spoilageLossText: 'वजन व गुणवत्ता में कमी',
    freshHarvest: '0% (आज ही ताजी बिक्री)',
    spoilageAdvisoryHeader: 'भंडारण व खराबी सलाह',
    netProfitLabel: 'जेब में शुद्ध लाभ',
    netProfitSubtext: 'गाड़ी भाड़ा व खराबी घटाने के बाद',
    extraProfitLabel: 'स्थानीय बिक्री से अतिरिक्त लाभ',
    shareWhatsApp: 'व्हाट्सएप पर शेयर करें',
    askChat: 'सलाहकार से चैट में पूछें',
    allMandisHeader: 'नासिक जिले की 14 मंडियों की सूची',
    legendBest: 'सर्वोत्तम भाव (#1-3)',
    legendMed: 'मध्यम भाव',
    legendLow: 'कम / स्थानीय भाव',
    activeMandis: '14 मंडियां सक्रिय',
    youAreHere: '📍 आपका खेत (स्थान)',
    mandiBadgeText: 'मंडी',
    crops: {
      onion: 'प्याज',
      tomato: 'टमाटर',
      soybean: 'सोयाबीन',
    },
  },
};

interface SpoilageCalculation {
  pct: number;
  lossQtl: number;
  lossValue: number;
  advice: string;
  isHighRisk: boolean;
}

function calculateSpoilage(
  crop: string,
  days: number,
  qty: number,
  pricePerQtl: number,
  lang: 'en' | 'mr' | 'hi'
): SpoilageCalculation {
  let pct = 0;
  let isHighRisk = false;
  let advice = '';

  if (crop === 'tomato') {
    if (days === 0) {
      pct = 0;
      advice =
        lang === 'mr'
          ? 'टोमॅटो अतिनाशवंत पीक आहे. फळे मऊ पडू नयेत म्हणून आजच विक्री करणे सर्वात फायदेशीर आहे.'
          : lang === 'hi'
          ? 'टमाटर जल्दी खराब होने वाली फसल है। फल नरम होने से पहले आज ही बेचना सबसे अच्छा है।'
          : 'Tomato is highly perishable. Selling fresh today locks in maximum firmness and top modal rate.';
    } else {
      pct = days === 7 ? 25 : days === 14 ? 55 : 85;
      isHighRisk = true;
      advice =
        lang === 'mr'
          ? `⚠️ अतिधोका: टोमॅटो ${days} दिवस थांबवल्यास सुमारे ${pct}% माल क्रेटमध्ये सडून नष्ट होईल (-${((qty * pct) / 100).toFixed(1)} क्विंटल नुकसान)!`
          : lang === 'hi'
          ? `⚠️ भारी खतरा: टमाटर ${days} दिन रोकने पर लगभग ${pct}% माल क्रेट में सड़ जाएगा (-${((qty * pct) / 100).toFixed(1)} क्विंटल नुकसान)!`
          : `⚠️ Critical Spoilage Risk: Holding tomatoes for ${days} days causes ~${pct}% rotting in crates (-${((qty * pct) / 100).toFixed(1)} qtl loss)!`;
    }
  } else if (crop === 'onion') {
    if (days === 0) {
      pct = 0;
      advice =
        lang === 'mr'
          ? 'आज ताजी विक्री केल्यास वजन घट ०% राहील.'
          : lang === 'hi'
          ? 'आज ताजा बेचने पर वजन में कोई कमी (0%) नहीं होगी।'
          : 'Fresh onion harvest. 0% shrinkage when dispatched today.';
    } else {
      pct = days === 7 ? 1.2 : days === 14 ? 2.4 : 3.6;
      isHighRisk = false;
      advice =
        lang === 'mr'
          ? `💡 हवादार चाळ: ${days} दिवसांत केवळ ~${pct}% नैसर्गिक ओलावा कमी होईल. भावातील अपेक्षित वाढीमुळे हा नफा अधिक राहील.`
          : lang === 'hi'
          ? `💡 हवादार चाळ: ${days} दिनों में सिर्फ ~${pct}% नमी कम होगी। भाव बढ़त से यह नुकसान आसानी से पूरा होगा।`
          : `💡 Aerated Chawl: Only ~${pct}% moisture shrinkage over ${days} days. Projected price rise easily offsets this shrinkage.`;
    }
  } else {
    // soybean
    if (days === 0) {
      pct = 0;
      advice =
        lang === 'mr'
          ? 'सोयाबीन कोरड्या गोदामात साठवणे किंवा आज विकणे दोन्ही सुरक्षित आहे.'
          : lang === 'hi'
          ? 'सोयाबीन सूखे गोदाम में रखना या आज बेचना दोनों सुरक्षित हैं।'
          : 'Dry grain storage. Safe to sell today or hold in moisture-controlled godown.';
    } else {
      pct = days === 7 ? 0.1 : days === 14 ? 0.2 : 0.3;
      isHighRisk = false;
      advice =
        lang === 'mr'
          ? `💡 कोरडे गोदाम: ${days} दिवसांत नगण्य (~${pct}%) घट. भाववाढीसाठी माल सुरक्षितपणे गोदामात थांबवू शकता.`
          : lang === 'hi'
          ? `💡 सूखा गोदाम: ${days} दिनों में नगण्य (~${pct}%) कमी। भाव बढ़ने तक माल सुरक्षित रोक सकते हैं।`
          : `💡 Dry Godown: Negligible ~${pct}% moisture variation over ${days} days. Safe to hold for higher prices.`;
    }
  }

  const lossQtl = Number(((qty * pct) / 100).toFixed(2));
  const lossValue = Math.round(lossQtl * pricePerQtl);

  return { pct, lossQtl, lossValue, advice, isHighRisk };
}

export const MapPage: React.FC = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const langKey = (i18n.language?.startsWith('mr') ? 'mr' : i18n.language?.startsWith('hi') ? 'hi' : 'en') as 'en' | 'mr' | 'hi';
  const t = DICTIONARY[langKey] || DICTIONARY.en;

  const { cropQuantities, setCropQuantity } = useAppStore();

  // Controls state
  const [selectedCrop, setSelectedCrop] = useState<string>('onion');
  const [selectedHorizon, setSelectedHorizon] = useState<number>(0); // 0 = today, 7 = +1w, 14 = +2w, 21 = +3w
  const [selectedVillageId, setSelectedVillageId] = useState<string>('niphad_rural');
  const [customStock, setCustomStock] = useState<number>(50); // Quintals

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
          if (data.items.length > 0) {
            // Keep current selection or default to top mandi
            const exists = data.items.some((m) => m.mandiId === selectedMandiId);
            if (!exists) {
              setSelectedMandiId(data.topMandiId || data.items[0].mandiId);
            }
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

  // Update map markers and polylines whenever data or selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers || !heatmapData) return;

    layers.clearLayers();

    // 1. Plot Farmer's Location Pointer (Google Maps style beacon pin)
    const farmerIconHtml = `
      <div class="relative flex flex-col items-center select-none cursor-pointer">
        <div class="mb-1 bg-neutral-ink text-neutral-surface border border-neutral-surface px-2 py-0.5 text-xs font-black shadow-hard whitespace-nowrap">
          ${t.youAreHere}
        </div>
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full border-2 border-primary bg-primary-subtle animate-ping pointer-events-none"></div>
          <svg width="36" height="44" viewBox="0 0 42 50" fill="none" class="relative z-10 drop-shadow-md">
            <path d="M21 2C10.5 2 2 10.5 2 21C2 35 21 48 21 48C21 48 40 35 40 21C40 10.5 31.5 2 21 2Z" fill="#1E6B2D" stroke="#1F1E1B" stroke-width="2.5"/>
            <circle cx="21" cy="20" r="8" fill="#FFFFFF"/>
            <circle cx="21" cy="20" r="4" fill="#1E6B2D"/>
          </svg>
        </div>
      </div>
    `;

    const farmerIcon = L.divIcon({
      className: 'custom-farmer-pin',
      html: farmerIconHtml,
      iconSize: [180, 60],
      iconAnchor: [90, 60],
    });

    L.marker([currentVillage.lat, currentVillage.lng], {
      icon: farmerIcon,
      zIndexOffset: 1000,
    }).addTo(layers);

    // 2. Sort mandis by net return
    const sorted = [...heatmapData.items].sort((a, b) => b.netReturn - a.netReturn);
    const topRankedIds = new Set(sorted.slice(0, 3).map((m) => m.mandiId));

    // 3. Plot Each APMC Mandi Marker (Google Maps Pin Style with Price Badge)
    heatmapData.items.forEach((item) => {
      const isSelected = item.mandiId === selectedMandiId;
      const isTop3 = topRankedIds.has(item.mandiId);
      const isRank1 = sorted[0]?.mandiId === item.mandiId;

      // Color scheme based on profit rank
      const pinColor = isRank1 ? '#15803D' : isTop3 ? '#2B6CB0' : '#B45309';
      const badgeBg = isSelected ? '#1F1E1B' : isRank1 ? '#15803D' : '#FFFFFF';
      const badgeText = isSelected || isRank1 ? '#FFFFFF' : '#1F1E1B';

      const mandiIconHtml = `
        <div class="relative flex flex-col items-center select-none cursor-pointer group transition-transform ${isSelected ? 'scale-110 z-50' : 'hover:scale-105'}">
          <!-- Price Tag Badge -->
          <div class="mb-0.5 px-2 py-0.5 text-xs font-black shadow-hard border border-neutral-ink flex items-center gap-1 whitespace-nowrap"
               style="background-color: ${badgeBg}; color: ${badgeText};">
            ${isRank1 ? '🏆 ' : ''}₹${item.forecastPrice}
          </div>

          <!-- Google Maps Pin Body -->
          <div class="relative flex items-center justify-center">
            ${isSelected ? '<div class="absolute w-10 h-10 rounded-full border-2 border-sell bg-sell-bg animate-pulse"></div>' : ''}
            <svg width="34" height="42" viewBox="0 0 42 50" fill="none" class="relative z-10 drop-shadow">
              <path d="M21 2C10.5 2 2 10.5 2 21C2 35 21 48 21 48C21 48 40 35 40 21C40 10.5 31.5 2 21 2Z" fill="${pinColor}" stroke="#1F1E1B" stroke-width="2"/>
              <circle cx="21" cy="20" r="7" fill="#FFFFFF"/>
              <circle cx="21" cy="20" r="3.5" fill="${pinColor}"/>
            </svg>
          </div>
        </div>
      `;

      const mandiIcon = L.divIcon({
        className: 'custom-mandi-pin',
        html: mandiIconHtml,
        iconSize: [140, 60],
        iconAnchor: [70, 60],
      });

      const marker = L.marker([item.lat, item.lng], {
        icon: mandiIcon,
        zIndexOffset: isSelected ? 900 : isTop3 ? 500 : 100,
      }).addTo(layers);

      marker.on('click', () => {
        setSelectedMandiId(item.mandiId);
      });
    });

    // 4. Draw Animated Polyline Route from Farmer to Selected Mandi
    const activeItem = heatmapData.items.find((m) => m.mandiId === selectedMandiId);
    if (activeItem) {
      const fromLatLng: [number, number] = [currentVillage.lat, currentVillage.lng];
      const toLatLng: [number, number] = [activeItem.lat, activeItem.lng];

      // Polyline casing for high contrast
      L.polyline([fromLatLng, toLatLng], {
        color: '#1F1E1B', // design-check-ignore: Leaflet vector color
        weight: 6,
        opacity: 0.8,
      }).addTo(layers);

      // Animated green route dashed line
      L.polyline([fromLatLng, toLatLng], {
        color: '#15803D', // design-check-ignore: Leaflet route vector color
        weight: 4,
        dashArray: '10, 10',
        className: 'leaflet-animated-route-line',
      }).addTo(layers);

      // Smooth pan to fit both points
      const bounds = L.latLngBounds([fromLatLng, toLatLng]);
      map.flyToBounds(bounds, {
        padding: [60, 60],
        duration: 0.6,
        maxZoom: 11,
      });
    }
  }, [heatmapData, selectedMandiId, currentVillage, langKey]);

  // Selected Mandi Calculations
  const selectedMandi: HeatmapItem | undefined =
    heatmapData?.items.find((m) => m.mandiId === selectedMandiId) || heatmapData?.items[0];

  // Calculations for current lot size
  const lotQty = customStock;
  const mandiName = selectedMandi
    ? langKey === 'mr'
      ? selectedMandi.name_mr
      : langKey === 'hi'
      ? selectedMandi.name_hi
      : selectedMandi.name
    : '';

  const selectedMandiPrice = selectedMandi ? selectedMandi.forecastPrice : 0;
  const spoilage = calculateSpoilage(selectedCrop, selectedHorizon, lotQty, selectedMandiPrice, langKey);
  const totalGrossValue = selectedMandi ? selectedMandi.forecastPrice * lotQty : 0;
  const totalFreightCost = selectedMandi ? selectedMandi.transportCost * lotQty : 0;
  const totalSpoilageLossValue = spoilage.lossValue;
  const totalNetPocketCash = Math.max(0, totalGrossValue - totalFreightCost - totalSpoilageLossValue);
  const approxTransitMinutes = selectedMandi ? Math.round(selectedMandi.distanceKm * 2.2) : 0;

  // Local distress comparison (nearest village local trader rate ~18% lower)
  const localTraderRate = selectedMandi ? Math.round(selectedMandi.forecastPrice * 0.82) : 0;
  const localNetValue = localTraderRate * Math.max(0, lotQty - spoilage.lossQtl);
  const extraGainVsLocal = Math.max(0, totalNetPocketCash - localNetValue);
  const extraGainPerQtl = Math.round(extraGainVsLocal / Math.max(1, lotQty));

  // WhatsApp Share Handler
  const handleWhatsAppShare = () => {
    if (!selectedMandi) return;
    const cropName = t.crops[selectedCrop as keyof typeof t.crops] || selectedCrop;
    const originName = langKey === 'mr' ? currentVillage.name_mr : langKey === 'hi' ? currentVillage.name_hi : currentVillage.name;

    const spoilageLine =
      selectedHorizon > 0
        ? `⚠️ *Storage Spoilage & Decay Loss:* -${formatRupee(totalSpoilageLossValue)} (~${spoilage.pct}% / -${spoilage.lossQtl} qtl)\n`
        : `🌿 *Storage Loss:* 0% (Fresh Harvest Dispatched Today)\n`;

    const message =
      `🌾 *Mohra Mandi Route & Profit Advisory*\n\n` +
      `📍 *Route:* ${originName} ➔ *${mandiName}* (${selectedMandi.distanceKm} km, ~${approxTransitMinutes} mins)\n` +
      `📦 *Produce Batch:* ${cropName} (${lotQty} Quintals)\n` +
      `🏷️ *Mandi Auction Rate:* ₹${selectedMandi.forecastPrice}/qtl\n` +
      `🚚 *Travel Freight Cost:* -${formatRupee(totalFreightCost)} (₹${selectedMandi.transportCost}/qtl)\n` +
      spoilageLine +
      `💰 *Net In-Hand Cash:* *${formatRupee(totalNetPocketCash)}*\n` +
      `📈 *Extra Profit vs Local Sale:* *+${formatRupee(extraGainVsLocal)}* (+₹${extraGainPerQtl}/qtl)\n\n` +
      `Nashik District Agriculture Advisory`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const handleAskAssistant = () => {
    if (!selectedMandi) return;
    const cropName = t.crops[selectedCrop as keyof typeof t.crops] || selectedCrop;
    const query = `${cropName}, ${lotQty} qtl, ${mandiName}, from ${currentVillage.name}`;
    navigate('/chat', { state: { initialPrompt: query } });
  };

  return (
    <div className="flex flex-col flex-1 bg-neutral-bg min-h-screen">
      {/* Route Animation Stylesheet */}
      <style>{`
        @keyframes routeFlow {
          0% { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 0; }
        }
        .leaflet-animated-route-line {
          stroke-dasharray: 12, 10;
          animation: routeFlow 0.9s linear infinite !important;
        }
      `}</style>

      {/* 1. Header with Back Button */}
      <div className="bg-neutral-surface border-b-2 border-neutral-ink px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/chat');
                }
              }}
              className="px-4 py-2 bg-neutral-surface hover:bg-neutral-bg text-neutral-ink border-2 border-neutral-ink font-black text-base shadow-hard cursor-pointer flex items-center gap-1.5 transition-transform active:translate-x-0.5 active:translate-y-0.5 shrink-0"
              aria-label={t.backBtn}
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
              <span>{t.backBtn}</span>
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-sell-bg text-sell border border-sell px-2.5 py-0.5 text-xs font-black uppercase tracking-wider mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{t.badge}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-neutral-ink">
                {t.title}
              </h1>
              <p className="text-sm md:text-base text-neutral-muted font-medium">
                {t.subtitle}
              </p>
            </div>
          </div>

          {/* Active Mandis Pill */}
          <div className="inline-flex items-center gap-2 bg-neutral-bg border-2 border-neutral-ink px-3 py-1.5 shadow-hard self-start md:self-auto">
            <span className="w-3 h-3 rounded-full bg-sell animate-pulse"></span>
            <span className="text-sm font-bold text-neutral-ink">
              {t.activeMandis}
            </span>
          </div>
        </div>

        {/* 2. Top Controls Bar */}
        <div className="max-w-7xl mx-auto mt-4 pt-4 border-t border-neutral-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Crop Selector */}
          <div className="bg-neutral-bg border-2 border-neutral-ink p-3">
            <label className="text-sm font-black text-neutral-ink block mb-1.5">
              {t.cropLabel}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['onion', 'tomato', 'soybean'] as const).map((crop) => (
                <button
                  key={crop}
                  onClick={() => setSelectedCrop(crop)}
                  className={`py-1.5 px-2 border-2 text-center font-bold text-xs transition-all cursor-pointer ${
                    selectedCrop === crop
                      ? 'bg-primary text-primary-fg border-neutral-ink shadow-sm font-black'
                      : 'bg-neutral-surface text-neutral-ink border-neutral-border hover:bg-neutral-bg'
                  }`}
                >
                  {crop === 'onion' ? '🧅 ' : crop === 'tomato' ? '🍅 ' : '🫘 '}
                  {t.crops[crop]}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Farmer Location (Village) */}
          <div className="bg-neutral-bg border-2 border-neutral-ink p-3">
            <label className="text-sm font-black text-neutral-ink block mb-1.5">
              {t.villageLabel}
            </label>
            <select
              value={selectedVillageId}
              onChange={(e) => setSelectedVillageId(e.target.value)}
              className="w-full p-2 bg-neutral-surface border-2 border-neutral-ink text-sm font-bold text-neutral-ink cursor-pointer focus:outline-none"
            >
              {VILLAGES.map((v) => (
                <option key={v.id} value={v.id}>
                  {langKey === 'mr' ? v.name_mr : langKey === 'hi' ? v.name_hi : v.name} ({v.taluka})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Harvest Lot Quantity */}
          <div className="bg-neutral-bg border-2 border-neutral-ink p-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-black text-neutral-ink">
                {t.qtyLabel}
              </label>
              <span className="text-sm font-black text-primary font-mono bg-neutral-surface px-1.5 border border-neutral-ink">
                {customStock} {t.qtl}
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={customStock}
              onChange={(e) => setCustomStock(Number(e.target.value))}
              className="w-full h-2.5 bg-neutral-surface border border-neutral-ink accent-primary cursor-pointer my-1.5"
            />
          </div>

          {/* 4. Time Horizon */}
          <div className="bg-neutral-bg border-2 border-neutral-ink p-3">
            <label className="text-sm font-black text-neutral-ink block mb-1.5">
              {t.horizonLabel}
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { days: 0, label: t.today },
                { days: 7, label: t.plus1w },
                { days: 14, label: t.plus2w },
                { days: 21, label: t.plus3w },
              ].map((h) => (
                <button
                  key={h.days}
                  onClick={() => setSelectedHorizon(h.days)}
                  className={`py-1.5 px-1 border text-center font-bold text-xs transition-all cursor-pointer ${
                    selectedHorizon === h.days
                      ? 'bg-primary text-primary-fg border-neutral-ink shadow-sm font-black'
                      : 'bg-neutral-surface text-neutral-ink border-neutral-border hover:bg-neutral-bg'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Split View: Left Map (60%) + Right Profit Dashboard (40%) */}
      <div className="max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* =============================================================== */}
        {/* LEFT: Leaflet Map Container (7 Columns)                         */}
        {/* =============================================================== */}
        <div className="lg:col-span-7 bg-neutral-surface border-2 border-neutral-ink shadow-hard flex flex-col">
          {/* Map Legend Banner */}
          <div className="p-3 bg-neutral-bg border-b-2 border-neutral-ink flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-neutral-ink">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-sell border border-neutral-ink inline-block"></span>
                <span>{t.legendBest}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-primary border border-neutral-ink inline-block"></span>
                <span>{t.legendMed}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-hold border border-neutral-ink inline-block"></span>
                <span>{t.legendLow}</span>
              </span>
            </div>
            <span className="text-neutral-muted">Tap any mandi pin to view route</span>
          </div>

          {/* Leaflet Map DOM Element */}
          <div
            ref={mapContainerRef}
            className="w-full h-[450px] md:h-[540px] z-0 bg-neutral-bg"
          />

          {/* Route Status Footer */}
          <div className="p-3 bg-sell-bg border-t-2 border-neutral-ink text-xs font-bold text-sell flex items-center gap-2">
            <Navigation className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              Route active: <strong>{langKey === 'mr' ? currentVillage.name_mr : currentVillage.name}</strong> ➔ <strong>{mandiName}</strong> ({selectedMandi?.distanceKm} km direct transit)
            </span>
          </div>
        </div>

        {/* =============================================================== */}
        {/* RIGHT: Actionable Farmer Profit & Route Dashboard (5 Columns)   */}
        {/* =============================================================== */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Selected Mandi Outcome Card */}
          {selectedMandi ? (
            <div className="bg-neutral-surface border-2 border-neutral-ink p-5 shadow-hard space-y-4">
              
              {/* Top Mandi Title & Rank */}
              <div className="border-b-2 border-neutral-ink pb-3 flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-primary">
                    {selectedMandi.rank <= 1 ? t.rankTop : selectedMandi.rank <= 3 ? t.rankHigh : t.rankStandard}
                  </span>
                  <h2 className="text-xl md:text-2xl font-black text-neutral-ink">
                    {mandiName}
                  </h2>
                  <div className="text-sm font-bold text-neutral-muted mt-0.5">
                    Taluka: {selectedMandi.taluka} • {lotQty} {t.qtl} produce batch
                  </div>
                </div>

                <div className="p-2 bg-sell-bg text-sell border-2 border-sell font-black text-base shrink-0">
                  #{selectedMandi.rank || 1}
                </div>
              </div>

              {/* 4 Big Direct Metric Cards */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                
                {/* 1. Distance & Travel Time */}
                <div className="p-3 bg-neutral-bg border border-neutral-ink">
                  <div className="text-xs font-bold text-neutral-muted flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{t.distanceLabel}</span>
                  </div>
                  <div className="text-lg font-black text-neutral-ink font-mono mt-0.5">
                    {selectedMandi.distanceKm} km
                  </div>
                  <div className="text-xs font-bold text-neutral-muted">
                    ~{approxTransitMinutes} mins travel
                  </div>
                </div>

                {/* 2. Road Freight Cost */}
                <div className="p-3 bg-neutral-bg border border-neutral-ink">
                  <div className="text-xs font-bold text-neutral-muted flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-risk" />
                    <span>{t.freightCostLabel}</span>
                  </div>
                  <div className="text-lg font-black text-risk font-mono mt-0.5">
                    -{formatRupee(totalFreightCost)}
                  </div>
                  <div className="text-xs font-bold text-neutral-muted">
                    (₹{selectedMandi.transportCost}/qtl)
                  </div>
                </div>

                {/* 3. Mandi Auction Price */}
                <div className="p-3 bg-neutral-bg border border-neutral-ink">
                  <div className="text-xs font-bold text-neutral-muted flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span>{t.mandiPriceLabel}</span>
                  </div>
                  <div className="text-lg font-black text-primary font-mono mt-0.5">
                    ₹{selectedMandi.forecastPrice} <span className="text-xs font-normal">/qtl</span>
                  </div>
                  <div className="text-xs font-bold text-neutral-muted">
                    {selectedHorizon > 0 ? `In ${selectedHorizon} days` : 'Today auction'}
                  </div>
                </div>

                {/* 4. Storage Spoilage & Decay */}
                <div className="p-3 bg-neutral-bg border border-neutral-ink">
                  <div className="text-xs font-bold text-neutral-muted flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-neutral-ink" />
                    <span>{t.spoilageLabel}</span>
                  </div>
                  <div className={`text-lg font-black font-mono mt-0.5 ${selectedHorizon > 0 && spoilage.lossValue > 0 ? 'text-risk' : 'text-primary'}`}>
                    {selectedHorizon > 0 && spoilage.lossValue > 0 ? `-${formatRupee(spoilage.lossValue)}` : '0% Loss'}
                  </div>
                  <div className="text-xs font-bold text-neutral-muted truncate">
                    {selectedHorizon > 0 ? `~${spoilage.pct}% (-${spoilage.lossQtl} ${t.qtl})` : t.freshHarvest}
                  </div>
                </div>

              </div>

              {/* Storage & Spoilage Impact Banner */}
              <div
                className={`p-3.5 border-2 ${
                  spoilage.isHighRisk
                    ? 'bg-risk-bg text-risk border-risk'
                    : 'bg-neutral-bg text-neutral-ink border-neutral-ink'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {spoilage.isHighRisk ? (
                    <AlertTriangle className="w-5 h-5 shrink-0 text-risk mt-0.5" />
                  ) : (
                    <Clock className="w-5 h-5 shrink-0 text-primary mt-0.5" />
                  )}
                  <div className="text-sm">
                    <div className="font-black">
                      {t.spoilageAdvisoryHeader}: {selectedHorizon > 0 ? `+${selectedHorizon} Days Holding` : t.today}
                    </div>
                    <div className="font-bold mt-0.5 leading-snug">
                      {spoilage.advice}
                    </div>
                  </div>
                </div>
              </div>

              {/* Big Golden In-Hand Profit Highlight Card */}
              <div className="p-4 bg-sell-bg border-2 border-sell shadow-hard text-center">
                <div className="text-xs font-black uppercase tracking-wider text-sell mb-1">
                  💰 {t.netProfitLabel} ({selectedHorizon > 0 ? t.netProfitSubtext : 'After Road Freight'})
                </div>
                <div className="text-3xl md:text-4xl font-black text-sell font-mono">
                  {formatRupee(totalNetPocketCash)}
                </div>
                
                {extraGainVsLocal > 0 && (
                  <div className="mt-2 pt-2 border-t border-sell/30 text-sm font-black text-sell flex items-center justify-center gap-1">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>+{formatRupee(extraGainVsLocal)} (+₹{extraGainPerQtl}/qtl) vs local village sale</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: WhatsApp & AI Advisory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="w-full py-2.5 px-3 bg-neutral-surface hover:bg-neutral-bg text-neutral-ink border-2 border-neutral-ink font-bold text-sm shadow-hard cursor-pointer flex items-center justify-center gap-1.5 transition-transform active:translate-x-0.5 active:translate-y-0.5"
                >
                  <Share2 className="w-4 h-4 text-sell" />
                  <span>{t.shareWhatsApp}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAskAssistant}
                  className="w-full py-2.5 px-3 bg-primary hover:bg-primary-hover text-primary-fg border-2 border-neutral-ink font-bold text-sm shadow-hard cursor-pointer flex items-center justify-center gap-1.5 transition-transform active:translate-x-0.5 active:translate-y-0.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{t.askChat}</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-neutral-surface border-2 border-neutral-ink p-6 shadow-hard text-center font-bold text-neutral-muted">
              Loading Mandi Data...
            </div>
          )}

          {/* Quick Mandi List (All 14 Mandis Ranked) */}
          <div className="bg-neutral-surface border-2 border-neutral-ink p-4 shadow-hard">
            <h3 className="text-sm font-black uppercase tracking-wider text-neutral-ink mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              <span>{t.allMandisHeader}</span>
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {heatmapData?.items.map((m, idx) => {
                const isSelected = m.mandiId === selectedMandiId;
                const mName = langKey === 'mr' ? m.name_mr : langKey === 'hi' ? m.name_hi : m.name;
                const mGross = m.forecastPrice * lotQty;
                const mNet = mGross - (m.transportCost * lotQty);

                return (
                  <button
                    key={m.mandiId}
                    type="button"
                    onClick={() => setSelectedMandiId(m.mandiId)}
                    className={`w-full p-2.5 border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-fg border-neutral-ink shadow-sm translate-x-1'
                        : 'bg-neutral-bg text-neutral-ink border-neutral-border hover:bg-neutral-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full text-xs font-black flex items-center justify-center border ${
                        isSelected ? 'bg-primary-fg text-primary border-primary-fg' : 'bg-neutral-surface text-neutral-ink border-neutral-ink'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-sm truncate max-w-[140px] sm:max-w-[180px]">
                          {mName}
                        </div>
                        <div className={`text-xs ${isSelected ? 'opacity-90' : 'text-neutral-muted'}`}>
                          {m.distanceKm} km • ₹{m.forecastPrice}/qtl
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-black text-sm">
                        {formatRupee(mNet)}
                      </div>
                      <div className={`text-xs ${isSelected ? 'opacity-90' : 'text-sell font-bold'}`}>
                        net cash
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default MapPage;
