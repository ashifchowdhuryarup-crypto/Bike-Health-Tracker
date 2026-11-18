import React, { useMemo } from 'react';
import {
  ActiveRideSession,
  Bike,
  FuelEntry,
  ServiceUrgency,
  Language,
  NumberFormatType,
  MonthlyReport,
  RideRecord,
  TabType,
} from '../types';
import {
  translations,
  formatNumber,
  formatCurrency,
  formatOdometer,
  getLocalDateString,
} from '../utils/i18n';
import {
  Fuel,
  Wrench,
  Gauge,
  Droplets,
  Check,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Map as MapIcon,
  Route,
  ChevronRight,
} from 'lucide-react';
import { PWAInstallBanner } from './PWAInstallBanner';

interface HomeDashboardProps {
  bike: Bike;
  fuelEntries: FuelEntry[];
  rideHistory: RideRecord[];
  activeRide: ActiveRideSession | null;
  urgentServices: ServiceUrgency[];
  thisMonthReport: MonthlyReport | null;
  onOpenMarkService: (serviceItemId?: string) => void;
  onOpenResetOdo?: () => void;
  onNavigateToTab: (tab: TabType) => void;
  language: Language;
  numberFormat: NumberFormatType;
}

const WEEKDAYS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAYS_BN = ['র', 'সো', 'ম', 'বু', 'বৃ', 'শু', 'শ'];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  bike,
  fuelEntries,
  rideHistory,
  activeRide,
  urgentServices,
  thisMonthReport,
  onOpenMarkService,
  onOpenResetOdo,
  onNavigateToTab,
  language,
  numberFormat,
}) => {
  const t = translations[language];
  const currentOdo = bike.currentOdometer;

  // Top 3 most urgent services
  const topReminders = urgentServices.slice(0, 3);
  const nearestService = urgentServices[0] || null;

  const rideSummary = useMemo(() => {
    const totalGpsKm = rideHistory.reduce((sum, r) => sum + r.distanceKm, 0);
    const todayIso = getLocalDateString();
    const todayKm = rideHistory
      .filter((r) => r.date === todayIso)
      .reduce((sum, r) => sum + r.distanceKm, 0);
    return {
      totalRides: rideHistory.length,
      totalGpsKm,
      todayKm,
    };
  }, [rideHistory]);

  // Build 7-day strip centered around today
  const weekDays = useMemo(() => {
    const today = new Date();
    const activityDates = new Set([
      ...fuelEntries.map((e) => e.date),
      ...rideHistory.map((r) => r.date),
    ]);
    const days: {
      dateStr: string;
      dayNum: number;
      weekdayLabel: string;
      isToday: boolean;
      hasActivity: boolean;
    }[] = [];

    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dow = d.getDay();

      days.push({
        dateStr,
        dayNum: d.getDate(),
        weekdayLabel: language === 'bn' ? WEEKDAYS_BN[dow] : WEEKDAYS_EN[dow],
        isToday: offset === 0,
        hasActivity: activityDates.has(dateStr),
      });
    }
    return days;
  }, [fuelEntries, rideHistory, language]);

  const now = new Date();
  const currentMonthYearLabel =
    language === 'bn'
      ? `${MONTHS_BN[now.getMonth()]} ${formatNumber(now.getFullYear(), 'bn', numberFormat).replace(/,/g, '')}`
      : `${MONTHS_EN[now.getMonth()]} ${now.getFullYear()}`;

  // SVG Circular Progress Ring calculation for Hero Card
  const ringRadius = 36;
  const ringCircumference = 2 * Math.PI * ringRadius;
  let ringRatio = 1;
  let ringStroke = '#8CD825';
  if (nearestService) {
    const interval = nearestService.item.kmInterval || 1000;
    ringRatio = Math.max(0.06, Math.min(1, nearestService.kmRemaining / interval));
    if (nearestService.status === 'red') {
      ringStroke = '#EF4444';
      ringRatio = 1;
    } else if (nearestService.status === 'yellow') {
      ringStroke = '#F59E0B';
    }
  }
  const ringDashOffset = ringCircumference * (1 - ringRatio);

  return (
    <div className="space-y-4 pb-6 pt-1 animate-fadeIn">
      {/* PWA Phone Install Prompt Banner */}
      <PWAInstallBanner language={language} />

      {/* Top Desktop Grid: Hero Lime Card + 2-Col Metrics + Calendar/Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column on Desktop: Signature Hero Lime Card + 2 Metrics */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Signature Pastel Lime Hero Card (Matches reference UI) */}
          <div className="rounded-[26px] bg-[#D7F49A] dark:bg-[#1E2B14] text-[#141912] dark:text-[#ECFACB] p-5 shadow-[0_4px_18px_rgba(140,216,37,0.14)] dark:shadow-none border border-[#C6EA7E]/60 dark:border-[#9AE62E]/20">
            <div className="flex items-center justify-between gap-4">
              {/* Left Info */}
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('odometer')}
                  className="group text-left rounded-2xl -m-1.5 p-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition active:scale-[0.98]"
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3C4B28] dark:text-[#CBE795]">
                    <Gauge className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t.currentOdo}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </div>

                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-[32px] font-extrabold tracking-tight tabular-nums leading-none">
                      {formatOdometer(currentOdo, language, numberFormat)}
                    </span>
                    <span className="text-sm font-bold text-[#3C4B28] dark:text-[#CBE795]">
                      {t.km}
                    </span>
                  </div>
                </button>

                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  {onOpenResetOdo && (
                    <button
                      type="button"
                      onClick={onOpenResetOdo}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-full bg-[#141912] hover:bg-black/85 dark:bg-[#9AE62E] dark:hover:bg-[#8CD825] active:scale-95 text-xs font-extrabold text-white dark:text-[#141912] transition shadow-xs"
                    >
                      <Gauge className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'ওডো পরিবর্তন' : 'Update Odo'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenMarkService(nearestService?.item.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-full bg-white/80 hover:bg-white dark:bg-white/10 dark:hover:bg-white/15 active:scale-95 text-xs font-bold text-[#141912] dark:text-[#ECFACB] transition shadow-xs"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{t.markServiceDone}</span>
                  </button>
                </div>
              </div>

              {/* Right Circular Service Ring (Matches reference progress ring) */}
              <button
                type="button"
                onClick={() => onNavigateToTab('service')}
                className="relative w-[92px] h-[92px] shrink-0 flex items-center justify-center group active:scale-95 transition"
                title={t.serviceReminders}
              >
                <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
                  <circle
                    cx="44"
                    cy="44"
                    r={ringRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-white/65 dark:text-white/10"
                  />
                  <circle
                    cx="44"
                    cy="44"
                    r={ringRadius}
                    fill="none"
                    stroke={ringStroke}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringDashOffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
                  {nearestService ? (
                    <>
                      <span className="text-[15px] font-extrabold tabular-nums leading-none text-[#141912] dark:text-white">
                        {nearestService.kmRemaining <= 0
                          ? formatOdometer(Math.abs(nearestService.kmRemaining), language, numberFormat)
                          : formatOdometer(nearestService.kmRemaining, language, numberFormat)}
                      </span>
                      <span className="text-[10px] font-semibold text-[#3C4B28] dark:text-[#CBE795] mt-0.5 leading-tight">
                        {nearestService.kmRemaining <= 0
                          ? language === 'bn'
                            ? 'ওভারডিউ'
                            : 'past'
                          : language === 'bn'
                          ? 'কিমি বাকি'
                          : 'km left'}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-[#5C9E00] dark:text-[#A3EC38]" />
                      <span className="text-[10px] font-bold mt-0.5">
                        {language === 'bn' ? 'ঠিক আছে' : 'All OK'}
                      </span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* 2-Column Bento Metric Cards (Matches Step to walk / Drink Water cards) */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Avg Mileage Card */}
            <button
              type="button"
              onClick={() => onNavigateToTab('reports')}
              className="text-left bg-white dark:bg-[#171C18] rounded-[24px] p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-black/[0.04] dark:border-white/[0.06] flex flex-col justify-between hover:border-[#9AE62E]/60 transition active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-bold text-[#141912] dark:text-slate-100 leading-snug">
                  {t.avgMileage}
                </span>
                <span className="w-9 h-9 rounded-full bg-[#FFF3EB] dark:bg-orange-500/15 text-orange-500 flex items-center justify-center shrink-0">
                  <Fuel className="w-4 h-4" />
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[24px] font-extrabold tabular-nums text-[#141912] dark:text-white leading-none">
                  {thisMonthReport && thisMonthReport.avgMileage > 0
                    ? formatNumber(thisMonthReport.avgMileage, language, numberFormat, 1)
                    : '-'}
                </span>
                <span className="text-xs font-medium text-[#6F766C] dark:text-slate-400">
                  {t.kmPerLitre}
                </span>
              </div>
            </button>

            {/* Fuel Cost Card */}
            <button
              type="button"
              onClick={() => onNavigateToTab('fuel')}
              className="text-left bg-white dark:bg-[#171C18] rounded-[24px] p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-black/[0.04] dark:border-white/[0.06] flex flex-col justify-between hover:border-[#9AE62E]/60 transition active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-bold text-[#141912] dark:text-slate-100 leading-snug">
                  {t.totalFuelCost}
                </span>
                <span className="w-9 h-9 rounded-full bg-[#EBF7FF] dark:bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0">
                  <Droplets className="w-4 h-4" />
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[24px] font-extrabold tabular-nums text-[#141912] dark:text-white leading-none truncate">
                  {formatCurrency(thisMonthReport?.fuelCost || 0, language, numberFormat)}
                </span>
                <span className="text-xs font-medium text-[#6F766C] dark:text-slate-400">
                  {thisMonthReport?.totalLitres
                    ? `${formatNumber(thisMonthReport.totalLitres, language, numberFormat, 1)} ${t.litres}`
                    : t.thisMonth}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column on Desktop: Month Calendar Strip & This Month Telemetry */}
        <div className="lg:col-span-5">
          <div className="h-full bg-white dark:bg-[#171C18] rounded-[24px] p-4.5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-black/[0.04] dark:border-white/[0.06] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-[15px] font-extrabold text-[#141912] dark:text-white">
                  {currentMonthYearLabel}
                </h2>
                <button
                  onClick={() => onNavigateToTab('reports')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#5C9E00] dark:text-[#A3EC38] hover:underline min-h-[32px] px-1"
                >
                  <span>{t.navReports}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 7-Day Week Strip matching reference design */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {weekDays.map((d) => (
                  <div key={d.dateStr} className="flex flex-col items-center">
                    <span className="text-[11px] font-semibold text-[#7A8277] dark:text-slate-400 mb-1.5">
                      {d.weekdayLabel}
                    </span>
                    <div
                      className={`w-9 h-11 rounded-full flex flex-col items-center justify-center transition ${
                        d.isToday
                          ? 'bg-[#A3EC38] text-[#141912] font-extrabold shadow-xs'
                          : 'text-[#141912] dark:text-slate-200 font-bold'
                      }`}
                    >
                      <span className="text-xs tabular-nums leading-none">
                        {formatNumber(d.dayNum, language, numberFormat)}
                      </span>
                      {d.hasActivity && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1 ${
                            d.isToday ? 'bg-[#141912]' : 'bg-[#74C211]'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clean Divider + Cost/km & Month Distance summary */}
            <div className="mt-4 pt-3.5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-[#6F766C] dark:text-slate-400">
                  {t.costPerKm}
                </p>
                <p className="text-base font-extrabold tabular-nums text-[#141912] dark:text-white mt-0.5">
                  {thisMonthReport && thisMonthReport.costPerKm > 0
                    ? `${formatCurrency(thisMonthReport.costPerKm, language, numberFormat, 2)}/${t.km}`
                    : '-'}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[11px] font-medium text-[#6F766C] dark:text-slate-400">
                  {language === 'bn' ? 'মাসিক দূরত্ব' : 'Monthly Ride'}
                </p>
                <p className="text-base font-extrabold tabular-nums text-[#141912] dark:text-white mt-0.5">
                  {formatOdometer(thisMonthReport?.totalKm || 0, language, numberFormat)} {t.km}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean GPS Ride Summary & Odometer Strip (Map stays in dedicated Map Panel) */}
      <div className="grid grid-cols-2 gap-3.5">
        <button
          type="button"
          onClick={() => onNavigateToTab('rides')}
          className="text-left bg-white dark:bg-[#171C18] rounded-[24px] p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-black/[0.04] dark:border-white/[0.06] hover:border-[#9AE62E]/60 transition active:scale-[0.98]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-[#141912] dark:text-slate-100">
              {t.rideSummaryTitle}
            </span>
            <span className="w-9 h-9 rounded-full bg-[#EEF9DA] dark:bg-[#9AE62E]/15 text-[#5C9E00] dark:text-[#A3EC38] flex items-center justify-center shrink-0">
              <Route className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[22px] font-extrabold tabular-nums text-[#141912] dark:text-white leading-none">
              {formatOdometer(rideSummary.totalGpsKm, language, numberFormat)}
            </span>
            <span className="text-xs font-medium text-[#6F766C] dark:text-slate-400">
              {t.km} · {formatNumber(rideSummary.totalRides, language, numberFormat)} {t.navRides}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('map')}
          className="text-left bg-white dark:bg-[#171C18] rounded-[24px] p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-black/[0.04] dark:border-white/[0.06] hover:border-[#9AE62E]/60 transition active:scale-[0.98]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-[#141912] dark:text-slate-100">
              {t.navMap}
            </span>
            <span className="w-9 h-9 rounded-full bg-[#EBF7FF] dark:bg-sky-500/15 text-sky-600 flex items-center justify-center shrink-0">
              <MapIcon className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-1">
            <span className="text-xs font-extrabold text-[#5C9E00] dark:text-[#A3EC38]">
              {activeRide ? t.gpsTrackingActive : t.startRideLabel}
            </span>
            <ArrowRight className="w-4 h-4 text-[#5C9E00] dark:text-[#A3EC38]" />
          </div>
        </button>
      </div>

      {/* Urgent Service Reminders */}
      <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold text-[#141912] dark:text-white">
              {t.topReminders}
            </h2>
            <button
              onClick={() => onNavigateToTab('service')}
              className="text-xs text-[#5C9E00] dark:text-[#A3EC38] font-bold hover:underline inline-flex items-center gap-1 min-h-[32px]"
            >
              <span>{t.viewAllReminders}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topReminders.length === 0 ? (
            <div className="bg-white dark:bg-[#171C18] rounded-[24px] p-5 border border-black/[0.04] dark:border-white/[0.06] text-center shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
              <CheckCircle2 className="w-8 h-8 text-[#74C211] mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-[#6F766C] dark:text-slate-300">
                {t.allGood}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {topReminders.map((urgency) => {
                const item = urgency.item;
                const itemName = language === 'bn' ? item.nameBn : item.nameEn;
                const dueKm = item.lastServiceKm + item.kmInterval;

                let iconCircleClass =
                  'bg-[#EEF9DA] text-[#5C9E00] dark:bg-[#9AE62E]/15 dark:text-[#A3EC38]';
                let IconComp = Wrench;
                let statusTextClass = 'text-[#5C9E00] dark:text-[#A3EC38]';

                if (urgency.status === 'red') {
                  iconCircleClass =
                    'bg-[#FFEEEE] text-rose-500 dark:bg-rose-500/15 dark:text-rose-400';
                  IconComp = AlertTriangle;
                  statusTextClass = 'text-rose-600 dark:text-rose-400 font-bold';
                } else if (urgency.status === 'yellow') {
                  iconCircleClass =
                    'bg-[#FFF6E5] text-amber-500 dark:bg-amber-500/15 dark:text-amber-400';
                  IconComp = Clock;
                  statusTextClass = 'text-amber-600 dark:text-amber-400 font-bold';
                }

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-[#171C18] rounded-[22px] p-3.5 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconCircleClass}`}
                      >
                        <IconComp className="w-[18px] h-[18px]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-[#141912] dark:text-white truncate">
                          {itemName}
                        </h3>
                        <p className="text-xs text-[#6F766C] dark:text-slate-400 mt-0.5 truncate tabular-nums">
                          <span>
                            {language === 'bn' ? 'ডিউ' : 'Due'}{' '}
                            {formatOdometer(dueKm, language, numberFormat)} {t.km}
                          </span>
                          <span className="mx-1.5">·</span>
                          <span className={statusTextClass}>
                            {urgency.kmRemaining <= 0
                              ? `${formatOdometer(Math.abs(urgency.kmRemaining), language, numberFormat)} ${t.km} ${language === 'bn' ? 'বেশি' : 'past'}`
                              : `${formatOdometer(urgency.kmRemaining, language, numberFormat)} ${t.km} ${language === 'bn' ? 'বাকি' : 'left'}`}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenMarkService(item.id)}
                      aria-label={t.markDone}
                      title={t.markDone}
                      className="w-11 h-11 rounded-full shrink-0 bg-[#F6F7F4] hover:bg-[#D7F49A] dark:bg-white/[0.06] dark:hover:bg-[#9AE62E]/20 text-[#141912] dark:text-white flex items-center justify-center active:scale-95 transition"
                    >
                      <Check className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
};
