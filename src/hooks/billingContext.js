import { createContext } from 'react';

export const BillingContext = createContext({ invoices: [], createInvoice: () => null, updateInvoice: () => {} });
