import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GpsStatus, Language, RideRecord } from '../types';
import { isValidCoordinatePair } from '../utils/rideTracking';
import { Crosshair, RefreshCw } from 'lucide-react';

interface OnlineStreetMapProps {
  focusPoint: { lat: number; lng: number } | null;
  liveStartPoint: { lat: number; lng: number } | null;
  routePath: { lat: number; lng: number }[];
  inspectedRide: RideRecord | null;
  darkMode: boolean;
  autoFollow: boolean;
  recenterSignal: number;
  isTabVisible?: boolean;
  onUserDragMap: () => void;
  onRecenter: () => void;
  gpsStatus: GpsStatus;
  gpsAcquiringLabel: string;
  recenterLabel: string;
  sdkLoadFailed?: boolean;
  onReloadMaps?: () => void;
  language: Language;
}

const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125];

const LIGHT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap &copy; CARTO';

const OnlineStreetMapComponent: React.FC<OnlineStreetMapProps> = ({
  focusPoint,
  liveStartPoint,
  routePath,
  inspectedRide,
  darkMode,
  autoFollow,
  recenterSignal,
  isTabVisible = true,
  onUserDragMap,
  onRecenter,
  gpsStatus,
  gpsAcquiringLabel,
  recenterLabel,
  sdkLoadFailed,
  onReloadMaps,
  language,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const focusMarkerRef = useRef<L.Marker | null>(null);
  const lastHandledRecenterRef = useRef(0);
  const lastFittedInspectedIdRef = useRef<string | null>(null);

  const onUserDragMapRef = useRef(onUserDragMap);
  useEffect(() => {
    onUserDragMapRef.current = onUserDragMap;
  }, [onUserDragMap]);

  // Initialize Leaflet map once and preserve across tab switches / brief network dips
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const initialCenter: [number, number] = focusPoint
      ? [focusPoint.lat, focusPoint.lng]
      : DEFAULT_CENTER;

    const map = L.map(el, {
      center: initialCenter,
      zoom: 15,
      zoomControl: false,
      attributionControl: true,
    });

    const tileLayer = L.tileLayer(darkMode ? DARK_TILE_URL : LIGHT_TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    map.on('dragstart', () => {
      onUserDragMapRef.current();
    });

    mapRef.current = map;
    tileLayerRef.current = tileLayer;

    const resizeObserver = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        map.invalidateSize({ animate: false });
      }
    });
    resizeObserver.observe(el);

    const rafId = window.requestAnimationFrame(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        map.invalidateSize({ animate: false });
      }
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      polylineRef.current = null;
      startMarkerRef.current = null;
      focusMarkerRef.current = null;
    };
  }, []);

  // Re-measure cleanly when switching back to Map tab from hidden state
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el || !isTabVisible) return;

    const rafId = window.requestAnimationFrame(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        map.invalidateSize({ animate: false });
      }
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [isTabVisible]);

  // Update tiles smoothly when darkMode toggles
  useEffect(() => {
    const tileLayer = tileLayerRef.current;
    if (!tileLayer) return;
    tileLayer.setUrl(darkMode ? DARK_TILE_URL : LIGHT_TILE_URL);
  }, [darkMode]);

  // Sync polyline and markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routePath.length >= 2) {
      const latLngs: [number, number][] = routePath.map((p) => [p.lat, p.lng]);
      const color = inspectedRide ? '#2563EB' : '#65A30D';
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(latLngs);
        polylineRef.current.setStyle({ color });
      } else {
        polylineRef.current = L.polyline(latLngs, {
          color,
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }
    } else if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (liveStartPoint && isValidCoordinatePair(liveStartPoint)) {
      const startIcon = L.divIcon({
        className: 'bike-start-marker',
        html: '<div style="width:16px;height:16px;border-radius:9999px;background:#16A34A;border:3px solid #FFFFFF;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      if (startMarkerRef.current) {
        startMarkerRef.current.setLatLng([liveStartPoint.lat, liveStartPoint.lng]);
      } else {
        startMarkerRef.current = L.marker([liveStartPoint.lat, liveStartPoint.lng], {
          icon: startIcon,
        }).addTo(map);
      }
    } else if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }

    if (focusPoint && isValidCoordinatePair(focusPoint)) {
      const focusHtml = inspectedRide
        ? '<div style="width:18px;height:18px;border-radius:9999px;background:#DC2626;border:3px solid #FFFFFF;box-shadow:0 2px 10px rgba(0,0,0,0.4);"></div>'
        : '<div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;"><span class="animate-ping" style="position:absolute;width:28px;height:28px;border-radius:9999px;background:rgba(154,230,46,0.45);"></span><div style="width:18px;height:18px;border-radius:9999px;background:#141912;border:3px solid #9AE62E;box-shadow:0 2px 10px rgba(0,0,0,0.45);"></div></div>';

      const iconSize: [number, number] = inspectedRide ? [18, 18] : [28, 28];
      const iconAnchor: [number, number] = inspectedRide ? [9, 9] : [14, 14];
      const focusIcon = L.divIcon({
        className: 'bike-focus-marker',
        html: focusHtml,
        iconSize,
        iconAnchor,
      });

      if (focusMarkerRef.current) {
        focusMarkerRef.current.setLatLng([focusPoint.lat, focusPoint.lng]);
        focusMarkerRef.current.setIcon(focusIcon);
      } else {
        focusMarkerRef.current = L.marker([focusPoint.lat, focusPoint.lng], {
          icon: focusIcon,
        }).addTo(map);
      }
    } else if (focusMarkerRef.current) {
      focusMarkerRef.current.remove();
      focusMarkerRef.current = null;
    }
  }, [routePath, liveStartPoint, focusPoint, inspectedRide]);

  // Fit bounds when opening/changing inspected historical ride while visible
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) return;

    if (!inspectedRide) {
      lastFittedInspectedIdRef.current = null;
      return;
    }

    if (!isTabVisible || el.clientWidth === 0 || el.clientHeight === 0) return;
    if (lastFittedInspectedIdRef.current === inspectedRide.id) return;
    lastFittedInspectedIdRef.current = inspectedRide.id;

    const validPts: [number, number][] = [];
    if (isValidCoordinatePair(inspectedRide.startLocation)) {
      validPts.push([inspectedRide.startLocation.lat, inspectedRide.startLocation.lng]);
    }
    inspectedRide.route.forEach((p) => {
      if (isValidCoordinatePair(p)) validPts.push([p.lat, p.lng]);
    });
    if (isValidCoordinatePair(inspectedRide.endLocation)) {
      validPts.push([inspectedRide.endLocation.lat, inspectedRide.endLocation.lng]);
    }

    if (validPts.length === 0) return;

    map.invalidateSize({ animate: false });
    const first = validPts[0];
    const allSame = validPts.every((p) => p[0] === first[0] && p[1] === first[1]);
    if (validPts.length === 1 || allSame) {
      map.setView(first, 16);
    } else {
      map.fitBounds(L.latLngBounds(validPts), { padding: [44, 44], maxZoom: 17 });
    }
  }, [inspectedRide, isTabVisible]);

  // Follow live rider location when visible & autoFollow is active or recenter is tapped
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isTabVisible || inspectedRide || !focusPoint) return;

    const recenterTriggered = recenterSignal > lastHandledRecenterRef.current;
    if (recenterTriggered) {
      lastHandledRecenterRef.current = recenterSignal;
    }

    if (autoFollow || recenterTriggered) {
      const targetZoom = map.getZoom() < 15 ? 16 : map.getZoom();
      map.setView([focusPoint.lat, focusPoint.lng], targetZoom, { animate: true });
    }
  }, [focusPoint, inspectedRide, autoFollow, recenterSignal, isTabVisible]);

  return (
    <div className="relative h-[50vh] min-h-[340px] md:h-[58vh] w-full isolate">
      <div
        ref={containerRef}
        className="w-full h-full z-0 [&_.leaflet-control-attribution]:text-[9px] [&_.leaflet-control-attribution]:bg-white/75 dark:[&_.leaflet-control-attribution]:bg-black/60 dark:[&_.leaflet-control-attribution]:text-slate-300"
      />

      {!inspectedRide && !focusPoint && gpsStatus === 'acquiring' && (
        <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#171C18]/95 border border-black/10 dark:border-white/10 shadow-md text-[11px] font-bold text-[#141912] dark:text-white">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>{gpsAcquiringLabel}</span>
        </div>
      )}

      {sdkLoadFailed && onReloadMaps && (
        <button
          type="button"
          onClick={onReloadMaps}
          className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/90 dark:bg-[#171C18]/90 border border-black/10 dark:border-white/10 text-[#141912] dark:text-white text-[10px] font-bold shadow-sm active:scale-95 transition"
        >
          <RefreshCw className="w-3 h-3" />
          <span>{language === 'bn' ? 'Google Maps রিলোড' : 'Retry Google Maps'}</span>
        </button>
      )}

      {!inspectedRide && (
        <button
          type="button"
          onClick={onRecenter}
          title={recenterLabel}
          aria-label={recenterLabel}
          className={`absolute right-3 bottom-6 z-10 w-11 h-11 rounded-full shadow-md border flex items-center justify-center transition active:scale-95 ${
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
};

export const OnlineStreetMap = React.memo(OnlineStreetMapComponent);
