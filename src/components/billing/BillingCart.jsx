import { Pencil, Save, ShoppingCart, Trash2, X } from 'lucide-react';

const money = (value) => value.toFixed(2);
const editInputClassName = 'w-16 h-8 px-2 text-[13px] text-slate-900 bg-white border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all duration-150 motion-reduce:transition-none';

export const BillingCart = ({ items, editingId, editQuantity, onStartEdit, onEditQuantityChange, onSaveEdit, onCancelEdit, onRemove }) => (
  <section className="bg-white border border-slate-200/80 rounded-lg shadow-sm">
    {/* Header */}
    <div className="px-6 py-4 border-b border-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">Cart</h3>
            <p className="text-xs text-slate-500 mt-0.5">{items.length} item{items.length === 1 ? '' : 's'}</p>
          </div>
        </div>
      </div>
    </div>

    {/* Body */}
    <div className="p-5">
      {!items.length ? (
        <div className="py-10 text-center">
          <ShoppingCart className="w-7 h-7 text-slate-300 mx-auto mb-2" />
          <p className="text-[13px] font-medium text-slate-500">Cart is empty</p>
          <p className="text-[11px] text-slate-400 mt-1">Search for a medicine to add it to this bill.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[540px] text-[13px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left pb-3 pr-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Medicine</th>
                <th className="text-center pb-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-16">Packs</th>
                <th className="text-center pb-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-16">Loose</th>
                <th className="text-right pb-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Rate</th>
                <th className="text-right pb-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-24">Total</th>
                <th className="text-right pb-3 pl-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isEditing = editingId === item.medicine.id;
                return (
                  <tr key={item.medicine.id} className="border-b border-slate-100/80 last:border-0 group hover:bg-slate-50/50 transition-colors duration-100">
                    <td className="py-3 pr-3">
                      <span className="font-semibold text-slate-900">{item.medicine.name}</span>
                      {item.batchUsed?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {item.batchUsed.map((batch, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              <span className="font-semibold text-slate-700">├ù{batch.quantitySold}</span>
                              {batch.batchNumber}
                              {batch.rackLocation && <span className="text-emerald-600 font-medium">┬╖ {batch.rackLocation.replace('-', 'ΓåÆ')}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center align-top pt-3.5">
                      {isEditing
                        ? <input name="packs" type="number" min="0" step="1" value={editQuantity.packs} onChange={onEditQuantityChange} className={editInputClassName} />
                        : <span className="text-slate-700 font-medium tabular-nums">{item.packs}</span>
                      }
                    </td>
                    <td className="py-3 px-2 text-center align-top pt-3.5">
                      {isEditing
                        ? <input name="looseUnits" type="number" min="0" step="1" value={editQuantity.looseUnits} onChange={onEditQuantityChange} className={editInputClassName} />
                        : <span className="text-slate-700 font-medium tabular-nums">{item.looseUnits}</span>
                      }
                    </td>
                    <td className="py-3 px-2 text-right align-top pt-3.5 text-[11px] text-slate-500 whitespace-nowrap">
                      <span className="text-slate-700 font-medium">Γé╣{money(item.medicine.pricing.sellingPricePerPack)}</span>/{item.medicine.packaging.packType}
                      <br />
                      <span className="text-slate-700 font-medium">Γé╣{money(item.pricePerUnit)}</span>/{item.medicine.packaging.inventoryUnit}
                    </td>
                    <td className="py-3 px-2 text-right align-top pt-3.5 font-bold text-slate-900 tabular-nums">
                      Γé╣{money(item.lineTotal)}
                    </td>
                    <td className="py-3 pl-2 align-top pt-3">
                      <div className="flex justify-end gap-0.5">
                        {isEditing ? (
                          <>
                            <button type="button" title="Save" onClick={() => onSaveEdit(item.medicine.id)} className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors duration-100 cursor-pointer"><Save className="w-3.5 h-3.5" /></button>
                            <button type="button" title="Cancel" onClick={onCancelEdit} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 transition-colors duration-100 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                          </>
                        ) : (
                          <button type="button" title="Edit" onClick={() => onStartEdit(item)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-100 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                        )}
                        <button type="button" title="Remove" onClick={() => onRemove(item.medicine.id)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-100 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </section>
);
