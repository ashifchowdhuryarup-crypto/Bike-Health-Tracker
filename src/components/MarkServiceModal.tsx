import React, { useState, useEffect } from 'react';
import { ServiceItem, Bike, Language, NumberFormatType } from '../types';
import { translations, formatNumber } from '../utils/i18n';
import { Wrench, X, Check, AlertCircle } from 'lucide-react';

interface MarkServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bike: Bike;
  serviceItems: ServiceItem[];
  preselectedItemId?: string;
  onConfirmServiceDone: (data: {
    serviceItemId: string;
    serviceItemName: string;
    date: string;
    odometer: number;
    cost?: number;
    notes?: string;
  }) => void;
  language: Language;
  numberFormat: NumberFormatType;
}

export const MarkServiceModal: React.FC<MarkServiceModalProps> = ({
  isOpen,
  onClose,
  bike,
  serviceItems,
  preselectedItemId,
  onConfirmServiceDone,
  language,
  numberFormat,
}) => {
  const t = translations[language];

  const [selectedItemId, setSelectedItemId] = useState<string>(
    preselectedItemId || (serviceItems[0]?.id ?? '')
  );
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState<string>(bike.currentOdometer.toString());
  const [cost, setCost] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedItemId) {
      setSelectedItemId(preselectedItemId);
    } else if (serviceItems.length > 0 && !selectedItemId) {
      setSelectedItemId(serviceItems[0].id);
    }
    setOdometer(bike.currentOdometer.toString());
  }, [preselectedItemId, serviceItems, bike.currentOdometer]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const odoNum = parseFloat(odometer);
    if (isNaN(odoNum) || odoNum <= 0) {
      setError(t.invalidInputError);
      return;
    }

    const item = serviceItems.find((s) => s.id === selectedItemId);
    if (!item) {
      setError(language === 'bn' ? 'সার্ভিস আইটেম পাওয়া যায়নি' : 'Service item not found');
      return;
    }

    const costNum = cost ? parseFloat(cost) : undefined;

    onConfirmServiceDone({
      serviceItemId: item.id,
      serviceItemName: language === 'bn' ? item.nameBn : item.nameEn,
      date,
      odometer: odoNum,
      cost: costNum && !isNaN(costNum) ? costNum : undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Wrench className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t.markServiceDone}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'bn' ? 'কোন সার্ভিস সম্পন্ন করেছেন?' : 'Which service was completed?'} *
            </label>
            <select
              required
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {serviceItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {language === 'bn' ? item.nameBn : item.nameEn} (প্রতি {item.kmInterval} কিমি)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.date} *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.serviceCostOptional}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  placeholder="1200"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">
                  {t.bdt}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.serviceOdometerInput} *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                {t.km}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {language === 'bn'
                ? 'রিমাইন্ডার এই ওডোমিটার ও তারিখ থেকে নতুন করে গণনা শুরু করবে।'
                : 'Reminder will reset and count forward from this odometer and date.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.notes}
            </label>
            <input
              type="text"
              placeholder={language === 'bn' ? 'যেমন: Motul 7100 10W40 ফুল সিন্থেটিক' : 'e.g., Motul 7100 10W40 Full Synthetic'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition"
            >
              {t.markDone}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
