import { Language, NumberFormatType } from '../types';

export const BANGLA_DIGITS: { [key: string]: string } = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
  '.': '.',
  ',': ',',
};

export const ENGLISH_DIGITS: { [key: string]: string } = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

export function toBengaliDigits(strOrNum: string | number): string {
  const str = String(strOrNum);
  return str.replace(/[0-9]/g, (match) => BANGLA_DIGITS[match] || match);
}

export function formatNumber(
  num: number | null | undefined,
  lang: Language = 'bn',
  numFormat: NumberFormatType = 'bn',
  decimals: number = 0
): string {
  if (num === null || num === undefined || isNaN(num)) return '-';
  const fixed = decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();
  
  // Format with thousands comma
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = parts.join('.');

  if (lang === 'bn' && numFormat === 'bn') {
    return toBengaliDigits(formatted);
  }
  return formatted;
}

export function formatCurrency(
  amount: number | null | undefined,
  lang: Language = 'bn',
  numFormat: NumberFormatType = 'bn',
  decimals: number = 0
): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '৳০';
  const numStr = formatNumber(amount, lang, numFormat, decimals);
  return `৳${numStr}`;
}

export function formatDate(dateStr: string, lang: Language = 'bn'): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();

  const bnMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  const enMonths = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  if (lang === 'bn') {
    return `${toBengaliDigits(day)} ${bnMonths[month]}, ${toBengaliDigits(year)}`;
  }
  return `${day} ${enMonths[month]} ${year}`;
}

