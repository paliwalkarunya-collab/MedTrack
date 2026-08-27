import { useState, useEffect, useCallback } from 'react';
import { medicinesApi, batchesApi, categoriesApi } from '../api/client';
import { InventoryContext } from './inventoryContext';

const mapMedicine = (med) => ({
  id: med.id,
  name: med.name,
  genericName: med.generic_name,
  brandName: med.brand_name,
  manufacturer: med.manufacturer,
  dosageForm: med.dosage_form,
  strength: med.strength,
  unit: med.unit,
  description: med.description,
  barcode: med.barcode,
  hsnCode: med.hsn_code,
  gstPercentage: med.gst_percentage,
  isActive: med.is_active,
  categoryId: med.category_id,
  packaging: {
    unitsPerPack: med.units_per_pack || 1,
    packSize: med.pack_size || '1',
  },
  batches: med.inventory_batches?.map(mapBatch) || [],
});

const mapBatch = (batch) => ({
  id: batch.id,
  batchNumber: batch.batch_number,
  expiryDate: batch.expiry_date,
  quantity: batch.quantity,
  quantityRemaining: batch.quantity_remaining ?? batch.quantity,
  purchasePrice: batch.purchase_price,
  sellingPrice: batch.selling_price,
  mrp: batch.mrp,
  isActive: batch.is_active,
});

export const InventoryProvider = ({ children }) => {
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const [medicines, cats] = await Promise.all([
        medicinesApi.list(),
        categoriesApi.list(),
      ]);
      setInventory(medicines.map(mapMedicine));
      setCategories(cats);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const addMedicine = async (medicineData) => {
    const created = await medicinesApi.create(medicineData);
    setInventory(prev => [...prev, mapMedicine(created)]);
    return mapMedicine(created);
  };

  const updateMedicine = async (id, medicineData) => {
    const updated = await medicinesApi.update(id, medicineData);
    setInventory(prev => prev.map(item => item.id === id ? mapMedicine(updated) : item));
    return mapMedicine(updated);
  };

  const deleteMedicine = async (id) => {
    await medicinesApi.delete(id);
    setInventory(prev => prev.filter(item => item.id !== id));
  };

  const addBatch = async (medicineId, batchData) => {
    const created = await batchesApi.create({ ...batchData, medicine_id: medicineId });
    setInventory(prev => prev.map(item => 
      item.id === medicineId 
        ? { ...item, batches: [...item.batches, mapBatch(created)] }
        : item
    ));
    return mapBatch(created);
  };

  const updateBatch = async (medicineId, batchId, batchData) => {
    const updated = await batchesApi.update(batchId, batchData);
    setInventory(prev => prev.map(item => 
      item.id === medicineId 
        ? { ...item, batches: item.batches.map(b => b.id === batchId ? mapBatch(updated) : b) }
        : item
    ));
    return mapBatch(updated);
  };

  const deleteBatch = async (medicineId, batchId) => {
    await batchesApi.delete(batchId);
    setInventory(prev => prev.map(item => 
      item.id === medicineId 
        ? { ...item, batches: item.batches.filter(b => b.id !== batchId) }
        : item
    ));
  };

  const receivePurchase = async (medicineId, batch) => {
    // This would typically be handled via purchase receiving flow
    // For manual receive, add/update batch
    const existing = inventory.find(m => m.id === medicineId)?.batches?.find(b => b.batchNumber === batch.batchNumber);
    if (existing) {
      return updateBatch(medicineId, existing.id, { quantityRemaining: existing.quantityRemaining + batch.quantity });
    } else {
      return addBatch(medicineId, batch);
    }
  };

  return (
    <InventoryContext.Provider value={{
      inventory,
      categories,
      isLoading,
      error,
      addMedicine,
      updateMedicine,
      deleteMedicine,
      addBatch,
      updateBatch,
      deleteBatch,
      receivePurchase,
      refreshInventory: fetchInventory,
    }}>
      {children}
    </InventoryContext.Provider>
  );
};