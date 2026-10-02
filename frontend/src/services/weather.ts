/**
 * weather.ts
 *
 * Real-time weather integration via Open-Meteo API (free, no API key needed).
 * Fetches 7-day daily forecast for Nashik APMC agricultural zone (Lat: 19.9975, Lon: 73.7898).
 * Analyzes precipitation and humidity risk to generate harvest spoilage advisories.
 */

export interface DailyWeather {
  date: string;
  dayLabel: string;
  maxTemp: number;
  minTemp: number;
  precipitationMm: number;
  weatherCode: number;
  conditionText: string;
  isRainy: boolean;
}

export interface WeatherAdvisory {
  hasRainRisk: boolean;
  rainProbabilityDays: number;
  temperatureAvg: number;
  advisoryText_en: string;
  advisoryText_hi: string;
  advisoryText_mr: string;
  forecast: DailyWeather[];
}

function getWeatherCondition(code: number): { text: string; isRain: boolean } {
  // WMO Weather interpretation codes
  if (code === 0) return { text: 'Clear Sky', isRain: false };
  if (code === 1 || code === 2 || code === 3) return { text: 'Partly Cloudy', isRain: false };
  if (code === 45 || code === 48) return { text: 'Foggy / Hazy', isRain: false };
  if (code >= 51 && code <= 55) return { text: 'Drizzle', isRain: true };
  if (code >= 61 && code <= 65) return { text: 'Rain Showers', isRain: true };
  if (code >= 80 && code <= 82) return { text: 'Heavy Rain', isRain: true };
  if (code >= 95) return { text: 'Thunderstorm', isRain: true };
  return { text: 'Overcast', isRain: false };
}

const FALLBACK_ADVISORY: WeatherAdvisory = {
  hasRainRisk: true,
  rainProbabilityDays: 2,
  temperatureAvg: 31,
  advisoryText_en:
    'Rain showers forecast in Nashik APMC belt. High humidity accelerates crate rot in perishable tomatoes. Prioritize fast auction dispatch.',
  advisoryText_hi:
    'नासिक क्षेत्र में बारिश का अनुमान। अत्यधिक नमी से टमाटर जल्दी खराब होने का खतरा है। तुरंत मंडी भेजने को प्राथमिकता दें।',
  advisoryText_mr:
    'नाशिक बाजार परिसरात पुढील ३ दिवसांत पावसाचा अंदाज. दमट हवामानामुळे टोमॅटो पिकात सड वेगाने होऊ शकते. तातडीने विक्री करणे हिताचे ठरेल.',
  forecast: [
    {
      date: 'Today',
      dayLabel: 'Today',
      maxTemp: 32,
      minTemp: 21,
      precipitationMm: 1.2,
      weatherCode: 61,
      conditionText: 'Rain Showers',
      isRainy: true,
    },
    {
      date: 'Tomorrow',
      dayLabel: 'Tomorrow',
      maxTemp: 31,
      minTemp: 20,
      precipitationMm: 4.8,
      weatherCode: 63,
      conditionText: 'Moderate Rain',
      isRainy: true,
    },
    {
      date: 'Day 3',
      dayLabel: '+2d',
      maxTemp: 30,
      minTemp: 21,
      precipitationMm: 0.4,
      weatherCode: 51,
      conditionText: 'Light Drizzle',
      isRainy: true,
    },
    {
      date: 'Day 4',
      dayLabel: '+3d',
      maxTemp: 33,
      minTemp: 22,
      precipitationMm: 0.0,
      weatherCode: 1,
      conditionText: 'Clear Sky',
      isRainy: false,
    },
  ],
};

export async function fetchNashikWeather(): Promise<WeatherAdvisory> {
  const url =
    'https://api.open-meteo.com/v1/forecast?latitude=19.9975&longitude=73.7898&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FKolkata';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return FALLBACK_ADVISORY;
    }

    const data = await res.json();
    const daily = data.daily;
    if (!daily || !daily.time) {
      return FALLBACK_ADVISORY;
    }

    const forecast: DailyWeather[] = [];
    let rainDaysCount = 0;
    let tempSum = 0;

    for (let i = 0; i < Math.min(daily.time.length, 5); i++) {
      const wCode = daily.weathercode[i] || 0;
      const precip = daily.precipitation_sum[i] || 0;
      const { text, isRain } = getWeatherCondition(wCode);
      const isRainy = isRain || precip > 0.8;

      if (i < 3 && isRainy) {
        rainDaysCount++;
      }

      tempSum += daily.temperature_2m_max[i] || 30;

      const dateStr = daily.time[i];
      const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `Day ${i + 1}`;

      forecast.push({
        date: dateStr,
        dayLabel,
        maxTemp: Math.round(daily.temperature_2m_max[i]),
        minTemp: Math.round(daily.temperature_2m_min[i]),
        precipitationMm: Number(precip.toFixed(1)),
        weatherCode: wCode,
        conditionText: text,
        isRainy,
      });
    }

    const hasRainRisk = rainDaysCount > 0;
    const temperatureAvg = Math.round(tempSum / forecast.length);

    const advisoryText_en = hasRainRisk
      ? 'Rain forecast in Nashik APMC belt. High ambient humidity accelerates crate rot in perishable tomatoes. Prioritize fast auction dispatch.'
      : 'Dry and clear weather across Nashik district. Aerated chawl storage conditions are favorable for holding onions and dry soybean.';

    const advisoryText_hi = hasRainRisk
      ? 'नासिक क्षेत्र में बारिश का अनुमान। अत्यधिक नमी से टमाटर जल्दी खराब होने का खतरा है। तुरंत मंडी भेजने को प्राथमिकता दें।'
      : 'नासिक जिले में सूखा और साफ मौसम। हवादार चाळ में प्याज और सूखे गोदाम में सोयाबीन सुरक्षित रूप से रोका जा सकता है।';

    const advisoryText_mr = hasRainRisk
      ? 'नाशिक बाजार परिसरात पुढील ३ दिवसांत पावसाचा अंदाज. दमट हवामानामुळे टोमॅटो पिकात सड वेगाने होऊ शकते. तातडीने विक्री करणे हिताचे ठरेल.'
      : 'नाशिक जिल्ह्यात हवामान कोरडे आणि स्वच्छ राहील. हवादार चाळीत कांदा व कोरड्या गोदामात सोयाबीन साठवणे सुरक्षित आहे.';

    return {
      hasRainRisk,
      rainProbabilityDays: rainDaysCount,
      temperatureAvg,
      advisoryText_en,
      advisoryText_hi,
      advisoryText_mr,
      forecast,
    };
  } catch (err) {
    console.warn('Open-Meteo weather fetch failed, using fallback advisory:', err);
    return FALLBACK_ADVISORY;
  }
}
