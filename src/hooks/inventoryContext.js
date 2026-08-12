import { createContext } from 'react';

export const InventoryContext = createContext({
  inventory: [],
  lastBillItems: [],
  addMedicine: () => {},
  updateMedicine: () => {},
  receivePurchase: () => {},
  deductStockForBill: () => {},
  restoreStockForReturn: () => {},
});
