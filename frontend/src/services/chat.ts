import type { Language, CropId, Recommendation, Message } from '../types';

export interface SendMessageParams {
  message: string;
  language: Language;
  crops: CropId[];
  history: Message[];
  onChunk: (chunk: string) => void;
  onDone: (fullText: string, recommendation?: Recommendation) => void;
  onError: (err: any) => void;
  signal?: AbortSignal;
}

interface CannedAdvice {
  text_mr: string;
  text_hi: string;
  text_en: string;
  recommendation?: Recommendation;
}

const ADVICE_DATABASE: Record<string, CannedAdvice> = {
  onion: {
    text_mr: `**कांदा विक्री सल्ला (नाशिक जिल्हा)**:

सध्या **लासलगाव** कृषी उत्पन्न बाजार समितीत दक्षिणेकडील राज्यांतून (तामिळनाडू आणि कर्नाटक) मागणी वाढल्याने सरासरी दरात वाढ होत आहे. 

### मुख्य मुद्दे:
- **दर कल**: येत्या १० दिवसांत आवक किंचित कमी राहण्याची शक्यता असून दर ₹१५० ते ₹२२० प्रति क्विंटलने वाढण्याचा अंदाज आहे.
- **चाळ साठा**: आपला कांदा हवादार चाळीत असल्यास वजनातील नैसर्गिक घट (१.५% प्रति आठवडा) विचारात घेतली तरी थांबणे अधिक फायदेशीर ठरेल.
- **सर्वोत्तम पर्याय**: निफाड तालुक्यातील स्थानिक व्यापाऱ्यांपेक्षा थेट **लासलगाव** किंवा **पिंपळगाव** बाजारात माल नेल्यास वाहतूक वजा जाता हातात जास्त रक्कम राहील.`,
    text_hi: `**प्याज बिक्री परामर्श (नासिक जिला)**:

वर्तमान में **लासलगांव** कृषि उपज मंडी में दक्षिण भारत के राज्यों से मांग बढ़ने के कारण प्याज के भाव में सुधार देखा जा रहा है।

### मुख्य बिंदु:
- **भाव का रुझान**: अगले १० दिनों में आवक थोड़ी कम रहने की संभावना है और भाव में ₹१५० से ₹२२० प्रति क्विंटल की बढ़त का अनुमान है।
- **भंडारण नुकसान**: यदि आपके पास अच्छी हवादार चाळ है, तो वजन में होने वाली प्राकृतिक कमी (१.५% प्रति सप्ताह) के बावजूद माल रोकना ज्यादा मुनाफेमंद है।
- **सर्वश्रेष्ठ मंडी**: स्थानीय व्यापारियों की तुलना में सीधे **लासलगांव** या **पिंपलगांव** मंडी में माल ले जाने पर ढुलाई खर्च काटकर भी हाथ में ज्यादा पैसे बचेंगे।`,
    text_en: `**Onion Advisory (Nashik APMC District)**:

Buyer inquiries from Southern states at **Lasalgaon APMC** have strengthened over the past 48 hours, lifting modal auction prices.

### Key Insights:
- **Price Trajectory**: Daily arrivals are projected to drop 12% next week, supporting an upward price movement of ₹150–₹220 per quintal.
- **Storage Loss Consideration**: If stored in well-aerated chawls, natural weight loss (~1.5% per week) is comfortably offset by projected price gains.
- **Optimal Route**: Dispatching directly to **Lasalgaon** rather than selling to local village aggregators delivers the highest net cash in hand after transport costs.`,
    recommendation: {
      decision: 'HOLD',
      holdDays: 10,
      bestMandi: 'Lasalgaon APMC',
      bestMandi_mr: 'लासलगाव बाजार समिती',
      bestMandi_hi: 'लासलगांव मंडी',
      expectedGainPerQuintal: 180,
      confidence: 'HIGH',
      cropId: 'onion',
      bestMandiId: 'lasalgaon',
      forecastTrend: [
        { dayLabel: 'Day 0 (Today)', date: 'Today', low: 2220, mid: 2280, high: 2340 },
        { dayLabel: 'Day 3', date: '+3d', low: 2260, mid: 2330, high: 2410 },
        { dayLabel: 'Day 7', date: '+7d', low: 2310, mid: 2410, high: 2490 },
        { dayLabel: 'Day 10 (Peak)', date: '+10d', low: 2380, mid: 2460, high: 2570 },
        { dayLabel: 'Day 14', date: '+14d', low: 2320, mid: 2430, high: 2540 },
      ],
      whyAdvice: [
        {
          title: 'Lasalgaon Mandi Daily Dispatch',
          snippet: 'Buyer arrivals down by 14% while south-bound dispatch orders remain high (+180 ₹/qtl forecast spread).',
          source: 'Agmarknet APMC Portal',
        },
        {
          title: 'NHRDF Post-Harvest Aeration Bulletin',
          snippet: 'Stored rabi onion maintains quality for 10-14 days with only 1.2% weekly natural moisture loss under aerated chawls.',
          source: 'NHRDF Nashik Regional Center',
        },
      ],
      mandis: [
        {
          id: 'lasalgaon',
          name: 'Lasalgaon APMC',
          name_mr: 'लासलगाव बाजार समिती',
          name_hi: 'लासलगांव मंडी',
          distanceKm: 18,
          forecastPrice: 2460,
          transportCost: 35,
          spoilageLoss: 25,
          netPerQuintal: 2400,
          isOptimal: true,
        },
        {
          id: 'pimpalgaon',
          name: 'Pimpalgaon Baswant',
          name_mr: 'पिंपळगाव बसवंत',
          name_hi: 'पिंपलगांव बसवंत',
          distanceKm: 24,
          forecastPrice: 2390,
          transportCost: 42,
          spoilageLoss: 25,
          netPerQuintal: 2323,
          isOptimal: false,
        },
        {
          id: 'yeola',
          name: 'Yeola APMC',
          name_mr: 'येवला बाजार समिती',
          name_hi: 'येवला मंडी',
          distanceKm: 42,
          forecastPrice: 2310,
          transportCost: 65,
          spoilageLoss: 25,
          netPerQuintal: 2220,
          isOptimal: false,
        },
        {
          id: 'sinnar',
          name: 'Sinnar APMC',
          name_mr: 'सिन्नर बाजार समिती',
          name_hi: 'सिन्नर मंडी',
          distanceKm: 38,
          forecastPrice: 2280,
          transportCost: 60,
          spoilageLoss: 25,
          netPerQuintal: 2195,
          isOptimal: false,
        },
      ],
    },
  },

  tomato: {
    text_mr: `**टोमॅटो विक्री सल्ला (तातडीने विक्री)**:

टोमॅटो हे अतिनाशवंत पीक असून नाशिक परिसरात वातावरणातील दमटपणामुळे क्रेट्समध्ये माल खराब होण्याची जोखीम खूप जास्त आहे.

### मुख्य मुद्दे:
- **तातडीचा निर्णय**: माल अजिबात थांबवू नका. आज किंवा उद्या सकाळीच **पिंपळगाव बसवंत** टोमॅटो मार्केटमध्ये विक्रीसाठी न्या.
- **पिंपळगावचे महत्त्व**: पिंपळगाव हे उत्तर महाराष्ट्रातील सर्वात मोठे टोमॅटो संकलन केंद्र असून दिल्ली व गुजरातचे खरेदीदार येथे हजर असतात.
- **खर्च व नुकसान**: २ दिवस थांबल्यास वजनातील घट व सडण्याचे प्रमाण २०% पर्यंत वाढू शकते, ज्यामुळे तात्काळ विक्री करणेच उत्तम आहे.`,
    text_hi: `**टमाटर बिक्री परामर्श (तत्काल बिक्री)**:

टमाटर अत्यंत जल्दी खराब होने वाली फसल है। नासिक क्षेत्र में मौसम की नमी के कारण क्रेट में फल सड़ने और वजन घटने का भारी जोखिम है।

### मुख्य बिंदु:
- **सलाह**: माल को कतई न रोकें। आज या कल सुबह ही **पिंपलगांव बसवंत** टमाटर मंडी में बिक्री करें।
- **पिंपलगांव का लाभ**: पिंपलगांव उत्तर महाराष्ट्र का प्रमुख टमाटर केंद्र है, जहां दिल्ली और गुजरात के थोक खरीदार सक्रिय रहते हैं।
- **जोखिम**: दो दिन भी माल रोकने पर २०% तक सड़न हो सकती है, इसलिए तुरंत बेचना ही सबसे सुरक्षित निर्णय है।`,
    text_en: `**Tomato Advisory (Immediate Harvest Sale)**:

Tomatoes are highly perishable (maximum shelf-life 3–4 days). Moisture levels in Nashik create high crate spoilage risk.

### Key Insights:
- **Decision**: **SELL TODAY**. Do not attempt to hold or store harvested crates.
- **Anchor Market**: Head directly to **Pimpalgaon Baswant APMC**, the primary tomato terminal in North Maharashtra with active buyers from Delhi and Gujarat.
- **Loss Avoidance**: Delaying dispatch by 48 hours risks up to 20% spoilage loss, quickly erasing any marginal price increase.`,
    recommendation: {
      decision: 'SELL_NOW',
      bestMandi: 'Pimpalgaon Baswant APMC',
      bestMandi_mr: 'पिंपळगाव बसवंत बाजार समिती',
      bestMandi_hi: 'पिंपलगांव बसवंत मंडी',
      expectedGainPerQuintal: 120,
      confidence: 'HIGH',
      cropId: 'tomato',
      bestMandiId: 'pimpalgaon',
      confidenceReason: 'Perishability risk; active terminal buyers present today at Pimpalgaon.',
      forecastTrend: [
        { dayLabel: 'Day 0 (Today)', date: 'Today', low: 1600, mid: 1680, high: 1740 },
        { dayLabel: 'Day 1', date: '+1d', low: 1540, mid: 1620, high: 1690 },
        { dayLabel: 'Day 2', date: '+2d', low: 1420, mid: 1510, high: 1590 },
        { dayLabel: 'Day 4', date: '+4d', low: 1250, mid: 1360, high: 1470 },
        { dayLabel: 'Day 7', date: '+7d', low: 1050, mid: 1180, high: 1300 },
      ],
      whyAdvice: [
        {
          title: 'Pimpalgaon Baswant Tomato Terminal',
          snippet: 'Strong buyer turnout today from Delhi and Gujarat; premium offered for fresh firm crates.',
          source: 'Maharashtra State APMC Market Daily',
        },
        {
          title: 'IIHR Rapid Spoilage Advisory',
          snippet: 'Harvested crates experience 15-20% spoilage within 48h under humid ambient conditions. Holding destroys net returns.',
          source: 'ICAR-IIHR Extension Nashik',
        },
      ],
      mandis: [
        {
          id: 'pimpalgaon',
          name: 'Pimpalgaon Baswant',
          name_mr: 'पिंपळगाव बसवंत',
          name_hi: 'पिंपलगांव बसवंत',
          distanceKm: 16,
          forecastPrice: 1680,
          transportCost: 30,
          spoilageLoss: 30,
          netPerQuintal: 1620,
          isOptimal: true,
        },
        {
          id: 'nashik',
          name: 'Nashik Panchavati',
          name_mr: 'नाशिक पंचवटी',
          name_hi: 'नासिक पंचवटी',
          distanceKm: 28,
          forecastPrice: 1610,
          transportCost: 45,
          spoilageLoss: 35,
          netPerQuintal: 1530,
          isOptimal: false,
        },
        {
          id: 'lasalgaon',
          name: 'Lasalgaon APMC',
          name_mr: 'लासलगाव बाजार समिती',
          name_hi: 'लासलगांव मंडी',
          distanceKm: 22,
          forecastPrice: 1540,
          transportCost: 38,
          spoilageLoss: 42,
          netPerQuintal: 1460,
          isOptimal: false,
        },
      ],
    },
  },

  soybean: {
    text_mr: `**सोयाबीन विक्री सल्ला**:

सोयाबीन कोरडे कडधान्य असल्याने साठवणूक क्षमता उत्तम आहे. सध्या आंतरराष्ट्रीय खाद्यतेल बाजारातील स्थिरता आणि स्थानिक तेलगिरण्यांची मागणी यामुळे **मालेगाव** व **येवला** बाजारात दर टिकून आहेत.

### मुख्य मुद्दे:
- **भाव अंदाज**: दर सध्या ₹४,३५० ते ₹४,५२० प्रति क्विंटल दरम्यान स्थिर आहेत.
- **आर्द्रता प्रमाण**: माल विक्रीस नेण्यापूर्वी ओलावा १०% पेक्षा कमी असावा, अन्यथा बाजार समितीत कपात होते.
- **सल्ला**: सध्या पैशांची तात्काळ निकड नसल्यास अजून १५ दिवस कोरड्या गोदामात साठवणे योग्य ठरेल.`,
    text_hi: `**सोयाबीन बिक्री परामर्श**:

सोयाबीन को सूखे गोदाम में लंबे समय तक रखा जा सकता है। वर्तमान में खाद्य तेल मिलों की स्थिर खरीद के चलते **मालेगांव** और **येवला** मंडी में अच्छे भाव मिल रहे हैं।

### मुख्य बिंदु:
- **भाव स्तर**: वर्तमान दर ₹४,३५० से ₹४,५२० प्रति क्विंटल के दायरे में मजबूत बनी हुई है।
- **नमी का ध्यान रखें**: मंडी ले जाने से पहले दाने में नमी १०% से कम होनी चाहिए ताकि भाव में कोई कटौती न हो।
- **सलाह**: यदि तत्काल नकदी की जरूरत न हो, तो १५-२० दिन और माल रोकना सुरक्षित है।`,
    text_en: `**Soybean Advisory (Dry Grain Holding)**:

Soybeans have an extended shelf-life (up to 240 days in dry gunny bags). Consistent demand from regional crushing mills in Malegaon provides strong price support.

### Key Insights:
- **Price Band**: Stable around ₹4,350 to ₹4,520 per quintal across central Nashik APMCs.
- **Moisture Control**: Ensure bean moisture is below 10% before loading to prevent dockage penalties at auction.
- **Advisory**: If immediate working capital is not required, holding for 15 days carries negligible deterioration risk.`,
    recommendation: {
      decision: 'HOLD',
      holdDays: 15,
      bestMandi: 'Malegaon APMC',
      bestMandi_mr: 'मालेगाव बाजार समिती',
      bestMandi_hi: 'मालेगांव मंडी',
      expectedGainPerQuintal: 110,
      confidence: 'MEDIUM',
      cropId: 'soybean',
      bestMandiId: 'malegaon',
      confidenceReason: 'Steady crusher demand; dry storage has minimal weight decay.',
      forecastTrend: [
        { dayLabel: 'Day 0 (Today)', date: 'Today', low: 4420, mid: 4490, high: 4540 },
        { dayLabel: 'Day 5', date: '+5d', low: 4450, mid: 4520, high: 4590 },
        { dayLabel: 'Day 10', date: '+10d', low: 4490, mid: 4570, high: 4650 },
        { dayLabel: 'Day 15 (Peak)', date: '+15d', low: 4540, mid: 4630, high: 4720 },
        { dayLabel: 'Day 21', date: '+21d', low: 4520, mid: 4610, high: 4700 },
      ],
      whyAdvice: [
        {
          title: 'SOPA Domestic Crush Parity Review',
          snippet: 'Regional solvent plants in Malegaon actively contracting high-protein dry lots at ₹4,500+.',
          source: 'SOPA Market Monitor',
        },
        {
          title: 'Warehouse Moisture Standards',
          snippet: 'Dry gunny bags (<10% moisture) experience less than 0.1% loss over 30 days. Safe to hold for price recovery.',
          source: 'Maharashtra Warehousing Corporation',
        },
      ],
      mandis: [
        {
          id: 'malegaon',
          name: 'Malegaon APMC',
          name_mr: 'मालेगाव बाजार समिती',
          name_hi: 'मालेगांव मंडी',
          distanceKm: 35,
          forecastPrice: 4520,
          transportCost: 55,
          spoilageLoss: 5,
          netPerQuintal: 4460,
          isOptimal: true,
        },
        {
          id: 'yeola',
          name: 'Yeola APMC',
          name_mr: 'येवला बाजार समिती',
          name_hi: 'येवला मंडी',
          distanceKm: 28,
          forecastPrice: 4480,
          transportCost: 45,
          spoilageLoss: 5,
          netPerQuintal: 4430,
          isOptimal: false,
        },
        {
          id: 'satana',
          name: 'Satana APMC',
          name_mr: 'सटाणा बाजार समिती',
          name_hi: 'सटाणा मंडी',
          distanceKm: 42,
          forecastPrice: 4410,
          transportCost: 65,
          spoilageLoss: 5,
          netPerQuintal: 4340,
          isOptimal: false,
        },
      ],
    },
  },
};

