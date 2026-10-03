'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Smartphone,
  FolderKanban,
  Palette,
  Settings,
  LogOut,
  Monitor,
  Zap,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Devices', href: '/devices', icon: Smartphone },
    { name: 'Groups', href: '/groups', icon: FolderKanban },
    { name: 'Display Profiles', href: '/display-profiles', icon: Palette },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold">
          <Monitor className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-tight">PRICE DISPLAY</h1>
          <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Management v1.1
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Menu Utama
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = !!pathname && (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Simulator Quick Status Info */}
      <div className="mx-3 mb-3 p-3 bg-slate-850 rounded-lg border border-slate-800 text-xs">
        <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Firmware Protocol</span>
          </span>
          <span className="text-[10px] font-mono text-emerald-400">HTTP/20s</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Device polling heartbeat & config via REST API endpoints.
        </p>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white border border-slate-600 shrink-0">
            AF
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">Akhmad Fadhlan</p>
            <p className="text-[10px] text-slate-400 truncate">admin@email.com</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Logout"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors ml-1 shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
