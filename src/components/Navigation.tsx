import React from 'react';
import { TabType, Language } from '../types';
import { translations } from '../utils/i18n';
import { Home, Fuel, Wrench, BarChart3 } from 'lucide-react';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  language: Language;
  urgentServiceCount: number;
  hasOverdueService: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  language,
  urgentServiceCount,
  hasOverdueService,
}) => {
  const t = translations[language];

  const tabs: { id: TabType; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    {
      id: 'home',
      label: t.navHome,
      icon: Home,
    },
    {
      id: 'fuel',
      label: t.navFuel,
      icon: Fuel,
    },
    {
      id: 'service',
      label: t.navService,
      icon: Wrench,
      badge: urgentServiceCount > 0 ? urgentServiceCount : undefined,
    },
    {
      id: 'reports',
      label: t.navReports,
      icon: BarChart3,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-4 px-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'
                  }`}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${
                      hasOverdueService ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 leading-none tracking-tight">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-6 h-1 bg-emerald-500 dark:bg-emerald-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
