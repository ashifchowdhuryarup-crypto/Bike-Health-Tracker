import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFuelMileages,
  calculateServiceUrgency,
  checkMileageDropAlert,
  calculateMonthlyReports,
  calculateLifetimeStats,
} from './calculations';
import { FuelEntry, ServiceItem, Bike, ServiceLog } from '../types';

test('calculateFuelMileages computes mileage per full fill correctly', () => {
  const entries: FuelEntry[] = [
    {
      id: '1',
      bikeId: 'b1',
      date: '2026-10-01',
      odometer: 10000,
      litres: 10,
      totalPrice: 1250,
      isFullTank: true,
    },
    {
      id: '2',
      bikeId: 'b1',
      date: '2026-10-10',
      odometer: 10400,
      litres: 10, // 400 km on 10 litres = 40 km/l
      totalPrice: 1250,
      isFullTank: true,
    },
    {
      id: '3',
      bikeId: 'b1',
      date: '2026-10-20',
      odometer: 10850,
      litres: 10, // 450 km on 10 litres = 45 km/l
      totalPrice: 1250,
      isFullTank: true,
    },
  ];

  const mileages = calculateFuelMileages(entries);
  assert.equal(mileages.get('1'), null, 'First full-tank entry has no baseline to calculate mileage from');
  assert.equal(mileages.get('2'), 40.0, 'Second full tank is 400 km / 10L = 40 km/l');
  assert.equal(mileages.get('3'), 45.0, 'Third full tank is 450 km / 10L = 45 km/l');
});

test('calculateFuelMileages accounts for intermediate partial fill litres', () => {
  const entries: FuelEntry[] = [
    {
      id: '1',
      bikeId: 'b1',
      date: '2026-10-01',
      odometer: 10000,
      litres: 10,
      totalPrice: 1250,
      isFullTank: true,
    },
    {
      id: '2',
      bikeId: 'b1',
      date: '2026-10-05',
      odometer: 10200,
      litres: 5, // Partial fill
      totalPrice: 625,
      isFullTank: false,
    },
    {
      id: '3',
      bikeId: 'b1',
      date: '2026-10-10',
      odometer: 10600,
      litres: 10, // Full fill. Total fuel consumed since #1 = 5 + 10 = 15L over 600km = 40 km/l
      totalPrice: 1250,
      isFullTank: true,
    },
  ];

  const mileages = calculateFuelMileages(entries);
  assert.equal(mileages.get('1'), null);
  assert.equal(mileages.get('2'), null, 'Partial fills have null mileage');
  assert.equal(mileages.get('3'), 40.0, '600km / 15L = 40 km/l');
});

test('calculateServiceUrgency identifies green, yellow, and red statuses', () => {
  const now = new Date('2026-11-09T00:00:00Z');

  // Case 1: Fresh service, 2500 km interval, 90 days
  const itemGood: ServiceItem = {
    id: 's1',
    bikeId: 'b1',
    nameEn: 'Engine Oil',
    nameBn: 'ইঞ্জিন অয়েল',
    kmInterval: 2500,
    dayInterval: 90,
    lastServiceKm: 10000,
    lastServiceDate: '2026-11-01',
  };
  const urgencyGood = calculateServiceUrgency(itemGood, 10200, now);
  assert.equal(urgencyGood.status, 'green');
  assert.equal(urgencyGood.kmRemaining, 2300);
  assert.equal(urgencyGood.isOverdue, false);

  // Case 2: Due soon by km (under 200 km left)
  const itemDueKm: ServiceItem = {
    id: 's2',
    bikeId: 'b1',
    nameEn: 'Chain Lube',
    nameBn: 'চেইন লুব',
    kmInterval: 600,
    dayInterval: 14,
    lastServiceKm: 10000,
    lastServiceDate: '2026-11-05',
  };
  const urgencyYellow = calculateServiceUrgency(itemDueKm, 10450, now); // 150 km left
  assert.equal(urgencyYellow.status, 'yellow');
  assert.equal(urgencyYellow.kmRemaining, 150);

  // Case 3: Overdue by km
  const itemOverdueKm: ServiceItem = {
    id: 's3',
    bikeId: 'b1',
    nameEn: 'Air Filter',
    nameBn: 'এয়ার ফিল্টার',
    kmInterval: 6000,
    lastServiceKm: 5000,
    lastServiceDate: '2026-01-01',
  };
  const urgencyRedKm = calculateServiceUrgency(itemOverdueKm, 11200, now); // 11000 due, 11200 current -> -200
  assert.equal(urgencyRedKm.status, 'red');
  assert.equal(urgencyRedKm.isOverdue, true);

  // Case 4: Overdue by days even if km is not reached
  const itemOverdueDays: ServiceItem = {
    id: 's4',
    bikeId: 'b1',
    nameEn: 'Engine Oil',
    nameBn: 'ইঞ্জিন অয়েল',
    kmInterval: 2500,
    dayInterval: 90,
    lastServiceKm: 10000,
    lastServiceDate: '2026-05-01', // over 180 days ago
  };
  const urgencyRedDays = calculateServiceUrgency(itemOverdueDays, 10500, now);
  assert.equal(urgencyRedDays.status, 'red');
  assert.equal(urgencyRedDays.isOverdue, true);
});

