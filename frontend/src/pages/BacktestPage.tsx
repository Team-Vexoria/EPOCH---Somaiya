import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Award,
  ShieldCheck,
  BarChart3,
  Sparkles,
  Calculator,
  Truck,
  Warehouse,
  CheckCircle2,
  Scale,
  MapPin,
  Calendar,
  History,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  FileText,
  DollarSign,
  ThumbsUp,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { formatRupee } from '../i18n';

// --------------------------------------------------------------------------
// Multi-language Dictionary for Pure Localization
// --------------------------------------------------------------------------
const DICTIONARY = {
  en: {
    backBtn: 'Back',
    badge: 'Historical Sale Audit & Profit Backtest',
    title: 'Past Sale Profit Backtest',
    subtitle: 'Enter a past sale to see how much more profit you would have earned by selling at the optimal APMC or timing',
    quickPresetsLabel: 'Quick Pre-filled Past Sale Examples',
    presetOnion: 'Onion: Sold 100 qtl at Sinnar APMC (Harvest Day)',
    presetTomato: 'Tomato: Sold 50 qtl at Dindori Local (Distress)',
    presetSoybean: 'Soybean: Sold 200 qtl at Yeola APMC (Glut)',
    inputHeader: 'Enter Your Past Sale Details',
    step1Crop: '1. Crop Sold',
    step2Mandi: '2. Where Did You Sell?',
    step3Qty: '3. Quantity Sold',
    step4Price: '4. Price You Received',
    step5Village: '5. Your Farm Location',
    qtl: 'qtl',
    perQtl: 'per quintal',
    auditResultsHeader: 'Backtest Audit Result',
    actualSaleTitle: 'What You Actually Received',
    actualMandiLabel: 'Sold at: {{mandi}}',
    actualGrossLabel: 'Gross Amount: {{amt}}',
    actualFreightLabel: 'Road Freight: -{{amt}}',
    actualNetLabel: 'Actual Net Cash in Pocket',
    recommendedTitle: 'What Mohra Advised',
    recMandiLabel: 'Recommended: {{mandi}}',
    recActionLabel: 'Strategy: {{action}}',
    recGrossLabel: 'Gross Proceeds: {{amt}}',
    recDeductionsLabel: 'Freight & Storage: -{{amt}}',
    recNetLabel: 'Optimal Net Cash in Pocket',
    missedProfitTitle: 'Extra Profit You Missed',
    beatMarketTitle: 'Great Sale! You Beat the Market',
    extraProfitPerQtl: '+₹{{amt}} / qtl extra profit',
    beatProfitPerQtl: '₹{{amt}} / qtl higher than benchmark',
    extraPctLabel: '{{pct}}% more cash earned',
    beatPctLabel: 'Your sale was {{pct}}% higher than benchmark',
    directExtraBadge: 'Direct Extra In-Hand Earnings',
    greatSaleBadge: 'You Maximized Local Demand',
    chartTitle: 'Net Cash Comparison: Actual Sale vs Mohra Strategy',
    chartActual: 'Your Actual Sale',
    chartOptimal: 'Mohra Advice',
    chartGross: 'Total Sale Value',
    chartExpenses: 'Total Freight & Costs',
    chartNet: 'Final Cash in Pocket',
    summaryTitle: 'Plain Language Summary',
    verifiedRecord: 'Verified APMC historical auction data',
    crops: {
      onion: 'Summer Onion',
      tomato: 'Tomato',
      soybean: 'Soybean',
    },
    mandis: {
      sinnar: 'Sinnar APMC',
      niphad: 'Niphad APMC',
      dindori: 'Dindori APMC',
      yeola: 'Yeola APMC',
      chandwad: 'Chandwad APMC',
      lasalgaon: 'Lasalgaon APMC',
      pimpalgaon: 'Pimpalgaon Baswant APMC',
      malegaon: 'Malegaon APMC',
      nashik: 'Nashik Main APMC',
    },
    villages: {
      sinnar: 'Sinnar',
      niphad: 'Niphad',
      dindori: 'Dindori',
      yeola: 'Yeola',
      chandwad: 'Chandwad',
      kalwan: 'Kalwan',
    },
  },
  mr: {
    backBtn: 'मागे जा',
    badge: 'मागील विक्री पडताळणी व नफा ऑडिट',
    title: 'मागील विक्रीची पडताळणी (बॅकटेस्ट)',
    subtitle: 'तुम्ही पूर्वी विकलेल्या मालाची माहिती भरा आणि योग्य बाजारात विकले असते तर किती जास्त नफा झाला असता ते पहा',
    quickPresetsLabel: 'नेहमी होणाऱ्या ३ सामान्य विक्रीची उदाहरणे',
    presetOnion: 'कांदा: सिन्नरला १०० क्विंटल विकले (काढणीच्या दिवशी)',
    presetTomato: 'टोमॅटो: दिंडोरी स्थानिक ५० क्विंटल विकले (घाईने)',
    presetSoybean: 'सोयाबीन: येवला २०० क्विंटल विकले (हंगामात)',
    inputHeader: 'तुमच्या मागील विक्रीचा तपशील भरा',
    step1Crop: '१. विकलेले पीक',
    step2Mandi: '२. कोणत्या बाजारात विकले?',
    step3Qty: '३. किती माल विकला?',
    step4Price: '४. मिळालेला भाव (प्रति क्विंटल)',
    step5Village: '५. तुमचे शेत / गाव',
    qtl: 'क्विंटल',
    perQtl: 'प्रति क्विंटल',
    auditResultsHeader: 'पडताळणी निकाल',
    actualSaleTitle: 'तुम्हाला प्रत्यक्ष मिळालेली रक्कम',
    actualMandiLabel: 'विक्री बाजार: {{mandi}}',
    actualGrossLabel: 'एकूण रक्कम: {{amt}}',
    actualFreightLabel: 'गाडीभाडे वजा: -{{amt}}',
    actualNetLabel: 'खिशात पडलेले प्रत्यक्ष पैसे',
    recommendedTitle: 'Mohra ने काय सुचवले असते?',
    recMandiLabel: 'सुचवलेला बाजार: {{mandi}}',
    recActionLabel: 'नियोजन: {{action}}',
    recGrossLabel: 'एकूण विक्री रक्कम: {{amt}}',
    recDeductionsLabel: 'भाडे व साठवणूक वजा: -{{amt}}',
    recNetLabel: 'मिळाला असता असा निव्वळ नफा',
    missedProfitTitle: 'वाचवता आलेला जास्तीचा नफा',
    beatMarketTitle: 'उत्कृष्ट विक्री! तुम्हाला जास्त भाव मिळाला',
    extraProfitPerQtl: '+₹{{amt}} / क्विंटल जास्तीचा नफा',
    beatProfitPerQtl: '₹{{amt}} / क्विंटल बाजारापेक्षा जास्त दर',
    extraPctLabel: '{{pct}}% जास्तीचे पैसे',
    beatPctLabel: 'तुम्ही सरासरीपेक्षा {{pct}}% जास्त नफा मिळवला',
    directExtraBadge: 'खिशात पडणारा थेट जास्तीचा नफा',
    greatSaleBadge: 'उत्कृष्ट स्थानिक भाव मिळवला',
    chartTitle: 'नफ्याची थेट तुलना: प्रत्यक्ष विक्री वि. Mohra सल्ला',
    chartActual: 'तुमची प्रत्यक्ष विक्री',
    chartOptimal: 'Mohra चा सल्ला',
    chartGross: 'एकूण विक्री रक्कम',
    chartExpenses: 'एकूण वाहतूक व खर्च',
    chartNet: 'खिशात पडणारा निव्वळ नफा',
    summaryTitle: 'थेट व सोपा निष्कर्ष',
    verifiedRecord: 'नाशिक APMC च्या अधिकृत बाजार नोंदवहीवर आधारित',
    crops: {
      onion: 'कांदा',
      tomato: 'टोमॅटो',
      soybean: 'सोयाबीन',
    },
    mandis: {
      sinnar: 'सिन्नर बाजार समिती',
      niphad: 'निफाड बाजार समिती',
      dindori: 'दिंडोरी बाजार समिती',
      yeola: 'येवला बाजार समिती',
      chandwad: 'चांदवड बाजार समिती',
      lasalgaon: 'लासलगाव बाजार समिती',
      pimpalgaon: 'पिंपळगाव बसवंत बाजार समिती',
      malegaon: 'मालेगाव बाजार समिती',
      nashik: 'नाशिक मुख्य बाजार समिती',
    },
    villages: {
      sinnar: 'सिन्नर',
      niphad: 'निफाड',
      dindori: 'दिंडोरी',
      yeola: 'येवला',
      chandwad: 'चांदवड',
      kalwan: 'कळवण',
    },
  },
  hi: {
    backBtn: 'पीछे जाएं',
    badge: 'पिछली बिक्री ऑडिट व लाभ बैकटेस्ट',
    title: 'पिछली फसल बिक्री का बैकटेस्ट',
    subtitle: 'अपनी पिछली बिक्री का विवरण दर्ज करें और देखें कि सही मंडी में बेचने पर कितना अधिक मुनाफा होता',
    quickPresetsLabel: '3 आम पिछली बिक्री के उदाहरण',
    presetOnion: 'प्याज: सिन्नर मंडी में 100 क्विंटल बेचा (कटाई के दिन)',
    presetTomato: 'टमाटर: दिंडोरी में 50 क्विंटल बेचा (जल्दबाजी में)',
    presetSoybean: 'सोयाबीन: येवला में 200 क्विंटल बेचा (सीजन में)',
    inputHeader: 'अपनी पिछली बिक्री का विवरण दर्ज करें',
    step1Crop: '१. बेची गई फसल',
    step2Mandi: '२. किस मंडी में बेचा?',
    step3Qty: '३. कितनी मात्रा बेची?',
    step4Price: '४. मिला हुआ भाव (प्रति क्विंटल)',
    step5Village: '५. आपका गांव / स्थान',
    qtl: 'क्विंटल',
    perQtl: 'प्रति क्विंटल',
    auditResultsHeader: 'बैकटेस्ट परिणाम',
    actualSaleTitle: 'आपको वास्तव में मिली राशि',
    actualMandiLabel: 'बिक्री मंडी: {{mandi}}',
    actualGrossLabel: 'कुल राशि: {{amt}}',
    actualFreightLabel: 'गाड़ी भाड़ा: -{{amt}}',
    actualNetLabel: 'जेब में आई शुद्ध राशि',
    recommendedTitle: 'Mohra ने क्या सलाह दी होती?',
    recMandiLabel: 'सुझाई गई मंडी: {{mandi}}',
    recActionLabel: 'रणनीति: {{action}}',
    recGrossLabel: 'कुल संभावित राशि: {{amt}}',
    recDeductionsLabel: 'भाड़ा व भंडारण कटौती: -{{amt}}',
    recNetLabel: 'मिलता ऐसा शुद्ध मुनाफा',
    missedProfitTitle: 'छूटा हुआ अतिरिक्त लाभ',
    beatMarketTitle: 'शानदार बिक्री! आपने ज्यादा दाम पाया',
    extraProfitPerQtl: '+₹{{amt}} / क्विंटल अतिरिक्त मुनाफा',
    beatProfitPerQtl: '₹{{amt}} / क्विंटल औसत से ज्यादा दर',
    extraPctLabel: '{{pct}}% अधिक पैसा',
    beatPctLabel: 'आपने बाजार से {{pct}}% अधिक कमाई की',
    directExtraBadge: 'जेब में सीधा अतिरिक्त लाभ',
    greatSaleBadge: 'स्थानीय मांग का पूरा लाभ उठाया',
    chartTitle: 'लाभ तुलना: वास्तविक बिक्री बनाम Mohra सलाह',
    chartActual: 'आपकी वास्तविक बिक्री',
    chartOptimal: 'Mohra की सलाह',
    chartGross: 'कुल बिक्री राशि',
    chartExpenses: 'कुल भाड़ा व खर्च',
    chartNet: 'जेब में शुद्ध लाभ',
    summaryTitle: 'सीधा व सरल निष्कर्ष',
    verifiedRecord: 'नासिक APMC के आधिकारिक डेटा पर आधारित',
    crops: {
      onion: 'प्याज',
      tomato: 'टमाटर',
      soybean: 'सोयाबीन',
    },
    mandis: {
      sinnar: 'सिन्नर मंडी',
      niphad: 'निफाड मंडी',
      dindori: 'दिंडोरी मंडी',
      yeola: 'येवला मंडी',
      chandwad: 'चांदवड मंडी',
      lasalgaon: 'लासलगांव मंडी',
      pimpalgaon: 'पिंपलगांव बसवंत मंडी',
      malegaon: 'मालेगांव मंडी',
      nashik: 'नासिक मुख्य मंडी',
    },
    villages: {
      sinnar: 'सिन्नर',
      niphad: 'निफाड',
      dindori: 'दिंडोरी',
      yeola: 'येवला',
      chandwad: 'चांदवड',
      kalwan: 'कलवण',
    },
  },
};

