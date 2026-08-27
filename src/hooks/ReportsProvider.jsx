import { useState, useEffect, useCallback } from 'react';
import { reportsApi } from '../api/client';
import { createContext } from 'react';

export const ReportsContext = createContext({
  sales: [],
  salesSummary: null,
  purchases: [],
  purchasesSummary: null,
  cogs: [],
  cogsSummary: null,
  profit: [],
  profitSummary: null,
  dashboardSummary: null,
  topMedicines: [],
  topSuppliers: [],
  isLoading: false,
  error: null,
  refreshReports: async () => {},
});

export const ReportsProvider = ({ children }) => {
  const [sales, setSales] = useState([]);
  const [salesSummary, setSalesSummary] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [purchasesSummary, setPurchasesSummary] = useState(null);
  const [cogs, setCogs] = useState([]);
  const [cogsSummary, setCogsSummary] = useState(null);
  const [profit, setProfit] = useState([]);
  const [profitSummary, setProfitSummary] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [topMedicines, setTopMedicines] = useState([]);
  const [topSuppliers, setTopSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        salesData,
        salesSummaryData,
        purchasesData,
        purchasesSummaryData,
        cogsData,
        cogsSummaryData,
        profitData,
        profitSummaryData,
        dashboardData,
        topMedicinesData,
        topSuppliersData,
      ] = await Promise.all([
        reportsApi.sales(),
        reportsApi.salesSummary(),
        reportsApi.purchases(),
        reportsApi.purchasesSummary(),
        reportsApi.cogs(),
        reportsApi.cogsSummary(),
        reportsApi.profit(),
        reportsApi.profitSummary(),
        reportsApi.dashboardSummary(),
        reportsApi.topMedicines(),
        reportsApi.topSuppliers(),
      ]);
      setSales(salesData);
      setSalesSummary(salesSummaryData);
      setPurchases(purchasesData);
      setPurchasesSummary(purchasesSummaryData);
      setCogs(cogsData);
      setCogsSummary(cogsSummaryData);
      setProfit(profitData);
      setProfitSummary(profitSummaryData);
      setDashboardSummary(dashboardData);
      setTopMedicines(topMedicinesData);
      setTopSuppliers(topSuppliersData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <ReportsContext.Provider value={{
      sales,
      salesSummary,
      purchases,
      purchasesSummary,
      cogs,
      cogsSummary,
      profit,
      profitSummary,
      dashboardSummary,
      topMedicines,
      topSuppliers,
      isLoading,
      error,
      refreshReports: fetchAll,
    }}>
      {children}
    </ReportsContext.Provider>
  );
};