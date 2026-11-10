import { Bike, FuelEntry, ServiceItem, ServiceLog, Language, NumberFormatType, FuelPriceSettings } from '../types';

export interface AppSettings {
  language: Language;
  numberFormat: NumberFormatType;
  darkMode: boolean;
  fuelPrices: FuelPriceSettings;
}

export const DEFAULT_FUEL_PRICES: FuelPriceSettings = {
  octane: 165,
  petrol: 155,
};

export const STORAGE_KEYS = {
  BIKES: 'bike_tracker_bikes',
  ACTIVE_BIKE_ID: 'bike_tracker_active_bike_id',
  FUEL_ENTRIES: 'bike_tracker_fuel_entries',
  SERVICE_ITEMS: 'bike_tracker_service_items',
  SERVICE_LOGS: 'bike_tracker_service_logs',
  SETTINGS: 'bike_tracker_settings',
  INITIALIZED: 'bike_tracker_initialized_v1',
};

export const DEFAULT_SERVICE_DEFINITIONS = [
  {
    nameEn: 'Engine Oil',
    nameBn: 'ইঞ্জিন অয়েল',
    kmInterval: 2500,
    dayInterval: 90,
  },
  {
    nameEn: 'Chain Lube',
    nameBn: 'চেইন লুব ও ক্লিন',
    kmInterval: 600,
    dayInterval: 14,
  },
  {
    nameEn: 'Air Filter',
    nameBn: 'এয়ার ফিল্টার',
    kmInterval: 6000,
    dayInterval: 180,
  },
  {
    nameEn: 'Spark Plug',
    nameBn: 'স্পার্ক প্লাগ',
    kmInterval: 10000,
  },
  {
    nameEn: 'Brake Pads',
    nameBn: 'ব্রেক প্যাড / শু',
    kmInterval: 8000,
  },
];

export function createDefaultServiceItems(bikeId: string, baseOdo: number, baseDate: string): ServiceItem[] {
  return DEFAULT_SERVICE_DEFINITIONS.map((def, idx) => ({
    id: `service_item_${bikeId}_${idx}_${Date.now()}`,
    bikeId,
    nameEn: def.nameEn,
    nameBn: def.nameBn,
    kmInterval: def.kmInterval,
    dayInterval: def.dayInterval,
    lastServiceKm: baseOdo,
    lastServiceDate: baseDate,
    isDefault: true,
  }));
}

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        language: parsed.language || 'bn',
        numberFormat: parsed.numberFormat || 'bn',
        darkMode: Boolean(parsed.darkMode),
        fuelPrices: {
          octane: parsed.fuelPrices?.octane ?? 165,
          petrol: parsed.fuelPrices?.petrol ?? 155,
        },
      };
    }
  } catch (e) {
    console.error('Error loading settings', e);
  }
  return {
    language: 'bn', // Default Bangla as requested
    numberFormat: 'bn',
    darkMode: false,
    fuelPrices: DEFAULT_FUEL_PRICES,
  };
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

