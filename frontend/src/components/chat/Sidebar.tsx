import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sprout,
  Plus,
  MessageSquare,
  MoreVertical,
  Edit2,
  Trash2,
  Globe,
  Settings,
  LogOut,
  X,
  Phone,
  ChevronDown,
  MapPin,
  TrendingUp,
  Users,
  Calculator,
  Bell,
  MessageCircle,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { Conversation } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onOpenCalculator?: () => void;
  onOpenAlerts?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  onNewChat,
  onOpenCalculator,
  onOpenAlerts,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const currentLang = i18n.language || 'mr';

  const {
    phone,
    conversations,
    activeConversationId,
    setActiveConversation,
    renameConversation,
    deleteConversation,
    logout,
    login,
  } = useAppStore();

  const [openMenuConvId, setOpenMenuConvId] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      setOpenMenuConvId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Group conversations by Today, Yesterday, Previous 7 Days
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const todayConvs: Conversation[] = [];
  const yesterdayConvs: Conversation[] = [];
  const previous7DaysConvs: Conversation[] = [];

  conversations.forEach((conv) => {
    const diff = now - conv.updatedAt;
    if (diff < oneDayMs) {
      todayConvs.push(conv);
    } else if (diff < 2 * oneDayMs) {
      yesterdayConvs.push(conv);
    } else {
      previous7DaysConvs.push(conv);
    }
  });

  const handleSelectConv = (id: string) => {
    setActiveConversation(id);
    navigate(`/chat/${id}`);
    onClose();
  };

  const handleRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setOpenMenuConvId(null);
    const newTitle = window.prompt(t('chat.enterNewTitle'), currentTitle);
    if (newTitle && newTitle.trim()) {
      renameConversation(id, newTitle.trim());
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuConvId(null);
    if (window.confirm(t('chat.confirmDelete'))) {
      deleteConversation(id);
      if (activeConversationId === id) {
        navigate('/chat');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderConvItem = (conv: Conversation) => {
    const isActive = conv.id === activeConversationId;
    const isMenuOpen = openMenuConvId === conv.id;

    return (
      <div
        key={conv.id}
        onClick={() => handleSelectConv(conv.id)}
        className={`group relative flex items-center justify-between p-2.5 mb-1 cursor-pointer transition-colors border-2 ${
          isActive
            ? 'bg-neutral-bg text-neutral-ink border-neutral-ink shadow-hard font-bold'
            : 'bg-neutral-surface text-neutral-ink border-transparent hover:border-neutral-border hover:bg-neutral-bg'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-1">
          <MessageSquare className="w-4 h-4 shrink-0 text-primary" />
          <span className="text-sm truncate select-none">{conv.title}</span>
        </div>

        {/* ... Menu Button */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuConvId(isMenuOpen ? null : conv.id);
            }}
            aria-label="Conversation options"
            className="p-1 text-neutral-muted hover:text-neutral-ink opacity-80 group-hover:opacity-100 cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Action Popover */}
          {isMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-1 w-32 bg-neutral-surface border-2 border-neutral-ink shadow-hard z-30 py-1"
            >
              <button
                type="button"
                onClick={(e) => handleRename(e, conv.id, conv.title)}
                className="w-full text-left px-3 py-1.5 text-sm font-semibold hover:bg-neutral-bg flex items-center gap-2 text-neutral-ink cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-neutral-muted" />
                <span>{t('chat.rename')}</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleDelete(e, conv.id)}
                className="w-full text-left px-3 py-1.5 text-sm font-semibold hover:bg-neutral-bg flex items-center gap-2 text-risk cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('chat.delete')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-neutral-ink/50 z-40 md:hidden"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed md:static top-0 bottom-0 left-0 w-[260px] bg-neutral-surface border-r-2 border-neutral-ink flex flex-col justify-between z-50 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header: Logo + New Chat */}
        <div className="p-3 border-b-2 border-neutral-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary text-primary-fg border-2 border-neutral-ink shadow-hard flex items-center justify-center font-bold">
                <Sprout className="w-5 h-5" />
              </div>
              <span className="font-black text-lg tracking-tight text-neutral-ink">
                Sell Smart
              </span>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sidebar"
              className="p-1 md:hidden text-neutral-ink border border-neutral-ink hover:bg-neutral-bg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full min-h-[44px] py-2 px-3 bg-primary hover:bg-primary-hover text-primary-fg font-extrabold text-sm border-2 border-neutral-ink shadow-hard flex items-center justify-center gap-2 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('chat.newChat')}</span>
          </button>
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-neutral-muted">
              {t('chat.noHistory')}
            </div>
          ) : (
            <>
              {todayConvs.length > 0 && (
                <div className="mb-3">
                  <div className="px-2 py-1 text-sm font-black uppercase tracking-wider text-neutral-muted">
                    {t('chat.today')}
                  </div>
                  {todayConvs.map(renderConvItem)}
                </div>
              )}

              {yesterdayConvs.length > 0 && (
                <div className="mb-3">
                  <div className="px-2 py-1 text-sm font-black uppercase tracking-wider text-neutral-muted">
                    {t('chat.yesterday')}
                  </div>
                  {yesterdayConvs.map(renderConvItem)}
                </div>
              )}

              {previous7DaysConvs.length > 0 && (
                <div className="mb-3">
                  <div className="px-2 py-1 text-sm font-black uppercase tracking-wider text-neutral-muted">
                    {t('chat.previous7Days')}
                  </div>
                  {previous7DaysConvs.map(renderConvItem)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Tools & Pages Links */}
        <div className="p-2 border-t-2 border-neutral-border bg-neutral-bg/60 space-y-1">
          <div className="px-2 py-1 text-sm font-black uppercase tracking-wider text-neutral-muted">
            Platform Tools
          </div>

          <button
            type="button"
            onClick={() => {
              navigate('/map');
              onClose();
            }}
            className={`w-full p-2 text-left text-sm font-bold border-2 transition-all flex items-center gap-2 cursor-pointer ${
              location.pathname === '/map'
                ? 'bg-neutral-surface text-primary border-neutral-ink shadow-hard'
                : 'text-neutral-ink border-transparent hover:border-neutral-border hover:bg-neutral-surface'
            }`}
          >
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{t('nav.map')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigate('/backtest');
              onClose();
            }}
            className={`w-full p-2 text-left text-sm font-bold border-2 transition-all flex items-center gap-2 cursor-pointer ${
              location.pathname === '/backtest'
                ? 'bg-neutral-surface text-primary border-neutral-ink shadow-hard'
                : 'text-neutral-ink border-transparent hover:border-neutral-border hover:bg-neutral-surface'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-sell shrink-0" />
            <span className="truncate">{t('nav.backtest')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigate('/fpo');
              onClose();
            }}
            className={`w-full p-2 text-left text-sm font-bold border-2 transition-all flex items-center gap-2 cursor-pointer ${
              location.pathname === '/fpo'
                ? 'bg-neutral-surface text-primary border-neutral-ink shadow-hard'
                : 'text-neutral-ink border-transparent hover:border-neutral-border hover:bg-neutral-surface'
            }`}
          >
            <Users className="w-4 h-4 text-secondary shrink-0" />
            <span className="truncate">{t('nav.fpo')}</span>
          </button>

          {onOpenCalculator && (
            <button
              type="button"
              onClick={() => {
                onOpenCalculator();
                onClose();
              }}
              className="w-full p-2 text-left text-sm font-bold text-neutral-ink border-2 border-transparent hover:border-neutral-border hover:bg-neutral-surface transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">Net-Return Calc</span>
            </button>
          )}

          {onOpenAlerts && (
            <button
              type="button"
              onClick={() => {
                onOpenAlerts();
                onClose();
              }}
              className="w-full p-2 text-left text-sm font-bold text-neutral-ink border-2 border-transparent hover:border-neutral-border hover:bg-neutral-surface transition-all flex items-center gap-2 cursor-pointer"
            >
              <Bell className="w-4 h-4 text-hold shrink-0" />
              <span className="truncate">{t('alerts.title')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const bizNumber = import.meta.env.VITE_WA_BUSINESS_NUMBER as string | undefined;
              if (bizNumber && bizNumber.trim()) {
                // Opens a direct chat window to the bot's real WhatsApp Business number
                window.open(`https://wa.me/${bizNumber.trim()}`, '_blank', 'noopener,noreferrer');
              } else {
                // Fallback: pre-fill a greeting so at least the intent is clear
                const greeting = 'नमस्कार, मला नाशिक बाजार समितीमधील कांदा विक्री सल्ला हवा आहे.';
                window.open(`https://wa.me/?text=${encodeURIComponent(greeting)}`, '_blank', 'noopener,noreferrer');
              }
              onClose();
            }}
            className="w-full p-2 text-left text-sm font-bold text-neutral-ink border-2 border-transparent hover:border-neutral-border hover:bg-neutral-surface transition-all flex items-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-sell shrink-0" />
            <span className="truncate">WhatsApp AI Bot</span>
          </button>
        </div>

        {/* Bottom User Profile Section */}
        <div ref={userMenuRef} className="p-2 border-t-2 border-neutral-border relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsUserMenuOpen(!isUserMenuOpen);
            }}
            className="w-full p-2.5 bg-neutral-bg border-2 border-neutral-ink flex items-center justify-between hover:bg-neutral-border transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 bg-primary text-primary-fg border border-neutral-ink flex items-center justify-center font-bold text-sm shrink-0">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-sm text-neutral-ink truncate">
                {(() => {
                  if (!phone) return '+91 9822012345';
                  const digits = phone.replace(/\D/g, '');
                  if (digits.length === 10) return `+91 ${digits}`;
                  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2)}`;
                  return phone.startsWith('+') ? phone : `+91 ${phone}`;
                })()}
              </span>
            </div>

            <ChevronDown className="w-4 h-4 text-neutral-ink shrink-0" />
          </button>

          {/* User Options Popover Menu */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-2 bg-neutral-surface border-2 border-neutral-ink shadow-hard z-50 py-1 divide-y divide-neutral-border">
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  navigate('/language');
                }}
                className="w-full text-left px-3 py-2 text-sm font-bold text-neutral-ink hover:bg-neutral-bg flex items-center gap-2.5 cursor-pointer"
              >
                <Globe className="w-4 h-4 text-primary" />
                <span>{t('chat.changeLanguage')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  navigate('/crops');
                }}
                className="w-full text-left px-3 py-2 text-sm font-bold text-neutral-ink hover:bg-neutral-bg flex items-center gap-2.5 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-secondary" />
                <span>{t('chat.changeCrops')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  const promptMsg =
                    currentLang === 'mr'
                      ? 'तुमचा १० अंकी मोबाईल नंबर प्रविष्ट करा:'
                      : currentLang === 'hi'
                      ? 'अपना १० अंकों का मोबाइल नंबर दर्ज करें:'
                      : 'Enter your 10-digit mobile number:';
                  const input = window.prompt(promptMsg, phone || '');
                  if (input !== null) {
                    const cleaned = input.replace(/\D/g, '').slice(0, 10);
                    if (cleaned.length === 10) {
                      login(cleaned);
                    }
                  }
                }}
                className="w-full text-left px-3 py-2 text-sm font-bold text-neutral-ink hover:bg-neutral-bg flex items-center gap-2.5 cursor-pointer"
              >
                <Phone className="w-4 h-4 text-primary" />
                <span>
                  {currentLang === 'mr'
                    ? 'मोबाईल नंबर बदला'
                    : currentLang === 'hi'
                    ? 'मोबाइल नंबर बदलें'
                    : 'Change Mobile Number'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm font-bold text-risk hover:bg-neutral-bg flex items-center gap-2.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('chat.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
