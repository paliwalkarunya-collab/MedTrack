import { useContext } from 'react';
import { BillingContext } from './billingContext';

export const useBillingHistory = () => useContext(BillingContext);
