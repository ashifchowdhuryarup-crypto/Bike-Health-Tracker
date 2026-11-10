import React from 'react';
import { Bike, Language, NumberFormatType } from '../types';
import { translations } from '../utils/i18n';
import { Bike as BikeIcon, Settings, Moon, Sun, ChevronDown, Plus } from 'lucide-react';

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
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Bike Selector & Branding */}
        <div className="relative">
          <button
            onClick={() => setBikeMenuOpen(!bikeMenuOpen)}
            className="flex items-center gap-2 text-left p-1 -ml-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
            aria-label={t.switchBike}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <BikeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                  {activeBike?.name || t.appName}
                </span>
                {bikes.length > 1 && (
                  <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeBike?.model || t.appTagline}
              </p>
            </div>
          </button>

          {/* Bike switch dropdown */}
          {bikeMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setBikeMenuOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50">
                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t.manageBikes}
                </div>
                <div className="space-y-1">
                  {bikes.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        onSelectBike(b.id);
                        setBikeMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between transition ${
                        b.id === activeBike?.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="leading-snug">{b.name}</div>
                        <div className="text-xs text-slate-400 font-normal">
                          {b.registrationNumber || b.model}
                        </div>
                      </div>
                      {b.id === activeBike?.id && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setBikeMenuOpen(false);
                      onOpenAddBike();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t.addBike}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Controls: Lang, Theme, Settings */}
        <div className="flex items-center gap-1.5">
          {/* Language Toggle Button */}
          <button
            onClick={onToggleLanguage}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition active:scale-95"
            title={language === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
            aria-label="Language switch"
          >
            {language === 'bn' ? 'EN' : 'বাং'}
          </button>

          {/* Dark Mode Toggle Button */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition active:scale-95"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition active:scale-95"
            aria-label={t.navSettings}
            title={t.navSettings}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
