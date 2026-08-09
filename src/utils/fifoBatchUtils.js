import { calculateTotalUnits } from './medicineCalculations';
import { getPackaging } from './productModel';

const isExpired = (expiryDate, referenceDate = new Date()) => !expiryDate || new Date(expiryDate) < new Date(referenceDate.toDateString());

export const isSellableBatch = (batch, referenceDate) => batch.status === 'active' && batch.quantityRemaining > 0 && !isExpired(batch.expiryDate, referenceDate);

export const createLegacyBatch = (product) => ({
  id: `LEGACY-${product.id}`, batchNumber: product.batchNumber || `LEGACY-${product.id}`,
  manufacturingDate: product.manufacturingDate || '', expiryDate: product.expiryDate || '2099-12-31',
  purchaseDate: product.manufacturingDate || new Date().toISOString(), supplierName: product.supplier || 'Legacy stock',
  purchasePrice: product.pricing.purchasePricePerPack, sellingPrice: product.pricing.sellingPricePerPack, gst: 0,
  quantityReceived: calculateTotalUnits(product), quantityRemaining: calculateTotalUnits(product), status: 'active',
  rackLocation: product.rackLocation || '',
});

export const ensureProductBatches = (product) => product.batches?.length ? product : { ...product, batches: [createLegacyBatch(product)] };

export const allocateFifoBatches = (product, requestedUnits, referenceDate = new Date()) => {
  const batches = ensureProductBatches(product).batches.filter((batch) => isSellableBatch(batch, referenceDate)).sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  let remaining = requestedUnits;
  const allocations = [];
  batches.forEach((batch) => { if (remaining > 0) { const quantitySold = Math.min(batch.quantityRemaining, remaining); allocations.push({ batchId: batch.id, batchNumber: batch.batchNumber, quantitySold, unitPrice: batch.sellingPrice / getPackaging(product).unitsPerPack, sellingPrice: batch.sellingPrice, purchasePrice: batch.purchasePrice, unitCost: batch.purchasePrice / getPackaging(product).unitsPerPack, gst: batch.gst, expiryDate: batch.expiryDate || '', rackLocation: batch.rackLocation || product.rackLocation || '', supplierId: batch.supplierId || '', supplierName: batch.supplierName || '' }); remaining -= quantitySold; } });
  return { isSufficient: remaining === 0, allocations };
};

export const deductFifoBatches = (product, requestedUnits) => {
  const normalizedProduct = ensureProductBatches(product);
  const allocation = allocateFifoBatches(normalizedProduct, requestedUnits);
  if (!allocation.isSufficient) return { product: normalizedProduct, allocation };
  const sold = new Map(allocation.allocations.map((item) => [item.batchId, item.quantitySold]));
  const batches = normalizedProduct.batches.map((batch) => ({ ...batch, quantityRemaining: batch.quantityRemaining - (sold.get(batch.id) || 0) }));
  const remainingUnits = batches.reduce((total, batch) => total + Math.max(0, batch.quantityRemaining), 0);
  const { unitsPerPack } = getPackaging(normalizedProduct);
  return { allocation, product: { ...normalizedProduct, batches, stock: { ...normalizedProduct.stock, currentPacks: Math.floor(remainingUnits / unitsPerPack), looseUnits: remainingUnits % unitsPerPack } } };
};