const GENERIC_ADVICE: CannedAdvice = {
  text_mr: `नमस्कार शेतकरी मित्र! मी आपला **Sell Smart** कृषी बाजार सल्लागार आहे.

आपल्या शेतीमालाचा अधिकाधिक नफा मिळवण्यासाठी मला खालील माहिती सांगा:
1. **कोणते पीक आहे?** (कांदा, टोमॅटो किंवा सोयाबीन)
2. **अंदाजे किती माल आहे?** (क्विंटलमध्ये)
3. **आपले गाव कोणते आहे?**

या माहितीवरून मी नाशिक जिल्ह्यातील सर्व १४ बाजार समित्यांचे थेट दर, वाहनाचे भाडे आणि वजनातील घट वजा करून **सर्वाधिक हातात निव्वळ पैसे देणारा बाजार** शोधून देईन.`,
  text_hi: `नमस्ते किसान भाई! मैं आपका **Sell Smart** कृषि मंडी सलाहकार हूँ।

अपनी फसल का सबसे बेहतर दाम पाने के लिए कृपया मुझे बताएं:
1. **कौन सी फसल है?** (प्याज, टमाटर या सोयाबीन)
2. **कुल कितनी मात्रा है?** (क्विंटल में)
3. **आपका गांव या तहसील कौन सी है?**

इस जानकारी के आधार पर मैं नासिक जिले की सभी १४ मंडियों के भाव, ढुलाई भाड़ा और खराबी का हिसाब लगाकर आपको बताएंगे कि माल **कब और किस मंडी में बेचना सबसे फायदेमंद रहेगा**।`,
  text_en: `Hello farmer! I am your **Sell Smart** agricultural market advisor.

To give you the most accurate price forecast and net profit calculation, please let me know:
1. **Which crop are you harvesting?** (Onion, Tomato, or Soybean)
2. **Approximate quantity** (in Quintals)
3. **Your village or taluka in Nashik district**

With this, I will analyze live rates across all 14 Nashik APMC mandis, subtract freight haulage and transit losses, and recommend the **single best market for maximum money in your pocket**.`,
};

