import { Download, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { SETTINGS_SCHEMA_VERSION, sanitizeSettings } from '../../utils/settingsStorage';
import { Section } from './SettingsControls';

const downloadBackup = (settings) => {
  const blob = new Blob([JSON.stringify({ type: 'medtrack-settings-backup', version: SETTINGS_SCHEMA_VERSION, exportedAt: new Date().toISOString(), settings }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `medtrack-settings-${new Date().toISOString().slice(0, 10)}.json`; link.click();
  URL.revokeObjectURL(url);
};

export const DataManagement = ({ settings, onImport, onReset, lastSavedAt }) => {
  const fileRef = useRef(null);
  const [message, setMessage] = useState('');
  const importFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) { setMessage('Please choose a JSON backup file.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result));
        if (backup.type !== 'medtrack-settings-backup' || !backup.settings || typeof backup.settings !== 'object') throw new Error('Invalid backup');
        if (!window.confirm('Replace the current settings with this backup? This cannot be undone.')) return;
        onImport(sanitizeSettings(backup.settings)); setMessage('Settings backup imported successfully.');
      } catch { setMessage('This file is not a valid MedTrack settings backup. No data was changed.'); }
    };
    reader.readAsText(file); event.target.value = '';
  };
  return <div className="space-y-6"><Section title="Data management" description="Only persisted MedTrack settings are stored locally in this version. Inventory and purchase data remain session-based."><div className="flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => downloadBackup(settings)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Download className="h-4 w-4" />Export settings backup</button><input ref={fileRef} type="file" accept="application/json,.json" onChange={importFile} className="sr-only" /><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"><Upload className="h-4 w-4" />Import settings backup</button></div>{message && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300" role="status">{message}</p>}</Section><Section title="Danger zone" description="Resetting removes saved settings only. It does not delete inventory, purchases, or bills."><button type="button" onClick={() => { if (window.confirm('Reset all saved settings to their defaults? This cannot be undone.')) { onReset(); setMessage('Settings were reset to defaults.'); } }} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/30"><RotateCcw className="h-4 w-4" />Reset saved settings</button></Section><Section title="System information"><dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Application version</dt><dd className="mt-1 font-semibold text-slate-900 dark:text-white">{import.meta.env.VITE_APP_VERSION || '0.0.0'}</dd></div><div><dt className="text-xs text-slate-500">Storage mode</dt><dd className="mt-1 font-semibold text-slate-900 dark:text-white">Browser local storage</dd></div><div><dt className="text-xs text-slate-500">Settings schema</dt><dd className="mt-1 font-semibold text-slate-900 dark:text-white">v{SETTINGS_SCHEMA_VERSION}</dd></div><div><dt className="text-xs text-slate-500">Last saved</dt><dd className="mt-1 font-semibold text-slate-900 dark:text-white">{lastSavedAt ? new Date(lastSavedAt).toLocaleString() : 'Not yet saved'}</dd></div></dl></Section></div>;
};
