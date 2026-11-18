import { ActiveRideSession, Bike, RideLocation, RidePoint, RideRecord } from '../types';
import { getLocalDateString } from './i18n';

export const INITIAL_DEFAULT_ODOMETER = 8943;
export const MAX_ACCEPTABLE_ACCURACY_M = 120; // Allow realistic mobile/Android Fused GPS while rejecting coarse cell-tower fixes (>120m)
export const MIN_STEP_KM = 0.012; // 12 meters deadband to eliminate slow-traffic GPS zig-zag drift
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
 * Computes cosine of turning angle between segments (p0 -> p1) and (p1 -> p2).
 * Values near -1 represent an acute ~180° back-and-forth reversal (multipath spike).
 */
function computeTurningCosine(
  p0: { lat: number; lng: number },
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const cosLat = Math.max(0.2, Math.cos((p1.lat * Math.PI) / 180));
  const v1x = (p1.lng - p0.lng) * cosLat;
  const v1y = p1.lat - p0.lat;
  const v2x = (p2.lng - p1.lng) * cosLat;
  const v2y = p2.lat - p1.lat;
  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 === 0 || mag2 === 0) return 1;
  return (v1x * v2x + v1y * v2y) / (mag1 * mag2);
}

function getEffectiveDeadbandKm(accA?: number, accB?: number): number {
  const a = accA !== undefined && Number.isFinite(accA) ? accA : 0;
  const b = accB !== undefined && Number.isFinite(accB) ? accB : 0;
  const worstAccM = Math.max(a, b);
  return worstAccM > 30
    ? Math.max(MIN_STEP_KM, Math.min(0.06, (worstAccM * 0.65) / 1000))
    : MIN_STEP_KM;
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

  // Reject coarse-accuracy high-speed bursts (common under flyovers/buildings)
  if (
    incoming.accuracyM !== undefined &&
    Number.isFinite(incoming.accuracyM) &&
    incoming.accuracyM > 45 &&
    deltaMs < 15000 &&
    impliedSpeedKmh > 65
  ) {
    return { session, accepted: false, reason: 'gps_jump', addedKm: 0 };
  }

  // Reject physically impossible instantaneous motorcycle acceleration spikes (e.g. 10 -> 113 km/h in <6s)
  if (deltaMs < 6000 && impliedSpeedKmh > 95 && (prev.speedKmh ?? 0) < 35) {
    return { session, accepted: false, reason: 'gps_jump', addedKm: 0 };
  }

  // Detect & roll back acute back-and-forth multipath V-spikes (p0 -> spike p1 -> snap back p2)
  if (session.route.length >= 2) {
    const p0 = session.route[session.route.length - 2];
    const p1 = session.route[session.route.length - 1];
    const d01 = haversineDistanceKm(p0, p1);
    const d12 = deltaKm;
    const d02 = haversineDistanceKm(p0, incoming);
    const span02Ms = incoming.timestamp - p0.timestamp;
    const span01Ms = p1.timestamp - p0.timestamp;
    const speed01 = span01Ms > 0 ? d01 / (span01Ms / 3_600_000) : 0;
    const cosAngle = computeTurningCosine(p0, p1, incoming);

    const isMultipathSpike =
      span02Ms > 0 &&
      span02Ms <= 16_000 &&
      d01 >= 0.025 &&
      d12 >= 0.025 &&
      cosAngle < -0.45 &&
      d02 < (d01 + d12) * 0.55 &&
      (speed01 > 28 ||
        impliedSpeedKmh > 28 ||
        (p1.accuracyM ?? 0) > 25 ||
        (incoming.accuracyM ?? 0) > 25);

    if (isMultipathSpike) {
      const cleanedRoute = session.route.slice(0, -1);
      const baseDistance = Math.max(0, session.distanceKm - d01);
      const cleanedMaxSpeed = cleanedRoute.reduce(
        (m, pt) => Math.max(m, pt.speedKmh ?? 0),
        0
      );
      const directDeadbandKm = getEffectiveDeadbandKm(p0.accuracyM, incoming.accuracyM);

      if (d02 < directDeadbandKm) {
        return {
          session: {
            ...session,
            lastUpdatedAt: nowIso,
            distanceKm: baseDistance,
            currentSpeedKmh: 0,
            maxSpeedKmh: roundTo1(cleanedMaxSpeed),
            route: cleanedRoute,
            lastAcceptedPoint: p0,
          },
          accepted: false,
          reason: 'stationary_drift',
          addedKm: 0,
        };
      }

      const directHours = span02Ms / 3_600_000;
      const directImpliedSpeed = directHours > 0 ? d02 / directHours : 0;
      const hasReliableDirectSpeed =
        incoming.speedKmh !== undefined &&
        Number.isFinite(incoming.speedKmh) &&
        incoming.speedKmh >= 0 &&
        incoming.speedKmh <= MAX_REALISTIC_SPEED_KMH &&
        (incoming.speedKmh > 0 || directImpliedSpeed <= 3);

      const directSpeed = hasReliableDirectSpeed
        ? roundTo1(incoming.speedKmh!)
        : roundTo1(Math.min(MAX_REALISTIC_SPEED_KMH, directImpliedSpeed));

      const sanitizedDirect: RidePoint = {
        lat: incoming.lat,
        lng: incoming.lng,
        timestamp: incoming.timestamp,
        accuracyM: incoming.accuracyM,
        speedKmh: directSpeed,
      };

      return {
        session: {
          ...session,
          lastUpdatedAt: nowIso,
          distanceKm: baseDistance + d02,
          currentSpeedKmh: directSpeed,
          maxSpeedKmh: roundTo1(Math.max(cleanedMaxSpeed, directSpeed)),
          route: [...cleanedRoute, sanitizedDirect],
          lastAcceptedPoint: sanitizedDirect,
        },
        accepted: true,
        addedKm: d02,
      };
    }
  }

  // Accuracy-proportional stationary deadband to filter scatter inside GPS error circle
  const effectiveDeadbandKm = getEffectiveDeadbandKm(prev.accuracyM, incoming.accuracyM);

  if (deltaKm < effectiveDeadbandKm) {
    const shouldZeroSpeed = deltaMs >= 4000 || incoming.speedKmh === 0;
    return {
      session: {
        ...session,
        lastUpdatedAt: nowIso,
        currentSpeedKmh: shouldZeroSpeed ? 0 : session.currentSpeedKmh,
      },
      accepted: false,
      reason: 'stationary_drift',
      addedKm: 0,
    };
  }

  const hasReliableSensorSpeed =
    incoming.speedKmh !== undefined &&
    Number.isFinite(incoming.speedKmh) &&
    incoming.speedKmh >= 0 &&
    incoming.speedKmh <= MAX_REALISTIC_SPEED_KMH &&
    (incoming.speedKmh > 0 || impliedSpeedKmh <= 3);

  const derivedSpeed = hasReliableSensorSpeed
    ? roundTo1(incoming.speedKmh!)
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
