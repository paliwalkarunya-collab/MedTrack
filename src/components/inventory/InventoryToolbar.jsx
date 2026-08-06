import { Search, Plus, ChevronDown } from 'lucide-react';
import { categories } from '../../utils/inventoryData';

export const InventoryToolbar = ({
    searchQuery,
    onSearchChange,
    categoryFilter,
    onCategoryChange,
    statusFilter,
    onStatusChange,
}) => {
    return (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Search by name, batch, supplier or ID..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-100/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl border border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500/80 dark:focus:border-blue-500/80 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-200"
                />
            </div>

            <div className="relative shrink-0">
                <select
                    value={categoryFilter}
                    onChange={(event) => onCategoryChange(event.target.value)}
                    className="appearance-none pl-3.5 pr-9 py-2.5 text-sm font-medium bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200/60 dark:border-slate-700/60 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/80 cursor-pointer"
                >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            </div>

            <div className="relative shrink-0">
                <select
                    value={statusFilter}
                    onChange={(event) => onStatusChange(event.target.value)}
                    className="appearance-none pl-3.5 pr-9 py-2.5 text-sm font-medium bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200/60 dark:border-slate-700/60 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/80 cursor-pointer"
                >
                    <option value="all">All Statuses</option>
                    <option value="healthy">In Stock</option>
                    <option value="low-stock">Low Stock</option>
                    <option value="expiring">Expiring Soon</option>
                    <option value="expired">Expired</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            </div>

            <button className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/20 transition-colors">
                <Plus className="w-4 h-4" />
                Add Medicine
            </button>
        </div>
    );
};