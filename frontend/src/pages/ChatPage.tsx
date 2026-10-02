import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowDown } from 'lucide-react';
import { Sidebar } from '../components/chat/Sidebar';
import { Header } from '../components/chat/Header';
import { MessageItem } from '../components/chat/MessageItem';
import { EmptyState } from '../components/chat/EmptyState';
import { InputBar } from '../components/chat/InputBar';
import { PriceAlertModal, getStoredAlerts } from '../components/chat/PriceAlertModal';
import { NetReturnCalculator } from '../components/chat/NetReturnCalculator';
import { useAppStore } from '../store/useAppStore';
import { sendMessage } from '../services/chat';
import type { Message, Language, Recommendation, CropId } from '../types';

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    createConversation,
    addMessage,
    updateMessageContent,
    setMessageFeedback,
    crops,
    language,
  } = useAppStore();

  const currentLang = (i18n.language as Language) || language || 'mr';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Price alert modal state
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertsCount, setAlertsCount] = useState(0);
  const [hasHitAlert, setHasHitAlert] = useState(false);

  // Net return calculator modal state
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorCrop, setCalculatorCrop] = useState<CropId>('onion');

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize alerts count on mount
  useEffect(() => {
    setAlertsCount(getStoredAlerts().length);
  }, []);

  // Synchronize active conversation with route parameter
  useEffect(() => {
    if (conversationId) {
      if (conversations.some((c) => c.id === conversationId)) {
        setActiveConversation(conversationId);
      } else {
        // If route id is invalid, create a new conversation
        const newId = createConversation();
        navigate(`/chat/${newId}`, { replace: true });
      }
    } else {
      // If at /chat without ID: load last active or create a new chat
      if (activeConversationId && conversations.some((c) => c.id === activeConversationId)) {
        navigate(`/chat/${activeConversationId}`, { replace: true });
      } else if (conversations.length > 0) {
        navigate(`/chat/${conversations[0].id}`, { replace: true });
      } else {
        const newId = createConversation();
        navigate(`/chat/${newId}`, { replace: true });
      }
    }
  }, [conversationId, conversations.length]);

  // Find active conversation
  const currentConversation = conversations.find(
    (c) => c.id === (conversationId || activeConversationId)
  );

  // Scroll to bottom on new message / streaming update
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!showScrollBottom) {
      scrollToBottom('auto');
    }
  }, [currentConversation?.messages, isStreaming]);

  // Handle scroll detection for floating scroll down button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isFarFromBottom);
  };

  const handleNewChat = () => {
    const newId = createConversation();
    navigate(`/chat/${newId}`);
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleOpenCalculator = (cropId?: string) => {
    if (cropId && (cropId === 'onion' || cropId === 'tomato' || cropId === 'soybean')) {
      setCalculatorCrop(cropId as CropId);
    } else if (crops && crops.length > 0) {
      setCalculatorCrop(crops[0]);
    }
    setIsCalculatorOpen(true);
  };

  const handleSendMessage = async (text: string) => {
    if (!currentConversation) return;

    // 1. Add User Message
    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    addMessage(currentConversation.id, userMsg);

    // 2. Prepare Assistant Message Placeholder
    const assistantMsgId = `msg_bot_${Date.now() + 1}`;
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 1,
    };

    addMessage(currentConversation.id, assistantMsg);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await sendMessage({
        message: text,
        language: currentLang,
        crops,
        history: currentConversation.messages,
        signal: abortController.signal,
        onChunk: (accumulated) => {
          updateMessageContent(currentConversation.id, assistantMsgId, accumulated);
        },
        onDone: (fullText, recommendation) => {
          updateMessageContent(
            currentConversation.id,
            assistantMsgId,
            fullText,
            recommendation
          );
          setIsStreaming(false);
          abortControllerRef.current = null;
        },
        onError: (err) => {
          console.error('Chat error:', err);
          updateMessageContent(
            currentConversation.id,
            assistantMsgId,
            currentLang === 'mr'
              ? 'क्षमस्व, उत्तर मिळवण्यात त्रुटी आली. कृपया पुन्हा प्रयत्न करा.'
              : currentLang === 'hi'
              ? 'क्षमा करें, उत्तर प्राप्त करने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
              : 'Sorry, encountered an error generating advice. Please try again.'
          );
          setIsStreaming(false);
          abortControllerRef.current = null;
        },
      });
    } catch (e) {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerate = () => {
    if (!currentConversation || isStreaming) return;
    const msgs = currentConversation.messages;
    const lastUserMsg = [...msgs].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-bg">
      {/* Left Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNewChat={handleNewChat}
        onOpenCalculator={() => handleOpenCalculator()}
        onOpenAlerts={() => setIsAlertModalOpen(true)}
      />

      {/* Main Chat Work Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-neutral-bg relative">
        {/* Top Header */}
        <Header
          conversationTitle={currentConversation?.title}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenAlerts={() => setIsAlertModalOpen(true)}
          onOpenCalculator={() => handleOpenCalculator()}
          alertsCount={alertsCount}
          hasHitAlert={hasHitAlert}
        />

        {/* Message Stream Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
        >
          <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-between">
            {!currentConversation || currentConversation.messages.length === 0 ? (
              <EmptyState
                onSelectSuggestion={handleSendMessage}
                onOpenCalculator={handleOpenCalculator}
              />
            ) : (
              <div className="space-y-2">
                {currentConversation.messages.map((msg, idx) => {
                  const isLastAssistant =
                    idx === currentConversation.messages.length - 1 &&
                    msg.role === 'assistant';

                  return (
                    <MessageItem
                      key={msg.id}
                      message={msg}
                      isStreaming={isLastAssistant && isStreaming}
                      onRegenerate={isLastAssistant ? handleRegenerate : undefined}
                      onFeedback={(feedback) =>
                        setMessageFeedback(currentConversation.id, msg.id, feedback)
                      }
                      onOpenCalculator={handleOpenCalculator}
                    />
                  );
                })}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Floating Scroll to Bottom Button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            aria-label={t('chat.scrollToBottom')}
            className="absolute bottom-24 right-6 p-2.5 bg-neutral-surface border-2 border-neutral-ink shadow-hard rounded-full text-neutral-ink hover:bg-neutral-bg transition-all z-20 cursor-pointer"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
        )}

        {/* Sticky Input Bar at Bottom */}
        <InputBar
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          isStreaming={isStreaming}
          language={currentLang}
        />
      </div>

      {/* Price Alerts Modal */}
      <PriceAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        onAlertsChange={(count, hasHit) => {
          setAlertsCount(count);
          setHasHitAlert(hasHit);
        }}
      />

      {/* Net Return Calculator Modal */}
      {isCalculatorOpen && (
        <NetReturnCalculator
          isModal
          initialCrop={calculatorCrop}
          onClose={() => setIsCalculatorOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatPage;
