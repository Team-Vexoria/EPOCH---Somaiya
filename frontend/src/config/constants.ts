export const APP_NAME = 'Sell Smart';

export const AUTH_CONFIG = {
  fixedOtp: '123456',
  allowAnyOtp: true,
  otpCountdownSeconds: 30,
  mockDelayMs: 800,
  demoPhone: '9822012345',
};

export const STORAGE_KEY = 'sellsmart_app_state_v1';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', speechCode: 'en-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', speechCode: 'mr-IN' },
] as const;
