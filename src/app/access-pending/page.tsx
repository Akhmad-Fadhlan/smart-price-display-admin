'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AccessPendingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-6 h-6" />
        </div>

        <h1 className="text-lg font-bold text-slate-900">Menunggu Persetujuan Akses</h1>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Akun Google Anda terhubung, namun email Anda belum berada dalam daftar <strong>admin_allowlist</strong>. Silakan hubungi Administrator untuk meminta izin akses.
        </p>

        <div className="my-6 p-3 bg-slate-50 rounded-md border border-slate-200 text-xs font-mono text-slate-700">
          Status: Role Pending (Access Denied)
        </div>

        <Button variant="outline" size="md" className="w-full" onClick={() => router.push('/login')}>
          <LogOut className="w-4 h-4" />
          <span>Kembali ke Halaman Login</span>
        </Button>
      </div>
    </div>
  );
}
