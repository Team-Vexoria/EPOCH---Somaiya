import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Language, CropId, Conversation, Message, Recommendation } from '../types';
import { STORAGE_KEY } from '../config/constants';
import i18n from '../i18n';

interface AppState {
  // Auth
  phone: string | null;
  isLoggedIn: boolean;

  // Preferences / Onboarding
  language: Language;
  crops: CropId[];
  onboardingComplete: boolean;

  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;

  // Actions
  login: (phone: string) => void;
  logout: () => void;
  setLanguage: (lang: Language) => void;
  setCrops: (crops: CropId[]) => void;
  completeOnboarding: () => void;

  createConversation: (initialTitle?: string) => string;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessageContent: (
    conversationId: string,
    messageId: string,
    content: string,
    recommendation?: Recommendation
  ) => void;
  renameConversation: (id: string, newTitle: string) => void;
  deleteConversation: (id: string) => void;
  setMessageFeedback: (
    conversationId: string,
    messageId: string,
    feedback: 'up' | 'down'
  ) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      phone: null,
      isLoggedIn: false,

      language: 'mr',
      crops: [],
      onboardingComplete: false,

      conversations: [],
      activeConversationId: null,

      login: (phone: string) => {
        set({ phone, isLoggedIn: true });
      },

      logout: () => {
        set({
          phone: null,
          isLoggedIn: false,
          onboardingComplete: false,
          crops: [],
          activeConversationId: null,
        });
      },

      setLanguage: (lang: Language) => {
        set({ language: lang });
        i18n.changeLanguage(lang);
      },

      setCrops: (crops: CropId[]) => {
        set({ crops });
      },

      completeOnboarding: () => {
        set({ onboardingComplete: true });
      },

      createConversation: (initialTitle?: string) => {
        const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newConv: Conversation = {
          id,
          title: initialTitle || (get().language === 'mr' ? 'नवीन संवाद' : get().language === 'hi' ? 'नई बातचीत' : 'New Chat'),
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          conversations: [newConv, ...state.conversations],
          activeConversationId: id,
        }));

        return id;
      },

      setActiveConversation: (id: string | null) => {
        set({ activeConversationId: id });
      },

      addMessage: (conversationId: string, message: Message) => {
        set((state) => {
          const conversations = state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              const updatedMessages = [...conv.messages, message];
              let newTitle = conv.title;
              // If this is the first user message, generate title from it
              if (
                conv.messages.length === 0 ||
                conv.title === 'New Chat' ||
                conv.title === 'नवीन संवाद' ||
                conv.title === 'नई बातचीत'
              ) {
                if (message.role === 'user') {
                  newTitle =
                    message.content.length > 28
                      ? message.content.substring(0, 28) + '...'
                      : message.content;
                }
              }
              return {
                ...conv,
                title: newTitle,
                messages: updatedMessages,
                updatedAt: Date.now(),
              };
            }
            return conv;
          });

          return { conversations };
        });
      },

      updateMessageContent: (
        conversationId: string,
        messageId: string,
        content: string,
        recommendation?: Recommendation
      ) => {
        set((state) => {
          const conversations = state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              const messages = conv.messages.map((msg) => {
                if (msg.id === messageId) {
                  return {
                    ...msg,
                    content,
                    recommendation: recommendation || msg.recommendation,
                  };
                }
                return msg;
              });
              return { ...conv, messages, updatedAt: Date.now() };
            }
            return conv;
          });

          return { conversations };
        });
      },

      renameConversation: (id: string, newTitle: string) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, title: newTitle, updatedAt: Date.now() } : conv
          ),
        }));
      },

      deleteConversation: (id: string) => {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== id);
          const nextActive =
            state.activeConversationId === id
              ? filtered.length > 0
                ? filtered[0].id
                : null
              : state.activeConversationId;

          return {
            conversations: filtered,
            activeConversationId: nextActive,
          };
        });
      },

      setMessageFeedback: (
        conversationId: string,
        messageId: string,
        feedback: 'up' | 'down'
      ) => {
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: conv.messages.map((m) =>
                  m.id === messageId ? { ...m, feedback } : m
                ),
              };
            }
            return conv;
          }),
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
