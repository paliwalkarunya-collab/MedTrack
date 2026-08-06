import { AlertTriangle, Clock, XCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CriticalAlertsCard = () => {
  const navigate = useNavigate();

  const alerts = [
    { label: 'Low Stock', count: 18, icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60' },
    { label: 'Expiring Soon', count: 7, icon: Clock, color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60' },
    { label: 'Expired Medicines', count: 3, icon: XCircle, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800/70 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Critical Alerts
          </span>
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-md">
            28 Items Flagged
          </span>
        </div>

        <div className="space-y-2.5">
          {alerts.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.label}</span>
                </div>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => navigate('/alerts')}
        className="w-full mt-4 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition-colors group"
      >
        <span>View All Alerts</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};
