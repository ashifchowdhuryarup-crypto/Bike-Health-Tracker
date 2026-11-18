import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_DEFAULT_ODOMETER,
  haversineDistanceKm,
  createActiveRideSession,
  processIncomingGpsPoint,
  finalizeRideSession,
  applyCompletedRideSafely,
} from './rideTracking';
import { Bike, RidePoint } from '../types';

const makeBike = (currentOdometer: number = INITIAL_DEFAULT_ODOMETER): Bike => ({
  id: 'bike_primary_1',
  name: 'My Motorcycle',
  model: '150cc',
  initialOdometer: INITIAL_DEFAULT_ODOMETER,
  currentOdometer,
  createdAt: '2026-11-16',
});

test('INITIAL_DEFAULT_ODOMETER starts at 8,943 KM', () => {
  assert.equal(INITIAL_DEFAULT_ODOMETER, 8943);
});

test('haversineDistanceKm computes realistic geographical distances accurately', () => {
  // Farmgate to Shahbag in Dhaka (~2.75 km)
  const d = haversineDistanceKm(
    { lat: 23.7561, lng: 90.3872 },
    { lat: 23.7389, lng: 90.3958 }
  );
  assert.ok(d > 1.8 && d < 2.5, `Expected ~2.1km between Farmgate & Shahbag, got ${d}`);
});

test('Worked example: 8,943 KM starting odometer + 12.5 KM ride updates odometer to 8,955.5 KM without resetting initialOdometer', () => {
  const bike = makeBike(8943);
  const startTime = '2026-11-16T08:00:00.000Z';
  let session = createActiveRideSession(bike, null, startTime);

  // Move northbound ~0.001 deg latitude every step until 12.5 km (~0.112415 deg lat total)
  const totalSteps = 125;
  const latPerStep = 0.00089932; // ~0.1 km (100m) per step
  const startMs = new Date(startTime).getTime();

  for (let i = 0; i <= totalSteps; i++) {
    const pt: RidePoint = {
      lat: 23.7 + i * latPerStep,
      lng: 90.4,
      timestamp: startMs + i * 12_000, // ~30 km/h (100m every 12s)
      accuracyM: 8,
    };
    const res = processIncomingGpsPoint(session, pt);
    session = res.session;
    assert.equal(res.accepted, true);
  }

  const endTime = new Date(startMs + totalSteps * 12_000).toISOString();
  const ride = finalizeRideSession(session, bike, endTime);

  assert.equal(ride.distanceKm, 12.5);
  assert.equal(ride.odometerBefore, 8943);
  assert.equal(ride.odometerAfter, 8955.5);

  const applied = applyCompletedRideSafely([], bike, ride);
  assert.equal(applied.saved, true);
  assert.equal(applied.updatedOdometer, 8955.5);
  assert.equal(bike.initialOdometer, 8943, 'Initial 8943 baseline must remain untouched');
});

test('GPS noise, low-accuracy readings, stationary drift, and impossible teleport jumps are rejected', () => {
  const bike = makeBike(8943);
  const baseMs = Date.UTC(2026, 10, 16, 9, 0, 0);
  let session = createActiveRideSession(bike, null, new Date(baseMs).toISOString());

  // 1. Initial lock
  const lock = processIncomingGpsPoint(session, {
    lat: 23.81,
    lng: 90.41,
    timestamp: baseMs,
    accuracyM: 10,
  });
  session = lock.session;
  assert.equal(lock.accepted, true);

  // 2a. Realistic mobile Fused GPS accuracy (85m) -> accepted
  const lockMobile = processIncomingGpsPoint(session, {
    lat: 23.8105,
    lng: 90.4105,
    timestamp: baseMs + 10000,
    accuracyM: 85,
  });
  assert.equal(lockMobile.accepted, true);
  session = lockMobile.session;

  // 2b. Coarse inaccurate cell-tower reading (160m error) -> rejected
  const inaccurate = processIncomingGpsPoint(session, {
    lat: 23.825,
    lng: 90.425,
    timestamp: baseMs + 15000,
    accuracyM: 160,
  });
  assert.equal(inaccurate.accepted, false);
  assert.equal(inaccurate.reason, 'low_accuracy');
  assert.equal(inaccurate.session.distanceKm, lockMobile.session.distanceKm);

  // Reset tracking check against lockMobile point for jump & drift assertions
  const distBeforeDrift = session.distanceKm;

  // 3. Impossible teleport jump (5.5 km in 2 seconds -> > 9,000 km/h) -> rejected
  const jump = processIncomingGpsPoint(session, {
    lat: 23.86,
    lng: 90.41,
    timestamp: baseMs + 12000,
    accuracyM: 6,
  });
  assert.equal(jump.accepted, false);
  assert.equal(jump.reason, 'gps_jump');
  assert.equal(jump.session.distanceKm, distBeforeDrift);

  // 4. Stationary micro-jitter (~1.1m) -> rejected
  const jitter = processIncomingGpsPoint(session, {
    lat: 23.81051,
    lng: 90.4105,
    timestamp: baseMs + 14000,
    accuracyM: 8,
    speedKmh: 0,
  });
  assert.equal(jitter.accepted, false);
  assert.equal(jitter.reason, 'stationary_drift');
  assert.equal(jitter.session.currentSpeedKmh, 0);
  assert.equal(jitter.session.distanceKm, distBeforeDrift);
});