export function getSampleDemoData() {
  const bikeId = 'demo_bike_yamaha_1';
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const bike: Bike = {
    id: bikeId,
    name: 'Yamaha FZ-S Fi V3',
    model: '150cc Dark Knight',
    registrationNumber: 'ঢাকা মেট্রো-ল ৪৫-৮৯২১',
    initialOdometer: 8500,
    currentOdometer: 11450,
    createdAt: '2026-08-01',
  };

  const fuelEntries: FuelEntry[] = [
    {
      id: 'fuel_1',
      bikeId,
      date: '2026-08-25',
      odometer: 8500,
      litres: 11.2,
      totalPrice: 1400,
      isFullTank: true,
      fuelType: 'Octane',
      notes: 'Initial full tank at Gulshan Fuel Pump',
    },
    {
      id: 'fuel_2',
      bikeId,
      date: '2026-09-08',
      odometer: 8980,
      litres: 10.8,
      totalPrice: 1350,
      isFullTank: true,
      fuelType: 'Octane',
      notes: 'Dhaka city commute',
    },
    {
      id: 'fuel_3',
      bikeId,
      date: '2026-09-22',
      odometer: 9450,
      litres: 10.5,
      totalPrice: 1312,
      isFullTank: true,
      fuelType: 'Octane',
      notes: 'Clean engine run',
    },
    {
      id: 'fuel_4',
      bikeId,
      date: '2026-10-06',
      odometer: 9910,
      litres: 10.4,
      totalPrice: 1300,
      isFullTank: true,
      fuelType: 'Octane',
      notes: 'Smooth ride',
    },
    {
      id: 'fuel_5',
      bikeId,
      date: '2026-10-18',
      odometer: 10150,
      litres: 5.0,
      totalPrice: 625,
      isFullTank: false,
      fuelType: 'Octane',
      notes: 'Quick refill before Highway ride',
    },
    {
      id: 'fuel_6',
      bikeId,
      date: '2026-10-25',
      odometer: 10560,
      litres: 5.5,
      totalPrice: 687,
      isFullTank: true,
      fuelType: 'Octane',
      notes: 'Paturia highway return',
    },
    {
      id: 'fuel_7',
      bikeId,
      date: '2026-11-02',
      odometer: 11020,
      litres: 10.5,
      totalPrice: 1312,
      isFullTank: true,
      fuelType: 'Octane',
      notes: 'Mirpur fill',
    },
    {
      id: 'fuel_8',
      bikeId,
      date: todayStr,
      odometer: 11450,
      litres: 10.2,
      totalPrice: 1275,
      isFullTank: true,
      fuelType: 'Octane',
      notes: 'Latest full tank',
    },
  ];

  const serviceItems: ServiceItem[] = [
    {
      id: 'serv_item_1',
      bikeId,
      nameEn: 'Engine Oil',
      nameBn: 'ইঞ্জিন অয়েল',
      kmInterval: 2500,
      dayInterval: 90,
      lastServiceKm: 10000,
      lastServiceDate: '2026-10-10',
      isDefault: true,
    },
    {
      id: 'serv_item_2',
      bikeId,
      nameEn: 'Chain Lube',
      nameBn: 'চেইন লুব ও ক্লিন',
      kmInterval: 600,
      dayInterval: 14,
      lastServiceKm: 10900,
      lastServiceDate: '2026-11-01',
      isDefault: true,
    },
    {
      id: 'serv_item_3',
      bikeId,
      nameEn: 'Air Filter',
      nameBn: 'এয়ার ফিল্টার',
      kmInterval: 6000,
      dayInterval: 180,
      lastServiceKm: 5000,
      lastServiceDate: '2026-03-15',
      isDefault: true,
    },
    {
      id: 'serv_item_4',
      bikeId,
      nameEn: 'Spark Plug',
      nameBn: 'স্পার্ক প্লাগ',
      kmInterval: 10000,
      lastServiceKm: 8500,
      lastServiceDate: '2026-08-25',
      isDefault: true,
    },
    {
      id: 'serv_item_5',
      bikeId,
      nameEn: 'Brake Pads',
      nameBn: 'ব্রেক প্যাড / শু',
      kmInterval: 8000,
      lastServiceKm: 8500,
      lastServiceDate: '2026-08-25',
      isDefault: true,
    },
  ];

  const serviceLogs: ServiceLog[] = [
    {
      id: 'serv_log_1',
      bikeId,
      serviceItemId: 'serv_item_1',
      serviceItemName: 'ইঞ্জিন অয়েল (Motul 7100 10W40)',
      date: '2026-10-10',
      odometer: 10000,
      cost: 1250,
      notes: 'Full synthetic oil change & drain bolt washer',
    },
    {
      id: 'serv_log_2',
      bikeId,
      serviceItemId: 'serv_item_2',
      serviceItemName: 'চেইন লুব ও ক্লিন',
      date: '2026-11-01',
      odometer: 10900,
      cost: 250,
      notes: 'Motul chain cleaner & lube spray',
    },
  ];

  return {
    bikes: [bike],
    activeBikeId: bikeId,
    fuelEntries,
    serviceItems,
    serviceLogs,
  };
}

export function isDemoDataActive(): boolean {
  try {
    const rawBikes = localStorage.getItem(STORAGE_KEYS.BIKES);
    if (!rawBikes) return false;
    const bikes: Bike[] = JSON.parse(rawBikes);
    return bikes.some((b) => b.id === 'demo_bike_yamaha_1');
  } catch {
    return false;
  }
}

