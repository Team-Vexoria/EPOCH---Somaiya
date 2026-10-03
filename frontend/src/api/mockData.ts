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
  return Math.round(R * c * 1.28); // 1.28 factor for rural Nashik road winding tortuosity
}

export interface TransportCostDetails {
  distanceKm: number;
  fixedHandlingPerQtl: number;
  haulageRatePerKmQtl: number;
  haulageSubtotal: number;
  terrainSurcharge: number;
  totalPerQtl: number;
  explanation: string;
}

/**
 * Logical Freight Cost Calculation:
 * - Base APMC Hamali, weighing & gate entry cost: ₹15/quintal
 * - Tiered haulage rate: <25km: ₹1.15/km, 25-60km: ₹0.88/km, >60km: ₹0.78/km
 * - Western Ghats incline terrain surcharge for Igatpuri/Kalwan: +12%
 */
export function calculateDetailedTransportCost(
  distanceKm: number,
  mandiId = '',
  isBulk = false
): TransportCostDetails {
  if (distanceKm <= 0) {
    return {
      distanceKm: 0,
      fixedHandlingPerQtl: 0,
      haulageRatePerKmQtl: 0,
      haulageSubtotal: 0,
      terrainSurcharge: 0,
      totalPerQtl: 0,
      explanation: '0 km (Local village harvest collection)',
    };
  }

  const fixedHandlingPerQtl = isBulk ? 12 : 15;

  let haulageRatePerKmQtl = 0.88;
  if (isBulk) {
    haulageRatePerKmQtl = 0.35; // 10-ton 10-wheeler bulk economy
  } else if (distanceKm < 25) {
    haulageRatePerKmQtl = 1.15; // Local village approach roads
  } else if (distanceKm <= 60) {
    haulageRatePerKmQtl = 0.88; // State highway rate
  } else {
    haulageRatePerKmQtl = 0.78; // National highway long-distance tier
  }

  const haulageSubtotal = Math.round(distanceKm * haulageRatePerKmQtl);

  // Ghat & hilly terrain surcharge for Igatpuri (Thal Ghat) or Kalwan (Baglan hills)
  let terrainSurcharge = 0;
  const isGhat = mandiId === 'igatpuri' || mandiId === 'kalwan';
  if (isGhat) {
    terrainSurcharge = Math.round(haulageSubtotal * 0.12);
  }

  const totalPerQtl = fixedHandlingPerQtl + haulageSubtotal + terrainSurcharge;
  const explanation = `${distanceKm} km @ ₹${haulageRatePerKmQtl.toFixed(2)}/km + ₹${fixedHandlingPerQtl} Hamali${
    terrainSurcharge > 0 ? ` + ₹${terrainSurcharge} Ghat Surcharge` : ''
  }`;

  return {
    distanceKm,
    fixedHandlingPerQtl,
    haulageRatePerKmQtl,
    haulageSubtotal,
    terrainSurcharge,
    totalPerQtl,
    explanation,
  };
}

export function calculateTransportCost(distanceKm: number, isBulk = false, mandiId = ''): number {
  return calculateDetailedTransportCost(distanceKm, mandiId, isBulk).totalPerQtl;
}

export interface SpoilageDetails {
  days: number;
  lossPct: number;
  lossPerQtl: number;
  explanation: string;
}

/**
 * Logical Spoilage and Storage Shrinkage Calculation:
 * - Onion: Aerated chawl natural moisture loss of 0.20%/day (1.4%/week)
 * - Tomato: Highly perishable crate decay (3.5%/day early, accelerating to 24% at 1w, 48% at 2w, 72% at 3w)
 * - Soybean: Dry storage in gunny bags (0.01%/week)
 */