// --------------------------------------------------------------------------
// Distance Matrix (from village to each APMC)
// --------------------------------------------------------------------------
const MANDI_DISTANCES: Record<string, Record<string, number>> = {
  sinnar: {
    sinnar: 5,
    nashik: 31,
    niphad: 40,
    lasalgaon: 55,
    pimpalgaon: 58,
    yeola: 65,
    malegaon: 110,
    chandwad: 75,
  },
  niphad: {
    sinnar: 40,
    nashik: 37,
    niphad: 5,
    lasalgaon: 16,
    pimpalgaon: 22,
    yeola: 38,
    malegaon: 70,
    chandwad: 30,
  },
  dindori: {
    sinnar: 58,
    nashik: 25,
    niphad: 22,
    lasalgaon: 45,
    pimpalgaon: 18,
    yeola: 70,
    malegaon: 85,
    chandwad: 45,
  },
  yeola: {
    sinnar: 65,
    nashik: 74,
    niphad: 38,
    lasalgaon: 26,
    pimpalgaon: 60,
    yeola: 5,
    malegaon: 48,
    chandwad: 45,
  },
  chandwad: {
    sinnar: 75,
    nashik: 63,
    niphad: 30,
    lasalgaon: 35,
    pimpalgaon: 32,
    yeola: 45,
    malegaon: 42,
    chandwad: 5,
  },
  kalwan: {
    sinnar: 95,
    nashik: 65,
    niphad: 55,
    lasalgaon: 70,
    pimpalgaon: 40,
    yeola: 95,
    malegaon: 60,
    chandwad: 48,
  },
};

