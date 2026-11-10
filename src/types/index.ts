export interface Bike {
  id: string;
  name: string; // e.g. Yamaha FZ-S Fi V3
  model: string; // e.g. 150cc
  registrationNumber?: string; // e.g. Dhaka Metro-HA 12-3456
  initialOdometer: number;
  currentOdometer: number;
  createdAt: string;
  odometerResetAt?: string;
}

export interface FuelPriceSettings {
  octane: number;
  petrol: number;
}

export interface FuelEntry {
  id: string;
  bikeId: string;
  date: string; // YYYY-MM-DD
  odometer: number;
  litres: number;
  unitPrice?: number; // Price per litre in BDT (e.g. 165)
  totalPrice: number; // in BDT ৳
  isFullTank: boolean;
  notes?: string;
  fuelType?: 'Octane' | 'Petrol';
}

export interface ServiceItem {
  id: string;
  bikeId: string;
  nameEn: string;
  nameBn: string;
  kmInterval: number;
  dayInterval?: number; // optional interval in days
  lastServiceKm: number;
  lastServiceDate: string; // YYYY-MM-DD
  isDefault?: boolean;
}

export interface ServiceLog {
  id: string;
  bikeId: string;
  serviceItemId: string;
  serviceItemName: string;
  date: string; // YYYY-MM-DD
  odometer: number;
  cost?: number; // BDT
  notes?: string;
}

export interface MonthlyReport {
  monthKey: string; // YYYY-MM
  monthNameEn: string;
  monthNameBn: string;
  totalKm: number;
  totalLitres: number;
  avgMileage: number; // km/l
  fuelCost: number;
  serviceCost: number;
  totalCost: number;
  costPerKm: number;
}

export type ServiceStatusColor = 'green' | 'yellow' | 'red';

export interface ServiceUrgency {
  item: ServiceItem;
  kmRemaining: number;
  daysRemaining?: number;
  isOverdue: boolean;
  status: ServiceStatusColor;
  urgencyScore: number; // lower means more urgent
  statusTextEn: string;
  statusTextBn: string;
}

export type TabType = 'home' | 'fuel' | 'service' | 'reports';
export type Language = 'bn' | 'en';
export type NumberFormatType = 'bn' | 'en';
