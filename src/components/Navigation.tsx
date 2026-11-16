import React from 'react';
import { TabType, Language } from '../types';
import { translations } from '../utils/i18n';
import { Home, Fuel, Wrench, BarChart3, Plus } from 'lucide-react';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenAddFuel: () => void;
  language: Language;
  urgentServiceCount: number;
  hasOverdueService: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddFuel,
  language,
  urgentServiceCount,
  hasOverdueService,
}) => {
  const t = translations[language];

  const leftTabs: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'fuel', label: t.navFuel, icon: Fuel },
  ];

  const rightTabs: {
    id: TabType;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: 'service',
      label: t.navService,
      icon: Wrench,
      badge: urgentServiceCount > 0 ? urgentServiceCount : undefined,
    },
    { id: 'reports', label: t.navReports, icon: BarChart3 },
  ];

  const renderTabButton = (tab: {
    id: TabType;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }) => {
    const Icon = tab.icon;
    const isActive = currentTab === tab.id;

    return (
      <button
        key={tab.id}
        onClick={() => onSelectTab(tab.id)}
        className={`relative flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-2xl transition-all duration-200 active:scale-95 ${
          isActive
            ? 'text-[#141912] dark:text-[#A3EC38] font-bold'
            : 'text-[#7A8277] dark:text-slate-400 hover:text-[#141912] dark:hover:text-slate-200 font-medium'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <Icon
            className={`w-[20px] h-[20px] transition-transform duration-200 ${
              isActive ? 'stroke-[2.4]' : 'stroke-[1.9]'
            }`}
          />
          {tab.badge !== undefined && tab.badge > 0 && (
            <span
              className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${
                hasOverdueService ? 'bg-rose-500' : 'bg-amber-500'
              }`}
            >
              {tab.badge}
            </span>
          )}
        </div>
        <span className="text-[11px] mt-1 leading-none tracking-tight truncate max-w-full">
          {tab.label}
        </span>
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#171C18]/95 backdrop-blur-md border-t border-black/[0.05] dark:border-white/[0.07] pb-safe">
      <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto grid grid-cols-5 items-center px-2 py-1.5">
        {leftTabs.map(renderTabButton)}

        {/* Center Lime Action Button (Add Fuel) */}
        <div className="flex items-center justify-center">
          <button
            onClick={onOpenAddFuel}
            aria-label={t.addFuel}
            title={t.addFuel}
            className="w-12 h-12 rounded-full bg-[#9AE62E] hover:bg-[#8CD825] text-[#141912] shadow-[0_6px_16px_rgba(140,216,37,0.38)] flex items-center justify-center active:scale-95 transition"
          >
            <Plus className="w-6 h-6 stroke-[2.6]" />
          </button>
        </div>

        {rightTabs.map(renderTabButton)}
      </div>
    </nav>
  );
};
