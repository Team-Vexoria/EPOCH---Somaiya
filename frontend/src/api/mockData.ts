import { MANDIS } from '../config/mandis';
import { VILLAGES } from '../config/villages';
import { CROPS } from '../config/crops';
import type {
  ChatRequest,
  ChatResponse,
  Recommendation,
  ForecastPoint,
  MandiNetComparison,
  HeatmapResponse,
  HeatmapItem,
  FpoPlanRequest,
  FpoPlanResponse,
  BacktestResponse,
} from './types';

// Haversine distance in km between two lat/lng points
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1.25); // 1.25 factor for actual road distance
}

// Freight cost calculation (pickup / tempo rate per km per quintal)
export function calculateTransportCost(distanceKm: number, isBulk = false): number {
  if (isBulk) {
    // 10-wheeler bulk rate (100 qtl load): ₹36/km / 100 qtl + ₹15 handling
    return Math.round(distanceKm * 0.36 + 15);
  }
  // Individual farmer pickup tempo (20 qtl load): ₹18/km / 20 qtl + ₹25 handling
  return Math.round(distanceKm * 0.9 + 25);
}

// Spoilage loss in ₹ per quintal based on holding days
export function calculateSpoilageLoss(crop: string, basePrice: number, days: number): number {
  if (days <= 0) return 0;
  if (crop === 'tomato') {
    // Highly perishable: 5% day 1-2, 10% day 3, 25% day 4
    const lossPct = Math.min(days * 0.07, 0.45);
    return Math.round(basePrice * lossPct);
  }
  if (crop === 'onion') {
    // Chawl holding: 1.5% loss per week
    const lossPct = (days / 7) * 0.015;
    return Math.round(basePrice * lossPct);
  }
  // Soybean: almost 0 loss
  return Math.round(basePrice * 0.001 * days);
}

export function generateMockRecommendation(
  cropId = 'onion',
  quantity = 30,
  villageId = 'niphad_rural'
): Recommendation {
  const crop = CROPS[cropId] || CROPS.onion;
  const village = VILLAGES.find((v) => v.id === villageId) || VILLAGES[0];

  const basePrice = crop.defaultPricePerQuintal;

  // Shelf-life decision logic
  let decision: 'SELL_NOW' | 'HOLD' = 'HOLD';
  let holdDays = 10;
  let expectedGain = 185;
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
  let reasonEn = 'Rising festive and export demand in Lasalgaon with lower expected arrivals next week.';
  let reasonMr = 'लासलगाव बाजारात निर्यात मागणी आणि पुढील आठवड्यात कमी आवक असल्याने भाव वाढण्याची शक्यता.';
  let reasonHi = 'लासलगांव में निर्यात मांग और कम आवक के कारण अगले हफ्ते कीमतों में तेजी संभव.';

  if (cropId === 'tomato') {
    decision = 'SELL_NOW';
    holdDays = 1;
    expectedGain = 140;
    confidence = 'HIGH';
    reasonEn = 'Tomatoes are highly perishable. Immediate sell at Pimpalgaon avoids rapid crate spoilage.';
    reasonMr = 'टोमॅटो नाशवंत असल्याने जास्त दिवस ठेवू नका. पिंपळगाव येथे लगेच विकल्यास क्रेट खराब होणार नाही.';
    reasonHi = 'टमाटर जल्दी खराब होता है। पिंपलगांव में तुरंत बेचने से सड़न से बचा जा सकता है.';
  } else if (cropId === 'soybean') {
    decision = 'HOLD';
    holdDays = 14;
    expectedGain = 260;
    confidence = 'MEDIUM';
    reasonEn = 'Crushing plant procurement in Malegaon will peak after Diwali. Safe to store in dry godown.';
    reasonMr = 'मालेगाव आणि मनमाड येथील ऑइल मिल खरेदी वाढणार आहे. कोरड्या शेडमध्ये ठेवल्यास धोका नाही.';
    reasonHi = 'मालेगांव में तेल मिलों की मांग बढ़ने वाली है। सूखे गोदाम में सुरक्षित रखें.';
  }

  // Calculate comparisons for all mandis
  const comparisons: MandiNetComparison[] = MANDIS.map((m) => {
    const dist = calculateDistanceKm(village.lat, village.lng, m.lat, m.lng);
    const transport = calculateTransportCost(dist);
    const spoilage = calculateSpoilageLoss(cropId, basePrice, decision === 'HOLD' ? holdDays : 0);

    // Mandi specialty price variation
    let mandiBonus = 0;
    if (cropId === 'onion' && (m.id === 'lasalgaon' || m.id === 'pimpalgaon')) mandiBonus = 220;
    if (cropId === 'tomato' && (m.id === 'pimpalgaon' || m.id === 'dindori')) mandiBonus = 180;
    if (cropId === 'soybean' && (m.id === 'malegaon' || m.id === 'manmad')) mandiBonus = 210;

    const futureBonus = decision === 'HOLD' ? expectedGain : 0;
    const forecast = basePrice + mandiBonus + futureBonus - Math.round(dist * 0.3);
    const netPerQtl = forecast - transport - spoilage;

    return {
      id: m.id,
      name: m.name,
      name_mr: m.name_mr,
      name_hi: m.name_hi,
      distanceKm: dist,
      forecastPrice: forecast,
      transportCost: transport,
      spoilageLoss: spoilage,
      netPerQuintal: netPerQtl,
      totalNet: netPerQtl * quantity,
      isBest: false,
    };
  });

  // Sort descending by net
  comparisons.sort((a, b) => b.netPerQuintal - a.netPerQuintal);
  if (comparisons.length > 0) {
    comparisons[0].isBest = true;
  }

  const bestMandi = comparisons[0];
  const nearestMandi = [...comparisons].sort((a, b) => a.distanceKm - b.distanceKm)[0];
  const netGainVsNearest = bestMandi.netPerQuintal - nearestMandi.netPerQuintal;

  // 3-week forecast curve with honest uncertainty band
  const today = new Date();
  const forecast: ForecastPoint[] = [0, 3, 7, 10, 14, 21].map((dayOffset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    const dayName = dayOffset === 0 ? 'Today' : `+${dayOffset}d`;

    // Price trajectory
    const trend = decision === 'HOLD' ? dayOffset * 22 : -dayOffset * 15;
    const mid = basePrice + 120 + trend;
    // Uncertainty widens over time (honest uncertainty)
    const spread = 40 + dayOffset * 18;

    return {
      date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      dayLabel: dayName,
      low: Math.round(mid - spread),
      mid: Math.round(mid),
      high: Math.round(mid + spread),
    };
  });

  return {
    decision,
    holdDays: decision === 'HOLD' ? holdDays : undefined,
    bestMandi: bestMandi.name,
    bestMandi_mr: bestMandi.name_mr,
    bestMandi_hi: bestMandi.name_hi,
    expectedGainPerQuintal: Math.max(netGainVsNearest, expectedGain),
    totalGain: Math.max(netGainVsNearest, expectedGain) * quantity,
    confidence,
    confidenceReason: reasonEn,
    confidenceReason_mr: reasonMr,
    confidenceReason_hi: reasonHi,
    forecast,
    mandis: comparisons.slice(0, 7), // top 7 mandis
  };
}

