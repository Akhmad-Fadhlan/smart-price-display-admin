'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Monitor, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const authError = searchParams?.get('error');

  useEffect(() => {
    if (authError === 'auth_failed') {
      setErrorMessage('Autentikasi Google gagal atau dibatalkan.');
    } else if (authError === 'access_denied') {
      setErrorMessage('Akun Anda belum terdaftar di allowlist admin.');
    }
  }, [authError]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const supabase = createClient();

      if (supabase) {
        const getSiteUrl = () => {
          let siteUrl =
            process.env.NEXT_PUBLIC_SITE_URL ||
            (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
          return siteUrl.replace(/\/$/, '');
        };

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${getSiteUrl()}/auth/callback`,
          },
        });

        if (error) {
          setErrorMessage(error.message);
          setLoading(false);
        }
      } else {
        // Fallback Standalone Demo Mode Login
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan autentikasi');
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 p-8 flex flex-col items-center text-center z-10">
      {/* Brand Icon */}
      <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-4 shadow-md font-bold">
        <Monitor className="w-6 h-6" />
      </div>

      <h1 className="text-xl font-bold text-slate-900 tracking-tight">PRICE DISPLAY</h1>
      <p className="text-xs text-slate-500 font-medium mt-1">Smart Display Management Dashboard</p>

      {errorMessage && (
        <div className="w-full mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg text-left flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="my-5 w-full py-3 px-4 bg-slate-50 rounded-lg border border-slate-200 text-left">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Akses Terautentikasi (Allowlist)</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
          Hanya email terdaftar pada tabel <code className="font-mono text-slate-700">admin_allowlist</code> yang akan mendapat akses Admin. Email lain otomatis berstatus <span className="text-amber-700 font-medium">Pending Access</span>.
        </p>
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 h-11 text-sm shadow-md"
        onClick={handleGoogleLogin}
        isLoading={loading}
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
        <span>Continue with Google</span>
        <ArrowRight className="w-4 h-4 ml-auto text-slate-400" />
      </Button>

      <p className="text-[11px] text-slate-400 mt-6">
        Price Display Control Center · Version 1.1
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <Suspense fallback={<div className="text-white text-xs">Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
