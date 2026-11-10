import React, { useState, useEffect, useMemo } from 'react';
import {
  Bike,
  FuelEntry,
  ServiceItem,
  ServiceLog,
  TabType,
  Language,
  NumberFormatType,
  FuelPriceSettings,
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
} from './utils/storage';
import {
  calculateFuelMileages,
  calculateServiceUrgency,
  calculateMonthlyReports,
} from './utils/calculations';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { HomeDashboard } from './components/HomeDashboard';
import { FuelLogView } from './components/FuelLogView';
import { ServiceReminderView } from './components/ServiceReminderView';
import { ReportsView } from './components/ReportsView';
import { AddFuelModal } from './components/AddFuelModal';
import { MarkServiceModal } from './components/MarkServiceModal';
import { AddEditServiceModal } from './components/AddEditServiceModal';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { ResetOdometerModal } from './components/ResetOdometerModal';

export default function App() {
  // 1. Initial State from Storage
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [activeBikeId, setActiveBikeId] = useState<string | null>(null);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);

  // 2. Settings
  const [language, setLanguage] = useState<Language>('bn');
  const [numberFormat, setNumberFormat] = useState<NumberFormatType>('bn');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [fuelPrices, setFuelPrices] = useState<FuelPriceSettings>(DEFAULT_FUEL_PRICES);

  // 3. Navigation & Modals
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [isAddFuelModalOpen, setIsAddFuelModalOpen] = useState(false);
  const [isMarkServiceModalOpen, setIsMarkServiceModalOpen] = useState(false);
  const [markServicePreselectId, setMarkServicePreselectId] = useState<string | undefined>(undefined);
  const [isAddEditServiceModalOpen, setIsAddEditServiceModalOpen] = useState(false);
  const [editingServiceItem, setEditingServiceItem] = useState<ServiceItem | null>(null);
  const [isResetOdoModalOpen, setIsResetOdoModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAddBikeModalOpen, setIsAddBikeModalOpen] = useState(false);

  // 4. Mount & Load Data
  useEffect(() => {
    const settings = loadSettings();
    setLanguage(settings.language);
    setNumberFormat(settings.numberFormat);
    setDarkMode(settings.darkMode);
    if (settings.fuelPrices) {
      setFuelPrices(settings.fuelPrices);
    }

    const initial = initLocalStorageIfEmpty();
    setBikes(initial.bikes);
    setActiveBikeId(initial.activeBikeId);
    setFuelEntries(initial.fuelEntries);
    setServiceItems(initial.serviceItems);
    setServiceLogs(initial.serviceLogs);

    if (initial.bikes.length === 0) {
      setIsOnboardingOpen(true);
    }
  }, []);

  // Sync dark mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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

  // Current calculated odometer (highest odometer in system)
  const currentOdo = useMemo(() => {
    if (!activeBike) return 0;
    return Math.max(
      activeBike.currentOdometer,
      ...activeFuelEntries.map((f) => f.odometer),
      activeBike.initialOdometer
    );
  }, [activeBike, activeFuelEntries]);

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
    return calculateMonthlyReports(activeFuelEntries, activeServiceLogs, activeBike);
  }, [activeFuelEntries, activeServiceLogs, activeBike]);

  // Current month's report
  const thisMonthReport = useMemo(() => {
    const currentMonthKey = new Date().toISOString().substring(0, 7);
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
      new Date().toISOString().split('T')[0]
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

  // --- Handlers: Odometer Reset / Calibration ---
  const handleResetOdometer = (
    newOdometer: number,
    adjustServices: boolean = true,
    clearPriorFuel: boolean = false
  ) => {
    if (!activeBike) return;

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    // 1. Update bike odometer
    handleUpdateBike(activeBike.id, {
      currentOdometer: newOdometer,
      initialOdometer: newOdometer,
      odometerResetAt: nowIso,
    });

    // 2. Adjust active services baseline if requested
    if (adjustServices) {
      const updatedServices = serviceItems.map((item) => {
        if (item.bikeId === activeBike.id) {
          return {
            ...item,
            lastServiceKm: newOdometer,
            lastServiceDate: todayStr,
          };
        }
        return item;
      });
      saveServiceItems(updatedServices);
    }

    // 3. Clear prior fuel and service logs for this bike if requested
    if (clearPriorFuel) {
      const remainingFuel = fuelEntries.filter((f) => f.bikeId !== activeBike.id);
      saveFuelEntries(remainingFuel);
      const remainingLogs = serviceLogs.filter((s) => s.bikeId !== activeBike.id);
      saveServiceLogs(remainingLogs);
    }
  };

  // --- Handlers: Service Baseline Sync ---
  const handleSyncServiceBaseline = (targetOdo: number) => {
    if (!activeBike) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedServices = serviceItems.map((item) => {
      if (item.bikeId === activeBike.id) {
        return {
          ...item,
          lastServiceKm: targetOdo,
          lastServiceDate: todayStr,
        };
      }
      return item;
    });
    saveServiceItems(updatedServices);
  };

  // --- Handlers: Fuel Log Management with Validation ---
  const handleAddFuelEntry = (entry: Omit<FuelEntry, 'id'>): { success: boolean; error?: string } => {
    if (!activeBike) return { success: false, error: 'No active bike' };

    // Validate that odometer is greater than previous entry
    const previousEntries = activeFuelEntries.filter((f) => {
      const isPriorOrSameDate = new Date(f.date) <= new Date(entry.date);
      if (!isPriorOrSameDate) return false;
      // If odometer was reset, only compare with entries on or after reset date
      if (activeBike.odometerResetAt) {
        const resetDate = activeBike.odometerResetAt.split('T')[0];
        return f.date >= resetDate;
      }
      return true;
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
    };

    const updated = [newEntry, ...fuelEntries];
    saveFuelEntries(updated);

    // Update active bike current odometer if new entry is higher
    if (entry.odometer > activeBike.currentOdometer) {
      handleUpdateBike(activeBike.id, { currentOdometer: entry.odometer });
    }

    return { success: true };
  };

  const handleUpdateFuelEntry = (id: string, updates: Partial<FuelEntry>): { success: boolean; error?: string } => {
    const updated = fuelEntries.map((f) => (f.id === id ? { ...f, ...updates } : f));
    saveFuelEntries(updated);
    return { success: true };
  };

  const handleDeleteFuelEntry = (id: string) => {
    const updated = fuelEntries.filter((f) => f.id !== id);
    saveFuelEntries(updated);
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
    saveServiceLogs([newLog, ...serviceLogs]);

    // 2. Reset the reminder on the service item
    const updatedItems = serviceItems.map((item) => {
      if (item.id === data.serviceItemId) {
        return {
          ...item,
          lastServiceKm: data.odometer,
          lastServiceDate: data.date,
        };
      }
      return item;
    });
    saveServiceItems(updatedItems);

    // 3. Update bike current odometer if service was performed at a higher odometer
    if (data.odometer > activeBike.currentOdometer) {
      handleUpdateBike(activeBike.id, { currentOdometer: data.odometer });
    }
  };

  // --- Handlers: Backup & Demo ---
  const handleExportBackup = () => {
    const json = exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bike_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
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
    if (updated.bikes.length === 0) {
      setIsOnboardingOpen(true);
    }
  };

  const handleClearAllData = () => {
    clearAllStorageData();
    setBikes([]);
    setActiveBikeId(null);
    setFuelEntries([]);
    setServiceItems([]);
    setServiceLogs([]);
    setIsOnboardingOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center">
      {/* Mobile container centered on larger displays */}
      <div className="w-full max-w-md min-h-screen bg-white dark:bg-slate-900 shadow-2xl flex flex-col relative border-x border-slate-200/60 dark:border-slate-800">
        {/* Sticky Header */}
        <Header
          bikes={bikes}
          activeBike={activeBike}
          onSelectBike={saveActiveBikeId}
          onOpenAddBike={() => setIsAddBikeModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          language={language}
          onToggleLanguage={() => updateSettings({ language: language === 'bn' ? 'en' : 'bn' })}
          numberFormat={numberFormat}
          darkMode={darkMode}
          onToggleDarkMode={() => updateSettings({ darkMode: !darkMode })}
        />

        {/* Main Content View based on Tab */}
        <main className="flex-1 px-4 py-2 overflow-y-auto">
          {activeBike && currentTab === 'home' && (
            <HomeDashboard
              bike={activeBike}
              fuelEntries={activeFuelEntries}
              calculatedMileages={calculatedMileages}
              urgentServices={serviceUrgentList}
              thisMonthReport={thisMonthReport}
              onOpenAddFuel={() => setIsAddFuelModalOpen(true)}
              onOpenMarkService={(itemId) => {
                setMarkServicePreselectId(itemId);
                setIsMarkServiceModalOpen(true);
              }}
              onOpenResetOdo={() => setIsResetOdoModalOpen(true)}
              onSyncServiceBaseline={handleSyncServiceBaseline}
              onNavigateToTab={setCurrentTab}
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
              onSyncServiceBaseline={handleSyncServiceBaseline}
              language={language}
              numberFormat={numberFormat}
            />
          )}

          {activeBike && currentTab === 'reports' && (
            <ReportsView
              bike={activeBike}
              fuelEntries={activeFuelEntries}
              serviceLogs={activeServiceLogs}
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
          onSelectTab={setCurrentTab}
          language={language}
          urgentServiceCount={urgentCount}
          hasOverdueService={hasOverdueService}
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
              onResetOdometer={handleResetOdometer}
              language={language}
              numberFormat={numberFormat}
            />
          </>
        )}

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
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
}
