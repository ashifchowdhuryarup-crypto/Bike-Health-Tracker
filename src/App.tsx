import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  APIProvider,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import {
  Bike,
  FuelEntry,
  ServiceItem,
  ServiceLog,
  TabType,
  Language,
  NumberFormatType,
  FuelPriceSettings,
  RideRecord,
} from './types';
import {
  initLocalStorageIfEmpty,
  loadSettings,
  saveSettings,
  STORAGE_KEYS,
  createDefaultServiceItems,
  getSampleDemoData,
  clearDemoData,
  exportBackupJson,
  importBackupJson,
  clearAllStorageData,
  DEFAULT_FUEL_PRICES,
  saveRideHistory,
} from './utils/storage';
import {
  calculateFuelMileages,
  calculateServiceUrgency,
  calculateMonthlyReports,
  autoSyncServicesForOdometerChange,
  isFuelEntryAfterReset,
} from './utils/calculations';
import { getLocalDateString } from './utils/i18n';
import { applyCompletedRideSafely } from './utils/rideTracking';
import { useRideTracker } from './hooks/useRideTracker';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { HomeDashboard } from './components/HomeDashboard';
import { MapPanelView } from './components/MapPanelView';
import { RideHistoryView } from './components/RideHistoryView';
import { OdometerView } from './components/OdometerView';
import { FuelLogView } from './components/FuelLogView';
import { ServiceReminderView } from './components/ServiceReminderView';
import { ReportsView } from './components/ReportsView';
import { AddFuelModal } from './components/AddFuelModal';
import { MarkServiceModal } from './components/MarkServiceModal';
import { AddEditServiceModal } from './components/AddEditServiceModal';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { ResetOdometerModal } from './components/ResetOdometerModal';

const MAPS_LIBRARIES = ['marker', 'core'];

const MapsSdkErrorWatcher: React.FC<{
  onSdkError: () => void;
  onSdkReady: () => void;
}> = ({ onSdkError, onSdkReady }) => {
  const status = useApiLoadingStatus();
  useEffect(() => {
    if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
      onSdkError();
    } else if (status === APILoadingStatus.LOADED) {
      onSdkReady();
    }
  }, [status, onSdkError, onSdkReady]);
  return null;
};

function loadInitialAppState() {
  const settings = loadSettings();
  const initial = initLocalStorageIfEmpty();
  let loadedBikes = initial.bikes;
  let loadedItems = initial.serviceItems;
  let bikesHealed = false;
  let itemsHealed = false;
  const todayStr = getLocalDateString();

  // Auto-heal any uninitialized 0-km default service records on existing bikes above 500 km
  loadedBikes = loadedBikes.map((b) => {
    if (b.currentOdometer > 500) {
      const res = autoSyncServicesForOdometerChange(
        loadedItems,
        b,
        b.initialOdometer === 0 ? 0 : b.currentOdometer,
        b.currentOdometer,
        initial.serviceLogs,
        todayStr,
        false
      );
      if (res.changed) {
        loadedItems = res.updatedItems;
        itemsHealed = true;
      }
      if (res.updatedInitialOdo !== b.initialOdometer) {
        bikesHealed = true;
        return { ...b, initialOdometer: res.updatedInitialOdo };
      }
    }
    return b;
  });

  if (bikesHealed) {
    try {
      localStorage.setItem(STORAGE_KEYS.BIKES, JSON.stringify(loadedBikes));
    } catch {
      // Ignore storage quota errors during initial boot
    }
  }
  if (itemsHealed) {
    try {
      localStorage.setItem(STORAGE_KEYS.SERVICE_ITEMS, JSON.stringify(loadedItems));
    } catch {
      // Ignore storage quota errors during initial boot
    }
  }

  return {
    settings,
    bikes: loadedBikes,
    activeBikeId: initial.activeBikeId,
    fuelEntries: initial.fuelEntries,
    serviceItems: loadedItems,
    serviceLogs: initial.serviceLogs,
    rideHistory: initial.rideHistory,
  };
}

