import { useState, useMemo, useCallback } from 'react';
import { Search, RotateCcw, MapPin, CheckCircle2, AlertTriangle, X, Package } from 'lucide-react';
import { useBillingHistory } from '../hooks/useBillingHistory';
import { useInventory } from '../hooks/useInventory';
import { useReturns } from '../hooks/useReturns';
import { getPackaging } from '../utils/productModel';

const inputClass = 'w-full px-3 py-2.5 text-sm bg-slate-50/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200/70 dark:border-slate-700/70 focus:border-blue-500/80 focus:outline-none focus:ring-4 focus:ring-blue-500/10';
const money = (v) => Number(v || 0).toFixed(2);
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Other'];

const statusBadge = (status) => {
  switch (status) {
    case 'fully-returned': return { label: 'Fully Returned', cls: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/40 border-red-200 dark:border-red-800' };
    case 'partially-returned': return { label: 'Partially Returned', cls: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' };
    default: return { label: 'Completed', cls: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' };
  }
};

const formatLocation = (rackLocation) => {
  if (!rackLocation) return null;
  const parts = rackLocation.split('-');
  if (parts.length === 2) return `Rack ${parts[0]} → Shelf ${parts[1]}`;
  return `Location: ${rackLocation}`;
};

export const ReturnsPage = () => {
  const { invoices, updateInvoice } = useBillingHistory();
  const { inventory, restoreStockForReturn } = useInventory();
  const { processReturn, getReturnsForInvoice } = useReturns();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [error, setError] = useState('');

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return invoices.filter((inv) =>
      [inv.invoiceId, inv.billNumber, inv.customer?.name, inv.customer?.phone, inv.createdAt]
        .filter(Boolean).some((v) => v.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [invoices, searchQuery]);

  const returnableLines = useMemo(() => {
    if (!selectedInvoice) return [];
    const existingReturns = getReturnsForInvoice(selectedInvoice.invoiceId);
    return selectedInvoice.items.flatMap((item) =>
      item.batchUsed.map((batch) => {
        const alreadyReturned = existingReturns
          .flatMap((r) => r.items)
          .filter((ri) => ri.medicineId === item.medicine.id && ri.batchId === batch.batchId)
          .reduce((sum, ri) => sum + ri.returnedQuantity, 0);
        const currentProduct = inventory.find((p) => p.id === item.medicine.id);
        const currentBatch = currentProduct?.batches?.find((b) => b.id === batch.batchId);
        const rackLocation = currentBatch?.rackLocation || batch.rackLocation || item.medicine.rackLocation || '';
        const { unitType } = getPackaging(item.medicine);
        return {
          key: `${item.medicine.id}::${batch.batchId}`,
          medicineId: item.medicine.id,
          medicineName: item.medicine.name,
          batchId: batch.batchId,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate || currentBatch?.expiryDate || '',
          rackLocation,
          unitType: unitType || 'Unit',
          originalQuantity: batch.quantitySold,
          alreadyReturned,
          remainingReturnable: Math.max(0, batch.quantitySold - alreadyReturned),
          unitPrice: batch.unitPrice,
          gst: batch.gst || 0,
          isFullyReturned: batch.quantitySold - alreadyReturned <= 0,
          productExists: !!currentProduct,
          batchExists: !!currentBatch,
        };
      })
    );
  }, [selectedInvoice, getReturnsForInvoice, inventory]);

  const isInvoiceFullyReturned = returnableLines.length > 0 && returnableLines.every((l) => l.isFullyReturned);

  const refundCalc = useMemo(() => {
    let subtotal = 0;
    let gstTotal = 0;
    const items = [];
    returnableLines.forEach((line) => {
      const qty = Number(returnQuantities[line.key]) || 0;
      if (qty > 0 && qty <= line.remainingReturnable && Number.isInteger(qty)) {
        const amount = qty * line.unitPrice;
        const gstAmount = amount * line.gst / 100;
        subtotal += amount;
        gstTotal += gstAmount;
        items.push({ ...line, returnedQuantity: qty, refundAmount: amount + gstAmount });
      }
    });
    return { subtotal, gstTotal, totalRefund: subtotal + gstTotal, items };
  }, [returnableLines, returnQuantities]);

  const validationErrors = useMemo(() => {
    const errors = [];
    returnableLines.forEach((line) => {
      const raw = returnQuantities[line.key];
      if (raw === undefined || raw === '' || raw === '0') return;
      const qty = Number(raw);
      if (Number.isNaN(qty)) errors.push(`${line.medicineName} (${line.batchNumber}): Invalid number.`);
      else if (qty < 0) errors.push(`${line.medicineName} (${line.batchNumber}): Cannot be negative.`);
      else if (qty > line.remainingReturnable) errors.push(`${line.medicineName} (${line.batchNumber}): Exceeds remaining ${line.remainingReturnable}.`);
      else if (!Number.isInteger(qty)) errors.push(`${line.medicineName} (${line.batchNumber}): Must be a whole number.`);
    });
    return errors;
  }, [returnableLines, returnQuantities]);

  const canProcess = refundCalc.items.length > 0 && validationErrors.length === 0;

  const handleSelectInvoice = useCallback((invoice) => {
    setSelectedInvoice(invoice);
    setReturnQuantities({});
    setRefundMethod(invoice.paymentMethod || 'Cash');
    setError('');
    setSuccessResult(null);
  }, []);

  const handleProcessReturn = useCallback(() => {
    if (!canProcess || !selectedInvoice) return;
    const missingItems = refundCalc.items.filter((i) => !i.productExists || !i.batchExists);
    if (missingItems.length > 0) {
      setError(`Cannot process: ${missingItems.map((i) => `${i.medicineName} (${i.batchNumber}) not found in inventory`).join('; ')}.`);
      setShowConfirmation(false);
      return;
    }

    restoreStockForReturn(refundCalc.items.map((i) => ({ medicineId: i.medicineId, batchId: i.batchId, returnedQuantity: i.returnedQuantity })));

    const returnRecord = processReturn({
      invoiceId: selectedInvoice.invoiceId,
      customer: selectedInvoice.customer,
      items: refundCalc.items.map((i) => ({
        medicineId: i.medicineId, medicineName: i.medicineName,
        batchId: i.batchId, batchNumber: i.batchNumber, expiryDate: i.expiryDate,
        rackLocation: i.rackLocation, returnedQuantity: i.returnedQuantity,
        unitPrice: i.unitPrice, gst: i.gst, refundAmount: i.refundAmount, unitType: i.unitType,
      })),
      subtotal: refundCalc.subtotal, gstAmount: refundCalc.gstTotal,
      totalRefund: refundCalc.totalRefund, refundMethod,
    });

    const allReturns = [returnRecord, ...getReturnsForInvoice(selectedInvoice.invoiceId)];
    const isNowFullyReturned = selectedInvoice.items.every((item) =>
      item.batchUsed.every((batch) => {
        const totalReturned = allReturns.flatMap((r) => r.items)
          .filter((ri) => ri.medicineId === item.medicine.id && ri.batchId === batch.batchId)
          .reduce((sum, ri) => sum + ri.returnedQuantity, 0);
        return totalReturned >= batch.quantitySold;
      })
    );
    updateInvoice(selectedInvoice.invoiceId, { returnStatus: isNowFullyReturned ? 'fully-returned' : 'partially-returned' });

    setSuccessResult({ returnRecord, items: refundCalc.items });
    setShowConfirmation(false);
    setSelectedInvoice(null);
    setReturnQuantities({});
    setError('');
  }, [canProcess, selectedInvoice, refundCalc, refundMethod, restoreStockForReturn, processReturn, updateInvoice, getReturnsForInvoice]);

  const handleReset = () => {
    setSelectedInvoice(null);
    setReturnQuantities({});
    setError('');
    setSuccessResult(null);
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Returns &amp; Refunds</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Process returns and issue refunds for completed invoices.</p>
      </div>

      {/* Success Message */}
      {successResult && (
        <section className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-800 shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-200">Return Processed Successfully</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                Return <span className="font-mono font-semibold">{successResult.returnRecord.returnId}</span> for invoice{' '}
                <span className="font-mono font-semibold">{successResult.returnRecord.invoiceId}</span> has been processed.
              </p>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mt-2">
                Refund: ₹{money(successResult.returnRecord.totalRefund)} via {successResult.returnRecord.refundMethod}
              </p>
              <div className="mt-3 space-y-1.5">
                {successResult.items.map((item) => (
                  <div key={item.key} className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/30 rounded-lg px-3 py-2">
                    <strong>{item.returnedQuantity} {item.unitType}(s)</strong> of {item.medicineName} returned to Batch {item.batchNumber}
                    {item.rackLocation && <span> — {formatLocation(item.rackLocation)}</span>}
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleReset} className="mt-4 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors">
                Process Another Return
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Search Invoice */}
      {!selectedInvoice && !successResult && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Find Invoice</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Search by invoice number, customer name, phone, or date.</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search invoice number, customer name, phone..." className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" />
          </div>

          {searchQuery.trim() && (
            <div className="mt-4">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No invoices found matching &ldquo;{searchQuery}&rdquo;</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">Invoice</th>
                        <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">Customer</th>
                        <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">Date</th>
                        <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">Payment</th>
                        <th className="text-right pb-3 font-semibold text-slate-600 dark:text-slate-400">Total</th>
                        <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                        <th className="text-right pb-3 font-semibold text-slate-600 dark:text-slate-400"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map((inv) => {
                        const st = statusBadge(inv.returnStatus);
                        return (
                          <tr key={inv.invoiceId} className="border-b border-slate-50 dark:border-slate-800/40">
                            <td className="py-3 font-mono text-xs">{inv.invoiceId}</td>
                            <td className="py-3">{inv.customer?.name || 'Walk-in'}</td>
                            <td className="py-3 text-xs">{new Date(inv.createdAt).toLocaleDateString()}</td>
                            <td className="py-3">{inv.paymentMethod}</td>
                            <td className="py-3 text-right font-semibold">₹{money(inv.grandTotal)}</td>
                            <td className="py-3"><span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-lg border ${st.cls}`}>{st.label}</span></td>
                            <td className="py-3 text-right">
                              <button type="button" onClick={() => handleSelectInvoice(inv)} disabled={inv.returnStatus === 'fully-returned'}
                                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-slate-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed">
                                {inv.returnStatus === 'fully-returned' ? 'Fully Returned' : 'Select'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Selected Invoice Details */}
      {selectedInvoice && (
        <>
          {/* Invoice Info */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Invoice: {selectedInvoice.invoiceId}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {new Date(selectedInvoice.createdAt).toLocaleString()} · {selectedInvoice.paymentMethod}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(() => { const st = statusBadge(selectedInvoice.returnStatus); return <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${st.cls}`}>{st.label}</span>; })()}
                <button type="button" onClick={handleReset} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl px-3 py-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Customer</span>
                <p className="font-medium text-slate-900 dark:text-white">{selectedInvoice.customer?.name || 'Walk-in Customer'}</p>
              </div>
              <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl px-3 py-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Phone</span>
                <p className="font-medium text-slate-900 dark:text-white">{selectedInvoice.customer?.phone || '—'}</p>
              </div>
              <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl px-3 py-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Grand Total</span>
                <p className="font-medium text-slate-900 dark:text-white">₹{money(selectedInvoice.grandTotal)}</p>
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {/* Fully Returned Banner */}
          {isInvoiceFullyReturned && (
            <div className="flex items-center gap-3 px-5 py-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">This invoice has been fully returned. No further returns are allowed.</p>
            </div>
          )}

          {/* Return Items */}
          {!isInvoiceFullyReturned && (
            <section className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Select Items to Return</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enter the quantity to return for each item.</p>
                </div>
              </div>

              <div className="space-y-3">
                {returnableLines.map((line) => (
                  <div key={line.key} className={`rounded-xl border p-4 transition-colors ${line.isFullyReturned ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 opacity-60' : 'bg-white dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/70'}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Medicine & Batch Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{line.medicineName}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <span>Batch: <strong className="text-slate-700 dark:text-slate-300">{line.batchNumber}</strong></span>
                          {line.expiryDate && <span>Expiry: <strong className="text-slate-700 dark:text-slate-300">{new Date(line.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>}
                          {line.rackLocation && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{formatLocation(line.rackLocation)}
                            </span>
                          )}
                          <span>GST: {line.gst}%</span>
                          <span>Rate: ₹{money(line.unitPrice)}/{line.unitType}</span>
                        </div>
                      </div>

                      {/* Quantities */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <span className="block text-slate-500 dark:text-slate-400 font-medium">Sold</span>
                          <span className="block text-sm font-bold text-slate-900 dark:text-white mt-0.5">{line.originalQuantity}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-slate-500 dark:text-slate-400 font-medium">Returned</span>
                          <span className="block text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">{line.alreadyReturned}</span>
                        </div>
                        <div className="text-center">
                          <span className="block text-slate-500 dark:text-slate-400 font-medium">Remaining</span>
                          <span className="block text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">{line.remainingReturnable}</span>
                        </div>
                      </div>

                      {/* Return Input or Fully Returned Badge */}
                      <div className="w-full lg:w-44 shrink-0">
                        {line.isFullyReturned ? (
                          <div className="text-center py-2.5 px-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">
                            Fully Returned
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Return Qty ({line.unitType})</label>
                            <input
                              type="number" min="0" max={line.remainingReturnable} step="1"
                              value={returnQuantities[line.key] ?? ''}
                              onChange={(e) => setReturnQuantities((prev) => ({ ...prev, [line.key]: e.target.value }))}
                              placeholder={`Max ${line.remainingReturnable}`}
                              className={inputClass}
                            />
                          </div>
                        )}
                      </div>

                      {/* Line Refund */}
                      <div className="w-24 text-right shrink-0">
                        <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Refund</span>
                        <span className="block text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          ₹{money((Number(returnQuantities[line.key]) || 0) * line.unitPrice * (1 + line.gst / 100))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
                  {validationErrors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 py-0.5">
                      <AlertTriangle className="w-3 h-3 shrink-0" />{err}
                    </p>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Refund Summary & Actions */}
          {!isInvoiceFullyReturned && (
            <section className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Refund Method */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Refund Method</label>
                  <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} className={inputClass}>
                    {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                  <p className="text-xs text-slate-400 mt-1.5">Original payment: {selectedInvoice.paymentMethod}</p>
                </div>

                {/* Refund Calculation */}
                <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">₹{money(refundCalc.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">GST</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">₹{money(refundCalc.gstTotal)}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-base font-bold">
                    <span className="text-slate-900 dark:text-white">Total Refund</span>
                    <span className="text-blue-600 dark:text-blue-400">₹{money(refundCalc.totalRefund)}</span>
                  </div>
                  <p className="text-xs text-slate-400">{refundCalc.items.length} item(s) selected for return</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={handleReset} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={() => setShowConfirmation(true)} disabled={!canProcess}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:dark:bg-slate-700 rounded-xl transition-colors disabled:cursor-not-allowed">
                  Process Return
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" onClick={() => setShowConfirmation(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs" aria-label="Close" />
          <div className="relative w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm Return</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Please review the return details before confirming.</p>

            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-500">Invoice</span>
                  <p className="font-mono font-semibold text-slate-900 dark:text-white">{selectedInvoice.invoiceId}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-500">Customer</span>
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedInvoice.customer?.name || 'Walk-in'}</p>
                </div>
              </div>

              <div className="space-y-2">
                {refundCalc.items.map((item) => (
                  <div key={item.key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-slate-900 dark:text-white">{item.medicineName}</strong>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Batch: {item.batchNumber}
                          {item.rackLocation && <span> · {formatLocation(item.rackLocation)}</span>}
                        </p>
                      </div>
                      <span className="font-bold text-blue-600 dark:text-blue-400">₹{money(item.refundAmount)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Returning: <strong className="text-slate-700 dark:text-slate-300">{item.returnedQuantity} {item.unitType}(s)</strong>
                      {item.gst > 0 && <span> · GST: {item.gst}%</span>}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{money(refundCalc.subtotal)}</span></div>
                <div className="flex justify-between text-sm mt-1"><span>GST</span><span>₹{money(refundCalc.gstTotal)}</span></div>
                <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                  <span>Total Refund</span><span>₹{money(refundCalc.totalRefund)}</span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Refund via: {refundMethod}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowConfirmation(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleProcessReturn} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
                Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
