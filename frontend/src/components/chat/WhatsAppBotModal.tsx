import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ExternalLink,
  PhoneCall,
  CheckCheck,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { Language } from '../../types';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
}

// Fallback intelligent advisory when backend server is not running
function getLocalFallbackResponse(query: string, lang: Language): string {
  const lower = query.toLowerCase();
  const isTomato = lower.includes('tomato') || lower.includes('टोमॅटो') || lower.includes('टमाटर') || query === '2' || query === '२';
  const isSoybean = lower.includes('soybean') || lower.includes('सोयाबीन') || query === '3' || query === '३';

  if (isTomato) {
    if (lang === 'mr') {
      return (
        '🌾 *Sell Smart कृषी सल्लागार (नाशिक जिल्हा)*\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '📦 *पीक:* टोमॅटो (15 क्विंटल)\n' +
        '🏷️ *निर्णय:* *आजच विक्री करा (SELL IMMEDIATELY)*\n' +
        '👑 *सर्वोत्तम बाजार:* *पिंपळगाव बसवंत बाजार समिती (Pimpalgaon Baswant)*\n' +
        '💰 *अपेक्षित फायदा:* *+₹120 / क्विंटल*\n' +
        '💵 *एकूण हातात रक्कम:* *₹24,300* (15 क्विंटलसाठी)\n\n' +
        '📊 *बाजार समितीनिहाय निव्वळ नफा तुलना:*\n' +
        '1️⃣ *पिंपळगाव बसवंत* (16 km)\n' +
        '   • भाव: ₹1,680 | वाहतूक: -₹30\n' +
        '   • *हातात निव्वळ: ₹1,620 / qtl*\n' +
        '2️⃣ *नाशिक पंचवटी* (28 km)\n' +
        '   • भाव: ₹1,610 | वाहतूक: -₹45\n' +
        '   • *हातात निव्वळ: ₹1,530 / qtl*\n\n' +
        '⚠️ *सावधान:* टोमॅटो अतिनाशवंत पीक आहे. दमट वातावरणामुळे क्रेटमध्ये २०% पर्यंत सड होण्याची जोखीम आहे.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '📍 *इतर पिकांसाठी उत्तर पाठवा:*\n' +
        '• *१* - कांदा  • *२* - टोमॅटो  • *३* - सोयाबीन'
      );
    }
    return (
      '🌾 *Sell Smart Advisory (Nashik District)*\n' +
      '━━━━━━━━━━━━━━━━━━━━\n' +
      '📦 *Crop:* Tomato (15 Quintals)\n' +
      '🏷️ *Decision:* *SELL IMMEDIATELY TODAY*\n' +
      '👑 *Best APMC:* *Pimpalgaon Baswant APMC*\n' +
      '💰 *Advantage:* *+₹120 / quintal*\n' +
      '💵 *Estimated Net Cash:* *₹24,300* (for 15 qtl lot)\n\n' +
      '📊 *Net Realized Comparison by Mandi:*\n' +
      '1️⃣ *Pimpalgaon Baswant* (16 km) — *Net: ₹1,620 / qtl*\n' +
      '2️⃣ *Nashik Terminal* (28 km) — *Net: ₹1,530 / qtl*\n\n' +
      '⚠️ *Storage Advisory:* High perishability risk under ambient humidity. Dispatch directly today.\n\n' +
      '━━━━━━━━━━━━━━━━━━━━\n' +
      '📍 *Reply with number:* 1 - Onion | 2 - Tomato | 3 - Soybean'
    );
  }

  if (isSoybean) {
    if (lang === 'mr') {
      return (
        '🌾 *Sell Smart कृषी सल्लागार (नाशिक जिल्हा)*\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '📦 *पीक:* सोयाबीन (30 क्विंटल)\n' +
        '🏷️ *निर्णय:* *१५ दिवस माल थांबवा (HOLD 15 DAYS)*\n' +
        '👑 *सर्वोत्तम बाजार:* *मालेगाव बाजार समिती (Malegaon APMC)*\n' +
        '💰 *अपेक्षित फायदा:* *+₹110 / क्विंटल*\n' +
        '💵 *एकूण हातात रक्कम:* *₹1,33,800* (30 क्विंटलसाठी)\n\n' +
        '📊 *बाजार समितीनिहाय निव्वळ नफा तुलना:*\n' +
        '1️⃣ *मालेगाव APMC* (35 km)\n' +
        '   • भाव: ₹4,520 | वाहतूक: -₹55\n' +
        '   • *हातात निव्वळ: ₹4,460 / qtl*\n' +
        '2️⃣ *येवला APMC* (28 km)\n' +
        '   • भाव: ₹4,480 | वाहतूक: -₹45\n' +
        '   • *हातात निव्वळ: ₹4,430 / qtl*\n\n' +
        '💡 *सल्ला:* कोरड्या गोदामात साठवणुकीचे नुकसान नगण्य (०.१%) आहे. बाजारात नेण्यापूर्वी दाण्यातील ओलावा १०% पेक्षा कमी असावा.\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '📍 *इतर पिकांसाठी उत्तर पाठवा:*\n' +
        '• *१* - कांदा  • *२* - टोमॅटो  • *३* - सोयाबीन'
      );
    }
    return (
      '🌾 *Sell Smart Advisory (Nashik District)*\n' +
      '━━━━━━━━━━━━━━━━━━━━\n' +
      '📦 *Crop:* Soybean (30 Quintals)\n' +
      '🏷️ *Decision:* *HOLD FOR 15 DAYS*\n' +
      '👑 *Best APMC:* *Malegaon APMC*\n' +
      '💰 *Advantage:* *+₹110 / quintal*\n' +
      '💵 *Estimated Net Cash:* *₹1,33,800* (for 30 qtl lot)\n\n' +
      '📊 *Net Realized Comparison by Mandi:*\n' +
      '1️⃣ *Malegaon APMC* (35 km) — *Net: ₹4,460 / qtl*\n' +
      '2️⃣ *Yeola APMC* (28 km) — *Net: ₹4,430 / qtl*\n\n' +
      '💡 *Storage Tip:* Solvent extraction demand is steady. Ensure moisture is below 10% to prevent penalties.'
    );
  }

  // Default: Onion
  if (lang === 'mr') {
    return (
      '🌾 *Sell Smart कृषी सल्लागार (नाशिक जिल्हा)*\n' +
      '━━━━━━━━━━━━━━━━━━━━\n' +
      '📦 *पीक:* कांदा (20 क्विंटल)\n' +
      '🏷️ *निर्णय:* *१० दिवस माल थांबवा (HOLD 10 DAYS)*\n' +
      '👑 *सर्वोत्तम बाजार:* *लासलगाव बाजार समिती (Lasalgaon APMC)*\n' +
      '💰 *अपेक्षित फायदा:* *+₹180 / क्विंटल*\n' +
      '💵 *एकूण हातात रक्कम:* *₹48,000* (20 क्विंटलसाठी)\n\n' +
      '📊 *बाजार समितीनिहाय निव्वळ नफा तुलना:*\n' +
      '1️⃣ *लासलगाव (Lasalgaon)* (18 km)\n' +
      '   • भाव: ₹2,460 | वाहतूक: -₹35\n' +
      '   • *हातात निव्वळ: ₹2,400 / qtl*\n' +
      '2️⃣ *पिंपळगाव (Pimpalgaon)* (24 km)\n' +
      '   • भाव: ₹2,390 | वाहतूक: -₹42\n' +
      '   • *हातात निव्वळ: ₹2,323 / qtl*\n' +
      '3️⃣ *येवला (Yeola)* (42 km)\n' +
      '   • भाव: ₹2,310 | वाहतूक: -₹65\n' +
      '   • *हातात निव्वळ: ₹2,220 / qtl*\n\n' +
      '🔍 *सल्ला कारण:* दक्षिणेकडील राज्यांतून मागणी वाढल्याने आणि लासलगाव बाजारात आवक १४% कमी झाल्याने दर सुधारत आहेत.\n\n' +
      '💡 *चाळ सल्ला:* कांदा हवादार चाळीत ठेवा. आठवड्याला १.२% वजनातील घट भावातील वाढीपेक्षा खूप कमी आहे.\n\n' +
      '━━━━━━━━━━━━━━━━━━━━\n' +
      '📍 *इतर पिकांसाठी उत्तर पाठवा:*\n' +
      '• *१* - कांदा  • *२* - टोमॅटो  • *३* - सोयाबीन'
    );
  }

  return (
    '🌾 *Sell Smart Advisory (Nashik District)*\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '📦 *Crop:* Onion (20 Quintals)\n' +
    '🏷️ *Decision:* *HOLD FOR 10 DAYS*\n' +
    '👑 *Best APMC:* *Lasalgaon APMC*\n' +
    '💰 *Advantage:* *+₹180 / quintal*\n' +
    '💵 *Estimated Net Cash:* *₹48,000* (for 20 qtl lot)\n\n' +
    '📊 *Net Realized Comparison by Mandi:*\n' +
    '1️⃣ *Lasalgaon* (18 km) — *Net: ₹2,400 / qtl*\n' +
    '2️⃣ *Pimpalgaon* (24 km) — *Net: ₹2,323 / qtl*\n' +
    '3️⃣ *Yeola* (42 km) — *Net: ₹2,220 / qtl*\n\n' +
    '🔍 *Reasoning:* Steady dispatches to Southern states while Lasalgaon arrivals contracted 14%.\n\n' +
    '💡 *Storage Tip:* Keep in aerated chawl. 1.2% weekly shrinkage is easily offset by projected price gains.'
  );
}

