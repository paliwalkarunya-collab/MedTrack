import { createContext } from 'react';

export const SupplierContext = createContext({ suppliers: [], addSupplier: () => {}, updateSupplier: () => {}, deleteSupplier: () => {} });
