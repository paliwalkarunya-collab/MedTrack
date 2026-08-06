import { PackageCheck, TrendingUp } from 'lucide-react';

export const InventoryHealthCard = () => {
  const totalItems = '1,420';
  const healthyPercentage = 94.2;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800/70 shadow-xs flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Inventory Health
        </span>
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <PackageCheck className="w-5 h-5" />
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {totalItems}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
            <TrendingUp className="w-3.5 h-3.5" />
            +4.5%
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total active SKU medicines</p>
      </div>

      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-slate-600 dark:text-slate-400">Optimal Stock Ratio</span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold">{healthyPercentage}%</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${healthyPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
