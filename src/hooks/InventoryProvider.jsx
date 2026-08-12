import { useState } from 'react';
import { medicines } from '../utils/inventoryData';
import { receiveStockIntoProduct } from '../utils/purchaseBatchUtils';
import { deductFifoBatches, ensureProductBatches } from '../utils/fifoBatchUtils';
import { getPackaging } from '../utils/productModel';
import { InventoryContext } from './inventoryContext';

export const InventoryProvider = ({ children }) => {
  const [inventory, setInventory] = useState(() => medicines.map(ensureProductBatches));
  const [lastBillItems, setLastBillItems] = useState([]);

  const addMedicine = (medicine) => setInventory((currentInventory) => [...currentInventory, medicine]);
  const updateMedicine = (medicine) => setInventory((currentInventory) => currentInventory.map((item) => item.id === medicine.id ? medicine : item));
  const receivePurchase = (productId, batch) => setInventory((items) => items.map((item) => item.id === productId ? receiveStockIntoProduct(item, batch) : item));
  const deductStockForBill = (cartItems) => {
    const billItems = cartItems.map((item) => {
      const medicine = inventory.find((product) => product.id === item.medicine.id);
      const requestedUnits = item.packs * medicine.packaging.unitsPerPack + item.looseUnits;
      return { ...item, batchUsed: deductFifoBatches(medicine, requestedUnits).allocation.allocations };
    });
    const billItemsByProduct = new Map(billItems.map((item) => [item.medicine.id, item]));
    setInventory((items) => items.map((product) => {
      const billItem = billItemsByProduct.get(product.id);
      return billItem ? deductFifoBatches(product, billItem.packs * product.packaging.unitsPerPack + billItem.looseUnits).product : product;
    }));
    setLastBillItems(billItems);
    return billItems;
  };

  const restoreStockForReturn = (returnItems) => {
    // returnItems: [{ medicineId, batchId, returnedQuantity }]
    // Returns an array of batchIds that could not be matched in inventory.
    const byProduct = new Map();
    returnItems.forEach((ri) => {
      if (!byProduct.has(ri.medicineId)) byProduct.set(ri.medicineId, []);
      byProduct.get(ri.medicineId).push(ri);
    });

    const missingBatchIds = [];

    // Verify all batches exist before mutating anything
    byProduct.forEach((restoreList, productId) => {
      const product = inventory.find((p) => p.id === productId);
      restoreList.forEach((ri) => {
        if (!product || !product.batches?.find((b) => b.id === ri.batchId)) {
          missingBatchIds.push(ri.batchId);
        }
      });
    });

    if (missingBatchIds.length > 0) {
      console.error('[restoreStockForReturn] Cannot restore — batches not found:', missingBatchIds);
      return { ok: false, missingBatchIds };
    }

    setInventory((items) => items.map((product) => {
      const restoreList = byProduct.get(product.id);
      if (!restoreList) return product;

      const restoreMap = new Map(restoreList.map((ri) => [ri.batchId, ri.returnedQuantity]));
      const batches = product.batches.map((batch) => {
        const qty = restoreMap.get(batch.id);
        if (!qty) return batch;
        return { ...batch, quantityRemaining: batch.quantityRemaining + qty };
      });

      const remainingUnits = batches.reduce((total, b) => total + Math.max(0, b.quantityRemaining), 0);
      const { unitsPerPack } = getPackaging(product);

      return {
        ...product,
        batches,
        stock: {
          ...product.stock,
          currentPacks: Math.floor(remainingUnits / unitsPerPack),
          looseUnits: remainingUnits % unitsPerPack,
        },
      };
    }));

    return { ok: true, missingBatchIds: [] };
  };

  return <InventoryContext.Provider value={{ inventory, lastBillItems, addMedicine, updateMedicine, receivePurchase, deductStockForBill, restoreStockForReturn }}>{children}</InventoryContext.Provider>;
};
