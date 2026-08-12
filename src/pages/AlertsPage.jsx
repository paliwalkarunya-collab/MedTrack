import { useState, useMemo } from 'react';
import { useInventory } from '../hooks/useInventory';
import { getDaysRemaining, getExpiryStatus, formatExpiryDate } from '../utils/expiryUtils';
import { ensureProductBatches } from '../utils/fifoBatchUtils';
import { AlertTriangle, Clock, Package, Filter, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AlertsPage = () => {
  const { inventory } = useInventory();
  const [filter, setFilter] = useState('all'); // all, stock, expiry

  const alerts = useMemo(() => {
    const items = [];
    
    inventory.forEach((product) => {
      // Check Low Stock
      const totalUnits = product.stock?.currentPacks * (product.packaging?.unitsPerPack || 1) + (product.stock?.looseUnits || 0);
      const minUnits = product.minStockLevel || 10;
      if (totalUnits <= minUnits) {
        items.push({
          id: `stock-${product.id}`,
          type: 'stock',
          title: 'Low Stock',
          message: `${product.name} is running low on stock.`,
          detail: `${totalUnits} units remaining (Minimum required: ${minUnits})`,
          productId: product.id,
          productName: product.name,
          severity: totalUnits === 0 ? 'critical' : 'warning',
          date: new Date().toISOString()
        });
      }

      // Check Expiry (batches)
      const normalised = ensureProductBatches(product);
      const batches = normalised.batches ?? [];
      
      batches.forEach((batch) => {
        const rawExpiry = batch.expiryDate ?? product.expiryDate;
        if (!rawExpiry || rawExpiry === '2099-12-31') return;
        
        const daysRemaining = getDaysRemaining(rawExpiry);
        const status = getExpiryStatus(daysRemaining);
        
        if (status === 'expired' || status === 'critical' || status === 'expiring') {
          items.push({
            id: `expiry-${product.id}-${batch.id}`,
            type: 'expiry',
            title: status === 'expired' ? 'Medicine Expired' : 'Expiring Soon',
            message: `${product.name} (Batch ${batch.batchNumber || '—'}) ${status === 'expired' ? 'has expired' : 'is expiring soon'}.`,
            detail: `Expiry Date: ${formatExpiryDate(rawExpiry)} (${daysRemaining} days remaining)`,
            productId: product.id,
            productName: product.name,
            severity: status === 'expired' ? 'critical' : status === 'critical' ? 'high' : 'warning',
            date: new Date().toISOString()
          });
        }
      });
    });

    return items.sort((a, b) => {
      const severityWeight = { critical: 3, high: 2, warning: 1 };
      return severityWeight[b.severity] - severityWeight[a.severity];
    });
  }, [inventory]);

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.type === filter);

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">System Alerts</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review items requiring your attention.</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
          <button onClick={() => setFilter('all')} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === 'all' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}>All</button>
          <button onClick={() => setFilter('stock')} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === 'stock' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}>Low Stock</button>
          <button onClick={() => setFilter('expiry')} className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === 'expiry' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}>Expiry</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Filter className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Alerts</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{alerts.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Low Stock</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{alerts.filter(a => a.type === 'stock').length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Expiry Issues</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{alerts.filter(a => a.type === 'expiry').length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/70 dark:border-slate-800/70 overflow-hidden">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <Filter className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-lg font-medium text-slate-900 dark:text-slate-100">No alerts found</p>
            <p className="mt-1">Everything looks good for now.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAlerts.map(alert => (
              <div key={alert.id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex items-start gap-4">
                <div className={`mt-1 p-2 rounded-xl shrink-0 ${
                  alert.severity === 'critical' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                  alert.severity === 'high' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                  'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {alert.type === 'stock' ? <Package className="w-5 h-5" /> : alert.type === 'expiry' && alert.severity === 'critical' ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{alert.title}</h3>
                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{new Date(alert.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{alert.message}</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">{alert.detail}</p>
                </div>
                <div className="hidden sm:block shrink-0 pl-4 border-l border-slate-100 dark:border-slate-800">
                  <Link to={alert.type === 'stock' ? '/inventory' : '/expiry'} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors">
                    View {alert.type === 'stock' ? 'Inventory' : 'Expiry'} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
