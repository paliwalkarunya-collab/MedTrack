import { useState, useEffect, useCallback } from 'react';
import { suppliersApi } from '../api/client';
import { SupplierContext } from './supplierContext';

const mapSupplier = (sup) => ({
  id: sup.id,
  supplierName: sup.name,
  companyName: sup.name,
  contactPerson: sup.contact_person,
  phoneNumber: sup.phone,
  email: sup.email,
  address: sup.address,
  gstin: sup.gstin,
  drugLicense: sup.drug_license,
  status: sup.is_active ? 'Active' : 'Inactive',
});

export const SupplierProvider = ({ children }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await suppliersApi.list();
      setSuppliers(data.map(mapSupplier));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const addSupplier = async (supplierData) => {
    const payload = {
      name: supplierData.supplierName || supplierData.companyName,
      contact_person: supplierData.contactPerson,
      phone: supplierData.phoneNumber,
      email: supplierData.email,
      address: supplierData.address,
      gstin: supplierData.gstin,
      drug_license: supplierData.drugLicense,
    };
    const created = await suppliersApi.create(payload);
    const mapped = mapSupplier(created);
    setSuppliers(prev => [...prev, mapped]);
    return mapped;
  };

  const updateSupplier = async (id, supplierData) => {
    const payload = {
      name: supplierData.supplierName || supplierData.companyName,
      contact_person: supplierData.contactPerson,
      phone: supplierData.phoneNumber,
      email: supplierData.email,
      address: supplierData.address,
      gstin: supplierData.gstin,
      drug_license: supplierData.drugLicense,
    };
    const updated = await suppliersApi.update(id, payload);
    const mapped = mapSupplier(updated);
    setSuppliers(prev => prev.map(item => item.id === id ? mapped : item));
    return mapped;
  };

  const deleteSupplier = async (id) => {
    await suppliersApi.delete(id);
    setSuppliers(prev => prev.filter(item => item.id !== id));
  };

  return (
    <SupplierContext.Provider value={{
      suppliers,
      isLoading,
      error,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      refreshSuppliers: fetchSuppliers,
    }}>
      {children}
    </SupplierContext.Provider>
  );
};