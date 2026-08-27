import { createContext, useContext, useState, useEffect } from 'react';
import { authApi, setPharmacyId } from '../api/client';

export const PharmacyContext = createContext({
  currentPharmacy: null,
  accessiblePharmacies: [],
  isLoading: false,
  selectPharmacy: async () => {},
});

export const PharmacyProvider = ({ children, accessiblePharmacies: initialPharmacies = [] }) => {
  const [currentPharmacy, setCurrentPharmacy] = useState(null);
  const [accessiblePharmacies, setAccessiblePharmacies] = useState(initialPharmacies);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialPharmacies.length > 0) {
      // Try to restore last selected pharmacy
      const savedPharmacyId = localStorage.getItem('medtrack-selected-pharmacy');
      if (savedPharmacyId) {
        const saved = initialPharmacies.find(p => p.pharmacy_id === savedPharmacyId);
        if (saved) {
          setCurrentPharmacy(saved);
          setPharmacyId(saved.pharmacy_id);
        }
      } else if (initialPharmacies.length === 1) {
        // Auto-select if only one pharmacy
        setCurrentPharmacy(initialPharmacies[0]);
        setPharmacyId(initialPharmacies[0].pharmacy_id);
        localStorage.setItem('medtrack-selected-pharmacy', initialPharmacies[0].pharmacy_id);
      }
    }
  }, [initialPharmacies]);

  const selectPharmacy = async (pharmacyId) => {
    setIsLoading(true);
    try {
      await authApi.selectPharmacy(pharmacyId);
      const pharmacy = await authApi.getCurrentPharmacy();
      setCurrentPharmacy(pharmacy);
      setPharmacyId(pharmacyId);
      localStorage.setItem('medtrack-selected-pharmacy', pharmacyId);
      setIsLoading(false);
      return pharmacy;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const loadPharmacies = async () => {
    try {
      const pharmacies = await authApi.getPharmacies();
      setAccessiblePharmacies(pharmacies);
      return pharmacies;
    } catch (error) {
      console.error('Failed to load pharmacies:', error);
      return [];
    }
  };

  return (
    <PharmacyContext.Provider value={{
      currentPharmacy,
      accessiblePharmacies,
      isLoading,
      selectPharmacy,
      loadPharmacies,
    }}>
      {children}
    </PharmacyContext.Provider>
  );
};

export const usePharmacy = () => {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error('usePharmacy must be used within a PharmacyProvider');
  }
  return context;
};