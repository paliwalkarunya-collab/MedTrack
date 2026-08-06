import { Activity, ArrowDownLeft, ArrowUpRight, AlertCircle, Package } from 'lucide-react';

const activities = [
  {
    id: 1,
    title: 'Intake Shipment Received',
    description: '500 units Amoxicillin 500mg (Batch #AMX-882)',
    time: '12 mins ago',
    type: 'inflow',
    icon: ArrowDownLeft,
    iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
  },
  {
    id: 2,
    title: 'Clinic Distribution Logged',
    description: '120 units Paracetamol 650mg to Emergency Ward',
    time: '45 mins ago',
    type: 'outflow',
    icon: ArrowUpRight,
    iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
  },
  {
    id: 3,
    title: 'Low Stock Flagged',
    description: 'Ibuprofen 400mg reached threshold (15 units remaining)',
    time: '2 hours ago',
    type: 'alert',
    icon: AlertCircle,
    iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
  },
  {
    id: 4,
    title: 'New Donation Accepted',
    description: '250 units Multivitamin Syrup from MedAid NGO',
    time: '4 hours ago',
    type: 'inflow',
    icon: Package,
    iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
  },
];

export const RecentActivityPanel = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800/70 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Recent Activity
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Live Feed</span>
        </div>

        <div className="space-y-3.5">
          {activities.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className={`p-2 rounded-xl shrink-0 ${item.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{item.title}</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">{item.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