test('checkMileageDropAlert triggers when latest mileage drops >15%', () => {
  const entries: FuelEntry[] = [
    { id: '1', bikeId: 'b1', date: '2026-09-01', odometer: 10000, litres: 10, totalPrice: 1250, isFullTank: true },
    { id: '2', bikeId: 'b1', date: '2026-09-15', odometer: 10450, litres: 10, totalPrice: 1250, isFullTank: true }, // 45 km/l
    { id: '3', bikeId: 'b1', date: '2026-10-01', odometer: 10900, litres: 10, totalPrice: 1250, isFullTank: true }, // 45 km/l
    { id: '4', bikeId: 'b1', date: '2026-10-20', odometer: 11340, litres: 10, totalPrice: 1250, isFullTank: true }, // 44 km/l
    { id: '5', bikeId: 'b1', date: '2026-11-05', odometer: 11690, litres: 10, totalPrice: 1250, isFullTank: true }, // 35 km/l -> >20% drop from ~44.6
  ];

  const alert = checkMileageDropAlert(entries, new Date('2026-11-09T00:00:00Z'));
  assert.equal(alert.hasAlert, true);
  assert.equal(alert.latestMileage, 35.0);
  assert.ok(alert.dropPercentage > 15, `Drop percentage was ${alert.dropPercentage}%`);
});

test('calculateMonthlyReports aggregates month totals and cost per km', () => {
  const bike: Bike = {
    id: 'b1',
    name: 'Yamaha FZ-S',
    model: '150cc',
    initialOdometer: 10000,
    currentOdometer: 10800,
    createdAt: '2026-09-01',
  };

  const fuelEntries: FuelEntry[] = [
    { id: '1', bikeId: 'b1', date: '2026-10-05', odometer: 10400, litres: 10, totalPrice: 1250, isFullTank: true },
    { id: '2', bikeId: 'b1', date: '2026-10-25', odometer: 10800, litres: 10, totalPrice: 1250, isFullTank: true },
  ];

  const serviceLogs: ServiceLog[] = [
    { id: 's1', bikeId: 'b1', serviceItemId: 'item1', serviceItemName: 'Engine Oil', date: '2026-10-15', odometer: 10600, cost: 750 },
  ];

  const reports = calculateMonthlyReports(fuelEntries, serviceLogs, bike);
  assert.equal(reports.length, 1);
  const oct = reports[0];
  assert.equal(oct.monthKey, '2026-10');
  assert.equal(oct.totalLitres, 20);
  assert.equal(oct.fuelCost, 2500);
  assert.equal(oct.serviceCost, 750);
  assert.equal(oct.totalCost, 3250);
  assert.equal(oct.totalKm, 800); // 10800 - 10000 baseline
  assert.equal(oct.avgMileage, 40.0); // 800 / 20 = 40
  assert.equal(oct.costPerKm, 4.06); // 3250 / 800 = 4.0625 rounded to 4.06
});

test('calculateMonthlyReports accurately computes Gixxer user scenario (8850 to 8995 km)', () => {
  const bike: Bike = {
    id: 'b_gixxer',
    name: 'Gixxer monoton',
    model: '155cc',
    initialOdometer: 0,
    currentOdometer: 8995,
    createdAt: '2026-11-01',
    odometerResetAt: '2026-11-10T12:00:00Z',
  };

  const fuelEntries: FuelEntry[] = [
    { id: 'f1', bikeId: 'b_gixxer', date: '2026-11-01', odometer: 8850, litres: 9.09, totalPrice: 1500, isFullTank: false },
    { id: 'f2', bikeId: 'b_gixxer', date: '2026-11-10', odometer: 8995, litres: 3.0, totalPrice: 495, isFullTank: false },
  ];

  const reports = calculateMonthlyReports(fuelEntries, [], bike);
  assert.equal(reports.length, 1);
  const nov = reports[0];

  assert.equal(nov.monthKey, '2026-11');
  assert.equal(nov.fuelCost, 1995, 'All fuel entries in November must be summed (1500 + 495 = 1995)');
  assert.equal(nov.totalLitres, 12.09, 'Total litres must sum both fills (9.09 + 3.0 = 12.09)');
  assert.equal(nov.totalKm, 145, 'Distance between 8850 and 8995 must be 145 km, never 8995 km');
  assert.equal(nov.avgMileage, 48.3, '145 km / 3.0 L = 48.3 km/L (realistic motorcycle mileage)');
  assert.equal(nov.costPerKm, 3.41, '495 BDT / 145 km = 3.41 BDT/km');

  const lifetime = calculateLifetimeStats(bike, fuelEntries, []);
  assert.equal(lifetime.totalDistance, 145);
  assert.equal(lifetime.totalFuelCost, 1995);
  assert.equal(lifetime.totalLitres, 12.09);
  assert.equal(lifetime.avgMileage, 48.3);
  assert.equal(lifetime.costPerKm, 3.41);
});
