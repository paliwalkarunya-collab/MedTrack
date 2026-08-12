import { Package, Layers, AlertTriangle, Clock } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { getDaysRemaining, getExpiryStatus } from '../../utils/expiryUtils';
import { ensureProductBatches } from '../../utils/fifoBatchUtils';
import { useMemo } from 'react';

export const InventoryOverviewCard = () => {
  const { inventory } = useInventory();

  const statsObj = useMemo(() => {
    let categories = new Set();
    let lowStock = 0;
    let expiringSoon = 0;

    inventory.forEach((product) => {
      if (product.category) categories.add(product.category);

      const totalUnits = product.stock?.currentPacks * (product.packaging?.unitsPerPack || 1) + (product.stock?.looseUnits || 0);
      const minUnits = product.minStockLevel || 10;
      if (totalUnits <= minUnits) lowStock++;

      const normalised = ensureProductBatches(product);
      const batches = normalised.batches ?? [];
      
      batches.forEach((batch) => {
        const rawExpiry = batch.expiryDate ?? product.expiryDate;
        if (!rawExpiry || rawExpiry === '2099-12-31') return;
        const status = getExpiryStatus(getDaysRemaining(rawExpiry));
        if (status === 'critical' || status === 'expiring') expiringSoon++;
      });
    });

    return { total: inventory.length, categories: categories.size, lowStock, expiringSoon };
  }, [inventory]);

  const stats = [
    { label: 'Total Medicines', value: statsObj.total.toString(), icon: Package, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60' },
    { label: 'Categories', value: statsObj.categories.toString(), icon: Layers, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60' },
    { label: 'Low Stock', value: statsObj.lowStock.toString(), icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60' },
    { label: 'Expiring Soon', value: statsObj.expiringSoon.toString(), icon: Clock, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800/70 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Inventory Overview
        </span>
        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md">
          Live SKU Summary
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`p-1.5 rounded-lg shrink-0 ${item.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{item.label}</span>
              </div>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
