import { useMemo, useState } from 'react';
import { X, PackagePlus } from 'lucide-react';
import { categories } from '../../utils/inventoryData';
import { INVENTORY_UNITS, PACKAGING_TYPES } from '../../constants/medicineOptions';

const initialForm = {
  name: '', genericName: '', brandName: '', manufacturer: '', category: '', supplier: '',
  batchNumber: '', manufacturingDate: '', expiryDate: '', rackLocation: '', barcode: '',
  packType: 'Strip', inventoryUnit: 'Tablet', unitsPerPack: '', currentPacks: '', looseUnits: '',
  reorderLevel: '', purchasePricePerPack: '', sellingPricePerPack: '', allowSellingByPack: true,
  allowSellingByUnit: true, description: '',
};

const pluralize = (value, count) => (count === 1 ? value : `${value}s`);

const inputClassName = 'w-full px-3 py-2.5 text-sm bg-slate-50/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200/70 dark:border-slate-700/70 focus:border-blue-500/80 focus:outline-none focus:ring-4 focus:ring-blue-500/10';
const labelClassName = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5';

export const AddMedicineModal = ({ isOpen, onClose, onSave, existingMedicines }) => {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  const packagingPreview = useMemo(() => {
    const units = Number(form.unitsPerPack) || 0;
    return `1 ${form.packType} = ${units} ${pluralize(form.inventoryUnit, units)}`;
  }, [form.inventoryUnit, form.packType, form.unitsPerPack]);

  if (!isOpen) return null;

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: type === 'checkbox' ? checked : value }));
    setErrors((currentErrors) => ({ ...currentErrors, [name]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    const requiredFields = ['name', 'genericName', 'manufacturer', 'category', 'supplier', 'batchNumber', 'manufacturingDate', 'expiryDate', 'rackLocation', 'packType', 'inventoryUnit', 'unitsPerPack', 'currentPacks', 'looseUnits', 'reorderLevel', 'purchasePricePerPack', 'sellingPricePerPack'];
    requiredFields.forEach((field) => {
      if (String(form[field]).trim() === '') nextErrors[field] = 'This field is required.';
    });

    const unitsPerPack = Number(form.unitsPerPack);
    const looseUnits = Number(form.looseUnits);
    if (form.unitsPerPack !== '' && unitsPerPack <= 0) nextErrors.unitsPerPack = 'Must be greater than 0.';
    if (form.looseUnits !== '' && looseUnits > unitsPerPack) nextErrors.looseUnits = 'Cannot exceed units per pack.';
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

    const nextNumber = Math.max(1000, ...existingMedicines.map((medicine) => Number(medicine.id.replace('MED-', '')) || 0)) + 1;
    onSave({
      id: `MED-${nextNumber}`,
      name: form.name.trim(), genericName: form.genericName.trim(), brandName: form.brandName.trim(),
      manufacturer: form.manufacturer.trim(), category: form.category, supplier: form.supplier.trim(),
      batchNumber: form.batchNumber.trim(), manufacturingDate: form.manufacturingDate, expiryDate: form.expiryDate,
      rackLocation: form.rackLocation.trim(), barcode: form.barcode.trim(), image: null,
      packaging: { packType: form.packType, inventoryUnit: form.inventoryUnit, unitsPerPack: Number(form.unitsPerPack) },
      stock: { currentPacks: Number(form.currentPacks), looseUnits: Number(form.looseUnits), reorderLevel: Number(form.reorderLevel) },
      pricing: { purchasePricePerPack: Number(form.purchasePricePerPack), sellingPricePerPack: Number(form.sellingPricePerPack) },
      sellingOptions: { allowSellingByPack: form.allowSellingByPack, allowSellingByUnit: form.allowSellingByUnit },
      description: form.description.trim(),
    });
    setForm(initialForm);
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
            <div><h3 id="add-medicine-title" className="text-base font-bold text-slate-900 dark:text-white">Add Medicine</h3><p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Register a new medicine and its stock details.</p></div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          <section><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Medicine details</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('name', 'Medicine Name')} {field('genericName', 'Generic Name')} {field('brandName', 'Brand Name')} {field('manufacturer', 'Manufacturer')}
            <label><span className={labelClassName}>Category</span><select name="category" value={form.category} onChange={updateField} className={inputClassName}><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{errors.category && <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">{errors.category}</span>}</label>
            {field('supplier', 'Supplier')} {field('batchNumber', 'Batch Number')} {field('barcode', 'Barcode')}
            {field('manufacturingDate', 'Manufacturing Date', 'date')} {field('expiryDate', 'Expiry Date', 'date')} {field('rackLocation', 'Rack Location')}
          </div></section>

          <section className="pt-5 border-t border-slate-100 dark:border-slate-800"><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Packaging and stock</h4><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label><span className={labelClassName}>Packaging Type</span><select name="packType" value={form.packType} onChange={updateField} className={inputClassName}>{PACKAGING_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            <label><span className={labelClassName}>Inventory Unit</span><select name="inventoryUnit" value={form.inventoryUnit} onChange={updateField} className={inputClassName}>{INVENTORY_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
            {field('unitsPerPack', 'Units Per Pack', 'number', { min: '1', step: '1' })} {field('currentPacks', 'Current Packs', 'number', { min: '0', step: '1' })} {field('looseUnits', 'Loose Units', 'number', { min: '0', step: '1' })} {field('reorderLevel', 'Reorder Level', 'number', { min: '0', step: '1' })}
          </div><div className="mt-4 px-4 py-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 text-sm font-semibold text-blue-700 dark:text-blue-300">Packaging preview: {packagingPreview}</div></section>

          <section className="pt-5 border-t border-slate-100 dark:border-slate-800"><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Pricing and selling options</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('purchasePricePerPack', 'Purchase Price Per Pack', 'number', { min: '0.01', step: '0.01' })} {field('sellingPricePerPack', 'Selling Price Per Pack', 'number', { min: '0.01', step: '0.01' })}
          </div><div className="mt-4 flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input name="allowSellingByPack" type="checkbox" checked={form.allowSellingByPack} onChange={updateField} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />Allow Selling By Pack</label><label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input name="allowSellingByUnit" type="checkbox" checked={form.allowSellingByUnit} onChange={updateField} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />Allow Selling By Unit</label></div></section>

          <section className="pt-5 border-t border-slate-100 dark:border-slate-800"><label><span className={labelClassName}>Description</span><textarea name="description" value={form.description} onChange={updateField} rows="3" className={inputClassName} /></label></section>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 p-5 bg-white dark:bg-slate-900 border-t border-slate-200/70 dark:border-slate-800"><button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Cancel</button><button type="submit" className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/20">Save Medicine</button></div>
      </form>
    </div>
  );
};
