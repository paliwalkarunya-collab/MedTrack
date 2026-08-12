import { useState } from 'react';
import { ReturnContext } from './returnContext';

export const ReturnProvider = ({ children }) => {
  const [returns, setReturns] = useState([]);
  const [sequence, setSequence] = useState(1);

  const processReturn = (returnData) => {
    const returnId = `RET-${new Date().getFullYear()}-${String(sequence).padStart(6, '0')}`;
    const record = { ...returnData, returnId, createdAt: new Date().toISOString(), status: 'completed' };
    setReturns((prev) => [record, ...prev]);
    setSequence((s) => s + 1);
    return record;
  };

  const getReturnsForInvoice = (invoiceId) => returns.filter((r) => r.invoiceId === invoiceId);

  return (
    <ReturnContext.Provider value={{ returns, processReturn, getReturnsForInvoice }}>
      {children}
    </ReturnContext.Provider>
  );
};
