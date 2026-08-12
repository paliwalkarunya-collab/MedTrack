import { useState, useMemo } from 'react';
import { useBillingHistory } from '../hooks/useBillingHistory';
import { usePurchases } from '../hooks/usePurchases';
import { useInventory } from '../hooks/useInventory';
import { useSuppliers } from '../hooks/useSuppliers';
import { useReturns } from '../hooks/useReturns';
import { exportReportToPdf, exportReportToExcel } from '../utils/reportExportUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getPackaging } from '../utils/productModel';
import { FileDown, FileText, Filter } from 'lucide-react';

const money = (val) => `₹${Number(val || 0).toFixed(2)}`;

export const ReportsPage = () => {
  const { invoices } = useBillingHistory();
  const { purchases } = usePurchases();
  const { inventory } = useInventory();
  const { suppliers } = useSuppliers();
  const { returns } = useReturns();

  const [activeTab, setActiveTab] = useState('sales');
  const [dateFilter, setDateFilter] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [medicineFilter, setMedicineFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');

  const dateFiltered = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dateFilter === 'today') return date >= startOfToday;
    if (dateFilter === 'yesterday') {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      return date >= startOfYesterday && date < startOfToday;
    }
    if (dateFilter === 'this_week') {
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      return date >= startOfWeek;
    }
    if (dateFilter === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= startOfMonth;
    }
    if (dateFilter === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= startOfLastMonth && date < startOfThisMonth;
    }
    if (dateFilter === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return date >= startOfYear;
    }
    if (dateFilter === 'custom') {
      if (!customStart || !customEnd) return true;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    return true;
  };

  const getFullyFilteredInvoices = () => {
    return invoices.filter(inv => {
      if (!dateFiltered(inv.createdAt)) return false;
      if (medicineFilter === 'all' && supplierFilter === 'all') return true;
      return inv.items.some(item => {
        const matchesMedicine = medicineFilter === 'all' || item.medicine.id === medicineFilter;
        const matchesSupplier = supplierFilter === 'all' || (item.batchUsed && item.batchUsed.some(b => b.supplierId === supplierFilter || b.supplierName === suppliers.find(s=>s.id===supplierFilter)?.supplierName));
        return matchesMedicine && matchesSupplier;
      });
    });
  };

  const fullyFilteredInvoices = getFullyFilteredInvoices();
  const numInvoices = fullyFilteredInvoices.length;

  const getFilteredPurchases = () => purchases.filter(p => dateFiltered(p.purchaseDate) && (supplierFilter === 'all' || p.supplierId === supplierFilter) && (medicineFilter === 'all' || p.productId === medicineFilter));

  const getFilteredInvoiceItems = () => {
    let items = [];
    fullyFilteredInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const matchesMedicine = medicineFilter === 'all' || item.medicine.id === medicineFilter;
        const matchesSupplier = supplierFilter === 'all' || (item.batchUsed && item.batchUsed.some(b => b.supplierId === supplierFilter || b.supplierName === suppliers.find(s=>s.id===supplierFilter)?.supplierName));
        
        if (matchesMedicine && matchesSupplier) {
          items.push({ ...item, invoiceDate: inv.createdAt, invoiceId: inv.invoiceId });
        }
      });
    });
    return items;
  };

  const getFilteredReturnItems = () => {
    let returnItems = [];
    returns.forEach(ret => {
      if (!dateFiltered(ret.createdAt)) return;

      const originalInvoice = invoices.find(inv => inv.invoiceId === ret.invoiceId);
      if (!originalInvoice) return;

      ret.items.forEach(retItem => {
        const originalInvItem = originalInvoice.items.find(i => i.medicine.id === retItem.medicineId);
        const originalBatch = originalInvItem?.batchUsed?.find(b => b.batchId === retItem.batchId);
        
        const supplierId = originalBatch?.supplierId;
        const supplierName = originalBatch?.supplierName;
        const unitCost = originalBatch?.unitCost ?? 0;

        const matchesMedicine = medicineFilter === 'all' || retItem.medicineId === medicineFilter;
        const matchesSupplier = supplierFilter === 'all' || (supplierId === supplierFilter || supplierName === suppliers.find(s=>s.id===supplierFilter)?.supplierName);

        if (matchesMedicine && matchesSupplier) {
          returnItems.push({
            ...retItem,
            returnDate: ret.createdAt,
            returnId: ret.returnId,
            unitCost,
            supplierId,
            supplierName
          });
        }
      });
    });
    return returnItems;
  };

  // --- Sales & Return Data ---
  const salesItems = getFilteredInvoiceItems();
  const returnItems = getFilteredReturnItems();

  const grossSales = salesItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const grossQuantitySold = salesItems.reduce((sum, item) => sum + (item.packs * getPackaging(item.medicine).unitsPerPack + item.looseUnits), 0);
  const grossCOGS = salesItems.reduce((sum, item) => {
    return sum + (item.batchUsed ? item.batchUsed.reduce((csum, alloc) => csum + ((alloc.unitCost ?? 0) * alloc.quantitySold), 0) : 0);
  }, 0);

  const returnedRevenue = returnItems.reduce((sum, item) => sum + item.refundAmount, 0);
  const returnedQuantity = returnItems.reduce((sum, item) => sum + item.returnedQuantity, 0);
  const returnedCOGS = returnItems.reduce((sum, item) => sum + (item.unitCost * item.returnedQuantity), 0);

  const netSales = grossSales - returnedRevenue;
  const netQuantitySold = grossQuantitySold - returnedQuantity;
  const netCOGS = grossCOGS - returnedCOGS;
  const grossProfit = netSales - netCOGS;
  const profitMargin = netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) : 0;

  const salesByMedicine = useMemo(() => {
    const map = new Map();
    
    salesItems.forEach(item => {
      const id = item.medicine.id;
      if (!map.has(id)) map.set(id, { name: item.medicine.name, grossQty: 0, grossRev: 0, grossCogs: 0, retQty: 0, retRev: 0, retCogs: 0 });
      const stat = map.get(id);
      
      const qty = item.packs * getPackaging(item.medicine).unitsPerPack + item.looseUnits;
      const cogs = item.batchUsed ? item.batchUsed.reduce((csum, alloc) => csum + ((alloc.unitCost ?? 0) * alloc.quantitySold), 0) : 0;
      
      stat.grossQty += qty;
      stat.grossRev += item.lineTotal;
      stat.grossCogs += cogs;
    });

    returnItems.forEach(item => {
      const id = item.medicineId;
      if (!map.has(id)) map.set(id, { name: item.medicineName, grossQty: 0, grossRev: 0, grossCogs: 0, retQty: 0, retRev: 0, retCogs: 0 });
      const stat = map.get(id);

      stat.retQty += item.returnedQuantity;
      stat.retRev += item.refundAmount;
      stat.retCogs += (item.unitCost * item.returnedQuantity);
    });

    return Array.from(map.values()).map(stat => {
      const netQty = stat.grossQty - stat.retQty;
      const netRev = stat.grossRev - stat.retRev;
      const netCogs = stat.grossCogs - stat.retCogs;
      const netProfit = netRev - netCogs;
      return {
        name: stat.name,
        qty: netQty,
        revenue: netRev,
        cogs: netCogs,
        profit: netProfit
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [salesItems, returnItems]);

  const combinedTrend = useMemo(() => {
    const map = new Map();

    salesItems.forEach(item => {
      const date = new Date(item.invoiceDate).toLocaleDateString();
      if (!map.has(date)) map.set(date, { date, grossRev: 0, grossCogs: 0, retRev: 0, retCogs: 0 });
      
      const cogs = item.batchUsed ? item.batchUsed.reduce((csum, alloc) => csum + ((alloc.unitCost ?? 0) * alloc.quantitySold), 0) : 0;
      
      map.get(date).grossRev += item.lineTotal;
      map.get(date).grossCogs += cogs;
    });

    returnItems.forEach(item => {
      const date = new Date(item.returnDate).toLocaleDateString();
      if (!map.has(date)) map.set(date, { date, grossRev: 0, grossCogs: 0, retRev: 0, retCogs: 0 });

      map.get(date).retRev += item.refundAmount;
      map.get(date).retCogs += (item.unitCost * item.returnedQuantity);
    });

    return Array.from(map.values()).map(stat => {
      const netRev = stat.grossRev - stat.retRev;
      const netCogs = stat.grossCogs - stat.retCogs;
      return {
        date: stat.date,
        sales: netRev,
        revenue: netRev,
        profit: netRev - netCogs
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [salesItems, returnItems]);

  const salesTrend = combinedTrend;
  const profitTrend = combinedTrend;

  // --- Purchase Data ---
  const purchaseList = getFilteredPurchases();
  const totalPurchaseCost = purchaseList.reduce((sum, p) => sum + (p.purchasePrice * (p.quantityPacks || 0)), 0);
  const totalQuantityPurchased = purchaseList.reduce((sum, p) => sum + (p.quantityPacks || 0), 0);
  
  const purchasesByMedicine = useMemo(() => {
    return purchaseList.map(p => ({
      name: p.productName || 'Unknown',
      supplier: p.supplierName,
      qty: p.quantityPacks,
      cost: p.purchasePrice * (p.quantityPacks || 0)
    }));
  }, [purchaseList]);

  const purchaseTrend = useMemo(() => {
    const map = new Map();
    purchaseList.forEach(p => {
      const date = new Date(p.purchaseDate).toLocaleDateString();
      if (!map.has(date)) map.set(date, { date, purchases: 0 });
      const cost = p.purchasePrice * (p.quantityPacks || 0);
      map.get(date).purchases += cost;
    });
    return Array.from(map.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [purchaseList]);


  const getExportFilters = () => {
    const f = [`Date: ${dateFilter}`];
    if (dateFilter === 'custom') f.push(`From: ${customStart} To: ${customEnd}`);
    if (medicineFilter !== 'all') {
      const m = inventory.find(i => i.id === medicineFilter);
      if (m) f.push(`Medicine: ${m.name}`);
    }
    if (supplierFilter !== 'all') {
      const s = suppliers.find(i => i.id === supplierFilter);
      if (s) f.push(`Supplier: ${s.supplierName}`);
    }
    return f;
  };

  const handleExportPDF = () => {
    if (activeTab === 'sales') {
      exportReportToPdf('Sales Report', 
        [{key:'name', header:'Medicine'}, {key:'qty', header:'Net Quantity Sold'}, {key:'rev', header:'Net Revenue'}, {key:'prof', header:'Net Profit'}],
        salesByMedicine.map(s => ({ name: s.name, qty: s.qty, rev: money(s.revenue), prof: money(s.profit) })),
        [{label: 'Net Sales', value: money(netSales)}, {label: 'Invoices', value: numInvoices.toString()}],
        getExportFilters()
      );
    } else if (activeTab === 'purchases') {
      exportReportToPdf('Purchase Report', 
        [{key:'name', header:'Medicine'}, {key:'sup', header:'Supplier'}, {key:'qty', header:'Quantity (Packs)'}, {key:'cost', header:'Cost'}],
        purchasesByMedicine.map(p => ({ name: p.name, sup: p.supplier, qty: p.qty, cost: money(p.cost) })),
        [{label: 'Total Purchases', value: money(totalPurchaseCost)}, {label: 'Quantity (Packs)', value: totalQuantityPurchased.toString()}],
        getExportFilters()
      );
    } else if (activeTab === 'profit') {
      exportReportToPdf('Profit Report', 
        [{key:'name', header:'Medicine'}, {key:'rev', header:'Net Revenue'}, {key:'prof', header:'Net Profit'}],
        salesByMedicine.map(s => ({ name: s.name, rev: money(s.revenue), prof: money(s.profit) })),
        [{label: 'Net Profit', value: money(grossProfit)}, {label: 'Margin', value: `${profitMargin}%`}],
        getExportFilters()
      );
    }
  };

  const handleExportExcel = () => {
    if (activeTab === 'sales') {
      exportReportToExcel('Sales Report', 
        [{key:'name', header:'Medicine'}, {key:'qty', header:'Net Quantity Sold'}, {key:'rev', header:'Net Revenue'}, {key:'prof', header:'Net Profit'}],
        salesByMedicine.map(s => ({ name: s.name, qty: s.qty, rev: s.revenue, prof: s.profit })),
        [{label: 'Net Sales', value: netSales}],
        getExportFilters()
      );
    } else if (activeTab === 'purchases') {
      exportReportToExcel('Purchase Report', 
        [{key:'name', header:'Medicine'}, {key:'sup', header:'Supplier'}, {key:'qty', header:'Quantity (Packs)'}, {key:'cost', header:'Cost'}],
        purchasesByMedicine.map(p => ({ name: p.name, sup: p.supplier, qty: p.qty, cost: p.cost })),
        [{label: 'Total Purchases', value: totalPurchaseCost}],
        getExportFilters()
      );
    } else if (activeTab === 'profit') {
      exportReportToExcel('Profit Report', 
        [{key:'name', header:'Medicine'}, {key:'rev', header:'Net Revenue'}, {key:'prof', header:'Net Profit'}],
        salesByMedicine.map(s => ({ name: s.name, rev: s.revenue, prof: s.profit })),
        [{label: 'Net Profit', value: grossProfit}],
        getExportFilters()
      );
    }
  };

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View insights and track business performance.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors text-slate-700 dark:text-slate-200 shadow-sm">
            <FileText className="w-4 h-4 text-red-500" /> Export PDF
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors text-slate-700 dark:text-slate-200 shadow-sm">
            <FileDown className="w-4 h-4 text-green-600" /> Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Filter className="w-4 h-4" /> Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date Range</label>
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200">
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {dateFilter === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">From Date</label>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">To Date</label>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200" />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Medicine</label>
            <select value={medicineFilter} onChange={e => setMedicineFilter(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200">
              <option value="all">All Medicines</option>
              {inventory.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Supplier</label>
            <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-700 dark:text-slate-200">
              <option value="all">All Suppliers</option>
              {suppliers?.map(s => (
                <option key={s.id} value={s.id}>{s.supplierName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {['sales', 'purchases', 'profit'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
            {tab} Report
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'sales' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Net Sales / Revenue</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{money(netSales)}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Number of Invoices</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{numInvoices}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Net Quantity Sold</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{netQuantitySold}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Avg Net Invoice Value</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{money(numInvoices ? netSales / numInvoices : 0)}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60 h-80">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Net Sales Trend</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={val => `₹${val}`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-4 font-medium">Medicine</th>
                    <th className="px-6 py-4 font-medium text-right">Net Quantity Sold</th>
                    <th className="px-6 py-4 font-medium text-right">Net Revenue</th>
                    <th className="px-6 py-4 font-medium text-right">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {salesByMedicine.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No data available for the selected filters.</td></tr>}
                  {salesByMedicine.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{s.name}</td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{s.qty}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">{money(s.revenue)}</td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">{money(s.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'purchases' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Purchase Cost</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{money(totalPurchaseCost)}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Number of Purchases</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{purchaseList.length}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Quantity (Packs)</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalQuantityPurchased}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60 h-80">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Purchase Trend</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={purchaseTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={val => `₹${val}`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
                  <Bar dataKey="purchases" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-4 font-medium">Medicine</th>
                    <th className="px-6 py-4 font-medium">Supplier</th>
                    <th className="px-6 py-4 font-medium text-right">Quantity (Packs)</th>
                    <th className="px-6 py-4 font-medium text-right">Purchase Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {purchasesByMedicine.length === 0 && <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No data available for the selected filters.</td></tr>}
                  {purchasesByMedicine.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{p.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{p.supplier}</td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{p.qty}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">{money(p.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'profit' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Net Revenue</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{money(netSales)}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Net Cost of Goods Sold (COGS)</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-500">{money(netCOGS)}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Net Profit</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{money(grossProfit)}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Profit Margin</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">{profitMargin}%</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-800/60 h-80">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Net Profit Trend</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={val => `₹${val}`} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Net Revenue" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-4 font-medium">Medicine</th>
                    <th className="px-6 py-4 font-medium text-right">Net Revenue</th>
                    <th className="px-6 py-4 font-medium text-right">Net COGS</th>
                    <th className="px-6 py-4 font-medium text-right">Net Profit</th>
                    <th className="px-6 py-4 font-medium text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {salesByMedicine.length === 0 && <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No data available for the selected filters.</td></tr>}
                  {salesByMedicine.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{s.name}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">{money(s.revenue)}</td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{money(s.cogs)}</td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">{money(s.profit)}</td>
                      <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400">
                        {s.revenue > 0 ? ((s.profit / s.revenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
