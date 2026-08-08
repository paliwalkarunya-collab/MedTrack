import { AlertOctagon, CalendarClock, CircleAlert, ShieldCheck } from 'lucide-react';

const cardData = [
  ['expired', 'Expired', AlertOctagon, 'rose'],
  ['expiring', 'Expiring Soon', CalendarClock, 'amber'],
  ['critical', 'Critical', CircleAlert, 'orange'],
  ['total', 'Total Tracked', ShieldCheck, 'blue'],
];

const tones = {
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
};

export const ExpirySummaryCards = ({ summary }) => <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{cardData.map(([key, label, Icon, tone]) => <section key={key} className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{summary[key]}</p></div><div className={`rounded-xl p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5" /></div></div><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{key === 'total' ? 'Batches with expiry dates' : 'Based on current inventory'}</p></section>)}</div>;
