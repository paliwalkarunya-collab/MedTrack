// Pure calculation utilities for the Medicine data model.
// Kept separate from data/UI so the model can later be backed by
// FastAPI/Supabase without touching any consumer of these functions.

export const calculateTotalUnits = (medicine) => {
    const { currentPacks, looseUnits } = medicine.stock;
    const { unitsPerPack } = medicine.packaging;
    return currentPacks * unitsPerPack + looseUnits;
};

export const calculatePricePerUnit = (pricePerPack, unitsPerPack) => {
    if (!unitsPerPack) return 0;
    return Number((pricePerPack / unitsPerPack).toFixed(2));
};

export const calculatePurchasePricePerUnit = (medicine) =>
    calculatePricePerUnit(medicine.pricing.purchasePricePerPack, medicine.packaging.unitsPerPack);

export const calculateSellingPricePerUnit = (medicine) =>
    calculatePricePerUnit(medicine.pricing.sellingPricePerPack, medicine.packaging.unitsPerPack);

export const calculateInventoryValue = (medicine) => {
    const totalUnits = calculateTotalUnits(medicine);
    const pricePerUnit = calculatePurchasePricePerUnit(medicine);
    return Number((totalUnits * pricePerUnit).toFixed(2));
};

export const calculatePotentialRevenue = (medicine) => {
    const totalUnits = calculateTotalUnits(medicine);
    const pricePerUnit = calculateSellingPricePerUnit(medicine);
    return Number((totalUnits * pricePerUnit).toFixed(2));
};

const pluralize = (label, count) => (count === 1 ? label : `${label}s`);

// "24 Strips + 8 Tablets" instead of a raw unit count.
export const formatStockDisplay = (medicine) => {
    const { currentPacks, looseUnits } = medicine.stock;
    const { packType, inventoryUnit } = medicine.packaging;

    const packPart = `${currentPacks} ${pluralize(packType, currentPacks)}`;
    if (looseUnits <= 0) return packPart;

    const unitPart = `${looseUnits} ${pluralize(inventoryUnit, looseUnits)}`;
    return `${packPart} + ${unitPart}`;
};