import React, { useState, useEffect } from 'react';
import { Bike, Language, NumberFormatType } from '../types';
import { translations, formatNumber } from '../utils/i18n';
import {
  Gauge,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sliders,
} from 'lucide-react';

interface ResetOdometerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bike: Bike | null;
  onResetOdometer: (
    newOdometer: number,
    serviceMode: 'keep' | 'shift' | 'resetAll',
    clearPriorFuel: boolean
  ) => void;
  language: Language;
  numberFormat: NumberFormatType;
}

export const ResetOdometerModal: React.FC<ResetOdometerModalProps> = ({
  isOpen,
  onClose,
  bike,
  onResetOdometer,
  language,
  numberFormat,
}) => {
  const t = translations[language];

  const [newOdoInput, setNewOdoInput] = useState<string>('');
  const [serviceMode, setServiceMode] = useState<'keep' | 'shift' | 'resetAll'>('keep');
  const [clearPriorFuel, setClearPriorFuel] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Set default input when modal opens or bike changes
  useEffect(() => {
    if (bike) {
      setNewOdoInput(bike.currentOdometer.toString());
      setError(null);
      setServiceMode('keep');
      setClearPriorFuel(false);
    }
  }, [bike, isOpen]);

  if (!isOpen || !bike) return null;

  const currentOdo = bike.currentOdometer;
  const parsed = parseFloat(newOdoInput);
  const diff = !isNaN(parsed) ? parsed - currentOdo : 0;

  const handleAddKm = (increment: number) => {
    const current = parseFloat(newOdoInput) || currentOdo;
    setNewOdoInput(Math.max(0, current + increment).toString());
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(parsed) || parsed < 0) {
      setError(
        language === 'bn'
          ? 'অনুগ্রহ করে একটি সঠিক ওডোমিটার রিডিং (০ বা তার বেশি) লিখুন।'
          : 'Please enter a valid odometer reading (0 or greater).'
      );
      return;
    }

    onResetOdometer(parsed, serviceMode, clearPriorFuel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'bn' ? 'ওডোমিটার পরিবর্তন ও সমন্বয়' : 'Update Odometer & Sync'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {bike.name} • {bike.registrationNumber || bike.model}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Current Reading Card */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Gauge className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {t.currentOdoReading}
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatNumber(currentOdo, language, numberFormat)} {t.km}
                </span>
              </div>
            </div>

            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
              {language === 'bn' ? 'আগের রিডিং' : 'Current'}
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              {language === 'bn' ? 'কুইক রিডিং যোগ করুন' : 'Quick Adjust'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewOdoInput(currentOdo.toString());
                  setError(null);
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400 transition text-center"
              >
                {language === 'bn' ? 'বর্তমান রিডিং' : 'Reset to Current'}
              </button>

              <button
                type="button"
                onClick={() => handleAddKm(50)}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400 transition text-center"
              >
                +৫০ কিমি
              </button>

              <button
                type="button"
                onClick={() => handleAddKm(100)}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400 transition text-center"
              >
                +১০০ কিমি
              </button>
            </div>
          </div>

          {/* New Odometer Reading Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {language === 'bn' ? 'নতুন ওডোমিটার রিডিং (কিমি) *' : 'New Odometer Reading (km) *'}
              </label>
              {!isNaN(parsed) && parsed !== currentOdo && (
                <span className={`text-xs font-bold ${diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {diff > 0 ? `+${formatNumber(diff, language, numberFormat)} কিমি বৃদ্ধি` : `${formatNumber(Math.abs(diff), language, numberFormat)} কিমি কম`}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                value={newOdoInput}
                onChange={(e) => {
                  setNewOdoInput(e.target.value);
                  setError(null);
                }}
                placeholder={currentOdo.toString()}
                className="w-full px-4 py-3 pr-14 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-lg font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 dark:text-slate-500">
                {t.km}
              </span>
            </div>
          </div>

          {/* Service Handling Options */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === 'bn' ? 'সার্ভিস রেকর্ড কীভাবে আপডেট হবে?' : 'How should service records update?'}
            </label>

            {/* Mode 1: Keep Records & Recalculate remaining (Default / Recommended) */}
            <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
              serviceMode === 'keep'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400/50'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
            }`}>
              <input
                type="radio"
                name="serviceMode"
                value="keep"
                checked={serviceMode === 'keep'}
                onChange={() => setServiceMode('keep')}
                className="mt-1 text-emerald-600 focus:ring-emerald-500 w-4 h-4 border-slate-300 dark:border-slate-600"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'bn' ? 'বিদ্যমান রেকর্ড রাখুন (প্রস্তাবিত)' : 'Keep Existing Records (Recommended)'}</span>
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-0.5 leading-relaxed">
                  {language === 'bn'
                    ? 'আগের সার্ভিস রেকর্ড মুছবে না; নতুন ওডোমিটার অনুযায়ী বাকি কিমি (Remaining KM) স্বয়ংক্রিয়ভাবে হিসাব হবে।'
                    : 'Previous service records stay safe; remaining km is recalculated directly from the new odometer.'}
                </span>
              </div>
            </label>

            {/* Mode 2: Shift by difference */}
            <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
              serviceMode === 'shift'
                ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600 ring-1 ring-blue-400/50'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
            }`}>
              <input
                type="radio"
                name="serviceMode"
                value="shift"
                checked={serviceMode === 'shift'}
                onChange={() => setServiceMode('shift')}
                className="mt-1 text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300 dark:border-slate-600"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{language === 'bn' ? 'সার্ভিস রেকর্ড ওডোমিটারের দূরত্বের সাথে শিফট করুন' : 'Shift Records by Odometer Difference'}</span>
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-0.5 leading-relaxed">
                  {language === 'bn'
                    ? `ওডোমিটার যত বেড়েছে বা কমেছে (${diff >= 0 ? '+' : ''}${formatNumber(diff, language, numberFormat)} কিমি), পূর্বের সার্ভিসের রিডিংও সেই পরিমাণ সমন্বয় হবে।`
                    : `Shift all previous service milestones by the odometer difference (${diff >= 0 ? '+' : ''}${diff} km).`}
                </span>
              </div>
            </label>

            {/* Mode 3: Reset all to new odometer */}
            <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
              serviceMode === 'resetAll'
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600 ring-1 ring-amber-400/50'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
            }`}>
              <input
                type="radio"
                name="serviceMode"
                value="resetAll"
                checked={serviceMode === 'resetAll'}
                onChange={() => setServiceMode('resetAll')}
                className="mt-1 text-amber-600 focus:ring-amber-500 w-4 h-4 border-slate-300 dark:border-slate-600"
              />
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{language === 'bn' ? 'সব সার্ভিস নতুন ওডোমিটারে ফ্রেশ শুরু করুন' : 'Reset All Services to New Odometer'}</span>
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block mt-0.5 leading-relaxed">
                  {language === 'bn'
                    ? 'সব সার্ভিসের শেষ সার্ভিস কিমি নতুন ওডোমিটারে সেট করে নতুন সাইকেল শুরু হবে।'
                    : 'Set all services as last done at this new odometer reading.'}
                </span>
              </div>
            </label>
          </div>

          {/* Danger wipe option (Separate and off by default) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
              clearPriorFuel
                ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                : 'bg-slate-50/60 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800'
            }`}>
              <input
                type="checkbox"
                checked={clearPriorFuel}
                onChange={(e) => setClearPriorFuel(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 border-slate-300 dark:border-slate-600"
              />
              <div>
                <span className={`text-xs font-bold block ${clearPriorFuel ? 'text-rose-900 dark:text-rose-200' : 'text-slate-700 dark:text-slate-300'}`}>
                  {language === 'bn' ? 'পূর্বের ফুয়েল ও সার্ভিস লগ মুছে দিন (ঐচ্ছিক)' : 'Wipe prior fuel & service history (Optional)'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-snug">
                  {language === 'bn'
                    ? 'সাধারণ ওডোমিটার আপডেটে এটি বন্ধ রাখুন। শুধু নতুনভাবে সব মুছে শুরু করতে চাইলে টিক দিন।'
                    : 'Keep unchecked for normal odometer updates. Only check if you want to wipe history.'}
                </span>
              </div>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              {translations[language].cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5"
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ওডোমিটার আপডেট করুন' : 'Update Odometer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
