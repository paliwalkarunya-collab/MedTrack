import { ArrowUpDown, Eye, Pencil, Trash2, PackageSearch } from 'lucide-react';
import { categories, getMedicineStatus } from '../../utils/inventoryData';
import { formatStockDisplay } from '../../utils/medicineCalculations';
import { StockStatusBadge } from './StockStatusBadge';
import { Pagination } from '../common/Pagination';

const columns = [
    { key: 'name', label: 'Medicine' },
    { key: 'batchNumber', label: 'Batch' },
    { key: 'stock', label: 'Stock' },
    { key: 'expiryDate', label: 'Expiry Date' },
    { key: 'status', label: 'Status' },
];

const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const categoryName = (categoryId) => categories.find((category) => category.id === categoryId)?.name || categoryId;

export const MedicineTable = ({ medicines, sortConfig, onSort, currentPage, pageSize, onPageChange, totalItems, onView, onEdit }) => {
    if (medicines.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200/70 dark:border-slate-800/70 shadow-xs flex flex-col items-center justify-center text-center">
                <PackageSearch className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No medicines found</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search or filters.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/70 dark:border-slate-800/70 shadow-xs">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800/60">
                            {columns.map((column) => (
                                <th key={column.key} className="text-left pb-3 pr-4">
                                    <button
                                        onClick={() => onSort(column.key)}
                                        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    >
                                        {column.label}
                                        <ArrowUpDown
                                            className={`w-3 h-3 ${sortConfig.key === column.key ? 'text-blue-600 dark:text-blue-400' : 'opacity-40'}`}
                                        />
                                    </button>
                                </th>
                            ))}
                            <th className="text-right pb-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {medicines.map((medicine) => {
                            const status = getMedicineStatus(medicine);
                            return (
                                <tr
                                    key={medicine.id}
                                    className="border-b border-slate-50 dark:border-slate-800/40 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                    <td className="py-3 pr-4">
                                        <div className="font-semibold text-slate-900 dark:text-slate-100">{medicine.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{categoryName(medicine.category)}</div>
                                    </td>
                                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 font-mono text-xs">{medicine.batchNumber}</td>
                                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-300 font-medium">
                                        {formatStockDisplay(medicine)}
                                    </td>
                                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{formatDate(medicine.expiryDate)}</td>
                                    <td className="py-3 pr-4">
                                        <StockStatusBadge status={status} />
                                    </td>
                                    <td className="py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <button type="button" title="View" onClick={() => onView(medicine)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button type="button" title="Edit" onClick={() => onEdit(medicine)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalItems / pageSize)}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={onPageChange}
            />
        </div>
    );
};
