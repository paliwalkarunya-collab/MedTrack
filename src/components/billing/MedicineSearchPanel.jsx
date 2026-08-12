import { PackagePlus, Search, MapPin } from 'lucide-react';
import { calculateTotalUnits, formatPackagingPreview, formatStockDisplay } from '../../utils/medicineCalculations';
import { allocateFifoBatches, isSellableBatch } from '../../utils/fifoBatchUtils';
import { BarcodeScannerField } from '../common/BarcodeScannerField';

const qtyInputClassName = 'w-full h-10 px-3 text-[13px] text-slate-900 bg-white border border-slate-200 rounded-md placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all duration-150 motion-reduce:transition-none';

export const MedicineSearchPanel = ({ searchQuery, onSearchChange, onBarcodeScan, results, selectedMedicine, quantity, remainingStock, onQuantityChange, onSelectMedicine, onAddToCart, error }) => {
  let fifoResult = null;
  let requestedUnits = 0;
  if (selectedMedicine && (Number(quantity.packs) > 0 || Number(quantity.looseUnits) > 0)) {
    requestedUnits = Number(quantity.packs || 0) * selectedMedicine.packaging.unitsPerPack + Number(quantity.looseUnits || 0);
    fifoResult = allocateFifoBatches(selectedMedicine, requestedUnits);
  }

  const availableBatches = selectedMedicine?.batches ? selectedMedicine.batches.filter(b => isSellableBatch(b, new Date())) : [];

  return (
    <section className="bg-white border border-slate-200/80 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">Search Medicine</h3>
            <p className="text-xs text-slate-500 mt-0.5">By name, generic, brand, batch, or barcode.</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-5">
        <BarcodeScannerField label="Search Medicine or Barcode" value={searchQuery} onChange={onSearchChange} onScan={onBarcodeScan} placeholder="Search medicines or scan barcode..." />

        {searchQuery.trim() && (
          <div className="mt-1.5 max-h-52 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100 shadow-sm">
            {results.length ? results.map((medicine) => (
              <button key={medicine.id} type="button" onClick={() => onSelectMedicine(medicine)} className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 focus:bg-slate-50 transition-colors duration-100 focus:outline-none cursor-pointer">
                <span className="block text-[13px] font-semibold text-slate-900">{medicine.name}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">{medicine.genericName} ┬╖ {medicine.brandName || medicine.id}</span>
              </button>
            )) : (
              <p className="px-3.5 py-3 text-[13px] text-slate-500">No medicines found.</p>
            )}
          </div>
        )}
      </div>

      {/* Selected Medicine */}
      {selectedMedicine && (
        <div className="mx-5 mb-5 p-4 rounded-md bg-slate-50/80 border border-slate-200/80">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-[13px] font-bold text-slate-900 truncate">{selectedMedicine.name}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">{selectedMedicine.genericName}{selectedMedicine.brandName ? ` ┬╖ ${selectedMedicine.brandName}` : ''}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Mfr: <span className="font-medium text-slate-700">{selectedMedicine.manufacturer || 'N/A'}</span></p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0 ${remainingStock.isSufficient ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-red-50 text-red-700 border border-red-200/60'}`}>
              {remainingStock.isSufficient ? 'In Stock' : 'Low Stock'}
            </span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Stock', value: formatStockDisplay(selectedMedicine) },
              { label: 'Units', value: `${calculateTotalUnits(selectedMedicine)} ${selectedMedicine.packaging.inventoryUnit}` },
              { label: 'Packaging', value: formatPackagingPreview(selectedMedicine.packaging) },
              { label: 'Price', value: `Γé╣${selectedMedicine.pricing.sellingPricePerPack.toFixed(2)} / ${selectedMedicine.packaging.packType}` },
            ].map(({ label, value }) => (
              <div key={label} className="min-w-0">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</span>
                <span className="block text-[12px] font-semibold text-slate-800 mt-0.5 truncate">{value}</span>
              </div>
            ))}
          </div>

          {/* Quantity */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <label className="block">
              <span className="block text-[11px] font-medium text-slate-600 mb-1">Packs</span>
              <input name="packs" type="number" min="0" step="1" value={quantity.packs} onChange={onQuantityChange} className={qtyInputClassName} />
            </label>
            <label className="block">
              <span className="block text-[11px] font-medium text-slate-600 mb-1">Loose Units</span>
              <input name="looseUnits" type="number" min="0" step="1" value={quantity.looseUnits} onChange={onQuantityChange} className={qtyInputClassName} />
            </label>
          </div>

          <p className="mt-2 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">{remainingStock.availableUnits}</span> available ┬╖ After: <span className="font-semibold text-slate-700">{remainingStock.remainingUnits}</span> remaining
          </p>
        </div>
      )}

      {/* Batch Locations (when no quantity entered) */}
      {requestedUnits === 0 && availableBatches.length > 0 && (
        <div className="mx-5 mb-5 p-4 rounded-md bg-slate-50/50 border border-slate-200/60">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Batch Locations</h4>
          <div className="space-y-2.5">
            {availableBatches.map((batch, idx) => (
              <div key={idx} className="text-[12px]">
                <div className="font-semibold text-slate-800">{batch.batchNumber}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {batch.quantityRemaining} {selectedMedicine.packaging.inventoryUnit}{batch.quantityRemaining !== 1 ? 's' : ''} ┬╖ Exp: {batch.expiryDate || 'N/A'}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {(batch.rackLocation || selectedMedicine.rackLocation) ? (batch.rackLocation || selectedMedicine.rackLocation).replace('-', ' ΓåÆ ') : 'Unassigned'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FIFO Pick List */}
      {fifoResult && fifoResult.isSufficient && fifoResult.allocations.length > 0 && (
        <div className="mx-5 mb-5 p-4 rounded-md bg-emerald-50/50 border border-emerald-200/60">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-3">FIFO Pick List</h4>
          <div className="space-y-2.5">
            {fifoResult.allocations.map((alloc, idx) => (
              <div key={idx} className="flex justify-between items-start text-[12px] pb-2 border-b border-emerald-100 last:border-0 last:pb-0">
                <div>
                  <div className="font-semibold text-slate-800">{alloc.batchNumber}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Exp: {alloc.expiryDate || 'N/A'}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {alloc.rackLocation ? alloc.rackLocation.replace('-', ' ΓåÆ ') : 'Unassigned'}
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                  Pick {alloc.quantitySold} {selectedMedicine.packaging.inventoryUnit}{alloc.quantitySold !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
            <div className="pt-2 mt-1 border-t border-emerald-200 text-[11px] font-bold text-right text-emerald-700">
              Total: {requestedUnits} {selectedMedicine.packaging.inventoryUnit}{requestedUnits !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <p className="mx-5 mb-4 text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-md">{error}</p>}

      {/* Add to Cart */}
      <div className="px-5 pb-5">
        <button
          type="button"
          disabled={!remainingStock?.isSufficient}
          onClick={onAddToCart}
          className="w-full flex items-center justify-center gap-2 h-10 text-[13px] font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-md shadow-sm transition-all duration-150 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:ring-offset-1 cursor-pointer"
        >
          <PackagePlus className="w-4 h-4" />Add to Cart
        </button>
      </div>
    </section>
  );
};
