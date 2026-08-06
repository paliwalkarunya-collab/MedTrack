import { useContext } from 'react';
import { SidebarContext } from './sidebarContext';

export const useSidebar = () => useContext(SidebarContext);
