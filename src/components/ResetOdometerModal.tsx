import React, { useState, useEffect, useMemo } from 'react';
import { Bike, ServiceItem, ServiceLog, Language, NumberFormatType } from '../types';
import { translations, formatOdometer, getLocalDateString } from '../utils/i18n';
import { autoSyncServicesForOdometerChange, calculateServiceUrgency } from '../utils/calculations';
import {
  Gauge,
  X,
  AlertTriangle,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface ResetOdometerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bike: Bike | null;
  serviceItems: ServiceItem[];
  serviceLogs: ServiceLog[];
  onResetOdometer: (
    newOdometer: number,
    resetAllServices: boolean,
    clearPriorFuel: boolean
  ) => void;
  language: Language;
  numberFormat: NumberFormatType;
}

export const ResetOdometerModal: React.FC<ResetOdometerModalProps> = ({
  isOpen,
  onClose,
  bike,
  serviceItems,
  serviceLogs,
  onResetOdometer,
  language,
  numberFormat,
}) => {
  const t = translations[language];

  const [newOdoInput, setNewOdoInput] = useState<string>('');
  const [resetAllServices, setResetAllServices] = useState<boolean>(false);
  const [clearPriorFuel, setClearPriorFuel] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bike) {
      setNewOdoInput(bike.currentOdometer.toString());
      setError(null);
      setResetAllServices(false);
      setClearPriorFuel(false);
    }
  }, [bike, isOpen]);

  const parsed = parseFloat(newOdoInput);
  const isValidParsed = !isNaN(parsed) && parsed >= 0;

  const previewServices = useMemo(() => {
    if (!bike || !isValidParsed) return [];
    const bikeItems = serviceItems.filter((s) => s.bikeId === bike.id);
    const { updatedItems } = autoSyncServicesForOdometerChange(
      bikeItems,
      bike,
      bike.currentOdometer,
      parsed,
      serviceLogs,
      getLocalDateString(),
      resetAllServices
    );
    return updatedItems
      .map((item) => calculateServiceUrgency(item, parsed))
      .sort((a, b) => a.urgencyScore - b.urgencyScore)
      .slice(0, 3);
  }, [bike, isValidParsed, parsed, serviceItems, serviceLogs, resetAllServices]);

  if (!isOpen || !bike) return null;

  const currentOdo = bike.currentOdometer;
  const diff = isValidParsed ? parsed - currentOdo : 0;

  const handleAddKm = (increment: number) => {
    const current = !isNaN(parsed) ? parsed : currentOdo;
    setNewOdoInput((Math.round(Math.max(0, current + increment) * 100) / 100).toString());
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidParsed) {
      setError(
        language === 'bn'
          ? 'অনুগ্রহ করে একটি সঠিক ওডোমিটার রিডিং (০ বা তার বেশি) লিখুন।'
          : 'Please enter a valid odometer reading (0 or greater).'
      );
      return;
    }

    onResetOdometer(parsed, resetAllServices, clearPriorFuel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-[#171C18] rounded-t-[28px] sm:rounded-[28px] shadow-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#EEF9DA] dark:bg-[#1E2B14] text-[#5C9E00] dark:text-[#A3EC38] flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#141912] dark:text-white">
                {language === 'bn' ? 'ওডোমিটার আপডেট' : 'Update Odometer'}
              </h2>
              <p className="text-xs text-[#6F766C] dark:text-slate-400">
                {bike.name} · {bike.registrationNumber || bike.model}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#6F766C] hover:text-[#141912] dark:text-slate-400 dark:hover:text-white hover:bg-[#F6F7F4] dark:hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div className="p-3.5 rounded-2xl bg-[#F6F7F4] dark:bg-white/[0.04] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#6F766C] dark:text-slate-400 block">
                {t.currentOdoReading}
              </span>
              <span className="text-xl font-extrabold tabular-nums text-[#141912] dark:text-white">
                {formatOdometer(currentOdo, language, numberFormat)} {t.km}
              </span>
            </div>
            <span className="text-xs font-bold text-[#5C9E00] dark:text-[#A3EC38]">
              {language === 'bn' ? 'বর্তমান রিডিং' : 'Current'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6F766C] dark:text-slate-400 mb-1.5">
              {language === 'bn' ? 'কুইক রিডিং যোগ করুন' : 'Quick Adjust'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewOdoInput(currentOdo.toString());
                  setError(null);
                }}
                className="px-3 py-2.5 min-h-[40px] rounded-2xl text-xs font-bold bg-[#F6F7F4] dark:bg-white/[0.05] text-[#141912] dark:text-slate-200 hover:bg-[#D7F49A] dark:hover:bg-[#1E2B14] transition text-center"
              >
                {language === 'bn' ? 'আগের রিডিং' : 'Reset Input'}
              </button>

              <button
                type="button"
                onClick={() => handleAddKm(50)}
                className="px-3 py-2.5 min-h-[40px] rounded-2xl text-xs font-bold bg-[#F6F7F4] dark:bg-white/[0.05] text-[#141912] dark:text-slate-200 hover:bg-[#D7F49A] dark:hover:bg-[#1E2B14] transition text-center"
              >
                {language === 'bn' ? '+৫০ কিমি' : '+50 km'}
              </button>

              <button
                type="button"
                onClick={() => handleAddKm(100)}
                className="px-3 py-2.5 min-h-[40px] rounded-2xl text-xs font-bold bg-[#F6F7F4] dark:bg-white/[0.05] text-[#141912] dark:text-slate-200 hover:bg-[#D7F49A] dark:hover:bg-[#1E2B14] transition text-center"
              >
                {language === 'bn' ? '+১০০ কিমি' : '+100 km'}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#3F4A39] dark:text-slate-300">
                {language === 'bn' ? 'নতুন ওডোমিটার রিডিং (কিমি) *' : 'New Odometer Reading (km) *'}
              </label>
              {isValidParsed && parsed !== currentOdo && (
                <span className={`text-xs font-extrabold tabular-nums ${diff > 0 ? 'text-[#5C9E00] dark:text-[#A3EC38]' : 'text-amber-600 dark:text-amber-400'}`}>
                  {diff > 0
                    ? `+${formatOdometer(diff, language, numberFormat)} ${t.km}`
                    : `-${formatOdometer(Math.abs(diff), language, numberFormat)} ${t.km}`}
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                min="0"
                value={newOdoInput}
                onChange={(e) => {
                  setNewOdoInput(e.target.value);
                  setError(null);
                }}
                placeholder={currentOdo.toString()}
                className="w-full px-4 py-3 pr-14 rounded-2xl bg-[#F6F7F4] dark:bg-[#0D110E] border border-black/[0.08] dark:border-white/[0.1] text-[#141912] dark:text-white text-lg font-extrabold tabular-nums focus:ring-2 focus:ring-[#9AE62E] focus:outline-none transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#6F766C] dark:text-slate-400">
                {t.km}
              </span>
            </div>
          </div>

          {/* Auto-Sync Preview */}
          <div className="p-3.5 rounded-2xl bg-[#EEF9DA]/70 dark:bg-[#1E2B14] border border-[#C6EA7E]/70 dark:border-[#9AE62E]/20 space-y-2">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#5C9E00] dark:text-[#A3EC38] shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-[#141912] dark:text-[#ECFACB] leading-snug">
                {language === 'bn'
                  ? 'ওডোমিটার আপডেট করার সাথে সাথেই সব সার্ভিসের বাকি দূরত্ব অটোমেটিক সিঙ্ক ও আপডেট হয়ে যাবে।'
                  : 'All service records and remaining distances auto-sync automatically with the new odometer.'}
              </p>
            </div>

            {previewServices.length > 0 && (
              <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.1] space-y-1">
                {previewServices.map((u) => (
                  <div key={u.item.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-[#3F4A39] dark:text-slate-300 font-medium truncate pr-2">
                      {language === 'bn' ? u.item.nameBn : u.item.nameEn}
                    </span>
                    <span
                      className={`font-bold shrink-0 tabular-nums ${
                        u.kmRemaining <= 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : u.kmRemaining <= 200
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-[#5C9E00] dark:text-[#A3EC38]'
                      }`}
                    >
                      {u.kmRemaining <= 0
                        ? `${formatOdometer(Math.abs(u.kmRemaining), language, numberFormat)} ${t.km} ${language === 'bn' ? 'বেশি' : 'past'}`
                        : `${formatOdometer(u.kmRemaining, language, numberFormat)} ${t.km} ${language === 'bn' ? 'বাকি' : 'left'}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1 border-t border-black/[0.05] dark:border-white/[0.08]">
            <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
              resetAllServices
                ? 'bg-[#FFF6E5] dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                : 'bg-[#F6F7F4] dark:bg-white/[0.03] border-black/[0.05] dark:border-white/[0.06]'
            }`}>
              <input
                type="checkbox"
                checked={resetAllServices}
                onChange={(e) => setResetAllServices(e.target.checked)}
                className="mt-0.5 rounded accent-amber-500 w-4 h-4"
              />
              <span className="text-xs font-bold text-[#141912] dark:text-slate-200 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  {language === 'bn'
                    ? 'সব সার্ভিস এই ওডোমিটার থেকে নতুন করে শুরু করুন (ঐচ্ছিক)'
                    : 'Start all services fresh from this odometer (Optional)'}
                </span>
              </span>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
              clearPriorFuel
                ? 'bg-[#FFEEEE] dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                : 'bg-[#F6F7F4] dark:bg-white/[0.03] border-black/[0.05] dark:border-white/[0.06]'
            }`}>
              <input
                type="checkbox"
                checked={clearPriorFuel}
                onChange={(e) => setClearPriorFuel(e.target.checked)}
                className="mt-0.5 rounded accent-rose-600 w-4 h-4"
              />
              <span className={`text-xs font-bold block ${clearPriorFuel ? 'text-rose-800 dark:text-rose-200' : 'text-[#141912] dark:text-slate-300'}`}>
                {language === 'bn' ? 'পূর্বের ফুয়েল ও সার্ভিস লগ মুছে দিন (ঐচ্ছিক)' : 'Wipe prior fuel & service history (Optional)'}
              </span>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#FFEEEE] dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] rounded-full text-xs font-semibold text-[#6F766C] dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              {translations[language].cancel}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 min-h-[44px] rounded-full bg-[#9AE62E] hover:bg-[#8CD825] active:scale-95 text-[#141912] text-xs font-bold shadow-sm transition flex items-center gap-1.5"
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
