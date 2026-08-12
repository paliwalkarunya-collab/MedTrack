import { useMemo, useState } from 'react';
import { Search, Eye, RotateCcw, MapPin } from 'lucide-react';
import { useReturns } from '../hooks/useReturns';
import { Pagination } from '../components/common/Pagination';

const money = (v) => Number(v || 0).toFixed(2);

const formatLocation = (rackLocation) => {
  if (!rackLocation) return null;
  const parts = rackLocation.split('-');
  if (parts.length === 2) return `Rack ${parts[0]} → Shelf ${parts[1]}`;
  return rackLocation;
};

export const ReturnHistoryPage = () => {
  const { returns } = useReturns();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);
  const size = 8;

  const filtered = useMemo(() => returns.filter((ret) =>
    [ret.returnId, ret.invoiceId, ret.customer?.name, ret.customer?.phone, ret.createdAt,
      ...ret.items.map((i) => i.medicineName), ...ret.items.map((i) => i.batchNumber)]
      .filter(Boolean).some((v) => v.toLowerCase().includes(query.toLowerCase()))
  ), [returns, query]);

  const visible = filtered.slice((page - 1) * size, page * size);

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Return History</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View all processed returns and refunds.</p>
      </div>

      <section className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search return ID, invoice, customer, medicine..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" />
        </div>

        {/* Empty State */}
        {returns.length === 0 && (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <RotateCcw className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No returns have been processed yet.</p>
            <p className="text-xs mt-1">Processed returns will appear here.</p>
          </div>
        )}

        {/* Table */}
        {returns.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">Return ID</th>
                    <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">Invoice</th>
                    <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">Customer</th>
                    <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">Date</th>
                    <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">Refund Method</th>
                    <th className="text-right pb-3 font-semibold text-slate-600 dark:text-slate-400">Refund</th>
                    <th className="text-right pb-3 font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((ret) => (
                    <tr key={ret.returnId} className="border-b border-slate-50 dark:border-slate-800/40">
                      <td className="py-3 font-mono text-xs">{ret.returnId}</td>
                      <td className="py-3 font-mono text-xs">{ret.invoiceId}</td>
                      <td className="py-3">{ret.customer?.name || 'Walk-in'}</td>
                      <td className="py-3 text-xs">{new Date(ret.createdAt).toLocaleDateString()}</td>
                      <td className="py-3">{ret.refundMethod}</td>
                      <td className="py-3 text-right font-semibold text-blue-600 dark:text-blue-400">₹{money(ret.totalRefund)}</td>
                      <td className="py-3">
                        <div className="flex justify-end">
                          <button type="button" onClick={() => setViewing(ret)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(filtered.length / size))} totalItems={filtered.length} pageSize={size} onPageChange={setPage} />
          </>
        )}
      </section>

      {/* Detail Modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setViewing(null)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs" aria-label="Close" />
          <div className="relative w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{viewing.returnId}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Invoice: {viewing.invoiceId} · {viewing.customer?.name || 'Walk-in'} · {viewing.refundMethod}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(viewing.createdAt).toLocaleString()}</p>
              </div>
              <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {viewing.status === 'completed' ? 'Completed' : viewing.status}
              </span>
            </div>

            <div className="mt-5 space-y-2">
              {viewing.items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="text-sm text-slate-900 dark:text-white">{item.medicineName}</strong>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>Batch: <strong>{item.batchNumber}</strong></span>
                        {item.expiryDate && <span>Expiry: {new Date(item.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                        {item.rackLocation && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{formatLocation(item.rackLocation)}</span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-sm text-blue-600 dark:text-blue-400">₹{money(item.refundAmount)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Returned: <strong className="text-slate-700 dark:text-slate-300">{item.returnedQuantity} {item.unitType || 'unit'}(s)</strong>
                    · Rate: ₹{money(item.unitPrice)}/{item.unitType || 'unit'}
                    {item.gst > 0 && <span> · GST: {item.gst}%</span>}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{money(viewing.subtotal)}</span></div>
              <div className="flex justify-between text-sm mt-1"><span>GST</span><span>₹{money(viewing.gstAmount)}</span></div>
              <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                <span>Total Refund</span><span>₹{money(viewing.totalRefund)}</span>
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <button type="button" onClick={() => setViewing(null)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
