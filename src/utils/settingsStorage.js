export const SETTINGS_STORAGE_KEY = 'medtrack-settings-v1';
export const SETTINGS_SCHEMA_VERSION = 1;

export const defaultSettings = {
  profile: { businessName: '', ownerName: '', businessType: 'Pharmacy', logo: '', address: '', city: '', state: '', postalCode: '', country: '', phone: '', alternatePhone: '', email: '', website: '' },
  tax: { gstin: '', drugLicenseNumber: '', pan: '', stateGst: '', referenceNumber: '' },
  billing: { invoicePrefix: 'BILL', currencySymbol: '₹', defaultPaymentMethod: 'Cash', footer: '', showPhone: true, showAddress: true, showGstin: true, showDrugLicense: true, showCustomerPhone: true, showDoctor: true, showPaymentMethod: true, showQrCode: false },
  inventory: { lowStockThreshold: 10, expiryWarningDays: 90, defaultSellingMode: 'pack', allowBelowStock: false, defaultPageSize: 8 },
  notifications: { lowStock: true, expiry: true, expired: true, billing: true, system: true },
  appearance: { density: 'comfortable', rememberSidebar: true },
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const mergeSection = (defaults, value) => ({ ...defaults, ...(isPlainObject(value) ? value : {}) });

export const sanitizeSettings = (value) => {
  if (!isPlainObject(value)) return defaultSettings;
  return Object.fromEntries(Object.entries(defaultSettings).map(([key, defaults]) => [key, mergeSection(defaults, value[key])]));
};

export const loadSettings = () => {
  try { return sanitizeSettings(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || 'null')); }
  catch { return defaultSettings; }
};

export const saveStoredSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...settings, schemaVersion: SETTINGS_SCHEMA_VERSION, savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
};
