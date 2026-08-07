import { useContext } from 'react';
import { InventoryContext } from './inventoryContext';

export const useInventory = () => useContext(InventoryContext);