export const translations = {
  bn: {
    // App Header & Branding
    appName: 'বাইক ট্র্যাকার',
    appTagline: 'ফুয়েল মাইলেজ ও সার্ভিস রিমাইন্ডার',
    bike: 'বাইক',
    switchBike: 'বাইক পরিবর্তন',
    addBike: 'নতুন বাইক যোগ করুন',
    odometer: 'ওডোমিটার',
    currentOdo: 'বর্তমান ওডোমিটার',
    km: 'কিমি',
    litres: 'লিটার',
    kmPerLitre: 'কিমি/লিটার',
    bdt: '৳',
    costPerKm: 'প্রতি কিমিতে খরচ',
    thisMonth: 'চলতি মাস',
    lifetime: 'সর্বমোট হিসাব',
    
    // Bottom Navigation
    navHome: 'হোম',
    navFuel: 'ফুয়েল লগ',
    navService: 'সার্ভিসিং',
    navReports: 'রিপোর্ট',
    navSettings: 'সেটিংস',

    // Dashboard
    avgMileage: 'গড় মাইলেজ',
    totalFuelCost: 'ফুয়েল খরচ',
    totalServiceCost: 'সার্ভিস খরচ',
    quickActions: 'দ্রুত অ্যাকশন',
    addFuel: 'ফুয়েল তুলুন',
    markServiceDone: 'সার্ভিস সম্পন্ন',
    serviceReminders: 'সার্ভিস রিমাইন্ডার',
    topReminders: 'জরুরি সার্ভিস রিমাইন্ডার',
    viewAllReminders: 'সব সার্ভিস দেখুন',
    allGood: 'সব সার্ভিস ঠিক আছে! কোনো জরুরি আইটেম নেই।',
    recentFills: 'সাম্প্রতিক ফুয়েল এন্ট্রি',
    noFillsYet: 'এখনও কোনো ফুয়েল এন্ট্রি যোগ করা হয়নি।',
    firstFillHelp: 'আপনার প্রথম ফুয়েল এন্ট্রি যোগ করে মাইলেজ ট্র্যাক করা শুরু করুন।',

    // Fuel Log Screen
    fuelLogTitle: 'ফুয়েল লগ হিস্ট্রি',
    addNewFuel: 'নতুন ফুয়েল যোগ করুন',
    editFuel: 'ফুয়েল এন্ট্রি সম্পাদনা',
    date: 'তারিখ',
    odometerReading: 'ওডোমিটার রিডিং (কিমি)',
    fuelLitres: 'ফুয়েল পরিমাণ (লিটার)',
    totalPrice: 'মোট মূল্য (৳)',
    pricePerLitre: 'প্রতি লিটার মূল্য',
    unitPriceLabel: 'প্রতি লিটার মূল্য (৳/লিটার)',
    unitPriceHelp: 'পরিমাণ লিখলে মোট মূল্য স্বয়ংক্রিয়ভাবে হিসাব হবে',
    fuelPricesSetting: 'ফুয়েলের মূল্য নির্ধারণ (৳/লিটার)',
    octaneRate: 'অকটেন রেট (৳/লিটার)',
    petrolRate: 'পেট্রোল রেট (৳/লিটার)',
    saveAsDefaultPrice: 'এই রেটটি ডিফল্ট হিসেবে সেভ করুন',
    autoCalculatedHint: 'স্বয়ংক্রিয়ভাবে হিসাব করা হয়েছে',
    fuelPriceUpdatedMsg: 'ফুয়েলের মূল্য সফলভাবে আপডেট হয়েছে!',
    fullTankQuestion: 'ট্যাংক কি সম্পূর্ণ ফুল করেছিলেন?',
    fullTankHelp: 'সঠিক মাইলেজ (কিমি/লিটার) হিসাবের জন্য ট্যাংক ফুল মেথড প্রয়োজন।',
    notes: 'নোট (ঐচ্ছিক)',
    fuelType: 'ফুয়েলের ধরন',
    octane: 'অকটেন',
    petrol: 'পেট্রোল',
    saveEntry: 'সংরক্ষণ করুন',
    cancel: 'বাতিল',
    delete: 'মুছে ফেলুন',
    edit: 'সম্পাদনা',
    deleteConfirm: 'আপনি কি নিশ্চিত যে এই এন্ট্রিটি মুছে ফেলতে চান?',
    calculatedMileage: 'মাইলেজ',
    firstEntryBadge: 'প্রথম এন্ট্রি',
    partialFillBadge: 'আংশিক ফিল',
    fullTankBadge: 'ট্যাংক ফুল',
    odoValidationError: 'ওডোমিটার অবশ্যই আগের এন্ট্রির চেয়ে বেশি হতে হবে!',
    invalidInputError: 'দয়া করে সব সঠিক তথ্য পূরণ করুন।',

    // Service Screen
    serviceTitle: 'সার্ভিস ও মেইনটেন্যান্স',
    addCustomService: 'নতুন সার্ভিস আইটেম যোগ করুন',
    editServiceItem: 'সার্ভিস আইটেম সম্পাদনা',
    serviceNameBn: 'সার্ভিসের নাম (বাংলা)',
    serviceNameEn: 'সার্ভিসের নাম (ইংরেজি)',
    kmInterval: 'কত কিমি পর পর সার্ভিস? (কিমি)',
    dayInterval: 'কত দিন পর পর? (ঐচ্ছিক দিন)',
    lastServiceKm: 'শেষ সার্ভিসের ওডোমিটার (কিমি)',
    lastServiceDate: 'শেষ সার্ভিসের তারিখ',
    remainingKm: 'বাকি কিমি',
    remainingDays: 'বাকি দিন',
    overdue: 'মেয়াদ উত্তীর্ণ (ওভারডিউ)',
    dueSoon: 'শীঘ্রই প্রয়োজন',
    inGoodCondition: 'ভালো অবস্থায় আছে',
    markDone: 'সম্পন্ন হয়েছে',
    serviceHistory: 'সার্ভিস হিস্ট্রি',
    noServiceHistory: 'এখনও কোনো সার্ভিসের হিস্ট্রি নেই।',
    serviceCostOptional: 'সার্ভিসের খরচ (৳, ঐচ্ছিক)',
    serviceOdometerInput: 'সার্ভিসের সময় ওডোমিটার (কিমি)',
    serviceDoneSuccess: 'সার্ভিস সফলভাবে আপডেট হয়েছে এবং রিমাইন্ডার রিসেট হয়েছে।',

    // Default service items in Bengali
    engineOil: 'ইঞ্জিন অয়েল',
    chainLube: 'চেইন লুব ও ক্লিন',
    airFilter: 'এয়ার ফিল্টার',
    sparkPlug: 'স্পার্ক প্লাগ',
    brakePads: 'ব্রেক প্যাড / শু',

    // Reports Screen
    reportsTitle: 'মাইলেজ ও খরচের রিপোর্ট',
    monthlySummary: 'মাসিক সারসংক্ষেপ',
    mileageTrend: 'মাইলেজের গ্রাফ (কিমি/লিটার)',
    alertBannerTitle: 'সতর্কতা: মাইলেজ উল্লেখযোগ্যভাবে কমেছে!',
    alertBannerDesc: 'আপনার সর্বশেষ মাইলেজ বিগত ৩ মাসের গড় মাইলেজের তুলনায় ১৫% এর বেশি কমে গেছে। সম্ভব হলে টায়ার প্রেশার, ইঞ্জিন অয়েল বা এয়ার ফিল্টার পরীক্ষা করুন।',
    monthCol: 'মাস',
    kmCol: 'কিমি',
    litresCol: 'লিটার',
    avgMileageCol: 'গড় মাইলেজ',
    fuelCostCol: 'ফুয়েল খরচ',
    serviceCostCol: 'সার্ভিস খরচ',
    costPerKmCol: 'খরচ/কিমি',
    noReportData: 'রিপোর্ট তৈরির জন্য পর্যাপ্ত ফুয়েল ডেটা নেই।',
    totalKmRidden: 'মোট রান',
    totalMoneySpent: 'মোট খরচ',

    // Settings & Onboarding
    settingsTitle: 'সেটিংস ও ডেটা ব্যবস্থাপনা',
    onboardingTitle: 'স্বাগতম! বাইক ট্র্যাকার',
    onboardingSubtitle: 'আপনার বাইকের তথ্য দিয়ে শুরু করুন। সব তথ্য আপনার ফোনেই সুরক্ষিত থাকবে।',
    bikeName: 'বাইকের নাম',
    bikeModel: 'মডেল / সিসি',
    regNumber: 'রেজিস্ট্রেশন নাম্বার (ঐচ্ছিক)',
    initialOdo: 'বর্তমান ওডোমিটার রিডিং (কিমি)',
    startTracking: 'ট্র্যাক করা শুরু করুন',
    languageSetting: 'অ্যাপের ভাষা (Language)',
    numFormatSetting: 'সংখ্যার হরফ (Number Display)',
    themeSetting: 'থিম (Theme)',
    lightMode: 'লাইট মোড',
    darkMode: 'ডার্ক মোড',
    systemMode: 'সিস্টেম থিম',
    bengaliDigits: 'বাংলা সংখ্যা (১২৩৪)',
    englishDigits: 'ইংরেজি সংখ্যা (1234)',
    dataManagement: 'ডেটা ব্যাকআপ ও রিস্টোর',
    exportBackup: 'ব্যাকআপ ডাউনলোড (JSON)',
    importBackup: 'ব্যাকআপ থেকে লোড (JSON)',
    loadDemoData: 'ডেমো ডেটা লোড করুন',
    clearDemoRecords: 'ডেমো রেকর্ড মুছুন',
    clearAllData: 'সব ডেটা মুছে ফেলুন',
    resetConfirm: 'আপনি কি নিশ্চিত? সব বাইক, ফুয়েল ও সার্ভিসের তথ্য মুছে যাবে!',
    demoLoadedMsg: 'ডেমো ডেটা সফলভাবে লোড হয়েছে!',
    demoRecordsCleared: 'সব ডেমো রেকর্ড সফলভাবে মুছে ফেলা হয়েছে!',
    backupDownloadedMsg: 'ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে!',
    importSuccessMsg: 'ডেটা সফলভাবে রিস্টোর হয়েছে!',
    importErrorMsg: 'ভুল ফরম্যাটের ফাইল। সঠিক JSON ব্যাকআপ ফাইল নির্বাচন করুন।',
    bangladeshFriendlyTag: 'বাংলাদেশি বাইকারদের জন্য তৈরি 🇧🇩',
    activeBike: 'বর্তমান বাইক',
    manageBikes: 'বাইক তালিকা',
    // Odometer Reset & Calibration
    resetOdometer: 'ওডোমিটার রিসেট / আপডেট',
    resetOdometerShort: 'ওডো রিসেট',
    resetOdometerTitle: 'ওডোমিটার রিসেট বা পরিবর্তন',
    resetOdometerDesc: 'মিটার পরিবর্তন, রিডিং সংশোধন বা নতুন মিটার বসালে এখান থেকে ওডোমিটার রিসেট করতে পারেন।',
    currentOdoReading: 'বর্তমান ওডোমিটার:',
    newOdometerValue: 'নতুন ওডোমিটার রিডিং (কিমি) *',
    resetToZeroPill: '০ কিমি (নতুন মিটার)',
    plus100Km: '+১০০ কিমি',
    plus500Km: '+৫০০ কিমি',
    adjustServiceReminders: 'সার্ভিস রিমাইন্ডারগুলো নতুন ওডোমিটার অনুযায়ী সমন্বয় করুন',
    adjustServiceRemindersHelp: 'এটি সক্রিয় রাখলে ইঞ্জিন অয়েল, চেইন লুব ইত্যাদির সার্ভিস হিসাব নতুন ওডোমিটার থেকে কাউন্ট হবে।',
    clearPriorFuelLogs: 'পূর্বের ফুয়েল লগ মুছে নতুনভাবে শুরু করুন (ঐচ্ছিক)',
    clearPriorFuelLogsHelp: 'পুরনো ফুয়েল ডেটা মুছে দিয়ে নতুন ওডোমিটার থেকে ফ্রেশ শুরু করতে চাইলে টিক দিন।',
    odometerResetSuccess: 'ওডোমিটার সফলভাবে আপডেট / রিসেট করা হয়েছে!',
    confirmResetBtn: 'ওডোমিটার আপডেট করুন',
  },
  en: {
    // App Header & Branding
    appName: 'Bike Tracker',
    appTagline: 'Fuel Mileage & Service Reminders',
    bike: 'Bike',
    switchBike: 'Switch Bike',
    addBike: 'Add New Bike',
    odometer: 'Odometer',
    currentOdo: 'Current Odometer',
    km: 'km',
    litres: 'Litres',
    kmPerLitre: 'km/L',
    bdt: '৳',
    costPerKm: 'Cost per km',
    thisMonth: 'This Month',
    lifetime: 'Lifetime Stats',

    // Bottom Navigation
    navHome: 'Home',
    navFuel: 'Fuel Log',
    navService: 'Service',
    navReports: 'Reports',
    navSettings: 'Settings',

    // Dashboard
    avgMileage: 'Avg Mileage',
    totalFuelCost: 'Fuel Cost',
    totalServiceCost: 'Service Cost',
    quickActions: 'Quick Actions',
    addFuel: 'Add Fuel',
    markServiceDone: 'Mark Service Done',
    serviceReminders: 'Service Reminders',
    topReminders: 'Urgent Service Reminders',
    viewAllReminders: 'View All Services',
    allGood: 'All services in order! No urgent items.',
    recentFills: 'Recent Fuel Entries',
    noFillsYet: 'No fuel entries added yet.',
    firstFillHelp: 'Log your first fuel fill to start tracking mileage and costs.',

    // Fuel Log Screen
    fuelLogTitle: 'Fuel History',
    addNewFuel: 'Add Fuel Fill',
    editFuel: 'Edit Fuel Entry',
    date: 'Date',
    odometerReading: 'Odometer Reading (km)',
    fuelLitres: 'Fuel Quantity (Litres)',
    totalPrice: 'Total Price (৳)',
    pricePerLitre: 'Price per Litre',
    unitPriceLabel: 'Price per Litre (৳/L)',
    unitPriceHelp: 'Total price auto-calculates as you type quantity',
    fuelPricesSetting: 'Fuel Price Rates (৳/L)',
    octaneRate: 'Octane Rate (৳/L)',
    petrolRate: 'Petrol Rate (৳/L)',
    saveAsDefaultPrice: 'Save this rate as default',
    autoCalculatedHint: 'Auto-calculated',
    fuelPriceUpdatedMsg: 'Fuel price updated successfully!',
    fullTankQuestion: 'Was the tank filled up to full?',
    fullTankHelp: 'Full tank fills allow accurate calculated km/L mileage.',
    notes: 'Notes (Optional)',
    fuelType: 'Fuel Type',
    octane: 'Octane',
    petrol: 'Petrol',
    saveEntry: 'Save Entry',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    deleteConfirm: 'Are you sure you want to delete this fuel entry?',
    calculatedMileage: 'Mileage',
    firstEntryBadge: 'First Fill',
    partialFillBadge: 'Partial',
    fullTankBadge: 'Full Tank',
    odoValidationError: 'Odometer must be greater than previous entry!',
    invalidInputError: 'Please fill in all required fields with valid numbers.',

    // Service Screen
    serviceTitle: 'Service & Maintenance',
    addCustomService: 'Add Custom Service Item',
    editServiceItem: 'Edit Service Item',
    serviceNameBn: 'Service Name (Bangla)',
    serviceNameEn: 'Service Name (English)',
    kmInterval: 'KM Interval (Every X km)',
    dayInterval: 'Day Interval (Optional days)',
    lastServiceKm: 'Last Service Odometer (km)',
    lastServiceDate: 'Last Service Date',
    remainingKm: 'Remaining KM',
    remainingDays: 'Remaining Days',
    overdue: 'Overdue',
    dueSoon: 'Due Soon',
    inGoodCondition: 'Good Condition',
    markDone: 'Mark Done',
    serviceHistory: 'Service History',
    noServiceHistory: 'No service history recorded yet.',
    serviceCostOptional: 'Service Cost (৳, optional)',
    serviceOdometerInput: 'Service Odometer (km)',
    serviceDoneSuccess: 'Service successfully logged and reminder reset.',

    // Default service items in English
    engineOil: 'Engine Oil',
    chainLube: 'Chain Lube & Clean',
    airFilter: 'Air Filter',
    sparkPlug: 'Spark Plug',
    brakePads: 'Brake Pads / Shoes',

    // Reports Screen
    reportsTitle: 'Reports & Mileage Analytics',
    monthlySummary: 'Monthly Summary',
    mileageTrend: 'Mileage Trend (km/L)',
    alertBannerTitle: 'Alert: Significant Mileage Drop!',
    alertBannerDesc: 'Your latest mileage dropped more than 15% below your 3-month average. Consider checking tyre pressure, spark plug, or air filter.',
    monthCol: 'Month',
    kmCol: 'KM',
    litresCol: 'Litres',
    avgMileageCol: 'Avg km/L',
    fuelCostCol: 'Fuel Cost',
    serviceCostCol: 'Service Cost',
    costPerKmCol: 'Cost/km',
    noReportData: 'Not enough fuel data to generate reports.',
    totalKmRidden: 'Total Distance',
    totalMoneySpent: 'Total Spent',

    // Settings & Onboarding
    settingsTitle: 'Settings & Data',
    onboardingTitle: 'Welcome to Bike Tracker',
    onboardingSubtitle: 'Enter your motorcycle details to get started. Data is saved privately on your device.',
    bikeName: 'Bike Name',
    bikeModel: 'Model / CC',
    regNumber: 'Registration No. (Optional)',
    initialOdo: 'Current Odometer (km)',
    startTracking: 'Start Tracking',
    languageSetting: 'Language',
    numFormatSetting: 'Number Display',
    themeSetting: 'Theme',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    systemMode: 'System',
    bengaliDigits: 'Bengali Digits (১২৩৪)',
    englishDigits: 'English Digits (1234)',
    dataManagement: 'Backup & Restore',
    exportBackup: 'Export Backup (JSON)',
    importBackup: 'Import Backup (JSON)',
    loadDemoData: 'Load Sample Demo Data',
    clearDemoRecords: 'Clear Demo Records',
    clearAllData: 'Clear All Data',
    resetConfirm: 'Are you sure? All bikes, fuel entries, and service logs will be permanently deleted!',
    demoLoadedMsg: 'Sample demo data successfully loaded!',
    demoRecordsCleared: 'All sample demo records have been cleared!',
    backupDownloadedMsg: 'Backup JSON downloaded successfully!',
    importSuccessMsg: 'Backup successfully restored!',
    importErrorMsg: 'Invalid backup file format.',
    bangladeshFriendlyTag: 'Crafted for bikers in Bangladesh 🇧🇩',
    activeBike: 'Active Bike',
    manageBikes: 'Manage Bikes',
    // Odometer Reset & Calibration
    resetOdometer: 'Reset / Update Odometer',
    resetOdometerShort: 'Reset Odo',
    resetOdometerTitle: 'Reset or Update Odometer',
    resetOdometerDesc: 'Calibrate or reset your odometer if you replaced the meter console, corrected an entry, or started fresh.',
    currentOdoReading: 'Current Odometer:',
    newOdometerValue: 'New Odometer Reading (km) *',
    resetToZeroPill: '0 km (New Meter)',
    plus100Km: '+100 km',
    plus500Km: '+500 km',
    adjustServiceReminders: 'Adjust service reminders to new odometer',
    adjustServiceRemindersHelp: 'When enabled, baseline for engine oil, chain lube, etc. will calibrate forward from this new reading.',
    clearPriorFuelLogs: 'Clear previous fuel logs and start fresh (optional)',
    clearPriorFuelLogsHelp: 'Check this if you want to wipe old fuel entries and start fresh with the new odometer.',
    odometerResetSuccess: 'Odometer successfully reset / updated!',
    confirmResetBtn: 'Update Odometer',
  },
};
