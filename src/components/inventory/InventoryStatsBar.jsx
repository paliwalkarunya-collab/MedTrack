import { Boxes, AlertTriangle, Clock, XCircle } from 'lucide-react';

export const InventoryStatsBar = ({ total, lowStock, expiring, expired }) => {
    const stats = [
        { label: 'Total Medicines', value: total, icon: Boxes, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60' },
        { label: 'Low Stock', value: lowStock, icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60' },
        { label: 'Expiring Soon', value: expiring, icon: Clock, color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60' },
        { label: 'Expired', value: expired, icon: XCircle, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60' },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={stat.label}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800/70 shadow-xs flex items-center gap-3"
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">{stat.value}</div>
                            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">{stat.label}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};