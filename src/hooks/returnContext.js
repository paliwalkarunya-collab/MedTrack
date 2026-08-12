import { createContext } from 'react';

export const ReturnContext = createContext({
  returns: [],
  processReturn: () => null,
  getReturnsForInvoice: () => [],
});
