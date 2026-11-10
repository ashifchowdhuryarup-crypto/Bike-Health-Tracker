import React, { useState, useRef } from 'react';
import { Bike, Language, NumberFormatType, FuelPriceSettings } from '../types';
import { translations } from '../utils/i18n';
import { ConfirmDialog } from './ConfirmDialog';
import {
  Settings,
  X,
  Bike as BikeIcon,
  Globe,
  Hash,
  Moon,
  Sun,
  Download,
  Upload,
  Database,
  Trash2,
  Plus,
  Check,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Fuel,
  RotateCcw,
  Gauge,
} from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bikes: Bike[];
  activeBike: Bike | null;
  onSelectBike: (bikeId: string) => void;
  onUpdateBike: (bikeId: string, updates: Partial<Bike>) => void;
  onAddNewBike: (bike: Omit<Bike, 'id' | 'createdAt'>) => void;
  onDeleteBike: (bikeId: string) => void;
  onOpenResetOdo?: () => void;
  language: Language;
  onSetLanguage: (lang: Language) => void;
  numberFormat: NumberFormatType;
  onSetNumberFormat: (format: NumberFormatType) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  fuelPrices: FuelPriceSettings;
  onUpdateFuelPrices: (prices: FuelPriceSettings) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => boolean;
  onLoadDemoData: () => void;
  onClearDemoData: () => void;
  onClearAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  bikes,
  activeBike,
  onSelectBike,
  onUpdateBike,
  onAddNewBike,
  onDeleteBike,
  onOpenResetOdo,
  language,
  onSetLanguage,
  numberFormat,
  onSetNumberFormat,
  darkMode,
  onToggleDarkMode,
  fuelPrices,
  onUpdateFuelPrices,
  onExportBackup,
  onImportBackup,
  onLoadDemoData,
  onClearDemoData,
  onClearAllData,
}) => {
  const t = translations[language];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // PWA Install State
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showPWAHelp, setShowPWAHelp] = useState(false);

  // Fuel Prices State
  const [octanePriceInput, setOctanePriceInput] = useState<string>((fuelPrices?.octane || 165).toString());
  const [petrolPriceInput, setPetrolPriceInput] = useState<string>((fuelPrices?.petrol || 155).toString());

  // Bike Edit state
  const [isEditingBike, setIsEditingBike] = useState(false);
  const [bikeName, setBikeName] = useState(activeBike?.name || '');
  const [bikeModel, setBikeModel] = useState(activeBike?.model || '');
  const [bikeReg, setBikeReg] = useState(activeBike?.registrationNumber || '');
  const [bikeInitialOdo, setBikeInitialOdo] = useState(activeBike?.initialOdometer.toString() || '0');

  // Add new bike state
  const [isAddingBike, setIsAddingBike] = useState(false);
  const [newBikeName, setNewBikeName] = useState('');
  const [newBikeModel, setNewBikeModel] = useState('');
  const [newBikeReg, setNewBikeReg] = useState('');
  const [newBikeOdo, setNewBikeOdo] = useState('');

  if (!isOpen) return null;

  const handleSaveActiveBike = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBike) return;
    const odo = parseFloat(bikeInitialOdo);
    onUpdateBike(activeBike.id, {
      name: bikeName.trim() || activeBike.name,
      model: bikeModel.trim() || activeBike.model,
      registrationNumber: bikeReg.trim() || undefined,
      initialOdometer: isNaN(odo) ? activeBike.initialOdometer : odo,
    });
    setIsEditingBike(false);
    setStatusMessage({ type: 'success', text: language === 'bn' ? 'বাইকের তথ্য আপডেট হয়েছে' : 'Bike info updated' });
  };

  const handleCreateNewBike = (e: React.FormEvent) => {
    e.preventDefault();
    const odo = parseFloat(newBikeOdo);
    if (!newBikeName.trim() || isNaN(odo)) {
      setStatusMessage({ type: 'error', text: t.invalidInputError });
      return;
    }

    onAddNewBike({
      name: newBikeName.trim(),
      model: newBikeModel.trim() || 'Motorcycle',
      registrationNumber: newBikeReg.trim() || undefined,
      initialOdometer: odo,
      currentOdometer: odo,
    });

    setIsAddingBike(false);
    setNewBikeName('');
    setNewBikeModel('');
    setNewBikeReg('');
    setNewBikeOdo('');
    setStatusMessage({ type: 'success', text: language === 'bn' ? 'নতুন বাইক যোগ করা হয়েছে' : 'New bike added' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = onImportBackup(content);
        if (ok) {
          setStatusMessage({ type: 'success', text: t.importSuccessMsg });
        } else {
          setStatusMessage({ type: 'error', text: t.importErrorMsg });
        }
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 p-1 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
              <img src="/logo.png" alt="Bike Tracker" className="w-full h-full object-contain dark:invert" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {t.settingsTitle}
              </h2>
              <span className="text-[11px] text-slate-400">Bike Tracker v1.2</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message banner */}
        {statusMessage && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="mt-4 space-y-5">
          {/* Section 1: Active Bike Info */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BikeIcon className="w-3.5 h-3.5" />
                {t.activeBike}
              </span>
              {!isEditingBike && activeBike && (
                <button
                  onClick={() => {
                    setBikeName(activeBike.name);
                    setBikeModel(activeBike.model);
                    setBikeReg(activeBike.registrationNumber || '');
                    setBikeInitialOdo(activeBike.initialOdometer.toString());
                    setIsEditingBike(true);
                  }}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{t.edit}</span>
                </button>
              )}
            </div>

            {isEditingBike && activeBike ? (
              <form onSubmit={handleSaveActiveBike} className="space-y-3 mt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {t.bikeName}
                  </label>
                  <input
                    type="text"
                    required
                    value={bikeName}
                    onChange={(e) => setBikeName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {t.bikeModel}
                    </label>
                    <input
                      type="text"
                      value={bikeModel}
                      onChange={(e) => setBikeModel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {t.regNumber}
                    </label>
                    <input
                      type="text"
                      value={bikeReg}
                      onChange={(e) => setBikeReg(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingBike(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs"
                  >
                    {t.saveEntry}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {activeBike?.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeBike?.registrationNumber || activeBike?.model}
                  </p>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <span>{t.currentOdo}:</span>
                    <span>{activeBike ? activeBike.currentOdometer.toLocaleString() : 0} {t.km}</span>
                  </p>
                </div>
                {onOpenResetOdo && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenResetOdo();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
                    title={language === 'bn' ? 'ওডোমিটার পরিবর্তন / আপডেট' : 'Update Odometer'}
                  >
                    <Gauge className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{language === 'bn' ? 'ওডো পরিবর্তন' : 'Update Odo'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Bikes List for Switching / Adding */}
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  {t.manageBikes} ({bikes.length})
                </span>
                {!isAddingBike && (
                  <button
                    onClick={() => setIsAddingBike(true)}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t.addBike}</span>
                  </button>
                )}
              </div>

              {isAddingBike && (
                <form onSubmit={handleCreateNewBike} className="space-y-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-2">
                  <input
                    type="text"
                    required
                    placeholder={t.bikeName}
                    value={newBikeName}
                    onChange={(e) => setNewBikeName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder={t.bikeModel}
                      value={newBikeModel}
                      onChange={(e) => setNewBikeModel(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      required
                      placeholder={t.initialOdo}
                      value={newBikeOdo}
                      onChange={(e) => setNewBikeOdo(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingBike(false)}
                      className="px-2.5 py-1 rounded text-xs text-slate-400"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-emerald-600 text-white text-xs font-semibold"
                    >
                      {t.saveEntry}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {bikes.map((b) => (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs ${
                      b.id === activeBike?.id
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 font-bold text-emerald-800 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <button
                      onClick={() => onSelectBike(b.id)}
                      className="text-left flex-1 truncate"
                    >
                      <span className="block truncate">{b.name}</span>
                    </button>
                    {bikes.length > 1 && b.id !== activeBike?.id && (
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: language === 'bn' ? 'বাইক মুছুন' : 'Delete Bike',
                            message:
                              language === 'bn'
                                ? `"${b.name}" বাইকটি কি মুছে ফেলতে চান?`
                                : `Are you sure you want to delete "${b.name}"?`,
                            confirmText: t.delete,
                            isDestructive: true,
                            onConfirm: () => onDeleteBike(b.id),
                          });
                        }}
                        className="p-1 text-slate-400 hover:text-red-500"
                        title={t.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Preferences (Language, Numbers, Theme) */}
          <div className="space-y-3">
            {/* Language Selection */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-emerald-500" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {t.languageSetting}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {language === 'bn' ? 'বাংলা (ডিফল্ট)' : 'English'}
                  </span>
                </div>
              </div>

              <div className="flex rounded-xl bg-slate-200 dark:bg-slate-700 p-1">
                <button
                  onClick={() => onSetLanguage('bn')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    language === 'bn'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  বাংলা
                </button>
                <button
                  onClick={() => onSetLanguage('en')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    language === 'en'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Bengali Numbers vs Western Numbers */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <Hash className="w-4 h-4 text-teal-500" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {t.numFormatSetting}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {numberFormat === 'bn' ? t.bengaliDigits : t.englishDigits}
                  </span>
                </div>
              </div>

              <div className="flex rounded-xl bg-slate-200 dark:bg-slate-700 p-1">
                <button
                  onClick={() => onSetNumberFormat('bn')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    numberFormat === 'bn'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  ১২৩৪
                </button>
                <button
                  onClick={() => onSetNumberFormat('en')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    numberFormat === 'en'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  1234
                </button>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5">
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {t.themeSetting}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {darkMode ? t.darkMode : t.lightMode}
                  </span>
                </div>
              </div>

              <button
                onClick={onToggleDarkMode}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  darkMode
                    ? 'bg-slate-700 text-amber-300'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{darkMode ? t.darkMode : t.lightMode}</span>
              </button>
            </div>

            {/* PWA Phone Install Option */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {language === 'bn' ? 'ফোনে ইনস্টল' : 'Install on Phone'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isInstalled
                      ? (language === 'bn' ? 'অলরেডি ইনস্টল করা আছে' : 'Already installed')
                      : (language === 'bn' ? 'হোম স্ক্রিনে সরাসরি অ্যাপের মতো রাখুন' : 'Add to mobile home screen')}
                  </span>
                </div>
              </div>

              {!isInstalled && (
                <button
                  type="button"
                  onClick={async () => {
                    if (isInstallable) {
                      await install();
                    } else {
                      setShowPWAHelp(true);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm active:scale-95 transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>{language === 'bn' ? 'ইনস্টল' : 'Install'}</span>
                </button>
              )}
            </div>

            {/* PWA Help Guide Popup */}
            {showPWAHelp && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {language === 'bn' ? 'কীভাবে ফোনে ইনস্টল করবেন:' : 'How to install on mobile:'}
                  </span>
                  <button onClick={() => setShowPWAHelp(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isIOS
                    ? (language === 'bn'
                      ? 'iPhone / Safari-তে নিচের Share আইকনে ট্যাপ করে "Add to Home Screen" চাপুন।'
                      : 'In Safari on iOS, tap Share and select "Add to Home Screen".')
                    : (language === 'bn'
                      ? 'Chrome ব্রাউজারের উপরে ৩-ডট মেনুতে ট্যাপ করে "Install app" অথবা "Add to Home screen" নির্বাচন করুন।'
                      : 'In Chrome, tap the 3-dot menu and select "Install app" or "Add to Home screen".')}
                </p>
              </div>
            )}

            {/* Fuel Prices Setting */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Fuel className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t.fuelPricesSetting}</span>
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                  {t.bangladeshFriendlyTag}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {t.octaneRate}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={octanePriceInput}
                      onChange={(e) => setOctanePriceInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-semibold">
                      {t.bdt}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {t.petrolRate}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={petrolPriceInput}
                      onChange={(e) => setPetrolPriceInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] text-slate-400 font-semibold">
                      {t.bdt}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const oct = parseFloat(octanePriceInput);
                    const pet = parseFloat(petrolPriceInput);
                    if (!isNaN(oct) && oct > 0 && !isNaN(pet) && pet > 0) {
                      onUpdateFuelPrices({ octane: oct, petrol: pet });
                      setStatusMessage({ type: 'success', text: t.fuelPriceUpdatedMsg });
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
                >
                  {t.saveEntry}
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Data Backup, Restore, Demo & Reset */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {t.dataManagement}
            </span>

            {/* Export and Import buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={onExportBackup}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition active:scale-95"
              >
                <Download className="w-4 h-4 text-emerald-500" />
                <span>{t.exportBackup}</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition active:scale-95"
              >
                <Upload className="w-4 h-4 text-blue-500" />
                <span>{t.importBackup}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Load / Clear Sample Demo Data */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: language === 'bn' ? 'ডেমো ডেটা লোড' : 'Load Demo Data',
                    message:
                      language === 'bn'
                        ? 'আপনি কি ডেমো রেকর্ডগুলো লোড করতে চান?'
                        : 'Do you want to load sample demo records?',
                    confirmText: language === 'bn' ? 'লোড করুন' : 'Load Data',
                    isDestructive: false,
                    onConfirm: () => {
                      onLoadDemoData();
                      setStatusMessage({ type: 'success', text: t.demoLoadedMsg });
                    },
                  });
                }}
                className="flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{t.loadDemoData}</span>
              </button>

              <button
                onClick={() => {
                  onClearDemoData();
                  setStatusMessage({ type: 'success', text: t.demoRecordsCleared });
                }}
                className="flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.clearDemoRecords}</span>
              </button>
            </div>

            {/* Clear All Data */}
            <button
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: language === 'bn' ? 'সব ডেটা মুছে নতুন করে শুরু' : 'Clear All Data & Fresh Start',
                  message:
                    language === 'bn'
                      ? 'আপনি কি নিশ্চিত? সব বাইক, ওডোমিটার, ফুয়েল লগ ও সার্ভিসের তথ্য মুছে যাবে এবং আপনি একদম নতুন করে শুরু করতে পারবেন!'
                      : 'Are you sure? All bikes, odometer, fuel logs, and service records will be permanently wiped so you can start 100% fresh!',
                  confirmText: language === 'bn' ? 'হ্যাঁ, সব মুছে ফ্রেশ শুরু করুন' : 'Yes, Wipe Everything',
                  isDestructive: true,
                  onConfirm: () => {
                    onClearAllData();
                    onClose();
                  },
                });
              }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t.clearAllData}</span>
            </button>
          </div>
        </div>
      </div>

      {/* In-App Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={translations[language].cancel}
          isDestructive={confirmDialog.isDestructive ?? true}
        />
      )}
    </div>
  );
};
