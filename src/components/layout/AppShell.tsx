'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomBar } from './BottomBar';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased pb-20 md:pb-0">
      {/* Desktop Sidebar (visible on md screens and above) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar (visible on sm screens below md) */}
      <BottomBar />
    </div>
  );
};
