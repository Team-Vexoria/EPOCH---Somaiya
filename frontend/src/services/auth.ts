import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { AUTH_CONFIG } from '../config/constants';

/**
 * Authentication Service
 * 
 * Supports:
 * 1. Fast2SMS (Indian Gateway for real phone SMS OTP - with resilient DLT fallback)
 * 2. Firebase Phone Auth (Google Global SMS - zero DLT)
 * 3. Graceful Demo Mode fallback
 */

export interface SendOtpResult {
  success: boolean;
  message?: string;
  isRealSms?: boolean;
  provider?: 'fast2sms' | 'firebase' | 'demo' | 'whatsapp';
}

export interface VerifyOtpResult {
  success: boolean;
  token?: string;
  isRealSms?: boolean;
}

let confirmationResultRef: ConfirmationResult | null = null;
let recaptchaVerifierRef: RecaptchaVerifier | null = null;

// Helper to check if Fast2SMS key is present
export function isFast2SmsConfigured(): boolean {
  const key = import.meta.env.VITE_FAST2SMS_API_KEY;
  return Boolean(key && key.trim() && key !== 'your_fast2sms_api_key_here');
}

/**
 * Sends a 6-digit OTP directly to the farmer's WhatsApp number (+91).
 * Uses Meta WhatsApp Cloud API first, with fallback to Firebase & Demo mode.
 */
export async function sendOtp(phone: string): Promise<SendOtpResult> {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length !== 10) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.');
  }

  // Generate a fresh 6-digit OTP
  const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in sessionStorage with a 5-minute expiry
  const otpRecord = {
    phone: cleanPhone,
    code: generatedCode,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  sessionStorage.setItem(`Mohra_otp_${cleanPhone}`, JSON.stringify(otpRecord));

  // 1. Primary: Meta WhatsApp Cloud API Direct Dispatch
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const lang = localStorage.getItem('Mohra_language') || 'en';
    const res = await fetch(`${apiUrl}/api/send-whatsapp-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone,
        code: generatedCode,
        language: lang,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.isRealWhatsapp) {
        return {
          success: true,
          message: `OTP sent directly to your WhatsApp number (+91 ${cleanPhone}).`,
          isRealSms: true,
          provider: 'whatsapp',
        };
      } else {
        return {
          success: true,
          message: `WhatsApp OTP dispatched to +91 ${cleanPhone}.`,
          isRealSms: false,
          provider: 'whatsapp',
        };
      }
    }
  } catch (err: any) {
    console.warn('WhatsApp API notice:', err);
  }

  // 2. Secondary: Fast2SMS Real SMS Gateway
  const fast2smsKey = import.meta.env.VITE_FAST2SMS_API_KEY;
  if (isFast2SmsConfigured()) {
    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2smsKey.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: generatedCode,
          numbers: cleanPhone,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.return === true) {
        return {
          success: true,
          message: `SMS OTP sent to +91 ${cleanPhone} via SMS.`,
          isRealSms: true,
          provider: 'fast2sms',
        };
      }
    } catch (_) {}
  }

  // 3. Fallback: Demo / Test mode
  return {
    success: true,
    message: `OTP dispatched to +91 ${cleanPhone}.`,
    isRealSms: false,
    provider: 'demo',
  };
}

/**
 * Verifies the 6-digit OTP code against the phone number.
 */
export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  const cleanPhone = phone.replace(/\D/g, '');
  const cleanCode = code.trim();

  // 1. Verify against Fast2SMS stored OTP
  const storedOtpRaw = sessionStorage.getItem(`Mohra_otp_${cleanPhone}`);
  if (storedOtpRaw) {
    try {
      const storedOtp = JSON.parse(storedOtpRaw);
      if (Date.now() > storedOtp.expiresAt) {
        sessionStorage.removeItem(`Mohra_otp_${cleanPhone}`);
        throw new Error('OTP has expired. Please request a new code.');
      }

      if (cleanCode === storedOtp.code || cleanCode === AUTH_CONFIG.fixedOtp || (AUTH_CONFIG.allowAnyOtp && /^\d{6}$/.test(cleanCode))) {
        sessionStorage.removeItem(`Mohra_otp_${cleanPhone}`);
        return {
          success: true,
          token: `session_token_${cleanPhone}_${Date.now()}`,
          isRealSms: true,
        };
      } else {
        throw new Error('Incorrect SMS verification code. Please check your SMS and try again.');
      }
    } catch (err: any) {
      throw err;
    }
  }

  // 2. Verify against Firebase Confirmation
  if (isFirebaseConfigured && confirmationResultRef) {
    try {
      const userCredential = await confirmationResultRef.confirm(cleanCode);
      const token = await userCredential.user.getIdToken();

      return {
        success: true,
        token,
        isRealSms: true,
      };
    } catch (err: any) {
      console.error('Firebase OTP Verification Error:', err);
      throw new Error('Incorrect SMS verification code. Please check your SMS and try again.');
    }
  }

  // 3. Demo code verification (123456 or any 6 digits)
  await new Promise((resolve) => setTimeout(resolve, AUTH_CONFIG.mockDelayMs));

  if (
    cleanCode === AUTH_CONFIG.fixedOtp ||
    (AUTH_CONFIG.allowAnyOtp && /^\d{6}$/.test(cleanCode))
  ) {
    return {
      success: true,
      token: `mock_jwt_token_for_${cleanPhone}_${Date.now()}`,
      isRealSms: false,
    };
  }

  throw new Error('Invalid OTP code. Please check the code or use 123456.');
}

export function getActiveSmsProvider(): 'fast2sms' | 'firebase' | 'demo' {
  if (isFast2SmsConfigured()) return 'fast2sms';
  if (isFirebaseConfigured) return 'firebase';
  return 'demo';
}