export function generateMockChatResponse(req: ChatRequest): ChatResponse {
  const lang = req.language || 'mr';
  const cropId = req.crop || 'onion';
  const qty = req.quantity || 30;
  const village = req.village || 'niphad_rural';

  const recommendation = generateMockRecommendation(cropId, qty, village);

  let text = '';
  if (lang === 'mr') {
    text =
      recommendation.decision === 'HOLD'
        ? `नमस्कार शेतकरी बंधू! तुमच्या ${CROPS[cropId]?.name_mr || 'मालासाठी'} आमचा मुख्य सल्ला असा आहे: माल ${recommendation.holdDays} दिवस साठवा आणि ${recommendation.bestMandi_mr} येथे विका. स्थानिक बाजारापेक्षा तुम्हाला प्रति क्विंटल ₹${recommendation.expectedGainPerQuintal} जास्त निव्वळ नफा (वाहतूक व घट वजा करून) मिळेल.`
        : `नमस्कार शेतकरी बंधू! ${CROPS[cropId]?.name_mr || 'टोमॅटो'} नाशवंत असल्याने जास्त दिवस ठेवू नका. आजच ${recommendation.bestMandi_mr} येथे माल न्या. क्रेट खराब न होता तुम्हाला प्रति क्विंटल ₹${recommendation.mandis[0].netPerQuintal} थेट हातात मिळतील.`;
  } else if (lang === 'hi') {
    text =
      recommendation.decision === 'HOLD'
        ? `नमस्ते किसान भाई! आपके ${CROPS[cropId]?.name_hi || 'फसल'} के लिए सलाह है: माल को ${recommendation.holdDays} दिन रोकें और ${recommendation.bestMandi_hi} में बेचें। पास की मंडी की तुलना में आपको प्रति क्विंटल ₹${recommendation.expectedGainPerQuintal} अधिक शुद्ध लाभ मिलेगा.`
        : `नमस्ते किसान भाई! यह फसल ज्यादा दिन नहीं टिकेगी। इसे तुरंत ${recommendation.bestMandi_hi} ले जाएं और ₹${recommendation.mandis[0].netPerQuintal}/क्विंटल का भाव पाएं।`;
  } else {
    text =
      recommendation.decision === 'HOLD'
        ? `Hello Farmer! Based on current arrivals and transport economics, our advice is: HOLD for ${recommendation.holdDays} days and sell at ${recommendation.bestMandi}. You are projected to gain an extra ₹${recommendation.expectedGainPerQuintal}/quintal in hand after transport and weight loss.`
        : `Hello Farmer! Given the perishability and weather forecasts, our advice is: SELL TODAY at ${recommendation.bestMandi}. Immediate dispatch avoids crate spoilage and locks in ₹${recommendation.mandis[0].netPerQuintal}/quintal net return.`;
  }

  const sources = [
    {
      title: 'Lasalgaon APMC Daily Modal Rate & Arrival Trend',
      snippet: 'Arrivals fell 14% week-on-week while buyer inquiries from Southern states increased by 18%.',
      url: 'https://agmarknet.gov.in',
    },
    {
      title: 'Maharashtra State Agri Marketing Board (MSAMB) Storage Loss Data',
      snippet: 'Standard onion chawl weight shrinkage rate calibrated at 1.4% per week under dry aerated conditions.',
    },
    {
      title: 'Nashik District Rural Transport Freight Survey',
      snippet: 'Pickup tempo rates calibrated at ₹18/km for sub-30 quintal loads across Niphad-Yeola-Chandwad corridors.',
    },
  ];

  return {
    text,
    recommendation,
    sources,
  };
}

