import { Building2, CirclePlus, ContactRound } from 'lucide-react';

const placeholderSections = [
  { title: 'Supplier List', description: 'Registered suppliers will be listed here.', icon: Building2 },
  { title: 'Add Supplier', description: 'Supplier registration controls will be available here.', icon: CirclePlus },
  { title: 'Supplier Details', description: 'Selected supplier information will appear here.', icon: ContactRound },
];

export const SuppliersPage = () => {
  return (
    <div className="space-y-6 pb-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Suppliers</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage supplier records and contact information.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {placeholderSections.map(({ title, description, icon: Icon }) => (
          <section key={title} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4"><Icon className="w-5 h-5" /></div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
          </section>
        ))}
      </div>
    </div>
  );
};
