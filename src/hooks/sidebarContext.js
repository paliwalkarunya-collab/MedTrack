import { createContext } from 'react';

export const SidebarContext = createContext({
  isCollapsed: false,
  toggleCollapse: () => {},
  isMobileOpen: false,
  toggleMobileMenu: () => {},
  closeMobileMenu: () => {},
  isDarkMode: false,
  toggleDarkMode: () => {},
});
