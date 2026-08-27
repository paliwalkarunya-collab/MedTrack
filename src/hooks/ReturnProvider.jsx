import { useState, useEffect, useCallback } from 'react';
import { returnsApi, invoicesApi } from '../api/client';
import { ReturnContext } from './returnContext';

const mapReturn = (ret) => ({
  id: ret.id,
  returnId: ret.return_number,
  invoiceId: ret.invoice_id,
  invoiceNumber: ret.invoice?.invoice_number,
  customerId: ret.customer_id,
  customerName: ret.customer?.name,
  status: ret.status,
  refundAmount: ret.refund_amount,
  reason: ret.reason,
  notes: ret.notes,
  createdAt: ret.created_at,
  items: ret.items?.map(item => ({
    id: item.id,
    invoiceItemId: item.invoice_item_id,
    medicineId: item.medicine_id,
    medicineName: item.medicine?.name || 'Unknown Medicine',
    quantity: item.quantity,
    unitRefundPrice: item.unit_refund_price,
    refundDiscountAmount: item.refund_discount_amount,
    refundTaxAmount: item.refund_tax_amount,
    lineRefundAmount: item.line_refund_amount,
  })) || [],
});

export const ReturnProvider = ({ children }) => {
  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReturns = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await returnsApi.list();
      setReturns(data.map(mapReturn));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const processReturn = async (returnData) => {
    const payload = {
      invoice_id: returnData.invoiceId,
      items: returnData.items?.map(item => ({
        invoice_item_id: item.invoiceItemId,
        quantity: item.quantity,
      })) || [],
      reason: returnData.reason,
      notes: returnData.notes,
    };
    const draft = await returnsApi.create(payload);
    const completed = await returnsApi.complete(draft.id);
    const mapped = mapReturn(completed);
    setReturns(prev => [mapped, ...prev]);
    return mapped;
  };

  const getReturnsForInvoice = (invoiceId) => returns.filter(r => r.invoiceId === invoiceId);

  return (
    <ReturnContext.Provider value={{
      returns,
      isLoading,
      error,
      processReturn,
      getReturnsForInvoice,
      refreshReturns: fetchReturns,
    }}>
      {children}
    </ReturnContext.Provider>
  );
};