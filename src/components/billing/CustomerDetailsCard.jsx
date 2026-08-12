import { ArrowRight, CalendarDays, FileText, UserRound } from 'lucide-react';

const inputClassName = 'w-full h-10 px-3 text-[13px] text-slate-900 bg-white border border-slate-200 rounded-md placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all duration-150 motion-reduce:transition-none';
const selectClassName = 'w-full h-10 px-3 text-[13px] text-slate-900 bg-white border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all duration-150 motion-reduce:transition-none appearance-none cursor-pointer';
const readonlyClassName = 'flex items-center gap-2 h-10 px-3 text-[13px] font-medium text-slate-600 bg-slate-50/80 border border-slate-200 rounded-md select-none';

export const CustomerDetailsCard = ({ billNumber, customer, onChange, paymentMethod, onPaymentMethodChange, onContinue }) => (
  <div className="max-w-2xl">
    <section className="bg-white border border-slate-200/80 rounded-lg shadow-sm">
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center">
            <UserRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">Customer Details</h3>
            <p className="text-xs text-slate-500 mt-0.5">Enter customer and bill information.</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <fieldset>
          <legend className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Customer</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs font-medium text-slate-700 mb-1.5">Customer Name <span className="text-red-500">*</span></span>
              <input name="name" value={customer.name} onChange={onChange} placeholder="Enter customer name" className={inputClassName} autoFocus />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-700 mb-1.5">Phone <span className="font-normal text-slate-400">(optional)</span></span>
              <input name="phone" value={customer.phone} onChange={onChange} placeholder="Enter phone number" inputMode="tel" className={inputClassName} />
            </label>
            <label className="block sm:col-span-2">
              <span className="block text-xs font-medium text-slate-700 mb-1.5">Doctor <span className="font-normal text-slate-400">(optional)</span></span>
              <input name="doctor" value={customer.doctor} onChange={onChange} placeholder="Enter prescribing doctor" className={inputClassName} />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Bill</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">Bill Number</span>
              <div className={readonlyClassName}><FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">{billNumber}</span></div>
            </div>
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">Date</span>
              <div className={readonlyClassName}><CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>
            <label className="block">
              <span className="block text-xs font-medium text-slate-700 mb-1.5">Payment</span>
              <select value={paymentMethod} onChange={(event) => onPaymentMethodChange(event.target.value)} className={selectClassName}>
                <option>Cash</option><option>UPI</option><option>Card</option><option>Other</option>
              </select>
            </label>
          </div>
        </fieldset>
      </div>

      <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 rounded-b-lg flex justify-end">
        <button type="button" onClick={onContinue} className="inline-flex items-center justify-center gap-2 h-10 px-5 text-[13px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-sm transition-all duration-150 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:ring-offset-1 cursor-pointer">
          <span>Continue to Billing</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  </div>
);
