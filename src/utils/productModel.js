import { MEDICINE_DOSAGE_FORMS } from '../constants/medicineOptions';

const legacyDosageForms = new Set(MEDICINE_DOSAGE_FORMS);

export const getProductType = (product) => product.productType || 'Medicine';

export const getDosageForm = (product) => {
  if (getProductType(product) !== 'Medicine') return '';
  if (product.dosageForm) return product.dosageForm;
  const legacyUnit = product.packaging?.unitType || product.packaging?.inventoryUnit || '';
  return legacyDosageForms.has(legacyUnit) ? legacyUnit : '';
};

export const getPackaging = (product) => ({
  packType: product.packaging?.packType || 'Piece',
  unitType: product.packaging?.unitType ?? product.packaging?.inventoryUnit ?? '',
  unitsPerPack: Number(product.packaging?.unitsPerPack) || 1,
});

export const canSellCompletePack = (product) => product.sellingOptions?.allowSellingByPack !== false;

export const canSellIndividualUnits = (product) => {
  const { unitType, unitsPerPack } = getPackaging(product);
  return Boolean(unitType) && unitsPerPack > 1 && product.sellingOptions?.allowSellingByUnit === true;
};

export const productSearchFields = (product) => [
  product.name,
  product.genericName,
  product.brandName,
  product.barcode,
  product.batchNumber,
  getProductType(product),
  getDosageForm(product),
].filter(Boolean);
