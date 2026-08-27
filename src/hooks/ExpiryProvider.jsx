import { useState, useEffect, useCallback } from 'react';
import { expiryApi, alertsApi } from '../api/client';
import { createContext } from 'react';

export const ExpiryContext = createContext({
  batches: [],
  summary: null,
  expired: [],
  expiringSoon: [],
  alerts: [],
  alertsSummary: null,
  lowStock: [],
  isLoading: false,
  error: null,
  refreshExpiry: async () => {},
});

export const ExpiryProvider = ({ children }) => {
  const [batches, setBatches] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expired, setExpired] = useState([]);
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsSummary, setAlertsSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [batchesData, summaryData, expiredData, expiringData, alertsData, alertsSummaryData, lowStockData] = await Promise.all([
        expiryApi.list(),
        expiryApi.summary(),
        expiryApi.expired(),
        expiryApi.expiringSoon(),
        alertsApi.list(),
        alertsApi.summary(),
        alertsApi.lowStock(),
      ]);
      setBatches(batchesData);
      setSummary(summaryData);
      setExpired(expiredData);
      setExpiringSoon(expiringData);
      setAlerts(alertsData);
      setAlertsSummary(alertsSummaryData);
      setLowStock(lowStockData);
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
    <ExpiryContext.Provider value={{
      batches,
      summary,
      expired,
      expiringSoon,
      alerts,
      alertsSummary,
      lowStock,
      isLoading,
      error,
      refreshExpiry: fetchAll,
    }}>
      {children}
    </ExpiryContext.Provider>
  );
};