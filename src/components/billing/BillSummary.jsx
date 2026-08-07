import { CheckCircle2, RotateCcw, ReceiptText } from 'lucide-react';

const money = (value) => value.toFixed(2);

export const BillSummary = ({ subtotal, totalItems, hasItems, onGenerateBill, onClearCart, successMessage }) => (
  <section className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
    <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center"><ReceiptText className="w-5 h-5" /></div><div><h3 className="text-base font-bold text-slate-900 dark:text-white">Bill Summary</h3><p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Totals update as the cart changes.</p></div></div>
    <div className="space-y-3 text-sm"><div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Total Items</span><span>{totalItems}</span></div><div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-base font-extrabold text-slate-900 dark:text-white"><span>Grand Total</span><span>{money(subtotal)}</span></div></div>
    {successMessage && <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-4 h-4 shrink-0" />{successMessage}</div>}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5"><button type="button" disabled={!hasItems} onClick={onGenerateBill} className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-blue-500/20"><ReceiptText className="w-4 h-4" />Generate Bill</button><button type="button" disabled={!hasItems} onClick={onClearCart} className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"><RotateCcw className="w-4 h-4" />Clear Cart</button></div>
  </section>
);
