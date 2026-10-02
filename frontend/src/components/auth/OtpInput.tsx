import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ArrowLeft, Loader2, RotateCw } from 'lucide-react';
import { AUTH_CONFIG } from '../../config/constants';
import { isFast2SmsConfigured } from '../../services/auth';

interface OtpInputProps {
  phone: string;
  onVerifyOtp: (code: string) => Promise<void>;
  onResendOtp: () => Promise<void>;
  onEditPhone: () => void;
  isLoading: boolean;
  fallbackCode?: string;
  gatewayNotice?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  phone,
  onVerifyOtp,
  onResendOtp,
  onEditPhone,
  isLoading,
  fallbackCode,
  gatewayNotice,
}) => {
  const { t } = useTranslation();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState<number>(AUTH_CONFIG.otpCountdownSeconds);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState<boolean>(false);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Focus the first empty input on mount
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // 30-second countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    const digit = cleaned.slice(-1); // Take last entered digit
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    setDigits(nextDigits);
    if (error) setError(null);

    // Auto-advance to next input box
    if (index < 5 && digit) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 boxes are filled
    const fullCode = nextDigits.join('');
    if (fullCode.length === 6) {
      triggerSubmit(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pasted[i] || '';
    }
    setDigits(nextDigits);
    if (error) setError(null);

    // Focus last filled box
    const focusIndex = Math.min(pasted.length, 5);
    inputsRef.current[focusIndex]?.focus();

    if (pasted.length === 6) {
      triggerSubmit(pasted);
    }
  };

  const triggerSubmit = async (code: string) => {
    if (isLoading) return;
    try {
      await onVerifyOtp(code);
    } catch (err: any) {
      setError(err.message || t('auth.invalidOtp'));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = digits.join('');
    if (fullCode.length !== 6) {
      setError(t('auth.otpError'));
      return;
    }
    triggerSubmit(fullCode);
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    try {
      setIsResending(true);
      setError(null);
      await onResendOtp();
      setCountdown(AUTH_CONFIG.otpCountdownSeconds);
      setDigits(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = digits.every((d) => d.length === 1);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-neutral-ink">
            {t('auth.otpHeading')}
          </label>
          <button
            type="button"
            onClick={onEditPhone}
            className="text-sm font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('auth.editPhone')}</span>
          </button>
        </div>

        {/* 6 OTP Boxes */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputsRef.current[index] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={isLoading}
              aria-label={`Digit ${index + 1}`}
              className="w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-black text-neutral-ink bg-neutral-surface border-2 border-neutral-ink shadow-hard focus:ring-2 focus:ring-primary focus:outline-none transition-all disabled:opacity-50"
            />
          ))}
        </div>

        {error && (
          <p className="mt-2 text-sm font-bold text-risk flex items-center gap-1">
            <span>⚠️</span>
            <span>{error}</span>
          </p>
        )}
      </div>

      {/* Resend Countdown row */}
      <div className="flex items-center justify-between text-sm py-1">
        <span className="text-neutral-muted">
          {countdown > 0 ? (
            <span>{t('auth.resendIn', { seconds: countdown })}</span>
          ) : (
            <span className="text-neutral-ink font-semibold">Didn't receive code?</span>
          )}
        </span>

        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || isResending || isLoading}
          className="font-extrabold text-primary hover:text-primary-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
        >
          {isResending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCw className="w-4 h-4" />
          )}
          <span>{t('auth.resendNow')}</span>
        </button>
      </div>

      <button
        type="submit"
        disabled={isLoading || !isComplete}
        className="w-full min-h-[48px] py-3.5 px-4 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-primary-fg font-extrabold text-base md:text-lg border-2 border-neutral-ink shadow-hard flex items-center justify-center gap-2 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{t('auth.verifying')}</span>
          </>
        ) : (
          <>
            <Check className="w-5 h-5" />
            <span>{t('auth.verifyOtp')}</span>
          </>
        )}
      </button>
    </form>
  );
};
