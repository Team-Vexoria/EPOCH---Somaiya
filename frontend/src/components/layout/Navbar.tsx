import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Languages, Sprout, Bot, MapPin, Truck, TrendingUp } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('Mohra_language', newLang);
  };

  const navLinks = [
    { label: t('nav.assistant'), path: '/assistant', icon: Bot },
    { label: t('nav.map'), path: '/map', icon: MapPin },
    { label: t('nav.fpo'), path: '/fpo', icon: Truck },
    { label: t('nav.backtest'), path: '/backtest', icon: TrendingUp },
  ];

  return (
    <header className="w-full bg-neutral-surface border-b-2 border-neutral-ink sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-primary text-primary-fg flex items-center justify-center font-bold text-xl border-2 border-neutral-ink shadow-hard">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-neutral-ink block leading-tight">
              Mohra
            </span>
            <span className="text-sm font-semibold text-primary block leading-tight">
              {i18n.language === 'mr' ? 'शेतकरी बाजार मित्र' : i18n.language === 'hi' ? 'किसान मंडी मित्र' : 'Mandi Advisory'}
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1.5 ml-4">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3.5 py-2 text-base font-semibold border-2 transition-all ${
                  isActive
                    ? 'bg-neutral-ink text-neutral-surface border-neutral-ink shadow-hard'
                    : 'bg-neutral-surface text-neutral-ink border-transparent hover:border-neutral-border hover:bg-neutral-bg'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side: Language Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-neutral-bg px-2.5 py-1.5 border-2 border-neutral-ink shadow-hard">
            <Languages className="w-4 h-4 text-neutral-ink shrink-0" />
            <label htmlFor="language-select" className="sr-only">
              {t('nav.selectLanguage')}
            </label>
            <select
              id="language-select"
              value={i18n.language.slice(0, 2)}
              onChange={handleLanguageChange}
              className="bg-transparent text-base font-bold text-neutral-ink cursor-pointer focus:outline-none"
            >
              <option value="mr">मराठी (मराठी)</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Secondary Nav Bar */}
      <div className="md:hidden border-t border-neutral-border bg-neutral-bg flex items-center justify-around py-2 px-1 overflow-x-auto">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-sm font-bold border ${
                isActive
                  ? 'bg-neutral-ink text-neutral-surface border-neutral-ink'
                  : 'bg-neutral-surface text-neutral-ink border-neutral-border'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