test('GPS signal loss & automatic recovery resumes realistic distance accurately after outage', () => {
  const bike = makeBike(8943);
  const baseMs = Date.UTC(2026, 10, 16, 10, 0, 0);
  let session = createActiveRideSession(bike, null, new Date(baseMs).toISOString());

  session = processIncomingGpsPoint(session, {
    lat: 23.8,
    lng: 90.4,
    timestamp: baseMs,
    accuracyM: 10,
  }).session;

  // Signal drops for 2 minutes while rider covers ~1.5 km (~45 km/h)
  const recovery = processIncomingGpsPoint(session, {
    lat: 23.81349, // ~1.50 km north
    lng: 90.4,
    timestamp: baseMs + 120_000,
    accuracyM: 12,
  });

  assert.equal(recovery.accepted, true);
  assert.ok(recovery.addedKm > 1.4 && recovery.addedKm < 1.6);
});

test('Duplicate prevention stops duplicate ride saves & duplicate odometer additions', () => {
  const bike = makeBike(8943);
  const startMs = Date.UTC(2026, 10, 16, 11, 0, 0);
  let session = createActiveRideSession(bike, null, new Date(startMs).toISOString());

  session = processIncomingGpsPoint(session, {
    lat: 23.8,
    lng: 90.4,
    timestamp: startMs,
    accuracyM: 8,
  }).session;
  session = processIncomingGpsPoint(session, {
    lat: 23.809, // ~1.0 km
    lng: 90.4,
    timestamp: startMs + 90_000,
    accuracyM: 8,
  }).session;

  const finalized = finalizeRideSession(session, bike, new Date(startMs + 90_000).toISOString());

  const firstApply = applyCompletedRideSafely([], bike, finalized);
  assert.equal(firstApply.saved, true);
  const bikeAfterFirst = { ...bike, currentOdometer: firstApply.updatedOdometer };

  // Second accidental call with same ride ID
  const duplicateApply = applyCompletedRideSafely(firstApply.updatedRides, bikeAfterFirst, finalized);
  assert.equal(duplicateApply.saved, false);
  assert.equal(duplicateApply.updatedRides.length, 1);
  assert.equal(
    duplicateApply.updatedOdometer,
    firstApply.updatedOdometer,
    'Duplicate ride submission must never increment odometer a second time'
  );
});

test('Crash recovery checkpoint preserves ride session state across JSON serialization', () => {
  const bike = makeBike(8943);
  const startMs = Date.UTC(2026, 10, 16, 12, 0, 0);
  let session = createActiveRideSession(bike, null, new Date(startMs).toISOString());

  session = processIncomingGpsPoint(session, {
    lat: 23.8,
    lng: 90.4,
    timestamp: startMs,
    accuracyM: 9,
  }).session;
  session = processIncomingGpsPoint(session, {
    lat: 23.8045, // ~0.5 km
    lng: 90.4,
    timestamp: startMs + 45_000,
    accuracyM: 9,
  }).session;

  // Simulate app restart via localStorage JSON round-trip
  const restoredSession = JSON.parse(JSON.stringify(session));

  const resumed = processIncomingGpsPoint(restoredSession, {
    lat: 23.809, // another ~0.5 km
    lng: 90.4,
    timestamp: startMs + 90_000,
    accuracyM: 9,
  });

  assert.equal(resumed.accepted, true);
  const finalized = finalizeRideSession(resumed.session, bike, new Date(startMs + 90_000).toISOString());
  assert.ok(finalized.distanceKm >= 0.98 && finalized.distanceKm <= 1.02);
  assert.ok(Math.abs(finalized.odometerAfter - (8943 + finalized.distanceKm)) < 0.001);
});

test('Zero-GPS ride finalizes safely without fabricating coordinates and enforces bikeId matching', () => {
  const bike1 = makeBike(8943);
  const bike2: Bike = { ...makeBike(5000), id: 'bike_other_2', name: 'Other Bike' };
  const session = createActiveRideSession(bike1, null, '2026-11-16T08:00:00.000Z');
  const finalized = finalizeRideSession(session, bike1, '2026-11-16T08:05:00.000Z');

  assert.equal(finalized.distanceKm, 0);
  assert.equal(finalized.startLocation.label, 'GPS Unavailable');
  assert.equal(finalized.startLocation.lat, 0);

  // Applying bike1 ride to bike2 must be rejected cleanly
  const mismatch = applyCompletedRideSafely([], bike2, finalized);
  assert.equal(mismatch.saved, false);
  assert.equal(mismatch.updatedOdometer, 5000);
});
