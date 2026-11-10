import React, { useState } from 'react';
import { ServiceItem, ServiceLog, ServiceUrgency, Language, NumberFormatType, Bike } from '../types';
import { translations, formatNumber, formatCurrency, formatDate } from '../utils/i18n';
import { ConfirmDialog } from './ConfirmDialog';
import {
  Wrench,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Edit3,
  History,
  Calendar,
  Check,
  RotateCcw,
} from 'lucide-react';

interface ServiceReminderViewProps {
  bike: Bike;
  serviceItems: ServiceItem[];
  serviceUrgentList: ServiceUrgency[];
  serviceLogs: ServiceLog[];
  onOpenMarkService: (serviceItemId: string) => void;
  onOpenAddCustomService: () => void;
  onOpenEditService: (item: ServiceItem) => void;
  onDeleteServiceItem: (itemId: string) => void;
  onSyncServiceBaseline?: (targetOdo: number) => void;
  language: Language;
  numberFormat: NumberFormatType;
}

export const ServiceReminderView: React.FC<ServiceReminderViewProps> = ({
  bike,
  serviceItems,
  serviceUrgentList,
  serviceLogs,
  onOpenMarkService,
  onOpenAddCustomService,
  onOpenEditService,
  onDeleteServiceItem,
  onSyncServiceBaseline,
  language,
  numberFormat,
}) => {
  const t = translations[language];
  const [activeSubTab, setActiveSubTab] = useState<'reminders' | 'history'>('reminders');
  const [itemToDelete, setItemToDelete] = useState<ServiceItem | null>(null);

  // Highest recorded odometer for this bike
  const currentOdo = Math.max(bike.currentOdometer, bike.initialOdometer);

  return (
    <div className="space-y-4 pb-20 pt-2 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.serviceTitle}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatNumber(serviceItems.length, language, numberFormat)} {language === 'bn' ? 'টি আইটেম ট্র্যাক করা হচ্ছে' : 'items tracked'}
          </p>
        </div>

        <button
          onClick={onOpenAddCustomService}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addCustomService}</span>
        </button>
      </div>

      {/* Sub Tabs: Reminders vs History */}
      <div className="flex rounded-2xl bg-slate-200/80 dark:bg-slate-800 p-1">
        <button
          onClick={() => setActiveSubTab('reminders')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'reminders'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>{t.serviceReminders}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-extrabold">
            {serviceItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'history'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>{t.serviceHistory}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold">
            {serviceLogs.length}
          </span>
        </button>
      </div>

      {activeSubTab === 'reminders' ? (
        /* Service Reminders List */
        <div className="space-y-3">
          {serviceItems.some((s) => s.lastServiceKm === 0) && currentOdo > 500 && onSyncServiceBaseline && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    {language === 'bn' ? 'সার্ভিস বেসলাইন সিঙ্ক' : 'Sync Service Baseline'}
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-snug">
                    {language === 'bn'
                      ? `সার্ভিস পূর্বের ০ কিমিতে সেট আছে। বর্তমান ${formatNumber(currentOdo, language, numberFormat)} কিমি থেকে শুরু করতে চাইলে সিঙ্ক করুন।`
                      : `Service baseline is at 0 km. Sync from current ${formatNumber(currentOdo, language, numberFormat)} km?`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSyncServiceBaseline(currentOdo)}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs shadow-sm transition"
              >
                {language === 'bn' ? 'সিঙ্ক করুন' : 'Sync All'}
              </button>
            </div>
          )}

          {serviceUrgentList.map((urgency) => {
            const item = urgency.item;
            const itemName = language === 'bn' ? item.nameBn : item.nameEn;
            const dueKm = item.lastServiceKm + item.kmInterval;

            // Status Styling
            let cardBorder = 'border-slate-200 dark:border-slate-800';
            let badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
            let progressBg = 'bg-emerald-500';
            let statusTitle = t.inGoodCondition;

            if (urgency.status === 'red') {
              cardBorder = 'border-red-300 dark:border-red-900/60 shadow-red-500/5';
              badgeClass = 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800 animate-pulse';
              progressBg = 'bg-red-500';
              statusTitle = t.overdue;
            } else if (urgency.status === 'yellow') {
              cardBorder = 'border-amber-300 dark:border-amber-900/60 shadow-amber-500/5';
              badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800';
              progressBg = 'bg-amber-500';
              statusTitle = t.dueSoon;
            }

            // Calculation percentage of interval used
            const totalIntervalKm = item.kmInterval;
            const usedKm = totalIntervalKm - urgency.kmRemaining;
            const percentUsed = Math.min(100, Math.max(0, Math.round((usedKm / totalIntervalKm) * 100)));

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-4.5 border-2 ${cardBorder} shadow-sm transition hover:shadow-md`}
              >
                {/* Header row with Title & Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${progressBg} shrink-0`} />
                      <span>{itemName}</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {language === 'bn' ? item.nameEn : item.nameBn}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badgeClass} shrink-0`}
                  >
                    {statusTitle}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3.5">
                  <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                    <span className="text-slate-500 dark:text-slate-400">
                      {language === 'bn' ? urgency.statusTextBn : urgency.statusTextEn}
                    </span>
                    <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                      {percentUsed}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressBg}`}
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                </div>

                {/* Details Grid */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">{t.lastServiceKm}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {formatNumber(item.lastServiceKm, language, numberFormat)} {t.km}
                    </span>
                    {item.lastServiceDate && (
                      <span className="block text-[10px] text-slate-400">
                        {formatDate(item.lastServiceDate, language)}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">{language === 'bn' ? 'পরবর্তী ডিউ' : 'Next Due'}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatNumber(dueKm, language, numberFormat)} {t.km}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      (প্রতি {formatNumber(item.kmInterval, language, numberFormat)} {t.km}
                      {item.dayInterval ? ` / ${formatNumber(item.dayInterval, language, numberFormat)} দিন` : ''})
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenEditService(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      aria-label={t.edit}
                      title={t.edit}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      aria-label={t.delete}
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => onOpenMarkService(item.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{t.markDone}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Service History Log */
        <div className="space-y-3">
          {serviceLogs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center">
              <History className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.noServiceHistory}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {[...serviceLogs]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.odometer - a.odometer)
                .map((log) => (
                  <div
                    key={log.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between gap-3"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {log.serviceItemName}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="font-mono font-medium">
                          {formatNumber(log.odometer, language, numberFormat)} {t.km}
                        </span>
                        <span>•</span>
                        <span>{formatDate(log.date, language)}</span>
                      </div>
                      {log.notes && (
                        <p className="text-xs text-slate-400 italic mt-1">
                          "{log.notes}"
                        </p>
                      )}
                    </div>

                    {log.cost !== undefined && log.cost > 0 && (
                      <div className="text-right shrink-0 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(log.cost, language, numberFormat)}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* In-App Delete Service Item Confirmation */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => {
          if (itemToDelete) {
            onDeleteServiceItem(itemToDelete.id);
            setItemToDelete(null);
          }
        }}
        title={language === 'bn' ? 'সার্ভিস আইটেম মুছুন' : 'Delete Service Item'}
        message={
          itemToDelete
            ? language === 'bn'
              ? `"${itemToDelete.nameBn || itemToDelete.nameEn}" সার্ভিস আইটেমটি কি তালিকা থেকে মুছে ফেলতে চান?`
              : `Are you sure you want to delete "${itemToDelete.nameEn}" from your service reminders?`
            : ''
        }
        confirmText={translations[language].delete}
        cancelText={translations[language].cancel}
        isDestructive={true}
      />
    </div>
  );
};
