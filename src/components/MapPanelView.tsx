import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  Polyline,
  ColorScheme,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  ActiveRideSession,
  Bike,
  GpsStatus,
  Language,
  NumberFormatType,
  RidePoint,
  RideRecord,
} from '../types';
import {
  formatDuration,
  formatNumber,
  formatOdometer,
  formatDate,
  formatTimeOfDay,
  translations,
} from '../utils/i18n';
import { isValidCoordinatePair, MAX_ACCEPTABLE_ACCURACY_M } from '../utils/rideTracking';
import { ConfirmDialog } from './ConfirmDialog';
import { OnlineStreetMap } from './OnlineStreetMap';
import {
  Play,
  Square,
  Crosshair,
  Navigation as NavIcon,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  Gauge,
  ExternalLink,
  Moon,
  Lock,
} from 'lucide-react';

interface MapPanelViewProps {
  bike: Bike;
  activeRide: ActiveRideSession | null;
  currentPosition: RidePoint | null;
  elapsedSeconds: number;
  gpsStatus: GpsStatus;
  gpsError: string | null;
  isOnline: boolean;
  isWakeLockActive?: boolean;
  wasRecovered: boolean;
  hasQuotaError: boolean;
  sdkLoadFailed: boolean;
  lastSavedRide: RideRecord | null;
  inspectedRide: RideRecord | null;
  onClearInspectedRide: () => void;
  onStartRide: () => void;
  onStopAndSaveRide: () => void;
  onRequestGpsRetry: () => void;
  onRequestFreshFix?: () => void;
  onReloadMaps: () => void;
  onDismissRecoveredBanner: () => void;
  onClearLastSavedRide: () => void;
  language: Language;
  numberFormat: NumberFormatType;
  darkMode: boolean;
  isTabVisible?: boolean;
}

const DEFAULT_DHAKA_CENTER = { lat: 23.8103, lng: 90.4125 };

interface MapCameraControllerProps {
  focusPoint: { lat: number; lng: number } | null;
  inspectedRide: RideRecord | null;
  autoFollow: boolean;
  recenterSignal: number;
  isTabVisible: boolean;
}

const MapCameraController: React.FC<MapCameraControllerProps> = ({
  focusPoint,
  inspectedRide,
  autoFollow,
  recenterSignal,
  isTabVisible,
}) => {
  const map = useMap();
  const coreLib = useMapsLibrary('core');
  const lastHandledRecenterRef = useRef(0);
  const lastFittedInspectedIdRef = useRef<string | null>(null);

  // Fit bounds once per inspected ride when tab is visible
  useEffect(() => {
    if (!inspectedRide) {
      lastFittedInspectedIdRef.current = null;
      return;
    }
    if (!map || !isTabVisible) return;
    if (lastFittedInspectedIdRef.current === inspectedRide.id) return;
    lastFittedInspectedIdRef.current = inspectedRide.id;

    const validPoints: { lat: number; lng: number }[] = [];
    if (isValidCoordinatePair(inspectedRide.startLocation)) {
      validPoints.push({ lat: inspectedRide.startLocation.lat, lng: inspectedRide.startLocation.lng });
    }
    inspectedRide.route.forEach((pt) => {
      if (isValidCoordinatePair(pt)) {
        validPoints.push({ lat: pt.lat, lng: pt.lng });
      }
    });
    if (isValidCoordinatePair(inspectedRide.endLocation)) {
      validPoints.push({ lat: inspectedRide.endLocation.lat, lng: inspectedRide.endLocation.lng });
    }

    if (validPoints.length === 0) return;

    const first = validPoints[0];
    const allSame = validPoints.every((p) => p.lat === first.lat && p.lng === first.lng);

    if (validPoints.length === 1 || allSame) {
      map.panTo(first);
      map.setZoom(16);
      return;
    }

    if (coreLib?.LatLngBounds) {
      const bounds = new coreLib.LatLngBounds();
      validPoints.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, 56);
      const listener = coreLib.event.addListenerOnce(map, 'idle', () => {
        const z = map.getZoom();
        if (z !== undefined && z > 17) {
          map.setZoom(17);
        }
      });
      return () => {
        coreLib.event.removeListener(listener);
      };
    } else {
      map.panTo(first);
    }
  }, [map, coreLib, inspectedRide, isTabVisible]);

  // Follow live position only when visible and autoFollow is active or recenterSignal increments
  useEffect(() => {
    if (!map || !isTabVisible || inspectedRide || !focusPoint) return;

    const recenterTriggered = recenterSignal > lastHandledRecenterRef.current;
    if (recenterTriggered) {
      lastHandledRecenterRef.current = recenterSignal;
    }

    if (autoFollow || recenterTriggered) {
      map.panTo(focusPoint);
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < 15) {
        map.setZoom(16);
      }
    }
  }, [map, focusPoint, inspectedRide, autoFollow, recenterSignal, isTabVisible]);

  return null;
};

interface GoogleMapCanvasProps {
  focusPoint: { lat: number; lng: number } | null;
  liveStartPoint: { lat: number; lng: number } | null;
  routePath: { lat: number; lng: number }[];
  inspectedRide: RideRecord | null;
  darkMode: boolean;
  autoFollow: boolean;
  recenterSignal: number;
  isTabVisible: boolean;
  gpsStatus: GpsStatus;
  onUserDragMap: () => void;
  onRecenter: () => void;
  startPointLabel: string;
  endPointLabel: string;
  gpsTrackingActiveLabel: string;
  gpsAcquiringLabel: string;
  recenterLabel: string;
}