export function calculateDetailedSpoilageLoss(
  cropId: string,
  basePrice: number,
  days: number
): SpoilageDetails {
  if (days <= 0) {
    return {
      days: 0,
      lossPct: 0,
      lossPerQtl: 0,
      explanation: '0 days (Same-day harvest dispatch, 0% spoilage)',
    };
  }

  if (cropId === 'tomato') {
    const lossPct = Math.min(days * 0.035 + (days > 3 ? (days - 3) * 0.015 : 0), 0.75);
    const lossPerQtl = Math.round(basePrice * lossPct);
    return {
      days,
      lossPct: Number((lossPct * 100).toFixed(1)),
      lossPerQtl,
      explanation: `${days} days non-refrigerated crate holding (${(lossPct * 100).toFixed(1)}% rot & decay)`,
    };
  }

  if (cropId === 'onion') {
    const lossPct = days * 0.0020;
    const lossPerQtl = Math.round(basePrice * lossPct);
    return {
      days,
      lossPct: Number((lossPct * 100).toFixed(1)),
      lossPerQtl,
      explanation: `${days} days aerated chawl storage (${(lossPct * 100).toFixed(1)}% natural weight shrinkage)`,
    };
  }

  const lossPct = (days / 7) * 0.0005;
  const lossPerQtl = Math.round(basePrice * lossPct);
  return {
    days,
    lossPct: Number((lossPct * 100).toFixed(2)),
    lossPerQtl,
    explanation: `${days} days dry gunny bag storage (${(lossPct * 100).toFixed(2)}% loss)`,
  };
}

export function calculateSpoilageLoss(crop: string, basePrice: number, days: number): number {
  return calculateDetailedSpoilageLoss(crop, basePrice, days).lossPerQtl;
}

export interface MandiPriceDetails {
  baseBenchmark: number;
  liquidityPremium: number;
  specialtyBonus: number;
  horizonShift: number;
  arrivalAdjustment: number;
  forecastPrice: number;
  explanation: string;
}

/**
 * Logical Mandi Pricing Model:
 * 1. Base Commodity Benchmark (Agmarknet Nashik district average)
 * 2. Mandi Market Scale & Liquidity Premium (Lasalgaon for Onion, Pimpalgaon for Tomato, Malegaon for Soybean)
 * 3. Specialty Crop match bonus (+₹40)
 * 4. Crop biology & time horizon trajectory (Onion appreciates/plateaus, Tomato heavily discounts, Soybean rises)
 * 5. Daily arrival volume dampening
 */
