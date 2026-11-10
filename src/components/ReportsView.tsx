import React, { useState } from 'react';
import { MonthlyReport, FuelEntry, Language, NumberFormatType, Bike, ServiceLog } from '../types';
import { translations, formatNumber, formatCurrency, formatDate } from '../utils/i18n';
import { checkMileageDropAlert, calculateLifetimeStats } from '../utils/calculations';
import {
  BarChart3,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Receipt,
  Route,
  Droplet,
  Info,
} from 'lucide-react';

interface ReportsViewProps {
  bike: Bike;
  fuelEntries: FuelEntry[];
  serviceLogs: ServiceLog[];
  calculatedMileages: Map<string, number | null>;
  monthlyReports: MonthlyReport[];
  language: Language;
  numberFormat: NumberFormatType;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  bike,
  fuelEntries,
  serviceLogs,
  calculatedMileages,
  monthlyReports,
  language,
  numberFormat,
}) => {
  const t = translations[language];

  // Check 15% mileage drop alert
  const alert = checkMileageDropAlert(fuelEntries);

  // Lifetime summary
  const lifetime = calculateLifetimeStats(bike, fuelEntries, serviceLogs);

  // Prepare chart data for km/l over time
  // Filter entries with valid calculated mileage, sorted chronologically ascending
  const chartData = [...fuelEntries]
    .filter((e) => calculatedMileages.get(e.id) !== null && calculatedMileages.get(e.id) !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.odometer - b.odometer)
    .map((e) => ({
      id: e.id,
      date: e.date,
      odometer: e.odometer,
      mileage: calculatedMileages.get(e.id)!,
    }));

  const [selectedPoint, setSelectedPoint] = useState<(typeof chartData)[0] | null>(
    chartData.length > 0 ? chartData[chartData.length - 1] : null
  );

  // SVG Chart Dimensions & Scale
  const svgWidth = 360;
  const svgHeight = 180;
  const padding = { top: 20, right: 20, bottom: 35, left: 35 };

  const minMileage = chartData.length > 0 ? Math.min(...chartData.map((d) => d.mileage), 25) - 3 : 20;
  const maxMileage = chartData.length > 0 ? Math.max(...chartData.map((d) => d.mileage), 45) + 3 : 55;

  const getX = (index: number) => {
    if (chartData.length <= 1) return svgWidth / 2;
    return padding.left + (index / (chartData.length - 1)) * (svgWidth - padding.left - padding.right);
  };

  const getY = (val: number) => {
    const range = maxMileage - minMileage || 1;
    return svgHeight - padding.bottom - ((val - minMileage) / range) * (svgHeight - padding.top - padding.bottom);
  };

  const pointsString = chartData.map((d, i) => `${getX(i)},${getY(d.mileage)}`).join(' ');

  return (
    <div className="space-y-4 pb-20 pt-2 animate-fadeIn">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>{t.reportsTitle}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {bike.name} ({bike.model})
        </p>
      </div>

      {/* Warning Banner: 15% Mileage Drop Alert */}
      {alert.hasAlert && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 to-rose-700 text-white p-4.5 shadow-lg shadow-red-600/20 border border-red-500">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-yellow-300 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold leading-snug">
                  {t.alertBannerTitle}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white text-red-700">
                  -{formatNumber(alert.dropPercentage, language, numberFormat)}%
                </span>
              </div>
              <p className="text-xs text-red-100 mt-1 leading-relaxed">
                {t.alertBannerDesc}
              </p>
              <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center gap-4 text-xs font-semibold">
                <div>
                  <span className="text-red-200 block text-[10px]">
                    {language === 'bn' ? 'সাম্প্রতিক মাইলেজ:' : 'Latest:'}
                  </span>
                  <span>{formatNumber(alert.latestMileage, language, numberFormat, 1)} {t.kmPerLitre}</span>
                </div>
                <div>
                  <span className="text-red-200 block text-[10px]">
                    {language === 'bn' ? '৩ মাসের গড়:' : '3-mo Avg:'}
                  </span>
                  <span>{formatNumber(alert.threeMonthAvg, language, numberFormat, 1)} {t.kmPerLitre}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lifetime Stats Quick Row */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Route className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t.totalKmRidden}</span>
          </div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
            {formatNumber(lifetime.totalDistance, language, numberFormat)} {t.km}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            {t.avgMileage}: {formatNumber(lifetime.avgMileage, language, numberFormat, 1)} {t.kmPerLitre}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Receipt className="w-3.5 h-3.5 text-blue-500" />
            <span>{t.totalMoneySpent}</span>
          </div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
            {formatCurrency(lifetime.totalCost, language, numberFormat)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {formatCurrency(lifetime.costPerKm, language, numberFormat, 2)}/{t.km}
          </div>
        </div>
      </div>

      {/* Mileage Trend Line Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.mileageTrend}
            </h2>
          </div>
          {selectedPoint && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
              {formatNumber(selectedPoint.mileage, language, numberFormat, 1)} {t.kmPerLitre}
            </span>
          )}
        </div>

        {chartData.length < 2 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {language === 'bn'
              ? 'গ্রাফ দেখানোর জন্য কমপক্ষে ২টি ফুল ট্যাংক ফুয়েল এন্ট্রি প্রয়োজন।'
              : 'At least 2 full tank fuel entries are needed to draw the trend line.'}
          </div>
        ) : (
          <div>
            <div className="w-full overflow-x-auto no-scrollbar">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
                <defs>
                  <linearGradient id="mileageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                {[minMileage, (minMileage + maxMileage) / 2, maxMileage].map((val, idx) => {
                  const y = getY(val);
                  return (
                    <g key={idx}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke="currentColor"
                        className="text-slate-200 dark:text-slate-800"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={padding.left - 6}
                        y={y + 3}
                        textAnchor="end"
                        className="fill-slate-400 text-[9px] font-mono"
                      >
                        {Math.round(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Fill Area */}
                <polygon
                  points={`${getX(0)},${svgHeight - padding.bottom} ${pointsString} ${getX(
                    chartData.length - 1
                  )},${svgHeight - padding.bottom}`}
                  fill="url(#mileageGradient)"
                />

                {/* Connecting Line */}
                <polyline
                  points={pointsString}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {chartData.map((d, idx) => {
                  const cx = getX(idx);
                  const cy = getY(d.mileage);
                  const isSelected = selectedPoint?.id === d.id;

                  return (
                    <g
                      key={d.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedPoint(d)}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 6 : 4}
                        className={`${
                          isSelected
                            ? 'fill-white stroke-emerald-600 stroke-[3]'
                            : 'fill-emerald-500 hover:fill-emerald-400 stroke-white dark:stroke-slate-900 stroke-2'
                        } transition-all`}
                      />
                      {/* Short date below point */}
                      <text
                        x={cx}
                        y={svgHeight - 12}
                        textAnchor="middle"
                        className="fill-slate-400 text-[8px] font-sans"
                      >
                        {d.date.substring(5)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {selectedPoint && (
              <div className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                <span>{formatDate(selectedPoint.date, language)}</span> •{' '}
                <span className="font-mono">{formatNumber(selectedPoint.odometer, language, numberFormat)} {t.km}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Monthly Summary Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {t.monthlySummary}
          </h2>
          <span className="text-xs text-slate-400">
            {monthlyReports.length} {language === 'bn' ? 'মাস' : 'months'}
          </span>
        </div>

        {monthlyReports.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            {t.noReportData}
          </p>
        ) : (
          <div className="overflow-x-auto no-scrollbar -mx-4.5 px-4.5">
            <table className="w-full min-w-[460px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400">
                  <th className="pb-2.5 pr-3 font-semibold whitespace-nowrap">{t.monthCol}</th>
                  <th className="pb-2.5 px-2 font-semibold text-right whitespace-nowrap">{t.kmCol}</th>
                  <th className="pb-2.5 px-2 font-semibold text-right whitespace-nowrap">{t.avgMileageCol}</th>
                  <th className="pb-2.5 px-2 font-semibold text-right whitespace-nowrap">{t.fuelCostCol}</th>
                  <th className="pb-2.5 px-2 font-semibold text-right whitespace-nowrap">{t.serviceCostCol}</th>
                  <th className="pb-2.5 pl-2 font-semibold text-right whitespace-nowrap">{t.costPerKmCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {monthlyReports.map((row) => (
                  <tr key={row.monthKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 pr-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {language === 'bn' ? row.monthNameBn : row.monthNameEn}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatNumber(row.totalKm, language, numberFormat)}
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {row.avgMileage > 0 ? formatNumber(row.avgMileage, language, numberFormat, 1) : '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatCurrency(row.fuelCost, language, numberFormat)}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {row.serviceCost > 0 ? formatCurrency(row.serviceCost, language, numberFormat) : '-'}
                    </td>
                    <td className="py-2.5 pl-2 text-right tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
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
