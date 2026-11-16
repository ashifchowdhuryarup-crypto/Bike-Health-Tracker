import React from 'react';
import { Bike, Language, NumberFormatType } from '../types';
import { translations } from '../utils/i18n';
import { Settings, Moon, Sun, ChevronDown, Plus, Check } from 'lucide-react';

interface HeaderProps {
  bikes: Bike[];
  activeBike: Bike | null;
  onSelectBike: (bikeId: string) => void;
  onOpenAddBike: () => void;
  onOpenSettings: () => void;
  language: Language;
  onToggleLanguage: () => void;
  numberFormat: NumberFormatType;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  bikes,
  activeBike,
  onSelectBike,
  onOpenAddBike,
  onOpenSettings,
  language,
  onToggleLanguage,
  darkMode,
  onToggleDarkMode,
}) => {
  const t = translations[language];
  const [bikeMenuOpen, setBikeMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 bg-[#F6F7F4]/90 dark:bg-[#0D110E]/90 backdrop-blur-md px-4 md:px-6 py-2.5">
      <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Circular Logo Avatar + Stacked Bike Name */}
        <div className="relative min-w-0">
          <button
            onClick={() => setBikeMenuOpen(!bikeMenuOpen)}
            className="flex items-center gap-3 text-left min-h-[44px] pr-2 rounded-full hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition active:scale-[0.98]"
            aria-label={t.switchBike}
          >
            <div className="w-11 h-11 rounded-full bg-white dark:bg-[#171C18] p-2 flex items-center justify-center border border-black/[0.05] dark:border-white/[0.08] shadow-[0_2px_10px_rgba(15,23,42,0.05)] shrink-0">
              <img
                src="/logo.png"
                alt="Bike Tracker"
                className="w-full h-full object-contain dark:invert transition-all"
              />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#6F766C] dark:text-slate-400 truncate leading-tight">
                {activeBike?.registrationNumber || activeBike?.model || t.appTagline}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="font-bold text-[#141912] dark:text-white text-[15px] leading-tight truncate">
                  {activeBike?.name || t.appName}
                </span>
                {bikes.length > 0 && (
                  <ChevronDown className="w-4 h-4 text-[#6F766C] dark:text-slate-400 shrink-0" />
                )}
              </div>
            </div>
          </button>

          {/* Bike switch dropdown */}
          {bikeMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setBikeMenuOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-[#171C18] rounded-[24px] shadow-[0_12px_32px_rgba(15,23,42,0.12)] border border-black/[0.05] dark:border-white/[0.08] p-2.5 z-50">
                <div className="px-3 py-1.5 text-[11px] font-bold text-[#6F766C] dark:text-slate-400 uppercase tracking-wider">
                  {t.manageBikes}
                </div>
                <div className="space-y-1">
                  {bikes.map((b) => {
                    const isSelected = b.id === activeBike?.id;
                    return (
                      <button
                        key={b.id}
                        onClick={() => {
                          onSelectBike(b.id);
                          setBikeMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 min-h-[44px] rounded-2xl text-sm flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-[#D7F49A] dark:bg-[#1E2B14] text-[#141912] dark:text-[#ECFACB] font-bold'
                            : 'text-[#141912] dark:text-slate-200 hover:bg-[#F6F7F4] dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="leading-snug truncate">{b.name}</div>
                          <div
                            className={`text-xs font-normal truncate ${
                              isSelected
                                ? 'text-[#3F4A39] dark:text-[#CBE795]'
                                : 'text-[#6F766C] dark:text-slate-400'
                            }`}
                          >
                            {b.registrationNumber || b.model}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="pt-2 mt-1.5 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <button
                    onClick={() => {
                      setBikeMenuOpen(false);
                      onOpenAddBike();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold text-[#3B7300] dark:text-[#A3EC38] hover:bg-[#EEF9DA] dark:hover:bg-[#9AE62E]/10 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.addBike}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Circular Quick Action Buttons (>= 44x44px hitboxes) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleLanguage}
            className="w-11 h-11 rounded-full text-xs font-extrabold bg-white dark:bg-[#171C18] text-[#141912] dark:text-white border border-black/[0.05] dark:border-white/[0.08] shadow-[0_2px_10px_rgba(15,23,42,0.04)] hover:bg-[#D7F49A] dark:hover:bg-white/10 transition active:scale-95 flex items-center justify-center"
            title={language === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
            aria-label="Language switch"
          >
            {language === 'bn' ? 'EN' : 'বাং'}
          </button>

          <button
            onClick={onToggleDarkMode}
            className="w-11 h-11 rounded-full text-[#141912] dark:text-slate-200 bg-white dark:bg-[#171C18] border border-black/[0.05] dark:border-white/[0.08] shadow-[0_2px_10px_rgba(15,23,42,0.04)] hover:bg-[#F0F2EC] dark:hover:bg-white/10 transition active:scale-95 flex items-center justify-center"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {darkMode ? (
              <Sun className="w-[18px] h-[18px] text-amber-400" />
            ) : (
              <Moon className="w-[18px] h-[18px] text-[#141912]" />
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className="w-11 h-11 rounded-full text-[#141912] dark:text-slate-200 bg-white dark:bg-[#171C18] border border-black/[0.05] dark:border-white/[0.08] shadow-[0_2px_10px_rgba(15,23,42,0.04)] hover:bg-[#F0F2EC] dark:hover:bg-white/10 transition active:scale-95 flex items-center justify-center"
            aria-label={t.navSettings}
            title={t.navSettings}
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
};
