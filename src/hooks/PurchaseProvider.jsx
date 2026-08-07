import { useState } from 'react';
import { PurchaseContext } from './purchaseContext';

export const PurchaseProvider = ({ children }) => {
  const [purchases, setPurchases] = useState([]);
  const recordPurchase = (purchase) => setPurchases((items) => [purchase, ...items]);
  return <PurchaseContext.Provider value={{ purchases, recordPurchase }}>{children}</PurchaseContext.Provider>;
};
