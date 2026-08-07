import { useContext } from 'react';
import { PurchaseContext } from './purchaseContext';

export const usePurchases = () => useContext(PurchaseContext);