export function calculateLogicalMandiPrice(
  cropId: string,
  mandiId: string,
  horizonDays = 0
): MandiPriceDetails {
  const crop = CROPS[cropId] || CROPS.onion;
  const baseBenchmark = crop.defaultPricePerQuintal;

  const scalePremiums: Record<string, Record<string, number>> = {
    lasalgaon: { onion: 210, tomato: 40, soybean: 60 },
    pimpalgaon: { onion: 160, tomato: 220, soybean: 50 },
    nashik: { onion: 110, tomato: 140, soybean: 40 },
    yeola: { onion: 120, tomato: 20, soybean: 110 },
    manmad: { onion: 70, tomato: 10, soybean: 130 },
    sinnar: { onion: 80, tomato: 50, soybean: 80 },
    dindori: { onion: 50, tomato: 150, soybean: 30 },
    niphad: { onion: 130, tomato: 70, soybean: 50 },
    chandwad: { onion: 90, tomato: 30, soybean: 70 },
    malegaon: { onion: 60, tomato: 20, soybean: 190 },
    satana: { onion: 95, tomato: 40, soybean: 80 },
    nandgaon: { onion: 40, tomato: 10, soybean: 70 },
    kalwan: { onion: 65, tomato: 50, soybean: 40 },
    igatpuri: { onion: 30, tomato: 30, soybean: 20 },
  };

  const mandiScale = scalePremiums[mandiId] || { onion: 50, tomato: 30, soybean: 50 };
  const liquidityPremium = mandiScale[cropId] || 50;

  const mandiConfig = MANDIS.find((m) => m.id === mandiId);
  let specialtyBonus = 0;
  if (mandiConfig && (mandiConfig.specialtyCrop === cropId || mandiConfig.specialtyCrop === 'all')) {
    specialtyBonus = 40;
  }

  let horizonShift = 0;
  if (cropId === 'onion') {
    if (horizonDays <= 7) horizonShift = horizonDays * 16;
    else if (horizonDays <= 14) horizonShift = 7 * 16 + (horizonDays - 7) * 12;
    else horizonShift = 7 * 16 + 7 * 12 + (horizonDays - 14) * 4;
  } else if (cropId === 'tomato') {
    horizonShift = -horizonDays * 22;
  } else if (cropId === 'soybean') {
    horizonShift = horizonDays * 10;
  }

  const arrivals = mandiConfig?.baseArrivalsQuintalPerDay || 15000;
  let arrivalAdjustment = 0;
  if (arrivals >= 35000) {
    arrivalAdjustment = -15;
  } else if (arrivals <= 10000) {
    arrivalAdjustment = -25;
  }

  const forecastPrice = Math.max(
    500,
    baseBenchmark + liquidityPremium + specialtyBonus + horizonShift + arrivalAdjustment
  );

  const explanation = `₹${baseBenchmark} Base + ₹${liquidityPremium} Liquidity${
    specialtyBonus > 0 ? ` + ₹${specialtyBonus} Specialty` : ''
  }${horizonShift >= 0 ? ` + ₹${horizonShift}` : ` - ₹${Math.abs(horizonShift)}`} Horizon Shift`;

  return {
    baseBenchmark,
    liquidityPremium,
    specialtyBonus,
    horizonShift,
    arrivalAdjustment,
    forecastPrice,
    explanation,
  };
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

  // Calculate comparisons for all mandis using logical pricing and transport models
  const comparisons: MandiNetComparison[] = MANDIS.map((m) => {
    const dist = calculateDistanceKm(village.lat, village.lng, m.lat, m.lng);
    const transportDetails = calculateDetailedTransportCost(dist, m.id, false);
    const days = decision === 'HOLD' ? holdDays : 0;
    const priceDetails = calculateLogicalMandiPrice(cropId, m.id, days);
    const spoilageDetails = calculateDetailedSpoilageLoss(cropId, priceDetails.forecastPrice, days);

    const forecast = priceDetails.forecastPrice;
    const transport = transportDetails.totalPerQtl;
    const spoilage = spoilageDetails.lossPerQtl;
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
      transportExplanation: transportDetails.explanation,
      priceExplanation: priceDetails.explanation,
      spoilageExplanation: spoilageDetails.explanation,
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
    const transportDetails = calculateDetailedTransportCost(dist, m.id, false);
    const priceDetails = calculateLogicalMandiPrice(cropId, m.id, horizonDays);
    const spoilageDetails = calculateDetailedSpoilageLoss(cropId, priceDetails.forecastPrice, horizonDays);

    const forecast = priceDetails.forecastPrice;
    const transport = transportDetails.totalPerQtl;
    const spoilage = spoilageDetails.lossPerQtl;
    const netReturn = forecast - transport - spoilage;

    // 7-day sparkline reflecting real trend
    const dailyStep = cropId === 'tomato' ? -22 : cropId === 'onion' ? 16 : 10;
    const sparkline = [
      forecast - dailyStep * 3,
      forecast - dailyStep * 2,
      forecast - dailyStep,
      forecast,
      forecast + dailyStep,
      forecast + dailyStep * 2,
      forecast + dailyStep * 3,
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
      transportExplanation: transportDetails.explanation,
      priceExplanation: priceDetails.explanation,
      spoilageExplanation: spoilageDetails.explanation,
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

  // Empirical APMC auction elasticity constant
  const GLUT_PRICE_DEPRESSION_PER_QTL = 140;

  // Candidate APMCs with canonical capacities matching config/mandis.ts
  const candidatePool = [
    {
      mandiId: 'lasalgaon',
      mandiName: 'Lasalgaon APMC',
      mandiName_mr: 'लासलगाव बाजार समिती',
      dailyArrivalsQuintals: 45000,
      safeCap: Math.floor(45000 * 0.025), // 1,125 qtl safe absorption
      priceBonus: 210,
      distanceKm: 32,
      warning: 'Heavy arrivals expected after 10 AM',
      dispatchSlot: 'Tomorrow 04:00 AM',
    },
    {
      mandiId: 'pimpalgaon',
      mandiName: 'Pimpalgaon Baswant APMC',
      mandiName_mr: 'पिंपळगाव बसवंत बाजार समिती',
      dailyArrivalsQuintals: 38000,
      safeCap: Math.floor(38000 * 0.025), // 950 qtl safe absorption
      priceBonus: 175,
      distanceKm: 28,
      warning: 'Strong wholesale buyer demand (38,000 qtl/day).',
      dispatchSlot: 'Day 3 Morning',
    },
    {
      mandiId: 'yeola',
      mandiName: 'Yeola APMC',
      mandiName_mr: 'येवला बाजार समिती',
      dailyArrivalsQuintals: 18000,
      safeCap: Math.floor(18000 * 0.025), // 450 qtl safe absorption
      priceBonus: 130,
      distanceKm: 45,
      warning: 'Steady retail trader buying',
      dispatchSlot: 'Day 5 Morning',
    },
    {
      mandiId: 'nashik',
      mandiName: 'Nashik (Panchavati) APMC',
      mandiName_mr: 'नाशिक (पंचवटी) बाजार समिती',
      dailyArrivalsQuintals: 25000,
      safeCap: Math.floor(25000 * 0.025), // 625 qtl safe absorption
      priceBonus: 110,
      distanceKm: 40,
      warning: 'Urban consumption demand',
      dispatchSlot: 'Day 7 Morning',
    },
  ];

  // Capacity-constrained allocation with spillover
  const allocMap: Record<string, number> = {};
  const targetPcts = [0.45, 0.35, 0.20];
  let remaining = qty;

  // Initial target allocation for top 3
  for (let i = 0; i < 3; i++) {
    const c = candidatePool[i];
    const targetQtl = Math.round(qty * targetPcts[i]);
    const assigned = Math.min(targetQtl, c.safeCap, remaining);
    allocMap[c.mandiId] = assigned;
    remaining -= assigned;
  }

  // Spillover if safe caps reached or lot is large
  if (remaining > 0) {
    for (const c of candidatePool) {
      const curr = allocMap[c.mandiId] || 0;
      const headroom = c.safeCap - curr;
      if (headroom > 0) {
        const add = Math.min(remaining, headroom);
        allocMap[c.mandiId] = curr + add;
        remaining -= add;
        if (remaining <= 0) break;
      }
    }
  }

  // If still remaining, distribute to top candidate
  if (remaining > 0) {
    allocMap[candidatePool[0].mandiId] = (allocMap[candidatePool[0].mandiId] || 0) + remaining;
    remaining = 0;
  }

  const allocations = candidatePool
    .filter((c) => (allocMap[c.mandiId] || 0) > 0)
    .map((c) => {
      const qtl = allocMap[c.mandiId];
      const share = Math.round((qtl / c.dailyArrivalsQuintals) * 1000) / 10;
      const status: 'SAFE' | 'MODERATE' | 'RISK' =
        share <= 2.5 ? 'SAFE' : share <= 5.0 ? 'MODERATE' : 'RISK';
      const expectedPrice = basePrice + c.priceBonus;
      const estimatedFreight = calculateTransportCost(c.distanceKm, true);

      return {
        mandiId: c.mandiId,
        mandiName: c.mandiName,
        mandiName_mr: c.mandiName_mr,
        percentage: Math.round((qtl / qty) * 100),
        quantityQuintals: qtl,
        dailyArrivalsQuintals: c.dailyArrivalsQuintals,
        intakeSharePct: share,
        absorptionStatus: status,
        absorptionLabel:
          status === 'SAFE'
            ? `Optimal Liquidity (${share}% market share)`
            : status === 'MODERATE'
            ? `Balanced Absorption (${share}% market share)`
            : `Glut Risk (${share}% daily share)`,
        absorptionLabel_mr:
          status === 'SAFE'
            ? `उत्तम तरलता (${share}% बाजार वाटा)`
            : status === 'MODERATE'
            ? `संतुलित खप (${share}% बाजार वाटा)`
            : `अतिरिक्त आवक धोका (${share}% वाटा)`,
        glutPricePenaltyAvoided: GLUT_PRICE_DEPRESSION_PER_QTL,
        expectedPrice,
        estimatedFreight,
        netRevenue: (expectedPrice - estimatedFreight) * qtl,
        trucksNeeded: Math.ceil(qtl / 100),
        dispatchDate: c.dispatchSlot,
        capacityWarning: c.warning,
      };
    });

  let totalRevenue = 0;
  allocations.forEach((a) => {
    totalRevenue += a.netRevenue;
  });

  const baselineNearestNet = basePrice - 45; // if dumped immediately at nearest local mandi
  const baselineRevenue = baselineNearestNet * qty;
  const extraRevenue = totalRevenue - baselineRevenue;

  const nearestCap = 16000;
  const singleDumpSharePct = Math.round((qty / nearestCap) * 1000) / 10;
  const totalGlutLossAvoided = qty * GLUT_PRICE_DEPRESSION_PER_QTL;
  const maxIntakeSharePct = allocations.length > 0 ? Math.max(...allocations.map((a) => a.intakeSharePct)) : 0;

  const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
    maxIntakeSharePct <= 2.5 ? 'LOW' : maxIntakeSharePct <= 5.0 ? 'MEDIUM' : 'HIGH';

  return {
    totalQuantity: qty,
    metricTonnes: Math.round(qty / 10),
    totalTrucks: Math.ceil(qty / 100),
    membersPooled: Math.ceil(qty / 20),
    bulkFreightSavings: qty * 25,
    hubId: village.id,
    hubName: `${village.name} Central Packhouse`,
    hubName_mr: `${village.name_mr || village.name} संकलन केंद्र`,
    registeredMembers: 350,
    taluka: village.taluka || 'Nashik',
    totalRevenue,
    baselineRevenue,
    extraRevenueEarned: extraRevenue,
    percentageGain: Math.round((extraRevenue / baselineRevenue) * 1000) / 10,
    bestMandi: allocations[0]?.mandiName || 'Lasalgaon APMC',
    riskLevel,
    allocations,
    totalGlutLossAvoided,
    singleDumpSharePct,
    singleDumpMandiName: `${village.name} Local APMC`,
    priceDepressionPerQtl: GLUT_PRICE_DEPRESSION_PER_QTL,
    maxIntakeSharePct,
    glutRiskExplanation: `Dumping ${qty} qtl into a single local mandi would capture ~${singleDumpSharePct}% of daily intake, triggering a ~₹${GLUT_PRICE_DEPRESSION_PER_QTL}/qtl auction price depression. Multi-mandi splitting caps daily share at ${maxIntakeSharePct}%, protecting ₹${totalGlutLossAvoided.toLocaleString('en-IN')} in farmer value.`,
    glutRiskExplanation_mr: `स्थानिक बाजार समितीत एकरकमी ${qty} क्विंटल ओतल्यास आवकेचा वाटा ~${singleDumpSharePct}% होईल, ज्यामुळे प्रति क्विंटल सुमारे ₹${GLUT_PRICE_DEPRESSION_PER_QTL} ची घसरण होईल. क्षमता-मर्यादित विभागणीमुळे वाटा कमाल ${maxIntakeSharePct}% राहून ₹${totalGlutLossAvoided.toLocaleString('en-IN')} चा तोटा टळतो.`,
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
    { date: 'Wk 1', MohraNet: 2180, baselineNet: 2020 },
    { date: 'Wk 2', MohraNet: 2240, baselineNet: 2060 },
    { date: 'Wk 3', MohraNet: 2350, baselineNet: 2120 },
    { date: 'Wk 4', MohraNet: 2410, baselineNet: 2170 },
    { date: 'Wk 5', MohraNet: 2390, baselineNet: 2180 },
    { date: 'Wk 6', MohraNet: 2480, baselineNet: 2210 },
    { date: 'Wk 7', MohraNet: 2520, baselineNet: 2260 },
    { date: 'Wk 8', MohraNet: 2490, baselineNet: 2240 },
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
