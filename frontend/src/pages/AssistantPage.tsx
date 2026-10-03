import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { sendChatMessage } from '../api';
import type { ChatMessage, ChatRequest } from '../api/types';
import { RecommendationCard } from '../components/assistant/RecommendationCard';
import { CROPS } from '../config/crops';
import { VILLAGES } from '../config/villages';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Bot,
  User,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

// SpeechRecognition type declarations for browser support
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export const AssistantPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.slice(0, 2) as 'mr' | 'hi' | 'en';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form helper state
  const [showHelper, setShowHelper] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState('onion');
  const [quantity, setQuantity] = useState(30);
  const [selectedVillage, setSelectedVillage] = useState('niphad_rural');

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Speech Synthesis state
  const [autoRead, setAutoRead] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const windowObj = window as IWindow;
    const SpeechRec = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (SpeechRec) {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = currentLang === 'mr' ? 'mr-IN' : currentLang === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInterimTranscript(transcript);
        setInputText(transcript);
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }
  }, [currentLang]);

  // Initial welcome greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greetingText =
        currentLang === 'mr'
          ? 'राम राम शेतकरी मित्रा! मी तुमचा "Mohra" बाजार सल्लागार. तुमच्याकडे कोणते पीक आहे, किती क्विंटल आहे आणि तुमचे गाव कोणते? मला सांगा किंवा खालील माइक बटन दाबून बोला.'
          : currentLang === 'hi'
          ? 'नमस्ते किसान भाई! मैं आपका "Mohra" मंडी सलाहकार हूँ। आपके पास कौन सी फसल है, कितनी मात्रा है और आपका गांव कौन सा है? मुझे बताएं या माइक बटन दबाकर बोलें।'
          : 'Hello Farmer! I am your "Mohra" decision assistant. What crop do you have, how many quintals, and which village in Nashik? Tell me or tap the mic to speak.';

      setMessages([
        {
          id: 'msg-welcome',
          sender: 'assistant',
          text: greetingText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [currentLang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert(t('assistant.unsupportedSpeech'));
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = currentLang === 'mr' ? 'mr-IN' : currentLang === 'hi' ? 'hi-IN' : 'en-IN';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Mic start error:', err);
      }
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLang === 'mr' ? 'mr-IN' : currentLang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.95;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || loading) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const req: ChatRequest = {
        message: query,
        language: currentLang,
        crop: selectedCrop,
        quantity,
        village: selectedVillage,
      };

      const response = await sendChatMessage(req);

      // Simulate streaming word-by-word token effect
      const assistantId = `asst-${Date.now()}`;
      const fullText = response.text;

      const placeholderMsg: ChatMessage = {
        id: assistantId,
        sender: 'assistant',
        text: '',
        recommendation: response.recommendation,
        sources: response.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, placeholderMsg]);

      // Stream text into message
      const words = fullText.split(' ');
      let currentIdx = 0;
      const interval = setInterval(() => {
        if (currentIdx < words.length) {
          const partial = words.slice(0, currentIdx + 1).join(' ');
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, text: partial } : m))
          );
          currentIdx++;
        } else {
          clearInterval(interval);
          if (autoRead) {
            speakText(fullText);
          }
        }
      }, 35);
    } catch (err: any) {
      setError(err?.message || 'Failed to get recommendation. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyHelper = () => {
    const cropObj = CROPS[selectedCrop];
    const villageObj = VILLAGES.find((v) => v.id === selectedVillage);
    const cropName = currentLang === 'mr' ? cropObj.name_mr : currentLang === 'hi' ? cropObj.name_hi : cropObj.name;
    const villageName = currentLang === 'mr' ? villageObj?.name_mr : villageObj?.name;

    const query =
      currentLang === 'mr'
        ? `माझ्याकडे ${cropName} ${quantity} क्विंटल आहे, गाव: ${villageName}. कुठे आणि कधी विकू?`
        : currentLang === 'hi'
        ? `मेरे पास ${cropName} ${quantity} क्विंटल है, गांव: ${villageName}। कहाँ और कब बेचूँ?`
        : `I have ${quantity} quintals of ${cropName} in ${villageName}. Where and when should I sell?`;

    setShowHelper(false);
    handleSendMessage(query);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-w-4xl mx-auto py-2">
      {/* Top Helper Bar */}
      <div className="bg-neutral-surface border-2 border-neutral-ink p-3 mb-3 shadow-hard flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-neutral-ink">
            {t('assistant.title')}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto Read Toggle */}
          <button
            type="button"
            onClick={() => setAutoRead(!autoRead)}
            className={`flex items-center gap-1.5 px-3 py-1 text-sm font-semibold border ${
              autoRead ? 'bg-primary text-primary-fg border-neutral-ink' : 'bg-neutral-bg text-neutral-ink border-neutral-border'
            }`}
          >
            {autoRead ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{t('assistant.autoVoice')}</span>
          </button>

          {/* Collapsible Quick Details Toggle */}
          <button
            type="button"
            onClick={() => setShowHelper(!showHelper)}
            className="flex items-center gap-1.5 px-3 py-1 bg-neutral-bg border-2 border-neutral-ink text-sm font-bold text-neutral-ink hover:bg-neutral-border"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{t('assistant.quickDetails')}</span>
            {showHelper ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Quick Details Helper Panel */}
      {showHelper && (
        <div className="bg-neutral-bg border-2 border-neutral-ink p-4 mb-3 shadow-hard space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-neutral-ink mb-1">
                {t('assistant.crop')}
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full h-11 px-3 bg-neutral-surface border-2 border-neutral-ink text-base font-bold text-neutral-ink"
              >
                {Object.values(CROPS).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {currentLang === 'mr' ? c.name_mr : currentLang === 'hi' ? c.name_hi : c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-ink mb-1">
                {t('assistant.quantity')}
              </label>
              <input
                type="number"
                min="1"
                max="5000"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full h-11 px-3 bg-neutral-surface border-2 border-neutral-ink text-base font-bold text-neutral-ink"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-ink mb-1">
                {t('assistant.village')}
              </label>
              <select
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                className="w-full h-11 px-3 bg-neutral-surface border-2 border-neutral-ink text-base font-bold text-neutral-ink"
              >
                {VILLAGES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {currentLang === 'mr' ? v.name_mr : v.name} ({v.taluka})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleApplyHelper}
              className="px-5 py-2.5 bg-primary text-primary-fg text-base font-bold border-2 border-neutral-ink shadow-hard hover:bg-primary-hover active:translate-x-0.5 active:translate-y-0.5"
            >
              {currentLang === 'mr' ? 'सल्ला मिळवा' : currentLang === 'hi' ? 'सलाह प्राप्त करें' : 'Get Recommendation'}
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 px-2 py-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-9 h-9 bg-primary text-primary-fg flex items-center justify-center font-bold border-2 border-neutral-ink shrink-0 mt-1">
                <Bot className="w-5 h-5" />
              </div>
            )}

            <div className="max-w-[88%] space-y-2">
              <div
                className={`p-4 border-2 border-neutral-ink shadow-hard leading-relaxed text-base font-medium ${
                  msg.sender === 'user'
                    ? 'bg-primary-subtle text-neutral-ink'
                    : 'bg-neutral-surface text-neutral-ink'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {msg.sender === 'assistant' && (
                  <div className="flex items-center justify-between border-t border-neutral-border pt-2 mt-3">
                    <span className="text-xs text-neutral-muted">{msg.timestamp}</span>
                    <button
                      type="button"
                      onClick={() => speakText(msg.text)}
                      className="flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{t('assistant.speak')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Render Structured Recommendation Card if present */}
              {msg.recommendation && (
                <RecommendationCard
                  recommendation={msg.recommendation}
                  sources={msg.sources}
                  totalQuantity={quantity}
                />
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-9 h-9 bg-neutral-bg text-neutral-ink flex items-center justify-center font-bold border-2 border-neutral-ink shrink-0 mt-1">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Bubble */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-primary text-primary-fg flex items-center justify-center font-bold border-2 border-neutral-ink shrink-0 mt-1">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-neutral-surface border-2 border-neutral-ink p-4 shadow-hard flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-spin" />
              <span className="text-base font-bold text-neutral-ink">
                {currentLang === 'mr'
                  ? 'बाजार दर व वाहतूक खर्च तपासत आहे...'
                  : 'Analyzing mandi rates & transport economics...'}
              </span>
            </div>
          </div>
        )}

        {/* Error Alert with Retry */}
        {error && (
          <div className="bg-neutral-bg border-2 border-signal p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-base text-neutral-ink">
              <AlertCircle className="w-5 h-5 text-signal" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => handleSendMessage()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-surface border-2 border-neutral-ink text-sm font-bold"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick-Start Chips */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 px-1">
        <button
          type="button"
          onClick={() => handleSendMessage(t('assistant.chips.onion'))}
          className="whitespace-nowrap px-3.5 py-1.5 bg-neutral-surface border-2 border-neutral-border text-sm font-bold text-neutral-ink hover:border-neutral-ink active:translate-x-0.5 active:translate-y-0.5"
        >
          🧅 {t('assistant.chips.onion')}
        </button>
        <button
          type="button"
          onClick={() => handleSendMessage(t('assistant.chips.tomato'))}
          className="whitespace-nowrap px-3.5 py-1.5 bg-neutral-surface border-2 border-neutral-border text-sm font-bold text-neutral-ink hover:border-neutral-ink active:translate-x-0.5 active:translate-y-0.5"
        >
          🍅 {t('assistant.chips.tomato')}
        </button>
        <button
          type="button"
          onClick={() => handleSendMessage(t('assistant.chips.soybean'))}
          className="whitespace-nowrap px-3.5 py-1.5 bg-neutral-surface border-2 border-neutral-border text-sm font-bold text-neutral-ink hover:border-neutral-ink active:translate-x-0.5 active:translate-y-0.5"
        >
          🌱 {t('assistant.chips.soybean')}
        </button>
      </div>

      {/* Sticky Bottom Input Bar */}
      <div className="bg-neutral-surface border-2 border-neutral-ink p-3 shadow-hard space-y-2">
        {/* Live Listening Waveform / Indicator */}
        {isListening && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-hold-bg border border-hold text-sm font-bold text-hold animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-signal rounded-full"></span>
              <span>{t('assistant.listening')}</span>
            </div>
            {interimTranscript && <span className="font-normal italic truncate max-w-xs">{interimTranscript}</span>}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Large Mic Button for Voice Input */}
          <button
            type="button"
            onClick={toggleListening}
            aria-label="Voice Input"
            className={`w-14 h-14 flex items-center justify-center border-2 border-neutral-ink font-bold transition-all shrink-0 ${
              isListening
                ? 'bg-signal text-neutral-surface shadow-hard animate-bounce'
                : 'bg-neutral-bg text-neutral-ink hover:bg-neutral-border active:translate-x-0.5 active:translate-y-0.5'
            }`}
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('assistant.placeholder')}
            className="flex-1 h-14 px-4 text-base bg-neutral-bg border-2 border-neutral-ink text-neutral-ink placeholder:text-neutral-muted focus:border-primary focus:bg-neutral-surface font-medium"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            aria-label="Send message"
            className="h-14 px-6 bg-primary text-primary-fg text-base font-bold border-2 border-neutral-ink shadow-hard hover:bg-primary-hover active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 flex items-center gap-2 shrink-0"
          >
            <span>{t('assistant.send')}</span>
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
