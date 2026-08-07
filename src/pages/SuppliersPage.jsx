import { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useSuppliers } from '../hooks/useSuppliers';
import { SupplierModal } from '../components/suppliers/SupplierModal';
import { Pagination } from '../components/common/Pagination';

export const SuppliersPage = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const filtered = useMemo(() => suppliers.filter((supplier) => [supplier.supplierName, supplier.companyName, supplier.contactPerson, supplier.gstNumber].filter(Boolean).some((value) => value.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => a.supplierName.localeCompare(b.supplierName)), [query, suppliers]);
  const pageSize = 8;
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const saveSupplier = (supplier) => { if (supplier.id) updateSupplier(supplier); else addSupplier(supplier); setEditing(null); };
  return (
    <div className="space-y-6 pb-6">
      <div>
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-900 dark:text-white">Suppliers</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage supplier records and contact information.</p>
        </div><button type="button" onClick={() => setEditing({})} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl"><Plus className="w-4 h-4" />Add Supplier</button></div>
      </div>
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800/70 shadow-xs"><div className="relative mb-5"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search supplier, company, contact, or GST..." className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700" /></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead><tr className="border-b border-slate-100 dark:border-slate-800"><th className="text-left pb-3">Supplier Name</th><th className="text-left pb-3">Company</th><th className="text-left pb-3">Contact</th><th className="text-left pb-3">Phone</th><th className="text-left pb-3">Status</th><th className="text-right pb-3">Actions</th></tr></thead><tbody>{visible.map((supplier) => <tr key={supplier.id} className="border-b border-slate-50 dark:border-slate-800/40"><td className="py-3 font-semibold text-slate-900 dark:text-white">{supplier.supplierName}</td><td className="py-3">{supplier.companyName}</td><td className="py-3">{supplier.contactPerson}</td><td className="py-3">{supplier.phoneNumber}</td><td className="py-3"><span className={`px-2 py-1 rounded-md text-xs font-semibold ${supplier.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{supplier.status}</span></td><td className="py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => setViewing(supplier)} className="p-1.5 text-slate-400 hover:text-blue-600"><Eye className="w-4 h-4" /></button><button type="button" onClick={() => setEditing(supplier)} className="p-1.5 text-slate-400 hover:text-slate-700"><Pencil className="w-4 h-4" /></button><button type="button" onClick={() => deleteSupplier(supplier.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></div></td></tr>)}</tbody></table></div><Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(filtered.length / pageSize))} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} /></section>
      {editing && <SupplierModal supplier={editing.id ? editing : null} onClose={() => setEditing(null)} onSave={saveSupplier} />}
      {viewing && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button type="button" onClick={() => setViewing(null)} className="absolute inset-0 bg-slate-950/40" /><div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl"><h3 className="text-base font-bold text-slate-900 dark:text-white">Supplier Details</h3><dl className="grid grid-cols-2 gap-4 mt-5 text-sm">{Object.entries(viewing).filter(([key]) => key !== 'id').map(([key, value]) => <div key={key}><dt className="text-xs text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</dt><dd className="mt-1 text-slate-900 dark:text-white break-words">{value || '—'}</dd></div>)}</dl><button type="button" onClick={() => setViewing(null)} className="mt-6 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl">Close</button></div></div>}
    </div>
  );
};
