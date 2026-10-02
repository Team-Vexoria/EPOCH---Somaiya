import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, ShieldCheck, Sparkles } from 'lucide-react';
import { PhoneInput } from '../components/auth/PhoneInput';
import { OtpInput } from '../components/auth/OtpInput';
import { sendOtp, verifyOtp } from '../services/auth';
import { useAppStore } from '../store/useAppStore';
import { AUTH_CONFIG } from '../config/constants';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fallbackCode, setFallbackCode] = useState<string | undefined>();
  const [gatewayNotice, setGatewayNotice] = useState<string | undefined>();

  const { isLoggedIn, login, onboardingComplete, crops } = useAppStore();

  // If already logged in, redirect away from /login
  React.useEffect(() => {
    if (isLoggedIn) {
      if (onboardingComplete && crops && crops.length > 0) {
        navigate('/chat', { replace: true });
      } else {
        navigate('/language', { replace: true });
      }
    }
  }, [isLoggedIn, onboardingComplete, crops, navigate]);

  const handleSendOtp = async (inputPhone: string) => {
    setIsLoading(true);
    try {
      const res = await sendOtp(inputPhone);
      setPhone(inputPhone);
      setFallbackCode(res.fallbackCode);
      setGatewayNotice(res.gatewayNotice);
      setStep('otp');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setIsLoading(true);
    try {
      await verifyOtp(phone, code);
      login(phone);
      navigateNext();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    await sendOtp(phone);
  };

  const handleDemoLogin = () => {
    login(AUTH_CONFIG.demoPhone);
    navigateNext();
  };

  const navigateNext = () => {
    const state = useAppStore.getState();
    if (!state.onboardingComplete || !state.crops || state.crops.length === 0) {
      navigate('/language');
    } else {
      navigate('/chat');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-bg flex flex-col justify-center items-center px-4 py-8">
      {/* Centered Login Card */}
      <div className="w-full max-w-md bg-neutral-surface border-2 border-neutral-ink shadow-hard-lg p-6 sm:p-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary text-primary-fg border-2 border-neutral-ink shadow-hard mb-3">
            <Sprout className="w-8 h-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-neutral-ink tracking-tight">
            {t('auth.title')}
          </h1>

          <p className="mt-1 text-base text-neutral-muted max-w-xs mx-auto">
            {t('auth.tagline')}
          </p>
        </div>

        {/* Step Content */}
        {step === 'phone' ? (
          <div>
            <div className="mb-4 text-center">
              <h2 className="text-lg font-bold text-neutral-ink">
                {t('auth.loginHeading')}
              </h2>
              <p className="text-sm text-neutral-muted">
                {t('auth.loginSubtitle')}
              </p>
            </div>

            <PhoneInput
              initialPhone={phone}
              onSendOtp={handleSendOtp}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <div>
            <div className="mb-4 text-center">
              <h2 className="text-lg font-bold text-neutral-ink">
                {t('auth.otpHeading')}
              </h2>
              <p className="text-sm text-neutral-muted">
                {t('auth.otpSubtitle', { phone })}
              </p>
            </div>

            <OtpInput
              phone={phone}
              onVerifyOtp={handleVerifyOtp}
              onResendOtp={handleResendOtp}
              onEditPhone={() => setStep('phone')}
              isLoading={isLoading}
              fallbackCode={fallbackCode}
              gatewayNotice={gatewayNotice}
            />
          </div>
        )}

        {/* Invisible reCAPTCHA Anchor for Firebase Phone Auth */}
        <div id="recaptcha-container"></div>

        {/* Demo Login Quick Link */}
        <div className="mt-6 pt-5 border-t border-neutral-border text-center">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="text-sm font-extrabold text-neutral-ink hover:text-primary underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{t('auth.tryDemo')}</span>
          </button>
        </div>

        {/* Advisory Trust Badge */}
        <div className="mt-6 p-2.5 bg-neutral-bg border border-neutral-border flex items-center justify-center gap-2 text-xs text-neutral-muted">
          <ShieldCheck className="w-4 h-4 text-sell shrink-0" />
          <span>Nashik APMC Daily Rate Engine & Advisory</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
