import { useCallback, useEffect, useRef, useState } from 'react';
import { ActiveRideSession, Bike, GpsStatus, RidePoint, RideRecord } from '../types';
import {
  createActiveRideSession,
  finalizeRideSession,
  processIncomingGpsPoint,
} from '../utils/rideTracking';
import { loadActiveRideSession, saveActiveRideSession } from '../utils/storage';

interface UseRideTrackerOptions {
  activeBike: Bike | null;
  bikes?: Bike[];
  isMapTabActive: boolean;
  onRideCompleted: (ride: RideRecord) => void;
}

export function useRideTracker({
  activeBike,
  bikes = [],
  isMapTabActive,
  onRideCompleted,
}: UseRideTrackerOptions) {
  const [activeRide, setActiveRide] = useState<ActiveRideSession | null>(() => loadActiveRideSession());
  const [wasRecovered, setWasRecovered] = useState<boolean>(() => loadActiveRideSession() !== null);
  const [currentPosition, setCurrentPosition] = useState<RidePoint | null>(() => {
    const recovered = loadActiveRideSession();
    return recovered?.lastAcceptedPoint || null;
  });
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    const recovered = loadActiveRideSession();
    if (!recovered) return 0;
    return Math.max(0, Math.round((Date.now() - new Date(recovered.startTime).getTime()) / 1000));
  });
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>(() =>
    typeof navigator !== 'undefined' && 'geolocation' in navigator ? 'idle' : 'unsupported'
  );
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastSavedRide, setLastSavedRide] = useState<RideRecord | null>(null);

  const [watchRestartCount, setWatchRestartCount] = useState<number>(0);

  const activeRideRef = useRef<ActiveRideSession | null>(activeRide);
  const activeBikeRef = useRef<Bike | null>(activeBike);
  const bikesRef = useRef<Bike[]>(bikes);
  const currentPositionRef = useRef<RidePoint | null>(currentPosition);
  const lastFixAtRef = useRef<number>(Date.now());
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const finishingLockRef = useRef<boolean>(false);

  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  useEffect(() => {
    activeBikeRef.current = activeBike;
  }, [activeBike]);

  useEffect(() => {
    bikesRef.current = bikes;
  }, [bikes]);

  useEffect(() => {
    currentPositionRef.current = currentPosition;
  }, [currentPosition]);

  // Monitor internet connectivity with hysteresis so brief signal dips don't cause map flicker/re-renders
  useEffect(() => {
    let offlineTimer: number | null = null;
    let onlineTimer: number | null = null;

    const clearTimers = () => {
      if (offlineTimer !== null) {
        window.clearTimeout(offlineTimer);
        offlineTimer = null;
      }
      if (onlineTimer !== null) {
        window.clearTimeout(onlineTimer);
        onlineTimer = null;
      }
    };

    const scheduleNetworkState = (nextOnline: boolean) => {
      clearTimers();
      if (nextOnline) {
        onlineTimer = window.setTimeout(() => {
          onlineTimer = null;
          setIsOnline((prev) => (prev ? prev : true));
        }, 250);
      } else {
        offlineTimer = window.setTimeout(() => {
          offlineTimer = null;
          if (!navigator.onLine) {
            setIsOnline((prev) => (prev ? false : prev));
          }
        }, 2500);
      }
    };

    const handleOnline = () => scheduleNetworkState(true);
    const handleOffline = () => scheduleNetworkState(false);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleNetworkState(navigator.onLine);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearTimers();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Ignore wake lock release errors
      }
      wakeLockRef.current = null;
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && navigator.wakeLock) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch {
      // Best-effort only; ignore if disallowed
    }
  }, []);

  const handlePositionSuccess = useCallback((pos: GeolocationPosition) => {
    const speedKmh =
      pos.coords.speed !== null && Number.isFinite(pos.coords.speed) && pos.coords.speed >= 0
        ? pos.coords.speed * 3.6
        : undefined;

    const safeTimestamp =
      pos.timestamp && Number.isFinite(pos.timestamp) && pos.timestamp > 1_000_000_000_000
        ? pos.timestamp
        : Date.now();

    const point: RidePoint = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      timestamp: safeTimestamp,
      accuracyM: pos.coords.accuracy,
      speedKmh,
    };

    lastFixAtRef.current = Date.now();
    currentPositionRef.current = point;
    setCurrentPosition(point);
    setGpsStatus('tracking');
    setGpsError(null);

    const running = activeRideRef.current;
    if (running) {
      const processed = processIncomingGpsPoint(running, point);
      if (processed.session !== running) {
        activeRideRef.current = processed.session;
        setActiveRide(processed.session);
        saveActiveRideSession(processed.session);
      }
    }
  }, []);

  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    if (err.code === 1) {
      // PERMISSION_DENIED
      setGpsStatus('permission_denied');
      setGpsError(err.message || 'Location permission denied');
    } else if (err.code === 2) {
      // POSITION_UNAVAILABLE
      setGpsStatus(activeRideRef.current ? 'signal_lost' : 'error');
      setGpsError(err.message || 'GPS position unavailable');
    } else if (err.code === 3) {
      // TIMEOUT
      setGpsStatus(activeRideRef.current ? 'signal_lost' : 'acquiring');
      setGpsError(err.message || 'GPS request timed out');
    } else {
      setGpsStatus('error');
      setGpsError(err.message || 'Geolocation error');
    }
  }, []);

  const shouldWatchGps = activeRide !== null || isMapTabActive;

  // Battery-conscious GPS watcher: active ONLY while riding OR viewing the GPS Map panel.
  // Intentionally omits `activeRide` boolean from deps so pressing START never restarts the warm GPS watcher.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('unsupported');
      return;
    }

    if (!shouldWatchGps) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsStatus('idle');
      return;
    }

    setGpsStatus((prev) => (prev === 'tracking' ? 'tracking' : 'acquiring'));
    lastFixAtRef.current = Date.now();

    const watchId = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 30000,
      }
    );
    watchIdRef.current = watchId;

    return () => {
      navigator.geolocation.clearWatch(watchId);
      watchIdRef.current = null;
    };
  }, [shouldWatchGps, watchRestartCount, handlePositionSuccess, handlePositionError]);

  // Listen to browser geolocation permission changes (e.g. user toggles permission in Chrome site settings)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('permissions' in navigator) || !shouldWatchGps) {
      return;
    }
    let cancelled = false;
    let permStatus: PermissionStatus | null = null;
    const handlePermChange = () => {
      if (!cancelled && permStatus?.state === 'granted') {
        setGpsError(null);
        setGpsStatus('acquiring');
        setWatchRestartCount((c) => c + 1);
      }
    };
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (cancelled) return;
        permStatus = status;
        status.addEventListener('change', handlePermChange);
      })
      .catch(() => {
        // Ignore on browsers that don't support permissions.query for geolocation
      });
    return () => {
      cancelled = true;
      if (permStatus) {
        permStatus.removeEventListener('change', handlePermChange);
      }
    };
  }, [shouldWatchGps]);

  // 1-second ride clock, periodic 5-second storage checkpointing & signal-loss monitor
  useEffect(() => {
    if (!activeRide) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(activeRide.startTime).getTime();
    setElapsedSeconds(Math.max(0, Math.round((Date.now() - startMs) / 1000)));

    let tickCount = 0;
    const timer = window.setInterval(() => {
      tickCount += 1;
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - startMs) / 1000)));

      // Allow up to 45s while visible (handles red-light pauses without false alarms)
      if (document.visibilityState !== 'hidden' && Date.now() - lastFixAtRef.current > 45000) {
        setGpsStatus((prev) =>
          prev === 'permission_denied' || prev === 'error' || prev === 'unsupported'
            ? prev
            : 'signal_lost'
        );
      }

      if (tickCount % 5 === 0 && activeRideRef.current) {
        const snapshot: ActiveRideSession = {
          ...activeRideRef.current,
          lastUpdatedAt: new Date().toISOString(),
        };
        activeRideRef.current = snapshot;
        saveActiveRideSession(snapshot);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeRide?.sessionId, activeRide?.startTime]);

  // Auto-recover hardware GPS watcher if signal drops or offline cold-fix times out
  useEffect(() => {
    if (!shouldWatchGps) return;
    if (gpsStatus !== 'signal_lost' && gpsStatus !== 'error') return;

    const retryTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setWatchRestartCount((c) => c + 1);
      }
    }, 20000);

    return () => window.clearInterval(retryTimer);
  }, [shouldWatchGps, gpsStatus]);

  // Re-acquire screen wake lock and checkpoint immediately when backgrounded/closed on Android
  useEffect(() => {
    const saveCheckpointNow = () => {
      if (activeRideRef.current) {
        const snapshot: ActiveRideSession = {
          ...activeRideRef.current,
          lastUpdatedAt: new Date().toISOString(),
        };
        activeRideRef.current = snapshot;
        saveActiveRideSession(snapshot);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && activeRideRef.current) {
        requestWakeLock();
      } else if (document.visibilityState === 'hidden') {
        saveCheckpointNow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', saveCheckpointNow);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', saveCheckpointNow);
    };
  }, [requestWakeLock]);

  const startRide = useCallback(() => {
    // Guard against duplicate ride sessions
    if (activeRideRef.current) return;
    const bike = activeBikeRef.current;
    if (!bike) return;

    setLastSavedRide(null);
    setWasRecovered(false);
    finishingLockRef.current = false;

    const latestPos = currentPositionRef.current;
    const session = createActiveRideSession(bike, latestPos);
    activeRideRef.current = session;
    setActiveRide(session);
    saveActiveRideSession(session);
    requestWakeLock();

    // Only nudge getCurrentPosition & restart watch if we don't have a recent (<10s) position
    const isPosFresh = latestPos && Date.now() - latestPos.timestamp < 10000;
    if (!isPosFresh && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setGpsStatus((prev) => (prev === 'tracking' ? 'tracking' : 'acquiring'));
      setWatchRestartCount((c) => c + 1);
      navigator.geolocation.getCurrentPosition(handlePositionSuccess, handlePositionError, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 12000,
      });
    }
  }, [handlePositionError, handlePositionSuccess, requestWakeLock]);

  const stopAndSaveRide = useCallback((): RideRecord | null => {
    if (finishingLockRef.current) return null;
    const running = activeRideRef.current;
    if (!running) return null;

    const targetBike =
      bikesRef.current.find((b) => b.id === running.bikeId) || activeBikeRef.current;
    if (!targetBike) return null;

    finishingLockRef.current = true;
    const finalized = finalizeRideSession(running, targetBike);

    activeRideRef.current = null;
    setActiveRide(null);
    setWasRecovered(false);
    setElapsedSeconds(0);
    saveActiveRideSession(null);
    releaseWakeLock();

    setLastSavedRide(finalized);
    onRideCompleted(finalized);
    finishingLockRef.current = false;
    return finalized;
  }, [onRideCompleted, releaseWakeLock]);

  const resetRideTracker = useCallback(() => {
    activeRideRef.current = null;
    finishingLockRef.current = false;
    setActiveRide(null);
    setWasRecovered(false);
    setLastSavedRide(null);
    setElapsedSeconds(0);
    saveActiveRideSession(null);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const requestGpsRetry = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    setGpsStatus('acquiring');
    setGpsError(null);
    setWatchRestartCount((c) => c + 1);
    navigator.geolocation.getCurrentPosition(handlePositionSuccess, handlePositionError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    });
  }, [handlePositionError, handlePositionSuccess]);

  const clearLastSavedRide = useCallback(() => setLastSavedRide(null), []);
  const dismissRecoveredBanner = useCallback(() => setWasRecovered(false), []);

  return {
    activeRide,
    currentPosition,
    elapsedSeconds,
    gpsStatus,
    gpsError,
    isOnline,
    wasRecovered,
    lastSavedRide,
    clearLastSavedRide,
    dismissRecoveredBanner,
    startRide,
    stopAndSaveRide,
    resetRideTracker,
    requestGpsRetry,
  };
}
