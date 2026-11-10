import React, { useState, useEffect } from 'react';
import { ServiceItem, Bike, Language, NumberFormatType } from '../types';
import { translations } from '../utils/i18n';
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
  const [lastServiceDate, setLastServiceDate] = useState(() => new Date().toISOString().split('T')[0]);
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
      setLastServiceDate(new Date().toISOString().split('T')[0]);
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Wrench className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {editingItem ? t.editServiceItem : t.addCustomService}
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
              {t.serviceNameBn} *
            </label>
            <input
              type="text"
              required
              placeholder="যেমন: কুল্যান্ট পরিবর্তন"
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.serviceNameEn}
            </label>
            <input
              type="text"
              placeholder="e.g., Coolant Flush"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                  {t.km}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.dayInterval}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  placeholder="90"
                  value={dayInterval}
                  onChange={(e) => setDayInterval(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                  {language === 'bn' ? 'দিন' : 'days'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.lastServiceKm} *
              </label>
              <input
                type="number"
                step="any"
                required
                value={lastServiceKm}
                onChange={(e) => setLastServiceKm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.lastServiceDate} *
              </label>
              <input
                type="date"
                required
                value={lastServiceDate}
                onChange={(e) => setLastServiceDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
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
              {t.saveEntry}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
