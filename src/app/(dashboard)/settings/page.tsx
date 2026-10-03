'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { User, LogOut, ShieldCheck, Mail, KeyRound } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <div className="pb-12">
      <Header title="Settings" subtitle="Pengaturan akun administrator dan info sistem" />

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>Profil Akun Terhubung</span>
              </span>
            }
          />
          <CardBody className="p-6 space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-14 h-14 rounded-full bg-slate-900 text-white font-bold text-lg flex items-center justify-center border-2 border-slate-700 shadow-sm shrink-0">
                AF
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Akhmad Fadhlan</h3>
                  <Badge variant="synced">Admin</Badge>
                </div>
                <p className="text-xs text-slate-500 font-mono">admin@email.com</p>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Terdaftar pada admin_allowlist</span>
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs p-3 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Metode Autentikasi</span>
                <span className="font-semibold text-slate-800">Google OAuth 2.0</span>
              </div>
              <div className="flex items-center justify-between text-xs p-3 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Sistem Hak Akses</span>
                <span className="font-semibold text-slate-800">RLS (Row Level Security) Active</span>
              </div>
              <div className="flex items-center justify-between text-xs p-3">
                <span className="text-slate-500 font-medium">Spesifikasi Versi PRD</span>
                <span className="font-mono font-semibold text-slate-800">v1.1 (Development Ready)</span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button variant="destructive" size="md" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                <span>Sign Out / Logout Akun</span>
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
