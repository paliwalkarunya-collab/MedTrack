import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListFilter, Grid } from 'lucide-react';
import { getMedicineStatus } from '../utils/inventoryData';
import { useInventory } from '../hooks/useInventory';
import { InventoryStatsBar } from '../components/inventory/InventoryStatsBar';
import { InventoryToolbar } from '../components/inventory/InventoryToolbar';
import { MedicineTable } from '../components/inventory/MedicineTable';
import { CategoryGrid } from '../components/inventory/CategoryGrid';
import { AddMedicineModal } from '../components/inventory/AddMedicineModal';
import { MedicineDetailsModal } from '../components/inventory/MedicineDetailsModal';

const PAGE_SIZE = 8;

export const InventoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'categories' ? 'categories' : 'all';

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') || 'all');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const { inventory, addMedicine, updateMedicine } = useInventory();
  const [isAddMedicineOpen, setIsAddMedicineOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [viewingMedicine, setViewingMedicine] = useState(null);

  useEffect(() => {
    const syncFilters = window.setTimeout(() => {
      setStatusFilter(searchParams.get('filter') || 'all');
      setCurrentPage(1);
    }, 0);

    return () => window.clearTimeout(syncFilters);
  }, [searchParams]);

  const withStatus = useMemo(
    () => inventory.map((medicine) => ({ ...medicine, status: getMedicineStatus(medicine) })),
    [inventory]
  );

  const filteredMedicines = useMemo(() => {
    return withStatus.filter((medicine) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        [medicine.name, medicine.id, medicine.batchNumber, medicine.supplier]
          .join(' ')
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || medicine.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || medicine.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [withStatus, searchQuery, categoryFilter, statusFilter]);

  const sortedMedicines = useMemo(() => {
    const sorted = [...filteredMedicines].sort((a, b) => {
      const { key, direction } = sortConfig;
      const valueA = a[key];
      const valueB = b[key];
      const result = typeof valueA === 'number' ? valueA - valueB : String(valueA).localeCompare(String(valueB));
      return direction === 'asc' ? result : -result;
    });
    return sorted;
  }, [filteredMedicines, sortConfig]);

  const paginatedMedicines = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedMedicines.slice(start, start + PAGE_SIZE);
  }, [sortedMedicines, currentPage]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectCategory = (categoryId) => {
    setCategoryFilter(categoryId);
    setCurrentPage(1);
    setSearchParams({});
  };

  const handleAddMedicine = (medicine) => {
    addMedicine(medicine);
    setCurrentPage(1);
    setIsAddMedicineOpen(false);
  };

  const handleUpdateMedicine = (medicine) => {
    updateMedicine(medicine);
    setEditingMedicine(null);
  };

  const stats = {
    total: withStatus.length,
    lowStock: withStatus.filter((m) => m.status === 'low-stock').length,
    expiring: withStatus.filter((m) => m.status === 'expiring').length,
    expired: withStatus.filter((m) => m.status === 'expired').length,
  };

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Medicine Inventory</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Track stock levels, batches and expiries across all medicine categories.
        </p>
      </div>

      <InventoryStatsBar {...stats} />

      <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/60 p-1 rounded-xl w-fit">
        <button
          onClick={() => setSearchParams({})}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'all'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          All Medicines
        </button>
        <button
          onClick={() => setSearchParams({ tab: 'categories' })}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'categories'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
        >
          <Grid className="w-3.5 h-3.5" />
          Categories
        </button>
      </div>

      {activeTab === 'categories' ? (
        <CategoryGrid medicines={inventory} onSelectCategory={handleSelectCategory} />
      ) : (
        <div className="space-y-4">
          <InventoryToolbar
            searchQuery={searchQuery}
            onSearchChange={(value) => {
              setSearchQuery(value);
              setCurrentPage(1);
            }}
            categoryFilter={categoryFilter}
            onCategoryChange={(value) => {
              setCategoryFilter(value);
              setCurrentPage(1);
            }}
            statusFilter={statusFilter}
            onStatusChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
            onAddMedicine={() => setIsAddMedicineOpen(true)}
          />

          <MedicineTable
            medicines={paginatedMedicines}
            sortConfig={sortConfig}
            onSort={handleSort}
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
            totalItems={sortedMedicines.length}
            onView={setViewingMedicine}
            onEdit={setEditingMedicine}
          />
        </div>
      )}

      <AddMedicineModal
        key={editingMedicine?.id || 'add-medicine'}
        isOpen={isAddMedicineOpen}
        onClose={() => setIsAddMedicineOpen(false)}
        onSave={handleAddMedicine}
        existingMedicines={inventory}
      />
      <AddMedicineModal
        key={editingMedicine?.id || 'edit-medicine'}
        isOpen={editingMedicine !== null}
        onClose={() => setEditingMedicine(null)}
        onSave={handleUpdateMedicine}
        existingMedicines={inventory}
        medicine={editingMedicine}
      />
      <MedicineDetailsModal medicine={viewingMedicine} onClose={() => setViewingMedicine(null)} />
    </div>
  );
};