const GoogleMapCanvas = React.memo<GoogleMapCanvasProps>(({
  focusPoint,
  liveStartPoint,
  routePath,
  inspectedRide,
  darkMode,
  autoFollow,
  recenterSignal,
  isTabVisible,
  gpsStatus,
  onUserDragMap,
  onRecenter,
  startPointLabel,
  endPointLabel,
  gpsTrackingActiveLabel,
  gpsAcquiringLabel,
  recenterLabel,
}) => {
  const initialCenterRef = useRef<{ lat: number; lng: number }>(focusPoint || DEFAULT_DHAKA_CENTER);

  return (
    <div className="h-[50vh] min-h-[340px] md:h-[58vh] w-full relative">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        reuseMaps
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        colorScheme={darkMode ? ColorScheme.DARK : ColorScheme.LIGHT}
        defaultCenter={initialCenterRef.current}
        defaultZoom={15}
        gestureHandling="greedy"
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
        onDragstart={onUserDragMap}
        className="w-full h-full"
      >
        <MapCameraController
          focusPoint={focusPoint}
          inspectedRide={inspectedRide}
          autoFollow={autoFollow}
          recenterSignal={recenterSignal}
          isTabVisible={isTabVisible}
        />

        {routePath.length >= 2 && (
          <Polyline
            path={routePath}
            strokeColor={inspectedRide ? '#2563EB' : '#65A30D'}
            strokeOpacity={0.95}
            strokeWeight={5}
            geodesic
          />
        )}

        {liveStartPoint && (
          <AdvancedMarker
            position={{ lat: liveStartPoint.lat, lng: liveStartPoint.lng }}
            title={startPointLabel}
          >
            <Pin
              background="#16A34A"
              borderColor="#14532D"
              glyphColor="#FFFFFF"
              scale={0.9}
            />
          </AdvancedMarker>
        )}

        {focusPoint && (
          <AdvancedMarker
            position={focusPoint}
            title={inspectedRide ? endPointLabel : gpsTrackingActiveLabel}
          >
            {inspectedRide ? (
              <Pin
                background="#DC2626"
                borderColor="#7F1D1D"
                glyphColor="#FFFFFF"
                scale={0.95}
              />
            ) : (
              <div className="relative flex items-center justify-center">
                <span className="absolute w-9 h-9 rounded-full bg-[#9AE62E]/45 animate-ping" />
                <div className="w-6 h-6 rounded-full bg-[#141912] border-[3px] border-[#9AE62E] shadow-lg flex items-center justify-center">
                  <NavIcon className="w-3 h-3 text-[#9AE62E]" />
                </div>
              </div>
            )}
          </AdvancedMarker>
        )}
      </GoogleMap>

      {!inspectedRide && !focusPoint && gpsStatus === 'acquiring' && (
        <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#171C18]/95 border border-black/10 dark:border-white/10 shadow-md text-[11px] font-bold text-[#141912] dark:text-white">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>{gpsAcquiringLabel}</span>
        </div>
      )}

      {!inspectedRide && (
        <button
          type="button"
          onClick={onRecenter}
          title={recenterLabel}
          aria-label={recenterLabel}
          className={`absolute right-3 bottom-3 z-10 w-11 h-11 rounded-full shadow-md border flex items-center justify-center transition active:scale-95 ${
            autoFollow
              ? 'bg-[#9AE62E] text-[#141912] border-[#8CD825]'
              : 'bg-white dark:bg-[#171C18] text-[#141912] dark:text-white border-black/10 dark:border-white/10'
          }`}
        >
          <Crosshair className="w-5 h-5" />
        </button>
      )}
    </div>
  );
});

interface OfflineRouteCanvasProps {
  routePath: { lat: number; lng: number }[];
  focusPoint: { lat: number; lng: number } | null;
  liveStartPoint: { lat: number; lng: number } | null;
  isInspecting: boolean;
  isRideActive: boolean;
  isOnline: boolean;
  sdkLoadFailed: boolean;
  gpsStatus: GpsStatus;
  accuracyM?: number;
  onRequestGpsRetry: () => void;
  onReloadMaps: () => void;
  language: Language;
  numberFormat: NumberFormatType;
  gpsAcquiringLabel: string;
  offlineTrackingLabel: string;
  gpsPointsLabel: string;
  recenterLabel: string;
}

