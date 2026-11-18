import React, { useMemo, useState } from 'react';
import { Language, NumberFormatType, RideRecord } from '../types';
import {
  formatDate,
  formatDuration,
  formatNumber,
  formatOdometer,
  formatTimeOfDay,
  translations,
} from '../utils/i18n';
import { ConfirmDialog } from './ConfirmDialog';
import { Calendar, Clock, Gauge, Map as MapIcon, MapPin, Navigation, Route, Trash2 } from 'lucide-react';

interface RideHistoryViewProps {
  rides: RideRecord[];
  onInspectRideOnMap: (ride: RideRecord) => void;
  onDeleteRide: (rideId: string) => void;
  onGoToMap: () => void;
  language: Language;
  numberFormat: NumberFormatType;
}

export const RideHistoryView: React.FC<RideHistoryViewProps> = ({
  rides,
  onInspectRideOnMap,
  onDeleteRide,
  onGoToMap,
  language,
  numberFormat,
}) => {
  const t = translations[language];
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const sortedRides = useMemo(() => {
    return [...rides].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }, [rides]);

  const availableDates = useMemo(() => {
    const seen = new Set<string>();
    sortedRides.forEach((r) => seen.add(r.date));
    return Array.from(seen).sort().reverse();
  }, [sortedRides]);

  const filteredRides = useMemo(() => {
    if (selectedDate === 'all') return sortedRides;
    return sortedRides.filter((r) => r.date === selectedDate);
  }, [sortedRides, selectedDate]);

  const summary = useMemo(() => {
    const totalKm = filteredRides.reduce((acc, r) => acc + r.distanceKm, 0);
    const totalDurationSec = filteredRides.reduce((acc, r) => acc + r.durationSec, 0);
    const topMaxSpeed = filteredRides.reduce((max, r) => Math.max(max, r.maxSpeedKmh), 0);
    return {
      count: filteredRides.length,
      totalKm,
      totalDurationSec,
      topMaxSpeed,
    };
  }, [filteredRides]);

  return (
    <div className="space-y-4 pb-6 pt-1 animate-fadeIn">
      {/* Header & Date Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h1 className="text-lg font-extrabold text-[#141912] dark:text-white tracking-tight">
          {t.rideHistoryTitle}
        </h1>

        {availableDates.length > 0 && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#6F766C] dark:text-slate-400" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label={t.filterByDate}
              className="px-3 py-1.5 min-h-[38px] rounded-full bg-white dark:bg-[#171C18] border border-black/[0.06] dark:border-white/[0.08] text-xs font-bold text-[#141912] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#9AE62E]"
            >
              <option value="all">{t.allDates}</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {formatDate(d, language)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#D7F49A] dark:bg-[#1E2B14] rounded-[22px] p-3.5 text-[#141912] dark:text-[#ECFACB]">
          <span className="text-[11px] font-semibold text-[#3C4B28] dark:text-[#CBE795]">
            {t.totalRidesCompleted}
          </span>
          <p className="text-xl font-extrabold tabular-nums mt-0.5">
            {formatNumber(summary.count, language, numberFormat)}
          </p>
        </div>

        <div className="bg-white dark:bg-[#171C18] rounded-[22px] p-3.5 border border-black/[0.04] dark:border-white/[0.06]">
          <span className="text-[11px] font-medium text-[#6F766C] dark:text-slate-400">
            {t.liveDistance}
          </span>
          <p className="text-xl font-extrabold tabular-nums text-[#141912] dark:text-white mt-0.5">
            {formatOdometer(summary.totalKm, language, numberFormat)}{' '}
            <span className="text-xs font-bold">{t.km}</span>
          </p>
        </div>

        <div className="bg-white dark:bg-[#171C18] rounded-[22px] p-3.5 border border-black/[0.04] dark:border-white/[0.06]">
          <span className="text-[11px] font-medium text-[#6F766C] dark:text-slate-400">
            {t.maxSpeed}
          </span>
          <p className="text-xl font-extrabold tabular-nums text-[#141912] dark:text-white mt-0.5">
            {formatNumber(summary.topMaxSpeed, language, numberFormat, 0)}{' '}
            <span className="text-[11px] font-semibold">{t.kmh}</span>
          </p>
        </div>
      </div>

      {/* Empty State vs Ride List */}
      {filteredRides.length === 0 ? (
        <div className="bg-white dark:bg-[#171C18] rounded-[26px] p-8 border border-black/[0.04] dark:border-white/[0.06] text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#EEF9DA] dark:bg-[#1E2B14] text-[#5C9E00] dark:text-[#A3EC38] flex items-center justify-center mx-auto mb-3">
            <Route className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-[#141912] dark:text-white">{t.noRidesYet}</p>
          <p className="text-xs text-[#6F766C] dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {t.noRidesHelp}
          </p>
          <button
            type="button"
            onClick={onGoToMap}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-full bg-[#9AE62E] hover:bg-[#8CD825] text-[#141912] text-xs font-extrabold transition active:scale-95"
          >
            <MapIcon className="w-4 h-4" />
            <span>{t.navMap}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRides.map((ride) => (
            <div
              key={ride.id}
              className="bg-white dark:bg-[#171C18] rounded-[24px] p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_10px_rgba(15,23,42,0.03)] space-y-3"
            >
              {/* Date + Time + Distance Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-extrabold text-[#141912] dark:text-white">
                    {formatDate(ride.date, language)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#6F766C] dark:text-slate-400 mt-0.5 tabular-nums">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {formatTimeOfDay(ride.startTime, language, numberFormat)} →{' '}
                      {formatTimeOfDay(ride.endTime, language, numberFormat)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-extrabold tabular-nums text-[#5C9E00] dark:text-[#A3EC38]">
                    +{formatOdometer(ride.distanceKm, language, numberFormat)} {t.km}
                  </span>
                  <div className="text-[11px] font-semibold text-[#6F766C] dark:text-slate-400 tabular-nums">
                    {formatDuration(ride.durationSec, language, numberFormat)}
                  </div>
                </div>
              </div>

              {/* Speed & Odometer Grid */}
              <div className="grid grid-cols-3 gap-2 text-xs bg-[#F6F7F4] dark:bg-white/[0.04] rounded-2xl p-2.5">
                <div>
                  <span className="text-[10px] text-[#6F766C] dark:text-slate-400 block">
                    {t.avgSpeed}
                  </span>
                  <span className="font-bold text-[#141912] dark:text-white tabular-nums">
                    {formatNumber(ride.avgSpeedKmh, language, numberFormat, 1)} {t.kmh}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6F766C] dark:text-slate-400 block">
                    {t.maxSpeed}
                  </span>
                  <span className="font-bold text-[#141912] dark:text-white tabular-nums">
                    {formatNumber(ride.maxSpeedKmh, language, numberFormat, 1)} {t.kmh}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#6F766C] dark:text-slate-400 block">
                    {t.odometer}
                  </span>
                  <span className="font-bold text-[#141912] dark:text-white tabular-nums">
                    {formatOdometer(ride.odometerAfter, language, numberFormat)}
                  </span>
                </div>
              </div>

              {/* Start / End Locations */}
              <div className="space-y-1 text-[11px] text-[#6F766C] dark:text-slate-400">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-[#141912] dark:text-slate-200">
                    {t.startPoint}:
                  </span>
                  <span className="tabular-nums truncate">
                    {ride.startLocation.label ||
                      `${ride.startLocation.lat.toFixed(5)}, ${ride.startLocation.lng.toFixed(5)}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Navigation className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="font-semibold text-[#141912] dark:text-slate-200">
                    {t.endPoint}:
                  </span>
                  <span className="tabular-nums truncate">
                    {ride.endLocation.label ||
                      `${ride.endLocation.lat.toFixed(5)}, ${ride.endLocation.lng.toFixed(5)}`}
                  </span>
                </div>
              </div>

              {/* Action Row */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/[0.05] dark:border-white/[0.06]">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#6F766C] dark:text-slate-400 tabular-nums">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>
                    {formatOdometer(ride.odometerBefore, language, numberFormat)} →{' '}
                    {formatOdometer(ride.odometerAfter, language, numberFormat)} {t.km}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onInspectRideOnMap(ride)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-full bg-[#EEF9DA] hover:bg-[#D7F49A] dark:bg-[#9AE62E]/15 dark:hover:bg-[#9AE62E]/25 text-[#3B7300] dark:text-[#A3EC38] text-xs font-bold transition active:scale-95"
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>{t.viewRouteOnMap}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(ride.id)}
                    aria-label={t.delete}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#6F766C] hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => {
          if (deleteTargetId) onDeleteRide(deleteTargetId);
        }}
        title={t.delete}
        message={t.deleteRideConfirm}
        confirmText={t.delete}
        cancelText={t.cancel}
        isDestructive={true}
      />
    </div>
  );
};
