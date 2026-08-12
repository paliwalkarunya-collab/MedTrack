import { AlertTriangle, CheckCircle2, Clock3, XCircle } from 'lucide-react';

const styles = {
  expired: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  critical: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  expiring: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  safe: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
};

const labels = { expired: 'Expired', critical: 'Critical', expiring: 'Expiring soon', safe: 'Safe' };
const icons = { expired: XCircle, critical: AlertTriangle, expiring: Clock3, safe: CheckCircle2 };

export const ExpiryStatusBadge = ({ status }) => {
  const Icon = icons[status] || Clock3;
  return <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold ${styles[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}><Icon className="h-3.5 w-3.5" />{labels[status] || 'Not recorded'}</span>;
};

