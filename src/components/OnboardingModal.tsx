import React, { useState } from 'react';
import { Bike, Language, NumberFormatType } from '../types';
import { translations } from '../utils/i18n';
import { Bike as BikeIcon, Sparkles, Gauge, ArrowRight } from 'lucide-react';

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
  const [initialOdo, setInitialOdo] = useState('');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
        {/* Language switch at top right */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 p-2 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-md">
            <img src="/logo.png" alt="Bike Tracker" className="w-full h-full object-contain dark:invert" />
          </div>

          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => onSetLanguage('bn')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                language === 'bn'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => onSetLanguage('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                language === 'en'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              English
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t.onboardingTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {t.onboardingSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.bikeName} *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Yamaha FZ-S, Suzuki Gixxer, Honda CB Shine"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.bikeModel}
              </label>
              <input
                type="text"
                placeholder="150cc"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.regNumber}
              </label>
              <input
                type="text"
                placeholder="ঢাকা মেট্রো-ল..."
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">
                {t.km}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition"
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
