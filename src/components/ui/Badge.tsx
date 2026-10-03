import React from 'react';

export type StatusVariant = 'online' | 'offline' | 'synced' | 'pending' | 'syncing' | 'failed' | 'partial' | 'default';

interface BadgeProps {
  variant?: StatusVariant;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className = '' }) => {
  const baseClasses = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors';

  const variants: Record<StatusVariant, string> = {
    online: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    offline: 'bg-slate-100 text-slate-600 border-slate-200',
    synced: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    syncing: 'bg-blue-50 text-blue-700 border-blue-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
    partial: 'bg-amber-50 text-amber-700 border-amber-200',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const dots: Record<StatusVariant, string | null> = {
    online: 'bg-emerald-500 animate-pulse',
    offline: 'bg-slate-400',
    synced: 'bg-emerald-500',
    pending: 'bg-amber-500',
    syncing: 'bg-blue-500 animate-spin',
    failed: 'bg-rose-500',
    partial: 'bg-amber-500',
    default: null,
  };

  const dotColor = dots[variant];

  return (
    <span className={`${baseClasses} ${variants[variant]} ${className}`}>
      {dotColor && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      {children}
    </span>
  );
};
