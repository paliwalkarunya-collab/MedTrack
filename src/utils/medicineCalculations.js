import { canSellIndividualUnits, getPackaging } from './productModel';

// Pure calculation utilities for the product data model.
// Kept separate from data/UI so the model can later be backed by
// FastAPI/Supabase without touching any consumer of these functions.

export const calculateTotalUnits = (medicine) => {
    const { currentPacks, looseUnits } = medicine.stock;
    const { unitsPerPack } = getPackaging(medicine);
    return currentPacks * unitsPerPack + looseUnits;
};

export const calculatePricePerUnit = (pricePerPack, unitsPerPack) => {
    if (!unitsPerPack) return 0;
    return Number((pricePerPack / unitsPerPack).toFixed(2));
};

export const calculatePurchasePricePerUnit = (medicine) =>
    calculatePricePerUnit(medicine.pricing.purchasePricePerPack, getPackaging(medicine).unitsPerPack);

export const calculateSellingPricePerUnit = (medicine) =>
    calculatePricePerUnit(medicine.pricing.sellingPricePerPack, getPackaging(medicine).unitsPerPack);

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

export const formatPackagingPreview = (packaging) => {
    const { packType, unitType, unitsPerPack } = getPackaging({ packaging });
    if (!unitType) return `1 ${packType}`;
    const unitLabel = unitType === 'mL' ? unitType : pluralize(unitType, unitsPerPack);
    return `1 ${packType} = ${unitsPerPack} ${unitLabel}`;
};

export const calculateRequestedUnits = (medicine, packs, looseUnits) => (
    Number(packs) * getPackaging(medicine).unitsPerPack + Number(looseUnits)
);

export const calculateRemainingStock = (medicine, packs, looseUnits) => {
    const availableUnits = calculateTotalUnits(medicine);
    const requestedUnits = calculateRequestedUnits(medicine, packs, looseUnits);
    const remainingUnits = availableUnits - requestedUnits;
    const { unitsPerPack } = getPackaging(medicine);

    return {
        availableUnits,
        requestedUnits,
        remainingUnits,
        isSufficient: remainingUnits >= 0,
        currentPacks: Math.floor(Math.max(0, remainingUnits) / unitsPerPack),
        looseUnits: Math.max(0, remainingUnits) % unitsPerPack,
    };
};

export const deductMedicineStock = (medicine, packs, looseUnits) => {
    const remaining = calculateRemainingStock(medicine, packs, looseUnits);
    if (!remaining.isSufficient) return medicine;

    return {
        ...medicine,
        stock: {
            ...medicine.stock,
            currentPacks: remaining.currentPacks,
            looseUnits: remaining.looseUnits,
        },
    };
};

// "24 Strips + 8 Tablets" instead of a raw unit count.
export const formatStockDisplay = (medicine) => {
    const { currentPacks, looseUnits } = medicine.stock;
    const { packType, unitType } = getPackaging(medicine);

    const packPart = `${currentPacks} ${pluralize(packType, currentPacks)}`;
    if (!canSellIndividualUnits(medicine) || looseUnits <= 0) return packPart;

    const unitPart = `${looseUnits} ${pluralize(unitType, looseUnits)}`;
    return `${packPart} + ${unitPart}`;
};
