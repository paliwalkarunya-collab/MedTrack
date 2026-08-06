import { X, Package, Boxes, CircleDollarSign, Tag } from 'lucide-react';
import { categories, getMedicineStatus } from '../../utils/inventoryData';
import {
  calculatePurchasePricePerUnit,
  calculateSellingPricePerUnit,
  calculateTotalUnits,
  formatPackagingPreview,
  formatStockDisplay,
} from '../../utils/medicineCalculations';
import { StockStatusBadge } from './StockStatusBadge';

const formatDate = (value) => new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const categoryName = (categoryId) => categories.find((category) => category.id === categoryId)?.name || categoryId;
const valueClassName = 'mt-1 text-sm text-slate-900 dark:text-slate-100 break-words';

const Detail = ({ label, children }) => <div><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</dt><dd className={valueClassName}>{children || '—'}</dd></div>;

export const MedicineDetailsModal = ({ medicine, onClose }) => {
  if (!medicine) return null;

  const status = getMedicineStatus(medicine);
  const totalUnits = calculateTotalUnits(medicine);
  const { packType, inventoryUnit, unitsPerPack } = medicine.packaging;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="medicine-details-title">
      <button type="button" aria-label="Close medicine details modal" onClick={onClose} className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs" />
      <div className="relative w-full max-w-4xl max-h-[calc(100vh-2rem)] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-white dark:bg-slate-900 border-b border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Package className="w-5 h-5" /></div><div><h3 id="medicine-details-title" className="text-base font-bold text-slate-900 dark:text-white">Medicine Details</h3><p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{medicine.id}</p></div></div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          <section><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Medicine Information</h4><dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><Detail label="Medicine Name">{medicine.name}</Detail><Detail label="Generic Name">{medicine.genericName}</Detail><Detail label="Brand Name">{medicine.brandName}</Detail><Detail label="Manufacturer">{medicine.manufacturer}</Detail><Detail label="Category">{categoryName(medicine.category)}</Detail><Detail label="Supplier">{medicine.supplier}</Detail><Detail label="Strength">{medicine.strength}</Detail><Detail label="Description"><span className="lg:col-span-2">{medicine.description}</span></Detail></dl></section>
          <section className="pt-5 border-t border-slate-100 dark:border-slate-800"><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Batch Information</h4><dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><Detail label="Batch Number">{medicine.batchNumber}</Detail><Detail label="Manufacturing Date">{formatDate(medicine.manufacturingDate)}</Detail><Detail label="Expiry Date">{formatDate(medicine.expiryDate)}</Detail><Detail label="Rack Location">{medicine.rackLocation}</Detail><Detail label="Barcode">{medicine.barcode}</Detail></dl></section>
          <section className="pt-5 border-t border-slate-100 dark:border-slate-800"><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Boxes className="w-4 h-4 text-blue-600" />Inventory</h4><dl className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Detail label="Current Stock">{formatStockDisplay(medicine)}</Detail><Detail label="Current Packs">{`${medicine.stock.currentPacks} ${medicine.stock.currentPacks === 1 ? packType : `${packType}s`}`}</Detail><Detail label="Loose Units">{`${medicine.stock.looseUnits} ${inventoryUnit}`}</Detail><Detail label="Total Units">{`${totalUnits} ${inventoryUnit}`}</Detail></dl></section>
          <section className="pt-5 border-t border-slate-100 dark:border-slate-800"><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Packaging</h4><div className="px-4 py-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 text-sm font-semibold text-blue-700 dark:text-blue-300">Packaging Preview: {formatPackagingPreview({ packType, inventoryUnit, unitsPerPack })}</div></section>
          <section className="pt-5 border-t border-slate-100 dark:border-slate-800"><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><CircleDollarSign className="w-4 h-4 text-emerald-600" />Pricing</h4><dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"><Detail label="Purchase Price Per Pack">{`${medicine.pricing.purchasePricePerPack.toFixed(2)} / ${packType}`}</Detail><Detail label="Selling Price Per Pack">{`${medicine.pricing.sellingPricePerPack.toFixed(2)} / ${packType}`}</Detail><Detail label="Purchase Price Per Unit">{`${calculatePurchasePricePerUnit(medicine).toFixed(2)} / ${inventoryUnit}`}</Detail><Detail label="Selling Price Per Unit">{`${calculateSellingPricePerUnit(medicine).toFixed(2)} / ${inventoryUnit}`}</Detail></dl></section>
          <section className="pt-5 border-t border-slate-100 dark:border-slate-800"><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Tag className="w-4 h-4 text-indigo-600" />Selling Options</h4><div className="flex flex-wrap gap-3"><span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${medicine.sellingOptions.allowSellingByPack ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>Sell by Pack: {medicine.sellingOptions.allowSellingByPack ? 'Enabled' : 'Disabled'}</span><span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${medicine.sellingOptions.allowSellingByUnit ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>Sell by Unit: {medicine.sellingOptions.allowSellingByUnit ? 'Enabled' : 'Disabled'}</span></div></section>
          <section className="pt-5 border-t border-slate-100 dark:border-slate-800"><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Status</h4><StockStatusBadge status={status} /></section>
        </div>
        <div className="sticky bottom-0 flex justify-end p-5 bg-white dark:bg-slate-900 border-t border-slate-200/70 dark:border-slate-800"><button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Close</button></div>
      </div>
    </div>
  );
};
