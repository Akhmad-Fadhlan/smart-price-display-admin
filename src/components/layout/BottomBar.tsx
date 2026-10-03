'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Smartphone,
  FolderKanban,
  Palette,
  Settings,
} from 'lucide-react';

export const BottomBar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Devices', href: '/devices', icon: Smartphone },
    { name: 'Groups', href: '/groups', icon: FolderKanban },
    { name: 'Profiles', href: '/display-profiles', icon: Palette },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 md:hidden px-2 py-1.5 shadow-2xl">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            !!pathname &&
            (pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href)));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'text-blue-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-blue-400 stroke-[2.5]' : 'text-slate-400'
                  }`}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 tracking-tight ${
                  isActive ? 'text-blue-400 font-bold' : 'text-slate-400'
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
