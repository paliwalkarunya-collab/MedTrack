import { Database, ShieldCheck, RefreshCw, Tag } from 'lucide-react';

export const SystemStatusCard = () => {
  const systemDetails = [
    { label: 'Database Status', value: 'Supabase Engine Active', icon: Database, color: 'text-emerald-500' },
    { label: 'Backup Status', value: 'Auto-backup Daily 00:00', icon: ShieldCheck, color: 'text-blue-500' },
    { label: 'Last Sync', value: 'Just now', icon: RefreshCw, color: 'text-indigo-500' },
    { label: 'App Version', value: 'v2.0.4-prod', icon: Tag, color: 'text-slate-400' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800/70 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          System Status
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          100% Operational
        </span>
      </div>

      <div className="space-y-2.5">
        {systemDetails.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span>{item.label}</span>
              </div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
