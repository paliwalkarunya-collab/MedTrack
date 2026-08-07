import { calculateTotalUnits } from './medicineCalculations';
import { getPackaging } from './productModel';

export const createPurchaseBatch = ({ purchaseId, supplier, product, batchNumber, manufacturingDate, expiryDate, purchasePrice, sellingPrice, gst, quantityPacks }) => {
  const { unitsPerPack } = getPackaging(product);
  const quantityReceived = Number(quantityPacks) * unitsPerPack;
  return {
    id: `${purchaseId}-${batchNumber}`,
    batchNumber,
    manufacturingDate,
    expiryDate,
    purchaseDate: new Date().toISOString(),
    supplierId: supplier.id,
    supplierName: supplier.supplierName,
    purchasePrice: Number(purchasePrice),
    sellingPrice: Number(sellingPrice),
    gst: Number(gst) || 0,
    quantityReceived,
    quantityRemaining: quantityReceived,
    status: 'active',
  };
};

export const receiveStockIntoProduct = (product, batch) => ({
  ...product,
  batches: [...(product.batches || []), batch],
  stock: { ...product.stock, currentPacks: product.stock.currentPacks + batch.quantityReceived / getPackaging(product).unitsPerPack },
  pricing: { ...product.pricing, purchasePricePerPack: batch.purchasePrice, sellingPricePerPack: batch.sellingPrice },
});

export const hasSufficientProductStock = (product, requestedUnits) => calculateTotalUnits(product) >= requestedUnits;
