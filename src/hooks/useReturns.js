import { useContext } from 'react';
import { ReturnContext } from './returnContext';

export const useReturns = () => useContext(ReturnContext);
