import { createContext } from 'react';
import { defaultSettings } from '../utils/settingsStorage';

export const SettingsContext = createContext({ settings: defaultSettings, saveSettings: () => false, resetSettings: () => false, lastSavedAt: null, saveError: '' });
