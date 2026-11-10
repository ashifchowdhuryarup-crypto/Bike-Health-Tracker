import React from 'react';
import { Bike, FuelEntry, ServiceUrgency, Language, NumberFormatType, MonthlyReport } from '../types';
import { translations, formatNumber, formatCurrency, formatDate } from '../utils/i18n';
import {
  Fuel,
  Wrench,
  Gauge,
  TrendingUp,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  PlusCircle,
  CheckSquare,
  RotateCcw,
} from 'lucide-react';

interface HomeDashboardProps {
  bike: Bike;
  fuelEntries: FuelEntry[];
  calculatedMileages: Map<string, number | null>;
  urgentServices: ServiceUrgency[];
  thisMonthReport: MonthlyReport | null;
  onOpenAddFuel: () => void;
  onOpenMarkService: (serviceItemId?: string) => void;
  onOpenResetOdo?: () => void;
  onNavigateToTab: (tab: 'fuel' | 'service' | 'reports') => void;
  language: Language;
  numberFormat: NumberFormatType;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  bike,
  fuelEntries,
  calculatedMileages,
  urgentServices,
  thisMonthReport,
  onOpenAddFuel,
  onOpenMarkService,
  onOpenResetOdo,
  onNavigateToTab,
  language,
  numberFormat,
}) => {
  const t = translations[language];

  // Current odometer is the highest recorded odometer
  const currentOdo = Math.max(
    bike.currentOdometer,
    ...fuelEntries.map((f) => f.odometer),
    bike.initialOdometer
  );

  // Take top 3 most urgent services
  const topReminders = urgentServices.slice(0, 3);

  // Recent 3 fuel entries (newest first)
  const recentEntries = [...fuelEntries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.odometer - a.odometer)
    .slice(0, 3);

  return (
    <div className="space-y-4 pb-20 pt-2 animate-fadeIn">
      {/* Hero Odometer Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 shadow-xl border border-slate-700/50">
        {/* Decorative background glow */}
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-36 h-36 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {bike.registrationNumber || bike.model}
            </span>
            <h1 className="text-xl font-bold mt-1 text-white tracking-tight">
              {bike.name}
            </h1>
          </div>

          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
            <Gauge className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Digital Odometer Display */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-300 font-medium">
              {t.currentOdo}
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-extrabold tracking-tight text-emerald-300">
                {formatNumber(currentOdo, language, numberFormat)}
              </span>
              <span className="text-sm font-semibold text-slate-300">
                {t.km}
              </span>
            </div>
          </div>

          {onOpenResetOdo && (
            <button
              onClick={onOpenResetOdo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-amber-300 hover:text-amber-200 border border-amber-400/20 hover:border-amber-400/40 transition shadow-sm backdrop-blur-md"
              title={t.resetOdometer}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.resetOdometerShort}</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Action Large Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onOpenAddFuel}
          className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-sm shadow-md shadow-emerald-600/25 transition"
        >
          <PlusCircle className="w-5 h-5" />
          <span>{t.addFuel}</span>
        </button>

        <button
          onClick={() => onOpenMarkService()}
          className="flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98] text-white font-semibold text-sm shadow-md border border-slate-700/50 transition"
        >
          <CheckSquare className="w-5 h-5 text-amber-400" />
          <span>{t.markServiceDone}</span>
        </button>
      </div>

      {/* This Month's Key Metrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t.thisMonth}</span>
          </h2>
          <button
            onClick={() => onNavigateToTab('reports')}
            className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-0.5"
          >
            <span>{t.reportsTitle}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {/* Average Mileage */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium leading-tight">{t.avgMileage}</span>
              <Fuel className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {thisMonthReport && thisMonthReport.avgMileage > 0
                  ? formatNumber(thisMonthReport.avgMileage, language, numberFormat, 1)
                  : '-'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {t.kmPerLitre}
              </div>
            </div>
          </div>

          {/* Total Fuel Cost */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium leading-tight">{t.totalFuelCost}</span>
              <Receipt className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
                {formatCurrency(thisMonthReport?.fuelCost || 0, language, numberFormat)}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {thisMonthReport?.totalLitres
                  ? `${formatNumber(thisMonthReport.totalLitres, language, numberFormat, 1)} ${t.litres}`
                  : '-'}
              </div>
            </div>
          </div>

          {/* Cost per km */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-medium leading-tight">{t.costPerKm}</span>
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {thisMonthReport && thisMonthReport.costPerKm > 0
                  ? formatCurrency(thisMonthReport.costPerKm, language, numberFormat, 2)
                  : '-'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {`/${t.km}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Service Reminders */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.topReminders}
            </h2>
          </div>
          <button
            onClick={() => onNavigateToTab('service')}
            className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-0.5"
          >
            <span>{t.viewAllReminders}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {topReminders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {t.allGood}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topReminders.map((urgency) => {
              const item = urgency.item;
              const itemName = language === 'bn' ? item.nameBn : item.nameEn;
              const dueKm = item.lastServiceKm + item.kmInterval;

              // Color styles
              let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
              let dotColor = 'bg-emerald-500';
              let statusLabel = language === 'bn' ? 'ঠিক আছে' : 'Good';

              if (urgency.status === 'red') {
                badgeBg = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';
                dotColor = 'bg-red-500';
                statusLabel = language === 'bn' ? 'ওভারডিউ' : 'Overdue';
              } else if (urgency.status === 'yellow') {
                badgeBg = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
                dotColor = 'bg-amber-500';
                statusLabel = language === 'bn' ? 'শীঘ্রই প্রয়োজন' : 'Due Soon';
              }

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {itemName}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {language === 'bn' ? 'ডিউ:' : 'Due:'}{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {formatNumber(dueKm, language, numberFormat)} {t.km}
                        </span>
                      </span>

                      <span>
                        {urgency.kmRemaining <= 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            {formatNumber(Math.abs(urgency.kmRemaining), language, numberFormat)} {t.km} {language === 'bn' ? 'বেশি' : 'past'}
                          </span>
                        ) : (
                          <span>
                            {formatNumber(urgency.kmRemaining, language, numberFormat)} {t.km} {language === 'bn' ? 'বাকি' : 'left'}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenMarkService(item.id)}
                    className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 active:scale-95 transition"
                  >
                    {t.markDone}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Fuel Logs Glance */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Fuel className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.recentFills}
            </h2>
          </div>
          <button
            onClick={() => onNavigateToTab('fuel')}
            className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-0.5"
          >
            <span>{t.fuelLogTitle}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentEntries.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 text-center">
            <Fuel className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.noFillsYet}
            </p>
            <button
              onClick={onOpenAddFuel}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.addFuel}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((entry) => {
              const mileage = calculatedMileages.get(entry.id);

              return (
                <div
                  key={entry.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {formatNumber(entry.odometer, language, numberFormat)} {t.km}
                      </span>
                      <span className="text-xs text-slate-400">
                        • {formatDate(entry.date, language)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatNumber(entry.litres, language, numberFormat, 2)} {t.litres} •{' '}
                      {formatCurrency(entry.totalPrice, language, numberFormat)}
                    </div>
                  </div>

                  <div className="text-right">
                    {mileage !== null && mileage !== undefined ? (
                      <div className="inline-flex flex-col items-end">
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          {formatNumber(mileage, language, numberFormat, 1)} {t.kmPerLitre}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        {entry.isFullTank ? t.firstEntryBadge : t.partialFillBadge}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
