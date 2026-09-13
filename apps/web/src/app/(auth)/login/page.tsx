'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import { Smartphone, ArrowRight, KeyRound, User, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';



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

  const [step, setStep] = useState<'phone' | 'otp' | 'register'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize Google Identity Services if client ID is present
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
      toast('Google OAuth Client ID not yet configured in environment. Please use phone number verification.', {
        icon: 'ℹ️',
      });
      return;
    }

    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          toast('Please select your Google account or use phone verification.', { icon: 'ℹ️' });
        }
      });
    } else {
      toast.error('Google Sign-In is loading, please try again in a moment or use phone verification.');
    }
  };

  const handleSendOtp = async (e?: React.FormEvent, customPhone?: string) => {
    if (e) e.preventDefault();
    const targetPhone = customPhone || phone;
    if (!targetPhone.match(/^(98|97|96|95)\d{8}$/)) {
      toast.error('Enter a valid 10-digit Nepali mobile number (98XXXXXXXX)');
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
        toast.success(`🔑 Dev Code: ${code} (auto-filled)`, { duration: 8000 });
      } else {
        toast.success(`6-digit code sent to ${targetPhone}`);
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
        toast.success('Code verified! Please provide your name to finish registration.');
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
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-gray-100 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-rose-200 p-1 shadow-md mx-auto mb-3">
            <img src="/logo.jpg" alt="GM Collection House" className="w-full h-full object-cover rounded-xl" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900">
            {step === 'phone' && 'Customer Login'}
            {step === 'otp' && 'Enter Verification Code'}
            {step === 'register' && 'Tell Us Your Name'}
          </h2>
          <p className="text-xs text-gray-500">
            {step === 'phone' && 'Sign in to access your orders, wishlist, and exclusive offers'}
            {step === 'otp' && `Sent to +977 ${phone}`}
            {step === 'register' && `Setting up account for +977 ${phone}`}
          </p>
        </div>

        {/* Step 1: Login Options */}
        {step === 'phone' && (
          <div className="space-y-4">
            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3 px-4 border border-gray-200 hover:border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                or with mobile number
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Phone Form */}
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Phone</label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-3.5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold border border-gray-200">
                    🇳🇵 +977
                  </span>
                  <input
                    type="tel"
                    placeholder="98XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                    required
                    autoFocus
                  />
                </div>
              </div>



              <button
                type="submit"
                disabled={isLoading || phone.length < 10}
                className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Send Verification Code <ArrowRight size={16} /></>}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: OTP Form */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {/* Development OTP Banner */}
            {devOtp && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2 shadow-sm">
                <div className="flex items-center justify-center gap-1.5 text-xs text-primary-700 font-semibold">
                  <Sparkles size={14} className="text-primary-600" />
                  <span>Development Verification Code</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-2xl font-black tracking-[0.25em] text-primary-900 bg-white px-4 py-1 rounded-xl border border-rose-200 shadow-inner">
                    {devOtp}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtp(devOtp)}
                    className="text-xs font-bold text-primary-600 hover:text-primary-800 bg-white hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg shadow-xs transition-colors"
                  >
                    Auto-fill
                  </button>
                </div>
                <p className="text-[10px] text-gray-500">
                  SMS gateway in demo mode &mdash; click auto-fill to test instantly
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">6-Digit Code</label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 text-center tracking-[0.6em] text-xl font-mono font-bold rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length < 6}
              className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Verify & Continue <KeyRound size={16} /></>}
            </button>

            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(''); setDevOtp(null); }}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              &larr; Change phone number
            </button>
          </form>
        )}

        {/* Step 3: Name Form (New Users) */}
        {step === 'register' && (
          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-xs text-green-800">
              <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
              <span>Mobile <strong>+977 {phone}</strong> verified! Just enter your name below.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Your Full Name</label>
              <input
                type="text"
                placeholder="e.g. Maya Gurung"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Complete Registration <User size={16} /></>}
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

        <div className="pt-2 text-center text-[11px] text-gray-400 border-t border-gray-100">
          🔒 Fast &amp; secure authentication via Google or Sparrow SMS Nepal
        </div>
      </div>
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

