import { useState } from 'react';
import { CheckCircle2, Save, Settings2 } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useSidebar } from '../hooks/useSidebarContext';
import { SettingsTabs } from '../components/settings/SettingsTabs';
import { ProfileSettings } from '../components/settings/ProfileSettings';
import { OperationsSettings } from '../components/settings/OperationsSettings';
import { PreferenceSettings } from '../components/settings/PreferenceSettings';
import { DataManagement } from '../components/settings/DataManagement';
import { defaultSettings } from '../utils/settingsStorage';

export const SettingsPage = () => {
  const { settings, saveSettings, resetSettings, lastSavedAt, saveError } = useSettings();
  const { isDarkMode, setDarkMode } = useSidebar();
  const [draft, setDraft] = useState(settings);
  const [activeTab, setActiveTab] = useState('profile');
  const [feedback, setFeedback] = useState('');
  const [errors, setErrors] = useState({});
  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const update = (section, key, value) => setDraft((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
  const save = () => {
    const nextErrors = {};
    if (draft.profile.email && !/^\S+@\S+\.\S+$/.test(draft.profile.email)) nextErrors.email = 'Enter a valid email address.';
    if (draft.inventory.expiryWarningDays < 1) nextErrors.inventory = 'Expiry warning days must be at least 1.';
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    const trimmed = Object.fromEntries(Object.entries(draft).map(([section, values]) => [section, Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]))]));
    if (!saveSettings(trimmed)) { setFeedback('Settings could not be saved. Check your browser storage permissions.'); return; }
    setDraft(trimmed); setFeedback('Settings saved successfully.'); setErrors({});
  };
  const uploadLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 500 * 1024) { setErrors({ logo: 'Use a PNG, JPEG, or WebP image under 500 KB.' }); return; }
    const reader = new FileReader(); reader.onload = () => { update('profile', 'logo', String(reader.result)); setErrors({}); }; reader.readAsDataURL(file);
  };
  const importSettings = (nextSettings) => { saveSettings(nextSettings); setDraft(nextSettings); setFeedback('Settings backup imported successfully.'); };
  const resetAllSettings = () => { resetSettings(); setDraft(defaultSettings); setFeedback('Settings were reset to defaults.'); };
  const content = { profile: <ProfileSettings settings={draft} onChange={update} error={errors} onLogoChange={uploadLogo} />, operations: <OperationsSettings settings={draft} onChange={update} />, notifications: <PreferenceSettings settings={draft} onChange={update} showAppearance={false} />, appearance: <PreferenceSettings settings={draft} onChange={update} isDarkMode={isDarkMode} setDarkMode={setDarkMode} showNotifications={false} />, data: <DataManagement settings={settings} onImport={importSettings} onReset={resetAllSettings} lastSavedAt={lastSavedAt} /> };
  return <div className="space-y-6 pb-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex gap-3"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"><Settings2 className="h-5 w-5" /></div><div><h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage pharmacy preferences, local data, and application appearance.</p></div></div>{isDirty && <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Unsaved changes</span>}</div><SettingsTabs activeTab={activeTab} onChange={setActiveTab} />{(feedback || saveError) && <p role="status" className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${saveError ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}><CheckCircle2 className="h-4 w-4" />{saveError || feedback}</p>}{content[activeTab]}{activeTab !== 'data' && <div className="sticky bottom-4 flex justify-end gap-3 rounded-2xl border border-slate-200/70 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"><button type="button" disabled={!isDirty} onClick={() => { setDraft(settings); setErrors({}); }} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50 dark:text-slate-300">Cancel</button><button type="button" onClick={save} disabled={!isDirty} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"><Save className="h-4 w-4" />Save settings</button></div>}</div>;
};