export function clearDemoData(): void {
  try {
    const rawBikes = localStorage.getItem(STORAGE_KEYS.BIKES);
    const bikes: Bike[] = rawBikes ? JSON.parse(rawBikes) : [];
    const nonDemoBikes = bikes.filter((b) => b.id !== 'demo_bike_yamaha_1');

    const rawFuels = localStorage.getItem(STORAGE_KEYS.FUEL_ENTRIES);
    const fuels: FuelEntry[] = rawFuels ? JSON.parse(rawFuels) : [];
    const nonDemoFuels = fuels.filter((f) => f.bikeId !== 'demo_bike_yamaha_1');

    const rawServiceItems = localStorage.getItem(STORAGE_KEYS.SERVICE_ITEMS);
    const serviceItems: ServiceItem[] = rawServiceItems ? JSON.parse(rawServiceItems) : [];
    const nonDemoServiceItems = serviceItems.filter((s) => s.bikeId !== 'demo_bike_yamaha_1');

    const rawServiceLogs = localStorage.getItem(STORAGE_KEYS.SERVICE_LOGS);
    const serviceLogs: ServiceLog[] = rawServiceLogs ? JSON.parse(rawServiceLogs) : [];
    const nonDemoServiceLogs = serviceLogs.filter((s) => s.bikeId !== 'demo_bike_yamaha_1');

    localStorage.setItem(STORAGE_KEYS.BIKES, JSON.stringify(nonDemoBikes));
    localStorage.setItem(STORAGE_KEYS.FUEL_ENTRIES, JSON.stringify(nonDemoFuels));
    localStorage.setItem(STORAGE_KEYS.SERVICE_ITEMS, JSON.stringify(nonDemoServiceItems));
    localStorage.setItem(STORAGE_KEYS.SERVICE_LOGS, JSON.stringify(nonDemoServiceLogs));

    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_BIKE_ID);
    if (activeId === 'demo_bike_yamaha_1') {
      const nextId = nonDemoBikes[0]?.id || null;
      if (nextId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_BIKE_ID, nextId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_BIKE_ID);
      }
    }
  } catch (e) {
    console.error('Error clearing demo data', e);
  }
}

export function initLocalStorageIfEmpty(): {
  bikes: Bike[];
  activeBikeId: string | null;
  fuelEntries: FuelEntry[];
  serviceItems: ServiceItem[];
  serviceLogs: ServiceLog[];
} {
  try {
    // If demo data was previously loaded, purge it as requested
    const rawBikes = localStorage.getItem(STORAGE_KEYS.BIKES);
    let bikes: Bike[] = rawBikes ? JSON.parse(rawBikes) : [];

    // Filter out demo bike if present
    if (bikes.some((b) => b.id === 'demo_bike_yamaha_1')) {
      clearDemoData();
      const updatedRawBikes = localStorage.getItem(STORAGE_KEYS.BIKES);
      bikes = updatedRawBikes ? JSON.parse(updatedRawBikes) : [];
    }

    if (bikes.length === 0) {
      // Clean slate - no demo records! User will see onboarding for their own bike
      return {
        bikes: [],
        activeBikeId: null,
        fuelEntries: [],
        serviceItems: [],
        serviceLogs: [],
      };
    }

    const activeBikeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_BIKE_ID) || (bikes[0]?.id ?? null);
    const fuelEntries: FuelEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.FUEL_ENTRIES) || '[]');
    const serviceItems: ServiceItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICE_ITEMS) || '[]');
    const serviceLogs: ServiceLog[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICE_LOGS) || '[]');

    return {
      bikes,
      activeBikeId,
      fuelEntries,
      serviceItems,
      serviceLogs,
    };
  } catch (err) {
    console.error('Failed to init storage', err);
    return {
      bikes: [],
      activeBikeId: null,
      fuelEntries: [],
      serviceItems: [],
      serviceLogs: [],
    };
  }
}

export function exportBackupJson(): string {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    bikes: JSON.parse(localStorage.getItem(STORAGE_KEYS.BIKES) || '[]'),
    activeBikeId: localStorage.getItem(STORAGE_KEYS.ACTIVE_BIKE_ID),
    fuelEntries: JSON.parse(localStorage.getItem(STORAGE_KEYS.FUEL_ENTRIES) || '[]'),
    serviceItems: JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICE_ITEMS) || '[]'),
    serviceLogs: JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICE_LOGS) || '[]'),
    settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}'),
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupJson(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (!Array.isArray(data.bikes)) {
      return false;
    }
    localStorage.setItem(STORAGE_KEYS.BIKES, JSON.stringify(data.bikes));
    if (data.activeBikeId) localStorage.setItem(STORAGE_KEYS.ACTIVE_BIKE_ID, data.activeBikeId);
    if (Array.isArray(data.fuelEntries)) localStorage.setItem(STORAGE_KEYS.FUEL_ENTRIES, JSON.stringify(data.fuelEntries));
    if (Array.isArray(data.serviceItems)) localStorage.setItem(STORAGE_KEYS.SERVICE_ITEMS, JSON.stringify(data.serviceItems));
    if (Array.isArray(data.serviceLogs)) localStorage.setItem(STORAGE_KEYS.SERVICE_LOGS, JSON.stringify(data.serviceLogs));
    if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    return true;
  } catch (e) {
    console.error('Import failed', e);
    return false;
  }
}

export function clearAllStorageData(): void {
  localStorage.removeItem(STORAGE_KEYS.BIKES);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_BIKE_ID);
  localStorage.removeItem(STORAGE_KEYS.FUEL_ENTRIES);
  localStorage.removeItem(STORAGE_KEYS.SERVICE_ITEMS);
  localStorage.removeItem(STORAGE_KEYS.SERVICE_LOGS);
}
