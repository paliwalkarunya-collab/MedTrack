import { CheckCircle2, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { statusLabels } from '../../utils/inventoryData';

const statusStyles = {
    healthy: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
    'low-stock': 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
    expiring: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60',
    expired: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60',
};

const statusIcons = {
    healthy: CheckCircle2,
    'low-stock': AlertTriangle,
    expiring: Clock,
    expired: XCircle,
};

export const StockStatusBadge = ({ status }) => {
    const Icon = statusIcons[status] || CheckCircle2;

    return (
        <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md ${statusStyles[status]}`}
        >
            <Icon className="w-3.5 h-3.5" />
            {statusLabels[status]}
        </span>
    );
};