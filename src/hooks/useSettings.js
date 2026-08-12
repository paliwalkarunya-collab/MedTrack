import { useContext } from 'react';
import { SettingsContext } from './settingsContext';

export const useSettings = () => useContext(SettingsContext);
