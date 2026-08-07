import { useState } from 'react';
import { X, PackagePlus } from 'lucide-react';
import { categories } from '../../utils/inventoryData';
import { MEDICINE_DOSAGE_FORMS, PRODUCT_TYPES, UNIT_TYPES, PACKAGING_TYPES } from '../../constants/medicineOptions';
import { formatPackagingPreview } from '../../utils/medicineCalculations';
import { getDosageForm, getPackaging, getProductType } from '../../utils/productModel';
import { BarcodeScannerField } from '../common/BarcodeScannerField';
import { SupplierSelector } from '../common/SupplierSelector';
import { useSuppliers } from '../../hooks/useSuppliers';

const initialForm = {
  productType: 'Medicine', dosageForm: '', name: '', genericName: '', brandName: '', manufacturer: '', category: '', supplier: '', preferredSupplierId: '',
  batchNumber: '', manufacturingDate: '', expiryDate: '', rackLocation: '', barcode: '',
  packType: 'Strip', unitType: 'Tablet', unitsPerPack: '', currentPacks: '', looseUnits: '',
  reorderLevel: '', purchasePricePerPack: '', sellingPricePerPack: '', allowSellingByPack: true,
  allowSellingByUnit: true, description: '',
};

const inputClassName = 'w-full px-3 py-2.5 text-sm bg-slate-50/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200/70 dark:border-slate-700/70 focus:border-blue-500/80 focus:outline-none focus:ring-4 focus:ring-blue-500/10';
const labelClassName = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5';

const medicineToForm = (medicine) => medicine ? {
  productType: getProductType(medicine), dosageForm: getDosageForm(medicine), name: medicine.name, genericName: medicine.genericName, brandName: medicine.brandName,
  manufacturer: medicine.manufacturer, category: medicine.category, supplier: medicine.supplier, preferredSupplierId: medicine.preferredSupplierId || '',
  batchNumber: medicine.batchNumber, manufacturingDate: medicine.manufacturingDate,
  expiryDate: medicine.expiryDate, rackLocation: medicine.rackLocation, barcode: medicine.barcode,
  packType: getPackaging(medicine).packType, unitType: getPackaging(medicine).unitType,
  unitsPerPack: String(getPackaging(medicine).unitsPerPack), currentPacks: String(medicine.stock.currentPacks),
  looseUnits: String(medicine.stock.looseUnits), reorderLevel: String(medicine.stock.reorderLevel),
  purchasePricePerPack: String(medicine.pricing.purchasePricePerPack), sellingPricePerPack: String(medicine.pricing.sellingPricePerPack),
  allowSellingByPack: medicine.sellingOptions.allowSellingByPack, allowSellingByUnit: medicine.sellingOptions.allowSellingByUnit,
  description: medicine.description,
} : initialForm;

