'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/store/admin.store';
import { adminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Smartphone, KeyRound, ArrowRight, Loader2, Store } from 'lucide-react';

type Step = 'phone' | 'otp';

export default function AdminLoginPage() {
  const router   = useRouter();
  const setAuth  = useAdminStore((s) => s.setAuth);

  const [step,     setStep]     = useState<Step>('phone');
  const [phone,    setPhone]    = useState('');
  const [otp,      setOTP]      = useState(['', '', '', '', '', '']);
  const [loading,  setLoading]  = useState(false);

  const [devCode, setDevCode] = useState<string | null>(null);

  // Step 1 — Send OTP
  const handleSendOTP = async () => {
    if (!phone.match(/^(98|97|96|95)\d{8}$/)) {
      toast.error('Enter a valid Nepali mobile number (e.g. 9800000000)');
      return;
    }
    setLoading(true);
    try {
      const res = await adminApi.post('/api/auth/admin/send-otp', { phone });
      const code = res.data?.devOtp;
      if (code) {
        setDevCode(code);
        setOTP(code.split(''));
        toast.success(`Dev OTP: ${code} (auto-filled)`, { duration: 8000 });
      } else {
        toast.success(`OTP sent to ${phone}`);
      }
      setStep('otp');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — Verify OTP & login
  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Enter all 6 digits.'); return; }

    setLoading(true);
    try {
      const res = await adminApi.post('/api/auth/admin/login', { phone, otp: code });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.name}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid OTP. Please try again.');
      setOTP(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  // OTP input handler — auto-advance to next box
  const handleOTPChange = (value: string, idx: number) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[idx]  = value.slice(-1);
    setOTP(next);
    if (value && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
    if (idx === 5 && value) {
      // Auto submit when last digit entered
      setTimeout(() => {
        const fullCode = [...next].join('');
        if (fullCode.length === 6) handleVerifyOTP();
      }, 100);
    }
  };

  const handleOTPKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-dark to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
            <Store size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">GM Collection House</h1>
          <p className="text-gray-400 text-sm mt-1">Admin Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          {step === 'phone' ? (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Smartphone size={17} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">Admin Login</h2>
                  <p className="text-xs text-gray-500">Enter your registered phone number</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Phone Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 border border-gray-300 rounded-lg bg-gray-50">
                      <span className="text-sm text-gray-600 whitespace-nowrap">🇳🇵 +977</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="98XXXXXXXX"
                      className="input flex-1"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendOTP}
                  disabled={loading || phone.length < 10}
                  className="btn-primary w-full justify-center"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : (
                    <><ArrowRight size={16} /> Send OTP</>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
                  <KeyRound size={17} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">Enter OTP</h2>
                  <p className="text-xs text-gray-500">Sent to +977 {phone}</p>
                </div>
              </div>

              {devCode && (
                <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <p className="text-[11px] text-primary-700 font-medium">
                    🔑 Development OTP: <strong className="font-mono text-sm tracking-widest">{devCode}</strong> (auto-filled)
                  </p>
                </div>
              )}

              {/* 6-digit OTP boxes */}
              <div className="flex gap-2 justify-center mb-5">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOTPChange(e.target.value, idx)}
                    onKeyDown={(e) => handleOTPKeyDown(e, idx)}
                    className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
                      ${digit ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-900'}
                      focus:border-primary-500 focus:ring-2 focus:ring-primary-100`}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.join('').length < 6}
                className="btn-primary w-full justify-center"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : (
                  <><KeyRound size={16} /> Verify & Login</>
                )}
              </button>

              <button
                onClick={() => { setStep('phone'); setOTP(['', '', '', '', '', '']); }}
                className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Use a different number
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          GM Collection House Admin Panel · Secure Login
        </p>
      </div>
    </div>
  );
}
