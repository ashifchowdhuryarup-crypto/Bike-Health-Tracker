import React, { useState } from 'react';
import { Bike, Language, NumberFormatType } from '../types';
import { translations } from '../utils/i18n';
import { ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (bike: Omit<Bike, 'id' | 'createdAt'>) => void;
  language: Language;
  onSetLanguage: (lang: Language) => void;
  numberFormat: NumberFormatType;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  language,
  onSetLanguage,
}) => {
  const t = translations[language];

  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [initialOdo, setInitialOdo] = useState('8943');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const odo = parseFloat(initialOdo);
    if (!name.trim()) {
      setError(language === 'bn' ? 'দয়া করে বাইকের নাম লিখুন' : 'Please enter bike name');
      return;
    }
    if (isNaN(odo) || odo < 0) {
      setError(language === 'bn' ? 'সঠিক ওডোমিটার রিডিং লিখুন' : 'Please enter valid odometer');
      return;
    }

    onComplete({
      name: name.trim(),
      model: model.trim() || 'Motorcycle',
      registrationNumber: regNumber.trim() || undefined,
      initialOdometer: odo,
      currentOdometer: odo,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-[#171C18] rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-full bg-[#EEF9DA] dark:bg-[#1E2B14] p-2.5 flex items-center justify-center">
            <img src="/logo.png" alt="Bike Tracker" className="w-full h-full object-contain dark:invert" />
          </div>

          <div className="flex rounded-2xl bg-[#F6F7F4] dark:bg-white/[0.06] p-1">
            <button
              type="button"
              onClick={() => onSetLanguage('bn')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                language === 'bn'
                  ? 'bg-white dark:bg-[#171C18] text-[#141912] dark:text-[#A3EC38] shadow-xs'
                  : 'text-[#6F766C] dark:text-slate-400'
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => onSetLanguage('en')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                language === 'en'
                  ? 'bg-white dark:bg-[#171C18] text-[#141912] dark:text-[#A3EC38] shadow-xs'
                  : 'text-[#6F766C] dark:text-slate-400'
              }`}
            >
              English
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-xl font-extrabold text-[#141912] dark:text-white tracking-tight">
            {t.onboardingTitle}
          </h1>
          <p className="text-xs text-[#6F766C] dark:text-slate-400 mt-1 leading-relaxed">
            {t.onboardingSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          {error && (
            <div className="p-3 rounded-2xl bg-[#FFEEEE] dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
              {t.bikeName} *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Yamaha FZ-S, Suzuki Gixxer, Honda CB Shine"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-xs font-medium focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
                {t.bikeModel}
              </label>
              <input
                type="text"
                placeholder="150cc"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-xs font-medium focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
                {t.regNumber}
              </label>
              <input
                type="text"
                placeholder="ঢাকা মেট্রো-ল..."
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-xs font-medium focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
              {t.initialOdo} *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                placeholder="8500"
                value={initialOdo}
                onChange={(e) => setInitialOdo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-sm font-extrabold tabular-nums focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-[#6F766C] dark:text-slate-400 font-bold">
                {t.km}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3.5 px-4 rounded-full bg-[#9AE62E] hover:bg-[#8CD825] active:scale-[0.98] text-[#141912] font-extrabold text-sm shadow-sm transition"
            >
              <span>{t.startTracking}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
