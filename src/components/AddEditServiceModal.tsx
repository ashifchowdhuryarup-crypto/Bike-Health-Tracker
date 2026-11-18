import React, { useState, useEffect } from 'react';
import { ServiceItem, Bike, Language, NumberFormatType } from '../types';
import { translations, getLocalDateString } from '../utils/i18n';
import { Wrench, X, AlertCircle } from 'lucide-react';

interface AddEditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bike: Bike;
  editingItem: ServiceItem | null;
  onSaveServiceItem: (item: Omit<ServiceItem, 'id'>, id?: string) => void;
  language: Language;
  numberFormat: NumberFormatType;
}

export const AddEditServiceModal: React.FC<AddEditServiceModalProps> = ({
  isOpen,
  onClose,
  bike,
  editingItem,
  onSaveServiceItem,
  language,
}) => {
  const t = translations[language];

  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [kmInterval, setKmInterval] = useState('2000');
  const [dayInterval, setDayInterval] = useState('');
  const [lastServiceKm, setLastServiceKm] = useState(bike.currentOdometer.toString());
  const [lastServiceDate, setLastServiceDate] = useState(() => getLocalDateString());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      setNameBn(editingItem.nameBn);
      setNameEn(editingItem.nameEn);
      setKmInterval(editingItem.kmInterval.toString());
      setDayInterval(editingItem.dayInterval ? editingItem.dayInterval.toString() : '');
      setLastServiceKm(editingItem.lastServiceKm.toString());
      setLastServiceDate(editingItem.lastServiceDate);
    } else {
      setNameBn('');
      setNameEn('');
      setKmInterval('2000');
      setDayInterval('');
      setLastServiceKm(bike.currentOdometer.toString());
      setLastServiceDate(getLocalDateString());
    }
    setError(null);
  }, [editingItem, bike.currentOdometer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const kmInt = parseInt(kmInterval, 10);
    const lastKm = parseFloat(lastServiceKm);
    const dayInt = dayInterval ? parseInt(dayInterval, 10) : undefined;

    if (!nameBn.trim() && !nameEn.trim()) {
      setError(language === 'bn' ? 'দয়া করে সার্ভিসের নাম লিখুন' : 'Please provide a service name');
      return;
    }
    if (isNaN(kmInt) || kmInt <= 0) {
      setError(language === 'bn' ? 'সঠিক কিমি ইন্টারভাল দিন' : 'Please provide a valid km interval');
      return;
    }
    if (isNaN(lastKm) || lastKm < 0) {
      setError(language === 'bn' ? 'সঠিক ওডোমিটার দিন' : 'Please provide a valid odometer');
      return;
    }

    onSaveServiceItem(
      {
        bikeId: bike.id,
        nameBn: nameBn.trim() || nameEn.trim(),
        nameEn: nameEn.trim() || nameBn.trim(),
        kmInterval: kmInt,
        dayInterval: dayInt && !isNaN(dayInt) ? dayInt : undefined,
        lastServiceKm: lastKm,
        lastServiceDate,
      },
      editingItem?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-[#171C18] rounded-t-[28px] sm:rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#EEF9DA] dark:bg-[#1E2B14] flex items-center justify-center text-[#5C9E00] dark:text-[#A3EC38]">
              <Wrench className="w-4 h-4" />
            </div>
            <h2 className="text-base font-extrabold text-[#141912] dark:text-white">
              {editingItem ? t.editServiceItem : t.addCustomService}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#6F766C] hover:text-[#141912] dark:text-slate-400 dark:hover:text-white hover:bg-[#F6F7F4] dark:hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {error && (
            <div className="p-3 rounded-2xl bg-[#FFEEEE] dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
              {t.serviceNameBn} *
            </label>
            <input
              type="text"
              required
              placeholder="যেমন: কুল্যান্ট পরিবর্তন"
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-xs font-medium focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
              {t.serviceNameEn}
            </label>
            <input
              type="text"
              placeholder="e.g., Coolant Flush"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-xs font-medium focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
                {t.kmInterval} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="100"
                  required
                  placeholder="2500"
                  value={kmInterval}
                  onChange={(e) => setKmInterval(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-xs font-bold tabular-nums focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-[#6F766C] dark:text-slate-400 font-semibold">
                  {t.km}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
                {t.dayInterval}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  placeholder="90"
                  value={dayInterval}
                  onChange={(e) => setDayInterval(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-xs font-bold tabular-nums focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-[#6F766C] dark:text-slate-400 font-semibold">
                  {language === 'bn' ? 'দিন' : 'days'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
                {t.lastServiceKm} *
              </label>
              <input
                type="number"
                step="any"
                required
                value={lastServiceKm}
                onChange={(e) => setLastServiceKm(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-xs font-bold tabular-nums focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
                {t.lastServiceDate} *
              </label>
              <input
                type="date"
                required
                value={lastServiceDate}
                onChange={(e) => setLastServiceDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-xs font-semibold focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] rounded-full text-xs font-semibold text-[#6F766C] dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 min-h-[44px] rounded-full bg-[#9AE62E] hover:bg-[#8CD825] active:scale-95 text-[#141912] font-bold text-xs shadow-sm transition"
            >
              {t.saveEntry}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
