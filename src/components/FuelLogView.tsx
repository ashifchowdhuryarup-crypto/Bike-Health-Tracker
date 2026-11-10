import React, { useState } from 'react';
import { FuelEntry, Bike, Language, NumberFormatType, FuelPriceSettings } from '../types';
import { translations, formatNumber, formatCurrency, formatDate } from '../utils/i18n';
import { ConfirmDialog } from './ConfirmDialog';
import {
  Fuel,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Droplets,
  Calendar,
  Gauge,
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

  // Highest recorded odometer for recommendation
  const maxOdo = Math.max(
    bike.currentOdometer,
    ...fuelEntries.map((f) => f.odometer),
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
    // Pre-populate with reasonable next odometer
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

  // Sort entries newest first
  const sortedEntries = [...fuelEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.odometer - a.odometer
  );

  return (
    <div className="space-y-4 pb-20 pt-2 animate-fadeIn">
      {/* Top Header bar with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Fuel className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.fuelLogTitle}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatNumber(fuelEntries.length, language, numberFormat)} {language === 'bn' ? 'টি এন্ট্রি সংরক্ষিত' : 'entries recorded'}
          </p>
        </div>

        {!isFormOpen && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addNewFuel}</span>
          </button>
        )}
      </div>

      {/* Add / Edit Form Card */}
      {isFormOpen && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-emerald-500/40 shadow-xl transition">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Fuel className="w-4 h-4 text-emerald-500" />
              <span>{editingEntryId ? t.editFuel : t.addNewFuel}</span>
            </h2>
            <button
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {t.cancel}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {formError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            {/* Date and Fuel Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.date}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
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

            {/* Unit Price (Price per Litre) with Auto-Calculation */}
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

            {/* Odometer */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.odometerReading} *
                </label>
                <span className="text-[11px] text-slate-400">
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
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">
                  {t.km}
                </span>
              </div>
            </div>

            {/* Litres and Total Price */}
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

            {/* Auto-calculation preview */}
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

            {/* Full Tank Checkbox with Explanatory Helper */}
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

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.notes}
              </label>
              <input
                type="text"
                placeholder={language === 'bn' ? 'যেমন: গুলশান পদ্মা ফিলিং স্টেশন' : 'e.g., Padma Filling Station'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs shadow-md shadow-emerald-600/25 transition"
              >
                {t.saveEntry}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fuel Log Entries List */}
      {sortedEntries.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center">
          <Droplets className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t.noFillsYet}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {t.firstFillHelp}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addNewFuel}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedEntries.map((entry) => {
            const calculatedMileage = calculatedMileages.get(entry.id);

            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm relative group hover:border-emerald-500/40 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Odometer & Date */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold tabular-nums text-slate-900 dark:text-white">
                        {formatNumber(entry.odometer, language, numberFormat)} {t.km}
                      </span>
                      {entry.isFullTank ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {t.fullTankBadge}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {t.partialFillBadge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(entry.date, language)}
                      </span>
                      <span>•</span>
                      <span>
                        {formatNumber(entry.litres, language, numberFormat, 2)} {t.litres} ({entry.fuelType || 'Octane'})
                      </span>
                    </div>

                    {entry.notes && (
                      <p className="text-xs text-slate-400 italic mt-1">
                        "{entry.notes}"
                      </p>
                    )}
                  </div>

                  {/* Right: Calculated Mileage & Total Cost */}
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-slate-900 dark:text-white">
                      {formatCurrency(entry.totalPrice, language, numberFormat)}
                    </div>

                    {calculatedMileage !== null && calculatedMileage !== undefined ? (
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-sm">
                          {formatNumber(calculatedMileage, language, numberFormat, 1)} {t.kmPerLitre}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 mt-1">
                        {entry.isFullTank ? t.firstEntryBadge : t.partialFillBadge}
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit & Delete row */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {formatCurrency(entry.totalPrice / entry.litres, language, numberFormat, 2)}/{t.litres}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(entry)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      aria-label={t.edit}
                      title={t.edit}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setEntryToDelete(entry)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      aria-label={t.delete}
                      title={t.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
