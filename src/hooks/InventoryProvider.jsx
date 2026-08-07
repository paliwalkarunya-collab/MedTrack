import { useState } from 'react';
import { medicines } from '../utils/inventoryData';
import { deductMedicineStock } from '../utils/medicineCalculations';
import { receiveStockIntoProduct } from '../utils/purchaseBatchUtils';
import { InventoryContext } from './inventoryContext';

export const InventoryProvider = ({ children }) => {
  const [inventory, setInventory] = useState(() => medicines);

  const addMedicine = (medicine) => setInventory((currentInventory) => [...currentInventory, medicine]);
  const updateMedicine = (medicine) => setInventory((currentInventory) => currentInventory.map((item) => item.id === medicine.id ? medicine : item));
  const receivePurchase = (productId, batch) => setInventory((items) => items.map((item) => item.id === productId ? receiveStockIntoProduct(item, batch) : item));
  const deductStockForBill = (cartItems) => {
    const soldItems = new Map(cartItems.map((item) => [item.medicine.id, item]));
    setInventory((currentInventory) => currentInventory.map((medicine) => {
      const soldItem = soldItems.get(medicine.id);
      return soldItem ? deductMedicineStock(medicine, soldItem.packs, soldItem.looseUnits) : medicine;
    }));
  };

  return <InventoryContext.Provider value={{ inventory, addMedicine, updateMedicine, receivePurchase, deductStockForBill }}>{children}</InventoryContext.Provider>;
};