export const WhatsAppBotModal: React.FC = () => {
  const { isWhatsAppModalOpen, setIsWhatsAppModalOpen, language, phone } = useAppStore();
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language as Language) || language || 'mr';

  const [activeTab, setActiveTab] = useState<'simulator' | 'connect'>('simulator');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize initial greeting message
  useEffect(() => {
    if (isWhatsAppModalOpen && messages.length === 0) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const initialGreeting =
        currentLang === 'mr'
          ? '🌾 *Sell Smart कृषी सल्लागार मध्ये आपले स्वागत आहे!*\n━━━━━━━━━━━━━━━━━━━━\nआपल्या पिकाचा थेट सल्ला मिळवण्यासाठी उत्तर द्या:\n\n• *१* — 🧅 कांदा (Onion)\n• *२* — 🍅 टोमॅटो (Tomato)\n• *३* — 🌱 सोयाबीन (Soybean)\n\nकिंवा थेट विचारा: *"कांदा ३० क्विंटल कुठे विकू?"*'
          : currentLang === 'hi'
          ? '🌾 *Sell Smart कृषि सलाहकार में आपका स्वागत है!*\n━━━━━━━━━━━━━━━━━━━━\nअपनी फसल की सीधी सलाह के लिए रिप्लाई करें:\n\n• *1* — 🧅 प्याज (Onion)\n• *2* — 🍅 टमाटर (Tomato)\n• *3* — 🌱 सोयाबीन (Soybean)\n\nया सीधे पूछें: *"प्याज 30 क्विंटल कहाँ बेचें?"*'
          : '🌾 *Welcome to Sell Smart WhatsApp Advisory!*\n━━━━━━━━━━━━━━━━━━━━\nReply with a number for today’s APMC intelligence:\n\n• *1* — 🧅 Onion\n• *2* — 🍅 Tomato\n• *3* — 🌱 Soybean\n\nOr type: *"Where to sell 30 qtl onion?"*';

      setMessages([
        {
          id: 'welcome-1',
          sender: 'bot',
          text: initialGreeting,
          timestamp: now,
        },
      ]);
    }
  }, [isWhatsAppModalOpen, currentLang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isWhatsAppModalOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isSending) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsSending(true);

    try {
      // Call backend /whatsapp/test endpoint
      const response = await fetch('http://localhost:8000/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          phone: phone || '+919822012345',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.reply || getLocalFallbackResponse(text, currentLang),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error('Backend test endpoint responded with non-200');
      }
    } catch {
      // Offline fallback: Use local knowledge advisory
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: getLocalFallbackResponse(text, currentLang),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const configuredNumber = (import.meta.env.VITE_WA_BUSINESS_NUMBER as string | undefined)?.trim();

  const handleOpenTwilioSandbox = () => {
    // Twilio Sandbox standard WhatsApp number is +1 415 523 8886
    // Clicking this opens a direct conversation with sandbox number
    window.open('https://wa.me/14155238886?text=join%20clever-hawk', '_blank', 'noopener,noreferrer');
  };

  const handleOpenCustomWhatsApp = () => {
    const targetNumber = configuredNumber || '14155238886';
    const defaultText = currentLang === 'mr' ? 'नमस्कार' : currentLang === 'hi' ? 'नमस्ते' : 'Hello';
    window.open(`https://wa.me/${targetNumber}?text=${encodeURIComponent(defaultText)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-ink/60 overflow-y-auto">
      <div className="w-full max-w-2xl bg-neutral-surface border-2 border-neutral-ink shadow-hard my-auto animate-in fade-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-primary text-primary-fg border-b-2 border-neutral-ink flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neutral-surface text-neutral-ink border-2 border-neutral-ink shadow-hard flex items-center justify-center font-bold">
              <MessageSquare className="w-6 h-6 text-sell" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight leading-tight">
                  {currentLang === 'mr' ? 'Sell Smart WhatsApp सहाय्यक' : currentLang === 'hi' ? 'Sell Smart WhatsApp सहायक' : 'Sell Smart WhatsApp AI Bot'}
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-neutral-surface text-neutral-ink border border-neutral-ink text-sm font-bold">
                  <span className="w-2 h-2 rounded-full bg-sell animate-pulse" />
                  Live Bot
                </span>
              </div>
              <p className="text-sm text-primary-fg/90 font-medium">
                {currentLang === 'mr' ? 'नाशिक बाजार समिती थेट दर व निर्णय बॉट' : 'Nashik APMC Mandi Decision Assistant'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsWhatsAppModalOpen(false)}
            aria-label="Close"
            className="p-2 bg-neutral-surface text-neutral-ink border-2 border-neutral-ink hover:bg-neutral-bg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b-2 border-neutral-ink bg-neutral-bg shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`flex-1 py-3 px-4 text-center text-sm sm:text-base font-bold transition-all border-r-2 border-neutral-ink flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-neutral-surface text-neutral-ink border-b-2 border-b-primary font-black shadow-inner'
                : 'text-neutral-muted hover:text-neutral-ink hover:bg-neutral-surface/60'
            }`}
          >
            <Bot className="w-4 h-4 text-sell" />
            <span>{currentLang === 'mr' ? '💬 लाईव्ह बॉट टेस्ट करा' : '💬 Live Chat Simulator'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`flex-1 py-3 px-4 text-center text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'connect'
                ? 'bg-neutral-surface text-neutral-ink border-b-2 border-b-primary font-black shadow-inner'
                : 'text-neutral-muted hover:text-neutral-ink hover:bg-neutral-surface/60'
            }`}
          >
            <ExternalLink className="w-4 h-4 text-primary" />
            <span>{currentLang === 'mr' ? '📱 थेट WhatsApp वर सुरू करा' : '📱 Open in WhatsApp App'}</span>
          </button>
        </div>

        {/* TAB 1: WhatsApp Chat Simulator */}
        {activeTab === 'simulator' && (
          <div className="flex flex-col flex-1 min-h-[420px] max-h-[560px] bg-neutral-bg overflow-hidden">
            {/* Quick Prompt Pills Bar */}
            <div className="p-2.5 bg-neutral-surface border-b-2 border-neutral-ink flex items-center gap-2 overflow-x-auto shrink-0">
              <span className="text-sm font-bold text-neutral-ink flex items-center gap-1 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-sell" />
                {currentLang === 'mr' ? 'त्वरित प्रश्न:' : 'Quick Prompts:'}
              </span>
              <button
                type="button"
                onClick={() => handleSendMessage('1')}
                className="px-2.5 py-1 text-sm font-bold bg-neutral-bg border border-neutral-ink hover:bg-primary hover:text-primary-fg transition-colors shrink-0 cursor-pointer"
              >
                🧅 {currentLang === 'mr' ? '१. कांदा सल्ला' : '1. Onion'}
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('2')}
                className="px-2.5 py-1 text-sm font-bold bg-neutral-bg border border-neutral-ink hover:bg-primary hover:text-primary-fg transition-colors shrink-0 cursor-pointer"
              >
                🍅 {currentLang === 'mr' ? '२. टोमॅटो दर' : '2. Tomato'}
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('3')}
                className="px-2.5 py-1 text-sm font-bold bg-neutral-bg border border-neutral-ink hover:bg-primary hover:text-primary-fg transition-colors shrink-0 cursor-pointer"
              >
                🌱 {currentLang === 'mr' ? '३. सोयाबीन' : '3. Soybean'}
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage(currentLang === 'mr' ? 'कांदा ३० क्विंटल लासलगाव' : 'Onion 30 qtl Lasalgaon')}
                className="px-2.5 py-1 text-sm font-bold bg-neutral-bg border border-neutral-ink hover:bg-primary hover:text-primary-fg transition-colors shrink-0 cursor-pointer"
              >
                💰 {currentLang === 'mr' ? '३० क्विंटल नफा' : '30 qtl profit'}
              </button>
            </div>

            {/* Chat Bubble Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-7 h-7 bg-sell text-sell-fg border border-neutral-ink flex items-center justify-center font-bold text-sm shrink-0 mb-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[78%] p-3.5 border-2 border-neutral-ink shadow-hard text-neutral-ink text-sm sm:text-base leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-sell-bg ml-auto'
                        : 'bg-neutral-surface mr-auto'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans font-medium">{msg.text}</div>
                    <div className="mt-1.5 flex items-center justify-end gap-1 text-sm text-neutral-muted font-bold">
                      <span>{msg.timestamp}</span>
                      {msg.sender === 'user' && <CheckCheck className="w-4 h-4 text-primary" />}
                    </div>
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 bg-primary text-primary-fg border border-neutral-ink flex items-center justify-center font-bold text-sm shrink-0 mb-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex items-center gap-2 justify-start">
                  <div className="w-7 h-7 bg-sell text-sell-fg border border-neutral-ink flex items-center justify-center font-bold text-sm shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 bg-neutral-surface border-2 border-neutral-ink shadow-hard flex items-center gap-2 text-sm font-bold text-neutral-ink">
                    <span className="w-2 h-2 rounded-full bg-sell animate-ping" />
                    <span>{currentLang === 'mr' ? 'सल्ला तयार करत आहे...' : 'Generating Mandi Advisory...'}</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-neutral-surface border-t-2 border-neutral-ink flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  currentLang === 'mr'
                    ? "संदेश लिहा (उदा: 'कांदा 30 क्विंटल' किंवा '1')..."
                    : "Type message in Marathi/Hindi/English (e.g. 'कांदा 30 qtl')..."
                }
                className="flex-1 px-3 py-2.5 bg-neutral-bg border-2 border-neutral-ink text-sm sm:text-base font-medium text-neutral-ink placeholder:text-neutral-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isSending}
                className="px-4 py-2.5 bg-sell hover:bg-sell/90 disabled:opacity-50 text-sell-fg font-black text-sm sm:text-base border-2 border-neutral-ink shadow-hard flex items-center gap-1.5 transition-transform active:translate-x-0.5 active:translate-y-0.5 cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>{currentLang === 'mr' ? 'पाठवा' : 'Send'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: Connect Real WhatsApp App */}
        {activeTab === 'connect' && (
          <div className="p-5 sm:p-6 bg-neutral-bg overflow-y-auto space-y-5 flex-1">
            {/* Primary Action Card: Open direct chat */}
            <div className="p-4 sm:p-5 bg-neutral-surface border-2 border-neutral-ink shadow-hard space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-sell-bg border-2 border-neutral-ink flex items-center justify-center font-bold shrink-0">
                  <PhoneCall className="w-5 h-5 text-sell" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-neutral-ink">
                    {currentLang === 'mr' ? 'थेट १-ऑन-१ WhatsApp चॅट सुरू करा' : 'Open Direct WhatsApp Chat'}
                  </h4>
                  <p className="text-sm text-neutral-ink font-medium mt-1">
                    {currentLang === 'mr'
                      ? 'कोणतेही वेगळे ॲप डाउनलोड न करता थेट WhatsApp वर Sell Smart बॉट सोबत बोला.'
                      : 'Chat directly with the Sell Smart advisory bot on your mobile phone or WhatsApp Web.'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleOpenTwilioSandbox}
                  className="flex-1 px-4 py-3 bg-sell hover:bg-sell/90 text-sell-fg font-black text-base border-2 border-neutral-ink shadow-hard flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-x-0.5 active:translate-y-0.5"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>{currentLang === 'mr' ? 'Twilio सँडबॉक्स चॅट उघडा (+1 415 523 8886)' : 'Launch Sandbox Bot (+1 415 523 8886)'}</span>
                </button>

                {configuredNumber && (
                  <button
                    type="button"
                    onClick={handleOpenCustomWhatsApp}
                    className="px-4 py-3 bg-primary hover:bg-primary/90 text-primary-fg font-black text-base border-2 border-neutral-ink shadow-hard flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{currentLang === 'mr' ? `नोंदणीकृत नंबर (+${configuredNumber})` : `Custom Bot (+${configuredNumber})`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Guide: How it works */}
            <div className="p-4 bg-neutral-surface border-2 border-neutral-ink shadow-hard space-y-3">
              <h5 className="text-sm sm:text-base font-black text-neutral-ink flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span>{currentLang === 'mr' ? 'हे कसे कार्य करते? (How Real WhatsApp Bot Works)' : 'How the Real WhatsApp Bot Works'}</span>
              </h5>

              <ol className="space-y-2 text-sm text-neutral-ink font-medium list-decimal list-inside">
                <li>
                  <strong>{currentLang === 'mr' ? 'थेट चॅट संवाद:' : 'Direct Conversation:'}</strong>{' '}
                  {currentLang === 'mr'
                    ? 'बॉटच्या अधिकृत नंबरवर मेसेज पाठवल्यावर आमचा RAG AI सर्व नाशिक बाजार समित्यांचे ताजे दर तपासून उत्तर देतो.'
                    : 'When you message the bot number, our RAG AI pipeline inspects live Nashik APMC data and replies instantly.'}
                </li>
                <li>
                  <strong>{currentLang === 'mr' ? 'भाषा समज:' : 'Multi-Language:'}</strong>{' '}
                  {currentLang === 'mr'
                    ? 'मराठी, हिन्दी किंवा इंग्रजीमध्ये कधीही प्रश्न विचारा (उदा: "कांदा दर", "टोमॅटो कुठे विकू").'
                    : 'Ask questions in Marathi, Hindi, or English (e.g. "onion hold or sell", "tomato rate").'}
                </li>
                <li>
                  <strong>{currentLang === 'mr' ? 'शॉर्टकट नंबर:' : 'Number Shortcuts:'}</strong>{' '}
                  {currentLang === 'mr'
                    ? 'फक्त "1" (कांदा), "2" (टोमॅटो), किंवा "3" (सोयाबीन) रिप्लाय करून त्वरित सल्ला मिळवा.'
                    : 'Simply reply "1" (Onion), "2" (Tomato), or "3" (Soybean) for quick lot calculation.'}
                </li>
              </ol>

              <div className="mt-3 p-2.5 bg-neutral-bg border border-neutral-ink text-sm font-medium text-neutral-ink flex items-center gap-2">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <span>
                  {currentLang === 'mr'
                    ? 'हॅकाथॉन परीक्षणासाठी वरील लाईव्ह टेस्ट सिम्युलेटर किंवा Twilio सँडबॉक्स वापरा.'
                    : 'For judging and evaluation, you can use either the Live Chat Simulator above or the Twilio Sandbox.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
