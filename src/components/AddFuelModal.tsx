import React, { useState, useEffect } from 'react';
import { FuelEntry, Bike, Language, NumberFormatType, FuelPriceSettings } from '../types';
import { translations, formatNumber, formatCurrency, formatOdometer, getLocalDateString } from '../utils/i18n';
import { isFuelEntryAfterReset } from '../utils/calculations';
import { Fuel, X, AlertCircle, Sparkles } from 'lucide-react';

interface AddFuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  bike: Bike;
  fuelEntries: FuelEntry[];
  fuelPrices: FuelPriceSettings;
  onUpdateFuelPrice?: (type: 'Octane' | 'Petrol', price: number) => void;
  onAddFuelEntry: (entry: Omit<FuelEntry, 'id'>) => { success: boolean; error?: string };
  language: Language;
  numberFormat: NumberFormatType;
}

export const AddFuelModal: React.FC<AddFuelModalProps> = ({
  isOpen,
  onClose,
  bike,
  fuelEntries,
  fuelPrices,
  onUpdateFuelPrice,
  onAddFuelEntry,
  language,
  numberFormat,
}) => {
  const t = translations[language];

  const relevantFuels = fuelEntries.filter((f) =>
    isFuelEntryAfterReset(f, bike.odometerResetAt)
  );

  const maxOdo = Math.max(
    bike.currentOdometer,
    ...relevantFuels.map((f) => f.odometer),
    bike.initialOdometer
  );

  const [date, setDate] = useState(() => getLocalDateString());
  const [odometer, setOdometer] = useState<string>((Math.round((maxOdo + 150) * 100) / 100).toString());
  const [fuelType, setFuelType] = useState<'Octane' | 'Petrol'>('Octane');

  const [unitPrice, setUnitPrice] = useState<string>(
    (fuelPrices?.octane || 165).toString()
  );
  const [litres, setLitres] = useState<string>('10.0');
  const [totalPrice, setTotalPrice] = useState<string>(
    Math.round(10.0 * (fuelPrices?.octane || 165)).toString()
  );
  const [isFullTank, setIsFullTank] = useState<boolean>(true);
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const defaultRate = fuelPrices?.octane || 165;
      setDate(getLocalDateString());
      setOdometer((Math.round((maxOdo + 150) * 100) / 100).toString());
      setFuelType('Octane');
      setUnitPrice(defaultRate.toString());
      setLitres('10.0');
      setTotalPrice(Math.round(10.0 * defaultRate).toString());
      setIsFullTank(true);
      setSaveAsDefault(false);
      setNotes('');
      setError(null);
    }
  }, [isOpen, maxOdo, fuelPrices]);

  const handleFuelTypeChange = (newType: 'Octane' | 'Petrol') => {
    setFuelType(newType);
    const newRate = newType === 'Octane' ? fuelPrices?.octane || 165 : fuelPrices?.petrol || 155;
    setUnitPrice(newRate.toString());
    const lit = parseFloat(litres);
    if (!isNaN(lit) && lit > 0) {
      setTotalPrice(Math.round(lit * newRate).toString());
    }
  };

  const handleLitresChange = (val: string) => {
    setLitres(val);
    const lit = parseFloat(val);
    const rate = parseFloat(unitPrice);
    if (!isNaN(lit) && lit > 0 && !isNaN(rate) && rate > 0) {
      setTotalPrice(Math.round(lit * rate).toString());
    }
  };

  const handleUnitPriceChange = (val: string) => {
    setUnitPrice(val);
    const rate = parseFloat(val);
    const lit = parseFloat(litres);
    if (!isNaN(rate) && rate > 0 && !isNaN(lit) && lit > 0) {
      setTotalPrice(Math.round(lit * rate).toString());
    }
  };

  const handleTotalPriceChange = (val: string) => {
    setTotalPrice(val);
    const tot = parseFloat(val);
    const rate = parseFloat(unitPrice);
    if (!isNaN(tot) && tot > 0 && !isNaN(rate) && rate > 0) {
      setLitres((Math.round((tot / rate) * 100) / 100).toString());
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const odoNum = parseFloat(odometer);
    const litresNum = parseFloat(litres);
    const priceNum = parseFloat(totalPrice);
    const rateNum = parseFloat(unitPrice);

    if (isNaN(odoNum) || odoNum <= 0) {
      setError(t.invalidInputError);
      return;
    }
    if (isNaN(litresNum) || litresNum <= 0) {
      setError(t.invalidInputError);
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setError(t.invalidInputError);
      return;
    }

    if (saveAsDefault && onUpdateFuelPrice && !isNaN(rateNum) && rateNum > 0) {
      onUpdateFuelPrice(fuelType, rateNum);
    }

    const res = onAddFuelEntry({
      bikeId: bike.id,
      date,
      odometer: odoNum,
      litres: litresNum,
      unitPrice: !isNaN(rateNum) ? rateNum : undefined,
      totalPrice: priceNum,
      isFullTank,
      fuelType,
      notes: notes.trim() || undefined,
    });

    if (!res.success) {
      setError(res.error || t.odoValidationError);
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-[#171C18] rounded-t-[28px] sm:rounded-[28px] border border-black/[0.06] dark:border-white/[0.08] shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FFF3EB] dark:bg-orange-500/15 flex items-center justify-center text-orange-500">
              <Fuel className="w-4 h-4" />
            </div>
            <h2 className="text-base font-extrabold text-[#141912] dark:text-white">
              {t.addNewFuel}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
                {t.date}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-xs font-semibold focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
                {t.fuelType}
              </label>
              <select
                value={fuelType}
                onChange={(e) => handleFuelTypeChange(e.target.value as 'Octane' | 'Petrol')}
                className="w-full px-3 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-xs font-semibold focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
              >
                <option value="Octane">{t.octane} (৳{fuelPrices?.octane || 165}/L)</option>
                <option value="Petrol">{t.petrol} (৳{fuelPrices?.petrol || 155}/L)</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#EEF9DA]/70 dark:bg-[#1E2B14] border border-[#C6EA7E]/70 dark:border-[#9AE62E]/20">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#141912] dark:text-[#ECFACB] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#5C9E00] dark:text-[#A3EC38]" />
                <span>{t.unitPriceLabel}</span>
              </label>
              <span className="text-[10px] text-[#3F4A39] dark:text-[#CBE795] font-medium">
                {t.unitPriceHelp}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="any"
                  required
                  value={unitPrice}
                  onChange={(e) => handleUnitPriceChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#0D110E] text-[#141912] dark:text-white text-sm font-bold tabular-nums focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-xs text-[#6F766C] dark:text-slate-400 font-bold">
                  {t.bdt}/{t.litres}
                </span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-[#141912] dark:text-[#CBE795] shrink-0 select-none">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#5C9E00]"
                />
                <span>{t.saveAsDefaultPrice}</span>
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#3F4A39] dark:text-slate-300">
                {t.odometerReading} *
              </label>
              <span className="text-[11px] text-[#6F766C] dark:text-slate-400 tabular-nums">
                {language === 'bn' ? 'আগের ওডো:' : 'Prev:'}{' '}
                {formatOdometer(maxOdo, language, numberFormat)} {t.km}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-sm font-bold tabular-nums focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-[#6F766C] dark:text-slate-400 font-semibold">
                {t.km}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
                {t.fuelLitres} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="10.0"
                  value={litres}
                  onChange={(e) => handleLitresChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-sm font-bold tabular-nums focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-[#6F766C] dark:text-slate-400 font-semibold">
                  {t.litres}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
                {t.totalPrice} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="1650"
                  value={totalPrice}
                  onChange={(e) => handleTotalPriceChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-sm font-bold tabular-nums focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-[#6F766C] dark:text-slate-400 font-semibold">
                  {t.bdt}
                </span>
              </div>
            </div>
          </div>

          {parseFloat(litres) > 0 && parseFloat(unitPrice) > 0 && (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#F6F7F4] dark:bg-white/[0.04] text-xs tabular-nums">
              <span className="text-[#6F766C] dark:text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>{t.autoCalculatedHint}:</span>
              </span>
              <span className="font-bold text-[#141912] dark:text-white">
                {formatNumber(parseFloat(litres), language, numberFormat, 2)} {t.litres} ×{' '}
                {formatCurrency(parseFloat(unitPrice), language, numberFormat, 1)} ={' '}
                <span className="text-[#5C9E00] dark:text-[#A3EC38]">
                  {formatCurrency(parseFloat(totalPrice) || 0, language, numberFormat)}
                </span>
              </span>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-[#F6F7F4] dark:bg-white/[0.04]">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isFullTank}
                onChange={(e) => setIsFullTank(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-[#5C9E00]"
              />
              <div>
                <span className="text-xs font-bold text-[#141912] dark:text-white">
                  {t.fullTankQuestion}
                </span>
                <p className="text-[11px] text-[#6F766C] dark:text-slate-400 mt-0.5">
                  {t.fullTankHelp}
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#3F4A39] dark:text-slate-300 mb-1">
              {t.notes}
            </label>
            <input
              type="text"
              placeholder={language === 'bn' ? 'যেমন: গুলশান পেট্রোল পাম্প' : 'e.g., Gulshan Filling Station'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-xs focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
            />
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
