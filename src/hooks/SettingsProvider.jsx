import { useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../api/client';
import { defaultSettings } from '../utils/settingsStorage';
import { SettingsContext } from './settingsContext';

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await settingsApi.get();
      setSettings(data);
      setLastSavedAt(data.updated_at || data.created_at || null);
    } catch (err) {
      console.error('Failed to load settings:', err);
      // Keep default settings on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (nextSettings) => {
    setSaveError('');
    try {
      const updated = await settingsApi.update(nextSettings);
      setSettings(updated);
      setLastSavedAt(updated.updated_at || new Date().toISOString());
      return true;
    } catch (err) {
      setSaveError(err.message || 'Failed to save settings');
      return false;
    }
  };

  const resetSettings = async () => {
    try {
      const updated = await settingsApi.update(defaultSettings);
      setSettings(updated);
      setLastSavedAt(updated.updated_at || new Date().toISOString());
      return true;
    } catch (err) {
      setSaveError(err.message || 'Failed to reset settings');
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      isLoading,
      saveSettings,
      resetSettings,
      lastSavedAt,
      saveError,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};