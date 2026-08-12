import { CheckCircle2, ReceiptText, RotateCcw } from 'lucide-react';

const money = (value) => value.toFixed(2);

export const BillSummary = ({ subtotal, totalItems, hasItems, onGenerateBill, onClearCart, successMessage, discount = 0, gst = 0 }) => (
  <section className="bg-white border border-slate-200/80 rounded-lg shadow-sm sticky top-6 h-fit">
    {/* Header */}
    <div className="px-5 py-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center">
          <ReceiptText className="w-4 h-4" />
        </div>
        <h3 className="text-[15px] font-semibold text-slate-900">Summary</h3>
      </div>
    </div>

    {/* Totals */}
    <div className="p-5">
      <div className="space-y-3 text-[13px]">
        <div className="flex justify-between text-slate-500">
          <span>Items</span>
          <span className="font-semibold text-slate-800 tabular-nums">{totalItems}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-800 tabular-nums">Γé╣{money(subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Discount</span>
          <span className="font-semibold text-red-500 tabular-nums">ΓêÆΓé╣{money(discount)}</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>GST / Tax</span>
          <span className="font-semibold text-slate-800 tabular-nums">Γé╣{money(gst)}</span>
        </div>
      </div>

      {/* Grand Total */}
      <div className="mt-5 pt-4 border-t border-slate-200">
        <div className="flex justify-between items-baseline">
          <span className="text-[13px] font-semibold text-slate-900">Grand Total</span>
          <span className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">Γé╣{money(subtotal)}</span>
        </div>
      </div>

      {/* Success */}
      {successMessage && (
        <div className="mt-4 flex items-start gap-2 rounded-md bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-[11px] font-medium text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 mt-0.5" aria-hidden="true" />
          {successMessage}
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 space-y-2.5">
        <button
          type="button"
          disabled={!hasItems}
          onClick={onGenerateBill}
          className="w-full flex items-center justify-center gap-2 h-11 text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-md shadow-sm transition-all duration-150 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:ring-offset-1 cursor-pointer"
        >
          <ReceiptText className="w-4 h-4" aria-hidden="true" />Generate Bill
        </button>
        <button
          type="button"
          disabled={!hasItems}
          onClick={onClearCart}
          className="w-full flex items-center justify-center gap-2 h-9 text-[12px] font-medium text-slate-500 hover:text-slate-700 bg-transparent hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-all duration-150 motion-reduce:transition-none focus:outline-none cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />Clear Cart
        </button>
      </div>
    </div>
  </section>
);