function matchAdvice(query: string, userCrops: CropId[]): CannedAdvice {
  const lower = query.toLowerCase();

  if (
    lower.includes('onion') ||
    lower.includes('कांदा') ||
    lower.includes('कांदे') ||
    lower.includes('प्याज') ||
    lower.includes('lasalgaon') ||
    lower.includes('लासलगाव')
  ) {
    return ADVICE_DATABASE.onion;
  }

  if (
    lower.includes('tomato') ||
    lower.includes('टोमॅटो') ||
    lower.includes('टमाटर') ||
    lower.includes('pimpalgaon') ||
    lower.includes('पिंपळगाव')
  ) {
    return ADVICE_DATABASE.tomato;
  }

  if (
    lower.includes('soybean') ||
    lower.includes('सोयाबीन') ||
    lower.includes('malegaon') ||
    lower.includes('मालेगाव')
  ) {
    return ADVICE_DATABASE.soybean;
  }

  // Fallback to primary crop selected by user during onboarding if available
  if (userCrops && userCrops.length > 0) {
    if (userCrops.includes('onion')) return ADVICE_DATABASE.onion;
    if (userCrops.includes('tomato')) return ADVICE_DATABASE.tomato;
    if (userCrops.includes('soybean')) return ADVICE_DATABASE.soybean;
  }

  return GENERIC_ADVICE;
}

/**
 * Sends a message to the AI Assistant and simulates token-by-token streaming
 */
export async function sendMessage({
  message,
  language,
  crops,
  onChunk,
  onDone,
  onError,
  signal,
}: SendMessageParams): Promise<void> {
  try {
    // Initial thinking / network delay (~600ms)
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 600);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted by user', 'AbortError'));
        });
      }
    });

    const advice = matchAdvice(message, crops);
    const rawText =
      language === 'mr'
        ? advice.text_mr
        : language === 'hi'
        ? advice.text_hi
        : advice.text_en;

    // Split into tokens/words for realistic streaming
    const words = rawText.split(' ');
    let accumulated = '';

    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) {
        throw new DOMException('Aborted by user', 'AbortError');
      }

      accumulated += (i === 0 ? '' : ' ') + words[i];
      onChunk(accumulated);

      // 25ms-35ms per word
      await new Promise((resolve) => setTimeout(resolve, 28));
    }

    onDone(rawText, advice.recommendation);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // Stopped gracefully by user
      return;
    }
    onError(err);
  }
}