export function generateMockHeatmap(cropId = 'onion', horizonDays = 0, villageId = 'niphad_rural'): HeatmapResponse {
  const crop = CROPS[cropId] || CROPS.onion;
  const village = VILLAGES.find((v) => v.id === villageId) || VILLAGES[0];
  const basePrice = crop.defaultPricePerQuintal;

  const items: HeatmapItem[] = MANDIS.map((m) => {
    const dist = calculateDistanceKm(village.lat, village.lng, m.lat, m.lng);
    const transport = calculateTransportCost(dist);
    const spoilage = calculateSpoilageLoss(cropId, basePrice, horizonDays);

    let mandiBonus = 0;
    if (cropId === 'onion' && m.id === 'lasalgaon') mandiBonus = 240;
    if (cropId === 'onion' && m.id === 'pimpalgaon') mandiBonus = 200;
    if (cropId === 'tomato' && m.id === 'pimpalgaon') mandiBonus = 210;
    if (cropId === 'soybean' && m.id === 'malegaon') mandiBonus = 190;

    const horizonTrend = horizonDays * 16;
    const forecast = basePrice + mandiBonus + horizonTrend;
    const netReturn = forecast - transport - spoilage;

    // 7-day sparkline
    const sparkline = [
      forecast - 80,
      forecast - 40,
      forecast - 20,
      forecast,
      forecast + 25,
      forecast + 50,
      forecast + 75,
    ];

    return {
      mandiId: m.id,
      name: m.name,
      name_mr: m.name_mr,
      name_hi: m.name_hi,
      lat: m.lat,
      lng: m.lng,
      distanceKm: dist,
      forecastPrice: forecast,
      transportCost: transport,
      spoilageLoss: spoilage,
      netReturn,
      arrivalsTodayQuintals: m.baseArrivalsQuintalPerDay,
      confidence: horizonDays > 7 ? 'LOW' : horizonDays > 3 ? 'MEDIUM' : 'HIGH',
      sparkline,
    };
  });

  items.sort((a, b) => b.netReturn - a.netReturn);

  return {
    crop: crop.name,
    horizonDays,
    village: village.name,
    items,
    topMandiId: items[0]?.mandiId || 'lasalgaon',
  };
}

