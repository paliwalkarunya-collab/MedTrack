import { useState, useEffect, useCallback } from 'react';
import { invoicesApi, medicinesApi, batchesApi } from '../api/client';
import { BillingContext } from './billingContext';

const mapInvoice = (inv) => ({
  id: inv.id,
  invoiceId: inv.invoice_number,
  invoiceNumber: inv.invoice_number,
  customerId: inv.customer_id,
  customerName: inv.customer?.name,
  invoiceDate: inv.invoice_date,
  status: inv.status,
  subtotal: inv.subtotal,
  discountAmount: inv.discount_amount,
  taxAmount: inv.tax_amount,
  totalAmount: inv.total_amount,
  notes: inv.notes,
  items: inv.items?.map(item => ({
    id: item.id,
    medicineId: item.medicine_id,
    medicineName: item.medicine?.name || 'Unknown Medicine',
    quantity: item.quantity,
    unitPrice: item.unit_price,
    discountAmount: item.discount_amount,
    taxAmount: item.tax_amount,
    lineTotal: item.line_total,
  })) || [],
});

export const BillingProvider = ({ children }) => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await invoicesApi.list();
      setInvoices(data.map(mapInvoice));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const createInvoice = async (invoiceData) => {
    const payload = {
      invoice_number: invoiceData.invoiceNumber,
      customer_id: invoiceData.customerId,
      invoice_date: invoiceData.invoiceDate,
      notes: invoiceData.notes,
      items: invoiceData.items?.map(item => ({
        medicine_id: item.medicineId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_amount: item.discountAmount,
        tax_amount: item.taxAmount,
      })) || [],
    };
    const created = await invoicesApi.create(payload);
    const mapped = mapInvoice(created);
    setInvoices(prev => [mapped, ...prev]);
    return mapped;
  };

  const updateInvoice = async (id, updates) => {
    const payload = {
      invoice_number: updates.invoiceNumber,
      customer_id: updates.customerId,
      invoice_date: updates.invoiceDate,
      notes: updates.notes,
      items: updates.items?.map(item => ({
        medicine_id: item.medicineId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_amount: item.discountAmount,
        tax_amount: item.taxAmount,
      })) || [],
    };
    const updated = await invoicesApi.update(id, payload);
    const mapped = mapInvoice(updated);
    setInvoices(prev => prev.map(inv => inv.id === id ? mapped : inv));
    return mapped;
  };

  const completeInvoice = async (id) => {
    const completed = await invoicesApi.complete(id);
    const mapped = mapInvoice(completed);
    setInvoices(prev => prev.map(inv => inv.id === id ? mapped : inv));
    return mapped;
  };

  const cancelInvoice = async (id) => {
    const cancelled = await invoicesApi.cancel(id);
    const mapped = mapInvoice(cancelled);
    setInvoices(prev => prev.map(inv => inv.id === id ? mapped : inv));
    return mapped;
  };

  const deleteInvoice = async (id) => {
    await invoicesApi.delete(id);
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  const createCustomer = async (customerData) => {
    return await invoicesApi.createCustomer(customerData);
  };

  const fetchCustomers = async () => {
    try {
      // There's no list customers endpoint, we could add one or get from invoices
      const data = await invoicesApi.list({ page_size: 100 });
      const uniqueCustomers = [...new Map(data.map(inv => inv.customer_id).filter(Boolean).map(id => [id, { id, name: '' }])).values()];
      return uniqueCustomers;
    } catch {
      return [];
    }
  };

  return (
    <BillingContext.Provider value={{
      invoices,
      customers,
      isLoading,
      error,
      createInvoice,
      updateInvoice,
      completeInvoice,
      cancelInvoice,
      deleteInvoice,
      createCustomer,
      fetchCustomers,
      refreshInvoices: fetchInvoices,
    }}>
      {children}
    </BillingContext.Provider>
  );
};