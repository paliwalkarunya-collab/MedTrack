import { useState } from 'react';
import { BillingContext } from './billingContext';

export const BillingProvider = ({ children }) => {
  const [invoices, setInvoices] = useState([]);
  const [sequence, setSequence] = useState(1);
  const createInvoice = (invoice) => {
    const invoiceId = `INV-${new Date().getFullYear()}-${String(sequence).padStart(6, '0')}`;
    const nextInvoice = { ...invoice, invoiceId, billNumber: invoice.billNumber, createdAt: new Date().toISOString() };
    setInvoices((items) => [nextInvoice, ...items]);
    setSequence((value) => value + 1);
    return nextInvoice;
  };
  const updateInvoice = (invoiceId, updates) => {
    setInvoices((items) => items.map((inv) => inv.invoiceId === invoiceId ? { ...inv, ...updates } : inv));
  };
  return <BillingContext.Provider value={{ invoices, createInvoice, updateInvoice }}>{children}</BillingContext.Provider>;
};
