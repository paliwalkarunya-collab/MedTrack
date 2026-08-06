import { Plus, PackagePlus, Truck, Eye, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const QuickActionsPanel = () => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Add Medicine',
      desc: 'Register new stock entry',
      icon: Plus,
      path: '/inventory',
      color: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
    },
    {
      label: 'Receive Stock',
      desc: 'Log incoming shipment',
      icon: PackagePlus,
      path: '/purchases',
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20',
    },
    {
      label: 'New Distribution',
      desc: 'Issue medicine to patient/ward',
      icon: Truck,
      path: '/distribution',
      color: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20',
    },
    {
      label: 'View Inventory',
      desc: 'Browse all medicines & stock',
      icon: Eye,
      path: '/inventory',
      color: 'bg-slate-700 hover:bg-slate-800 text-white shadow-slate-500/20',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800/70 shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Quick Actions
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Shortcuts</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`p-3.5 rounded-xl text-left transition-all duration-150 shadow-sm flex items-start gap-3 group ${action.color}`}
              >
                <div className="p-2 rounded-lg bg-white/20 shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">{action.label}</span>
                  <span className="text-[11px] opacity-90 block truncate mt-0.5">{action.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};