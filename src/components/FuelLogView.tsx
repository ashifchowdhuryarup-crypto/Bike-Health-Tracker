import React, { useState } from 'react';
import { FuelEntry, Bike, Language, NumberFormatType, FuelPriceSettings } from '../types';
import { translations, formatNumber, formatCurrency, formatDate } from '../utils/i18n';
import { isFuelEntryAfterReset } from '../utils/calculations';
import { ConfirmDialog } from './ConfirmDialog';
import {
  Fuel,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Droplets,
  Sparkles,
} from 'lucide-react';

interface FuelLogViewProps {
  bike: Bike;
  fuelEntries: FuelEntry[];
  fuelPrices: FuelPriceSettings;
  onUpdateFuelPrice?: (type: 'Octane' | 'Petrol', price: number) => void;
  calculatedMileages: Map<string, number | null>;
  onAddFuelEntry: (entry: Omit<FuelEntry, 'id'>) => { success: boolean; error?: string };
  onUpdateFuelEntry: (id: string, entry: Partial<FuelEntry>) => { success: boolean; error?: string };
  onDeleteFuelEntry: (id: string) => void;
  language: Language;
  numberFormat: NumberFormatType;
}

export const FuelLogView: React.FC<FuelLogViewProps> = ({
  bike,
  fuelEntries,
  fuelPrices,
  onUpdateFuelPrice,
  calculatedMileages,
  onAddFuelEntry,
  onUpdateFuelEntry,
  onDeleteFuelEntry,
  language,
  numberFormat,
}) => {
  const t = translations[language];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<FuelEntry | null>(null);

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState<string>('');
  const [fuelType, setFuelType] = useState<'Octane' | 'Petrol'>('Octane');
  const [unitPrice, setUnitPrice] = useState<string>(
    (fuelPrices?.octane || 165).toString()
  );
  const [litres, setLitres] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<string>('');
  const [isFullTank, setIsFullTank] = useState<boolean>(true);
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const relevantFuels = fuelEntries.filter((f) =>
    isFuelEntryAfterReset(f, bike.odometerResetAt)
  );

  const maxOdo = Math.max(
    bike.currentOdometer,
    ...relevantFuels.map((f) => f.odometer),
    bike.initialOdometer
  );

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setOdometer('');
    setLitres('');
    setTotalPrice('');
    setIsFullTank(true);
    setFuelType('Octane');
    setUnitPrice((fuelPrices?.octane || 165).toString());
    setSaveAsDefault(false);
    setNotes('');
    setFormError(null);
    setEditingEntryId(null);
    setIsFormOpen(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setOdometer((maxOdo + 150).toString());
    setUnitPrice((fuelPrices?.octane || 165).toString());
    setIsFormOpen(true);
  };

  const handleOpenEdit = (entry: FuelEntry) => {
    setEditingEntryId(entry.id);
    setDate(entry.date);
    setOdometer(entry.odometer.toString());
    setLitres(entry.litres.toString());
    setTotalPrice(entry.totalPrice.toString());
    const rate = entry.unitPrice || Math.round((entry.totalPrice / entry.litres) * 10) / 10;
    setUnitPrice(rate.toString());
    setIsFullTank(entry.isFullTank);
    setFuelType(entry.fuelType || 'Octane');
    setNotes(entry.notes || '');
    setFormError(null);
    setIsFormOpen(true);
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const odoNum = parseFloat(odometer);
    const litresNum = parseFloat(litres);
    const priceNum = parseFloat(totalPrice);
    const rateNum = parseFloat(unitPrice);

    if (isNaN(odoNum) || odoNum <= 0) {
      setFormError(t.invalidInputError);
      return;
    }
    if (isNaN(litresNum) || litresNum <= 0) {
      setFormError(t.invalidInputError);
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError(t.invalidInputError);
      return;
    }

    if (saveAsDefault && onUpdateFuelPrice && !isNaN(rateNum) && rateNum > 0) {
      onUpdateFuelPrice(fuelType, rateNum);
    }

    if (editingEntryId) {
      const res = onUpdateFuelEntry(editingEntryId, {
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
        setFormError(res.error || t.odoValidationError);
        return;
      }
    } else {
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
        setFormError(res.error || t.odoValidationError);
        return;
      }
    }

    resetForm();
  };

  const sortedEntries = [...fuelEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.odometer - a.odometer
  );

  return (
    <div className="space-y-4 pb-6 pt-1 animate-fadeIn">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#141912] dark:text-white tracking-tight">
            {t.fuelLogTitle}
          </h1>
          <p className="text-xs font-medium text-[#6F766C] dark:text-slate-400 tabular-nums mt-0.5">
            {formatNumber(fuelEntries.length, language, numberFormat)}{' '}
            {language === 'bn' ? 'টি এন্ট্রি সংরক্ষিত' : 'entries recorded'}
          </p>
        </div>

        {!isFormOpen && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full bg-[#9AE62E] hover:bg-[#8CD825] text-[#141912] font-bold text-xs shadow-sm active:scale-95 transition shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.addNewFuel}</span>
          </button>
        )}
      </div>

      {/* Add / Edit Inline Card */}
      {isFormOpen && (
        <div className="bg-white dark:bg-[#171C18] rounded-[26px] p-5 border border-[#9AE62E]/60 dark:border-[#9AE62E]/30 shadow-[0_8px_28px_rgba(15,23,42,0.06)] transition">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
            <h2 className="text-base font-extrabold text-[#141912] dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#FFF3EB] dark:bg-orange-500/15 text-orange-500 flex items-center justify-center">
                <Fuel className="w-4 h-4" />
              </span>
              <span>{editingEntryId ? t.editFuel : t.addNewFuel}</span>
            </h2>
            <button
              onClick={resetForm}
              className="min-h-[36px] px-3 rounded-full text-xs font-semibold text-[#6F766C] hover:text-[#141912] dark:text-slate-400 dark:hover:text-white"
            >
              {t.cancel}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {formError && (
              <div className="p-3 rounded-2xl bg-[#FFEEEE] dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
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
                  {language === 'bn' ? 'আগের ওডোমিটার:' : 'Prev:'}{' '}
                  {formatNumber(maxOdo, language, numberFormat)} {t.km}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  required
                  placeholder={`যেমন: ${maxOdo + 100}`}
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
                  {litres} {t.litres} × ৳{unitPrice} ={' '}
                  <span className="text-[#5C9E00] dark:text-[#A3EC38]">৳{totalPrice}</span>
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
                placeholder={language === 'bn' ? 'যেমন: গুলশান পদ্মা ফিলিং স্টেশন' : 'e.g., Padma Filling Station'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-white text-xs focus:ring-2 focus:ring-[#9AE62E] focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 min-h-[44px] rounded-full text-xs font-semibold text-[#6F766C] dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 transition"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 min-h-[44px] rounded-full bg-[#9AE62E] hover:bg-[#8CD825] active:scale-95 text-[#141912] font-bold text-xs shadow-sm transition"
              >
                {t.saveEntry}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fuel Log Entries List */}
      {sortedEntries.length === 0 ? (
        <div className="bg-white dark:bg-[#171C18] rounded-[26px] p-8 border border-black/[0.04] dark:border-white/[0.06] text-center shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
          <div className="w-12 h-12 rounded-full bg-[#EBF7FF] dark:bg-sky-500/15 text-sky-500 flex items-center justify-center mx-auto mb-3">
            <Droplets className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-extrabold text-[#141912] dark:text-white">
            {t.noFillsYet}
          </h3>
          <p className="text-xs text-[#6F766C] dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {t.firstFillHelp}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-full bg-[#9AE62E] hover:bg-[#8CD825] text-[#141912] text-xs font-bold shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addNewFuel}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedEntries.map((entry) => {
            const calculatedMileage = calculatedMileages.get(entry.id);

            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-[#171C18] rounded-[24px] p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-full bg-[#FFF3EB] dark:bg-orange-500/15 text-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Fuel className="w-[18px] h-[18px]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-base font-extrabold tabular-nums text-[#141912] dark:text-white">
                          {formatNumber(entry.odometer, language, numberFormat)} {t.km}
                        </span>
                        <span className="text-[#9EA69B]">·</span>
                        <span
                          className={`text-xs font-semibold ${
                            entry.isFullTank
                              ? 'text-[#5C9E00] dark:text-[#A3EC38]'
                              : 'text-[#6F766C] dark:text-slate-400'
                          }`}
                        >
                          {entry.isFullTank ? t.fullTankBadge : t.partialFillBadge}
                        </span>
                      </div>

                      <div className="text-xs text-[#6F766C] dark:text-slate-400 mt-1 tabular-nums truncate">
                        {formatDate(entry.date, language)} ·{' '}
                        {formatNumber(entry.litres, language, numberFormat, 2)} {t.litres} ·{' '}
                        {entry.fuelType || 'Octane'}
                      </div>

                      {entry.notes && (
                        <p className="text-xs text-[#7A8277] dark:text-slate-400 italic mt-1 truncate">
                          "{entry.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Total Cost & Mileage */}
                  <div className="text-right shrink-0">
                    <div className="text-base font-extrabold tabular-nums text-[#141912] dark:text-white">
                      {formatCurrency(entry.totalPrice, language, numberFormat)}
                    </div>

                    {calculatedMileage !== null && calculatedMileage !== undefined ? (
                      <div className="mt-0.5 text-xs font-extrabold tabular-nums text-[#5C9E00] dark:text-[#A3EC38]">
                        {formatNumber(calculatedMileage, language, numberFormat, 1)} {t.kmPerLitre}
                      </div>
                    ) : (
                      <div className="text-[11px] font-medium text-[#7A8277] dark:text-slate-400 mt-0.5">
                        {entry.isFullTank ? t.firstEntryBadge : t.partialFillBadge}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-3 pt-2.5 border-t border-black/[0.05] dark:border-white/[0.07] flex items-center justify-between text-xs">
                  <span className="text-xs font-medium text-[#6F766C] dark:text-slate-400 tabular-nums">
                    {formatCurrency(entry.totalPrice / entry.litres, language, numberFormat, 2)}/{t.litres}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(entry)}
                      className="w-10 h-10 rounded-full text-[#6F766C] dark:text-slate-400 hover:text-[#141912] dark:hover:text-white hover:bg-[#F6F7F4] dark:hover:bg-white/[0.06] flex items-center justify-center transition"
                      aria-label={t.edit}
                      title={t.edit}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setEntryToDelete(entry)}
                      className="w-10 h-10 rounded-full text-[#6F766C] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[#FFEEEE] dark:hover:bg-rose-500/15 flex items-center justify-center transition"
                      aria-label={t.delete}
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirm={() => {
          if (entryToDelete) {
            onDeleteFuelEntry(entryToDelete.id);
            setEntryToDelete(null);
          }
        }}
        title={language === 'bn' ? 'ফুয়েল এন্ট্রি মুছুন' : 'Delete Fuel Entry'}
        message={
          entryToDelete
            ? language === 'bn'
              ? `${formatNumber(entryToDelete.odometer, language, numberFormat)} কিমি এর ফুয়েল এন্ট্রিটি কি মুছে ফেলতে চান?`
              : `Are you sure you want to delete the fuel entry at ${entryToDelete.odometer} km?`
            : ''
        }
        confirmText={translations[language].delete}
        cancelText={translations[language].cancel}
        isDestructive={true}
      />
    </div>
  );
};
