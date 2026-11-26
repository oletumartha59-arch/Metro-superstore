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
  const activeNav = NAV_ITEMS.find((n) => n.id === activePage) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#2B1B0E] flex flex-col md:flex-row">
      {/* Desktop & Tablet Sidebar (Deep Espresso #533416 with Warm Oat #EEDFC7 & Amber #CE7F20 accents) */}
      <aside
        aria-label="Primary navigation"
        className="hidden md:flex md:w-16 lg:w-60 shrink-0 flex-col bg-[#533416] text-[#EEDFC7] border-r border-[#3F260E] sticky top-0 h-screen"
      >
        <div className="h-16 px-3.5 lg:px-4 flex items-center border-b border-[#6A4521]">
          <div className="w-8 h-8 rounded-lg bg-[#CE7F20] text-[#2B1B0E] flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ring-1 ring-[#EEDFC7]/40">
            M
          </div>
          <div className="hidden lg:block ml-3 min-w-0">
            <h1 className="text-sm font-bold text-white tracking-tight truncate">
              Metro Superstore
            </h1>
            <p className="text-[11px] text-[#EEDFC7]/80 truncate">Retail Sales Analytics</p>
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
                className={`relative w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#EEDFC7] text-[#533416] font-semibold shadow-sm'
                    : 'text-[#EEDFC7]/85 font-medium hover:bg-[#64401D] hover:text-white'
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="hidden lg:block absolute left-1 top-2 bottom-2 w-1 rounded-full bg-[#CE7F20]"
                  />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#8F5109]' : 'text-[#EEDFC7]/80'
                  }`}
                />
                <span className="hidden lg:inline truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:block p-4 border-t border-[#6A4521] text-[11px] text-[#EEDFC7]/75 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#607938] shrink-0" aria-hidden="true" />
            <span className="font-medium text-[#EEDFC7]">Canadian Retail Chain</span>
          </div>
          <p className="pl-4">All figures in CAD (net of discount)</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col pb-20 md:pb-8">
        <header className="px-4 sm:px-6 py-3 flex items-center justify-between bg-[#533416] text-[#EEDFC7] md:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#CE7F20] text-[#2B1B0E] flex items-center justify-center font-bold text-sm shrink-0">
              M
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">
                Metro Superstore
              </h1>
              <p className="text-[11px] text-[#EEDFC7]/80 truncate">{activeNav.label}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 pt-3 sm:pt-5 space-y-4 max-w-[1440px] w-full mx-auto">
          <div className="hidden md:flex items-center justify-between border-b border-[#E5D7C1] pb-2.5">
            <div className="flex items-center gap-2 text-xs text-[#6B5744]">
              <span className="font-medium text-[#533416]">Metro Superstore</span>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-[#8F5109]">{activeNav.label}</span>
            </div>
            <span className="text-xs text-[#6B5744]">Regional Sales Intelligence · CAD</span>
          </div>

          {topSlot}
          {slicerSlot}
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< md) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#E5D7C1] grid grid-cols-7 h-14 shadow-[0_-2px_10px_rgba(83,52,22,0.06)]"
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
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] cursor-pointer ${
                isActive ? 'text-[#533416] font-semibold bg-[#FAF6EE]' : 'text-[#6B5744] font-medium'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 inset-x-2 h-0.5 rounded-full bg-[#CE7F20]"
                />
              )}
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#8F5109]' : ''}`} />
              <span className="truncate max-w-full px-0.5">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
