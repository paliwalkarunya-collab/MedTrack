import { useMemo } from 'react';

export const SupplierSelector = ({ suppliers, value, onChange, required = false, label = 'Supplier' }) => {
  const activeSuppliers = useMemo(() => suppliers.filter((supplier) => supplier.status === 'Active'), [suppliers]);
  return <label><span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{label}{required ? '' : <span className="font-normal text-slate-400"> (Optional)</span>}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full px-3 py-2.5 text-sm bg-slate-50/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200/70 dark:border-slate-700/70 focus:border-blue-500/80 focus:outline-none focus:ring-4 focus:ring-blue-500/10"><option value="">{required ? 'Select supplier' : 'No preferred supplier'}</option>{activeSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplierName} — {supplier.companyName}</option>)}</select></label>;
};