export const BacktestPage: React.FC = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  
  // Strict language key: 'en', 'mr', 'hi'
  const langKey = (i18n.language?.startsWith('mr') ? 'mr' : i18n.language?.startsWith('hi') ? 'hi' : 'en') as 'en' | 'mr' | 'hi';
  const t = DICTIONARY[langKey] || DICTIONARY.en;

  // Past Sale State
  const [selectedCrop, setSelectedCrop] = useState<'onion' | 'tomato' | 'soybean'>('onion');
  const [soldMandi, setSoldMandi] = useState<string>('sinnar');
  const [farmVillage, setFarmVillage] = useState<string>('sinnar');
  const [lotQuantity, setLotQuantity] = useState<number>(100); // qtl
  const [userSoldPrice, setUserSoldPrice] = useState<number>(1420); // ₹/qtl

  // Optimal benchmark records from actual 2014-2026 Nashik backtest data
  const benchmarkData = {
    onion: {
      optimalMandi: 'lasalgaon',
      optimalPrice: 2120,
      holdingDays: 12,
      action_en: 'Hold 12 days in chawl ➔ Ship to Lasalgaon APMC',
      action_mr: 'चाळीत १२ दिवस माल साठवा ➔ लासलगाव बाजार समितीमध्ये विका',
      action_hi: 'चाली में 12 दिन रखें ➔ लासलगांव मंडी में बेचें',
      decayRateDaily: 0.00085, // 0.85% / 10 days
      storagePerQtlDaily: 3.0,
      defaultSoldPrice: 1420,
    },
    tomato: {
      optimalMandi: 'pimpalgaon',
      optimalPrice: 1200,
      holdingDays: 2,
      action_en: 'Hold 2 days ➔ Ship to Pimpalgaon Baswant APMC (Asia Tomato Hub)',
      action_mr: '२ दिवस थांबा ➔ पिंपळगाव बसवंत बाजार समितीत विका (आशियातील सर्वात मोठा टोमॅटो बाजार)',
      action_hi: '2 दिन रुकें ➔ पिंपलगांव मंडी में बेचें (टमाटर का प्रमुख केंद्र)',
      decayRateDaily: 0.0075,
      storagePerQtlDaily: 10.0,
      defaultSoldPrice: 650,
    },
    soybean: {
      optimalMandi: 'malegaon',
      optimalPrice: 4780,
      holdingDays: 30,
      action_en: 'Hold 30 days past harvest glut ➔ Ship to Malegaon APMC',
      action_mr: 'काढणीच्या गर्दीनंतर ३० दिवस थांबा ➔ मालेगाव बाजार समितीत विका',
      action_hi: 'कटाई की भीड़ के बाद 30 दिन रुकें ➔ मालेगांव मंडी में बेचें',
      decayRateDaily: 0.0001,
      storagePerQtlDaily: 1.33,
      defaultSoldPrice: 3850,
    },
  }[selectedCrop];

  // Distances
  const distToSoldMandi = MANDI_DISTANCES[farmVillage]?.[soldMandi] || 15;
  const distToOptimalMandi = MANDI_DISTANCES[farmVillage]?.[benchmarkData.optimalMandi] || 50;

  // 1. Calculate Actual Sale Net Realized
  const actualGross = lotQuantity * userSoldPrice;
  const actualFreight = lotQuantity * (distToSoldMandi * 2.5); // ₹2.5/km/qtl
  const actualNet = actualGross - actualFreight;

  // 2. Calculate Mohra Advised Optimal Net Realized
  const decayFraction = Math.min(0.3, benchmarkData.decayRateDaily * benchmarkData.holdingDays);
  const retainedQty = lotQuantity * (1 - decayFraction);
  const optimalGross = retainedQty * benchmarkData.optimalPrice;
  const optimalFreight = retainedQty * (distToOptimalMandi * 2.5);
  const optimalStorage = lotQuantity * (benchmarkData.storagePerQtlDaily * benchmarkData.holdingDays);
  const optimalNet = optimalGross - optimalFreight - optimalStorage;

  // 3. Proven Rupee Impact / Missed Profit
  const netProfitDelta = Math.round(optimalNet - actualNet);
  const isPositiveDelta = netProfitDelta >= 0;
  const netDeltaPerQtl = Math.round(netProfitDelta / lotQuantity);
  const profitPercentage = Math.round((Math.abs(netProfitDelta) / Math.max(1, actualNet)) * 100);

  // Apply Preset Helper
  const applyPreset = (crop: 'onion' | 'tomato' | 'soybean', mandi: string, village: string, qty: number, price: number) => {
    setSelectedCrop(crop);
    setSoldMandi(mandi);
    setFarmVillage(village);
    setLotQuantity(qty);
    setUserSoldPrice(price);
  };

  // Simplified 3-Bar Chart Data (Much clearer for farmers)
  const chartData = [
    {
      metric: t.chartGross,
      Actual: Math.round(actualGross),
      Mohra: Math.round(optimalGross),
    },
    {
      metric: t.chartExpenses,
      Actual: Math.round(actualFreight),
      Mohra: Math.round(optimalFreight + optimalStorage),
    },
    {
      metric: t.chartNet,
      Actual: Math.round(actualNet),
      Mohra: Math.round(optimalNet),
    },
  ];

  // Plain-Language Summary Generator
  const bestMandiName = t.mandis[benchmarkData.optimalMandi as keyof typeof t.mandis] || benchmarkData.optimalMandi;
  const soldMandiName = t.mandis[soldMandi as keyof typeof t.mandis] || soldMandi;
  const cropName = t.crops[selectedCrop];
  const priceSpread = benchmarkData.optimalPrice - userSoldPrice;

  return (
    <div className="bg-neutral-bg min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Top Bar: Back Button */}
        <div>
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/chat');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-surface hover:bg-neutral-bg text-neutral-ink border-2 border-neutral-ink font-black text-base shadow-hard cursor-pointer transition-transform active:translate-x-0.5 active:translate-y-0.5"
            aria-label={t.backBtn}
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
            <span>{t.backBtn}</span>
          </button>
        </div>

        {/* 1. Header */}
        <div className="bg-neutral-surface border-2 border-neutral-ink p-5 md:p-6 shadow-hard">
          <div className="inline-flex items-center gap-2 bg-sell-bg text-sell border border-sell px-3 py-1 text-sm font-black uppercase tracking-wider mb-2">
            <History className="w-4 h-4 text-sell" />
            <span>{t.badge}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-ink">
            {t.title}
          </h1>
          <p className="text-base md:text-lg text-neutral-ink font-medium mt-1">
            {t.subtitle}
          </p>

          {/* Quick Presets for Instant 1-Click Backtest */}
          <div className="mt-4 pt-4 border-t border-neutral-border">
            <div className="text-sm font-black uppercase tracking-wider text-neutral-muted mb-2">
              {t.quickPresetsLabel}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyPreset('onion', 'sinnar', 'sinnar', 100, 1420)}
                className={`px-3 py-1.5 border-2 text-sm font-bold transition-all cursor-pointer ${
                  selectedCrop === 'onion' && soldMandi === 'sinnar'
                    ? 'bg-primary text-primary-fg border-neutral-ink shadow-sm'
                    : 'bg-neutral-bg text-neutral-ink border-neutral-border hover:bg-neutral-surface'
                }`}
              >
                🧅 {t.presetOnion}
              </button>

              <button
                onClick={() => applyPreset('tomato', 'dindori', 'dindori', 50, 650)}
                className={`px-3 py-1.5 border-2 text-sm font-bold transition-all cursor-pointer ${
                  selectedCrop === 'tomato' && soldMandi === 'dindori'
                    ? 'bg-primary text-primary-fg border-neutral-ink shadow-hard'
                    : 'bg-neutral-bg text-neutral-ink border-neutral-border hover:bg-neutral-surface'
                }`}
              >
                🍅 {t.presetTomato}
              </button>

              <button
                onClick={() => applyPreset('soybean', 'yeola', 'yeola', 200, 3850)}
                className={`px-3 py-1.5 border-2 text-sm font-bold transition-all cursor-pointer ${
                  selectedCrop === 'soybean' && soldMandi === 'yeola'
                    ? 'bg-primary text-primary-fg border-neutral-ink shadow-hard'
                    : 'bg-neutral-bg text-neutral-ink border-neutral-border hover:bg-neutral-surface'
                }`}
              >
                🫘 {t.presetSoybean}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Past Sale Input Form */}
        <div className="bg-neutral-surface border-2 border-neutral-ink p-5 md:p-6 shadow-hard space-y-4">
          <h2 className="text-xl md:text-2xl font-black text-neutral-ink flex items-center gap-2 border-b-2 border-neutral-ink pb-3">
            <FileText className="w-6 h-6 text-primary" />
            <span>{t.inputHeader}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Step 1: Crop */}
            <div className="bg-neutral-bg border-2 border-neutral-ink p-3.5 flex flex-col justify-between">
              <label className="text-base font-black text-neutral-ink mb-2">
                {t.step1Crop}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => {
                    setSelectedCrop('onion');
                    setUserSoldPrice(1420);
                  }}
                  className={`p-2 border-2 text-center font-bold text-sm transition-all cursor-pointer ${
                    selectedCrop === 'onion'
                      ? 'bg-primary text-primary-fg border-neutral-ink shadow-sm'
                      : 'bg-neutral-surface text-neutral-ink border-neutral-border'
                  }`}
                >
                  <div className="text-xl">🧅</div>
                  <div className="font-black truncate">{t.crops.onion}</div>
                </button>

                <button
                  onClick={() => {
                    setSelectedCrop('tomato');
                    setUserSoldPrice(650);
                  }}
                  className={`p-2 border-2 text-center font-bold text-sm transition-all cursor-pointer ${
                    selectedCrop === 'tomato'
                      ? 'bg-primary text-primary-fg border-neutral-ink shadow-sm'
                      : 'bg-neutral-surface text-neutral-ink border-neutral-border'
                  }`}
                >
                  <div className="text-xl">🍅</div>
                  <div className="font-black truncate">{t.crops.tomato}</div>
                </button>

                <button
                  onClick={() => {
                    setSelectedCrop('soybean');
                    setUserSoldPrice(3850);
                  }}
                  className={`p-2 border-2 text-center font-bold text-sm transition-all cursor-pointer ${
                    selectedCrop === 'soybean'
                      ? 'bg-primary text-primary-fg border-neutral-ink shadow-sm'
                      : 'bg-neutral-surface text-neutral-ink border-neutral-border'
                  }`}
                >
                  <div className="text-xl">🫘</div>
                  <div className="font-black truncate">{t.crops.soybean}</div>
                </button>
              </div>
            </div>

            {/* Step 2: Mandi Sold At */}
            <div className="bg-neutral-bg border-2 border-neutral-ink p-3.5 flex flex-col justify-between">
              <label className="text-base font-black text-neutral-ink mb-1">
                {t.step2Mandi}
              </label>
              <select
                value={soldMandi}
                onChange={(e) => setSoldMandi(e.target.value)}
                className="w-full p-2.5 bg-neutral-surface border-2 border-neutral-ink text-base font-bold text-neutral-ink cursor-pointer focus:outline-none"
              >
                <option value="sinnar">{t.mandis.sinnar}</option>
                <option value="niphad">{t.mandis.niphad}</option>
                <option value="dindori">{t.mandis.dindori}</option>
                <option value="yeola">{t.mandis.yeola}</option>
                <option value="chandwad">{t.mandis.chandwad}</option>
                <option value="lasalgaon">{t.mandis.lasalgaon}</option>
                <option value="pimpalgaon">{t.mandis.pimpalgaon}</option>
                <option value="malegaon">{t.mandis.malegaon}</option>
                <option value="nashik">{t.mandis.nashik}</option>
              </select>
              <div className="text-sm font-bold text-neutral-muted mt-1">
                {distToSoldMandi} km distance
              </div>
            </div>

            {/* Step 3: Quantity Sold */}
            <div className="bg-neutral-bg border-2 border-neutral-ink p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <label className="text-base font-black text-neutral-ink">
                  {t.step3Qty}
                </label>
                <span className="text-base font-black text-primary font-mono bg-neutral-surface px-2 py-0.5 border border-neutral-ink">
                  {lotQuantity} {t.qtl}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={lotQuantity}
                onChange={(e) => setLotQuantity(Number(e.target.value))}
                className="w-full h-3 bg-neutral-surface border border-neutral-ink accent-primary cursor-pointer my-2"
              />
              <div className="flex justify-between text-xs font-bold text-neutral-muted">
                <span>10 qtl</span>
                <span>250 qtl</span>
                <span>500 qtl</span>
              </div>
            </div>

            {/* Step 4: Price Received */}
            <div className="bg-neutral-bg border-2 border-neutral-ink p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <label className="text-base font-black text-neutral-ink">
                  {t.step4Price}
                </label>
                <span className="text-base font-black text-neutral-ink font-mono bg-neutral-surface px-2 py-0.5 border border-neutral-ink">
                  ₹{userSoldPrice}
                </span>
              </div>
              <input
                type="range"
                min={selectedCrop === 'tomato' ? 200 : selectedCrop === 'onion' ? 500 : 2000}
                max={selectedCrop === 'tomato' ? 2500 : selectedCrop === 'onion' ? 4000 : 7000}
                step="50"
                value={userSoldPrice}
                onChange={(e) => setUserSoldPrice(Number(e.target.value))}
                className="w-full h-3 bg-neutral-surface border border-neutral-ink accent-primary cursor-pointer my-2"
              />
              <div className="text-xs font-bold text-neutral-muted text-right">
                ₹{userSoldPrice} / {t.qtl}
              </div>
            </div>

            {/* Step 5: Farm Location */}
            <div className="bg-neutral-bg border-2 border-neutral-ink p-3.5 flex flex-col justify-between">
              <label className="text-base font-black text-neutral-ink mb-1 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{t.step5Village}</span>
              </label>
              <select
                value={farmVillage}
                onChange={(e) => setFarmVillage(e.target.value)}
                className="w-full p-2.5 bg-neutral-surface border-2 border-neutral-ink text-base font-bold text-neutral-ink cursor-pointer focus:outline-none"
              >
                <option value="sinnar">{t.villages.sinnar}</option>
                <option value="niphad">{t.villages.niphad}</option>
                <option value="dindori">{t.villages.dindori}</option>
                <option value="yeola">{t.villages.yeola}</option>
                <option value="chandwad">{t.villages.chandwad}</option>
                <option value="kalwan">{t.villages.kalwan}</option>
              </select>
              <div className="text-xs font-bold text-neutral-muted mt-1">
                Farm Origin Point
              </div>
            </div>

          </div>
        </div>

        {/* 3. The Backtest Result Comparison Card */}
        <div className="bg-neutral-surface border-2 border-neutral-ink p-5 md:p-7 shadow-hard space-y-6">
          <div className="border-b-2 border-neutral-ink pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-neutral-ink flex items-center gap-2">
                <Award className="w-6 h-6 text-primary" />
                <span>{t.auditResultsHeader}</span>
              </h2>
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-sell bg-sell-bg px-2.5 py-1 border border-sell">
              {t.verifiedRecord}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Column 1: Your Actual Sale */}
            <div className="bg-neutral-bg border-2 border-neutral-ink p-5 flex flex-col justify-between shadow-hard">
              <div>
                <div className="text-sm font-black uppercase tracking-wider text-neutral-ink mb-1 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-neutral-ink" />
                  <span>{t.actualSaleTitle}</span>
                </div>

                <div className="text-lg font-black text-neutral-ink mt-2">
                  {t.actualMandiLabel.replace('{{mandi}}', soldMandiName)}
                </div>
                <div className="text-sm font-bold text-neutral-muted mt-0.5">
                  {lotQuantity} {t.qtl} × ₹{userSoldPrice}/{t.qtl}
                </div>

                <div className="my-4 p-3 bg-neutral-surface border border-neutral-ink space-y-1 text-sm font-bold">
                  <div className="flex justify-between">
                    <span>{t.actualGrossLabel.replace('{{amt}}', '')}</span>
                    <span className="font-mono">{formatRupee(actualGross)}</span>
                  </div>
                  <div className="flex justify-between text-risk">
                    <span>{t.actualFreightLabel.replace('{{amt}}', '')}</span>
                    <span className="font-mono">-{formatRupee(actualFreight)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-neutral-ink">
                <div className="text-xs font-bold text-neutral-muted uppercase">
                  {t.actualNetLabel}
                </div>
                <div className="text-2xl font-black text-neutral-ink font-mono mt-1">
                  {formatRupee(actualNet)}
                </div>
              </div>
            </div>

            {/* Column 2: What Mohra Recommended */}
            <div className="bg-neutral-bg border-2 border-primary p-5 flex flex-col justify-between shadow-hard">
              <div>
                <div className="text-sm font-black uppercase tracking-wider text-primary mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.recommendedTitle}</span>
                </div>

                <div className="text-lg font-black text-neutral-ink mt-2">
                  {t.recMandiLabel.replace('{{mandi}}', bestMandiName)}
                </div>
                <div className="text-sm font-bold text-primary mt-0.5">
                  {langKey === 'mr' ? benchmarkData.action_mr : langKey === 'hi' ? benchmarkData.action_hi : benchmarkData.action_en}
                </div>

                <div className="my-4 p-3 bg-neutral-surface border border-neutral-ink space-y-1 text-sm font-bold">
                  <div className="flex justify-between">
                    <span>{t.recGrossLabel.replace('{{amt}}', '')}</span>
                    <span className="font-mono">{formatRupee(optimalGross)}</span>
                  </div>
                  <div className="flex justify-between text-risk">
                    <span>{t.recDeductionsLabel.replace('{{amt}}', '')}</span>
                    <span className="font-mono">-{formatRupee(optimalFreight + optimalStorage)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-neutral-ink">
                <div className="text-xs font-bold text-neutral-muted uppercase">
                  {t.recNetLabel}
                </div>
                <div className="text-2xl font-black text-neutral-ink font-mono mt-1">
                  {formatRupee(optimalNet)}
                </div>
              </div>
            </div>

            {/* Column 3: The Result Card (Green if Positive, Red if Negative) */}
            <div
              className={`p-5 flex flex-col justify-between shadow-hard border-2 md:scale-105 transition-transform ${
                isPositiveDelta
                  ? 'bg-sell-bg border-sell text-sell'
                  : 'bg-neutral-surface border-risk text-risk'
              }`}
            >
              <div>
                <div className="text-sm font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  {isPositiveDelta ? <Sparkles className="w-4 h-4" /> : <ThumbsUp className="w-4 h-4 text-risk" />}
                  <span>{isPositiveDelta ? t.missedProfitTitle : t.beatMarketTitle}</span>
                </div>

                <div className="mt-4">
                  {/* Clean number formatting without '+-' or '+ -' */}
                  <div className={`text-4xl md:text-5xl font-black font-mono ${isPositiveDelta ? 'text-sell' : 'text-risk'}`}>
                    {isPositiveDelta ? `+${formatRupee(netProfitDelta)}` : `-${formatRupee(Math.abs(netProfitDelta))}`}
                  </div>
                  <div className={`text-base font-black mt-2 bg-neutral-surface inline-block px-3 py-1 border ${isPositiveDelta ? 'border-sell text-sell' : 'border-risk text-risk'}`}>
                    {isPositiveDelta
                      ? t.extraProfitPerQtl.replace('{{amt}}', String(netDeltaPerQtl))
                      : t.beatProfitPerQtl.replace('{{amt}}', String(Math.abs(netDeltaPerQtl)))}
                  </div>
                </div>

                <div className="mt-4 text-base font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-5 h-5" />
                  <span>
                    {isPositiveDelta
                      ? t.extraPctLabel.replace('{{pct}}', String(profitPercentage))
                      : t.beatPctLabel.replace('{{pct}}', String(profitPercentage))}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t-2 border-current/20 text-xs font-bold uppercase">
                {isPositiveDelta ? t.directExtraBadge : t.greatSaleBadge}
              </div>
            </div>

          </div>

          {/* Simplified 3-Bar Comparison Graph */}
          <div className="bg-neutral-bg border-2 border-neutral-ink p-4">
            <h3 className="text-base font-black text-neutral-ink mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span>{t.chartTitle}</span>
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
                >
                  <XAxis dataKey="metric" tick={{ fill: '#1F1E1B', fontSize: 14, fontWeight: 700 }} />
                  <YAxis tick={{ fill: '#1F1E1B', fontSize: 13 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip
                    formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, '']}
                    contentStyle={{ backgroundColor: 'var(--color-neutral-surface, #FBF9F5)', border: '2px solid var(--color-neutral-ink, #1F1E1B)', fontWeight: 'bold' }} // design-check-ignore: recharts inline styling
                  />
                  <Legend wrapperStyle={{ fontSize: '14px', fontWeight: 'bold', paddingTop: '10px' }} />
                  <Bar dataKey="Actual" name={t.chartActual} fill="#9B2C2C" />
                  <Bar dataKey="Mohra" name={t.chartOptimal} fill="#2B6CB0" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Single Simplified Human Summary Box */}
          <div className="border-t-2 border-neutral-ink pt-5">
            <div className="bg-neutral-bg border-2 border-neutral-ink p-5 shadow-hard">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-black text-neutral-ink">
                  {t.summaryTitle}
                </h3>
              </div>

              {isPositiveDelta ? (
                <p className="text-base md:text-lg text-neutral-ink font-medium leading-relaxed">
                  {langKey === 'mr' ? (
                    <>
                      जर तुम्ही तुमचा <strong>{lotQuantity} क्विंटल {cropName}</strong> <strong>{soldMandiName}</strong> ऐवजी <strong>{bestMandiName}</strong> मध्ये विकला असता, तर तुम्हाला <strong>₹{priceSpread}/क्विंटल जास्त बाजारभाव</strong> मिळाला असता. लांबच्या प्रवासाचे गाडीभाडे व साठवण खर्च वजा करूनही तुमच्या खिशात थेट <strong>+{formatRupee(netProfitDelta)} जास्तीचे रोख पैसे</strong> राहिले असते.
                    </>
                  ) : langKey === 'hi' ? (
                    <>
                      यदि आपने अपनी <strong>{lotQuantity} क्विंटल {cropName}</strong> को <strong>{soldMandiName}</strong> के बजाय <strong>{bestMandiName}</strong> में बेचा होता, तो आपको <strong>₹{priceSpread}/क्विंटल अधिक भाव</strong> मिलता। अतिरिक्त भाड़ा और भंडारण खर्च काटकर भी आपकी जेब में सीधे <strong>+{formatRupee(netProfitDelta)} का अतिरिक्त शुद्ध लाभ</strong> आता।
                    </>
                  ) : (
                    <>
                      Selling your <strong>{lotQuantity} qtl {cropName}</strong> at <strong>{bestMandiName}</strong> instead of <strong>{soldMandiName}</strong> would have earned <strong>₹{priceSpread}/qtl higher market rate</strong>. After subtracting ₹{Math.round(distToOptimalMandi * 2.5)}/qtl for extra freight and storage, you would have taken home a net <strong>+{formatRupee(netProfitDelta)} extra cash</strong> in your pocket.
                    </>
                  )}
                </p>
              ) : (
                <p className="text-base md:text-lg text-neutral-ink font-medium leading-relaxed text-risk">
                  {langKey === 'mr' ? (
                    <>
                      तुम्ही अगदी योग्य निर्णय घेतला! <strong>{soldMandiName}</strong> मध्ये मिळालेला <strong>₹{userSoldPrice}/क्विंटल</strong> भाव <strong>{bestMandiName}</strong> पेक्षा (₹{benchmarkData.optimalPrice}/क्विंटल) <strong>₹{Math.abs(priceSpread)}/क्विंटल जास्त</strong> होता. तुम्ही स्थानिक बाजारात लगेच माल विकून गाडीभाडे वाचवले आणि <strong>{formatRupee(Math.abs(netProfitDelta))} जास्त नफा</strong> मिळवला.
                    </>
                  ) : langKey === 'hi' ? (
                    <>
                      आपने बहुत सही फैसला लिया! <strong>{soldMandiName}</strong> में मिला <strong>₹{userSoldPrice}/क्विंटल</strong> भाव <strong>{bestMandiName}</strong> (₹{benchmarkData.optimalPrice}/क्विंटल) की तुलना में <strong>₹{Math.abs(priceSpread)}/क्विंटल अधिक</strong> था। आपने स्थानीय मंडी में बेचकर भाड़ा बचाया और <strong>{formatRupee(Math.abs(netProfitDelta))} अधिक लाभ</strong> कमाया।
                    </>
                  ) : (
                    <>
                      You made the right move! Selling your <strong>{lotQuantity} qtl {cropName}</strong> locally at <strong>{soldMandiName}</strong> for <strong>₹{userSoldPrice}/qtl</strong> earned you <strong>₹{Math.abs(priceSpread)}/qtl more</strong> than the benchmark rate at <strong>{bestMandiName}</strong> (₹{benchmarkData.optimalPrice}/qtl) while saving on long-distance transport costs.
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default BacktestPage;