const OfflineRouteCanvas: React.FC<OfflineRouteCanvasProps> = React.memo(({
  routePath,
  focusPoint,
  liveStartPoint,
  isInspecting,
  isRideActive,
  isOnline,
  sdkLoadFailed,
  gpsStatus,
  accuracyM,
  onRequestGpsRetry,
  onReloadMaps,
  language,
  numberFormat,
  gpsAcquiringLabel,
  offlineTrackingLabel,
  gpsPointsLabel,
  recenterLabel,
}) => {
  const projected = useMemo(() => {
    const allPts: { lat: number; lng: number }[] = [...routePath];
    if (liveStartPoint) allPts.push(liveStartPoint);
    if (focusPoint) allPts.push(focusPoint);
    if (allPts.length === 0) return null;

    const lats = allPts.map((p) => p.lat);
    const lngs = allPts.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const midLat = (minLat + maxLat) / 2;
    const cosLat = Math.max(0.2, Math.cos((midLat * Math.PI) / 180));
    const spanLat = Math.max(0.0005, maxLat - minLat);
    const spanLng = Math.max(0.0005, (maxLng - minLng) * cosLat);
    const span = Math.max(spanLat, spanLng);

    const width = 360;
    const height = 240;
    const padX = 48;
    const padY = 44;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;
    const scale = Math.min(usableW, usableH) / span;

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const project = (pt: { lat: number; lng: number }) => ({
      x: width / 2 + (pt.lng - centerLng) * cosLat * scale,
      y: height / 2 - (pt.lat - centerLat) * scale,
    });

    return {
      polyPoints: routePath.map((p) => {
        const xy = project(p);
        return `${xy.x.toFixed(1)},${xy.y.toFixed(1)}`;
      }).join(' '),
      startXY: liveStartPoint ? project(liveStartPoint) : routePath[0] ? project(routePath[0]) : null,
      focusXY: focusPoint ? project(focusPoint) : null,
    };
  }, [routePath, liveStartPoint, focusPoint]);

  const isWeakFix = accuracyM !== undefined && Number.isFinite(accuracyM) && accuracyM > MAX_ACCEPTABLE_ACCURACY_M;
  const strokeColor = isInspecting ? '#3B82F6' : '#84CC16';

  return (
    <div className="relative h-[44vh] min-h-[300px] w-full overflow-hidden bg-gradient-to-br from-[#F3F7EC] via-[#EDF3E4] to-[#E4ECD6] dark:from-[#101611] dark:via-[#141D15] dark:to-[#19241A]">
      {/* Vector Tactical Grid + Offline Route Plotter */}
      <svg
        viewBox="0 0 360 240"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        aria-label="Offline GPS route canvas"
      >
        <defs>
          <pattern id="offlineGpsGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path
              d="M 30 0 L 0 0 0 30"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              className="text-black/[0.06] dark:text-[#9AE62E]/[0.08]"
            />
          </pattern>
        </defs>
        <rect width="360" height="240" fill="url(#offlineGpsGrid)" />

        {/* Radar Rings centered around focus point when waiting or idle at 1 point */}
        {routePath.length < 2 && (
          <g transform={`translate(${projected?.focusXY?.x ?? 180}, ${projected?.focusXY?.y ?? 120})`}>
            <circle
              r="72"
              fill="none"
              stroke="currentColor"
              strokeDasharray="4 4"
              strokeWidth="1"
              className="text-[#65A30D]/25 dark:text-[#9AE62E]/20"
            />
            <circle
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              className="text-[#65A30D]/35 dark:text-[#9AE62E]/30"
            />
            <line
              x1="-84"
              y1="0"
              x2="84"
              y2="0"
              stroke="currentColor"
              strokeWidth="0.7"
              className="text-[#65A30D]/20 dark:text-[#9AE62E]/15"
            />
            <line
              x1="0"
              y1="-84"
              x2="0"
              y2="84"
              stroke="currentColor"
              strokeWidth="0.7"
              className="text-[#65A30D]/20 dark:text-[#9AE62E]/15"
            />
          </g>
        )}

        {/* Route Polyline */}
        {routePath.length >= 2 && projected?.polyPoints && (
          <>
            <polyline
              points={projected.polyPoints}
              fill="none"
              stroke={strokeColor}
              strokeOpacity={0.25}
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={projected.polyPoints}
              fill="none"
              stroke={strokeColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Start Marker */}
        {projected?.startXY && (routePath.length >= 2 || isInspecting) && (
          <g transform={`translate(${projected.startXY.x}, ${projected.startXY.y})`}>
            <circle r="7" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
          </g>
        )}

        {/* Live Rider Position / End Pin */}
        {projected?.focusXY && (
          <g transform={`translate(${projected.focusXY.x}, ${projected.focusXY.y})`}>
            {!isInspecting && (
              <circle r="15" fill="#9AE62E" fillOpacity="0.32" className="animate-ping" />
            )}
            <circle
              r="7.5"
              fill={isInspecting ? '#DC2626' : '#141912'}
              stroke={isInspecting ? '#FFFFFF' : '#9AE62E'}
              strokeWidth="3"
            />
          </g>
        )}
      </svg>

      {/* Top Overlay Badge: Offline Mode OR Online Map Reload + Live Accuracy */}
      <div className="absolute left-3 top-3 right-3 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#171C18]/90 backdrop-blur-sm border border-black/[0.06] dark:border-white/[0.08] shadow-xs text-[11px] font-bold text-[#141912] dark:text-white pointer-events-none">
          {!isOnline ? (
            <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          ) : (
            <NavIcon className="w-3.5 h-3.5 text-[#65A30D] shrink-0" />
          )}
          <span>
            {!isOnline
              ? language === 'bn'
                ? 'অফলাইন GPS ট্র্যাকার'
                : 'Offline GPS Tracker'
              : language === 'bn'
              ? 'GPS ট্র্যাকিং চালু'
              : 'GPS Tracker Active'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isOnline && sdkLoadFailed && (
            <button
              type="button"
              onClick={onReloadMaps}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#9AE62E] hover:bg-[#8CD825] text-[#141912] text-[11px] font-extrabold shadow-xs active:scale-95 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{language === 'bn' ? 'ম্যাপ লোড করুন' : 'Reload Map'}</span>
            </button>
          )}
          {accuracyM !== undefined && Number.isFinite(accuracyM) && (
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-sm text-[11px] font-bold tabular-nums shadow-xs pointer-events-none ${
                isWeakFix
                  ? 'bg-amber-100/95 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 border border-amber-300/60'
                  : 'bg-white/90 dark:bg-[#171C18]/90 text-[#5C9E00] dark:text-[#A3EC38] border border-black/[0.06] dark:border-white/[0.08]'
              }`}
            >
              <span>±{formatNumber(Math.round(accuracyM), language, numberFormat)} m</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Telemetry Strip inside Canvas */}
      <div className="absolute left-3 right-3 bottom-3 flex items-end justify-between gap-2">
        <div className="px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-[#171C18]/90 backdrop-blur-sm border border-black/[0.06] dark:border-white/[0.08] shadow-xs min-w-0">
          <p className="text-[11px] font-bold text-[#141912] dark:text-white tabular-nums truncate">
            {focusPoint
              ? `${focusPoint.lat.toFixed(5)}, ${focusPoint.lng.toFixed(5)}`
              : gpsAcquiringLabel}
          </p>
          <p className="text-[10px] text-[#6F766C] dark:text-slate-400 mt-0.5 truncate">
            {isRideActive || isInspecting
              ? `${gpsPointsLabel}: ${formatNumber(routePath.length, language, numberFormat)}`
              : !isOnline
              ? gpsStatus === 'tracking'
                ? offlineTrackingLabel
                : gpsAcquiringLabel
              : sdkLoadFailed
              ? language === 'bn'
                ? 'Google Maps লোড হয়নি — "ম্যাপ লোড করুন" এ ট্যাপ করুন'
                : 'Google Maps failed to load — tap Reload Map'
              : gpsStatus === 'tracking'
              ? language === 'bn'
                ? 'GPS লোকেশন প্রস্তুত'
                : 'GPS Location Ready'
              : gpsAcquiringLabel}
          </p>
        </div>

        {!isInspecting && (
          <button
            type="button"
            onClick={onRequestGpsRetry}
            title={recenterLabel}
            aria-label={recenterLabel}
            className="w-11 h-11 rounded-full bg-white dark:bg-[#171C18] text-[#141912] dark:text-white border border-black/10 dark:border-white/10 shadow-md flex items-center justify-center active:scale-95 transition shrink-0"
          >
            <Crosshair className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
});

export const MapPanelView: React.FC<MapPanelViewProps> = ({
  bike,
  activeRide,
  currentPosition,
  elapsedSeconds,
  gpsStatus,
  gpsError,
  isOnline,
  isWakeLockActive = false,
  wasRecovered,
  hasQuotaError,
  sdkLoadFailed,
  lastSavedRide,
  inspectedRide,
  onClearInspectedRide,
  onStartRide,
  onStopAndSaveRide,
  onRequestGpsRetry,
  onRequestFreshFix,
  onReloadMaps,
  onDismissRecoveredBanner,
  onClearLastSavedRide,
  language,
  numberFormat,
  darkMode,
  isTabVisible = true,
}) => {
  const t = translations[language];
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

  const [autoFollow, setAutoFollow] = useState(true);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [isStopConfirmOpen, setIsStopConfirmOpen] = useState(false);
  const [isPocketMode, setIsPocketMode] = useState(false);
  const [unlockProgress, setUnlockProgress] = useState(0);
  const unlockTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activeRide) {
      setIsPocketMode(false);
      setUnlockProgress(0);
    }
  }, [activeRide]);

  const stopUnlockHold = useCallback(() => {
    if (unlockTimerRef.current !== null) {
      window.clearInterval(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }
    setUnlockProgress(0);
  }, []);

  const startUnlockHold = useCallback(() => {
    stopUnlockHold();
    const startAt = Date.now();
    const holdMs = 1100;
    unlockTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startAt;
      const pct = Math.min(100, Math.round((elapsed / holdMs) * 100));
      setUnlockProgress(pct);
      if (pct >= 100) {
        stopUnlockHold();
        setIsPocketMode(false);
      }
    }, 30);
  }, [stopUnlockHold]);

  useEffect(() => {
    return () => stopUnlockHold();
  }, [stopUnlockHold]);

  const canRenderGoogleMaps = Boolean(apiKey) && isOnline && !hasQuotaError && !sdkLoadFailed;
  const showStreetMap = !canRenderGoogleMaps && isOnline;
  const showOfflineCanvas = !canRenderGoogleMaps && !isOnline;

  // Preserve map instances across transient offline dips so zoom/pan/tiles stay intact
  const [hasMountedGoogleMap, setHasMountedGoogleMap] = useState(canRenderGoogleMaps);
  const [hasMountedStreetMap, setHasMountedStreetMap] = useState(showStreetMap);

  useEffect(() => {
    if (canRenderGoogleMaps) {
      setHasMountedGoogleMap(true);
      setHasMountedStreetMap(false);
    } else if (showStreetMap) {
      setHasMountedStreetMap(true);
    }
  }, [canRenderGoogleMaps, showStreetMap]);

  const rawFocusCoords = useMemo(() => {
    if (inspectedRide) {
      if (isValidCoordinatePair(inspectedRide.endLocation)) {
        return inspectedRide.endLocation;
      }
      const validPts = inspectedRide.route.filter(isValidCoordinatePair);
      if (validPts.length > 0) {
        return validPts[validPts.length - 1];
      }
      return null;
    }
    if (currentPosition && isValidCoordinatePair(currentPosition)) {
      return currentPosition;
    }
    if (activeRide?.lastAcceptedPoint && isValidCoordinatePair(activeRide.lastAcceptedPoint)) {
      return activeRide.lastAcceptedPoint;
    }
    return null;
  }, [inspectedRide, currentPosition, activeRide]);

  const focusLat = rawFocusCoords ? rawFocusCoords.lat : null;
  const focusLng = rawFocusCoords ? rawFocusCoords.lng : null;

  const focusPoint = useMemo(() => {
    if (focusLat === null || focusLng === null) return null;
    return { lat: focusLat, lng: focusLng };
  }, [focusLat, focusLng]);

  const rawRoute = inspectedRide ? inspectedRide.route : activeRide ? activeRide.route : null;
  const routePath = useMemo(() => {
    if (!rawRoute) return [];
    return rawRoute.filter(isValidCoordinatePair).map((p) => ({ lat: p.lat, lng: p.lng }));
  }, [rawRoute]);

  const rawStartCoords = useMemo(() => {
    if (inspectedRide && isValidCoordinatePair(inspectedRide.startLocation)) {
      return inspectedRide.startLocation;
    }
    if (activeRide?.startLocation && isValidCoordinatePair(activeRide.startLocation)) {
      return activeRide.startLocation;
    }
    return null;
  }, [inspectedRide, activeRide]);

  const startLat = rawStartCoords ? rawStartCoords.lat : null;
  const startLng = rawStartCoords ? rawStartCoords.lng : null;

  const liveStartPoint = useMemo(() => {
    if (startLat === null || startLng === null) return null;
    return { lat: startLat, lng: startLng };
  }, [startLat, startLng]);

  const liveAvgSpeedKmh = useMemo(() => {
    if (!activeRide || elapsedSeconds <= 0 || activeRide.distanceKm <= 0) return 0;
    return Math.min(180, activeRide.distanceKm / (elapsedSeconds / 3600));
  }, [activeRide, elapsedSeconds]);

  const hasCurrentPositionRef = useRef(Boolean(currentPosition));
  hasCurrentPositionRef.current = Boolean(currentPosition);

  const handleUserDragMap = useCallback(() => {
    setAutoFollow(false);
  }, []);

  const handleRecenter = useCallback(() => {
    setAutoFollow(true);
    setRecenterSignal((s) => s + 1);
    if (!hasCurrentPositionRef.current) {
      onRequestGpsRetry();
    }
  }, [onRequestGpsRetry]);

  const isPermissionsPolicyBlocked = Boolean(
    gpsError && /permissions?\s*policy|feature\s*policy|disallowed\s*by\s*policy/i.test(gpsError)
  );
  const currentAppUrl = typeof window !== 'undefined' ? window.location.href : '/';

  return (
    <div className="space-y-3.5 pb-6 pt-1 animate-fadeIn">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <h1 className="text-lg font-extrabold text-[#141912] dark:text-white tracking-tight">
            {inspectedRide ? t.inspectingSavedRoute : t.gpsMapTitle}
          </h1>
          <p className="text-xs text-[#6F766C] dark:text-slate-400">
            {inspectedRide
              ? `${formatDate(inspectedRide.date, language)} · ${formatTimeOfDay(
                  inspectedRide.startTime,
                  language,
                  numberFormat
                )}`
              : `${t.currentOdo}: ${formatOdometer(bike.currentOdometer, language, numberFormat)} ${t.km}`}
          </p>
        </div>

        {inspectedRide ? (
          <button
            type="button"
            onClick={onClearInspectedRide}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-full bg-white dark:bg-[#171C18] border border-black/[0.06] dark:border-white/[0.08] text-xs font-bold text-[#141912] dark:text-white shadow-xs active:scale-95 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.backToLive}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#171C18] border border-black/[0.05] dark:border-white/[0.08] shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                gpsStatus === 'tracking'
                  ? 'bg-[#65A30D] animate-pulse'
                  : gpsStatus === 'signal_lost' || gpsStatus === 'acquiring'
                  ? 'bg-amber-500 animate-pulse'
                  : gpsStatus === 'permission_denied' || gpsStatus === 'error' || gpsStatus === 'unsupported'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-[11px] font-bold text-[#141912] dark:text-slate-200">
              {gpsStatus === 'tracking'
                ? 'GPS OK'
                : gpsStatus === 'acquiring'
                ? language === 'bn'
                  ? 'সিগন্যাল...'
                  : 'Fixing...'
                : gpsStatus === 'signal_lost'
                ? language === 'bn'
                  ? 'সিগন্যাল কম'
                  : 'Weak GPS'
                : gpsStatus === 'permission_denied'
                ? language === 'bn'
                  ? 'অনুমতি নেই'
                  : 'Denied'
                : gpsStatus === 'error' || gpsStatus === 'unsupported'
                ? language === 'bn'
                  ? 'ত্রুটি'
                  : 'GPS Err'
                : 'GPS'}
            </span>
          </div>
        )}
      </div>

      {/* Status & Recovery Alerts */}
      {wasRecovered && activeRide && (
        <div className="rounded-[20px] bg-[#EEF9DA] dark:bg-[#1E2B14] border border-[#9AE62E]/40 px-4 py-3 flex items-center justify-between gap-3 text-xs font-semibold text-[#2E3A1F] dark:text-[#ECFACB]">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-[#5C9E00] dark:text-[#A3EC38] shrink-0" />
            <span>{t.rideRecoveredBanner}</span>
          </div>
          <button
            type="button"
            onClick={onDismissRecoveredBanner}
            className="text-[11px] font-bold underline shrink-0"
          >
            OK
          </button>
        </div>
      )}

      {lastSavedRide && !activeRide && !inspectedRide && (
        <div className="rounded-[22px] bg-[#D7F49A] dark:bg-[#1E2B14] border border-[#9AE62E]/50 p-3.5 flex items-center justify-between gap-3 text-[#141912] dark:text-[#ECFACB] shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-[#4D8000] dark:text-[#A3EC38] shrink-0" />
            <div className="min-w-0 text-xs">
              <p className="font-extrabold">{t.rideSavedBanner}</p>
              <p className="mt-0.5 text-[11px] text-[#3C4B28] dark:text-[#CBE795] tabular-nums">
                +{formatOdometer(lastSavedRide.distanceKm, language, numberFormat)} {t.km} ·{' '}
                {t.currentOdo}: {formatOdometer(lastSavedRide.odometerAfter, language, numberFormat)}{' '}
                {t.km}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearLastSavedRide}
            className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/70 dark:bg-white/10 shrink-0"
          >
            OK
          </button>
        </div>
      )}

      {gpsStatus === 'permission_denied' && (
        <div className="rounded-[20px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 px-4 py-3 text-xs text-rose-700 dark:text-rose-300 space-y-2.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-snug">
                {isPermissionsPolicyBlocked
                  ? language === 'bn'
                    ? 'প্রিভিউ ফ্রেম থেকে GPS অনুমতি বন্ধ রয়েছে'
                    : 'GPS is blocked inside the Preview frame'
                  : t.gpsPermissionDenied}
              </p>
              <p className="text-[11px] opacity-90 mt-1 leading-relaxed break-words">
                {isPermissionsPolicyBlocked
                  ? language === 'bn'
                    ? 'লাইভ GPS ম্যাপ ও রাইড ট্র্যাকিং চালাতে নিচের "ব্রাউজারে খুলুন" বাটনে ট্যাপ করে অ্যাপটি নতুন ট্যাবে (অথবা ফোনে Install করে) ওপেন করুন।'
                    : 'Your browser blocked GPS inside this embedded preview iframe. Tap "Open App Tab" below to launch in a standalone browser tab where GPS works normally.'
                  : gpsError || ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isPermissionsPolicyBlocked && (
              <a
                href={currentAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[36px] rounded-full bg-[#141912] dark:bg-[#9AE62E] text-white dark:text-[#141912] font-extrabold text-[11px] shadow-xs active:scale-95 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ব্রাউজারে খুলুন' : 'Open App Tab'}</span>
              </a>
            )}
            <button
              type="button"
              onClick={onRequestGpsRetry}
              className="inline-flex items-center gap-1 px-3.5 py-2 min-h-[36px] rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shrink-0 active:scale-95 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{language === 'bn' ? 'আবার চেষ্টা' : 'Retry'}</span>
            </button>
          </div>
        </div>
      )}

      {(gpsStatus === 'error' || gpsStatus === 'unsupported') && (
        <div className="rounded-[20px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-4 py-3 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <span>{gpsStatus === 'unsupported' ? t.gpsUnsupported : t.gpsSignalLost}</span>
              {gpsError && <span className="block text-[10px] opacity-80 mt-0.5 truncate">{gpsError}</span>}
            </div>
          </div>
          {gpsStatus === 'error' && (
            <button
              type="button"
              onClick={onRequestGpsRetry}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-600 text-white font-bold text-[11px] shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{language === 'bn' ? 'আবার চেষ্টা' : 'Retry'}</span>
            </button>
          )}
        </div>
      )}

      {gpsStatus === 'signal_lost' && activeRide && (
        <div className="rounded-[20px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t.gpsSignalLost}</span>
        </div>
      )}

      {!isOnline && (
        <div className="rounded-[20px] bg-slate-100 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] px-4 py-2.5 flex items-center gap-2 text-xs text-[#4C5548] dark:text-slate-300">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>{t.offlineTrackingNotice}</span>
        </div>
      )}

      {/* Map Viewport Container (Explicit non-zero height CF2) */}
      <div className="relative rounded-[26px] overflow-hidden bg-white dark:bg-[#171C18] border border-black/[0.05] dark:border-white/[0.08] shadow-[0_4px_18px_rgba(15,23,42,0.06)]">
        {hasMountedGoogleMap && (
          <div className={canRenderGoogleMaps ? 'block' : 'hidden'}>
            <GoogleMapCanvas
              focusPoint={focusPoint}
              liveStartPoint={liveStartPoint}
              routePath={routePath}
              inspectedRide={inspectedRide}
              darkMode={darkMode}
              autoFollow={autoFollow}
              recenterSignal={recenterSignal}
              isTabVisible={isTabVisible && canRenderGoogleMaps}
              gpsStatus={gpsStatus}
              onUserDragMap={handleUserDragMap}
              onRecenter={handleRecenter}
              startPointLabel={t.startPoint}
              endPointLabel={t.endPoint}
              gpsTrackingActiveLabel={t.gpsTrackingActive}
              gpsAcquiringLabel={t.gpsAcquiring}
              recenterLabel={t.recenterMap}
            />
          </div>
        )}

        {hasMountedStreetMap && (
          <div className={showStreetMap ? 'block' : 'hidden'}>
            <OnlineStreetMap
              focusPoint={focusPoint}
              liveStartPoint={liveStartPoint}
              routePath={routePath}
              inspectedRide={inspectedRide}
              darkMode={darkMode}
              autoFollow={autoFollow}
              recenterSignal={recenterSignal}
              isTabVisible={isTabVisible && showStreetMap}
              onUserDragMap={handleUserDragMap}
              onRecenter={handleRecenter}
              gpsStatus={gpsStatus}
              gpsAcquiringLabel={t.gpsAcquiring}
              recenterLabel={t.recenterMap}
              sdkLoadFailed={sdkLoadFailed}
              onReloadMaps={onReloadMaps}
              language={language}
            />
          </div>
        )}

        {showOfflineCanvas && (
          <OfflineRouteCanvas
            routePath={routePath}
            focusPoint={focusPoint}
            liveStartPoint={liveStartPoint}
            isInspecting={Boolean(inspectedRide)}
            isRideActive={Boolean(activeRide)}
            isOnline={isOnline}
            sdkLoadFailed={sdkLoadFailed}
            gpsStatus={gpsStatus}
            accuracyM={currentPosition?.accuracyM}
            onRequestGpsRetry={onRequestGpsRetry}
            onReloadMaps={onReloadMaps}
            language={language}
            numberFormat={numberFormat}
            gpsAcquiringLabel={t.gpsAcquiring}
            offlineTrackingLabel={t.offlineTrackingNotice}
            gpsPointsLabel={t.gpsPoints}
            recenterLabel={t.recenterMap}
          />
        )}
      </div>

      {/* Inspected Historical Ride Details OR Live Ride Telemetry + START/STOP */}
      {inspectedRide ? (
        <div className="bg-white dark:bg-[#171C18] rounded-[24px] p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-xs space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-[#F6F7F4] dark:bg-white/[0.04] rounded-2xl p-3">
              <span className="text-[11px] font-medium text-[#6F766C] dark:text-slate-400">
                {t.liveDistance}
              </span>
              <p className="text-lg font-extrabold tabular-nums text-[#141912] dark:text-white mt-0.5">
                {formatOdometer(inspectedRide.distanceKm, language, numberFormat)} {t.km}
              </p>
            </div>
            <div className="bg-[#F6F7F4] dark:bg-white/[0.04] rounded-2xl p-3">
              <span className="text-[11px] font-medium text-[#6F766C] dark:text-slate-400">
                {t.rideDuration}
              </span>
              <p className="text-lg font-extrabold tabular-nums text-[#141912] dark:text-white mt-0.5">
                {formatDuration(inspectedRide.durationSec, language, numberFormat)}
              </p>
            </div>
            <div className="bg-[#F6F7F4] dark:bg-white/[0.04] rounded-2xl p-3">
              <span className="text-[11px] font-medium text-[#6F766C] dark:text-slate-400">
                {t.avgSpeed}
              </span>
              <p className="text-lg font-extrabold tabular-nums text-[#141912] dark:text-white mt-0.5">
                {formatNumber(inspectedRide.avgSpeedKmh, language, numberFormat, 1)} {t.kmh}
              </p>
            </div>
            <div className="bg-[#F6F7F4] dark:bg-white/[0.04] rounded-2xl p-3">
              <span className="text-[11px] font-medium text-[#6F766C] dark:text-slate-400">
                {t.maxSpeed}
              </span>
              <p className="text-lg font-extrabold tabular-nums text-[#141912] dark:text-white mt-0.5">
                {formatNumber(inspectedRide.maxSpeedKmh, language, numberFormat, 1)} {t.kmh}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#6F766C] dark:text-slate-400 pt-1">
            <span>
              {t.odometerChange}:{' '}
              <strong className="text-[#141912] dark:text-white tabular-nums">
                {formatOdometer(inspectedRide.odometerBefore, language, numberFormat)} →{' '}
                {formatOdometer(inspectedRide.odometerAfter, language, numberFormat)} {t.km}
              </strong>
            </span>
            <span className="tabular-nums">
              {inspectedRide.route.length} pts
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#171C18] rounded-[26px] p-4 border border-black/[0.04] dark:border-white/[0.06] shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-4">
          {activeRide ? (
            <>
              {/* Active Ride Live Metrics */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-[#EEF9DA] dark:bg-[#1E2B14] rounded-2xl p-3">
                  <span className="text-[11px] font-semibold text-[#3C4B28] dark:text-[#CBE795]">
                    {t.liveDistance}
                  </span>
                  <p className="text-xl font-extrabold tabular-nums text-[#141912] dark:text-white mt-0.5">
                    {formatOdometer(activeRide.distanceKm, language, numberFormat)}
                    <span className="text-xs font-bold ml-1">{t.km}</span>
                  </p>
                </div>

                <div className="bg-[#F6F7F4] dark:bg-white/[0.05] rounded-2xl p-3">
                  <span className="text-[11px] font-semibold text-[#6F766C] dark:text-slate-400">
                    {t.rideDuration}
                  </span>
                  <p className="text-xl font-extrabold tabular-nums text-[#141912] dark:text-white mt-0.5">
                    {formatDuration(elapsedSeconds, language, numberFormat)}
                  </p>
                </div>

                <div className="bg-[#F6F7F4] dark:bg-white/[0.05] rounded-2xl p-3">
                  <span className="text-[11px] font-semibold text-[#6F766C] dark:text-slate-400">
                    {t.currentSpeed}
                  </span>
                  <p className="text-xl font-extrabold tabular-nums text-[#141912] dark:text-white mt-0.5">
                    {formatNumber(activeRide.currentSpeedKmh, language, numberFormat, 0)}
                    <span className="text-[11px] font-semibold ml-1">{t.kmh}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6F766C] dark:text-slate-400 px-1">
                <span>
                  {t.avgSpeed}:{' '}
                  <strong className="text-[#141912] dark:text-white tabular-nums">
                    {formatNumber(liveAvgSpeedKmh, language, numberFormat, 1)} {t.kmh}
                  </strong>
                </span>
                <span>
                  {t.odometer}:{' '}
                  <strong className="text-[#5C9E00] dark:text-[#A3EC38] tabular-nums">
                    {formatOdometer(
                      bike.currentOdometer + activeRide.distanceKm,
                      language,
                      numberFormat
                    )}{' '}
                    {t.km}
                  </strong>
                </span>
              </div>

              {/* Android Screen-On / Waypoint Counter Notice */}
              <div className="rounded-2xl bg-[#F6F7F4] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.07] px-3 py-2 flex items-start justify-between gap-2 text-[11px] text-[#4C5548] dark:text-slate-300">
                <span className="leading-snug">
                  {language === 'bn'
                    ? 'পকেটে রাখতে নিচের পকেট মোড অন করুন (পাওয়ার বাটন দিয়ে লক করলে ব্রাউজার GPS বন্ধ হয়)।'
                    : 'Use Pocket Mode below before putting phone in pocket (Power-button lock pauses browser GPS).'}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-[#141912] dark:text-white">
                  {formatNumber(activeRide.route.length, language, numberFormat)} pts
                  {isWakeLockActive ? ' · ON' : ''}
                </span>
              </div>

              {/* Pocket Mode + STOP Actions */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setIsPocketMode(true)}
                  className="w-full min-h-[46px] rounded-full bg-[#141912] dark:bg-white/[0.08] hover:opacity-95 active:scale-[0.98] text-white font-bold text-xs border border-black/10 dark:border-white/10 flex items-center justify-center gap-2 transition"
                >
                  <Moon className="w-4 h-4 text-[#9AE62E]" />
                  <span>
                    {language === 'bn'
                      ? 'পকেট মোড চালু করুন (কালো স্ক্রিন ও টাচ লক)'
                      : 'Pocket Mode (Black Screen & Touch Lock)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onRequestFreshFix?.();
                    setIsStopConfirmOpen(true);
                  }}
                  className="w-full min-h-[54px] rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-extrabold text-base shadow-[0_6px_18px_rgba(225,29,72,0.28)] flex items-center justify-center gap-2.5 transition"
                >
                  <Square className="w-5 h-5 fill-current" />
                  <span>{t.stopRideLabel}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-[#5C9E00] dark:text-[#A3EC38]" />
                  <span className="text-xs font-semibold text-[#6F766C] dark:text-slate-400">
                    {t.currentOdo}
                  </span>
                </div>
                <span className="text-base font-extrabold tabular-nums text-[#141912] dark:text-white">
                  {formatOdometer(bike.currentOdometer, language, numberFormat)} {t.km}
                </span>
              </div>

              {/* Single Main START Button */}
              <button
                type="button"
                onClick={onStartRide}
                className="w-full min-h-[56px] rounded-full bg-[#9AE62E] hover:bg-[#8CD825] active:scale-[0.98] text-[#141912] font-extrabold text-base shadow-[0_8px_22px_rgba(140,216,37,0.38)] flex items-center justify-center gap-2.5 transition"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {t.startRideBtn} — {t.startRideLabel}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirm Before Stopping Ride */}
      <ConfirmDialog
        isOpen={isStopConfirmOpen}
        onClose={() => setIsStopConfirmOpen(false)}
        onConfirm={onStopAndSaveRide}
        title={t.stopRideConfirmTitle}
        message={`${t.stopRideConfirmMsg} (${
          activeRide ? formatOdometer(activeRide.distanceKm, language, numberFormat) : '0'
        } ${t.km})${
          activeRide && activeRide.route.length <= 3 && elapsedSeconds >= 60
            ? language === 'bn'
              ? ` — সতর্কতা: মাত্র ${formatNumber(activeRide.route.length, language, numberFormat)}টি GPS পয়েন্ট পাওয়া গেছে (স্ক্রিন বন্ধ ছিল সম্ভবত)। সেভ করার পর হোমে "Update Odo" দিয়ে বাইকের আসল মিটার মিলিয়ে নিতে পারবেন।`
              : ` — Note: Only ${activeRide.route.length} GPS points recorded (screen may have been locked). You can match your bike's exact meter afterwards using Update Odo on Home.`
            : ''
        }`}
        confirmText={t.confirmStopSave}
        cancelText={t.keepRiding}
        isDestructive={false}
      />

      {/* AMOLED Black Pocket Mode Overlay (Keeps browser foreground GPS running with near-zero OLED battery & touch lock) */}
      {isPocketMode && activeRide && (
        <div
          className="fixed inset-0 z-[100] bg-black text-white select-none touch-none flex flex-col items-center justify-between px-6 py-12"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold text-white/40">
            <span
              className={`w-2 h-2 rounded-full ${
                gpsStatus === 'tracking' ? 'bg-[#9AE62E]/70 animate-pulse' : 'bg-amber-500/70'
              }`}
            />
            <span className="tabular-nums">
              {formatNumber(activeRide.route.length, language, numberFormat)} GPS pts
              {isWakeLockActive ? ' · Screen Stay-Awake' : ''}
            </span>
          </div>

          <div className="text-center space-y-3 max-w-xs">
            <p className="text-4xl font-extrabold tabular-nums text-white/35">
              {formatOdometer(activeRide.distanceKm, language, numberFormat)}{' '}
              <span className="text-lg font-bold">{t.km}</span>
            </p>
            <p className="text-lg font-bold tabular-nums text-white/30">
              {formatDuration(elapsedSeconds, language, numberFormat)}
            </p>
            <p className="text-xs text-white/30 leading-relaxed pt-3">
              {language === 'bn'
                ? 'পাওয়ার বাটন না চেপে ফোন পকেটে রাখুন — কালো স্ক্রিনে ব্যাটারি সাশ্রয় হয় এবং লাইভ GPS চলতে থাকে।'
                : 'Slide phone into pocket without pressing the Power button — black screen saves battery while live GPS keeps tracking.'}
            </p>
          </div>

          <div className="w-full max-w-xs">
            <button
              type="button"
              onPointerDown={startUnlockHold}
              onPointerUp={stopUnlockHold}
              onPointerLeave={stopUnlockHold}
              onPointerCancel={stopUnlockHold}
              className="relative w-full min-h-[56px] rounded-full border border-white/15 bg-white/[0.04] overflow-hidden flex items-center justify-center gap-2 text-xs font-bold text-white/60 active:scale-[0.99]"
            >
              <div
                className="absolute inset-y-0 left-0 bg-[#9AE62E]/30 transition-none"
                style={{ width: `${unlockProgress}%` }}
              />
              <Lock className="w-4 h-4 relative z-10" />
              <span className="relative z-10">
                {language === 'bn'
                  ? 'আনলক করতে ১ সেকেন্ড চেপে ধরুন'
                  : 'Hold 1s to Unlock Screen'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
