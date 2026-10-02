import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, ArrowRight, Loader2 } from 'lucide-react';

interface PhoneInputProps {
  initialPhone?: string;
  phone?: string;
  onPhoneChange?: (phone: string) => void;
  onSendOtp: (phone: string) => Promise<void>;
  isLoading: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  initialPhone = '',
  phone: controlledPhone,
  onPhoneChange,
  onSendOtp,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [internalPhone, setInternalPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);

  const phone = controlledPhone !== undefined ? controlledPhone : internalPhone;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    if (onPhoneChange) {
      onPhoneChange(raw);
    } else {
      setInternalPhone(raw);
    }
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setError(t('auth.phoneError'));
      return;
    }

    try {
      await onSendOtp(phone);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="phone-input"
          className="block text-sm font-bold text-neutral-ink mb-1.5"
        >
          {t('auth.phoneLabel')}
        </label>

        {/* Input group with fixed +91 prefix */}
        <div className="flex border-2 border-neutral-ink shadow-hard bg-neutral-surface focus-within:ring-2 focus-within:ring-primary">
          <div className="flex items-center justify-center px-3.5 bg-neutral-bg border-r-2 border-neutral-ink text-neutral-ink font-extrabold text-base select-none">
            <span>🇮🇳 +91</span>
          </div>

          <input
            id="phone-input"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder={t('auth.phonePlaceholder')}
            value={phone}
            onChange={handlePhoneChange}
            disabled={isLoading}
            className="flex-1 py-3.5 px-3.5 text-base md:text-lg font-bold text-neutral-ink placeholder:text-neutral-muted focus:outline-none bg-transparent"
          />
        </div>

        {error && (
          <p className="mt-2 text-sm font-bold text-risk flex items-center gap-1">
            <span>⚠️</span>
            <span>{error}</span>
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || phone.length !== 10}
        className="w-full min-h-[48px] py-3.5 px-4 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-primary-fg font-extrabold text-base md:text-lg border-2 border-neutral-ink shadow-hard flex items-center justify-center gap-2 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{t('auth.sendingOtp')}</span>
          </>
        ) : (
          <>
            <span>{t('auth.sendOtp')}</span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
};
