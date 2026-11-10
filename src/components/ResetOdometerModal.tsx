import React, { useState, useEffect } from 'react';
import { Bike, Language, NumberFormatType } from '../types';
import { translations, formatNumber } from '../utils/i18n';
import {
  RotateCcw,
  Gauge,
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';

interface ResetOdometerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bike: Bike | null;
  onResetOdometer: (
    newOdometer: number,
    adjustServices: boolean,
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
  const [adjustServices, setAdjustServices] = useState<boolean>(true);
  const [clearPriorFuel, setClearPriorFuel] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Set default input when modal opens or bike changes
  useEffect(() => {
    if (bike) {
      setNewOdoInput(bike.currentOdometer.toString());
      setError(null);
      setAdjustServices(true);
      setClearPriorFuel(false);
    }
  }, [bike, isOpen]);

  if (!isOpen || !bike) return null;

  const currentOdo = bike.currentOdometer;

  const handleQuickSet = (val: number) => {
    setNewOdoInput(val.toString());
    setError(null);
    if (val === 0) {
      setClearPriorFuel(true);
      setAdjustServices(true);
    }
  };

  const handleAddKm = (increment: number) => {
    const current = parseFloat(newOdoInput) || currentOdo;
    setNewOdoInput(Math.max(0, current + increment).toString());
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newOdoInput);

    if (isNaN(parsed) || parsed < 0) {
      setError(
        language === 'bn'
          ? 'অনুগ্রহ করে একটি সঠিক ওডোমিটার রিডিং (০ বা তার বেশি) লিখুন।'
          : 'Please enter a valid odometer reading (0 or greater).'
      );
      return;
    }

    onResetOdometer(parsed, adjustServices, clearPriorFuel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t.resetOdometerTitle}
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

        {/* Content */}
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
              {language === 'bn' ? 'বর্তমান' : 'Current'}
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
              {language === 'bn' ? 'কুইক সিলেক্ট / প্রিসেট' : 'Quick Presets'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSet(0)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition flex items-center justify-center gap-1 ${
                  newOdoInput === '0'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.resetToZeroPill}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddKm(100)}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400 transition text-center"
              >
                {t.plus100Km}
              </button>

              <button
                type="button"
                onClick={() => handleAddKm(500)}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400 transition text-center"
              >
                {t.plus500Km}
              </button>
            </div>
          </div>

          {/* New Odometer Reading Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.newOdometerValue}
            </label>
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
                className="w-full px-4 py-3 pr-14 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-lg font-bold focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 dark:text-slate-500">
                {t.km}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {t.resetOdometerDesc}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Option 1: Adjust Service Reminders */}
            <label className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 cursor-pointer">
              <input
                type="checkbox"
                checked={adjustServices}
                onChange={(e) => setAdjustServices(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 border-emerald-300 dark:border-emerald-700"
              />
              <div>
                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 block">
                  {t.adjustServiceReminders}
                </span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mt-0.5 leading-relaxed">
                  {t.adjustServiceRemindersHelp}
                </span>
              </div>
            </label>

            {/* Option 2: Clear Prior Fuel Logs */}
            <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
              clearPriorFuel
                ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
            }`}>
              <input
                type="checkbox"
                checked={clearPriorFuel}
                onChange={(e) => setClearPriorFuel(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 border-slate-300 dark:border-slate-600"
              />
              <div>
                <span className={`text-xs font-semibold block ${clearPriorFuel ? 'text-rose-900 dark:text-rose-200' : 'text-slate-800 dark:text-slate-200'}`}>
                  {language === 'bn' ? 'পূর্বের সব ফুয়েল ও সার্ভিস রেকর্ড মুছে দিন (ফ্রেশ ০ কিমি শুরু)' : 'Clear previous fuel & service records (Fresh 0 km start)'}
                </span>
                <span className={`text-[11px] block mt-0.5 leading-relaxed ${clearPriorFuel ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {language === 'bn'
                    ? 'এটি সক্রিয় রাখলে পুরনো সব ফুয়েল ও সার্ভিস রেকর্ড মুছে যাবে, ফলে রিপোর্টের মোট দূরত্ব (Total Distance) ০ কিমি হয়ে একদম নতুনভাবে শুরু হবে।'
                    : 'Check this to wipe all old records so the report total distance becomes 0 km and starts 100% fresh.'}
                </span>
              </div>
            </label>
          </div>

          {/* Notice info banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p className="leading-relaxed">
              {language === 'bn'
                ? 'ওডোমিটার রিসেট করলে বাইকের ওডোমিটার আপডেট হয়ে যাবে। পরবর্তী ফুয়েল এন্ট্রি এই নতুন রিডিংয়ের সাথে সিঙ্ক থাকবে।'
                : 'Resetting the odometer updates your bike reading immediately. Subsequent fuel entries will be synced with this new reading.'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              {translations[language].cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.confirmResetBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
