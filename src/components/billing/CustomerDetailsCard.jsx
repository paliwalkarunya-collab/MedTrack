import { CalendarDays, FileText, UserRound } from 'lucide-react';

const inputClassName = 'w-full px-3 py-2.5 text-sm bg-slate-50/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200/70 dark:border-slate-700/70 focus:border-blue-500/80 focus:outline-none focus:ring-4 focus:ring-blue-500/10';

export const CustomerDetailsCard = ({ billNumber, customer, onChange }) => (
  <section className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center"><UserRound className="w-5 h-5" /></div>
      <div><h3 className="text-base font-bold text-slate-900 dark:text-white">Customer Details</h3><p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enter customer information for this bill.</p></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div><span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Bill Number</span><div className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold bg-slate-50/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200/70 dark:border-slate-700/70"><FileText className="w-4 h-4 text-blue-600" />{billNumber}</div></div>
      <div><span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Date</span><div className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium bg-slate-50/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200/70 dark:border-slate-700/70"><CalendarDays className="w-4 h-4 text-blue-600" />{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
      <label><span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Customer Name</span><input name="name" value={customer.name} onChange={onChange} placeholder="Enter customer name" className={inputClassName} /></label>
      <label><span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone Number</span><input name="phone" value={customer.phone} onChange={onChange} placeholder="Enter phone number" inputMode="tel" className={inputClassName} /></label>
      <label className="sm:col-span-2"><span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Doctor Name <span className="font-normal text-slate-400">(Optional)</span></span><input name="doctor" value={customer.doctor} onChange={onChange} placeholder="Enter doctor name" className={inputClassName} /></label>
    </div>
  </section>
);
