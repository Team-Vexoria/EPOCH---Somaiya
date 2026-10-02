import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CROPS } from '../config/crops';
import { MANDIS } from '../config/mandis';
import { Bot, MapPin, Truck, TrendingUp, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.slice(0, 2);

  return (
    <div className="space-y-12 py-4">
      {/* Editorial Hero Section */}
      <section className="bg-neutral-surface border-2 border-neutral-ink p-6 sm:p-10 shadow-hard">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="inline-block px-3 py-1 bg-primary-subtle border border-primary text-sm font-bold text-primary">
              {currentLang === 'mr'
                ? 'नाशिक जिल्हा शेतकरी व FPO निर्णय सल्लागार'
                : currentLang === 'hi'
                ? 'नासिक जिला किसान एवं FPO निर्णय प्रणाली'
                : 'Nashik District Agri Decision Support Engine'}
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-ink leading-tight">
              {t('hero.title')}
            </h1>

            <p className="text-lg text-neutral-ink leading-relaxed max-w-2xl font-medium">
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/assistant"
                className="inline-flex items-center gap-2 px-6 py-4 bg-primary text-primary-fg text-base font-bold border-2 border-neutral-ink shadow-hard hover:bg-primary-hover active:translate-x-0.5 active:translate-y-0.5"
              >
                <Bot className="w-5 h-5" />
                <span>{t('hero.cta')}</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <Link
                to="/map"
                className="inline-flex items-center gap-2 px-5 py-4 bg-neutral-surface text-neutral-ink text-base font-bold border-2 border-neutral-ink hover:bg-neutral-bg active:translate-x-0.5 active:translate-y-0.5"
              >
                <MapPin className="w-5 h-5 text-primary" />
                <span>{t('hero.mapCta')}</span>
              </Link>

              <Link
                to="/fpo"
                className="inline-flex items-center gap-2 px-5 py-4 bg-neutral-surface text-neutral-ink text-base font-bold border-2 border-neutral-ink hover:bg-neutral-bg active:translate-x-0.5 active:translate-y-0.5"
              >
                <Truck className="w-5 h-5 text-secondary" />
                <span>{t('hero.fpoCta')}</span>
              </Link>
            </div>
          </div>

          {/* Quick Real-Time Mandi Summary Card */}
          <div className="lg:col-span-4 bg-neutral-bg border-2 border-neutral-ink p-5 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-neutral-border pb-3">
              <h2 className="text-lg font-bold text-neutral-ink">
                {currentLang === 'mr' ? 'नाशिक प्रमुख बाजार' : currentLang === 'hi' ? 'नासिक प्रमुख मंडियां' : 'Nashik Mandi Highlights'}
              </h2>
              <span className="text-sm font-semibold text-primary">
                14 APMCs
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-neutral-surface border border-neutral-ink flex items-center justify-between">
                <div>
                  <span className="font-bold text-base block text-neutral-ink">
                    {currentLang === 'mr' ? 'लासलगाव (कांदा)' : 'Lasalgaon (Onion)'}
                  </span>
                  <span className="text-sm text-neutral-muted">
                    {currentLang === 'mr' ? 'आशियातील सर्वात मोठी कांदा बाजारपेठ' : 'Asia\'s largest onion hub'}
                  </span>
                </div>
                <span className="font-bold text-base text-primary">
                  ₹2,150-2,480
                </span>
              </div>

              <div className="p-3 bg-neutral-surface border border-neutral-ink flex items-center justify-between">
                <div>
                  <span className="font-bold text-base block text-neutral-ink">
                    {currentLang === 'mr' ? 'पिंपळगाव बसवंत' : 'Pimpalgaon Baswant'}
                  </span>
                  <span className="text-sm text-neutral-muted">
                    {currentLang === 'mr' ? 'टोमॅटो व कांदा खरेदी' : 'Tomato & Onion trade'}
                  </span>
                </div>
                <span className="font-bold text-base text-secondary">
                  ₹1,650-1,880
                </span>
              </div>

              <div className="p-3 bg-neutral-surface border border-neutral-ink flex items-center justify-between">
                <div>
                  <span className="font-bold text-base block text-neutral-ink">
                    {currentLang === 'mr' ? 'मालेगाव व मनमाड' : 'Malegaon / Manmad'}
                  </span>
                  <span className="text-sm text-neutral-muted">
                    {currentLang === 'mr' ? 'सोयाबीन व धान्य' : 'Soybean & pulses'}
                  </span>
                </div>
                <span className="font-bold text-base text-neutral-ink">
                  ₹4,350-4,580
                </span>
              </div>
            </div>

            <div className="pt-2 text-sm text-neutral-muted flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>
                {currentLang === 'mr'
                  ? 'वाहतूक व घट वजा करून प्रत्यक्ष नफा मोजणारा अल्गोरिदम'
                  : 'Calculates real money in hand minus transit & spoilage'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Target Crops with Contrasting Shelf Lives */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-neutral-ink">
            {currentLang === 'mr' ? 'तीन प्रमुख पिके व साठवणूक जोखीम' : currentLang === 'hi' ? 'तीन मुख्य फसलें एवं शेल्फ-लाइफ' : 'Three Target Crops & Storage Risk'}
          </h2>
          <span className="text-sm font-medium text-neutral-muted">
            {currentLang === 'mr' ? 'नाशिक जिल्हा' : 'Nashik District Scope'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(CROPS).map((crop) => (
            <div key={crop.id} className="bg-neutral-surface border-2 border-neutral-ink p-6 shadow-hard space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl">{crop.icon}</span>
                <span className="px-2.5 py-1 text-sm font-bold border border-neutral-ink bg-neutral-bg">
                  {currentLang === 'mr'
                    ? `टिकवण: ${crop.shelfLifeDays} दिवस`
                    : currentLang === 'hi'
                    ? `शेल्फ लाइफ: ${crop.shelfLifeDays} दिन`
                    : `Shelf Life: ${crop.shelfLifeDays} Days`}
                </span>
              </div>

              <h3 className="text-2xl font-bold text-neutral-ink">
                {currentLang === 'mr' ? crop.name_mr : currentLang === 'hi' ? crop.name_hi : crop.name}
              </h3>

              <p className="text-base text-neutral-ink leading-relaxed">
                {currentLang === 'mr' ? crop.storageType_mr : currentLang === 'hi' ? crop.storageType_hi : crop.storageType}
              </p>

              <div className="border-t border-neutral-border pt-3 flex items-center justify-between text-sm">
                <span className="text-neutral-muted">
                  {currentLang === 'mr' ? 'साठवणूक घट दर:' : 'Decay loss rate:'}
                </span>
                <span className="font-bold text-neutral-ink">
                  {crop.decayRatePerWeek}% / {currentLang === 'mr' ? 'आठवडा' : 'week'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Navigation Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <Link
          to="/assistant"
          className="bg-neutral-surface border-2 border-neutral-ink p-6 shadow-hard hover:bg-neutral-bg transition-all group"
        >
          <div className="w-12 h-12 bg-primary text-primary-fg flex items-center justify-center font-bold mb-4 border-2 border-neutral-ink">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-neutral-ink group-hover:text-primary mb-2">
            {t('nav.assistant')}
          </h3>
          <p className="text-base text-neutral-ink leading-relaxed">
            {currentLang === 'mr'
              ? 'मराठी व हिंदी आवाज किंवा मजकुरात विचारा. आज विकावा की ठेवावा याचा अचूक सल्ला मिळवा.'
              : 'Voice or text query in Marathi, Hindi, English. Direct Hold vs Sell decision.'}
          </p>
        </Link>

        <Link
          to="/map"
          className="bg-neutral-surface border-2 border-neutral-ink p-6 shadow-hard hover:bg-neutral-bg transition-all group"
        >
          <div className="w-12 h-12 bg-secondary text-secondary-fg flex items-center justify-center font-bold mb-4 border-2 border-neutral-ink">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-neutral-ink group-hover:text-secondary mb-2">
            {t('nav.map')}
          </h3>
          <p className="text-base text-neutral-ink leading-relaxed">
            {currentLang === 'mr'
              ? 'नाशिकमधील सर्व १४ बाजार समित्यांचा नकाशा, अंतर, भाव आणि वाहतूक खर्च वजा प्रत्यक्ष नफा.'
              : 'Interactive map of 14 Nashik mandis with spatial freight deductions and live sparklines.'}
          </p>
        </Link>

        <Link
          to="/fpo"
          className="bg-neutral-surface border-2 border-neutral-ink p-6 shadow-hard hover:bg-neutral-bg transition-all group"
        >
          <div className="w-12 h-12 bg-neutral-bg text-neutral-ink flex items-center justify-center font-bold mb-4 border-2 border-neutral-ink">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-neutral-ink mb-2">
            {t('nav.fpo')}
          </h3>
          <p className="text-base text-neutral-ink leading-relaxed">
            {currentLang === 'mr'
              ? 'FPO कंपन्यांसाठी घाऊक माल विविध बाजारांत विभागून पाठवण्याचे वेळापत्रक व ट्रक नियोजन.'
              : 'Bulk multi-truck dispatch allocation across mandis to avoid local market crashes.'}
          </p>
        </Link>
      </section>
    </div>
  );
};
