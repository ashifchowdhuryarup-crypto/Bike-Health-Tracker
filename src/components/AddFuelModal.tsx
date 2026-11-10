import React, { useState, useEffect } from 'react';
import { FuelEntry, Bike, Language, NumberFormatType, FuelPriceSettings } from '../types';
import { translations, formatNumber, formatCurrency } from '../utils/i18n';
import { Fuel, X, AlertCircle, Sparkles, Check } from 'lucide-react';

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

  const maxOdo = Math.max(
    bike.currentOdometer,
    ...fuelEntries.map((f) => f.odometer),
    bike.initialOdometer
  );

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState<string>((maxOdo + 150).toString());
  const [fuelType, setFuelType] = useState<'Octane' | 'Petrol'>('Octane');
  
  // Fuel Rate per litre (defaults to 165 for Octane, 155 for Petrol)
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

  // Sync unit price when opening or when fuelType changes
  useEffect(() => {
    if (isOpen) {
      const defaultRate = fuelType === 'Octane' ? fuelPrices?.octane || 165 : fuelPrices?.petrol || 155;
      setUnitPrice(defaultRate.toString());
      const lit = parseFloat(litres);
      if (!isNaN(lit) && lit > 0) {
        setTotalPrice(Math.round(lit * defaultRate).toString());
      }
    }
  }, [isOpen, fuelType, fuelPrices]);

  // Handle Fuel Type switch
  const handleFuelTypeChange = (newType: 'Octane' | 'Petrol') => {
    setFuelType(newType);
    const newRate = newType === 'Octane' ? fuelPrices?.octane || 165 : fuelPrices?.petrol || 155;
    setUnitPrice(newRate.toString());
    const lit = parseFloat(litres);
    if (!isNaN(lit) && lit > 0) {
      setTotalPrice(Math.round(lit * newRate).toString());
    }
  };

  // Handle Litres Change -> Auto Update Total Price
  const handleLitresChange = (val: string) => {
    setLitres(val);
    const lit = parseFloat(val);
    const rate = parseFloat(unitPrice);
    if (!isNaN(lit) && lit > 0 && !isNaN(rate) && rate > 0) {
      setTotalPrice(Math.round(lit * rate).toString());
    }
  };

  // Handle Unit Price Change -> Auto Update Total Price
  const handleUnitPriceChange = (val: string) => {
    setUnitPrice(val);
    const rate = parseFloat(val);
    const lit = parseFloat(litres);
    if (!isNaN(rate) && rate > 0 && !isNaN(lit) && lit > 0) {
      setTotalPrice(Math.round(lit * rate).toString());
    }
  };

  // Handle Total Price Change -> Auto Update Litres
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Fuel className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t.addNewFuel}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.date}
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
                {t.fuelType}
              </label>
              <select
                value={fuelType}
                onChange={(e) => handleFuelTypeChange(e.target.value as 'Octane' | 'Petrol')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
              >
                <option value="Octane">{t.octane} (৳{fuelPrices?.octane || 165}/L)</option>
                <option value="Petrol">{t.petrol} (৳{fuelPrices?.petrol || 155}/L)</option>
              </select>
            </div>
          </div>

          {/* Unit Price (Price per Litre) */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t.unitPriceLabel}</span>
              </label>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
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
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                  {t.bdt}/{t.litres}
                </span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-emerald-800 dark:text-emerald-300 shrink-0 select-none">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span>{t.saveAsDefaultPrice}</span>
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.odometerReading} *
              </label>
              <span className="text-[11px] text-slate-400">
                {language === 'bn' ? 'আগের ওডো:' : 'Prev:'}{' '}
                {formatNumber(maxOdo, language, numberFormat)} {t.km}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                {t.km}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                  {t.litres}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                  {t.bdt}
                </span>
              </div>
            </div>
          </div>

          {/* Auto calculation helper preview */}
          {parseFloat(litres) > 0 && parseFloat(unitPrice) > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{t.autoCalculatedHint}:</span>
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {litres} {t.litres} × ৳{unitPrice} = <span className="text-emerald-600 dark:text-emerald-400 font-bold">৳{totalPrice}</span>
              </span>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isFullTank}
                onChange={(e) => setIsFullTank(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {t.fullTankQuestion}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {t.fullTankHelp}
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.notes}
            </label>
            <input
              type="text"
              placeholder={language === 'bn' ? 'যেমন: গুলশান পেট্রোল পাম্প' : 'e.g., Gulshan Filling Station'}
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
              {t.saveEntry}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
