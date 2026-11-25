import React from 'react';
import {
  LayoutDashboard,
  Store,
  Percent,
  Users,
  Package,
  Table2,
  Sparkles,
} from 'lucide-react';
import { PageId } from '../types/sales';

interface NavItem {
  id: PageId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard },
  { id: 'stores', label: 'Stores', shortLabel: 'Stores', icon: Store },
  { id: 'discounts', label: 'Discounts', shortLabel: 'Discounts', icon: Percent },
  { id: 'salespeople', label: 'Salespeople', shortLabel: 'Team', icon: Users },
  { id: 'products', label: 'Products & Categories', shortLabel: 'Products', icon: Package },
  { id: 'transactions', label: 'Transactions', shortLabel: 'Rows', icon: Table2 },
  { id: 'assistant', label: 'AI Assistance', shortLabel: 'AI', icon: Sparkles },
];

interface LayoutShellProps {
  activePage: PageId;
  onSelectPage: (page: PageId) => void;
  topSlot: React.ReactNode;
  slicerSlot: React.ReactNode;
  children: React.ReactNode;
}

export const LayoutShell: React.FC<LayoutShellProps> = ({
  activePage,
  onSelectPage,
  topSlot,
  slicerSlot,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#1B2233] flex flex-col md:flex-row">
      {/* Desktop & Tablet Sidebar (hidden on mobile < md, icon-only on md..lg, full on lg+) */}
      <aside
        aria-label="Primary navigation"
        className="hidden md:flex md:w-16 lg:w-60 shrink-0 flex-col bg-white border-r border-[#E3E7EF] sticky top-0 h-screen"
      >
        <div className="h-16 px-4 flex items-center border-b border-[#E3E7EF]">
          <div className="w-8 h-8 rounded-lg bg-[#22308F] text-white flex items-center justify-center font-bold text-sm shrink-0">
            M
          </div>
          <div className="hidden lg:block ml-3 min-w-0">
            <h1 className="text-sm font-semibold text-[#22308F] truncate">
              Metro Superstore
            </h1>
            <p className="text-[11px] text-[#5B6475] truncate">Retail Sales Analytics</p>
          </div>
        </div>

        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPage(item.id)}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#22308F] text-white'
                    : 'text-[#5B6475] hover:bg-[#F5F7FB] hover:text-[#1B2233]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden lg:inline truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:block p-4 border-t border-[#E3E7EF] text-[11px] text-[#5B6475]">
          All figures in CAD (net of discount)
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col pb-20 md:pb-8">
        <header className="px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#22308F] text-white flex items-center justify-center font-bold text-sm shrink-0">
              M
            </div>
            <h1 className="text-base font-semibold text-[#22308F] truncate">
              Metro Superstore Sales
            </h1>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 pt-3 sm:pt-5 space-y-4 max-w-[1440px] w-full mx-auto">
          {topSlot}
          {slicerSlot}
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< md) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E3E7EF] grid grid-cols-7 h-14"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPage(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
                isActive ? 'text-[#22308F]' : 'text-[#5B6475]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-full px-0.5">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
