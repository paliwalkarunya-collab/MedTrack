import { useState, useEffect, useCallback } from 'react';
import { purchasesApi, suppliersApi, medicinesApi, batchesApi } from '../api/client';
import { PurchaseContext } from './purchaseContext';

const mapPurchase = (pur) => ({
  id: pur.id,
  supplierId: pur.supplier_id,
  supplierName: pur.supplier?.name || 'Unknown Supplier',
  invoiceNumber: pur.invoice_number,
  invoiceDate: pur.invoice_date,
  receivedDate: pur.received_date,
  status: pur.status,
  subtotal: pur.subtotal,
  taxAmount: pur.tax_amount,
  discountAmount: pur.discount_amount,
  totalAmount: pur.total_amount,
  notes: pur.notes,
  items: pur.items?.map(item => ({
    id: item.id,
    medicineId: item.medicine_id,
    medicineName: item.medicine?.name || 'Unknown Medicine',
    batchNumber: item.batch_number,
    expiryDate: item.expiry_date,
    quantity: item.quantity,
    purchasePrice: item.purchase_price,
    sellingPrice: item.selling_price,
    mrp: item.mrp,
    gstPercentage: item.gst_percentage,
    discountAmount: item.discount_amount,
    lineTotal: item.line_total,
  })) || [],
});

export const PurchaseProvider = ({ children }) => {
  const [purchases, setPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPurchases = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await purchasesApi.list();
      setPurchases(data.map(mapPurchase));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const recordPurchase = async (purchaseData) => {
    const payload = {
      supplier_id: purchaseData.supplierId,
      invoice_number: purchaseData.invoiceNumber,
      invoice_date: purchaseData.invoiceDate,
      received_date: purchaseData.receivedDate,
      notes: purchaseData.notes,
      items: purchaseData.items?.map(item => ({
        medicine_id: item.medicineId,
        batch_number: item.batchNumber,
        expiry_date: item.expiryDate,
        quantity: item.quantity,
        purchase_price: item.purchasePrice,
        selling_price: item.sellingPrice,
        mrp: item.mrp,
        gst_percentage: item.gstPercentage,
        discount_amount: item.discountAmount,
        line_total: item.lineTotal || item.quantity * item.purchasePrice,
      })) || [],
    };
    const created = await purchasesApi.create(payload);
    const mapped = mapPurchase(created);
    setPurchases(prev => [mapped, ...prev]);
    return mapped;
  };

  const receivePurchase = async (id) => {
    const received = await purchasesApi.receive(id);
    const mapped = mapPurchase(received);
    setPurchases(prev => prev.map(p => p.id === id ? mapped : p));
    return mapped;
  };

  const updatePurchase = async (id, purchaseData) => {
    const payload = {
      invoice_number: purchaseData.invoiceNumber,
      invoice_date: purchaseData.invoiceDate,
      received_date: purchaseData.receivedDate,
      notes: purchaseData.notes,
      items: purchaseData.items?.map(item => ({
        medicine_id: item.medicineId,
        batch_number: item.batchNumber,
        expiry_date: item.expiryDate,
        quantity: item.quantity,
        purchase_price: item.purchasePrice,
        selling_price: item.sellingPrice,
        mrp: item.mrp,
        gst_percentage: item.gstPercentage,
        discount_amount: item.discountAmount,
        line_total: item.lineTotal || item.quantity * item.purchasePrice,
      })) || [],
    };
    const updated = await purchasesApi.update(id, payload);
    const mapped = mapPurchase(updated);
    setPurchases(prev => prev.map(p => p.id === id ? mapped : p));
    return mapped;
  };

  const deletePurchase = async (id) => {
    await purchasesApi.delete(id);
    setPurchases(prev => prev.filter(p => p.id !== id));
  };

  return (
    <PurchaseContext.Provider value={{
      purchases,
      isLoading,
      error,
      recordPurchase,
      receivePurchase,
      updatePurchase,
      deletePurchase,
      refreshPurchases: fetchPurchases,
    }}>
      {children}
    </PurchaseContext.Provider>
  );
};