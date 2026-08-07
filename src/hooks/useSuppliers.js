import { useContext } from 'react';
import { SupplierContext } from './supplierContext';

export const useSuppliers = () => useContext(SupplierContext);
