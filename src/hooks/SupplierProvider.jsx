import { useState } from 'react';
import { SupplierContext } from './supplierContext';

const initialSuppliers = [
  { id: 'SUP-1001', supplierName: 'PharmaCorp Ltd', companyName: 'PharmaCorp Ltd', contactPerson: 'Anita Shah', phoneNumber: '9876543210', email: 'orders@pharmacorp.example', status: 'Active' },
  { id: 'SUP-1002', supplierName: 'MedSupply Co', companyName: 'MedSupply Co', contactPerson: 'Rahul Mehta', phoneNumber: '9876543211', email: 'sales@medsupply.example', status: 'Active' },
  { id: 'SUP-1003', supplierName: 'BioHealth Labs', companyName: 'BioHealth Labs', contactPerson: 'Priya Nair', phoneNumber: '9876543212', email: 'support@biohealth.example', status: 'Active' },
];

export const SupplierProvider = ({ children }) => {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const addSupplier = (supplier) => setSuppliers((items) => [...items, { ...supplier, id: `SUP-${1000 + items.length + 1}` }]);
  const updateSupplier = (supplier) => setSuppliers((items) => items.map((item) => item.id === supplier.id ? supplier : item));
  const deleteSupplier = (supplierId) => setSuppliers((items) => items.filter((item) => item.id !== supplierId));
  return <SupplierContext.Provider value={{ suppliers, addSupplier, updateSupplier, deleteSupplier }}>{children}</SupplierContext.Provider>;
};
