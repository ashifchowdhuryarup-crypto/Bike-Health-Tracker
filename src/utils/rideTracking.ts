import { ActiveRideSession, Bike, RideLocation, RidePoint, RideRecord } from '../types';
import { getLocalDateString } from './i18n';

export const INITIAL_DEFAULT_ODOMETER = 8943;
export const MAX_ACCEPTABLE_ACCURACY_M = 120; // Allow realistic mobile/Android Fused GPS while rejecting coarse cell-tower fixes (>120m)
export const MIN_STEP_KM = 0.005; // 5 meters deadband to reject stationary GPS drift
export const MAX_REALISTIC_SPEED_KMH = 180; // Reject impossible GPS teleport jumps

export function roundTo2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundTo1(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function formatCoordLabel(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function isValidCoordinatePair(loc?: { lat: number; lng: number } | null): boolean {
  if (!loc) return false;
  if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return false;
  if (loc.lat < -90 || loc.lat > 90 || loc.lng < -180 || loc.lng > 180) return false;
  if (loc.lat === 0 && loc.lng === 0) return false;
  return true;
}

/**
 * Computes exact geodesic distance in kilometers between two GPS coordinates using Haversine formula.
 */
export function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  if (a.lat === b.lat && a.lng === b.lng) return 0;
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  return R * c;
}

/**
 * Validates whether a GPS reading is physically plausible and accurate enough to append.
 */
export function isValidGpsReading(point: RidePoint): boolean {
  if (!isValidCoordinatePair(point)) {
    return false;
  }
  if (point.accuracyM !== undefined && Number.isFinite(point.accuracyM)) {
    if (point.accuracyM > MAX_ACCEPTABLE_ACCURACY_M) {
      return false;
    }
  }
  return true;
}

export function createActiveRideSession(
  bike: Bike,
  initialPoint?: RidePoint | null,
  startTimeIso: string = new Date().toISOString()
): ActiveRideSession {
  const sessionId = `ride_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const validInitial = initialPoint && isValidGpsReading(initialPoint) ? initialPoint : null;

  return {
    sessionId,
    bikeId: bike.id,
    startTime: startTimeIso,
    lastUpdatedAt: startTimeIso,
    distanceKm: 0,
    maxSpeedKmh: 0,
    currentSpeedKmh: 0,
    startLocation: validInitial
      ? {
          lat: validInitial.lat,
          lng: validInitial.lng,
          label: formatCoordLabel(validInitial.lat, validInitial.lng),
        }
      : null,
    route: validInitial ? [validInitial] : [],
    odometerAtStart: bike.currentOdometer,
    lastAcceptedPoint: validInitial,
  };
}

export interface GpsPointProcessResult {
  session: ActiveRideSession;
  accepted: boolean;
  reason?: 'invalid_coords' | 'low_accuracy' | 'stationary_drift' | 'gps_jump' | 'stale_timestamp';
  addedKm: number;
}

/**
 * Processes a live GPS coordinate against the active ride session, filtering GPS jumps,
 * inaccurate cell-tower fixes, and stationary drift.
 */
export function processIncomingGpsPoint(
  session: ActiveRideSession,
  incoming: RidePoint
): GpsPointProcessResult {
  if (!isValidCoordinatePair(incoming)) {
    return { session, accepted: false, reason: 'invalid_coords', addedKm: 0 };
  }

  if (
    incoming.accuracyM !== undefined &&
    Number.isFinite(incoming.accuracyM) &&
    incoming.accuracyM > MAX_ACCEPTABLE_ACCURACY_M
  ) {
    return { session, accepted: false, reason: 'low_accuracy', addedKm: 0 };
  }

  const nowIso = new Date(incoming.timestamp || Date.now()).toISOString();

  // First valid GPS lock of the ride
  if (!session.lastAcceptedPoint) {
    const sensorSpeed =
      incoming.speedKmh !== undefined &&
      Number.isFinite(incoming.speedKmh) &&
      incoming.speedKmh >= 0 &&
      incoming.speedKmh <= MAX_REALISTIC_SPEED_KMH
        ? roundTo1(incoming.speedKmh)
        : 0;

    const updated: ActiveRideSession = {
      ...session,
      lastUpdatedAt: nowIso,
      startLocation: {
        lat: incoming.lat,
        lng: incoming.lng,
        label: formatCoordLabel(incoming.lat, incoming.lng),
      },
      route: [incoming],
      lastAcceptedPoint: incoming,
      currentSpeedKmh: sensorSpeed,
      maxSpeedKmh: Math.max(session.maxSpeedKmh, sensorSpeed),
    };
    return { session: updated, accepted: true, addedKm: 0 };
  }

  const prev = session.lastAcceptedPoint;
  const deltaMs = incoming.timestamp - prev.timestamp;
  if (deltaMs <= 0) {
    return { session, accepted: false, reason: 'stale_timestamp', addedKm: 0 };
  }

  const deltaKm = haversineDistanceKm(prev, incoming);
  const deltaHours = deltaMs / 3_600_000;
  const impliedSpeedKmh = deltaHours > 0 ? deltaKm / deltaHours : 0;

  // Reject impossible GPS teleport / jump spikes
  if (impliedSpeedKmh > MAX_REALISTIC_SPEED_KMH || (deltaMs < 5000 && deltaKm > 0.35)) {
    return { session, accepted: false, reason: 'gps_jump', addedKm: 0 };
  }

  // Adaptive stationary deadband: 5m for crisp GPS (<= 40m accuracy), scaling up to ~30m for coarse urban fixes
  const effectiveDeadbandKm =
    incoming.accuracyM !== undefined && Number.isFinite(incoming.accuracyM) && incoming.accuracyM > 40
      ? Math.max(MIN_STEP_KM, Math.min(0.03, (incoming.accuracyM / 1000) * 0.35))
      : MIN_STEP_KM;

  if (deltaKm < effectiveDeadbandKm) {
    return {
      session: {
        ...session,
        lastUpdatedAt: nowIso,
        currentSpeedKmh: 0,
      },
      accepted: false,
      reason: 'stationary_drift',
      addedKm: 0,
    };
  }

  const derivedSpeed =
    incoming.speedKmh !== undefined &&
    Number.isFinite(incoming.speedKmh) &&
    incoming.speedKmh >= 0 &&
    incoming.speedKmh <= MAX_REALISTIC_SPEED_KMH
      ? roundTo1(incoming.speedKmh)
      : roundTo1(Math.min(MAX_REALISTIC_SPEED_KMH, impliedSpeedKmh));

  const nextDistance = session.distanceKm + deltaKm;
  const nextMaxSpeed = Math.max(session.maxSpeedKmh, derivedSpeed);

  const sanitizedPoint: RidePoint = {
    lat: incoming.lat,
    lng: incoming.lng,
    timestamp: incoming.timestamp,
    accuracyM: incoming.accuracyM,
    speedKmh: derivedSpeed,
  };

  const updated: ActiveRideSession = {
    ...session,
    lastUpdatedAt: nowIso,
    distanceKm: nextDistance,
    currentSpeedKmh: derivedSpeed,
    maxSpeedKmh: nextMaxSpeed,
    route: [...session.route, sanitizedPoint],
    lastAcceptedPoint: sanitizedPoint,
  };

  return { session: updated, accepted: true, addedKm: deltaKm };
}

/**
 * Converts a finished ActiveRideSession into an immutable RideRecord linked to the bike's current odometer.
 */
export function finalizeRideSession(
  session: ActiveRideSession,
  bike: Bike,
  endTimeIso: string = new Date().toISOString()
): RideRecord {
  const startMs = new Date(session.startTime).getTime();
  const endMs = Math.max(startMs, new Date(endTimeIso).getTime());
  const durationSec = Math.max(1, Math.round((endMs - startMs) / 1000));
  const distanceKm = Number.isFinite(session.distanceKm) && session.distanceKm > 0
    ? roundTo2(session.distanceKm)
    : 0;

  const avgSpeedKmh =
    durationSec > 0 && distanceKm > 0
      ? roundTo1(Math.min(MAX_REALISTIC_SPEED_KMH, distanceKm / (durationSec / 3600)))
      : 0;
  const maxSpeedKmh = roundTo1(Math.max(session.maxSpeedKmh, avgSpeedKmh));

  const firstPoint = session.route[0] || session.lastAcceptedPoint || null;
  const lastPoint = session.route[session.route.length - 1] || session.lastAcceptedPoint || firstPoint;

  const startLocation: RideLocation =
    session.startLocation && isValidCoordinatePair(session.startLocation)
      ? session.startLocation
      : firstPoint && isValidCoordinatePair(firstPoint)
      ? {
          lat: firstPoint.lat,
          lng: firstPoint.lng,
          label: formatCoordLabel(firstPoint.lat, firstPoint.lng),
        }
      : {
          lat: 0,
          lng: 0,
          label: 'GPS Unavailable',
        };

  const endLocation: RideLocation =
    lastPoint && isValidCoordinatePair(lastPoint)
      ? {
          lat: lastPoint.lat,
          lng: lastPoint.lng,
          label: formatCoordLabel(lastPoint.lat, lastPoint.lng),
        }
      : {
          lat: startLocation.lat,
          lng: startLocation.lng,
          label: startLocation.label,
        };

  const odometerBefore = bike.currentOdometer;
  const odometerAfter = roundTo2(odometerBefore + distanceKm);

  return {
    id: session.sessionId,
    bikeId: bike.id,
    date: getLocalDateString(new Date(session.startTime)),
    startTime: session.startTime,
    endTime: endTimeIso,
    distanceKm,
    durationSec,
    avgSpeedKmh,
    maxSpeedKmh,
    startLocation,
    endLocation,
    route: session.route,
    odometerBefore,
    odometerAfter,
    odometerApplied: true,
    createdAt: endTimeIso,
  };
}

/**
 * Idempotently appends a completed ride and returns the exact updated odometer reading.
 * Prevents duplicate ride records and duplicate odometer additions even if triggered twice.
 */
export function applyCompletedRideSafely(
  existingRides: RideRecord[],
  bike: Bike,
  ride: RideRecord
): {
  saved: boolean;
  updatedRides: RideRecord[];
  updatedOdometer: number;
} {
  if (ride.bikeId !== bike.id || existingRides.some((r) => r.id === ride.id)) {
    return {
      saved: false,
      updatedRides: existingRides,
      updatedOdometer: bike.currentOdometer,
    };
  }

  const safeDistanceKm = Number.isFinite(ride.distanceKm) && ride.distanceKm > 0 ? roundTo2(ride.distanceKm) : 0;
  const nextOdometer = roundTo2(bike.currentOdometer + safeDistanceKm);
  const normalizedRide: RideRecord = {
    ...ride,
    distanceKm: safeDistanceKm,
    odometerBefore: bike.currentOdometer,
    odometerAfter: nextOdometer,
    odometerApplied: true,
  };

  return {
    saved: true,
    updatedRides: [normalizedRide, ...existingRides],
    updatedOdometer: nextOdometer,
  };
}
