import { useState, useMemo, useCallback } from 'react';
import { CalendarClock } from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { getDaysRemaining, getExpiryStatus } from '../utils/expiryUtils';
import { formatStockDisplay } from '../utils/medicineCalculations';
import { getPackaging } from '../utils/productModel';
import { ensureProductBatches } from '../utils/fifoBatchUtils';
import { ExpirySummaryCards } from '../components/expiry/ExpirySummaryCards';
import { ExpiryFilters } from '../components/expiry/ExpiryFilters';
import { ExpiryTable } from '../components/expiry/ExpiryTable';
import { ExpiryDetailsModal } from '../components/expiry/ExpiryDetailsModal';

const PAGE_SIZE = 10;

// ── Build flat expiry entries from inventory batches ──────────────────────────

const buildExpiryEntries = (inventory) => {
  const entries = [];

  inventory.forEach((product) => {
    const normalised = ensureProductBatches(product);
    const batches = normalised.batches ?? [];

    batches.forEach((batch) => {
      // Skip batches without a usable expiry date
      const rawExpiry = batch.expiryDate ?? product.expiryDate;
      if (!rawExpiry || rawExpiry === '2099-12-31') return;

      const daysRemaining = getDaysRemaining(rawExpiry);
      const status = getExpiryStatus(daysRemaining);

      const { unitsPerPack, packType, unitType } = getPackaging(product);
      const stockUnits = batch.quantityRemaining ?? 0;
      const packs = Math.floor(stockUnits / unitsPerPack);
      const loose = stockUnits % unitsPerPack;

      // Build a stock label consistent with the project convention
      let stockLabel;
      if (product.stock && normalised.batches?.length <= 1) {
        stockLabel = formatStockDisplay(product);
      } else {
        const packPart = `${packs} ${packs === 1 ? packType : packType + 's'}`;
        if (unitType && loose > 0) {
          const unitLabel = unitType === 'mL' ? unitType : (loose === 1 ? unitType : unitType + 's');
          stockLabel = `${packPart} + ${loose} ${unitLabel}`;
        } else {
          stockLabel = packPart;
        }
      }

      entries.push({
        id: `${product.id}__${batch.id}`,
        product,
        batch,
        batchNumber: batch.batchNumber ?? product.batchNumber ?? '—',
        expiryDate: rawExpiry,
        daysRemaining,
        stockUnits,
        stockLabel,
        status,
        supplierName: batch.supplierName ?? product.supplier ?? '—',
        // Derived search-friendly fields
        name: product.name,
      });
    });
  });

  return entries;
};

// ── Sorting ──────────────────────────────────────────────────────────────────

const statusWeight = { expired: 0, critical: 1, expiring: 2, safe: 3 };

const comparator = (key, direction) => {
  const dir = direction === 'asc' ? 1 : -1;
  return (a, b) => {
    let va, vb;
    switch (key) {
      case 'name':
        va = a.product.name.toLowerCase();
        vb = b.product.name.toLowerCase();
        return va < vb ? -dir : va > vb ? dir : 0;
      case 'batchNumber':
        va = (a.batchNumber ?? '').toLowerCase();
        vb = (b.batchNumber ?? '').toLowerCase();
        return va < vb ? -dir : va > vb ? dir : 0;
      case 'expiryDate':
        return dir * (new Date(a.expiryDate) - new Date(b.expiryDate));
      case 'daysRemaining':
        return dir * (a.daysRemaining - b.daysRemaining);
      case 'stockUnits':
        return dir * (a.stockUnits - b.stockUnits);
      case 'status':
        return dir * ((statusWeight[a.status] ?? 4) - (statusWeight[b.status] ?? 4));
      default:
        return 0;
    }
  };
};

// ── Component ────────────────────────────────────────────────────────────────

export const ExpiryPage = () => {
  const { inventory } = useInventory();

  // Filter / search / sort state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'daysRemaining', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const hasFilters = search !== '' || statusFilter !== 'all' || rangeFilter !== 'all';

  // Build all entries once whenever inventory changes
  const allEntries = useMemo(() => buildExpiryEntries(inventory), [inventory]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = allEntries;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        e.product.name?.toLowerCase().includes(q) ||
        e.product.genericName?.toLowerCase().includes(q) ||
        e.product.brandName?.toLowerCase().includes(q) ||
        e.batchNumber?.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((e) => e.status === statusFilter);
    }

    if (rangeFilter !== 'all') {
      const maxDays = Number(rangeFilter);
      result = result.filter((e) => e.daysRemaining <= maxDays);
    }

    return result;
  }, [allEntries, search, statusFilter, rangeFilter]);

  // Summary counts (from filtered set so cards reflect active view)
  const summary = useMemo(() => {
    const counts = { expired: 0, expiring: 0, critical: 0, total: allEntries.length };
    allEntries.forEach((e) => {
      if (e.status === 'expired') counts.expired++;
      else if (e.status === 'critical') counts.critical++;
      else if (e.status === 'expiring') counts.expiring++;
    });
    return counts;
  }, [allEntries]);

  // Sort
  const sorted = useMemo(
    () => [...filtered].sort(comparator(sortConfig.key, sortConfig.direction)),
    [filtered, sortConfig],
  );

  // Paginate
  const totalItems = sorted.length;
  const pageEntries = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page],
  );

  // Handlers
  const handleSort = useCallback((key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('all');
    setRangeFilter('all');
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value) => { setSearch(value); setPage(1); }, []);
  const handleStatusChange = useCallback((value) => { setStatusFilter(value); setPage(1); }, []);
  const handleRangeChange = useCallback((value) => { setRangeFilter(value); setPage(1); }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <CalendarClock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Expiry Management</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Track and manage medicine expiry dates across your inventory</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <ExpirySummaryCards summary={summary} />

      {/* Filters */}
      <ExpiryFilters
        search={search}
        status={statusFilter}
        range={rangeFilter}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onRangeChange={handleRangeChange}
        onClear={handleClearFilters}
        hasFilters={hasFilters}
      />

      {/* Table */}
      <ExpiryTable
        entries={pageEntries}
        totalItems={totalItems}
        page={page}
        pageSize={PAGE_SIZE}
        sortConfig={sortConfig}
        onSort={handleSort}
        onPageChange={setPage}
        onView={setSelectedEntry}
        hasFilters={hasFilters}
      />

      {/* Details modal */}
      {selectedEntry && (
        <ExpiryDetailsModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
};