export function generateMockFpoPlan(req: FpoPlanRequest): FpoPlanResponse {
  const crop = CROPS[req.crop] || CROPS.onion;
  const village = VILLAGES.find((v) => v.id === req.village) || VILLAGES[0];
  const qty = req.quantity || 200; // in quintals
  const basePrice = crop.defaultPricePerQuintal;

  // Split allocation across top 3 complimentary mandis to prevent market glut
  const allocations = [
    {
      mandiId: 'lasalgaon',
      mandiName: 'Lasalgaon APMC',
      mandiName_mr: 'लासलगाव बाजार समिती',
      percentage: 45,
      quantityQuintals: Math.round(qty * 0.45),
      expectedPrice: basePrice + 210,
      estimatedFreight: calculateTransportCost(32, true),
      netRevenue: 0,
      trucksNeeded: Math.ceil((qty * 0.45) / 100),
      dispatchDate: 'Tomorrow 04:00 AM',
      capacityWarning: 'Heavy arrivals expected after 10 AM',
    },
    {
      mandiId: 'pimpalgaon',
      mandiName: 'Pimpalgaon Baswant APMC',
      mandiName_mr: 'पिंपळगाव बसवंत बाजार समिती',
      percentage: 35,
      quantityQuintals: Math.round(qty * 0.35),
      expectedPrice: basePrice + 175,
      estimatedFreight: calculateTransportCost(28, true),
      netRevenue: 0,
      trucksNeeded: Math.ceil((qty * 0.35) / 100),
      dispatchDate: 'Day 3 Morning',
    },
    {
      mandiId: 'yeola',
      mandiName: 'Yeola APMC',
      mandiName_mr: 'येवला बाजार समिती',
      percentage: 20,
      quantityQuintals: Math.round(qty * 0.2),
      expectedPrice: basePrice + 130,
      estimatedFreight: calculateTransportCost(45, true),
      netRevenue: 0,
      trucksNeeded: Math.ceil((qty * 0.2) / 100),
      dispatchDate: 'Day 5 Morning',
      capacityWarning: 'Steady retail trader buying',
    },
  ];

  let totalRevenue = 0;
  allocations.forEach((a) => {
    const netPerQtl = a.expectedPrice - a.estimatedFreight;
    a.netRevenue = netPerQtl * a.quantityQuintals;
    totalRevenue += a.netRevenue;
  });

  const baselineNearestNet = basePrice - 45; // if dumped immediately at nearest local mandi
  const baselineRevenue = baselineNearestNet * qty;
  const extraRevenue = totalRevenue - baselineRevenue;

  return {
    totalQuantity: qty,
    totalRevenue,
    baselineRevenue,
    extraRevenueEarned: extraRevenue,
    percentageGain: Math.round((extraRevenue / baselineRevenue) * 1000) / 10,
    bestMandi: 'Lasalgaon APMC',
    riskLevel: 'LOW',
    allocations,
  };
}

export function generateMockBacktest(cropId = 'onion'): BacktestResponse {
  const crop = CROPS[cropId] || CROPS.onion;

  const sampleDecisions = [
    {
      date: '12 Sep 2026',
      crop: crop.name,
      adviceGiven: 'Hold 7 days, sell at Lasalgaon',
      optimalMandi: 'Lasalgaon',
      nearestMandi: 'Niphad Rural',
      actualPriceRealized: 2480,
      baselinePrice: 2190,
      netRupeeGainPerQuintal: 210,
      wasOptimal: true,
    },
    {
      date: '28 Aug 2026',
      crop: crop.name,
      adviceGiven: 'Sell immediately at Pimpalgaon',
      optimalMandi: 'Pimpalgaon',
      nearestMandi: 'Dindori',
      actualPriceRealized: 2240,
      baselinePrice: 2060,
      netRupeeGainPerQuintal: 145,
      wasOptimal: true,
    },
    {
      date: '15 Aug 2026',
      crop: crop.name,
      adviceGiven: 'Hold 12 days, sell at Lasalgaon',
      optimalMandi: 'Lasalgaon',
      nearestMandi: 'Chandwad',
      actualPriceRealized: 2390,
      baselinePrice: 2080,
      netRupeeGainPerQuintal: 235,
      wasOptimal: true,
    },
    {
      date: '02 Aug 2026',
      crop: crop.name,
      adviceGiven: 'Sell immediately due to rainfall risk',
      optimalMandi: 'Nashik Panchavati',
      nearestMandi: 'Sinnar',
      actualPriceRealized: 2120,
      baselinePrice: 1980,
      netRupeeGainPerQuintal: 110,
      wasOptimal: true,
    },
    {
      date: '18 Jul 2026',
      crop: crop.name,
      adviceGiven: 'Hold 8 days, sell at Yeola',
      optimalMandi: 'Yeola',
      nearestMandi: 'Manmad',
      actualPriceRealized: 2280,
      baselinePrice: 2110,
      netRupeeGainPerQuintal: 130,
      wasOptimal: true,
    },
  ];

  // 12-week timeline comparison
  const cumulativeTimeline = [
    { date: 'Wk 1', sellSmartNet: 2180, baselineNet: 2020 },
    { date: 'Wk 2', sellSmartNet: 2240, baselineNet: 2060 },
    { date: 'Wk 3', sellSmartNet: 2350, baselineNet: 2120 },
    { date: 'Wk 4', sellSmartNet: 2410, baselineNet: 2170 },
    { date: 'Wk 5', sellSmartNet: 2390, baselineNet: 2180 },
    { date: 'Wk 6', sellSmartNet: 2480, baselineNet: 2210 },
    { date: 'Wk 7', sellSmartNet: 2520, baselineNet: 2260 },
    { date: 'Wk 8', sellSmartNet: 2490, baselineNet: 2240 },
  ];

  return {
    crop: crop.name,
    season: 'Kharif & Late Kharif 2026 (Nashik District)',
    totalDecisions: 184,
    averageGainPerQuintal: 178,
    totalPotentialGainedPerFarmer100Qtl: 17800,
    accuracyRate: 88.5,
    cumulativeTimeline,
    sampleDecisions,
  };
}
