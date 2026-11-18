import React, { useState, useEffect } from 'react';
import { MonthlyReport, FuelEntry, Language, NumberFormatType, Bike, ServiceLog, RideRecord } from '../types';
import { translations, formatNumber, formatCurrency, formatDate, formatOdometer } from '../utils/i18n';
import { checkMileageDropAlert, calculateLifetimeStats } from '../utils/calculations';
import {
  AlertTriangle,
  Receipt,
  Route,
  Droplets,
  Fuel,
} from 'lucide-react';

interface ReportsViewProps {
  bike: Bike;
  fuelEntries: FuelEntry[];
  serviceLogs: ServiceLog[];
  rideHistory?: RideRecord[];
  calculatedMileages: Map<string, number | null>;
  monthlyReports: MonthlyReport[];
  language: Language;
  numberFormat: NumberFormatType;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  bike,
  fuelEntries,
  serviceLogs,
  rideHistory = [],
  calculatedMileages,
  monthlyReports,
  language,
  numberFormat,
}) => {
  const t = translations[language];

  const alert = checkMileageDropAlert(fuelEntries);
  const lifetime = calculateLifetimeStats(bike, fuelEntries, serviceLogs, rideHistory);

  // Prepare last 7 full-tank mileage points in chronological order
  const chartData = [...fuelEntries]
    .filter((e) => calculatedMileages.get(e.id) !== null && calculatedMileages.get(e.id) !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.odometer - b.odometer)
    .slice(-7)
    .map((e) => ({
      id: e.id,
      date: e.date,
      odometer: e.odometer,
      mileage: calculatedMileages.get(e.id)!,
    }));

  const [selectedId, setSelectedId] = useState<string | null>(
    chartData.length > 0 ? chartData[chartData.length - 1].id : null
  );

  useEffect(() => {
    if (chartData.length > 0) {
      const stillExists = chartData.some((d) => d.id === selectedId);
      if (!stillExists) {
        setSelectedId(chartData[chartData.length - 1].id);
      }
    } else {
      setSelectedId(null);
    }
  }, [fuelEntries.length]);

  const selectedPoint =
    chartData.find((d) => d.id === selectedId) ||
    (chartData.length > 0 ? chartData[chartData.length - 1] : null);

  // Max scaling for hatched vertical pill bar chart
  const maxBarMileage =
    chartData.length > 0 ? Math.max(...chartData.map((d) => d.mileage), 40) * 1.12 : 60;

  return (
    <div className="space-y-4 pb-6 pt-1 animate-fadeIn">
      {/* Warning Banner: 15% Mileage Drop Alert */}
      {alert.hasAlert && (
        <div className="rounded-[24px] bg-[#FFEEEE] dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 p-4 shadow-[0_2px_12px_rgba(225,29,72,0.08)]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-rose-900 dark:text-rose-200 leading-snug">
                  {t.alertBannerTitle}
                </h3>
                <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 tabular-nums shrink-0">
                  -{formatNumber(alert.dropPercentage, language, numberFormat)}%
                </span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                {t.alertBannerDesc}
              </p>
              <div className="mt-2.5 pt-2 border-t border-rose-200/80 dark:border-rose-800/50 flex items-center gap-4 text-xs font-bold text-rose-900 dark:text-rose-200 tabular-nums">
                <span>
                  {language === 'bn' ? 'সর্বশেষ:' : 'Latest:'}{' '}
                  {formatNumber(alert.latestMileage, language, numberFormat, 1)} {t.kmPerLitre}
                </span>
                <span>·</span>
                <span>
                  {language === 'bn' ? '৩ মাসের গড়:' : '3-mo Avg:'}{' '}
                  {formatNumber(alert.threeMonthAvg, language, numberFormat, 1)} {t.kmPerLitre}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Desktop Split: Vertical Hatched Bar Chart Card + 2x2 Bento Telemetry Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Statistic Card (Matches Screen 2 Hero Chart Card) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#171C18] rounded-[26px] p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-black/[0.04] dark:border-white/[0.06] flex flex-col justify-between">
          <div>
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <div>
                <p className="text-xs font-semibold text-[#6F766C] dark:text-slate-400">
                  {selectedPoint ? t.calculatedMileage : t.avgMileage}
                </p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-[36px] font-extrabold tracking-tight tabular-nums text-[#141912] dark:text-white leading-none">
                    {selectedPoint
                      ? formatNumber(selectedPoint.mileage, language, numberFormat, 1)
                      : lifetime.avgMileage > 0
                      ? formatNumber(lifetime.avgMileage, language, numberFormat, 1)
                      : '-'}
                  </span>
                  <span className="text-sm font-semibold text-[#6F766C] dark:text-slate-400">
                    {t.kmPerLitre}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-[#6F766C] dark:text-slate-400">
                  {t.avgMileage}:{' '}
                </span>
                <span className="text-xs font-extrabold tabular-nums text-[#141912] dark:text-white">
                  {lifetime.avgMileage > 0
                    ? `${formatNumber(lifetime.avgMileage, language, numberFormat, 1)} ${t.kmPerLitre}`
                    : '-'}
                </span>
              </div>
            </div>

            {selectedPoint && (
              <p className="text-xs text-[#6F766C] dark:text-slate-400 mt-2 tabular-nums">
                {formatDate(selectedPoint.date, language)} ·{' '}
                {formatOdometer(selectedPoint.odometer, language, numberFormat)} {t.km}
              </p>
            )}
          </div>

          {/* Vertical Rounded Pill Bar Chart with Diagonal Hatched Tracks */}
          {chartData.length < 2 ? (
            <div className="py-10 text-center text-xs text-[#6F766C] dark:text-slate-400">
              {language === 'bn'
                ? 'গ্রাফ দেখানোর জন্য কমপক্ষে ২টি ফুল ট্যাংক ফুয়েল এন্ট্রি প্রয়োজন।'
                : 'At least 2 full tank fuel entries are needed to display mileage bars.'}
            </div>
          ) : (
            <div className="mt-5">
              <svg viewBox="0 0 350 185" className="w-full h-auto overflow-visible">
                <defs>
                  <pattern
                    id="diagonalHatchLight"
                    width="6"
                    height="6"
                    patternTransform="rotate(45 0 0)"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="6" height="6" fill="transparent" />
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      className="text-black/[0.07] dark:text-white/[0.1]"
                    />
                  </pattern>
                </defs>

                {chartData.map((d, idx) => {
                  const count = chartData.length;
                  const slotWidth = 350 / count;
                  const barWidth = Math.min(26, slotWidth * 0.48);
                  const x = idx * slotWidth + (slotWidth - barWidth) / 2;
                  const trackTop = 26;
                  const trackHeight = 130;
                  const trackBottom = trackTop + trackHeight;
                  const fillRatio = Math.max(0.14, Math.min(1, d.mileage / maxBarMileage));
                  const barHeight = trackHeight * fillRatio;
                  const barY = trackBottom - barHeight;
                  const isSelected = selectedPoint?.id === d.id;

                  return (
                    <g
                      key={d.id}
                      onClick={() => setSelectedId(d.id)}
                      className="cursor-pointer group"
                    >
                      {/* Full Hatched Track */}
                      <rect
                        x={x}
                        y={trackTop}
                        width={barWidth}
                        height={trackHeight}
                        rx={barWidth / 2}
                        fill="url(#diagonalHatchLight)"
                      />

                      {/* Filled Lime Pill Bar */}
                      <rect
                        x={x}
                        y={barY}
                        width={barWidth}
                        height={barHeight}
                        rx={barWidth / 2}
                        fill={isSelected ? '#92E328' : '#C5F177'}
                        className="transition-all duration-300"
                      />

                      {/* Value label above filled bar */}
                      <text
                        x={x + barWidth / 2}
                        y={barY - 6}
                        textAnchor="middle"
                        className={`text-[10px] tabular-nums font-bold ${
                          isSelected
                            ? 'fill-[#141912] dark:fill-[#A3EC38]'
                            : 'fill-[#6F766C] dark:fill-slate-400'
                        }`}
                      >
                        {formatNumber(d.mileage, language, numberFormat, 1)}
                      </text>

                      {/* Date label below track */}
                      <text
                        x={x + barWidth / 2}
                        y={trackBottom + 18}
                        textAnchor="middle"
                        className={`text-[10px] tabular-nums ${
                          isSelected
                            ? 'fill-[#141912] dark:fill-white font-extrabold'
                            : 'fill-[#7A8277] dark:fill-slate-400 font-medium'
                        }`}
                      >
                        {d.date.substring(5)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Right 2x2 Bento Grid (Matches Exercise / BPM / Weight / Water cards) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
          {/* Card 1: Total Distance with Mini Bar Sparkline */}
          <div className="bg-white dark:bg-[#171C18] rounded-[24px] p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-black/[0.04] dark:border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#EEF9DA] dark:bg-[#9AE62E]/15 text-[#5C9E00] dark:text-[#A3EC38] flex items-center justify-center shrink-0">
                <Route className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-[#141912] dark:text-white leading-tight">
                {t.totalKmRidden}
              </span>
            </div>

            {/* Mini emerald bar sparkline SVG */}
            <svg viewBox="0 0 110 26" className="w-full h-7 my-2.5" aria-hidden="true">
              {[10, 16, 8, 22, 14, 18, 25, 13, 20, 11].map((h, i) => (
                <rect
                  key={i}
                  x={i * 11 + 2}
                  y={26 - h}
                  width="5"
                  height={h}
                  rx="2.5"
                  fill={i % 2 === 0 ? '#74C211' : '#B7EB6C'}
                />
              ))}
            </svg>

            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-xl font-extrabold tabular-nums text-[#141912] dark:text-white leading-none">
                {formatOdometer(lifetime.totalDistance, language, numberFormat)}
              </span>
              <span className="text-[11px] font-medium text-[#6F766C] dark:text-slate-400">
                {t.km}
              </span>
            </div>
          </div>

          {/* Card 2: Cost per km with Coral ECG-style Waveform */}
          <div className="bg-white dark:bg-[#171C18] rounded-[24px] p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-black/[0.04] dark:border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#FFEEEE] dark:bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-[#141912] dark:text-white leading-tight">
                {t.costPerKm}
              </span>
            </div>

            {/* Clean coral trend waveform SVG */}
            <svg viewBox="0 0 120 26" className="w-full h-7 my-2.5" aria-hidden="true">
              <path
                d="M 2 15 L 24 15 L 30 9 L 36 21 L 42 5 L 48 19 L 54 15 L 78 15 L 84 10 L 90 20 L 96 7 L 102 15 L 118 15"
                fill="none"
                stroke="#F43F5E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div>
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-xl font-extrabold tabular-nums text-[#141912] dark:text-white leading-none">
                  {lifetime.costPerKm > 0
                    ? formatCurrency(lifetime.costPerKm, language, numberFormat, 2)
                    : '-'}
                </span>
                {lifetime.costPerKm > 0 && (
                  <span className="text-[11px] font-medium text-[#6F766C] dark:text-slate-400">
                    /{t.km}
                  </span>
                )}
              </div>
              {lifetime.costPerKm === 0 && (
                <p className="text-[10px] font-medium text-[#6F766C] dark:text-slate-400 mt-1">
                  {language === 'bn' ? 'ফুয়েল এন্ট্রি যোগ করলে দেখাবে' : 'Add fuel logs to calculate'}
                </p>
              )}
            </div>
          </div>

          {/* Card 3: Total Fuel Litres */}
          <div className="bg-white dark:bg-[#171C18] rounded-[24px] p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-black/[0.04] dark:border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#FFF3EB] dark:bg-orange-500/15 text-orange-500 flex items-center justify-center shrink-0">
                <Fuel className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-[#141912] dark:text-white leading-tight">
                {t.totalFuelCost}
              </span>
            </div>

            <div className="mt-4">
              <div className="text-lg font-extrabold tabular-nums text-[#141912] dark:text-white leading-tight truncate">
                {formatCurrency(lifetime.totalFuelCost, language, numberFormat)}
              </div>
              <div className="text-[11px] font-medium text-[#6F766C] dark:text-slate-400 mt-0.5 tabular-nums">
                {formatNumber(lifetime.totalLitres, language, numberFormat, 1)} {t.litres}
              </div>
            </div>
          </div>

          {/* Card 4: Total Money Spent (Fuel + Service) */}
          <div className="bg-white dark:bg-[#171C18] rounded-[24px] p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-black/[0.04] dark:border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#EBF7FF] dark:bg-sky-500/15 text-sky-500 flex items-center justify-center shrink-0">
                <Droplets className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-[#141912] dark:text-white leading-tight">
                {t.totalMoneySpent}
              </span>
            </div>

            <div className="mt-4">
              <div className="text-lg font-extrabold tabular-nums text-[#141912] dark:text-white leading-tight truncate">
                {formatCurrency(lifetime.totalCost, language, numberFormat)}
              </div>
              <div className="text-[11px] font-medium text-[#6F766C] dark:text-slate-400 mt-0.5 tabular-nums">
                {t.totalServiceCost}: {formatCurrency(lifetime.totalServiceCost, language, numberFormat)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Summary Breakdown Table */}
      <div className="bg-white dark:bg-[#171C18] rounded-[24px] p-5 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-extrabold text-[#141912] dark:text-white">
            {t.monthlySummary}
          </h2>
          <span className="text-xs font-semibold text-[#6F766C] dark:text-slate-400 tabular-nums">
            {formatNumber(monthlyReports.length, language, numberFormat)}{' '}
            {language === 'bn' ? 'মাস' : 'months'}
          </span>
        </div>

        {monthlyReports.length === 0 ? (
          <p className="text-xs text-[#6F766C] dark:text-slate-400 text-center py-6">
            {t.noReportData}
          </p>
        ) : (
          <div className="overflow-x-auto no-scrollbar -mx-5 px-5">
            <table className="w-full min-w-[460px] text-left text-xs">
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-[#6F766C] dark:text-slate-400">
                  <th className="pb-2.5 pr-3 font-semibold whitespace-nowrap">{t.monthCol}</th>
                  <th className="pb-2.5 px-2 font-semibold text-right whitespace-nowrap">{t.kmCol}</th>
                  <th className="pb-2.5 px-2 font-semibold text-right whitespace-nowrap">{t.avgMileageCol}</th>
                  <th className="pb-2.5 px-2 font-semibold text-right whitespace-nowrap">{t.fuelCostCol}</th>
                  <th className="pb-2.5 px-2 font-semibold text-right whitespace-nowrap">{t.serviceCostCol}</th>
                  <th className="pb-2.5 pl-2 font-semibold text-right whitespace-nowrap">{t.costPerKmCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.06]">
                {monthlyReports.map((row) => (
                  <tr
                    key={row.monthKey}
                    className="hover:bg-[#F6F7F4] dark:hover:bg-white/[0.03] transition"
                  >
                    <td className="py-3 pr-3 font-bold text-[#141912] dark:text-white whitespace-nowrap">
                      {language === 'bn' ? row.monthNameBn : row.monthNameEn}
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums font-semibold text-[#3F4A39] dark:text-slate-300 whitespace-nowrap">
                      {formatOdometer(row.totalKm, language, numberFormat)}
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums whitespace-nowrap">
                      <span className="font-extrabold text-[#5C9E00] dark:text-[#A3EC38]">
                        {row.avgMileage > 0 ? formatNumber(row.avgMileage, language, numberFormat, 1) : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums text-[#3F4A39] dark:text-slate-300 whitespace-nowrap">
                      {formatCurrency(row.fuelCost, language, numberFormat)}
                    </td>
                    <td className="py-3 px-2 text-right tabular-nums text-[#3F4A39] dark:text-slate-300 whitespace-nowrap">
                      {row.serviceCost > 0 ? formatCurrency(row.serviceCost, language, numberFormat) : '-'}
                    </td>
                    <td className="py-3 pl-2 text-right tabular-nums font-bold text-[#141912] dark:text-white whitespace-nowrap">
                      {row.costPerKm > 0 ? formatCurrency(row.costPerKm, language, numberFormat, 2) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
