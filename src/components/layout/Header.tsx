'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, Monitor } from 'lucide-react';
import { Button } from '../ui/Button';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  onAddDevice?: () => void;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  onAddDevice,
  children,
}) => {
  const router = useRouter();

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile App Brand Badge (visible on mobile only) */}
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs font-bold md:hidden shrink-0">
          <Monitor className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        {children}
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} title="Muat Ulang Data">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Refresh</span>
          </Button>
        )}
        {onAddDevice && (
          <Button variant="primary" size="sm" onClick={onAddDevice}>
            <Plus className="w-4 h-4" />
            <span>Tambah Device</span>
          </Button>
        )}
      </div>
    </header>
  );
};
