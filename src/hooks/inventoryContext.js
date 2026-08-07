import { createContext } from 'react';

export const InventoryContext = createContext({
  inventory: [],
  addMedicine: () => {},
  updateMedicine: () => {},
  deductStockForBill: () => {},
});
