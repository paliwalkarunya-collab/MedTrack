import { useState } from 'react';
import { SettingsContext } from './settingsContext';
import { defaultSettings, loadSettings, saveStoredSettings, sanitizeSettings } from '../utils/settingsStorage';

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(loadSettings);
  const [saveError, setSaveError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(() => { try { return JSON.parse(localStorage.getItem('medtrack-settings-v1') || '{}').savedAt || null; } catch { return null; } });
  const saveSettings = (nextSettings) => {
    const clean = sanitizeSettings(nextSettings);
    if (!saveStoredSettings(clean)) { setSaveError('Settings could not be saved because browser storage is unavailable.'); return false; }
    setSettings(clean); setLastSavedAt(new Date().toISOString()); setSaveError(''); return true;
  };
  const resetSettings = () => saveSettings(defaultSettings);
  return <SettingsContext.Provider value={{ settings, saveSettings, resetSettings, lastSavedAt, saveError }}>{children}</SettingsContext.Provider>;
};
