import { FuelEntry, ServiceItem, ServiceUrgency, ServiceStatusColor, MonthlyReport, Bike, ServiceLog, RideRecord } from '../types';
import { getLocalDateString } from './i18n';

function roundKm2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function formatKmPlain(val: number): string {
  const rounded = roundKm2(val);
  return Number.isInteger(rounded)
    ? rounded.toString()
    : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * Calculates mileage (km/l) for each fuel entry.
 * Follows the standard full-tank method:
 * - Mileage is only recorded on full tank entries that have a prior full tank entry.
 * - Distance = current full tank odometer - previous full tank odometer.
 * - Litres = sum of all litres consumed between the previous full tank (exclusive) and current full tank (inclusive).
 *   (If there were intermediate partial fills, their litres are included).
 * - Returns a Map of entryId -> calculated km/l (rounded to 1 decimal place), or null if not applicable.
 */
export function calculateFuelMileages(entries: FuelEntry[]): Map<string, number | null> {
  const result = new Map<string, number | null>();
  if (!entries || entries.length === 0) return result;

  // Sort ascending by date and odometer to process in chronological order
  const sorted = [...entries].sort((a, b) => {
    if (a.odometer !== b.odometer) return a.odometer - b.odometer;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  let prevFullTankOdo: number | null = null;
  let litresAccumulated = 0;

  for (const entry of sorted) {
    if (entry.isFullTank) {
      if (prevFullTankOdo !== null) {
        const distance = entry.odometer - prevFullTankOdo;
        const totalLitres = litresAccumulated + entry.litres;
        if (distance > 0 && totalLitres > 0) {
          const kmPerLitre = Math.round((distance / totalLitres) * 10) / 10;
          result.set(entry.id, kmPerLitre);
        } else {
          result.set(entry.id, null);
        }
      } else {
        // First full tank in history, cannot calculate mileage without previous baseline
        result.set(entry.id, null);
      }
      // Reset accumulator after a full tank
      prevFullTankOdo = entry.odometer;
      litresAccumulated = 0;
    } else {
      // Partial fill: does not produce its own mileage, but its litres contribute to next full fill
      litresAccumulated += entry.litres;
      result.set(entry.id, null);
    }
  }

  return result;
}

/**
 * Evaluates the urgency and status of a service reminder item.
 * Status rules:
 * - Green = more than 200 km left and (if day interval set) > 7 days left
 * - Yellow = under or equal to 200 km left or (if day interval set) <= 7 days left (and not overdue)
 * - Red = overdue (<= 0 km left or <= 0 days left)
 * Status is based on whichever comes first: km interval or day interval.
 */
export function calculateServiceUrgency(
  item: ServiceItem,
  currentOdo: number,
  now: Date = new Date()
): ServiceUrgency {
  const dueKm = roundKm2(item.lastServiceKm + item.kmInterval);
  const kmRemaining = roundKm2(dueKm - currentOdo);

  let daysRemaining: number | undefined = undefined;
  if (item.dayInterval && item.lastServiceDate) {
    const lastDate = new Date(item.lastServiceDate);
    const dueDate = new Date(lastDate.getTime() + item.dayInterval * 24 * 60 * 60 * 1000);
    const diffTime = dueDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const isKmOverdue = kmRemaining <= 0;
  const isDaysOverdue = daysRemaining !== undefined && daysRemaining <= 0;
  const isOverdue = isKmOverdue || isDaysOverdue;

  let status: ServiceStatusColor = 'green';
  if (isOverdue) {
    status = 'red';
  } else if (kmRemaining <= 200 || (daysRemaining !== undefined && daysRemaining <= 7)) {
    status = 'yellow';
  } else {
    status = 'green';
  }

  // Calculate an urgency score for sorting (lower score = higher priority / more urgent)
  const kmUrgency = kmRemaining;
  const dayEquivalentKm = daysRemaining !== undefined ? daysRemaining * 30 : Infinity;
  const urgencyScore = Math.min(kmUrgency, dayEquivalentKm);

  const kmRemStr = formatKmPlain(kmRemaining);
  const kmAbsStr = formatKmPlain(Math.abs(kmRemaining));

  // Status text strings
  let statusTextEn = '';
  let statusTextBn = '';

  if (isOverdue) {
    if (isKmOverdue && isDaysOverdue) {
      statusTextEn = `Overdue by ${kmAbsStr} km & ${Math.abs(daysRemaining!)} days`;
      statusTextBn = `${kmAbsStr} কিমি ও ${Math.abs(daysRemaining!)} দিন পার হয়ে গেছে`;
    } else if (isKmOverdue) {
      statusTextEn = `Overdue by ${kmAbsStr} km`;
      statusTextBn = `${kmAbsStr} কিমি পার হয়ে গেছে`;
    } else {
      statusTextEn = `Overdue by ${Math.abs(daysRemaining!)} days`;
      statusTextBn = `${Math.abs(daysRemaining!)} দিন পার হয়ে গেছে`;
    }
  } else if (status === 'yellow') {
    if (kmRemaining <= 200 && daysRemaining !== undefined && daysRemaining <= 7) {
      statusTextEn = `Due soon: ${kmRemStr} km or ${daysRemaining} days`;
      statusTextBn = `শীঘ্রই সার্ভিস করুন: ${kmRemStr} কিমি বা ${daysRemaining} দিন`;
    } else if (kmRemaining <= 200) {
      statusTextEn = `Due soon: ${kmRemStr} km remaining`;
      statusTextBn = `শীঘ্রই প্রয়োজন: আর ${kmRemStr} কিমি বাকি`;
    } else {
      statusTextEn = `Due soon: ${daysRemaining} days remaining`;
      statusTextBn = `শীঘ্রই প্রয়োজন: আর ${daysRemaining} দিন বাকি`;
    }
  } else {
    if (daysRemaining !== undefined) {
      statusTextEn = `${kmRemStr} km / ${daysRemaining} days remaining`;
      statusTextBn = `আর ${kmRemStr} কিমি / ${daysRemaining} দিন বাকি`;
    } else {
      statusTextEn = `${kmRemStr} km remaining`;
      statusTextBn = `আর ${kmRemStr} কিমি বাকি`;
    }
  }

  return {
    item,
    kmRemaining,
    daysRemaining,
    isOverdue,
    status,
    urgencyScore,
    statusTextEn,
    statusTextBn,
  };
}

/**
 * Checks if latest fuel mileage dropped more than 15% below the 3-month average.
 * Returns an alert payload with percentage and values.
 */
export function checkMileageDropAlert(
  entries: FuelEntry[],
  now: Date = new Date()
): {
  hasAlert: boolean;
  latestMileage: number | null;
  threeMonthAvg: number | null;
  dropPercentage: number;
} {
  const mileageMap = calculateFuelMileages(entries);

  // Filter entries that have a valid calculated mileage
  const sorted = [...entries]
    .filter((e) => mileageMap.get(e.id) !== null && mileageMap.get(e.id) !== undefined)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (sorted.length < 2) {
    return { hasAlert: false, latestMileage: null, threeMonthAvg: null, dropPercentage: 0 };
  }

  const latestEntry = sorted[0];
  const latestMileage = mileageMap.get(latestEntry.id)!;

  // Find entries in the last 90 days (prior to latest entry or including)
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const recentEntries = sorted.filter((e) => new Date(e.date) >= threeMonthsAgo);

  // If fewer than 2 recent entries in 3 months, use the last 4-5 entries as sample
  const benchmarkEntries = recentEntries.length >= 2 ? recentEntries : sorted.slice(0, 5);

  const total = benchmarkEntries.reduce((acc, curr) => acc + (mileageMap.get(curr.id) || 0), 0);
  const threeMonthAvg = Math.round((total / benchmarkEntries.length) * 10) / 10;

  // Drop check: latestMileage < threeMonthAvg * 0.85 (more than 15% below)
  const dropRatio = (threeMonthAvg - latestMileage) / threeMonthAvg;
  const dropPercentage = Math.round(dropRatio * 100);

  const hasAlert = dropRatio > 0.15 && threeMonthAvg > 0;

  return {
    hasAlert,
    latestMileage,
    threeMonthAvg,
    dropPercentage,
  };
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

/**
 * Calculates monthly aggregation reports:
 * - Month
 * - Total km ridden
 * - Total litres of fuel
 * - Average km/l (total km / total litres)
 * - Total fuel cost (৳)
 * - Total service cost (৳)
 * - Total money spent
 * - Cost per km (total money spent / total km)
 */
export function calculateMonthlyReports(
  fuelEntries: FuelEntry[],
  serviceLogs: ServiceLog[],
  bike: Bike,
  rideHistory: RideRecord[] = []
): MonthlyReport[] {
  // Group fuel entries, service logs, and GPS rides by YYYY-MM
  const monthMap = new Map<
    string,
    {
      fuelEntries: FuelEntry[];
      serviceLogs: ServiceLog[];
      rides: RideRecord[];
    }
  >();

  for (const f of fuelEntries) {
    const key = f.date.substring(0, 7); // YYYY-MM
    if (!monthMap.has(key)) {
      monthMap.set(key, { fuelEntries: [], serviceLogs: [], rides: [] });
    }
    monthMap.get(key)!.fuelEntries.push(f);
  }

  for (const s of serviceLogs) {
    const key = s.date.substring(0, 7);
    if (!monthMap.has(key)) {
      monthMap.set(key, { fuelEntries: [], serviceLogs: [], rides: [] });
    }
    monthMap.get(key)!.serviceLogs.push(s);
  }

  for (const r of rideHistory) {
    const key = r.date.substring(0, 7);
    if (!monthMap.has(key)) {
      monthMap.set(key, { fuelEntries: [], serviceLogs: [], rides: [] });
    }
    monthMap.get(key)!.rides.push(r);
  }

  // Sort entries chronologically to determine odometer spans
  const allChronological = [...fuelEntries].sort((a, b) => {
    if (a.odometer !== b.odometer) return a.odometer - b.odometer;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const sortedMonthKeys = Array.from(monthMap.keys()).sort().reverse();
  const reports: MonthlyReport[] = [];

  for (const monthKey of sortedMonthKeys) {
    const [yearStr, monthStr] = monthKey.split('-');
    const monthIndex = parseInt(monthStr, 10) - 1;
    const year = parseInt(yearStr, 10);

    const data = monthMap.get(monthKey)!;
    const fuels = [...data.fuelEntries].sort((a, b) => {
      if (a.odometer !== b.odometer) return a.odometer - b.odometer;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    const services = data.serviceLogs;
    const monthGpsKm = roundKm2(data.rides.reduce((acc, r) => acc + (r.distanceKm || 0), 0));

    const fuelCost = fuels.reduce((acc, f) => acc + (f.totalPrice || 0), 0);
    const totalLitres = Math.round(fuels.reduce((acc, f) => acc + (f.litres || 0), 0) * 100) / 100;
    const serviceCost = services.reduce((acc, s) => acc + (s.cost || 0), 0);
    const totalCost = fuelCost + serviceCost;

    let totalKm = 0;
    let avgMileage = 0;
    let costPerKm = 0;

    if (fuels.length > 0) {
      const monthMinOdo = Math.min(...fuels.map((f) => f.odometer));
      const monthMaxOdo = Math.max(...fuels.map((f) => f.odometer));

      // Look for the last entry prior to this month to get start baseline
      const priorEntries = allChronological.filter((f) => f.date < `${monthKey}-01`);

      if (priorEntries.length > 0) {
        const lastPriorOdo = priorEntries[priorEntries.length - 1].odometer;
        totalKm = Math.max(monthGpsKm, Math.max(0, roundKm2(monthMaxOdo - lastPriorOdo)));
        avgMileage = totalLitres > 0 && totalKm > 0 ? Math.round((totalKm / totalLitres) * 10) / 10 : 0;
        costPerKm = totalKm > 0 ? Math.round((totalCost / totalKm) * 100) / 100 : 0;
      } else if (
        bike.initialOdometer > 0 &&
        monthMinOdo >= bike.initialOdometer &&
        monthMinOdo - bike.initialOdometer <= 1000
      ) {
        totalKm = Math.max(monthGpsKm, Math.max(0, roundKm2(monthMaxOdo - bike.initialOdometer)));
        avgMileage = totalLitres > 0 && totalKm > 0 ? Math.round((totalKm / totalLitres) * 10) / 10 : 0;
        costPerKm = totalKm > 0 ? Math.round((totalCost / totalKm) * 100) / 100 : 0;
      } else if (fuels.length > 1) {
        totalKm = Math.max(monthGpsKm, Math.max(0, roundKm2(monthMaxOdo - monthMinOdo)));
        const consumedLitres = fuels.filter((f) => f.odometer > monthMinOdo).reduce((acc, f) => acc + (f.litres || 0), 0);
        const consumedFuelCost = fuels.filter((f) => f.odometer > monthMinOdo).reduce((acc, f) => acc + (f.totalPrice || 0), 0);

        avgMileage = consumedLitres > 0 && totalKm > 0 ? Math.round((totalKm / consumedLitres) * 10) / 10 : 0;
        costPerKm = totalKm > 0 ? Math.round(((consumedFuelCost + serviceCost) / totalKm) * 100) / 100 : 0;
      } else {
        totalKm = monthGpsKm;
        avgMileage = 0;
        costPerKm = 0;
      }
    } else if (monthGpsKm > 0) {
      totalKm = monthGpsKm;
      costPerKm = 0;
    }

    reports.push({
      monthKey,
      monthNameEn: `${MONTH_NAMES_EN[monthIndex]} ${year}`,
      monthNameBn: `${MONTH_NAMES_BN[monthIndex]} ${year}`,
      totalKm,
      totalLitres,
      avgMileage,
      fuelCost,
      serviceCost,
      totalCost,
      costPerKm,
    });
  }

  return reports;
}

/**
 * Calculates overall lifetime summary stats for a bike.
 */
export function calculateLifetimeStats(
  bike: Bike,
  fuelEntries: FuelEntry[],
  serviceLogs: ServiceLog[],
  rideHistory: RideRecord[] = []
) {
  const totalServiceCost = serviceLogs.reduce((sum, s) => sum + (s.cost || 0), 0);
  const totalGpsRideKm = roundKm2(rideHistory.reduce((sum, r) => sum + (r.distanceKm || 0), 0));

  // If no fuel entries exist, tracked distance comes from GPS rides
  if (!fuelEntries || fuelEntries.length === 0) {
    return {
      currentOdo: bike.currentOdometer,
      totalDistance: totalGpsRideKm,
      totalFuelCost: 0,
      totalLitres: 0,
      totalServiceCost,
      totalCost: totalServiceCost,
      avgMileage: 0,
      costPerKm: 0,
    };
  }

  const currentOdo = Math.max(
    bike.currentOdometer,
    ...fuelEntries.map((f) => f.odometer),
    bike.initialOdometer
  );

  const totalFuelCost = fuelEntries.reduce((sum, f) => sum + (f.totalPrice || 0), 0);
  const totalLitres = Math.round(fuelEntries.reduce((sum, f) => sum + (f.litres || 0), 0) * 100) / 100;
  const totalCost = totalFuelCost + totalServiceCost;

  let totalDistance = 0;
  let avgMileage = 0;
  let costPerKm = 0;

  if (fuelEntries.length > 1) {
    const minOdo = Math.min(...fuelEntries.map((f) => f.odometer));
    const maxOdo = Math.max(...fuelEntries.map((f) => f.odometer));

    if (
      bike.initialOdometer > 0 &&
      bike.initialOdometer < minOdo &&
      minOdo - bike.initialOdometer <= 1000
    ) {
      totalDistance = Math.max(totalGpsRideKm, roundKm2(maxOdo - bike.initialOdometer));
      avgMileage = totalLitres > 0 && totalDistance > 0 ? Math.round((totalDistance / totalLitres) * 10) / 10 : 0;
      costPerKm = totalDistance > 0 ? Math.round((totalCost / totalDistance) * 100) / 100 : 0;
    } else {
      totalDistance = Math.max(totalGpsRideKm, Math.max(0, roundKm2(maxOdo - minOdo)));
      const consumedLitres = fuelEntries.filter((f) => f.odometer > minOdo).reduce((sum, f) => sum + (f.litres || 0), 0);
      const consumedFuelCost = fuelEntries.filter((f) => f.odometer > minOdo).reduce((sum, f) => sum + (f.totalPrice || 0), 0);

      avgMileage = consumedLitres > 0 && totalDistance > 0 ? Math.round((totalDistance / consumedLitres) * 10) / 10 : 0;
      costPerKm = totalDistance > 0 ? Math.round(((consumedFuelCost + totalServiceCost) / totalDistance) * 100) / 100 : 0;
    }
  } else if (fuelEntries.length === 1) {
    if (
      bike.initialOdometer > 0 &&
      bike.initialOdometer < fuelEntries[0].odometer &&
      fuelEntries[0].odometer - bike.initialOdometer <= 1000
    ) {
      totalDistance = Math.max(totalGpsRideKm, roundKm2(fuelEntries[0].odometer - bike.initialOdometer));
      avgMileage = totalLitres > 0 && totalDistance > 0 ? Math.round((totalDistance / totalLitres) * 10) / 10 : 0;
      costPerKm = totalDistance > 0 ? Math.round((totalCost / totalDistance) * 100) / 100 : 0;
    } else {
      totalDistance = totalGpsRideKm;
      avgMileage = 0;
      costPerKm = 0;
    }
  }

  return {
    currentOdo,
    totalDistance,
    totalFuelCost,
    totalLitres,
    totalServiceCost,
    totalCost,
    avgMileage,
    costPerKm,
  };
}

/**
 * Automatically synchronizes service items and initialOdometer whenever the bike's
 * odometer changes (via Odometer Update, Fuel Add, Fuel Edit, or Fuel Delete).
 *
 * Rules:
 * - If newOdo === 0: all items for this bike reset to 0 km.
 * - If an item is uninitialized (lastServiceKm === 0 with no logged service) and the bike
 *   moves from 0 or jumps above 500 km from initialOdometer 0: auto-syncs lastServiceKm to newOdo.
 * - If newOdo < item.lastServiceKm (downward odometer reset/correction): adjusts lastServiceKm
 *   to preserve prior used distance within the new odometer range (0 <= lastServiceKm <= newOdo).
 * - Otherwise (normal forward riding or valid records): retains recorded lastServiceKm so
 *   calculateServiceUrgency(item, newOdo) immediately reflects updated remaining km.
 */
export function autoSyncServicesForOdometerChange(
  items: ServiceItem[],
  bike: Bike,
  oldOdo: number,
  newOdo: number,
  serviceLogs: ServiceLog[],
  todayStr: string = getLocalDateString(),
  forceResetAll: boolean = false
): { updatedItems: ServiceItem[]; updatedInitialOdo: number; changed: boolean } {
  const isUninitializedBike = bike.initialOdometer === 0 && newOdo > 500;
  const bikeLogs = serviceLogs.filter((l) => l.bikeId === bike.id);
  let changed = false;

  const updatedItems = items.map((item) => {
    if (item.bikeId !== bike.id) return item;

    if (forceResetAll || newOdo === 0) {
      if (item.lastServiceKm !== newOdo || item.lastServiceDate !== todayStr) {
        changed = true;
        return {
          ...item,
          lastServiceKm: roundKm2(newOdo),
          lastServiceDate: todayStr,
        };
      }
      return item;
    }

    const hasItemLog = bikeLogs.some((l) => l.serviceItemId === item.id);

    if (
      item.lastServiceKm === 0 &&
      !hasItemLog &&
      (oldOdo === 0 || isUninitializedBike || (newOdo > 500 && item.isDefault))
    ) {
      changed = true;
      return {
        ...item,
        lastServiceKm: roundKm2(newOdo),
        lastServiceDate: todayStr,
      };
    }

    if (item.lastServiceKm > newOdo) {
      const usedKm = Math.max(0, roundKm2(oldOdo - item.lastServiceKm));
      const adjustedLastKm = Math.max(0, roundKm2(newOdo - usedKm));
      changed = true;
      return {
        ...item,
        lastServiceKm: adjustedLastKm,
      };
    }

    return item;
  });

  let updatedInitialOdo = bike.initialOdometer;
  if (newOdo === 0) {
    updatedInitialOdo = 0;
  } else if (bike.initialOdometer === 0 && newOdo > 0) {
    updatedInitialOdo = roundKm2(newOdo);
  } else if (newOdo < bike.initialOdometer) {
    updatedInitialOdo = roundKm2(newOdo);
  }

  return { updatedItems, updatedInitialOdo, changed };
}

/**
 * Determines whether a fuel entry occurred on or after a bike's odometerResetAt timestamp,
 * accurately handling same-day resets via entry.createdAt or timestamped id.
 */
export function isFuelEntryAfterReset(entry: FuelEntry, odometerResetAt?: string): boolean {
  if (!odometerResetAt) return true;
  if (entry.createdAt) {
    return entry.createdAt >= odometerResetAt;
  }
  if (entry.id.startsWith('fuel_')) {
    const ts = Number(entry.id.slice(5));
    if (!Number.isNaN(ts) && ts > 1_000_000_000_000) {
      return ts >= new Date(odometerResetAt).getTime();
    }
  }
  const resetDate = odometerResetAt.split('T')[0];
  return entry.date > resetDate;
}