export const AddMedicineModal = ({ isOpen, onClose, onSave, existingMedicines, medicine = null }) => {
  const { suppliers } = useSuppliers();
  const [form, setForm] = useState(() => medicineToForm(medicine));
  const [errors, setErrors] = useState({});
  const isEditing = medicine !== null;

  const packagingPreview = formatPackagingPreview({
    packType: form.packType,
    unitType: form.unitType,
    unitsPerPack: Number(form.unitsPerPack) || 0,
  });

  if (!isOpen) return null;

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: type === 'checkbox' ? checked : value, ...(name === 'productType' && value !== 'Medicine' ? { dosageForm: '' } : {}) }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: undefined }));
  };

  const updateBarcode = (barcode) => {
    setForm((currentForm) => ({ ...currentForm, barcode }));
    setErrors((currentErrors) => ({ ...currentErrors, barcode: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    const requiredFields = ['productType', 'name', 'genericName', 'manufacturer', 'category', 'batchNumber', 'manufacturingDate', 'expiryDate', 'rackLocation', 'packType', 'unitsPerPack', 'currentPacks', 'reorderLevel', 'purchasePricePerPack', 'sellingPricePerPack'];
    requiredFields.forEach((field) => {
      if (String(form[field]).trim() === '') nextErrors[field] = 'This field is required.';
    });

    const unitsPerPack = Number(form.unitsPerPack);
    const looseUnits = Number(form.looseUnits);
    if (form.unitsPerPack !== '' && unitsPerPack <= 0) nextErrors.unitsPerPack = 'Must be greater than 0.';
    if (form.allowSellingByUnit && form.looseUnits === '') nextErrors.looseUnits = 'This field is required.';
    if (form.allowSellingByUnit && form.looseUnits !== '' && looseUnits > unitsPerPack) nextErrors.looseUnits = 'Cannot exceed units per pack.';
    if (form.purchasePricePerPack !== '' && Number(form.purchasePricePerPack) <= 0) nextErrors.purchasePricePerPack = 'Must be greater than 0.';
    if (form.sellingPricePerPack !== '' && Number(form.sellingPricePerPack) <= 0) nextErrors.sellingPricePerPack = 'Must be greater than 0.';
    if (form.manufacturingDate && form.expiryDate && form.expiryDate <= form.manufacturingDate) nextErrors.expiryDate = 'Must be after the manufacturing date.';
    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const nextNumber = Math.max(1000, ...existingMedicines.map((item) => Number(item.id.replace('MED-', '')) || 0)) + 1;
    onSave({
      ...(medicine || { id: `MED-${nextNumber}`, image: null }),
      productType: form.productType,
      dosageForm: form.productType === 'Medicine' ? form.dosageForm : '',
      preferredSupplierId: form.preferredSupplierId,
      name: form.name.trim(), genericName: form.genericName.trim(), brandName: form.brandName.trim(),
      manufacturer: form.manufacturer.trim(), category: form.category, supplier: form.supplier.trim(),
      batchNumber: form.batchNumber.trim(), manufacturingDate: form.manufacturingDate, expiryDate: form.expiryDate,
      rackLocation: form.rackLocation.trim(), barcode: form.barcode.trim(),
      packaging: { packType: form.packType, unitType: form.unitType, unitsPerPack: Number(form.unitsPerPack) },
      stock: { currentPacks: Number(form.currentPacks), looseUnits: form.allowSellingByUnit ? Number(form.looseUnits) : 0, reorderLevel: Number(form.reorderLevel) },
      pricing: { purchasePricePerPack: Number(form.purchasePricePerPack), sellingPricePerPack: Number(form.sellingPricePerPack) },
      sellingOptions: { allowSellingByPack: form.allowSellingByPack, allowSellingByUnit: form.allowSellingByUnit },
      description: form.description.trim(),
    });
    setForm(medicineToForm(medicine));
    setErrors({});
  };

  const field = (name, label, type = 'text', extra = {}) => (
    <label>
      <span className={labelClassName}>{label}</span>
      <input name={name} type={type} value={form[name]} onChange={updateField} className={inputClassName} {...extra} />
      {errors[name] && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{errors[name]}</span>}
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="add-medicine-title">
      <button type="button" aria-label="Close add medicine modal" onClick={onClose} className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-4xl max-h-[calc(100vh-2rem)] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-white dark:bg-slate-900 border-b border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center"><PackagePlus className="w-5 h-5" /></div>
            <div><h3 id="add-medicine-title" className="text-base font-bold text-slate-900 dark:text-white">{isEditing ? 'Edit Medicine' : 'Add Medicine'}</h3><p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{isEditing ? 'Update medicine and stock details.' : 'Register a new medicine and its stock details.'}</p></div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          <section><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Medicine details</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label><span className={labelClassName}>Product Type</span><select name="productType" value={form.productType} onChange={updateField} className={inputClassName}>{PRODUCT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            {form.productType === 'Medicine' && <label><span className={labelClassName}>Dosage Form</span><select name="dosageForm" value={form.dosageForm} onChange={updateField} className={inputClassName}><option value="">Select dosage form</option>{MEDICINE_DOSAGE_FORMS.map((formOption) => <option key={formOption} value={formOption}>{formOption}</option>)}</select></label>}
            {field('name', 'Product Name')} {field('genericName', 'Generic Name')} {field('brandName', 'Brand Name')} {field('manufacturer', 'Manufacturer')}
            <label><span className={labelClassName}>Category</span><select name="category" value={form.category} onChange={updateField} className={inputClassName}><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{errors.category && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{errors.category}</span>}</label>
            <SupplierSelector suppliers={suppliers} value={form.preferredSupplierId} onChange={(preferredSupplierId) => setForm((currentForm) => ({ ...currentForm, preferredSupplierId }))} label="Preferred Supplier" /> {field('batchNumber', 'Batch Number')} <BarcodeScannerField value={form.barcode} onChange={updateBarcode} />
            {field('manufacturingDate', 'Manufacturing Date', 'date')} {field('expiryDate', 'Expiry Date', 'date')} {field('rackLocation', 'Rack Location')}
          </div></section>

          <section className="pt-5 border-t border-slate-100 dark:border-slate-800"><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Packaging and stock</h4><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label><span className={labelClassName}>Packaging Type</span><select name="packType" value={form.packType} onChange={updateField} className={inputClassName}>{PACKAGING_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            <label><span className={labelClassName}>Unit Type <span className="font-normal text-slate-400">(Optional)</span></span><select name="unitType" value={form.unitType} onChange={updateField} className={inputClassName}>{UNIT_TYPES.map((unit) => <option key={unit || 'none'} value={unit}>{unit || 'Not applicable'}</option>)}</select></label>
            {field('unitsPerPack', 'Units Per Pack', 'number', { min: '1', step: '1' })} {field('currentPacks', 'Pack Quantity', 'number', { min: '0', step: '1' })} {form.allowSellingByUnit && field('looseUnits', 'Loose Unit Quantity', 'number', { min: '0', step: '1' })} {field('reorderLevel', 'Reorder Level (Packs)', 'number', { min: '0', step: '1' })}
          </div><div className="mt-4 px-4 py-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 text-sm font-semibold text-blue-700 dark:text-blue-300">Packaging preview: {packagingPreview}</div></section>

          <section className="pt-5 border-t border-slate-100 dark:border-slate-800"><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Pricing and selling options</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('purchasePricePerPack', 'Purchase Price Per Pack', 'number', { min: '0.01', step: '0.01' })} {field('sellingPricePerPack', 'Selling Price Per Pack', 'number', { min: '0.01', step: '0.01' })}
          </div><div className="mt-4 flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input name="allowSellingByPack" type="checkbox" checked={form.allowSellingByPack} onChange={updateField} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />Sell Complete Pack</label><label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input name="allowSellingByUnit" type="checkbox" checked={form.allowSellingByUnit} onChange={updateField} disabled={!form.unitType || Number(form.unitsPerPack) <= 1} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50" />Sell Individual Units</label></div></section>

          <section className="pt-5 border-t border-slate-100 dark:border-slate-800"><label><span className={labelClassName}>Description</span><textarea name="description" value={form.description} onChange={updateField} rows="3" className={inputClassName} /></label></section>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 p-5 bg-white dark:bg-slate-900 border-t border-slate-200/70 dark:border-slate-800"><button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Cancel</button><button type="submit" className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/20">{isEditing ? 'Update Medicine' : 'Save Medicine'}</button></div>
      </form>
    </div>
  );
};
