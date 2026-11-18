import React, { useMemo } from 'react';
import { Bike, FuelEntry, Language, NumberFormatType, RideRecord } from '../types';
import { formatDate, formatDuration, formatNumber, formatOdometer, translations } from '../utils/i18n';
import { Gauge, Map as MapIcon, Route, TrendingUp } from 'lucide-react';

interface OdometerViewProps {
  bike: Bike;
  rides: RideRecord[];
  fuelEntries: FuelEntry[];
  onOpenResetOdo: () => void;
  onGoToMap: () => void;
  onInspectRideOnMap: (ride: RideRecord) => void;
  language: Language;
  numberFormat: NumberFormatType;
}

export const OdometerView: React.FC<OdometerViewProps> = ({
  bike,
  rides,
  onOpenResetOdo,
  onGoToMap,
  onInspectRideOnMap,
  language,
  numberFormat,
}) => {
  const t = translations[language];

  const rideStats = useMemo(() => {
    const totalGpsKm = rides.reduce((sum, r) => sum + r.distanceKm, 0);
    const totalDurationSec = rides.reduce((sum, r) => sum + r.durationSec, 0);
    return {
      totalGpsKm,
      totalDurationSec,
      rideCount: rides.length,
    };
  }, [rides]);

  const sortedRides = useMemo(() => {
    return [...rides].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }, [rides]);

  return (
    <div className="space-y-4 pb-6 pt-1 animate-fadeIn">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-lg font-extrabold text-[#141912] dark:text-white tracking-tight">
          {t.odometerPanelTitle}
        </h1>
      </div>

      {/* Main Odometer Readout Card */}
      <div className="rounded-[26px] bg-[#D7F49A] dark:bg-[#1E2B14] text-[#141912] dark:text-[#ECFACB] p-5 border border-[#C6EA7E]/60 dark:border-[#9AE62E]/20 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3C4B28] dark:text-[#CBE795]">
              <Gauge className="w-4 h-4" />
              <span>{t.currentOdo}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-[36px] font-extrabold tracking-tight tabular-nums leading-none">
                {formatOdometer(bike.currentOdometer, language, numberFormat)}
              </span>
              <span className="text-base font-bold text-[#3C4B28] dark:text-[#CBE795]">{t.km}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenResetOdo}
            className="px-4 py-2 min-h-[40px] rounded-full bg-white/85 hover:bg-white dark:bg-white/10 dark:hover:bg-white/15 text-xs font-extrabold text-[#141912] dark:text-white transition active:scale-95"
          >
            {language === 'bn' ? 'ওডো পরিবর্তন' : 'Update Odo'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-black/10 dark:border-white/10">
          <div>
            <span className="text-[11px] font-medium text-[#3C4B28] dark:text-[#CBE795] block">
              {t.startingBaselineOdo}
            </span>
            <span className="text-base font-extrabold tabular-nums">
              {formatOdometer(bike.initialOdometer, language, numberFormat)} {t.km}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#3C4B28] dark:text-[#CBE795] block">
              {t.gpsTrackedDistance}
            </span>
            <span className="text-base font-extrabold tabular-nums">
              +{formatOdometer(rideStats.totalGpsKm, language, numberFormat)} {t.km}
            </span>
          </div>
        </div>
      </div>

      {/* Distance KPI Strip */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-white dark:bg-[#171C18] rounded-[24px] p-4 border border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#141912] dark:text-slate-100">
              {t.totalRidesCompleted}
            </span>
            <span className="w-8 h-8 rounded-full bg-[#EEF9DA] dark:bg-[#9AE62E]/15 text-[#5C9E00] dark:text-[#A3EC38] flex items-center justify-center">
              <Route className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold tabular-nums text-[#141912] dark:text-white mt-3">
            {formatNumber(rideStats.rideCount, language, numberFormat)}
          </p>
        </div>

        <div className="bg-white dark:bg-[#171C18] rounded-[24px] p-4 border border-black/[0.04] dark:border-white/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#141912] dark:text-slate-100">
              {t.rideDuration}
            </span>
            <span className="w-8 h-8 rounded-full bg-[#EBF7FF] dark:bg-sky-500/15 text-sky-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-extrabold tabular-nums text-[#141912] dark:text-white mt-3">
            {formatDuration(rideStats.totalDurationSec, language, numberFormat)}
          </p>
        </div>
      </div>

      {/* Odometer Ride Ledger */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-[#141912] dark:text-white">
            {t.odoRideLedger}
          </h2>
          <button
            type="button"
            onClick={onGoToMap}
            className="text-xs font-bold text-[#5C9E00] dark:text-[#A3EC38] hover:underline"
          >
            {t.navMap}
          </button>
        </div>

        {sortedRides.length === 0 ? (
          <div className="bg-white dark:bg-[#171C18] rounded-[24px] p-5 border border-black/[0.04] dark:border-white/[0.06] text-center text-xs text-[#6F766C] dark:text-slate-400">
            {t.noRidesYet}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedRides.map((ride) => (
              <button
                key={ride.id}
                type="button"
                onClick={() => onInspectRideOnMap(ride)}
                className="w-full text-left bg-white dark:bg-[#171C18] hover:border-[#9AE62E]/60 rounded-[20px] p-3.5 border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between gap-3 transition"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#141912] dark:text-white">
                    {formatDate(ride.date, language)}
                  </div>
                  <div className="text-[11px] text-[#6F766C] dark:text-slate-400 tabular-nums mt-0.5">
                    {formatOdometer(ride.odometerBefore, language, numberFormat)} →{' '}
                    {formatOdometer(ride.odometerAfter, language, numberFormat)} {t.km}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-extrabold tabular-nums text-[#5C9E00] dark:text-[#A3EC38]">
                    +{formatOdometer(ride.distanceKm, language, numberFormat)} {t.km}
                  </span>
                  <MapIcon className="w-4 h-4 text-[#6F766C] dark:text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
