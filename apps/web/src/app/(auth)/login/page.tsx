'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import {
  Smartphone, ArrowRight, KeyRound, User, Loader2,
  Sparkles, CheckCircle2, ChevronLeft, ShieldCheck,
  ExternalLink, X, Zap
} from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const setAuth = useAuthStore((s) => s.setAuth);

  const [activeTab, setActiveTab] = useState<'otp' | 'demo'>('otp');
  const [step, setStep] = useState<'phone' | 'otp' | 'register'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId.startsWith('your-')) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) return;
    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/google', { credential: response.credential });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome, ${user.name}!`);
      router.push(redirect);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId.startsWith('your-')) {
      // Show informative, helpful setup modal instead of confusing error toast
      setShowGoogleModal(true);
      return;
    }

    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          toast('Please select your Google account or continue with phone OTP.', { icon: 'ℹ️' });
        }
      });
    } else {
      toast.error('Google Sign-In is initializing. Please try in a moment or use phone OTP.');
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      const res = await api.post('/api/auth/demo-customer');
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome, ${user.name}! Enjoy exploring GM Collection House!`, { icon: '✨' });
      setShowGoogleModal(false);
      router.push(redirect);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Demo login failed');
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent, customPhone?: string) => {
    if (e) e.preventDefault();
    const targetPhone = customPhone || phone;
    if (!targetPhone.match(/^(98|97|96|95)\d{8}$/)) {
      toast.error('Please enter a valid 10-digit Nepali number (98XXXXXXXX)');
      return;
    }

    if (customPhone) setPhone(customPhone);

    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/send-otp', { phone: targetPhone });
      const code = res.data?.devOtp;
      if (code) {
        setDevOtp(code);
        setOtp(code);
        toast.success(`Code generated: ${code} (Auto-filled)`, { duration: 6000 });
      } else {
        toast.success(`6-digit code sent to +977 ${targetPhone}`);
      }
      setStep('otp');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/verify-otp', { phone, code: otp });
      const resData = res.data;

      if (resData.requiresName || !resData.data) {
        setStep('register');
        toast.success('Code verified! Please provide your name to finish setup.');
      } else {
        const { user, accessToken, refreshToken } = resData.data;
        setAuth(user, accessToken, refreshToken);
        toast.success(`Welcome back, ${user.name}!`);
        router.push(redirect);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/api/auth/complete-registration', {
        phone,
        name: name.trim(),
      });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome to GM Collection House, ${user.name}!`);
      router.push(redirect);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] flex flex-col justify-center items-center px-4 sm:px-6 py-6 sm:py-12 bg-gradient-to-b from-rose-50/70 via-white to-rose-50/40">
      <div className="w-full max-w-md bg-white sm:rounded-3xl sm:border sm:border-rose-100 sm:shadow-xl p-5 sm:p-8 space-y-6">
        
        {/* Navigation / Back header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-primary-600 transition-colors"
          >
            <ChevronLeft size={16} /> Back to Store
          </Link>
          <span className="text-[11px] font-bold text-primary-700 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">
            🇳🇵 Nepal Boutique
          </span>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border-2 border-rose-200 p-1 shadow-md mx-auto">
            <img src="/logo.jpg" alt="GM Collection House" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 tracking-tight">
              {step === 'phone' && 'Welcome Shopper'}
              {step === 'otp' && 'Verify Mobile'}
              {step === 'register' && 'Complete Profile'}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              {step === 'phone' && 'Access orders, wishlist & exclusive boutique offers'}
              {step === 'otp' && `Enter the 6-digit code sent to +977 ${phone}`}
              {step === 'register' && `Setting up account for +977 ${phone}`}
            </p>
          </div>
        </div>

        {/* Mode Tabs on Step 1 */}
        {step === 'phone' && (
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('otp')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'otp'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Smartphone size={14} /> Mobile Phone
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('demo')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'demo'
                  ? 'bg-gradient-to-r from-primary-600 to-rose-600 text-white shadow-xs'
                  : 'text-primary-700 hover:text-primary-800'
              }`}
            >
              <Zap size={14} /> 1-Click Demo
            </button>
          </div>
        )}

        {/* Step 1: Login Form */}
        {step === 'phone' && activeTab === 'otp' && (
          <div className="space-y-4">
            {/* Google Sign-in Option */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading || isDemoLoading}
              className="w-full h-13 py-3 px-4 border border-gray-200 hover:border-gray-300 rounded-2xl bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.99]"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                or with mobile number
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Mobile Phone Form */}
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Nepali Mobile Number
                </label>
                <div className="flex gap-2">
                  <div className="inline-flex items-center px-3.5 h-13 rounded-2xl bg-gray-50 text-gray-800 text-xs font-bold border border-gray-200 flex-shrink-0">
                    🇳🇵 +977
                  </div>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="98XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1 h-13 px-4 text-base font-semibold rounded-2xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-gray-400 placeholder:font-normal"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1 pl-1">
                  Compatible with NTC, Ncell, and Smart Telecom
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || phone.length < 10}
                className="w-full h-13 bg-gradient-to-r from-primary-600 to-rose-600 hover:from-primary-700 hover:to-rose-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 1: Demo Tab */}
        {step === 'phone' && activeTab === 'demo' && (
          <div className="space-y-4 text-center py-2">
            <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-2xl space-y-2">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mx-auto">
                <Sparkles size={20} />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Instant Customer Access</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Test placing orders, viewing cart, and shopping dresses immediately without waiting for SMS or setting up Google Cloud keys.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isDemoLoading}
              className="w-full h-13 bg-gradient-to-r from-primary-600 to-rose-600 hover:from-primary-700 hover:to-rose-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isDemoLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Zap size={16} />
                  <span>Sign In as Demo Shopper</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: OTP Form */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            {/* Auto-filled Sandbox Code Banner */}
            {devOtp && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2 shadow-xs">
                <div className="flex items-center justify-center gap-1.5 text-xs text-primary-700 font-semibold">
                  <Sparkles size={14} className="text-primary-600" />
                  <span>Sandbox Verification Code</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-2xl font-black tracking-[0.2em] text-primary-900 bg-white px-4 py-1.5 rounded-xl border border-rose-200 shadow-inner">
                    {devOtp}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtp(devOtp)}
                    className="text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-xl shadow-xs transition-colors"
                  >
                    Auto-fill
                  </button>
                </div>
                <p className="text-[10px] text-gray-500">
                  SMS sandbox mode active &mdash; code generated automatically
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 text-center">
                Enter 6-Digit Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full h-14 px-4 text-center tracking-[0.6em] text-2xl font-mono font-bold rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length < 6}
              className="w-full h-13 bg-gradient-to-r from-primary-600 to-rose-600 hover:from-primary-700 hover:to-rose-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Verify &amp; Continue</span>
                  <KeyRound size={16} />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1 px-1">
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setDevOtp(null); }}
                className="text-gray-500 hover:text-gray-800 transition-colors"
              >
                &larr; Change number
              </button>
              <button
                type="button"
                onClick={() => handleSendOtp(undefined, phone)}
                disabled={isLoading}
                className="font-semibold text-primary-600 hover:text-primary-800 transition-colors"
              >
                Resend Code
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Complete Profile (New Users) */}
        {step === 'register' && (
          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
              <span>Mobile <strong>+977 {phone}</strong> verified! What should we call you?</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Your Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Maya Gurung"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-13 px-4 text-sm font-semibold rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full h-13 bg-gradient-to-r from-primary-600 to-rose-600 hover:from-primary-700 hover:to-rose-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Complete Setup</span>
                  <User size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(''); setDevOtp(null); }}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              &larr; Start over
            </button>
          </form>
        )}

        {/* Trust Badges Footer */}
        <div className="pt-3 border-t border-gray-100 text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>256-Bit SSL · Secure Checkout in Nepal</span>
          </div>
          <p className="text-[10px] text-gray-400">
            GM Collection House · Kathmandu, Nepal
          </p>
        </div>
      </div>

      {/* Google OAuth Configuration Guide Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-gray-100 relative">
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <GoogleIcon />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Google OAuth Setup</h3>
                <p className="text-xs text-gray-500">How to activate 1-tap Google Sign-In</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2.5 text-xs text-gray-700 leading-relaxed">
              <p className="font-semibold text-gray-900">
                To connect your official Google Cloud project:
              </p>
              <ol className="list-decimal pl-4 space-y-1.5">
                <li>
                  Open{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 underline font-semibold inline-flex items-center gap-0.5"
                  >
                    Google Cloud Console <ExternalLink size={11} />
                  </a>
                </li>
                <li>Create an <strong>OAuth 2.0 Client ID</strong> (Web application).</li>
                <li>Add your Vercel URL to <strong>Authorized JavaScript Origins</strong>.</li>
                <li>
                  Set environment variable on Vercel:
                  <code className="block mt-1 bg-white px-2 py-1 rounded border border-gray-200 text-primary-700 font-mono text-[11px] break-all">
                    NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
                  </code>
                </li>
              </ol>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isDemoLoading}
                className="w-full py-3 bg-gradient-to-r from-primary-600 to-rose-600 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isDemoLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <>
                    <Zap size={14} />
                    <span>Test Now with 1-Click Demo Shopper</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="w-full py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                Continue with Phone Number &amp; OTP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[75vh] flex items-center justify-center">
          <Loader2 className="animate-spin text-primary-600" size={32} />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}


