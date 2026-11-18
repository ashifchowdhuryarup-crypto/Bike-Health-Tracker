import React, { useState } from 'react';
import { ServiceItem, ServiceLog, ServiceUrgency, Language, NumberFormatType, Bike } from '../types';
import { translations, formatNumber, formatCurrency, formatDate, formatOdometer } from '../utils/i18n';
import { ConfirmDialog } from './ConfirmDialog';
import {
  Wrench,
  Plus,
  AlertTriangle,
  Clock,
  Trash2,
  Edit3,
  History,
  Check,
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
  language: Language;
  numberFormat: NumberFormatType;
}

export const ServiceReminderView: React.FC<ServiceReminderViewProps> = ({
  serviceItems,
  serviceUrgentList,
  serviceLogs,
  onOpenMarkService,
  onOpenAddCustomService,
  onOpenEditService,
  onDeleteServiceItem,
  language,
  numberFormat,
}) => {
  const t = translations[language];
  const [activeSubTab, setActiveSubTab] = useState<'reminders' | 'history'>('reminders');
  const [itemToDelete, setItemToDelete] = useState<ServiceItem | null>(null);

  return (
    <div className="space-y-4 pb-6 pt-1 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#141912] dark:text-white tracking-tight">
            {t.serviceTitle}
          </h1>
          <p className="text-xs font-medium text-[#6F766C] dark:text-slate-400 tabular-nums mt-0.5">
            {formatNumber(serviceItems.length, language, numberFormat)}{' '}
            {language === 'bn' ? 'টি আইটেম ট্র্যাক করা হচ্ছে' : 'items tracked'}
          </p>
        </div>

        <button
          onClick={onOpenAddCustomService}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-full bg-[#9AE62E] hover:bg-[#8CD825] text-[#141912] font-bold text-xs shadow-sm active:scale-95 transition shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t.addCustomService}</span>
        </button>
      </div>

      {/* Sub Tabs: Reminders vs History */}
      <div className="flex rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] p-1">
        <button
          onClick={() => setActiveSubTab('reminders')}
          className={`flex-1 min-h-[42px] py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'reminders'
              ? 'bg-white dark:bg-[#171C18] text-[#141912] dark:text-white shadow-xs'
              : 'text-[#6F766C] dark:text-slate-400 hover:text-[#141912] dark:hover:text-white'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>{t.serviceReminders}</span>
          <span className="tabular-nums opacity-70">({formatNumber(serviceItems.length, language, numberFormat)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 min-h-[42px] py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'history'
              ? 'bg-white dark:bg-[#171C18] text-[#141912] dark:text-white shadow-xs'
              : 'text-[#6F766C] dark:text-slate-400 hover:text-[#141912] dark:hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>{t.serviceHistory}</span>
          <span className="tabular-nums opacity-70">({formatNumber(serviceLogs.length, language, numberFormat)})</span>
        </button>
      </div>

      {activeSubTab === 'reminders' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {serviceUrgentList.map((urgency) => {
            const item = urgency.item;
            const itemName = language === 'bn' ? item.nameBn : item.nameEn;
            const dueKm = item.lastServiceKm + item.kmInterval;

            let iconBg = 'bg-[#EEF9DA] text-[#5C9E00] dark:bg-[#9AE62E]/15 dark:text-[#A3EC38]';
            let IconComp = Wrench;
            let progressBg = 'bg-[#92E328]';
            let statusColor = 'text-[#5C9E00] dark:text-[#A3EC38]';
            let statusTitle = t.inGoodCondition;

            if (urgency.status === 'red') {
              iconBg = 'bg-[#FFEEEE] text-rose-500 dark:bg-rose-500/15 dark:text-rose-400';
              IconComp = AlertTriangle;
              progressBg = 'bg-rose-500';
              statusColor = 'text-rose-600 dark:text-rose-400';
              statusTitle = t.overdue;
            } else if (urgency.status === 'yellow') {
              iconBg = 'bg-[#FFF6E5] text-amber-500 dark:bg-amber-500/15 dark:text-amber-400';
              IconComp = Clock;
              progressBg = 'bg-amber-500';
              statusColor = 'text-amber-600 dark:text-amber-400';
              statusTitle = t.dueSoon;
            }

            const totalIntervalKm = item.kmInterval;
            const usedKm = totalIntervalKm - urgency.kmRemaining;
            const percentUsed = Math.min(100, Math.max(0, Math.round((usedKm / totalIntervalKm) * 100)));

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-[#171C18] rounded-[24px] p-4.5 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(15,23,42,0.03)] flex flex-col justify-between"
              >
                <div>
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}
                      >
                        <IconComp className="w-[18px] h-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-[15px] font-extrabold text-[#141912] dark:text-white truncate">
                          {itemName}
                        </h2>
                        <p className="text-xs text-[#6F766C] dark:text-slate-400 truncate">
                          {language === 'bn' ? item.nameEn : item.nameBn}
                        </p>
                      </div>
                    </div>

                    <span className={`text-xs font-extrabold shrink-0 ${statusColor}`}>
                      {statusTitle}
                    </span>
                  </div>

                  {/* Clean Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                      <span className="text-[#6F766C] dark:text-slate-400">
                        {language === 'bn' ? urgency.statusTextBn : urgency.statusTextEn}
                      </span>
                      <span className="font-extrabold tabular-nums text-[#141912] dark:text-white">
                        {formatNumber(percentUsed, language, numberFormat)}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[#F0F2EC] dark:bg-white/[0.08] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${progressBg}`}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                  </div>

                  {/* Clean Metadata Grid */}
                  <div className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.07] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[#6F766C] dark:text-slate-400 block text-[11px]">
                        {t.lastServiceKm}
                      </span>
                      <span className="font-bold tabular-nums text-[#141912] dark:text-white">
                        {formatOdometer(item.lastServiceKm, language, numberFormat)} {t.km}
                      </span>
                      {item.lastServiceDate && (
                        <span className="block text-[10px] text-[#7A8277] dark:text-slate-400">
                          {formatDate(item.lastServiceDate, language)}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[#6F766C] dark:text-slate-400 block text-[11px]">
                        {language === 'bn' ? 'পরবর্তী ডিউ' : 'Next Due'}
                      </span>
                      <span className="font-bold tabular-nums text-[#141912] dark:text-white">
                        {formatOdometer(dueKm, language, numberFormat)} {t.km}
                      </span>
                      <span className="block text-[10px] text-[#7A8277] dark:text-slate-400 tabular-nums">
                        ({language === 'bn' ? 'প্রতি' : 'every'}{' '}
                        {formatNumber(item.kmInterval, language, numberFormat)} {t.km}
                        {item.dayInterval
                          ? ` · ${formatNumber(item.dayInterval, language, numberFormat)} ${
                              language === 'bn' ? 'দিন' : 'days'
                            }`
                          : ''}
                        )
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.07] flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenEditService(item)}
                      className="w-10 h-10 rounded-full text-[#6F766C] dark:text-slate-400 hover:text-[#141912] dark:hover:text-white hover:bg-[#F6F7F4] dark:hover:bg-white/[0.06] flex items-center justify-center transition"
                      aria-label={t.edit}
                      title={t.edit}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setItemToDelete(item)}
                      className="w-10 h-10 rounded-full text-[#6F766C] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[#FFEEEE] dark:hover:bg-rose-500/15 flex items-center justify-center transition"
                      aria-label={t.delete}
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => onOpenMarkService(item.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[42px] rounded-full bg-[#9AE62E] hover:bg-[#8CD825] active:scale-95 text-[#141912] font-bold text-xs shadow-xs transition"
                  >
                    <Check className="w-4 h-4 stroke-[2.8]" />
                    <span>{t.markDone}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Service History Log */
        <div>
          {serviceLogs.length === 0 ? (
            <div className="bg-white dark:bg-[#171C18] rounded-[26px] p-8 border border-black/[0.04] dark:border-white/[0.06] text-center shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
              <div className="w-12 h-12 rounded-full bg-[#F6F7F4] dark:bg-white/[0.06] text-[#7A8277] flex items-center justify-center mx-auto mb-2.5">
                <History className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-[#6F766C] dark:text-slate-400">
                {t.noServiceHistory}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...serviceLogs]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.odometer - a.odometer)
                .map((log) => (
                  <div
                    key={log.id}
                    className="bg-white dark:bg-[#171C18] rounded-[22px] p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#EEF9DA] dark:bg-[#9AE62E]/15 text-[#5C9E00] dark:text-[#A3EC38] flex items-center justify-center shrink-0">
                        <Check className="w-[18px] h-[18px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-[#141912] dark:text-white truncate">
                          {log.serviceItemName}
                        </h4>
                        <div className="text-xs text-[#6F766C] dark:text-slate-400 mt-0.5 tabular-nums truncate">
                          {formatOdometer(log.odometer, language, numberFormat)} {t.km} ·{' '}
                          {formatDate(log.date, language)}
                        </div>
                        {log.notes && (
                          <p className="text-xs text-[#7A8277] dark:text-slate-400 italic mt-0.5 truncate">
                            "{log.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {log.cost !== undefined && log.cost > 0 && (
                      <div className="text-right shrink-0 font-extrabold tabular-nums text-[#5C9E00] dark:text-[#A3EC38] text-sm">
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