export default function App() {
  // 1. Synchronous Initial State from Storage (zero blank/empty first frame)
  const [bootState] = useState(() => loadInitialAppState());

  const [bikes, setBikes] = useState<Bike[]>(bootState.bikes);
  const [activeBikeId, setActiveBikeId] = useState<string | null>(bootState.activeBikeId);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>(bootState.fuelEntries);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>(bootState.serviceItems);
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>(bootState.serviceLogs);
  const [rideHistory, setRideHistory] = useState<RideRecord[]>(bootState.rideHistory);

  // 2. Settings
  const [language, setLanguage] = useState<Language>(bootState.settings.language);
  const [numberFormat, setNumberFormat] = useState<NumberFormatType>(bootState.settings.numberFormat);
  const [darkMode, setDarkMode] = useState<boolean>(bootState.settings.darkMode);
  const [fuelPrices, setFuelPrices] = useState<FuelPriceSettings>(
    bootState.settings.fuelPrices || DEFAULT_FUEL_PRICES
  );

  // 3. Navigation, Maps Quota & Modals
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [inspectedRide, setInspectedRide] = useState<RideRecord | null>(null);
  const [hasQuotaError, setHasQuotaError] = useState(false);
  const [sdkLoadFailed, setSdkLoadFailed] = useState(false);
  const [canMountMapsProvider, setCanMountMapsProvider] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [hasMountedMap, setHasMountedMap] = useState(false);
  const [isAddFuelModalOpen, setIsAddFuelModalOpen] = useState(false);
  const [isMarkServiceModalOpen, setIsMarkServiceModalOpen] = useState(false);
  const [markServicePreselectId, setMarkServicePreselectId] = useState<string | undefined>(undefined);
  const [isAddEditServiceModalOpen, setIsAddEditServiceModalOpen] = useState(false);
  const [editingServiceItem, setEditingServiceItem] = useState<ServiceItem | null>(null);
  const [isResetOdoModalOpen, setIsResetOdoModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(bootState.bikes.length === 0);
  const [isAddBikeModalOpen, setIsAddBikeModalOpen] = useState(false);

  const bikesRef = useRef<Bike[]>(bootState.bikes);
  useEffect(() => {
    bikesRef.current = bikes;
  }, [bikes]);

  // 4. Mount: Smoothly dismiss branded #app-splash & attach global listeners
  useEffect(() => {
    const splash = document.getElementById('app-splash');
    let raf1 = 0;
    let raf2 = 0;
    let dismissTimer: number | undefined;
    let removeTimer: number | undefined;

    if (splash) {
      const bootStart = (window as Window & { __APP_BOOT_START__?: number }).__APP_BOOT_START__ || 0;
      const elapsed = bootStart > 0 ? performance.now() - bootStart : 0;
      const remaining = Math.max(0, 380 - elapsed);

      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          dismissTimer = window.setTimeout(() => {
            splash.classList.add('splash-exit');
            removeTimer = window.setTimeout(() => {
              splash.remove();
            }, 360);
          }, remaining);
        });
      });
    }

    const handleQuotaExceeded = () => setHasQuotaError(true);
    const handleNetworkOnline = () => {
      setCanMountMapsProvider(true);
    };
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    window.addEventListener('online', handleNetworkOnline);
    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (dismissTimer) window.clearTimeout(dismissTimer);
      if (removeTimer) window.clearTimeout(removeTimer);
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
      window.removeEventListener('online', handleNetworkOnline);
    };
  }, []);

  const handleSdkError = useCallback(() => setSdkLoadFailed(true), []);
  const handleSdkReady = useCallback(() => setSdkLoadFailed(false), []);
  const handleClearInspectedRide = useCallback(() => setInspectedRide(null), []);
  const handleReloadMaps = useCallback(() => {
    window.location.reload();
  }, []);

  // Sync dark mode class and status-bar theme-color meta tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const themeMeta = document.getElementById('meta-theme-color');
    if (themeMeta) {
      themeMeta.setAttribute('content', darkMode ? '#0D110E' : '#F6F7F4');
    }
  }, [darkMode]);

  // Persist settings
  const updateSettings = (updates: Partial<{
    language: Language;
    numberFormat: NumberFormatType;
    darkMode: boolean;
    fuelPrices: FuelPriceSettings;
  }>) => {
    const newLang = updates.language !== undefined ? updates.language : language;
    const newNum = updates.numberFormat !== undefined ? updates.numberFormat : numberFormat;
    const newDark = updates.darkMode !== undefined ? updates.darkMode : darkMode;
    const newPrices = updates.fuelPrices !== undefined ? updates.fuelPrices : fuelPrices;

    setLanguage(newLang);
    setNumberFormat(newNum);
    setDarkMode(newDark);
    setFuelPrices(newPrices);

    saveSettings({
      language: newLang,
      numberFormat: newNum,
      darkMode: newDark,
      fuelPrices: newPrices,
    });
  };

  const handleUpdateFuelPrices = (prices: FuelPriceSettings) => {
    updateSettings({ fuelPrices: prices });
  };

  const handleUpdateSingleFuelPrice = (type: 'Octane' | 'Petrol', price: number) => {
    const updated = {
      ...fuelPrices,
      [type === 'Octane' ? 'octane' : 'petrol']: price,
    };
    handleUpdateFuelPrices(updated);
  };

  // Sync state changes to localStorage
  const saveBikes = (newBikes: Bike[]) => {
    setBikes(newBikes);
    localStorage.setItem(STORAGE_KEYS.BIKES, JSON.stringify(newBikes));
  };

  const saveActiveBikeId = (id: string) => {
    setActiveBikeId(id);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BIKE_ID, id);
  };

  const saveFuelEntries = (entries: FuelEntry[]) => {
    setFuelEntries(entries);
    localStorage.setItem(STORAGE_KEYS.FUEL_ENTRIES, JSON.stringify(entries));
  };

  const saveServiceItems = (items: ServiceItem[]) => {
    setServiceItems(items);
    localStorage.setItem(STORAGE_KEYS.SERVICE_ITEMS, JSON.stringify(items));
  };

  const saveServiceLogs = (logs: ServiceLog[]) => {
    setServiceLogs(logs);
    localStorage.setItem(STORAGE_KEYS.SERVICE_LOGS, JSON.stringify(logs));
  };

  const persistRideHistory = (rides: RideRecord[]) => {
    setRideHistory(rides);
    saveRideHistory(rides);
  };

  // Active Bike lookup
  const activeBike = useMemo(() => {
    return bikes.find((b) => b.id === activeBikeId) || bikes[0] || null;
  }, [bikes, activeBikeId]);

  // Filter entries for active bike
  const activeFuelEntries = useMemo(() => {
    if (!activeBike) return [];
    return fuelEntries.filter((f) => f.bikeId === activeBike.id);
  }, [fuelEntries, activeBike]);

  const activeServiceItems = useMemo(() => {
    if (!activeBike) return [];
    return serviceItems.filter((s) => s.bikeId === activeBike.id);
  }, [serviceItems, activeBike]);

  const activeServiceLogs = useMemo(() => {
    if (!activeBike) return [];
    return serviceLogs.filter((s) => s.bikeId === activeBike.id);
  }, [serviceLogs, activeBike]);

  const activeRideHistory = useMemo(() => {
    if (!activeBike) return [];
    return rideHistory.filter((r) => r.bikeId === activeBike.id);
  }, [rideHistory, activeBike]);

  // Current calculated odometer
  const currentOdo = useMemo(() => {
    if (!activeBike) return 0;
    return activeBike.currentOdometer;
  }, [activeBike]);

  // Fuel mileage calculations
  const calculatedMileages = useMemo(() => {
    return calculateFuelMileages(activeFuelEntries);
  }, [activeFuelEntries]);

  // Service urgency evaluations
  const serviceUrgentList = useMemo(() => {
    const list = activeServiceItems.map((item) =>
      calculateServiceUrgency(item, currentOdo)
    );
    // Sort by urgency score ascending (most urgent / overdue first)
    return list.sort((a, b) => a.urgencyScore - b.urgencyScore);
  }, [activeServiceItems, currentOdo]);

  // Urgent counts for badges
  const urgentCount = useMemo(() => {
    return serviceUrgentList.filter((s) => s.status === 'red' || s.status === 'yellow').length;
  }, [serviceUrgentList]);

  const hasOverdueService = useMemo(() => {
    return serviceUrgentList.some((s) => s.status === 'red');
  }, [serviceUrgentList]);

  // Monthly reports
  const monthlyReports = useMemo(() => {
    if (!activeBike) return [];
    return calculateMonthlyReports(activeFuelEntries, activeServiceLogs, activeBike, activeRideHistory);
  }, [activeFuelEntries, activeServiceLogs, activeBike, activeRideHistory]);

  // Current month's report
  const thisMonthReport = useMemo(() => {
    const currentMonthKey = getLocalDateString().substring(0, 7);
    return monthlyReports.find((r) => r.monthKey === currentMonthKey) || monthlyReports[0] || null;
  }, [monthlyReports]);

  // --- Handlers: Bike Management ---
  const handleAddNewBike = (newBikeData: Omit<Bike, 'id' | 'createdAt'>) => {
    const newId = `bike_${Date.now()}`;
    const newBike: Bike = {
      ...newBikeData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    const updatedBikes = [...bikes, newBike];
    saveBikes(updatedBikes);
    saveActiveBikeId(newId);

    // Seed default service items for this new bike
    const defaultServices = createDefaultServiceItems(
      newId,
      newBike.initialOdometer,
      getLocalDateString()
    );
    saveServiceItems([...serviceItems, ...defaultServices]);
  };

  const handleUpdateBike = (bikeId: string, updates: Partial<Bike>) => {
    const updated = bikes.map((b) => (b.id === bikeId ? { ...b, ...updates } : b));
    saveBikes(updated);
  };

  const handleDeleteBike = (bikeId: string) => {
    const updatedBikes = bikes.filter((b) => b.id !== bikeId);
    saveBikes(updatedBikes);
    if (activeBikeId === bikeId) {
      const nextId = updatedBikes[0]?.id || null;
      if (nextId) saveActiveBikeId(nextId);
    }
  };

  // --- Handlers: Completed GPS Ride -> Automatic Permanent Odometer & Service Sync ---
  const handleRideCompleted = useCallback(
    (completedRide: RideRecord) => {
      const targetBike =
        bikesRef.current.find((b) => b.id === completedRide.bikeId) || activeBike;
      if (!targetBike) return;

      const result = applyCompletedRideSafely(rideHistory, targetBike, completedRide);
      if (!result.saved) return;

      persistRideHistory(result.updatedRides);

      if (result.updatedOdometer !== targetBike.currentOdometer) {
        const todayStr = getLocalDateString();
        const synced = autoSyncServicesForOdometerChange(
          serviceItems,
          targetBike,
          targetBike.currentOdometer,
          result.updatedOdometer,
          serviceLogs,
          todayStr,
          false
        );
        if (synced.changed) {
          saveServiceItems(synced.updatedItems);
        }
        handleUpdateBike(targetBike.id, {
          currentOdometer: result.updatedOdometer,
          initialOdometer: synced.updatedInitialOdo,
        });
      }
    },
    [activeBike, rideHistory, serviceItems, serviceLogs]
  );

  const rideTracker = useRideTracker({
    activeBike,
    bikes,
    isMapTabActive: currentTab === 'map',
    onRideCompleted: handleRideCompleted,
  });

  useEffect(() => {
    if (activeBike && (currentTab === 'map' || rideTracker.activeRide !== null)) {
      setHasMountedMap(true);
    }
  }, [activeBike, currentTab, rideTracker.activeRide]);

  const handleStopAndSaveRide = useCallback(() => {
    rideTracker.stopAndSaveRide();
  }, [rideTracker.stopAndSaveRide]);

  const handleDeleteRide = (rideId: string) => {
    const updated = rideHistory.filter((r) => r.id !== rideId);
    persistRideHistory(updated);
    if (inspectedRide?.id === rideId) {
      setInspectedRide(null);
    }
  };

  const handleInspectRideOnMap = (ride: RideRecord) => {
    setInspectedRide(ride);
    setCurrentTab('map');
  };

  // --- Handlers: Odometer Update with Automatic Service Sync ---
  const handleResetOdometer = (
    newOdometer: number,
    resetAllServices: boolean = false,
    clearPriorFuel: boolean = false
  ) => {
    if (!activeBike) return;

    const oldOdo = activeBike.currentOdometer;
    const nowIso = new Date().toISOString();
    const todayStr = getLocalDateString();

    // 1. Auto-sync service items with the new odometer
    const { updatedItems, updatedInitialOdo, changed } = autoSyncServicesForOdometerChange(
      serviceItems,
      activeBike,
      oldOdo,
      newOdometer,
      serviceLogs,
      todayStr,
      resetAllServices
    );

    if (changed) {
      saveServiceItems(updatedItems);
    }

    // 2. Update bike odometer (and reset marker if lowered below prior fuel entries)
    const hasFuelAboveNewOdo = activeFuelEntries.some((f) => f.odometer > newOdometer);
    const bikeUpdates: Partial<Bike> = {
      currentOdometer: newOdometer,
      initialOdometer: clearPriorFuel ? newOdometer : updatedInitialOdo,
    };

    if (clearPriorFuel) {
      bikeUpdates.odometerResetAt = undefined;
    } else if (newOdometer < oldOdo && hasFuelAboveNewOdo) {
      bikeUpdates.odometerResetAt = nowIso;
    }

    handleUpdateBike(activeBike.id, bikeUpdates);

    // 3. Clear prior fuel and service logs ONLY if user explicitly checked full wipe
    if (clearPriorFuel) {
      const remainingFuel = fuelEntries.filter((f) => f.bikeId !== activeBike.id);
      saveFuelEntries(remainingFuel);
      const remainingLogs = serviceLogs.filter((s) => s.bikeId !== activeBike.id);
      saveServiceLogs(remainingLogs);
    }
  };

  // --- Handlers: Fuel Log Management with Auto Odo & Service Sync ---
  const handleAddFuelEntry = (entry: Omit<FuelEntry, 'id'>): { success: boolean; error?: string } => {
    if (!activeBike) return { success: false, error: 'No active bike' };

    // Validate that odometer is greater than previous entry
    const previousEntries = activeFuelEntries.filter((f) => {
      const isPriorOrSameDate = new Date(f.date) <= new Date(entry.date);
      if (!isPriorOrSameDate) return false;
      // If odometer was reset, only compare with entries created on or after reset timestamp
      return isFuelEntryAfterReset(f, activeBike.odometerResetAt);
    });

    if (previousEntries.length > 0) {
      const highestPriorOdo = Math.max(...previousEntries.map((p) => p.odometer));
      if (entry.odometer <= highestPriorOdo) {
        return {
          success: false,
          error:
            language === 'bn'
              ? `ওডোমিটার রিডিং অবশ্যই আগের এন্ট্রির (${highestPriorOdo} কিমি) চেয়ে বেশি হতে হবে!`
              : `Odometer must be greater than previous entry (${highestPriorOdo} km)!`,
        };
      }
    } else if (entry.odometer < activeBike.initialOdometer) {
      return {
        success: false,
        error:
          language === 'bn'
            ? `ওডোমিটার বাইকের শুরুর ওডোমিটারের (${activeBike.initialOdometer} কিমি) চেয়ে কম হতে পারে না!`
            : `Odometer cannot be less than initial odometer (${activeBike.initialOdometer} km)!`,
      };
    }

    const newEntry: FuelEntry = {
      ...entry,
      id: `fuel_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...fuelEntries];
    saveFuelEntries(updated);

    // Auto-sync bike odometer & any uninitialized 0-km services when new entry increases odometer
    if (entry.odometer > activeBike.currentOdometer) {
      const todayStr = getLocalDateString();
      const { updatedItems, updatedInitialOdo, changed } = autoSyncServicesForOdometerChange(
        serviceItems,
        activeBike,
        activeBike.currentOdometer,
        entry.odometer,
        serviceLogs,
        todayStr,
        false
      );
      if (changed) {
        saveServiceItems(updatedItems);
      }
      handleUpdateBike(activeBike.id, {
        currentOdometer: entry.odometer,
        initialOdometer: updatedInitialOdo,
      });
    }

    return { success: true };
  };

  const handleUpdateFuelEntry = (id: string, updates: Partial<FuelEntry>): { success: boolean; error?: string } => {
    const oldEntry = fuelEntries.find((f) => f.id === id);
    const updated = fuelEntries.map((f) => (f.id === id ? { ...f, ...updates } : f));
    saveFuelEntries(updated);

    if (activeBike && oldEntry && oldEntry.bikeId === activeBike.id && updates.odometer !== undefined) {
      const relevantBikeEntries = updated.filter(
        (f) => f.bikeId === activeBike.id && isFuelEntryAfterReset(f, activeBike.odometerResetAt)
      );
      const maxFuelOdo =
        relevantBikeEntries.length > 0
          ? Math.max(...relevantBikeEntries.map((f) => f.odometer))
          : activeBike.initialOdometer;
      const bikeRides = rideHistory.filter((r) => r.bikeId === activeBike.id);
      const maxRideOdo =
        bikeRides.length > 0 ? Math.max(...bikeRides.map((r) => r.odometerAfter)) : 0;

      let targetOdo = activeBike.currentOdometer;
      if (activeBike.currentOdometer === oldEntry.odometer) {
        // User edited the latest entry that controlled currentOdometer -> sync while preserving GPS ride progress
        targetOdo = Math.max(maxFuelOdo, maxRideOdo, activeBike.initialOdometer);
      } else if (updates.odometer > activeBike.currentOdometer) {
        targetOdo = updates.odometer;
      }

      if (targetOdo !== activeBike.currentOdometer) {
        const todayStr = getLocalDateString();
        const { updatedItems, updatedInitialOdo, changed } = autoSyncServicesForOdometerChange(
          serviceItems,
          activeBike,
          activeBike.currentOdometer,
          targetOdo,
          serviceLogs,
          todayStr,
          false
        );
        if (changed) {
          saveServiceItems(updatedItems);
        }
        handleUpdateBike(activeBike.id, {
          currentOdometer: targetOdo,
          initialOdometer: updatedInitialOdo,
        });
      }
    }

    return { success: true };
  };

  const handleDeleteFuelEntry = (id: string) => {
    const deletedEntry = fuelEntries.find((f) => f.id === id);
    const updated = fuelEntries.filter((f) => f.id !== id);
    saveFuelEntries(updated);

    if (
      activeBike &&
      deletedEntry &&
      deletedEntry.bikeId === activeBike.id &&
      deletedEntry.odometer === activeBike.currentOdometer
    ) {
      const remainingBikeFuels = updated.filter(
        (f) => f.bikeId === activeBike.id && isFuelEntryAfterReset(f, activeBike.odometerResetAt)
      );
      const maxFuelOdo =
        remainingBikeFuels.length > 0 ? Math.max(...remainingBikeFuels.map((f) => f.odometer)) : 0;
      const maxLogOdo =
        activeServiceLogs.length > 0 ? Math.max(...activeServiceLogs.map((l) => l.odometer)) : 0;
      const bikeRides = rideHistory.filter((r) => r.bikeId === activeBike.id);
      const maxRideOdo =
        bikeRides.length > 0 ? Math.max(...bikeRides.map((r) => r.odometerAfter)) : 0;
      const targetOdo = Math.max(maxFuelOdo, maxLogOdo, maxRideOdo, activeBike.initialOdometer);

      if (targetOdo !== activeBike.currentOdometer) {
        const todayStr = getLocalDateString();
        const { updatedItems, updatedInitialOdo, changed } = autoSyncServicesForOdometerChange(
          serviceItems,
          activeBike,
          activeBike.currentOdometer,
          targetOdo,
          serviceLogs,
          todayStr,
          false
        );
        if (changed) {
          saveServiceItems(updatedItems);
        }
        handleUpdateBike(activeBike.id, {
          currentOdometer: targetOdo,
          initialOdometer: updatedInitialOdo,
        });
      }
    }
  };

  // --- Handlers: Service Management ---
  const handleSaveServiceItem = (itemData: Omit<ServiceItem, 'id'>, id?: string) => {
    if (id) {
      const updated = serviceItems.map((s) => (s.id === id ? { ...s, ...itemData } : s));
      saveServiceItems(updated);
    } else {
      const newItem: ServiceItem = {
        ...itemData,
        id: `serv_item_${Date.now()}`,
      };
      saveServiceItems([...serviceItems, newItem]);
    }
  };

  const handleDeleteServiceItem = (itemId: string) => {
    const updated = serviceItems.filter((s) => s.id !== itemId);
    saveServiceItems(updated);
  };

  const handleConfirmServiceDone = (data: {
    serviceItemId: string;
    serviceItemName: string;
    date: string;
    odometer: number;
    cost?: number;
    notes?: string;
  }) => {
    if (!activeBike) return;

    // 1. Add record to service logs
    const newLog: ServiceLog = {
      id: `serv_log_${Date.now()}`,
      bikeId: activeBike.id,
      serviceItemId: data.serviceItemId,
      serviceItemName: data.serviceItemName,
      date: data.date,
      odometer: data.odometer,
      cost: data.cost,
      notes: data.notes,
    };
    const updatedLogs = [newLog, ...serviceLogs];
    saveServiceLogs(updatedLogs);

    // 2. Reset the reminder on the service item
    let updatedItems = serviceItems.map((item) => {
      if (item.id === data.serviceItemId) {
        return {
          ...item,
          lastServiceKm: data.odometer,
          lastServiceDate: data.date,
        };
      }
      return item;
    });

    // 3. Update bike current odometer if service was performed at a higher odometer
    if (data.odometer > activeBike.currentOdometer) {
      const synced = autoSyncServicesForOdometerChange(
        updatedItems,
        activeBike,
        activeBike.currentOdometer,
        data.odometer,
        updatedLogs,
        data.date,
        false
      );
      updatedItems = synced.updatedItems;
      handleUpdateBike(activeBike.id, {
        currentOdometer: data.odometer,
        initialOdometer: synced.updatedInitialOdo,
      });
    }

    saveServiceItems(updatedItems);
  };

  // --- Handlers: Backup & Demo ---
  const handleExportBackup = () => {
    const json = exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bike_tracker_backup_${getLocalDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (jsonStr: string): boolean => {
    const ok = importBackupJson(jsonStr);
    if (ok) {
      const reloaded = initLocalStorageIfEmpty();
      setBikes(reloaded.bikes);
      setActiveBikeId(reloaded.activeBikeId);
      setFuelEntries(reloaded.fuelEntries);
      setServiceItems(reloaded.serviceItems);
      setServiceLogs(reloaded.serviceLogs);
      setRideHistory(reloaded.rideHistory);
    }
    return ok;
  };

  const handleLoadDemoData = () => {
    const demo = getSampleDemoData();
    saveBikes(demo.bikes);
    saveActiveBikeId(demo.activeBikeId);
    saveFuelEntries(demo.fuelEntries);
    saveServiceItems(demo.serviceItems);
    saveServiceLogs(demo.serviceLogs);
  };

  const handleClearDemoData = () => {
    clearDemoData();
    const updated = initLocalStorageIfEmpty();
    setBikes(updated.bikes);
    setActiveBikeId(updated.activeBikeId);
    setFuelEntries(updated.fuelEntries);
    setServiceItems(updated.serviceItems);
    setServiceLogs(updated.serviceLogs);
    setRideHistory(updated.rideHistory);
    if (updated.bikes.length === 0) {
      setIsOnboardingOpen(true);
    }
  };

  const handleClearAllData = () => {
    clearAllStorageData();
    rideTracker.resetRideTracker();
    setBikes([]);
    setActiveBikeId(null);
    setFuelEntries([]);
    setServiceItems([]);
    setServiceLogs([]);
    setRideHistory([]);
    setInspectedRide(null);
    setHasMountedMap(false);
    setIsOnboardingOpen(true);
  };

  const mapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

  const appShell = (
    <div className="min-h-screen bg-[#F6F7F4] dark:bg-[#0D110E] text-[#141912] dark:text-[#F4F6F0] flex flex-col">
      {hasQuotaError && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Sticky Header */}
      <Header
        bikes={bikes}
        activeBike={activeBike}
        onSelectBike={saveActiveBikeId}
        onOpenAddBike={() => {
          setIsAddBikeModalOpen(true);
          setIsSettingsOpen(true);
        }}
        onOpenSettings={() => {
          setIsAddBikeModalOpen(false);
          setIsSettingsOpen(true);
        }}
        language={language}
        onToggleLanguage={() => updateSettings({ language: language === 'bn' ? 'en' : 'bn' })}
        numberFormat={numberFormat}
        darkMode={darkMode}
        onToggleDarkMode={() => updateSettings({ darkMode: !darkMode })}
      />

      {/* Responsive Container: Mobile-first phone ergonomics expanding cleanly on tablet/desktop */}
      <div className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto flex-1 flex flex-col relative">
        {/* Main Content View based on Tab */}
        <main className="flex-1 px-4 md:px-6 pt-2 pb-24">

          {activeBike && currentTab === 'home' && (
            <HomeDashboard
              bike={activeBike}
              fuelEntries={activeFuelEntries}
              rideHistory={activeRideHistory}
              activeRide={rideTracker.activeRide}
              urgentServices={serviceUrgentList}
              thisMonthReport={thisMonthReport}
              onOpenMarkService={(itemId) => {
                setMarkServicePreselectId(itemId);
                setIsMarkServiceModalOpen(true);
              }}
              onOpenResetOdo={() => setIsResetOdoModalOpen(true)}
              onNavigateToTab={setCurrentTab}
              language={language}
              numberFormat={numberFormat}
            />
          )}

          {activeBike && hasMountedMap && (
            <div className={currentTab === 'map' ? 'block' : 'hidden'}>
              <MapPanelView
                bike={activeBike}
                activeRide={rideTracker.activeRide}
                currentPosition={rideTracker.currentPosition}
                elapsedSeconds={rideTracker.elapsedSeconds}
                gpsStatus={rideTracker.gpsStatus}
                gpsError={rideTracker.gpsError}
                isOnline={rideTracker.isOnline}
                isWakeLockActive={rideTracker.isWakeLockActive}
                wasRecovered={rideTracker.wasRecovered}
                hasQuotaError={hasQuotaError}
                sdkLoadFailed={sdkLoadFailed}
                lastSavedRide={rideTracker.lastSavedRide}
                inspectedRide={inspectedRide}
                onClearInspectedRide={handleClearInspectedRide}
                onStartRide={rideTracker.startRide}
                onStopAndSaveRide={handleStopAndSaveRide}
                onRequestGpsRetry={rideTracker.requestGpsRetry}
                onRequestFreshFix={rideTracker.requestFreshFix}
                onReloadMaps={handleReloadMaps}
                onDismissRecoveredBanner={rideTracker.dismissRecoveredBanner}
                onClearLastSavedRide={rideTracker.clearLastSavedRide}
                language={language}
                numberFormat={numberFormat}
                darkMode={darkMode}
                isTabVisible={currentTab === 'map'}
              />
            </div>
          )}

          {activeBike && currentTab === 'rides' && (
            <RideHistoryView
              rides={activeRideHistory}
              onInspectRideOnMap={handleInspectRideOnMap}
              onDeleteRide={handleDeleteRide}
              onGoToMap={() => setCurrentTab('map')}
              language={language}
              numberFormat={numberFormat}
            />
          )}

          {activeBike && currentTab === 'odometer' && (
            <OdometerView
              bike={activeBike}
              rides={activeRideHistory}
              fuelEntries={activeFuelEntries}
              onOpenResetOdo={() => setIsResetOdoModalOpen(true)}
              onGoToMap={() => setCurrentTab('map')}
              onInspectRideOnMap={handleInspectRideOnMap}
              language={language}
              numberFormat={numberFormat}
            />
          )}

          {activeBike && currentTab === 'fuel' && (
            <FuelLogView
              bike={activeBike}
              fuelEntries={activeFuelEntries}
              fuelPrices={fuelPrices}
              onUpdateFuelPrice={handleUpdateSingleFuelPrice}
              calculatedMileages={calculatedMileages}
              onAddFuelEntry={handleAddFuelEntry}
              onUpdateFuelEntry={handleUpdateFuelEntry}
              onDeleteFuelEntry={handleDeleteFuelEntry}
              language={language}
              numberFormat={numberFormat}
            />
          )}

          {activeBike && currentTab === 'service' && (
            <ServiceReminderView
              bike={activeBike}
              serviceItems={activeServiceItems}
              serviceUrgentList={serviceUrgentList}
              serviceLogs={activeServiceLogs}
              onOpenMarkService={(itemId) => {
                setMarkServicePreselectId(itemId);
                setIsMarkServiceModalOpen(true);
              }}
              onOpenAddCustomService={() => {
                setEditingServiceItem(null);
                setIsAddEditServiceModalOpen(true);
              }}
              onOpenEditService={(item) => {
                setEditingServiceItem(item);
                setIsAddEditServiceModalOpen(true);
              }}
              onDeleteServiceItem={handleDeleteServiceItem}
              language={language}
              numberFormat={numberFormat}
            />
          )}

          {activeBike && currentTab === 'reports' && (
            <ReportsView
              bike={activeBike}
              fuelEntries={activeFuelEntries}
              serviceLogs={activeServiceLogs}
              rideHistory={activeRideHistory}
              calculatedMileages={calculatedMileages}
              monthlyReports={monthlyReports}
              language={language}
              numberFormat={numberFormat}
            />
          )}
        </main>

        {/* Bottom Tab Navigation */}
        <Navigation
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab !== 'map') setInspectedRide(null);
            setCurrentTab(tab);
          }}
          onOpenAddFuel={() => setIsAddFuelModalOpen(true)}
          language={language}
          numberFormat={numberFormat}
          urgentServiceCount={urgentCount}
          hasOverdueService={hasOverdueService}
          isRideActive={rideTracker.activeRide !== null}
        />

        {/* Modals */}
        {activeBike && (
          <>
            <AddFuelModal
              isOpen={isAddFuelModalOpen}
              onClose={() => setIsAddFuelModalOpen(false)}
              bike={activeBike}
              fuelEntries={activeFuelEntries}
              fuelPrices={fuelPrices}
              onUpdateFuelPrice={handleUpdateSingleFuelPrice}
              onAddFuelEntry={handleAddFuelEntry}
              language={language}
              numberFormat={numberFormat}
            />

            <MarkServiceModal
              isOpen={isMarkServiceModalOpen}
              onClose={() => {
                setIsMarkServiceModalOpen(false);
                setMarkServicePreselectId(undefined);
              }}
              bike={activeBike}
              serviceItems={activeServiceItems}
              preselectedItemId={markServicePreselectId}
              onConfirmServiceDone={handleConfirmServiceDone}
              language={language}
              numberFormat={numberFormat}
            />

            <AddEditServiceModal
              isOpen={isAddEditServiceModalOpen}
              onClose={() => {
                setIsAddEditServiceModalOpen(false);
                setEditingServiceItem(null);
              }}
              bike={activeBike}
              editingItem={editingServiceItem}
              onSaveServiceItem={handleSaveServiceItem}
              language={language}
              numberFormat={numberFormat}
            />

            <ResetOdometerModal
              isOpen={isResetOdoModalOpen}
              onClose={() => setIsResetOdoModalOpen(false)}
              bike={activeBike}
              serviceItems={activeServiceItems}
              serviceLogs={activeServiceLogs}
              onResetOdometer={handleResetOdometer}
              language={language}
              numberFormat={numberFormat}
            />
          </>
        )}

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => {
            setIsSettingsOpen(false);
            setIsAddBikeModalOpen(false);
          }}
          defaultOpenAddBike={isAddBikeModalOpen}
          bikes={bikes}
          activeBike={activeBike}
          onSelectBike={saveActiveBikeId}
          onUpdateBike={handleUpdateBike}
          onAddNewBike={handleAddNewBike}
          onDeleteBike={handleDeleteBike}
          onOpenResetOdo={() => setIsResetOdoModalOpen(true)}
          language={language}
          onSetLanguage={(lang) => updateSettings({ language: lang })}
          numberFormat={numberFormat}
          onSetNumberFormat={(format) => updateSettings({ numberFormat: format })}
          darkMode={darkMode}
          onToggleDarkMode={() => updateSettings({ darkMode: !darkMode })}
          fuelPrices={fuelPrices}
          onUpdateFuelPrices={handleUpdateFuelPrices}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onLoadDemoData={handleLoadDemoData}
          onClearDemoData={handleClearDemoData}
          onClearAllData={handleClearAllData}
        />

        <OnboardingModal
          isOpen={isOnboardingOpen}
          onComplete={(newBike) => {
            handleAddNewBike(newBike);
            setIsOnboardingOpen(false);
          }}
          language={language}
          onSetLanguage={(lang) => updateSettings({ language: lang })}
          numberFormat={numberFormat}
        />
      </div>
    </div>
  );

  if (!mapsApiKey || !canMountMapsProvider) {
    return appShell;
  }

  return (
    <APIProvider
      apiKey={mapsApiKey}
      language={language === 'bn' ? 'bn' : 'en'}
      region="BD"
      libraries={MAPS_LIBRARIES}
      onError={handleSdkError}
    >
      <MapsSdkErrorWatcher
        onSdkError={handleSdkError}
        onSdkReady={handleSdkReady}
      />
      {appShell}
    </APIProvider>
  );
}
