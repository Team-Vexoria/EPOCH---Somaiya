# Sell Smart - Frontend

A mobile-first web app where Indian farmers and FPOs in Nashik district chat with an AI assistant (in the style of ChatGPT / Claude) to decide what to sell, when, and where for maximum net profit.

---

## 🚀 Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

- **Zero configuration required**: All authentication, chat advice, and APMC market forecasts run standalone via mock service layers.
- **Demo Login**: On the login screen, click **"Try demo without login"** or enter any 10-digit number and use OTP `123456` (or any 6-digit code).

---

## 📱 User Flow & Routing

The application implements a 4-step progressive onboarding funnel with route guards:

```
/login (Phone + OTP) 
  └─> /language (English / हिन्दी / मराठी)
        └─> /crops (Onion 🧅 / Tomato 🍅 / Soybean 🫘)
              └─> /chat (ChatGPT/Claude style advisory)
                    └─> /chat/:conversationId
```

### Route Guards
1. **Unauthenticated users**: Attempting to open `/language`, `/crops`, `/chat`, or `/chat/:conversationId` redirects to `/login`.
2. **Incomplete onboarding**: Authenticated users who have not selected language or crops are redirected to the corresponding step (`/language` or `/crops`).
3. **Completed users**: On subsequent visits or page refreshes, users skip straight to `/chat`. Accessing `/` or `/login` automatically redirects to `/chat`.
4. **Settings changes**: Users can revisit `/language` or `/crops` at any time from the sidebar user menu to update preferences.

---

## 📁 Folder Structure

```
frontend/src/
├── config/
│   ├── crops.ts           # Onion, Tomato, Soybean configs & metadata
│   └── constants.ts       # App constants, supported languages, OTP config
├── types/
│   └── index.ts           # Message, Conversation, Recommendation, Mandi, Crop types
├── store/
│   └── useAppStore.ts     # Zustand store with localStorage persistence
├── services/
│   ├── auth.ts            # Phone + OTP mock auth (plug Firebase Auth here)
│   ├── chat.ts            # AI streaming service & canned Nashik data (plug RAG backend here)
│   └── speech.ts          # Web Speech API helpers (STT voice input & TTS audio readout)
├── i18n/
│   ├── index.ts           # i18next configuration & Indian rupee formatter
│   └── locales/
│       ├── en.json        # English translations
│       ├── hi.json        # Hindi (हिन्दी) translations
│       └── mr.json        # Marathi (मराठी) translations (Default)
├── components/
│   ├── auth/
│   │   ├── PhoneInput.tsx # +91 prefix, 10-digit validation
│   │   └── OtpInput.tsx   # 6 auto-advancing boxes, paste support, 30s resend timer
│   └── chat/
│       ├── Sidebar.tsx    # Responsive drawer, conversation grouping, rename/delete
│       ├── Header.tsx     # Title, mobile hamburger, crop chips, language pill
│       ├── MessageItem.tsx# react-markdown, copy, TTS playback, feedback
│       ├── RecommendationCard.tsx # SELL/HOLD badge, expected gain, mandi table
│       ├── InputBar.tsx   # Auto-growing textarea, speech recognition mic, stop button
│       └── EmptyState.tsx # Greeting & crop-aware suggestion cards
└── pages/
    ├── LoginPage.tsx      # Phone + OTP login screen with demo button
    ├── LanguagePage.tsx   # Trilingual heading, 3 audio-preview cards
    ├── CropsPage.tsx      # Multi-select crop cards
    └── ChatPage.tsx       # Main ChatGPT/Claude advisory interface
```

---

## 🔌 Swapping Mocks for Real Services

### 1. Swapping in Firebase Phone Auth (`src/services/auth.ts`)

Open `src/services/auth.ts`. Replace the mock functions with Firebase Phone Auth:

```typescript
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';

// 1. Send OTP via Firebase
export async function sendOtp(phone: string): Promise<SendOtpResult> {
  const auth = getAuth();
  const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
  const confirmationResult = await signInWithPhoneNumber(auth, `+91${phone}`, recaptchaVerifier);
  window.confirmationResult = confirmationResult;
  return { success: true };
}

// 2. Verify OTP code
export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  const result = await window.confirmationResult.confirm(code);
  const token = await result.user.getIdToken();
  return { success: true, token };
}
```

No UI components need to be modified when plugging in Firebase.

---

### 2. Swapping in Real Chat / RAG Backend (`src/services/chat.ts`)

Open `src/services/chat.ts`. Replace the local `sendMessage` simulation with an HTTP Server-Sent Events (SSE) or fetch stream:

```typescript
export async function sendMessage({
  message,
  language,
  crops,
  history,
  onChunk,
  onDone,
  onError,
  signal,
}: SendMessageParams): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, language, crops, history }),
    signal,
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decoder.decode(value);
    onChunk(accumulated);
  }

  // Parse structured recommendation payload if returned by server
  onDone(accumulated, serverRecommendation);
}
```

---

## 🎙️ Speech Technologies

- **Voice Input (STT)**: Uses browser `webkitSpeechRecognition` / `SpeechRecognition` configured with regional Indian locales:
  - Marathi: `mr-IN`
  - Hindi: `hi-IN`
  - English: `en-IN`
  Shows a pulsing red recording indicator and live interim transcripts directly in the input box.
- **Voice Readout (TTS)**: Uses `window.speechSynthesis` with matching Indian language accents to read assistant recommendations aloud to farmers with limited literacy.

---

## 🎨 Design Rules & Static Analysis

All components adhere strictly to the project's design system:
- **Light Theme Only**: Natural off-white paper background (`#FBF9F5`) and deep ink text (`#1C1917`).
- **Typography Standard**: All text is $\ge 14\text{px}$, body text is $\ge 16\text{px}$.
- **Zero Tech Gradients**: Crisp solid 1–2px borders and hard offset shadows (`shadow-hard`).
- **Accessibility**: Minimum 48px touch targets, full keyboard accessibility, and visible focus rings.

Run the automated design rule check anytime:
```bash
npm run design:check
```
